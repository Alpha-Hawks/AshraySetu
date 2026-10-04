"use client";

import React, { useEffect, useRef } from "react";
import {
  type CardGlassSettings,
  PRESET_APPLE_GLASS,
  applyCardGlassVariables,
} from "./cardGlassSettings";

/** Every element that gets the liquid-glass lens layer from globals.css (::before). */
const CARD_SELECTOR =
  ".liquid-glass-material, .liquid-glass-card, .liquid-glass-custom-card, .liquid-glass-custom, .liquid-glass-navbar, .liquid-glass-top-navbar";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Longest side of a generated normal map; bigger cards get a uniformly scaled map. */
const MAX_MAP_SIZE = 512;

/** Generated maps kept in memory (window resizing produces a new size every frame). */
const MAX_CACHED_MAPS = 48;

/** Wait for a resize to settle before rebuilding a card's map. */
const RESIZE_DEBOUNCE_MS = 100;

/** Peak displacement scale (px) at refraction 40 — matches the 10cm slab in liquid-glass.html. */
const BASE_DISPLACEMENT_PX = 30;

/**
 * Analytical squircle Snell's law normal map generator
 * Reused directly from liquid-glass.html LiquidGlassEngine
 * Generates physical normal deflection vectors inside convex squircle bezel.
 * Unlike the demo, each map is built at the card's own aspect ratio and
 * corner radius, so the bezel is never stretched across differently sized cards.
 */
class CardNormalMapEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cache = new Map<string, string>();

  constructor() {
    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
  }

  private getSdf(x: number, y: number, halfW: number, halfH: number, r: number) {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const qx = ax - (halfW - r);
    const qy = ay - (halfH - r);

    if (r > 0 && qx > 0 && qy > 0) {
      const d = Math.hypot(qx, qy);
      return {
        dist: r - d,
        nx: -(qx / d) * Math.sign(x),
        ny: -(qy / d) * Math.sign(y),
      };
    } else if (qx > qy) {
      return {
        dist: halfW - ax,
        nx: -Math.sign(x),
        ny: 0,
      };
    } else {
      return {
        dist: halfH - ay,
        nx: 0,
        ny: -Math.sign(y),
      };
    }
  }

  generateMap(
    width: number,
    height: number,
    radius: number,
    bezelWidth: number,
    refraction: number,
    distortion: number,
    surfaceNoise: number = 0
  ): string {
    if (!this.canvas || !this.ctx) return "";

    const key = `${Math.round(width)}_${Math.round(height)}_${Math.round(radius)}_${Math.round(bezelWidth)}_${Math.round(refraction)}_${distortion.toFixed(2)}_${surfaceNoise.toFixed(2)}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    // Uniform downscale keeps corners circular and the bezel the same width on every side
    const s = Math.min(1, MAX_MAP_SIZE / Math.max(width, height));
    const w = Math.max(2, Math.round(width * s));
    const h = Math.max(2, Math.round(height * s));
    this.canvas.width = w;
    this.canvas.height = h;

    const imgData = this.ctx.createImageData(w, h);
    const data = imgData.data;
    const halfW = w / 2;
    const halfH = h / 2;
    const r = Math.min(radius * s, halfW, halfH);
    const b = Math.max(1, Math.min(bezelWidth * s, halfW, halfH));

    for (let y = 0; y < h; y++) {
      const cy = y + 0.5 - halfH;
      for (let x = 0; x < w; x++) {
        const cx = x + 0.5 - halfW;
        const { dist, nx, ny } = this.getSdf(cx, cy, halfW, halfH, r);

        let rVal = 128;
        let gVal = 128;

        if (dist >= 0 && dist < b) {
          // Inside curved bezel: compute convex squircle height derivative
          const u = Math.max(0, Math.min(1, 1 - dist / b));
          // h(u) = (1 - u^4)^(1/4)
          // slope = u^3 / [w * (1 - u^4)^(3/4)]
          const u4 = Math.pow(u, 4);
          const denom = Math.max(0.08, Math.pow(1 - u4, 0.75));
          const slope = Math.min(2.8, Math.pow(u, 3) / denom);

          const power = (refraction / 20) * 45 * distortion;
          const dx = nx * slope * power;
          const dy = ny * slope * power;

          rVal = Math.round(Math.max(0, Math.min(255, 128 + dx)));
          gVal = Math.round(Math.max(0, Math.min(255, 128 + dy)));
        }

        // Add subtle surface microsurface grain if enabled
        if (surfaceNoise > 0) {
          const noise = (Math.random() - 0.5) * surfaceNoise * 28;
          rVal = Math.max(0, Math.min(255, rVal + noise));
          gVal = Math.max(0, Math.min(255, gVal + noise));
        }

        const idx = (y * w + x) * 4;
        data[idx] = rVal;     // Red channel -> X displacement
        data[idx + 1] = gVal; // Green channel -> Y displacement
        data[idx + 2] = 255;  // Blue -> neutral
        data[idx + 3] = 255;  // Alpha -> opaque
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
    const dataUrl = this.canvas.toDataURL("image/png");
    this.cache.set(key, dataUrl);
    if (this.cache.size > MAX_CACHED_MAPS) {
      this.cache.delete(this.cache.keys().next().value!);
    }
    return dataUrl;
  }

  clearCache() {
    this.cache.clear();
  }
}

let sharedEngine: CardNormalMapEngine | null = null;

export function getCardNormalMapEngine(): CardNormalMapEngine {
  if (!sharedEngine) {
    sharedEngine = new CardNormalMapEngine();
  }
  return sharedEngine;
}

function svgEl(tag: string, attrs: Record<string, string | number>) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, String(value));
  }
  return el;
}

/**
 * Builds one card's refraction filter. The region is the lens layer's own box
 * (objectBoundingBox 0..1, so it always covers the card even mid-resize), while
 * primitives work in user-space pixels from the box's top-left, so the map and
 * displacement are true px. With dispersion, R/G/B are displaced by slightly
 * different amounts and screen-blended back together — the same chromatic
 * fringe chain as #lg-refract-filter in the demo.
 */
function buildLensFilter(
  id: string,
  width: number,
  height: number,
  mapUrl: string,
  scale: number,
  dispersion: number
) {
  const filter = svgEl("filter", {
    id,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    primitiveUnits: "userSpaceOnUse",
    // sRGB keeps the neutral 128 map value at zero displacement (linearRGB would shift the whole backdrop)
    "color-interpolation-filters": "sRGB",
  });

  filter.appendChild(
    svgEl("feImage", {
      href: mapUrl,
      x: 0,
      y: 0,
      width,
      height,
      preserveAspectRatio: "none",
      result: "lensMap",
    })
  );

  const displace = (s: number, result: string) =>
    svgEl("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "lensMap",
      scale: s.toFixed(2),
      xChannelSelector: "R",
      yChannelSelector: "G",
      result,
    });

  if (dispersion <= 0) {
    filter.appendChild(displace(scale, "refraction"));
    return filter;
  }

  const channels: Array<[string, number, string]> = [
    ["r", scale + dispersion, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"],
    ["g", scale, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"],
    ["b", Math.max(0, scale - dispersion), "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"],
  ];
  for (const [c, s, matrix] of channels) {
    filter.appendChild(displace(s, `${c}Disp`));
    filter.appendChild(
      svgEl("feColorMatrix", { in: `${c}Disp`, type: "matrix", values: matrix, result: `${c}Channel` })
    );
  }
  filter.appendChild(svgEl("feBlend", { in: "rChannel", in2: "gChannel", mode: "screen", result: "rgCombined" }));
  filter.appendChild(svgEl("feBlend", { in: "rgCombined", in2: "bChannel", mode: "screen", result: "chromaticRefraction" }));
  return filter;
}

/**
 * The ::before lens layer covers the card's padding box. Read it unrounded and
 * untransformed (hover lift / press scale must not change the map).
 */
function readLensBox(card: HTMLElement) {
  const cs = getComputedStyle(card);
  const px = (v: string) => parseFloat(v) || 0;
  const borderX = px(cs.borderLeftWidth) + px(cs.borderRightWidth);
  const borderY = px(cs.borderTopWidth) + px(cs.borderBottomWidth);

  let width = parseFloat(cs.width);
  let height = parseFloat(cs.height);
  if (Number.isNaN(width) || Number.isNaN(height)) {
    width = card.clientWidth;
    height = card.clientHeight;
  } else if (cs.boxSizing === "border-box") {
    width -= borderX;
    height -= borderY;
  } else {
    width += px(cs.paddingLeft) + px(cs.paddingRight);
    height += px(cs.paddingTop) + px(cs.paddingBottom);
  }

  const raw = cs.borderTopLeftRadius;
  const outer = raw.trim().endsWith("%")
    ? (px(raw) / 100) * Math.min(width + borderX, height + borderY)
    : px(raw);
  // Inner corner of the padding box = outer radius minus the border
  const radius = Math.max(0, outer - px(cs.borderLeftWidth));

  const round = (v: number) => Math.round(v * 100) / 100;
  return { width: round(width), height: round(height), radius: round(radius) };
}

export default function LiquidGlassCardShader() {
  const defsRef = useRef<SVGDefsElement>(null);

  useEffect(() => {
    const defs = defsRef.current;
    if (!defs) return;

    // Detect browser SVG backdrop-filter support
    const ua = navigator.userAgent;
    const isChromeOrChromium =
      (/Chrome\//i.test(ua) || /Chromium\//i.test(ua) || /Edg\//i.test(ua)) &&
      !/Firefox\//i.test(ua);
    const isRealSafari =
      /Safari\//i.test(ua) &&
      !/Chrome\//i.test(ua) &&
      !/Chromium\//i.test(ua) &&
      !/android/i.test(ua);

    const supportsSvgBackdrop = isChromeOrChromium && !isRealSafari;

    // Load initial settings
    let currentSettings = PRESET_APPLE_GLASS;
    try {
      const saved = localStorage.getItem("ashraysetu_card_glass_settings");
      if (saved) {
        currentSettings = { ...PRESET_APPLE_GLASS, ...JSON.parse(saved) };
      }
    } catch {}

    // Apply tokens to CSS variables
    applyCardGlassVariables(currentSettings);

    // Cards currently wearing a lens -> the filter key they use.
    // Cards with identical size + radius share one <filter>.
    const cardKeys = new Map<HTMLElement, string>();
    const filters = new Map<string, { id: string; refs: number; el: Element }>();
    let filterSeq = 0;

    const lensEnabled = () => supportsSvgBackdrop && currentSettings.refraction > 0;

    const releaseCard = (card: HTMLElement) => {
      const key = cardKeys.get(card);
      if (key === undefined) return;
      cardKeys.delete(card);
      card.style.removeProperty("--lg-card-lens");
      const entry = filters.get(key);
      if (entry && --entry.refs <= 0) {
        entry.el.remove();
        filters.delete(key);
      }
    };

    const applyCard = (card: HTMLElement) => {
      if (!card.isConnected || !lensEnabled()) {
        releaseCard(card);
        return;
      }

      const { width, height, radius } = readLensBox(card);
      if (width < 8 || height < 8) {
        releaseCard(card);
        return;
      }

      const s = currentSettings;
      const key = `${width}x${height}:${radius}:${s.refraction}:${s.bezelWidth}:${s.distortion}:${s.surfaceNoise}:${s.chromaticAberration}`;
      if (cardKeys.get(card) === key) return;

      let entry = filters.get(key);
      if (!entry) {
        const mapUrl = getCardNormalMapEngine().generateMap(
          width,
          height,
          radius,
          s.bezelWidth,
          s.refraction,
          s.distortion,
          s.surfaceNoise
        );
        if (!mapUrl) return;
        // A fresh id per key also sidesteps Chromium caching a backdrop filter whose inputs changed
        const id = `lg-card-lens-${++filterSeq}`;
        const el = buildLensFilter(
          id,
          width,
          height,
          mapUrl,
          BASE_DISPLACEMENT_PX * (s.refraction / 40),
          s.chromaticAberration * 0.75
        );
        defs.appendChild(el);
        entry = { id, refs: 0, el };
        filters.set(key, entry);
      }

      entry.refs++;
      releaseCard(card);
      cardKeys.set(card, key);
      card.style.setProperty("--lg-card-lens", `url(#${entry.id})`);
    };

    // Batch all DOM / size changes into one pass per frame
    const observedCards = new Set<HTMLElement>();
    const pendingCards = new Set<HTMLElement>();
    let rescanAll = true;
    let frame = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    // Until the debounce fires, a resizing card keeps its previous lens (the filter region still covers it)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) pendingCards.add(entry.target as HTMLElement);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(schedule, RESIZE_DEBOUNCE_MS);
    });

    const flush = () => {
      frame = 0;
      if (rescanAll) {
        rescanAll = false;
        observedCards.forEach((card) => {
          if (!card.isConnected) {
            releaseCard(card);
            resizeObserver.unobserve(card);
            observedCards.delete(card);
          }
        });
        document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((card) => {
          if (!observedCards.has(card)) {
            observedCards.add(card);
            resizeObserver.observe(card); // first notification queues applyCard
          }
        });
      }
      pendingCards.forEach(applyCard);
      pendingCards.clear();
    };

    function schedule() {
      if (!frame) frame = requestAnimationFrame(flush);
    }

    // Cards mount/unmount on client-side navigation
    const mutationObserver = new MutationObserver(() => {
      rescanAll = true;
      schedule();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    schedule();

    const reapplyAll = () => {
      getCardNormalMapEngine().clearCache();
      observedCards.forEach((card) => {
        releaseCard(card);
        pendingCards.add(card);
      });
      rescanAll = true;
      schedule();
    };

    // Pointer-following specular highlight (--mx / --my), one update per frame
    let pointerFrame = 0;
    let lastPointer: PointerEvent | null = null;
    const onPointer = (e: PointerEvent) => {
      lastPointer = e;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const ev = lastPointer;
        const target = ev?.target as Element | null;
        const card = target?.closest?.(CARD_SELECTOR) as HTMLElement | null;
        if (!ev || !card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${ev.clientX - rect.left}px`);
        card.style.setProperty("--my", `${ev.clientY - rect.top}px`);
      });
    };
    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerdown", onPointer, { passive: true });

    // Custom event listener for live customizer updates.
    // CSS variables update instantly; lens maps rebuild once a slider drag settles.
    let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CardGlassSettings>;
      if (customEvent.detail) {
        currentSettings = customEvent.detail;
        applyCardGlassVariables(currentSettings);
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(reapplyAll, 150);
      }
    };

    window.addEventListener("card-glass-settings-updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("card-glass-settings-updated", handleSettingsUpdate);
      document.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerdown", onPointer);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      clearTimeout(rebuildTimer);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pointerFrame);
      for (const card of Array.from(cardKeys.keys())) releaseCard(card);
    };
  }, []);

  return (
    <svg
      id="lg-global-card-lens-host"
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Per-card refraction filters are appended here at runtime */}
      <defs ref={defsRef} />
    </svg>
  );
}
