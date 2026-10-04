"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  enableSpotlight?: boolean;
  spotlightColor?: string;
  iridescent?: boolean;
}

export function LiquidGlassCard({
  children,
  className,
  enableSpotlight = true,
  spotlightColor = "rgba(56, 189, 248, 0.12)",
  iridescent = true,
  ...props
}: LiquidGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableSpotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "liquid-glass-material liquid-glass-card group relative p-6 select-none",
        className
      )}
      {...props}
    >
      {/* Real-Time Specular Cursor Spotlight Refraction */}
      {enableSpotlight && mousePos && (
        <div
          className="pointer-events-none absolute inset-0 z-[2] transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 75%)`,
          }}
        />
      )}

      {/* Subtle Chromatic Aberration Rim Highlight */}
      {iridescent && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-[3] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            padding: "1px",
            background:
              "linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(251, 191, 36, 0.25) 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      {/* Card Content with elevated relative z-index */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default LiquidGlassCard;
