/**
 * originStore.ts
 *
 * Origin Tracking & Retrieval Store for macOS-Style Genie Effect
 *
 * Capabilities:
 * - Records getBoundingClientRect() on pointerdown/click for instant, accurate origin positioning.
 * - Resolves origins by route on popstate (back/forward) or programmatic navigation via [data-genie-origin="<route>"].
 * - Graceful fallback to 48x48 virtual origin at bottom-center of viewport (Dock position)
 *   if the target element is hidden, detached, or collapsed in a mobile drawer.
 */

import type { SimpleRect } from "./buildGenieKeyframes";

interface StoredOrigin {
  route: string;
  rect: SimpleRect;
  timestamp: number;
}

// Module-level in-memory store
let lastStoredOrigin: StoredOrigin | null = null;

/**
 * Creates a standard SimpleRect from a DOMRect or raw numbers
 */
export function toSimpleRect(rect: DOMRect | SimpleRect): SimpleRect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Fallback 48x48 virtual origin at bottom-center of viewport (macOS Dock default).
 */
export function getVirtualDockOrigin(): SimpleRect {
  if (typeof window === "undefined") {
    return {
      left: 176,
      top: 700,
      right: 224,
      bottom: 748,
      width: 48,
      height: 48,
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = 48;
  const left = Math.round((vw - size) / 2);
  const top = Math.round(vh - size - 12);

  return {
    left,
    top,
    right: left + size,
    bottom: top + size,
    width: size,
    height: size,
  };
}

/**
 * Records the bounding client rect of an item clicked to initiate navigation.
 */
export function setGenieOrigin(route: string, rect: DOMRect | SimpleRect | HTMLElement): void {
  let simpleRect: SimpleRect;

  if ("getBoundingClientRect" in rect) {
    simpleRect = toSimpleRect(rect.getBoundingClientRect());
  } else {
    simpleRect = toSimpleRect(rect);
  }

  lastStoredOrigin = {
    route,
    rect: simpleRect,
    timestamp: Date.now(),
  };
}

/**
 * Clears the stored origin.
 */
export function clearGenieOrigin(): void {
  lastStoredOrigin = null;
}

/**
 * Finds the origin for a given destination route.
 * Order of resolution:
 * 1. Matching stored origin from the initiating click/pointer event (if within 4 seconds).
 * 2. DOM query for [data-genie-origin="${route}"] or longest prefix match.
 * 3. Fallback virtual 48x48 dock origin at bottom-center of viewport.
 */
export function resolveOriginForRoute(destinationRoute: string): SimpleRect {
  // 1. Check recently clicked origin
  if (lastStoredOrigin && Date.now() - lastStoredOrigin.timestamp < 4000) {
    if (
      lastStoredOrigin.route === destinationRoute ||
      destinationRoute.startsWith(lastStoredOrigin.route) ||
      lastStoredOrigin.route.startsWith(destinationRoute)
    ) {
      const found = lastStoredOrigin.rect;
      lastStoredOrigin = null;
      return found;
    }
  }

  // 2. Lookup in DOM via data-genie-origin attribute
  if (typeof document !== "undefined") {
    try {
      // Direct exact match
      let el = document.querySelector<HTMLElement>(`[data-genie-origin="${destinationRoute}"]`);

      // Prefix match for nested subpaths (e.g. /andhra-pradesh/history -> /andhra-pradesh)
      if (!el) {
        const allOrigins = Array.from(document.querySelectorAll<HTMLElement>("[data-genie-origin]"));
        let bestMatch: HTMLElement | null = null;
        let longest = 0;
        for (const item of allOrigins) {
          const originPath = item.getAttribute("data-genie-origin");
          if (originPath && originPath !== "/" && destinationRoute.startsWith(originPath)) {
            if (originPath.length > longest) {
              longest = originPath.length;
              bestMatch = item;
            }
          }
        }
        el = bestMatch;
      }

      if (el) {
        const domRect = el.getBoundingClientRect();
        // Ensure element is visible and rendered with non-zero dimensions
        if (
          domRect.width > 0 &&
          domRect.height > 0 &&
          domRect.bottom > 0 &&
          domRect.right > 0 &&
          domRect.top < window.innerHeight &&
          domRect.left < window.innerWidth
        ) {
          return toSimpleRect(domRect);
        }
      }
    } catch (err) {
      console.warn("[Genie] Error looking up origin in DOM:", err);
    }
  }

  // 3. Fallback to virtual 48x48 Dock origin at bottom-center
  return getVirtualDockOrigin();
}
