"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "crystal" | "green" | "blue";
  size?: "default" | "10cm";
  shape?: "rect" | "pill";
  children: React.ReactNode;
  className?: string;
  enableGlowDot?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      variant = "crystal",
      size = "default",
      shape = "rect",
      children,
      className,
      enableGlowDot = false,
      style,
      ...props
    },
    ref
  ) => {
    const is10cm = size === "10cm";
    const borderRadius = shape === "rect" ? "14px" : "9999px";

    // 100% Crystal Clear Glass (Zero White Blur)
    const baseStyle: React.CSSProperties =
      variant === "crystal"
        ? {
            background: "transparent",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            borderTop: "1.25px solid rgba(255, 255, 255, 0.85)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.55)",
            borderRight: "1px solid rgba(255, 255, 255, 0.35)",
            borderBottom: "1.25px solid rgba(0, 0, 0, 0.22)",
            boxShadow: `
              inset 0px 1px 1px 0px rgba(255, 255, 255, 0.85),
              inset 1px 0px 1px 0px rgba(255, 255, 255, 0.60),
              inset 0px -1px 2px 0px rgba(0, 0, 0, 0.25),
              inset -1px 0px 2px 0px rgba(0, 0, 0, 0.15),
              0px 18px 36px -8px rgba(0, 0, 0, 0.26),
              0px 4px 10px -2px rgba(0, 0, 0, 0.14)
            `,
            borderRadius,
            ...(is10cm ? { width: "10cm", height: "10cm", minWidth: "10cm", minHeight: "10cm" } : {}),
            ...style,
          }
        : variant === "green"
        ? {
            background: "rgba(255, 255, 255, 0.14)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1.5px solid rgba(115, 220, 125, 0.35)",
            boxShadow:
              "0 0 18px rgba(90, 210, 100, 0.14), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.28)",
            borderRadius,
            ...(is10cm ? { width: "10cm", height: "10cm", minWidth: "10cm", minHeight: "10cm" } : {}),
            ...style,
          }
        : {
            background: "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1.5px solid rgba(150, 205, 255, 0.32)",
            boxShadow:
              "0 0 18px rgba(100, 180, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.28)",
            borderRadius,
            ...(is10cm ? { width: "10cm", height: "10cm", minWidth: "10cm", minHeight: "10cm" } : {}),
            ...style,
          };

    return (
      <button
        ref={ref}
        type="button"
        style={baseStyle}
        className={cn(
          "group relative inline-flex items-center justify-center gap-3 px-7 py-3.5 text-base font-semibold tracking-tight transition-all duration-200 cursor-pointer select-none",
          "hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2",
          variant === "crystal"
            ? "text-white focus-visible:ring-white/50 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.45)]"
            : variant === "green"
            ? "text-emerald-950 dark:text-emerald-50 focus-visible:ring-emerald-400"
            : "text-blue-950 dark:text-blue-50 focus-visible:ring-blue-400",
          className
        )}
        {...props}
      >
        {enableGlowDot && (
          <span
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              variant === "crystal"
                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                : variant === "green"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(90,210,100,0.8)]"
                : "bg-blue-400 shadow-[0_0_8px_rgba(100,180,255,0.8)]"
            )}
          />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export default GlassButton;
