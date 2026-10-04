"use client";

import React, { useEffect, useRef, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { isChromiumEngine, generateDisplacementMapDataUrl, ensureSvgFilter } from "./lensEngine";
import { attachPointerGlow } from "./pointerGlow";
import { observeSectionTone } from "./toneObserver";

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "regular" | "clear" | "primary";
  thickness?: "control" | "surface";
  shape?: "capsule" | "surface" | "circle";
  interactive?: boolean;
  enableLens?: boolean;
  adaptTone?: boolean;
  children?: React.ReactNode;
}

export const Glass = React.forwardRef<HTMLDivElement, GlassProps>(
  (
    {
      variant = "regular",
      thickness = "control",
      shape = thickness === "surface" ? "surface" : "capsule",
      interactive = false,
      enableLens = true,
      adaptTone = false,
      className,
      children,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const elementRef = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
    const rawId = useId();
    const safeId = `lg-lens-${rawId.replace(/[^a-zA-Z0-9-]/g, "")}`;
    const [useTier2Lens, setUseTier2Lens] = useState(false);

    // Progressive Lens Enhancement (Chromium only, small controls only, not full surfaces)
    useEffect(() => {
      const el = elementRef.current;
      if (!el || !enableLens || thickness === "surface") return;

      if (!isChromiumEngine()) return;

      let timer: NodeJS.Timeout;

      const updateMap = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;

        const radius =
          shape === "circle"
            ? Math.min(rect.width, rect.height) / 2
            : shape === "capsule"
            ? rect.height / 2
            : 24;

        const mapDataUrl = generateDisplacementMapDataUrl(rect.width, rect.height, radius, 14);
        if (mapDataUrl) {
          ensureSvgFilter(safeId, mapDataUrl, 8);
          setUseTier2Lens(true);
        }
      };

      // Debounced ResizeObserver
      const ro = new ResizeObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(updateMap, 100);
      });

      ro.observe(el);
      updateMap();

      return () => {
        clearTimeout(timer);
        ro.disconnect();
      };
    }, [enableLens, thickness, shape, safeId, elementRef]);

    // Pointer Glow & Touch Bloom
    useEffect(() => {
      const el = elementRef.current;
      if (!el || !interactive) return;
      return attachPointerGlow(el);
    }, [interactive, elementRef]);

    // Section Tone Adaptivity
    useEffect(() => {
      const el = elementRef.current;
      if (!el || !adaptTone) return;
      return observeSectionTone(el);
    }, [adaptTone, elementRef]);

    const variantClass =
      variant === "clear"
        ? "lg-clear"
        : variant === "primary"
        ? "lg-primary"
        : thickness === "surface"
        ? "lg-surface"
        : "lg-control";

    const shapeClass =
      shape === "circle"
        ? "rounded-full aspect-square"
        : shape === "capsule"
        ? "rounded-full"
        : "rounded-[24px]";

    const interactiveClass = interactive ? "lg-interactive cursor-pointer select-none" : "";

    return (
      <div
        ref={elementRef}
        className={cn(
          "lg-base",
          variantClass,
          shapeClass,
          interactiveClass,
          useTier2Lens ? "lg-tier2-active" : "",
          className
        )}
        style={{
          ...(useTier2Lens
            ? ({
                "--lg-lens-filter": `url(#${safeId})`,
              } as React.CSSProperties)
            : {}),
          ...style,
        }}
        {...props}
      >
        {/* Glow overlay layer (blooms from pointer or touch point) */}
        {interactive && (
          <div
            className="lg-pointer-glow pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {children}
        </div>
      </div>
    );
  }
);

Glass.displayName = "Glass";

export default Glass;
