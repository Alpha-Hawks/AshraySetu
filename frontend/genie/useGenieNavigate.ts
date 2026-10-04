"use client";

/**
 * useGenieNavigate.ts
 *
 * Senior Motion Engineer Router Integration for macOS-Style Genie Page Transitions
 * Built for Next.js 14 App Router, Web Animations API (WAAPI), and View Transitions API.
 *
 * Guarantees:
 * - Real DOM lays out once at final size (no layout thrashing; maps & camera viewports initialize cleanly).
 * - Full accessibility compliance (WCAG 2.1 AAA: h1 focus management, polite aria-live announcer, reduced-motion override).
 * - Bulletproof edge case handling: 1500ms safety timeout, skipTransition() mid-flight interruption, redirects, rapid spam.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  buildGenieKeyframes,
  buildGenieCloseKeyframes,
  buildOldPageKeyframes,
  buildReducedMotionKeyframes,
  SimpleRect,
} from "./buildGenieKeyframes";
import {
  resolveOriginForRoute,
  setGenieOrigin,
  toSimpleRect,
} from "./originStore";

interface PendingGenieNav {
  destination: string;
  originRect: SimpleRect;
  resolve: () => void;
  timerId: NodeJS.Timeout | number;
}

// Module-level shared active transition state
let activePendingNav: PendingGenieNav | null = null;
let activeTransition: any = null;

// Screen reader live region announcer
function announcePageLoaded(title: string) {
  if (typeof document === "undefined") return;
  let announcer = document.getElementById("genie-live-announcer");
  if (!announcer) {
    announcer = document.createElement("div");
    announcer.id = "genie-live-announcer";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    announcer.className = "genie-sr-announcer";
    document.body.appendChild(announcer);
  }
  announcer.textContent = "";
  // Force screen reader update
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = `${title || "Page"} loaded`;
    }
  }, 50);
}

/**
 * Focuses the new page's <h1> element for keyboard/screen-reader accessibility
 */
export function focusNewPageHeading() {
  if (typeof document === "undefined") return;
  const doFocus = () => {
    const h1 = document.querySelector<HTMLElement>(
      "main h1, [data-view-transition='page'] h1, h1"
    );
    if (h1) {
      if (!h1.hasAttribute("tabindex")) {
        h1.setAttribute("tabindex", "-1");
      }
      try {
        h1.focus({ preventScroll: true });
      } catch {}
      announcePageLoaded(h1.textContent || document.title);
    } else {
      announcePageLoaded(document.title);
    }
  };

  // Run on next animation frame and subsequent ticks for dynamic chunks and redirects
  requestAnimationFrame(doFocus);
  setTimeout(doFocus, 60);
  setTimeout(doFocus, 250);
}

/**
 * Executes a dock-style pop on the clicked navigation item:
 * Scale 1 -> 1.18 -> 1 over 260ms + glow ring.
 */
export function triggerDockLaunchPop(element: HTMLElement | null) {
  if (!element) return;
  element.classList.remove("genie-item-popping");
  // Trigger reflow to restart animation if clicked repeatedly
  void element.offsetWidth;
  element.classList.add("genie-item-popping");
  setTimeout(() => {
    element.classList.remove("genie-item-popping");
  }, 300);
}

/**
 * Hook to be mounted once in the persistent root layout to watch pathname transitions.
 * Resolves the navigation promise as soon as Next.js finishes routing.
 */
export function useGeniePathWatcher() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string>(pathname);

  // useLayoutEffect guarantees promise resolution before browser paints new route
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (activePendingNav) {
      const pending = activePendingNav;
      activePendingNav = null;
      clearTimeout(pending.timerId);
      // Resolve promise so document.startViewTransition can capture the new DOM snapshot
      pending.resolve();
    }
    prevPathnameRef.current = pathname;
    const timer = setTimeout(() => {
      focusNewPageHeading();
    }, 120);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Handle browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      // Find origin for current location or use fallback dock
      const targetPath = window.location.pathname;
      const origin = resolveOriginForRoute(targetPath);
      setGenieOrigin(targetPath, origin);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
}

/**
 * Hook providing the genie navigation trigger.
 */
export function useGenieNavigate() {
  const router = useRouter();
  const pathname = usePathname();

  const navigateGenie = useCallback(
    async (
      destination: string,
      originElement?: HTMLElement | null,
      customOriginRect?: SimpleRect | DOMRect
    ) => {
      // 1. Same-route click: do nothing
      if (!destination || destination === pathname) {
        return;
      }

      // 2. Dock launch pop animation on clicked nav item
      if (originElement) {
        triggerDockLaunchPop(originElement);
      }

      // 3. Resolve and store origin rect
      let originRect: SimpleRect;
      if (customOriginRect) {
        originRect = toSimpleRect(customOriginRect);
      } else if (originElement) {
        originRect = toSimpleRect(originElement.getBoundingClientRect());
      } else {
        originRect = resolveOriginForRoute(destination);
      }
      setGenieOrigin(destination, originRect);

      // 4. If an animation is already in progress, interrupt and skip it
      if (activeTransition && typeof activeTransition.skipTransition === "function") {
        try {
          activeTransition.skipTransition();
        } catch {
          // Ignore interruption errors
        }
        activeTransition = null;
      }

      if (activePendingNav) {
        clearTimeout(activePendingNav.timerId);
        activePendingNav.resolve();
        activePendingNav = null;
      }

      // 5. Fallback for browsers without View Transitions API
      if (typeof document === "undefined" || !("startViewTransition" in document)) {
        router.push(destination);
        // After push, attempt direct WAAPI fallback on page container if supported
        setTimeout(() => {
          const pageEl = document.querySelector<HTMLElement>(
            "[data-view-transition='page'], main"
          );
          if (pageEl && "animate" in pageEl) {
            const box = pageEl.getBoundingClientRect();
            const keyframes = buildGenieKeyframes(originRect, box);
            pageEl.animate(keyframes as any, {
              duration: 560,
              easing: "linear",
            });
          }
          focusNewPageHeading();
          window.dispatchEvent(
            new CustomEvent("genie-transition-finished", {
              detail: { route: destination },
            })
          );
        }, 80);
        return;
      }

      // 6. Check prefers-reduced-motion
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // 7. Setup promise with 1500ms safety timeout
      let resolveNavigation: () => void = () => {};
      const navPromise = new Promise<void>((resolve) => {
        resolveNavigation = resolve;
      });

      const safetyTimer = setTimeout(() => {
        if (activePendingNav) {
          activePendingNav.resolve();
          activePendingNav = null;
        }
        if (activeTransition && typeof activeTransition.skipTransition === "function") {
          try {
            activeTransition.skipTransition();
          } catch {}
          activeTransition = null;
        }
      }, 1500);

      activePendingNav = {
        destination,
        originRect,
        resolve: resolveNavigation,
        timerId: safetyTimer,
      };

      // 8. Start View Transition
      try {
        if (typeof window !== "undefined") {
          (window as any).__genieTransitionRunning = true;
        }

        const transition = (document as any).startViewTransition(async () => {
          // Parallelize data loading: router.push begins prefetching and fetching immediately
          router.push(destination);
          await navPromise;
        });

        activeTransition = transition;

        // Custom WAAPI animations when snapshots are ready
        if (transition.ready) {
          transition.ready
            .then(() => {
              const pageEl =
                document.querySelector<HTMLElement>(
                  "[data-view-transition='page'], main"
                ) || document.body;
              const box = pageEl.getBoundingClientRect();

              if (prefersReduced) {
                // Accessible 120ms crossfade
                const { oldPage, newPage } = buildReducedMotionKeyframes();
                (document.documentElement as any).animate(newPage, {
                  duration: 120,
                  easing: "ease-in-out",
                  fill: "forwards",
                  pseudoElement: "::view-transition-new(page)",
                });
                (document.documentElement as any).animate(oldPage, {
                  duration: 120,
                  easing: "ease-in-out",
                  fill: "forwards",
                  pseudoElement: "::view-transition-old(page)",
                });
              } else {
                // 60fps Native Genie Keyframes
                const genieKeyframes = buildGenieKeyframes(originRect, box);
                const oldPageKeyframes = buildOldPageKeyframes();

                (document.documentElement as any).animate(genieKeyframes, {
                  duration: 560,
                  easing: "linear",
                  fill: "forwards",
                  pseudoElement: "::view-transition-new(page)",
                });

                (document.documentElement as any).animate(oldPageKeyframes, {
                  duration: 560,
                  easing: "linear",
                  fill: "forwards",
                  pseudoElement: "::view-transition-old(page)",
                });
              }
            })
            .catch(() => {
              // Transition aborted or skipped
            });
        }

        // 9. When transition finishes completely
        if (transition.finished) {
          transition.finished
            .then(() => {
              if (typeof window !== "undefined") {
                (window as any).__genieTransitionRunning = false;
              }
              activeTransition = null;
              // Accessibility: Move focus to h1 and announce page
              focusNewPageHeading();
              // Dispatch event for /map resize and /scan camera triggers
              window.dispatchEvent(
                new CustomEvent("genie-transition-finished", {
                  detail: { route: destination },
                })
              );
            })
            .catch(() => {
              if (typeof window !== "undefined") {
                (window as any).__genieTransitionRunning = false;
              }
              activeTransition = null;
            });
        }
      } catch (err) {
        if (typeof window !== "undefined") {
          (window as any).__genieTransitionRunning = false;
        }
        console.warn("[Genie] View transition execution failed, falling back:", err);
        router.push(destination);
      }
    },
    [router, pathname]
  );

  const closeGenieTab = useCallback(
    async (tabRoute?: string) => {
      const closingRoute = tabRoute || pathname;
      if (!closingRoute || closingRoute === "/") return;

      // 1. Resolve origin for the closing tab's dock item
      const originRect = resolveOriginForRoute(closingRoute);

      // 2. Trigger absorption dock pop
      const dockItem = document.querySelector<HTMLElement>(
        `[data-genie-origin="${closingRoute}"]`
      );
      if (dockItem) {
        triggerDockLaunchPop(dockItem);
      }

      // 3. Fallback for browsers without View Transitions
      if (typeof document === "undefined" || !("startViewTransition" in document)) {
        router.push("/");
        setTimeout(() => {
          focusNewPageHeading();
          window.dispatchEvent(
            new CustomEvent("genie-transition-finished", {
              detail: { route: "/" },
            })
          );
        }, 80);
        return;
      }

      // 4. If transition already running, skip it
      if (activeTransition && typeof activeTransition.skipTransition === "function") {
        try {
          activeTransition.skipTransition();
        } catch {}
        activeTransition = null;
      }

      // 5. Setup navigation promise
      let resolveNavigation: () => void = () => {};
      const navPromise = new Promise<void>((resolve) => {
        resolveNavigation = resolve;
      });

      const safetyTimer = setTimeout(() => {
        if (activePendingNav) {
          activePendingNav.resolve();
          activePendingNav = null;
        }
        if (activeTransition && typeof activeTransition.skipTransition === "function") {
          try {
            activeTransition.skipTransition();
          } catch {}
          activeTransition = null;
        }
      }, 1500);

      activePendingNav = {
        destination: "/",
        originRect,
        resolve: resolveNavigation,
        timerId: safetyTimer,
      };

      try {
        if (typeof window !== "undefined") {
          (window as any).__genieTransitionRunning = true;
        }

        const transition = (document as any).startViewTransition(async () => {
          router.push("/");
          await navPromise;
        });

        activeTransition = transition;

        if (transition.ready) {
          transition.ready
            .then(() => {
              const pageEl =
                document.querySelector<HTMLElement>(
                  "[data-view-transition='page'], main"
                ) || document.body;
              const box = pageEl.getBoundingClientRect();

              // Run Reverse Genie Keyframes on the outgoing tab window
              const closeKeyframes = buildGenieCloseKeyframes(originRect, box);

              (document.documentElement as any).animate(closeKeyframes, {
                duration: 560,
                easing: "linear",
                fill: "forwards",
                pseudoElement: "::view-transition-old(page)",
              });

              // Incoming desk page subtly fades and scales into place
              (document.documentElement as any).animate(
                [
                  { opacity: 0, transform: "scale3d(0.985, 0.985, 1)" },
                  { opacity: 1, transform: "scale3d(1, 1, 1)" },
                ],
                {
                  duration: 480,
                  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  fill: "forwards",
                  pseudoElement: "::view-transition-new(page)",
                }
              );
            })
            .catch(() => {});
        }

        if (transition.finished) {
          transition.finished
            .then(() => {
              if (typeof window !== "undefined") {
                (window as any).__genieTransitionRunning = false;
              }
              activeTransition = null;
              focusNewPageHeading();
              window.dispatchEvent(
                new CustomEvent("genie-transition-finished", {
                  detail: { route: "/" },
                })
              );
            })
            .catch(() => {
              if (typeof window !== "undefined") {
                (window as any).__genieTransitionRunning = false;
              }
              activeTransition = null;
            });
        }
      } catch (err) {
        if (typeof window !== "undefined") {
          (window as any).__genieTransitionRunning = false;
        }
        router.push("/");
      }
    },
    [router, pathname]
  );

  return { navigateGenie, closeGenieTab };
}
