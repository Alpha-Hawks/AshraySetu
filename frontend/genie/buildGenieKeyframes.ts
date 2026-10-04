/**
 * buildGenieKeyframes.ts
 *
 * macOS-Style Genie Motion Geometry Engine
 * Pure mathematical keyframe generator for the View Transitions API and WAAPI.
 *
 * Guaranteed Properties:
 * 1. ZERO DOM dependencies: Can run in SSR, Web Workers, Node.js, and Vitest/Jest.
 * 2. Invariant SVG Path Command Structure: Every single frame emits exactly:
 *    M (1) -> C (1) -> L (1) -> C (1) -> L (1) -> Z (1)
 *    Enables silky-smooth GPU path interpolation without frame snapping.
 * 3. Exact Final Frame: Frame at progress=1.0 is mathematically collinear to the
 *    full rectangle [0, 0, W, H] with zero curvature, zero seams, and zero pixel gaps.
 * 4. Pre-baked cubic-bezier(0.22, 1, 0.36, 1) curve for 60fps WAAPI execution with linear easing.
 */

export type GenieEdge = "top" | "bottom" | "left" | "right";

export interface SimpleRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface GenieOptions {
  edge?: GenieEdge;
  frameCount?: number; // default: 30 (within [24, 32] budget)
  phaseSplit?: number; // default: 0.55 (0 -> 55% stream, 55 -> 100% unpinch)
  streamTranslationFactor?: number; // default: 0.30
  dropShadow?: boolean;
}

export interface GenieKeyframe {
  offset: number;
  clipPath?: string;
  transform?: string;
  opacity?: number;
  filter?: string;
  [key: string]: any;
}

/**
 * Pure cubic-bezier(0.22, 1, 0.36, 1) solver.
 * Evaluates the 1D timing curve using Newton-Raphson with binary subdivision fallback.
 */
export function solveCubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  time: number
): number {
  if (time <= 0) return 0;
  if (time >= 1) return 1;

  // Bezier curve polynomials
  const cx = 3.0 * p1x;
  const bx = 3.0 * (p2x - p1x) - cx;
  const ax = 1.0 - cx - bx;

  const cy = 3.0 * p1y;
  const by = 3.0 * (p2y - p1y) - cy;
  const ay = 1.0 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx;

  // Solve for t corresponding to x = time using Newton's method
  let t = time;
  for (let i = 0; i < 8; i++) {
    const x = sampleCurveX(t) - time;
    if (Math.abs(x) < 1e-6) return sampleCurveY(t);
    const d = sampleCurveDerivativeX(t);
    if (Math.abs(d) < 1e-6) break;
    t -= x / d;
  }

  // Fallback to binary subdivision if Newton diverges
  let t0 = 0.0;
  let t1 = 1.0;
  t = time;
  while (t0 < t1) {
    const x = sampleCurveX(t);
    if (Math.abs(x - time) < 1e-6) return sampleCurveY(t);
    if (time > x) t0 = t;
    else t1 = t;
    t = (t1 + t0) * 0.5;
  }

  return sampleCurveY(t);
}

/**
 * Evaluates the standard macOS Genie timing curve: cubic-bezier(0.22, 1, 0.36, 1).
 */
export function evaluateGenieEasing(t: number): number {
  return solveCubicBezier(0.22, 1, 0.36, 1, t);
}

/**
 * Linear interpolation helper.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamps value to [min, max].
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Rounds coordinate to 3 decimal places to keep path strings compact and clean.
 */
function r(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Automatically detects the nearest edge of the page box to the origin center.
 */
export function detectNearestEdge(
  origin: SimpleRect | DOMRect,
  box: SimpleRect | DOMRect
): GenieEdge {
  const originCenterX = origin.left + origin.width / 2;
  const originCenterY = origin.top + origin.height / 2;

  const distTop = Math.abs(originCenterY - box.top);
  const distBottom = Math.abs(originCenterY - box.bottom);
  const distLeft = Math.abs(originCenterX - box.left);
  const distRight = Math.abs(originCenterX - box.right);

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);
  if (minDist === distTop) return "top";
  if (minDist === distBottom) return "bottom";
  if (minDist === distLeft) return "left";
  return "right";
}

/**
 * Builds the precomputed keyframes for the incoming destination page (Genie window).
 */
export function buildGenieKeyframes(
  origin: SimpleRect | DOMRect,
  box: SimpleRect | DOMRect,
  opts?: GenieOptions
): GenieKeyframe[] {
  const W = Math.max(box.width, 1);
  const H = Math.max(box.height, 1);

  const frameCount = opts?.frameCount ?? 30; // within 24–32
  const phaseSplit = opts?.phaseSplit ?? 0.55;
  const edge: GenieEdge = opts?.edge ?? detectNearestEdge(origin, box);
  const translationFactor = opts?.streamTranslationFactor ?? 0.30;
  const dropShadow = opts?.dropShadow ?? false;

  // Origin center in box local coordinates
  const originCenterX = origin.left + origin.width / 2 - box.left;
  const originCenterY = origin.top + origin.height / 2 - box.top;

  const keyframes: GenieKeyframe[] = [];

  for (let i = 0; i < frameCount; i++) {
    const rawProgress = i / (frameCount - 1);
    const offset = r(rawProgress);
    const p = i === frameCount - 1 ? 1 : evaluateGenieEasing(rawProgress);

    let pathD = "";
    let translateX = 0;
    let translateY = 0;

    if (edge === "top") {
      // Funnel tip clamped at top edge (y = 0)
      const tipWidth = clamp(origin.width, 24, Math.min(W * 0.5, 120));
      const initialTipCenterX = clamp(originCenterX, tipWidth / 2, W - tipWidth / 2);
      const initialTipLeft = initialTipCenterX - tipWidth / 2;
      const initialTipRight = initialTipCenterX + tipWidth / 2;

      let tipLeftX: number;
      let tipRightX: number;
      let tipY = 0;

      let farLeftX: number;
      let farRightX: number;
      let leadingY: number;

      let cp1x: number, cp1y: number;
      let cp2x: number, cp2y: number;
      let cp3x: number, cp3y: number;
      let cp4x: number, cp4y: number;

      if (p <= phaseSplit) {
        // Phase 1: Stream (0 -> phaseSplit)
        const p1 = p / phaseSplit;
        // Ease-out leading edge motion
        const leadingFactor = Math.sin((p1 * Math.PI) / 2);
        leadingY = Math.max(12, H * (0.05 + 0.95 * leadingFactor));

        tipLeftX = initialTipLeft;
        tipRightX = initialTipRight;

        farLeftX = lerp(initialTipLeft - initialTipCenterX * 0.15, 0, p1);
        farRightX = lerp(initialTipRight + (W - initialTipCenterX) * 0.15, W, p1);

        const dy = leadingY - tipY;
        // Sigmoid S-curve control points
        cp1x = tipLeftX;
        cp1y = tipY + dy * 0.38;
        cp2x = farLeftX;
        cp2y = leadingY - dy * 0.38;

        cp3x = farRightX;
        cp3y = leadingY - dy * 0.38;
        cp4x = tipRightX;
        cp4y = tipY + dy * 0.38;

        translateY = -(H * translationFactor) * (1 - p1);
      } else {
        // Phase 2: Unpinch (phaseSplit -> 1.0)
        const p2 = (p - phaseSplit) / (1 - phaseSplit);
        leadingY = H;
        farLeftX = 0;
        farRightX = W;

        tipLeftX = lerp(initialTipLeft, 0, p2);
        tipRightX = lerp(initialTipRight, W, p2);

        // Relax control points towards straight collinear edges:
        // Left edge collinear: (0, H / 3) and (0, 2H / 3)
        // Right edge collinear: (W, 2H / 3) and (W, H / 3)
        const initialCp1x = initialTipLeft;
        const initialCp2x = 0;
        const initialCp3x = W;
        const initialCp4x = initialTipRight;

        cp1x = lerp(initialCp1x, 0, p2);
        cp1y = lerp(H * 0.38, H / 3, p2);
        cp2x = lerp(initialCp2x, 0, p2);
        cp2y = lerp(H * 0.62, (2 * H) / 3, p2);

        cp3x = lerp(initialCp3x, W, p2);
        cp3y = lerp(H * 0.62, (2 * H) / 3, p2);
        cp4x = lerp(initialCp4x, W, p2);
        cp4y = lerp(H * 0.38, H / 3, p2);

        translateY = -(H * translationFactor) * (1 - p2) * 0.2;
      }

      // Snap final frame to exact full rectangle
      if (i === frameCount - 1) {
        tipLeftX = 0;
        tipY = 0;
        cp1x = 0;
        cp1y = H / 3;
        cp2x = 0;
        cp2y = (2 * H) / 3;
        farLeftX = 0;
        leadingY = H;
        farRightX = W;
        cp3x = W;
        cp3y = (2 * H) / 3;
        cp4x = W;
        cp4y = H / 3;
        tipRightX = W;
        translateY = 0;
      }

      // Structure: M (tipLeft) C (cp1, cp2, farLeft) L (farRight) C (cp3, cp4, tipRight) L (tipLeft) Z
      pathD = `M ${r(tipLeftX)} ${r(tipY)} C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(farLeftX)} ${r(leadingY)} L ${r(farRightX)} ${r(leadingY)} C ${r(cp3x)} ${r(cp3y)}, ${r(cp4x)} ${r(cp4y)}, ${r(tipRightX)} ${r(tipY)} L ${r(tipLeftX)} ${r(tipY)} Z`;
    } else if (edge === "bottom") {
      // Funnel tip clamped at bottom edge (y = H)
      const tipWidth = clamp(origin.width, 24, Math.min(W * 0.5, 120));
      const initialTipCenterX = clamp(originCenterX, tipWidth / 2, W - tipWidth / 2);
      const initialTipLeft = initialTipCenterX - tipWidth / 2;
      const initialTipRight = initialTipCenterX + tipWidth / 2;

      let tipLeftX: number;
      let tipRightX: number;
      let tipY = H;

      let farLeftX: number;
      let farRightX: number;
      let leadingY: number;

      let cp1x: number, cp1y: number;
      let cp2x: number, cp2y: number;
      let cp3x: number, cp3y: number;
      let cp4x: number, cp4y: number;

      if (p <= phaseSplit) {
        // Phase 1: Stream upward
        const p1 = p / phaseSplit;
        const leadingFactor = Math.sin((p1 * Math.PI) / 2);
        leadingY = Math.min(H - 12, H - H * (0.05 + 0.95 * leadingFactor));

        tipLeftX = initialTipLeft;
        tipRightX = initialTipRight;

        farLeftX = lerp(initialTipLeft - initialTipCenterX * 0.15, 0, p1);
        farRightX = lerp(initialTipRight + (W - initialTipCenterX) * 0.15, W, p1);

        const dy = tipY - leadingY;
        cp1x = tipLeftX;
        cp1y = tipY - dy * 0.38;
        cp2x = farLeftX;
        cp2y = leadingY + dy * 0.38;

        cp3x = farRightX;
        cp3y = leadingY + dy * 0.38;
        cp4x = tipRightX;
        cp4y = tipY - dy * 0.38;

        translateY = (H * translationFactor) * (1 - p1);
      } else {
        // Phase 2: Unpinch
        const p2 = (p - phaseSplit) / (1 - phaseSplit);
        leadingY = 0;
        farLeftX = 0;
        farRightX = W;

        tipLeftX = lerp(initialTipLeft, 0, p2);
        tipRightX = lerp(initialTipRight, W, p2);

        cp1x = lerp(initialTipLeft, 0, p2);
        cp1y = lerp(H * 0.62, (2 * H) / 3, p2);
        cp2x = lerp(0, 0, p2);
        cp2y = lerp(H * 0.38, H / 3, p2);

        cp3x = lerp(W, W, p2);
        cp3y = lerp(H * 0.38, H / 3, p2);
        cp4x = lerp(initialTipRight, W, p2);
        cp4y = lerp(H * 0.62, (2 * H) / 3, p2);

        translateY = (H * translationFactor) * (1 - p2) * 0.2;
      }

      if (i === frameCount - 1) {
        tipLeftX = 0;
        tipY = H;
        cp1x = 0;
        cp1y = (2 * H) / 3;
        cp2x = 0;
        cp2y = H / 3;
        farLeftX = 0;
        leadingY = 0;
        farRightX = W;
        cp3x = W;
        cp3y = H / 3;
        cp4x = W;
        cp4y = (2 * H) / 3;
        tipRightX = W;
        translateY = 0;
      }

      pathD = `M ${r(tipLeftX)} ${r(tipY)} C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(farLeftX)} ${r(leadingY)} L ${r(farRightX)} ${r(leadingY)} C ${r(cp3x)} ${r(cp3y)}, ${r(cp4x)} ${r(cp4y)}, ${r(tipRightX)} ${r(tipY)} L ${r(tipLeftX)} ${r(tipY)} Z`;
    } else if (edge === "left") {
      // Funnel tip clamped at left edge (x = 0)
      const tipHeight = clamp(origin.height, 24, Math.min(H * 0.5, 120));
      const initialTipCenterY = clamp(originCenterY, tipHeight / 2, H - tipHeight / 2);
      const initialTipTop = initialTipCenterY - tipHeight / 2;
      const initialTipBottom = initialTipCenterY + tipHeight / 2;

      let tipTopY: number;
      let tipBottomY: number;
      let tipX = 0;

      let farTopY: number;
      let farBottomY: number;
      let leadingX: number;

      let cp1x: number, cp1y: number;
      let cp2x: number, cp2y: number;
      let cp3x: number, cp3y: number;
      let cp4x: number, cp4y: number;

      if (p <= phaseSplit) {
        const p1 = p / phaseSplit;
        const leadingFactor = Math.sin((p1 * Math.PI) / 2);
        leadingX = Math.max(12, W * (0.05 + 0.95 * leadingFactor));

        tipTopY = initialTipTop;
        tipBottomY = initialTipBottom;

        farTopY = lerp(initialTipTop - initialTipCenterY * 0.15, 0, p1);
        farBottomY = lerp(initialTipBottom + (H - initialTipCenterY) * 0.15, H, p1);

        const dx = leadingX - tipX;
        cp1x = tipX + dx * 0.38;
        cp1y = tipTopY;
        cp2x = leadingX - dx * 0.38;
        cp2y = farTopY;

        cp3x = leadingX - dx * 0.38;
        cp3y = farBottomY;
        cp4x = tipX + dx * 0.38;
        cp4y = tipBottomY;

        translateX = -(W * translationFactor) * (1 - p1);
      } else {
        const p2 = (p - phaseSplit) / (1 - phaseSplit);
        leadingX = W;
        farTopY = 0;
        farBottomY = H;

        tipTopY = lerp(initialTipTop, 0, p2);
        tipBottomY = lerp(initialTipBottom, H, p2);

        cp1x = lerp(W * 0.38, W / 3, p2);
        cp1y = lerp(initialTipTop, 0, p2);
        cp2x = lerp(W * 0.62, (2 * W) / 3, p2);
        cp2y = lerp(0, 0, p2);

        cp3x = lerp(W * 0.62, (2 * W) / 3, p2);
        cp3y = lerp(H, H, p2);
        cp4x = lerp(W * 0.38, W / 3, p2);
        cp4y = lerp(initialTipBottom, H, p2);

        translateX = -(W * translationFactor) * (1 - p2) * 0.2;
      }

      if (i === frameCount - 1) {
        tipTopY = 0;
        tipX = 0;
        cp1x = W / 3;
        cp1y = 0;
        cp2x = (2 * W) / 3;
        cp2y = 0;
        leadingX = W;
        farTopY = 0;
        farBottomY = H;
        cp3x = (2 * W) / 3;
        cp3y = H;
        cp4x = W / 3;
        cp4y = H;
        tipBottomY = H;
        translateX = 0;
      }

      pathD = `M ${r(tipX)} ${r(tipTopY)} C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(leadingX)} ${r(farTopY)} L ${r(leadingX)} ${r(farBottomY)} C ${r(cp3x)} ${r(cp3y)}, ${r(cp4x)} ${r(cp4y)}, ${r(tipX)} ${r(tipBottomY)} L ${r(tipX)} ${r(tipTopY)} Z`;
    } else {
      // Funnel tip clamped at right edge (x = W)
      const tipHeight = clamp(origin.height, 24, Math.min(H * 0.5, 120));
      const initialTipCenterY = clamp(originCenterY, tipHeight / 2, H - tipHeight / 2);
      const initialTipTop = initialTipCenterY - tipHeight / 2;
      const initialTipBottom = initialTipCenterY + tipHeight / 2;

      let tipTopY: number;
      let tipBottomY: number;
      let tipX = W;

      let farTopY: number;
      let farBottomY: number;
      let leadingX: number;

      let cp1x: number, cp1y: number;
      let cp2x: number, cp2y: number;
      let cp3x: number, cp3y: number;
      let cp4x: number, cp4y: number;

      if (p <= phaseSplit) {
        const p1 = p / phaseSplit;
        const leadingFactor = Math.sin((p1 * Math.PI) / 2);
        leadingX = Math.min(W - 12, W - W * (0.05 + 0.95 * leadingFactor));

        tipTopY = initialTipTop;
        tipBottomY = initialTipBottom;

        farTopY = lerp(initialTipTop - initialTipCenterY * 0.15, 0, p1);
        farBottomY = lerp(initialTipBottom + (H - initialTipCenterY) * 0.15, H, p1);

        const dx = tipX - leadingX;
        cp1x = tipX - dx * 0.38;
        cp1y = tipTopY;
        cp2x = leadingX + dx * 0.38;
        cp2y = farTopY;

        cp3x = leadingX + dx * 0.38;
        cp3y = farBottomY;
        cp4x = tipX - dx * 0.38;
        cp4y = tipBottomY;

        translateX = (W * translationFactor) * (1 - p1);
      } else {
        const p2 = (p - phaseSplit) / (1 - phaseSplit);
        leadingX = 0;
        farTopY = 0;
        farBottomY = H;

        tipTopY = lerp(initialTipTop, 0, p2);
        tipBottomY = lerp(initialTipBottom, H, p2);

        cp1x = lerp(W * 0.62, (2 * W) / 3, p2);
        cp1y = lerp(initialTipTop, 0, p2);
        cp2x = lerp(W * 0.38, W / 3, p2);
        cp2y = lerp(0, 0, p2);

        cp3x = lerp(W * 0.38, W / 3, p2);
        cp3y = lerp(H, H, p2);
        cp4x = lerp(W * 0.62, (2 * W) / 3, p2);
        cp4y = lerp(initialTipBottom, H, p2);

        translateX = (W * translationFactor) * (1 - p2) * 0.2;
      }

      if (i === frameCount - 1) {
        tipTopY = 0;
        tipX = W;
        cp1x = (2 * W) / 3;
        cp1y = 0;
        cp2x = W / 3;
        cp2y = 0;
        leadingX = 0;
        farTopY = 0;
        farBottomY = H;
        cp3x = W / 3;
        cp3y = H;
        cp4x = (2 * W) / 3;
        cp4y = H;
        tipBottomY = H;
        translateX = 0;
      }

      pathD = `M ${r(tipX)} ${r(tipTopY)} C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(leadingX)} ${r(farTopY)} L ${r(leadingX)} ${r(farBottomY)} C ${r(cp3x)} ${r(cp3y)}, ${r(cp4x)} ${r(cp4y)}, ${r(tipX)} ${r(tipBottomY)} L ${r(tipX)} ${r(tipTopY)} Z`;
    }

    const keyframe: GenieKeyframe = {
      offset,
      clipPath: `path("${pathD}")`,
      transform: `translate3d(${r(translateX)}px, ${r(translateY)}px, 0)`,
    };

    if (dropShadow && i < frameCount - 1) {
      keyframe.filter = "drop-shadow(0 12px 28px rgba(0,0,0,0.18))";
    }

    keyframes.push(keyframe);
  }

  return keyframes;
}

/**
 * Builds keyframes for the outgoing old page:
 * Over the first 60%, animate opacity 1 -> 0.4 and scale 1 -> 0.985.
 * Never blurs (too costly for 60fps compositor performance).
 */
export function buildOldPageKeyframes(): GenieKeyframe[] {
  return [
    {
      offset: 0,
      opacity: 1,
      transform: "scale3d(1, 1, 1)",
    },
    {
      offset: 0.6,
      opacity: 0.4,
      transform: "scale3d(0.985, 0.985, 1)",
    },
    {
      offset: 1.0,
      opacity: 0,
      transform: "scale3d(0.985, 0.985, 1)",
    },
  ];
}

/**
 * Keyframes for reduced-motion users (120ms gentle cross-fade).
 */
export function buildReducedMotionKeyframes(): {
  oldPage: GenieKeyframe[];
  newPage: GenieKeyframe[];
} {
  return {
    oldPage: [
      { offset: 0, opacity: 1, transform: "none" },
      { offset: 1, opacity: 0, transform: "none" },
    ],
    newPage: [
      { offset: 0, opacity: 0, transform: "none" },
      { offset: 1, opacity: 1, transform: "none" },
    ],
  };
}

/**
 * Builds keyframes for closing / minimizing a tab (Reverse Genie Motion).
 * Smoothly pinches and sucks the window back down into its bottom dock icon.
 */
export function buildGenieCloseKeyframes(
  origin: SimpleRect | DOMRect,
  box: SimpleRect | DOMRect,
  opts?: GenieOptions
): GenieKeyframe[] {
  const forwardFrames = buildGenieKeyframes(origin, box, opts);
  const n = forwardFrames.length;

  return forwardFrames
    .slice()
    .reverse()
    .map((frame, idx) => {
      const rawProgress = idx / (n - 1);
      const offset = Math.round(rawProgress * 1000) / 1000;
      // Fade out smoothly as the funnel enters the dock icon over the final 15%
      const startFade = (n - 1) * 0.85;
      const opacity =
        idx >= startFade
          ? Math.max(0, 1 - (idx - startFade) / Math.max(1, (n - 1) - startFade))
          : 1;

      return {
        ...frame,
        offset,
        opacity: Math.round(opacity * 1000) / 1000,
      };
    });
}

