/**
 * Liquid Glass Lensing Engine (Tier 2 Progressive Enhancement)
 * Generates physical Snell's law convex bezel refraction displacement maps
 * Exclusively for Chromium browsers on capable hardware; Safari & Firefox receive Tier 1.
 */

// Cache generated displacement map data URLs by size and radius
const mapCache = new Map<string, string>();

// Track registered filter element IDs in the global SVG host
const registeredFilters = new Set<string>();

/**
 * Robust detection for Chromium-based rendering engine supporting SVG backdrop-filter
 */
export function isChromiumEngine(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // Check reduced transparency preference
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-transparency: reduce)").matches
  ) {
    return false;
  }

  // Check hardware capability: Disable Tier 2 lens on low-memory devices (≤ 4GB)
  const nav = navigator as any;
  if (nav.deviceMemory && nav.deviceMemory <= 4) {
    return false;
  }

  // Check Chromium engine signatures
  const ua = navigator.userAgent;
  const isChromeOrChromium =
    (/Chrome\//i.test(ua) || /Chromium\//i.test(ua) || /Edg\//i.test(ua)) &&
    !/Firefox\//i.test(ua) &&
    !/Safari\//i.test(ua) === false; // Chrome includes Safari/ in UA, but real Safari doesn't have Chrome/

  const isRealSafari =
    /Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/Chromium\//i.test(ua) && !/android/i.test(ua);

  if (isRealSafari) return false;

  // Verify backdrop-filter support in CSS
  const supportsBackdrop =
    typeof CSS !== "undefined" &&
    (CSS.supports("backdrop-filter", "blur(10px)") ||
      CSS.supports("-webkit-backdrop-filter", "blur(10px)"));

  return isChromeOrChromium && supportsBackdrop;
}

/**
 * Computes signed distance to squircle/capsule boundary
 * @param x x coordinate relative to element center
 * @param y y coordinate relative to element center
 * @param halfW half width of element
 * @param halfH half height of element
 * @param r corner radius
 * @returns distance inside border (positive inside, 0 at edge)
 */
function getDistanceToBorder(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  r: number
): { dist: number; nx: number; ny: number } {
  const ax = Math.abs(x);
  const ay = Math.abs(y);

  // Core rectangle inside rounded corners
  const rx = halfW - r;
  const ry = halfH - r;

  let dist = 0;
  let nx = 0;
  let ny = 0;

  if (ax <= rx && ay <= ry) {
    // Inside inner flat rectangle
    const dLeft = halfW - ax;
    const dTop = halfH - ay;
    if (dLeft < dTop) {
      dist = dLeft;
      nx = x > 0 ? -1 : 1;
      ny = 0;
    } else {
      dist = dTop;
      nx = 0;
      ny = y > 0 ? -1 : 1;
    }
  } else if (ax > rx && ay <= ry) {
    // Straight vertical side rim
    dist = halfW - ax;
    nx = x > 0 ? -1 : 1;
    ny = 0;
  } else if (ax <= rx && ay > ry) {
    // Straight horizontal top/bottom rim
    dist = halfH - ay;
    nx = 0;
    ny = y > 0 ? -1 : 1;
  } else {
    // Corner arc
    const cx = ax - rx;
    const cy = ay - ry;
    const cornerDist = Math.hypot(cx, cy);
    dist = r - cornerDist;
    const len = cornerDist > 0.0001 ? cornerDist : 1;
    nx = -(cx / len) * (x > 0 ? 1 : -1);
    ny = -(cy / len) * (y > 0 ? 1 : -1);
  }

  return { dist: Math.max(0, dist), nx, ny };
}

/**
 * Generates an SVG displacement map on canvas
 * Encodes dx in Red, dy in Green, with neutral = 128 (no displacement).
 * Rim follows Snell's law convex bezel profile (n ≈ 1.5), flat center has zero displacement.
 */
export function generateDisplacementMapDataUrl(
  width: number,
  height: number,
  radius: number,
  bezelWidth: number = 14
): string {
  // Quantize dimensions to reduce canvas allocations
  const qW = Math.max(24, Math.round(width));
  const qH = Math.max(24, Math.round(height));
  const qR = Math.min(radius, Math.min(qW, qH) / 2);
  const cacheKey = `${qW}x${qH}_r${Math.round(qR)}_b${bezelWidth}`;

  const cached = mapCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = qW;
  canvas.height = qH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imgData = ctx.createImageData(qW, qH);
  const data = imgData.data;

  const halfW = qW / 2;
  const halfH = qH / 2;

  // Max displacement in normalized units [-1, 1]
  for (let y = 0; y < qH; y++) {
    const py = y - halfH + 0.5;
    for (let x = 0; x < qW; x++) {
      const px = x - halfW + 0.5;
      const idx = (y * qW + x) * 4;

      const { dist, nx, ny } = getDistanceToBorder(px, py, halfW, halfH, qR);

      if (dist >= bezelWidth || dist <= 0) {
        // Flat center or outside: Zero displacement (neutral = 128)
        data[idx] = 128;     // R (dx = 0)
        data[idx + 1] = 128; // G (dy = 0)
        data[idx + 2] = 128; // B
        data[idx + 3] = 255; // A
      } else {
        // Convex squircle bezel profile: height h(u) = sqrt(1 - (1 - u)^2), u in [0, 1]
        // Slope / deflection along normal: d = (1 - u) * sin(u * PI / 2)
        const u = dist / bezelWidth; // 0 at outer border, 1 at inner flat edge
        const deflection = Math.sin((1 - u) * Math.PI * 0.5); // peaks at outer rim, 0 at flat

        // Snell's law refraction vector inward
        const dx = nx * deflection;
        const dy = ny * deflection;

        // Encode in 8-bit color channels: 128 = 0, 0 = -1, 255 = +1
        data[idx] = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
        data[idx + 2] = 128;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  mapCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Registers an SVG filter in the global host element
 */
export function ensureSvgFilter(filterId: string, mapDataUrl: string, maxDisplacementPx: number = 14) {
  if (typeof document === "undefined") return;

  let hostSvg = document.getElementById("lg-global-lens-host") as SVGSVGElement | null;
  if (!hostSvg) {
    hostSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    hostSvg.id = "lg-global-lens-host";
    hostSvg.setAttribute("aria-hidden", "true");
    hostSvg.style.position = "absolute";
    hostSvg.style.width = "0";
    hostSvg.style.height = "0";
    hostSvg.style.pointerEvents = "none";
    hostSvg.style.overflow = "hidden";
    hostSvg.style.left = "-9999px";
    document.body.appendChild(hostSvg);
  }

  let filter = document.getElementById(filterId) as SVGElement | null;
  if (!filter) {
    const newFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    newFilter.id = filterId;
    newFilter.setAttribute("color-interpolation-filters", "sRGB");
    newFilter.setAttribute("x", "-15%");
    newFilter.setAttribute("y", "-15%");
    newFilter.setAttribute("width", "130%");
    newFilter.setAttribute("height", "130%");
    hostSvg.appendChild(newFilter);
    filter = newFilter;
  }

  if (filter) {
    filter.innerHTML = `
      <feImage href="${mapDataUrl}" result="lensMap" preserveAspectRatio="none" />
      <feDisplacementMap 
        in="SourceGraphic" 
        in2="lensMap" 
        scale="${maxDisplacementPx * 2}" 
        xChannelSelector="R" 
        yChannelSelector="G" 
        result="displaced" 
      />
    `;
  }
}
