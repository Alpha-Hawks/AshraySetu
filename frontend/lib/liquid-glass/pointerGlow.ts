/**
 * Liquid Glass Pointer Glow & Touch Bloom Engine
 * Compositor-only, rAF-throttled pointer tracking for specular rim and light blooms.
 */

export function attachPointerGlow(element: HTMLElement) {
  if (typeof window === "undefined" || !element) return () => {};

  let ticking = false;
  let targetX = 0;
  let targetY = 0;

  const onPointerMove = (e: PointerEvent) => {
    // Only track fine pointer movements (mouse, stylus)
    if (window.matchMedia && !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const rect = element.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        element.style.setProperty("--lg-glow-x", `${targetX}px`);
        element.style.setProperty("--lg-glow-y", `${targetY}px`);
        element.style.setProperty("--lg-glow-opacity", "1");
        ticking = false;
      });
      ticking = true;
    }
  };

  const onPointerLeave = () => {
    element.style.setProperty("--lg-glow-opacity", "0");
  };

  // Touch bloom: bloom instantly at contact point on pointerdown
  const onPointerDown = (e: PointerEvent) => {
    const rect = element.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;
    element.style.setProperty("--lg-glow-x", `${touchX}px`);
    element.style.setProperty("--lg-glow-y", `${touchY}px`);
    element.style.setProperty("--lg-glow-opacity", "1");
  };

  element.addEventListener("pointermove", onPointerMove, { passive: true });
  element.addEventListener("pointerleave", onPointerLeave, { passive: true });
  element.addEventListener("pointerdown", onPointerDown, { passive: true });

  return () => {
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerleave", onPointerLeave);
    element.removeEventListener("pointerdown", onPointerDown);
  };
}
