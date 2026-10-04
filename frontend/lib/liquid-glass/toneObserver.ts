/**
 * Liquid Glass Adaptive Tone Observer
 * Observes sections annotated with data-surface="light|dark|media|text"
 * Dynamically flips data-tone="light|dark" on floating controls with a smooth 250ms swap.
 */

export function observeSectionTone(
  floatingElement: HTMLElement,
  rootMarginTop: string = "-10px 0px -90% 0px"
): () => void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return () => {};
  }

  const sections = document.querySelectorAll("[data-surface]");
  if (sections.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      // Find the topmost intersecting section under the thin root band
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const surfaceType = entry.target.getAttribute("data-surface");
          if (surfaceType === "light") {
            floatingElement.setAttribute("data-tone", "light");
          } else if (surfaceType === "dark" || surfaceType === "text") {
            floatingElement.setAttribute("data-tone", "dark");
          } else if (surfaceType === "media") {
            floatingElement.setAttribute("data-tone", "media");
          }
          break;
        }
      }
    },
    {
      root: null,
      rootMargin: rootMarginTop,
      threshold: [0, 0.2, 0.5],
    }
  );

  sections.forEach((section) => observer.observe(section));

  return () => {
    observer.disconnect();
  };
}
