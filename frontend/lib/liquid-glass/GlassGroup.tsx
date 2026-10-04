"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Glass, type GlassProps } from "./Glass";

export interface GlassGroupProps extends GlassProps {
  spacing?: "sm" | "md" | "lg" | "none";
}

/**
 * GlassGroup: The web analogue of SwiftUI's GlassEffectContainer.
 * A single unified glass container holding multiple controls.
 * Guarantees zero nested glass-on-glass violations: sub-items use .lg-inner-item.
 */
export const GlassGroup = React.forwardRef<HTMLDivElement, GlassGroupProps>(
  (
    {
      spacing = "sm",
      className,
      children,
      variant = "regular",
      thickness = "control",
      shape = "capsule",
      interactive = true,
      ...props
    },
    ref
  ) => {
    const spacingClass =
      spacing === "sm"
        ? "gap-1 p-1"
        : spacing === "md"
        ? "gap-1.5 p-1.5"
        : spacing === "lg"
        ? "gap-2 p-2"
        : "gap-0 p-0";

    return (
      <Glass
        ref={ref}
        variant={variant}
        thickness={thickness}
        shape={shape}
        interactive={interactive}
        className={cn("lg-group inline-flex items-center", spacingClass, className)}
        {...props}
      >
        {children}
      </Glass>
    );
  }
);

GlassGroup.displayName = "GlassGroup";

export default GlassGroup;
