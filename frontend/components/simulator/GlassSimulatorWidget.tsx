"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useVelocity,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Sliders,
  X,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Layers,
  Sparkles,
  Type,
  Sun,
  Compass,
  Square,
  Droplets,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Advanced Rectangular Liquid Glass Button Simulator
 * - Rectangular Shape with adjustable corner radius (0px sharp rectangle to 40px rounded rect).
 * - Full Liquid Glass Creation Suite:
 *     * Glass Tints: Crystal Clear, Cyan Aquamarine, Emerald Wave, Smoked Obsidian, Amethyst Ice.
 *     * Fluid Caustics & Ambient Underglow.
 *     * Surface Specular Reflection: Intensity, light sweep angle, and convex sheen.
 *     * Optical Refraction: Index of Refraction (IOR), lens saturation, contrast, and chromatic prism dispersion.
 *     * 5 Concentric Background Blur Layers (2%, 10%, 25%, 50%, 100%).
 *     * 3-Point Inner Shadows (Top-Left, Perimeter, Bottom-Right).
 * - Non-modal side panel: Edit options open directly BESIDE the button for live editing without separate tabs or full-screen dialogs.
 * - Freely draggable & rollable around the website with angular velocity momentum.
 */

export interface ShapeSettings {
  sizeMode: "10cm" | "compact" | "custom";
  widthCm: number;  // Default 10
  heightCm: number; // Default 10
  borderRadius: number; // 0px (sharp rectangle) to 40px (rounded rect)
  paddingX: number;     // 24px - 60px
  paddingY: number;     // 12px - 32px
  borderThickness: number; // 0.75px - 3px
  showDimensionBadge: boolean;
}

export interface LiquidSettings {
  tintColor: "clear" | "cyan" | "emerald" | "smoke" | "amethyst";
  tintOpacity: number;    // 0% - 40%
  fluidUnderglow: number; // 0% - 100% (caustics underglow)
  underglowColor: "cyan" | "emerald" | "white" | "violet";
  surfaceViscosity: number; // 0% - 100% (liquid sheen intensity)
}

export interface OpticsSettings {
  reflectionOpacity: number; // 0% - 100%
  reflectionAngle: number;   // -180deg to 180deg
  reflectionSpread: number;  // 20% - 90%
  specularSheen: number;     // 0% - 100%
  refractionIndex: number;      // 1.00 to 1.60 (IOR)
  refractionSaturation: number; // 100% to 250%
  refractionContrast: number;   // 100% to 140%
  chromaticDispersion: number;  // 0% - 100%
}

export interface GradientBlurSettings {
  topBlur: number;      // Maximum blur at the top (0px - 50px, default 28px)
  bottomBlur: number;   // Decreased blur at the bottom (0px - 15px, default 0px - crystal clear)
  angle: number;        // Direction angle: 180deg = strictly Top to Down
  falloffMidpoint: number; // Midpoint transition percentage (20% - 80%)
}

export interface InnerShadowLayers {
  topLeftWhiteOpacity: number;  // #FFFFFF 50%
  topLeftGrayOpacity: number;   // #B3B3B3 100%
  perimeterDarkOpacity: number; // #999999 100%
  perimeterLightOpacity: number;// #F2F2F2 50%
  bottomRightDarkOpacity: number; // #B3B3B3 100%
}

export const DEFAULT_SHAPE_SETTINGS: ShapeSettings = {
  sizeMode: "compact", // Compact by default to not obstruct page, expandable via tuner
  widthCm: 10,
  heightCm: 10,
  borderRadius: 24, // Sleek liquid glass rounded rectangle
  paddingX: 22,
  paddingY: 12,
  borderThickness: 1.25,
  showDimensionBadge: false,
};

export const DEFAULT_LIQUID_SETTINGS: LiquidSettings = {
  tintColor: "clear",
  tintOpacity: 4,
  fluidUnderglow: 35,
  underglowColor: "cyan",
  surfaceViscosity: 50,
};

export const DEFAULT_OPTICS_SETTINGS: OpticsSettings = {
  reflectionOpacity: 45,
  reflectionAngle: -45,
  reflectionSpread: 60,
  specularSheen: 55,
  refractionIndex: 1.33,
  refractionSaturation: 160,
  refractionContrast: 106,
  chromaticDispersion: 30,
};

export const DEFAULT_GRADIENT_BLUR: GradientBlurSettings = {
  topBlur: 28,          // Maximum blur at the top
  bottomBlur: 0,        // Decreased to 0px at the bottom (100% crystal clear)
  angle: 180,           // 180deg = strictly Top to Down
  falloffMidpoint: 50,  // Smooth linear-to-quadratic decrease
};

export const DEFAULT_SHADOW_LAYERS: InnerShadowLayers = {
  topLeftWhiteOpacity: 50,  // #FFFFFF 50%
  topLeftGrayOpacity: 100,  // #B3B3B3 100%
  perimeterDarkOpacity: 100,// #999999 100%
  perimeterLightOpacity: 50,// #F2F2F2 50%
  bottomRightDarkOpacity: 100, // #B3B3B3 100%
};

export function GlassSimulatorWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [shape, setShape] = useState<ShapeSettings>(DEFAULT_SHAPE_SETTINGS);
  const [liquid, setLiquid] = useState<LiquidSettings>(DEFAULT_LIQUID_SETTINGS);
  const [optics, setOptics] = useState<OpticsSettings>(DEFAULT_OPTICS_SETTINGS);
  const [gradientBlur, setGradientBlur] = useState<GradientBlurSettings>(DEFAULT_GRADIENT_BLUR);
  const [shadowLayers, setShadowLayers] = useState<InnerShadowLayers>(DEFAULT_SHADOW_LAYERS);
  const [buttonText, setButtonText] = useState("Liquid Glass");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showPhotoGuides, setShowPhotoGuides] = useState(false);
  const [activeTab, setActiveTab] = useState<"shape" | "liquid" | "optics" | "blurs" | "shadows" | "code">("shape");
  const [copied, setCopied] = useState(false);
  const [dragKey, setDragKey] = useState(0);

  // Motion values for full-screen rolling
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  const smoothXVelocity = useSpring(xVelocity, { damping: 28, stiffness: 200 });
  const smoothYVelocity = useSpring(yVelocity, { damping: 28, stiffness: 200 });

  // Dynamic roll rotation based on horizontal travel speed (up to ±20deg)
  const rollAngle = useTransform(
    smoothXVelocity,
    [-2400, 0, 2400],
    [-20, 0, 20],
    { clamp: true }
  );

  const pitchAngle = useTransform(
    smoothYVelocity,
    [-2400, 0, 2400],
    [10, 0, -10],
    { clamp: true }
  );

  // Reset to defaults
  const handleResetToPhoto = () => {
    setShape({ ...DEFAULT_SHAPE_SETTINGS });
    setLiquid({ ...DEFAULT_LIQUID_SETTINGS });
    setOptics({ ...DEFAULT_OPTICS_SETTINGS });
    setGradientBlur({ ...DEFAULT_GRADIENT_BLUR });
    setShadowLayers({ ...DEFAULT_SHADOW_LAYERS });
    setButtonText("Liquid Glass");
  };

  // Preset: 10cm × 10cm × 10cm × 10cm Exact Equilateral Rectangle
  const handleSet10cmRect = () => {
    setShape((prev) => ({
      ...prev,
      sizeMode: "10cm",
      widthCm: 10,
      heightCm: 10,
      borderRadius: 10,
    }));
  };

  // Preset: Tuned Liquid Glass (Refraction 40, Bezel 31px, Blur 5px, Saturation 100%, Specular 1.0, Fringe 4px)
  const handleSetUserTunedOptions = () => {
    setShape((prev) => ({
      ...prev,
      sizeMode: "10cm",
      widthCm: 10,
      heightCm: 10,
      borderRadius: 10,
    }));
    setOptics((prev) => ({
      ...prev,
      refractionIndex: 1.40,
      refractionSaturation: 100,
      specularSheen: 100,
      reflectionOpacity: 100,
      chromaticDispersion: 40,
    }));
    setGradientBlur((prev) => ({
      ...prev,
      topBlur: 5,
      bottomBlur: 0,
    }));
  };

  // Preset: Sharp 10cm × 10cm Rectangle (0px corner radius)
  const handleSetSharp10cmRect = () => {
    setShape((prev) => ({
      ...prev,
      sizeMode: "10cm",
      widthCm: 10,
      heightCm: 10,
      borderRadius: 0,
    }));
  };

  // Preset: Compact Rect (Auto Fit)
  const handleSetCompactRect = () => {
    setShape((prev) => ({
      ...prev,
      sizeMode: "compact",
      borderRadius: 14,
    }));
  };

  // Preset: Sharp Rectangle (0px corner radius)
  const handleSetSharpRectangle = () => {
    setShape((prev) => ({ ...prev, borderRadius: 0 }));
  };

  // Preset: Modern Rounded Rect (14px corner radius)
  const handleSetModernRect = () => {
    setShape((prev) => ({ ...prev, borderRadius: 14 }));
  };

  // Preset: Soft Squircle (24px corner radius)
  const handleSetSquircle = () => {
    setShape((prev) => ({ ...prev, borderRadius: 24 }));
  };

  // Preset: Pure 100% crystal clear
  const handleSetPureCrystal = () => {
    setLiquid((prev) => ({ ...prev, tintColor: "clear", tintOpacity: 0, fluidUnderglow: 15 }));
    setGradientBlur({
      topBlur: 6,
      bottomBlur: 0,
      angle: 180,
      falloffMidpoint: 50,
    });
    setOptics((prev) => ({
      ...prev,
      reflectionOpacity: 25,
      refractionSaturation: 130,
      refractionContrast: 104,
    }));
  };

  // Reset position
  const handleResetPosition = () => {
    setDragKey((k) => k + 1);
  };

  // Compute tint color background string
  const dynamicTintBackground = useMemo(() => {
    const opacity = (liquid.tintOpacity / 100).toFixed(2);
    switch (liquid.tintColor) {
      case "cyan":
        return `rgba(56, 189, 248, ${opacity})`;
      case "emerald":
        return `rgba(52, 211, 153, ${opacity})`;
      case "smoke":
        return `rgba(15, 23, 42, ${opacity})`;
      case "amethyst":
        return `rgba(168, 85, 247, ${opacity})`;
      case "clear":
      default:
        return `rgba(255, 255, 255, ${opacity})`;
    }
  }, [liquid.tintColor, liquid.tintOpacity]);

  // Compute underglow caustics color
  const dynamicUnderglowShadow = useMemo(() => {
    if (liquid.fluidUnderglow === 0) return "none";
    const factor = (liquid.fluidUnderglow / 100).toFixed(2);
    switch (liquid.underglowColor) {
      case "cyan":
        return `0px 20px 45px -8px rgba(56, 189, 248, ${(Number(factor) * 0.45).toFixed(2)})`;
      case "emerald":
        return `0px 20px 45px -8px rgba(52, 211, 153, ${(Number(factor) * 0.45).toFixed(2)})`;
      case "violet":
        return `0px 20px 45px -8px rgba(168, 85, 247, ${(Number(factor) * 0.45).toFixed(2)})`;
      case "white":
      default:
        return `0px 20px 45px -8px rgba(255, 255, 255, ${(Number(factor) * 0.45).toFixed(2)})`;
    }
  }, [liquid.fluidUnderglow, liquid.underglowColor]);

  // Build dynamic box-shadow from the 3 photo lighting points + underglow
  const dynamicBoxShadow = useMemo(() => {
    const tlWhite = (shadowLayers.topLeftWhiteOpacity / 100).toFixed(2);
    const tlGray = (shadowLayers.topLeftGrayOpacity / 100).toFixed(2);
    const perDark = (shadowLayers.perimeterDarkOpacity / 100).toFixed(2);
    const perLight = (shadowLayers.perimeterLightOpacity / 100).toFixed(2);
    const brDark = (shadowLayers.bottomRightDarkOpacity / 100).toFixed(2);

    const baseShadows = [
      `inset 0px 1.5px 1.5px 0px rgba(255, 255, 255, ${tlWhite})`,
      `inset 1.5px 0px 2px 0px rgba(179, 179, 179, ${tlGray})`,
      `inset 0px 0px 0px 1px rgba(242, 242, 242, ${perLight})`,
      `inset 0px 0px 12px 0px rgba(153, 153, 153, ${(Number(perDark) * 0.25).toFixed(2)})`,
      `inset 0px -1.5px 2px 0px rgba(0, 0, 0, ${(Number(brDark) * 0.35).toFixed(2)})`,
      `inset -1.5px -2px 4px 0px rgba(179, 179, 179, ${(Number(brDark) * 0.45).toFixed(2)})`,
      `0px 18px 36px -8px rgba(0, 0, 0, 0.26)`,
      `0px 4px 10px -2px rgba(0, 0, 0, 0.14)`,
    ];

    if (dynamicUnderglowShadow !== "none") {
      baseShadows.push(dynamicUnderglowShadow);
    }

    return baseShadows.join(", ");
  }, [shadowLayers, dynamicUnderglowShadow]);

  // Compute progressive blur mask: decreasing blur effect strictly from top to down
  const progressiveBlurMask = useMemo(() => {
    const bRatio =
      gradientBlur.topBlur > 0
        ? Math.min(1, gradientBlur.bottomBlur / gradientBlur.topBlur)
        : 0;

    // Smooth nonlinear falloff curve modulating blur intensity from top to down
    const s20 = (1 - (1 - bRatio) * 0.15).toFixed(3);
    const s40 = (1 - (1 - bRatio) * 0.40).toFixed(3);
    const s60 = (1 - (1 - bRatio) * 0.68).toFixed(3);
    const s80 = (1 - (1 - bRatio) * 0.88).toFixed(3);
    const s100 = bRatio.toFixed(3);

    return `linear-gradient(${gradientBlur.angle}deg, rgba(0,0,0,1) 0%, rgba(0,0,0,${s20}) 20%, rgba(0,0,0,${s40}) 40%, rgba(0,0,0,${s60}) 60%, rgba(0,0,0,${s80}) 80%, rgba(0,0,0,${s100}) 100%)`;
  }, [gradientBlur]);

  // Generate clean CSS snippet
  const generatedCss = useMemo(() => {
    const widthCss =
      shape.sizeMode === "10cm"
        ? "width: 10cm; /* 377.95px */"
        : shape.sizeMode === "custom"
        ? `width: ${shape.widthCm}cm;`
        : "width: auto;";
    const heightCss =
      shape.sizeMode === "10cm"
        ? "height: 10cm; /* 377.95px */"
        : shape.sizeMode === "custom"
        ? `height: ${shape.heightCm}cm;`
        : "height: auto;";

    return `/* Rectangular Liquid Glass Specification (10cm × 10cm × 10cm × 10cm) */
/* 1. Geometry & Physical Dimensions */
${widthCss}
${heightCss}
border-radius: ${shape.borderRadius}px;
padding: ${shape.paddingY}px ${shape.paddingX}px;
border: ${shape.borderThickness}px solid rgba(255, 255, 255, 0.65);
border-top: ${shape.borderThickness}px solid rgba(255, 255, 255, 0.85);
border-bottom: ${shape.borderThickness}px solid rgba(0, 0, 0, 0.25);

/* 2. Liquid Glass Tint & Optics */
background: ${dynamicTintBackground};
backdrop-filter: saturate(${optics.refractionSaturation}%) contrast(${optics.refractionContrast}%);
-webkit-backdrop-filter: saturate(${optics.refractionSaturation}%) contrast(${optics.refractionContrast}%);

/* 3. Surface Specular Reflection */
--reflection-opacity: ${(optics.reflectionOpacity / 100).toFixed(2)};
--reflection-angle: ${optics.reflectionAngle}deg;
--refraction-ior: ${optics.refractionIndex};

/* 4. Single Combined Progressive Blur Layer (Decreasing Top to Down) */
backdrop-filter: blur(${gradientBlur.topBlur}px);
-webkit-backdrop-filter: blur(${gradientBlur.topBlur}px);
mask-image: ${progressiveBlurMask};
-webkit-mask-image: ${progressiveBlurMask};

/* 5. 3-Point Inner Shadows & Caustics */
box-shadow:
  inset 0px 1.5px 1.5px rgba(255, 255, 255, ${(shadowLayers.topLeftWhiteOpacity / 100).toFixed(2)}),
  inset 1.5px 0px 2px rgba(179, 179, 179, ${(shadowLayers.topLeftGrayOpacity / 100).toFixed(2)}),
  inset 0px 0px 0px 1px rgba(242, 242, 242, ${(shadowLayers.perimeterLightOpacity / 100).toFixed(2)}),
  inset 0px 0px 12px rgba(153, 153, 153, ${(shadowLayers.perimeterDarkOpacity * 0.0025).toFixed(2)}),
  inset 0px -1.5px 2px rgba(0, 0, 0, ${(shadowLayers.bottomRightDarkOpacity * 0.0035).toFixed(2)}),
  inset -1.5px -2px 4px rgba(179, 179, 179, ${(shadowLayers.bottomRightDarkOpacity * 0.0045).toFixed(2)}),
  0px 18px 36px -8px rgba(0, 0, 0, 0.26),
  0px 4px 10px -2px rgba(0, 0, 0, 0.14);`;
  }, [shape, liquid, optics, gradientBlur, shadowLayers, dynamicTintBackground, progressiveBlurMask]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[10005] p-4 sm:p-7 flex items-end justify-end overflow-hidden"
      aria-label="Liquid Glass Canvas"
    >
      {/* FREELY ROLLING COMPONENT WRAPPER */}
      <motion.div
        key={`crystal-glass-group-${dragKey}`}
        drag
        dragConstraints={containerRef}
        dragElastic={0.2}
        dragMomentum={true}
        dragTransition={{
          bounceStiffness: 350,
          bounceDamping: 24,
          power: 0.28,
          timeConstant: 300,
        }}
        style={{ x, y }}
        className="pointer-events-auto flex flex-col sm:flex-row items-end gap-3 select-none"
      >
        {/* EDIT OPTIONS PANEL (OPENS DIRECTLY BESIDE THE BUTTON) */}
        <AnimatePresence>
          {isEditorOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.94, x: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-80 sm:w-[370px] max-h-[80vh] flex flex-col rounded-3xl overflow-hidden bg-slate-950/95 text-slate-100 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.2)] z-20"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Liquid Glass Studio</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        Rectangular
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleResetToPhoto}
                    className="p-1 rounded-md text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
                    title="Reset to Defaults"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/20 transition cursor-pointer"
                    title="Close Tuner"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/40 border-b border-white/10 text-xs overflow-x-auto [scrollbar-width:none]">
                <div className="flex items-center gap-1">
                  {/* Shape Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("shape")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1",
                      activeTab === "shape"
                        ? "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Square className="w-3 h-3 text-amber-400" />
                    <span>Shape</span>
                  </button>

                  {/* Liquid Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("liquid")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1",
                      activeTab === "liquid"
                        ? "bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Droplets className="w-3 h-3 text-sky-400" />
                    <span>Liquid</span>
                  </button>

                  {/* Optics Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("optics")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1",
                      activeTab === "optics"
                        ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Optics</span>
                  </button>

                  {/* Blur Gradient Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("blurs")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1",
                      activeTab === "blurs"
                        ? "bg-lime-500/25 text-lime-200 border border-lime-400/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                    <span>Blur Gradient</span>
                  </button>

                  {/* Shadows Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("shadows")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1",
                      activeTab === "shadows"
                        ? "bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>Shadows</span>
                  </button>

                  {/* CSS Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer",
                      activeTab === "code"
                        ? "bg-white/20 text-white border border-white/30"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <span>CSS</span>
                  </button>
                </div>
              </div>

              {/* Panel Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 [scrollbar-width:thin]">
                {/* Button Label Customizer */}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Type className="w-3 h-3 text-cyan-400" />
                      <span>Button Label</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setButtonText("")}
                      className="text-[10px] text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      Clear (Pure Glass)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Enter custom label or leave blank..."
                    className="w-full px-2.5 py-1 text-xs rounded-lg bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* TAB 1: RECTANGULAR SHAPE & FORM */}
                {activeTab === "shape" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Square className="w-3.5 h-3.5 text-amber-300" />
                          <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                            Dimensions & Geometry
                          </h4>
                        </div>

                        {/* Shape Presets */}
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={handleSetUserTunedOptions}
                            className={cn(
                              "px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer",
                              shape.sizeMode === "10cm" && optics.refractionIndex === 1.40
                                ? "bg-cyan-400 text-slate-950 shadow-xs"
                                : "bg-white/10 hover:bg-white/20 text-cyan-300 font-medium"
                            )}
                            title="10*10*10*10 Tuned Preset: Refraction 40, Bezel 31, Blur 5px, Saturation 100%, Specular 1.0, Fringe 4px"
                          >
                            10*10*10*10 Tuned
                          </button>
                          <button
                            type="button"
                            onClick={handleSet10cmRect}
                            className={cn(
                              "px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer",
                              shape.sizeMode === "10cm" && shape.borderRadius > 0
                                ? "bg-amber-400 text-slate-950 shadow-xs"
                                : "bg-white/10 hover:bg-white/20 text-amber-300 font-medium"
                            )}
                            title="10cm × 10cm × 10cm × 10cm Equilateral Rectangle"
                          >
                            10cm × 10cm
                          </button>
                          <button
                            type="button"
                            onClick={handleSetSharp10cmRect}
                            className={cn(
                              "px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer",
                              shape.sizeMode === "10cm" && shape.borderRadius === 0
                                ? "bg-amber-400 text-slate-950 shadow-xs"
                                : "bg-white/10 hover:bg-white/20 text-amber-300 font-medium"
                            )}
                            title="Sharp 0px 10cm Rectangle"
                          >
                            Sharp 10cm
                          </button>
                          <button
                            type="button"
                            onClick={handleSetCompactRect}
                            className={cn(
                              "px-1.5 py-0.5 rounded-md font-bold transition cursor-pointer",
                              shape.sizeMode === "compact"
                                ? "bg-amber-400 text-slate-950 shadow-xs"
                                : "bg-white/10 hover:bg-white/20 text-amber-300 font-medium"
                            )}
                            title="Compact Rect (Auto Fit)"
                          >
                            Compact
                          </button>
                        </div>
                      </div>

                      {/* 10cm Dimensions Specification Banner */}
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/20 text-[11px] text-amber-100 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>10cm × 10cm × 10cm × 10cm Slab</span>
                          </span>
                          <span className="font-mono text-amber-300">~378px × ~378px</span>
                        </div>
                        <div className="text-[10px] text-amber-200/70 flex justify-between font-mono">
                          <span>Top: 10cm</span>
                          <span>Right: 10cm</span>
                          <span>Bottom: 10cm</span>
                          <span>Left: 10cm</span>
                        </div>
                      </div>

                      {/* Dimensions Mode Selector */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Dimensions Mode</span>
                          <span className="font-mono text-amber-300">
                            {shape.sizeMode === "10cm"
                              ? "10cm × 10cm"
                              : shape.sizeMode === "compact"
                              ? "Auto Fit"
                              : `${shape.widthCm}cm × ${shape.heightCm}cm`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={handleSet10cmRect}
                            className={cn(
                              "py-1 rounded-lg border font-bold transition cursor-pointer",
                              shape.sizeMode === "10cm"
                                ? "bg-amber-500/30 text-amber-200 border-amber-400"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            )}
                          >
                            10cm Exact
                          </button>
                          <button
                            type="button"
                            onClick={handleSetCompactRect}
                            className={cn(
                              "py-1 rounded-lg border font-bold transition cursor-pointer",
                              shape.sizeMode === "compact"
                                ? "bg-amber-500/30 text-amber-200 border-amber-400"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            )}
                          >
                            Compact
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setShape((prev) => ({
                                ...prev,
                                sizeMode: "custom",
                              }))
                            }
                            className={cn(
                              "py-1 rounded-lg border font-bold transition cursor-pointer",
                              shape.sizeMode === "custom"
                                ? "bg-amber-500/30 text-amber-200 border-amber-400"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            )}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {/* Custom cm Sliders (when custom mode is selected) */}
                      {shape.sizeMode === "custom" && (
                        <div className="space-y-2 p-2 rounded-xl bg-black/40 border border-white/10">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-300">
                              <span>Width (cm)</span>
                              <span className="font-mono text-amber-300">{shape.widthCm} cm</span>
                            </div>
                            <input
                              type="range"
                              min="4"
                              max="18"
                              step="0.5"
                              value={shape.widthCm}
                              onChange={(e) =>
                                setShape((prev) => ({
                                  ...prev,
                                  widthCm: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-300">
                              <span>Height (cm)</span>
                              <span className="font-mono text-amber-300">{shape.heightCm} cm</span>
                            </div>
                            <input
                              type="range"
                              min="4"
                              max="18"
                              step="0.5"
                              value={shape.heightCm}
                              onChange={(e) =>
                                setShape((prev) => ({
                                  ...prev,
                                  heightCm: Number(e.target.value),
                                }))
                              }
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      {/* Corner Radius Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Corner Radius</span>
                          <span className="font-mono text-amber-300">{shape.borderRadius} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={shape.borderRadius}
                          onChange={(e) =>
                            setShape((prev) => ({
                              ...prev,
                              borderRadius: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0px (Sharp)</span>
                          <span>14px (Rectangular)</span>
                          <span>40px (Curved)</span>
                        </div>
                      </div>

                      {/* Bevel Stroke Thickness */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Glass Rim Stroke Thickness</span>
                          <span className="font-mono text-amber-300">{shape.borderThickness} px</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.25"
                          value={shape.borderThickness}
                          onChange={(e) =>
                            setShape((prev) => ({
                              ...prev,
                              borderThickness: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      {/* Badge Toggle */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs text-slate-300">
                        <span>Show 10cm Badge on Glass</span>
                        <button
                          type="button"
                          onClick={() =>
                            setShape((prev) => ({
                              ...prev,
                              showDimensionBadge: !prev.showDimensionBadge,
                            }))
                          }
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer",
                            shape.showDimensionBadge
                              ? "bg-amber-400/25 border-amber-400 text-amber-200"
                              : "bg-white/5 border-white/15 text-slate-400"
                          )}
                        >
                          {shape.showDimensionBadge ? "Visible" : "Hidden"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: LIQUID TINT & CAUSTICS */}
                {activeTab === "liquid" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/25 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-sky-300" />
                        <h4 className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                          Liquid Material & Tint
                        </h4>
                      </div>

                      {/* Tint Presets */}
                      <div className="space-y-1">
                        <span className="text-xs text-slate-300">Glass Color Preset:</span>
                        <div className="grid grid-cols-5 gap-1 text-[10px]">
                          {(
                            [
                              { id: "clear", label: "Clear", bg: "bg-white/20 text-white" },
                              { id: "cyan", label: "Aqua", bg: "bg-cyan-500/30 text-cyan-200" },
                              { id: "emerald", label: "Emerald", bg: "bg-emerald-500/30 text-emerald-200" },
                              { id: "amethyst", label: "Violet", bg: "bg-purple-500/30 text-purple-200" },
                              { id: "smoke", label: "Smoked", bg: "bg-slate-700/50 text-slate-200" },
                            ] as const
                          ).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setLiquid((prev) => ({ ...prev, tintColor: item.id }))}
                              className={cn(
                                "py-1 rounded-lg font-bold border transition cursor-pointer",
                                item.bg,
                                liquid.tintColor === item.id
                                  ? "border-sky-400 ring-1 ring-sky-400 shadow-xs"
                                  : "border-white/10 opacity-75 hover:opacity-100"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tint Opacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Glass Body Tint Opacity</span>
                          <span className="font-mono text-sky-300">{liquid.tintOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={liquid.tintOpacity}
                          onChange={(e) =>
                            setLiquid((prev) => ({
                              ...prev,
                              tintOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0% (100% Clear)</span>
                          <span>4% (Subtle)</span>
                          <span>40% (Rich Liquid)</span>
                        </div>
                      </div>

                      {/* Fluid Underglow Caustics */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Fluid Caustics Underglow</span>
                          <span className="font-mono text-sky-300">{liquid.fluidUnderglow}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={liquid.fluidUnderglow}
                          onChange={(e) =>
                            setLiquid((prev) => ({
                              ...prev,
                              fluidUnderglow: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      {/* Underglow Color Selector */}
                      <div className="space-y-1">
                        <span className="text-xs text-slate-300">Underglow Color Tone:</span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {(
                            [
                              { id: "cyan", label: "Cyan", color: "bg-cyan-400" },
                              { id: "emerald", label: "Emerald", color: "bg-emerald-400" },
                              { id: "violet", label: "Violet", color: "bg-purple-400" },
                              { id: "white", label: "White", color: "bg-white" },
                            ] as const
                          ).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setLiquid((prev) => ({ ...prev, underglowColor: item.id }))}
                              className={cn(
                                "flex-1 py-1 rounded-lg border flex items-center justify-center gap-1 transition cursor-pointer",
                                liquid.underglowColor === item.id
                                  ? "bg-white/20 border-sky-400 text-white font-bold"
                                  : "bg-white/5 border-white/10 text-slate-400"
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: OPTICS (REFLECTION & REFRACTION) */}
                {activeTab === "optics" && (
                  <div className="space-y-3">
                    {/* Reflection */}
                    <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/25 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Sun className="w-3.5 h-3.5 text-cyan-300" />
                        <h4 className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                          Surface Specular Reflection
                        </h4>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Reflection / Gloss Opacity</span>
                          <span className="font-mono text-cyan-300">{optics.reflectionOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={optics.reflectionOpacity}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              reflectionOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3 text-cyan-400" />
                            <span>Light Sweep Angle</span>
                          </span>
                          <span className="font-mono text-cyan-300">{optics.reflectionAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={optics.reflectionAngle}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              reflectionAngle: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Upper Convex Specular Sheen</span>
                          <span className="font-mono text-cyan-300">{optics.specularSheen}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={optics.specularSheen}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              specularSheen: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Refraction */}
                    <div className="p-3 rounded-2xl bg-lime-950/20 border border-lime-500/25 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-lime-300" />
                        <h4 className="text-xs font-bold text-lime-200 uppercase tracking-wider">
                          Optical Refraction
                        </h4>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Refraction Index (IOR)</span>
                          <span className="font-mono text-lime-300">{optics.refractionIndex.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="1.00"
                          max="1.60"
                          step="0.02"
                          value={optics.refractionIndex}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              refractionIndex: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Lens Saturation</span>
                          <span className="font-mono text-lime-300">{optics.refractionSaturation}%</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="250"
                          step="5"
                          value={optics.refractionSaturation}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              refractionSaturation: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Chromatic Prism Dispersion Rim</span>
                          <span className="font-mono text-lime-300">{optics.chromaticDispersion}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={optics.chromaticDispersion}
                          onChange={(e) =>
                            setOptics((prev) => ({
                              ...prev,
                              chromaticDispersion: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: SINGLE COMBINED LAYER: PROGRESSIVE TOP-TO-DOWN DECREASING BLUR */}
                {activeTab === "blurs" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-lime-950/20 border border-lime-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-lime-300" />
                          <h4 className="text-xs font-bold text-lime-200 uppercase tracking-wider">
                            Single Combined Blur Layer
                          </h4>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-lime-400/20 text-lime-300 border border-lime-400/30">
                          1 Single Layer
                        </span>
                      </div>

                      {/* Top-to-Down Falloff Description Card */}
                      <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-400/20 text-[11px] text-lime-100 space-y-1.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                            <span>Decreasing Blur: Top to Down</span>
                          </span>
                          <span className="font-mono text-lime-300">
                            {gradientBlur.topBlur}px → {gradientBlur.bottomBlur}px
                          </span>
                        </div>
                        <p className="text-[10px] text-lime-200/75 leading-relaxed">
                          All blur effects are combined into a single unified optical layer. Blur strength flows smoothly from maximum at the top edge down to crystal clear transparency at the bottom.
                        </p>

                        {/* Visual gradient bar preview */}
                        <div className="h-3 w-full rounded-md border border-lime-400/30 overflow-hidden relative">
                          <div
                            className="absolute inset-0"
                            style={{
                              background: `linear-gradient(${gradientBlur.angle}deg, rgba(163, 230, 53, 0.85) 0%, rgba(163, 230, 53, 0.4) ${gradientBlur.falloffMidpoint}%, rgba(163, 230, 53, 0.05) 100%)`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-lime-300/80 font-mono">
                          <span>Top: {gradientBlur.topBlur}px (Max Blur)</span>
                          <span>Mid: {(gradientBlur.topBlur * 0.5).toFixed(0)}px</span>
                          <span>Bottom: {gradientBlur.bottomBlur}px ({gradientBlur.bottomBlur === 0 ? "Crystal Clear" : "Mild"})</span>
                        </div>
                      </div>

                      {/* Preset Buttons */}
                      <div className="space-y-1">
                        <span className="text-xs text-slate-300">Blur Falloff Presets:</span>
                        <div className="grid grid-cols-3 gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() =>
                              setGradientBlur({
                                topBlur: 28,
                                bottomBlur: 0,
                                angle: 180,
                                falloffMidpoint: 50,
                              })
                            }
                            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-lime-300 font-bold border border-lime-400/30 transition cursor-pointer"
                          >
                            Top-to-Down
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGradientBlur({
                                topBlur: 40,
                                bottomBlur: 0,
                                angle: 180,
                                falloffMidpoint: 40,
                              })
                            }
                            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-lime-300 font-bold border border-lime-400/30 transition cursor-pointer"
                          >
                            Deep Top Glow
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGradientBlur({
                                topBlur: 16,
                                bottomBlur: 0,
                                angle: 180,
                                falloffMidpoint: 60,
                              })
                            }
                            className="py-1 rounded-lg bg-white/10 hover:bg-white/20 text-lime-300 font-bold border border-lime-400/30 transition cursor-pointer"
                          >
                            Subtle Fade
                          </button>
                        </div>
                      </div>

                      {/* Slider 1: Top Blur (Maximum) */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Top Blur Strength (Maximum)</span>
                          <span className="font-mono text-lime-300">{gradientBlur.topBlur} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="48"
                          step="1"
                          value={gradientBlur.topBlur}
                          onChange={(e) =>
                            setGradientBlur((prev) => ({
                              ...prev,
                              topBlur: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0px (Clear)</span>
                          <span>28px (Rich Glass)</span>
                          <span>48px (Deep Frost)</span>
                        </div>
                      </div>

                      {/* Slider 2: Bottom Blur (Minimum / Falloff) */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Bottom Blur (Decreased Falloff)</span>
                          <span className="font-mono text-lime-300">
                            {gradientBlur.bottomBlur} px {gradientBlur.bottomBlur === 0 ? "(100% Clear)" : ""}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="16"
                          step="0.5"
                          value={gradientBlur.bottomBlur}
                          onChange={(e) =>
                            setGradientBlur((prev) => ({
                              ...prev,
                              bottomBlur: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>0px (100% Crystal Clear)</span>
                          <span>8px</span>
                          <span>16px</span>
                        </div>
                      </div>

                      {/* Slider 3: Falloff Transition Midpoint */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Falloff Curve Midpoint</span>
                          <span className="font-mono text-lime-300">{gradientBlur.falloffMidpoint}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="80"
                          step="5"
                          value={gradientBlur.falloffMidpoint}
                          onChange={(e) =>
                            setGradientBlur((prev) => ({
                              ...prev,
                              falloffMidpoint: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>

                      {/* Slider 4: Direction Angle (Default 180deg = Top to Down) */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Direction Angle (180° = Top to Down)</span>
                          <span className="font-mono text-lime-300">{gradientBlur.angle}°</span>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={gradientBlur.angle}
                          onChange={(e) =>
                            setGradientBlur((prev) => ({
                              ...prev,
                              angle: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-lime-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: INNER SHADOWS */}
                {activeTab === "shadows" && (
                  <div className="space-y-2.5">
                    {/* Top-Left */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="text-[11px] font-bold text-white">Top-Left Light Catch</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>#FFFFFF Opacity</span>
                          <span className="font-mono text-cyan-300">{shadowLayers.topLeftWhiteOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={shadowLayers.topLeftWhiteOpacity}
                          onChange={(e) =>
                            setShadowLayers((prev) => ({
                              ...prev,
                              topLeftWhiteOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>#B3B3B3 Opacity</span>
                          <span className="font-mono text-cyan-300">{shadowLayers.topLeftGrayOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={shadowLayers.topLeftGrayOpacity}
                          onChange={(e) =>
                            setShadowLayers((prev) => ({
                              ...prev,
                              topLeftGrayOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Perimeter */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="text-[11px] font-bold text-white">Perimeter Refraction Rim</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>#999999 Opacity</span>
                          <span className="font-mono text-cyan-300">{shadowLayers.perimeterDarkOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={shadowLayers.perimeterDarkOpacity}
                          onChange={(e) =>
                            setShadowLayers((prev) => ({
                              ...prev,
                              perimeterDarkOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>#F2F2F2 Opacity</span>
                          <span className="font-mono text-cyan-300">{shadowLayers.perimeterLightOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={shadowLayers.perimeterLightOpacity}
                          onChange={(e) =>
                            setShadowLayers((prev) => ({
                              ...prev,
                              perimeterLightOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Bottom-Right */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                      <div className="text-[11px] font-bold text-white">Bottom-Right Shadow (#B3B3B3)</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-300">
                          <span>Shadow Opacity</span>
                          <span className="font-mono text-cyan-300">{shadowLayers.bottomRightDarkOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={shadowLayers.bottomRightDarkOpacity}
                          onChange={(e) =>
                            setShadowLayers((prev) => ({
                              ...prev,
                              bottomRightDarkOpacity: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: CSS CODE */}
                {activeTab === "code" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">CSS Snippet</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-cyan-400/30"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-cyan-200 overflow-x-auto select-all leading-relaxed max-h-48">
                      {generatedCss}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BUTTON CONTAINER + ATTACHED DOCKED CONTROLS */}
        <div className="flex flex-col items-end gap-2">
          {/* Micro Docked Control Bar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-xl border border-white/20 shadow-xl select-none">
            <button
              type="button"
              onClick={() => setIsEditorOpen((prev) => !prev)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer",
                isEditorOpen
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40"
                  : "text-slate-300 hover:text-white bg-white/10 hover:bg-white/15"
              )}
              title="Open Edit Options beside the button"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEditorOpen ? "Hide Options" : "Edit Options"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPhotoGuides((prev) => !prev)}
              className={cn(
                "px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer",
                showPhotoGuides
                  ? "bg-lime-500/30 text-lime-300 border border-lime-400/40"
                  : "text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
              )}
              title="Toggle Photo Concentric Guides (2% • 10% • 25% • 50% • 100%)"
            >
              <Eye className="w-3 h-3 text-lime-400" />
              <span>Guides</span>
            </button>

            <button
              type="button"
              onClick={handleResetPosition}
              className="p-1 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              title="Reset Position to Bottom-Right Corner"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* THE RECTANGULAR LIQUID GLASS BUTTON */}
          <motion.div
            style={{
              rotate: rollAngle,
              rotateX: pitchAngle,
              transformPerspective: 800,
              background: dynamicTintBackground,
              borderRadius: `${shape.borderRadius}px`,
              width:
                shape.sizeMode === "10cm"
                  ? "10cm"
                  : shape.sizeMode === "custom"
                  ? `${shape.widthCm}cm`
                  : "auto",
              height:
                shape.sizeMode === "10cm"
                  ? "10cm"
                  : shape.sizeMode === "custom"
                  ? `${shape.heightCm}cm`
                  : "auto",
              minWidth:
                shape.sizeMode === "10cm"
                  ? "10cm"
                  : shape.sizeMode === "custom"
                  ? `${shape.widthCm}cm`
                  : undefined,
              minHeight:
                shape.sizeMode === "10cm"
                  ? "10cm"
                  : shape.sizeMode === "custom"
                  ? `${shape.heightCm}cm`
                  : undefined,
              maxWidth: "min(calc(100vw - 32px), 14cm)",
              maxHeight: "min(calc(100vh - 32px), 14cm)",
              paddingLeft: `${shape.paddingX}px`,
              paddingRight: `${shape.paddingX}px`,
              paddingTop: `${shape.paddingY}px`,
              paddingBottom: `${shape.paddingY}px`,
              border: `${shape.borderThickness}px solid rgba(255, 255, 255, 0.55)`,
              borderTop: `${shape.borderThickness}px solid rgba(255, 255, 255, 0.85)`,
              borderBottom: `${shape.borderThickness}px solid rgba(0, 0, 0, 0.25)`,
              boxShadow: dynamicBoxShadow,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative inline-flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing select-none outline-none focus:outline-none transition-shadow will-change-transform overflow-visible"
            title="Rectangular Liquid Glass (10cm × 10cm × 10cm × 10cm) • Drag or roll me around the website!"
          >
            {/* 1. WHOLE-BUTTON OPTICAL REFRACTION BACKDROP FILTER */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: `${shape.borderRadius}px`,
                backdropFilter: `saturate(${optics.refractionSaturation}%) contrast(${optics.refractionContrast}%)`,
                WebkitBackdropFilter: `saturate(${optics.refractionSaturation}%) contrast(${optics.refractionContrast}%)`,
              }}
            />

            {/* 2. CHROMATIC PRISM REFRACTION DISPERSION RIM */}
            {optics.chromaticDispersion > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: `${shape.borderRadius}px`,
                  boxShadow: `
                    inset 1px 0px 2px 0px rgba(56, 189, 248, ${(optics.chromaticDispersion / 100 * 0.4).toFixed(2)}),
                    inset -1px 0px 2px 0px rgba(244, 63, 94, ${(optics.chromaticDispersion / 100 * 0.4).toFixed(2)})
                  `,
                }}
              />
            )}

            {/* 3. COMBINED SINGLE BLUR LAYER: DECREASING BLUR EFFECT FROM TOP TO DOWN */}
            {gradientBlur.topBlur > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: `${shape.borderRadius}px`,
                  backdropFilter: `blur(${gradientBlur.topBlur}px)`,
                  WebkitBackdropFilter: `blur(${gradientBlur.topBlur}px)`,
                  maskImage: progressiveBlurMask,
                  WebkitMaskImage: progressiveBlurMask,
                }}
              />
            )}

            {/* 4. WHOLE-BUTTON SURFACE SPECULAR REFLECTION LAYER */}
            {optics.reflectionOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity"
                style={{
                  borderRadius: `${shape.borderRadius}px`,
                  opacity: optics.reflectionOpacity / 100,
                }}
              >
                {/* Angle-driven light sweep across the whole rectangular button */}
                <div
                  className="absolute inset-0"
                  style={{
                    borderRadius: `${shape.borderRadius}px`,
                    background: `linear-gradient(${optics.reflectionAngle}deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.14) ${optics.reflectionSpread}%, transparent 80%)`,
                  }}
                />
                {/* Upper convex specular reflection sheen */}
                {optics.specularSheen > 0 && (
                  <div
                    className="absolute inset-x-3 top-0 h-[48%]"
                    style={{
                      borderTopLeftRadius: `${Math.max(0, shape.borderRadius - 2)}px`,
                      borderTopRightRadius: `${Math.max(0, shape.borderRadius - 2)}px`,
                      opacity: optics.specularSheen / 100,
                      background:
                        "radial-gradient(110% 85% at 50% 0%, rgba(255, 255, 255, 0.60) 0%, rgba(255, 255, 255, 0.1) 45%, transparent 75%)",
                    }}
                  />
                )}
              </div>
            )}

            {/* PROGRESSIVE BLUR TOP-TO-DOWN GUIDES OVERLAY */}
            {showPhotoGuides && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
                <svg
                  className="absolute -right-36 top-0 w-44 h-full overflow-visible"
                  viewBox="0 0 160 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Vertical decreasing blur arrow indicator */}
                  <line x1="20" y1="15" x2="20" y2="185" stroke="#84cc16" strokeWidth="1.5" strokeDasharray="3 3" />
                  <polygon points="20,190 16,182 24,182" fill="#84cc16" />

                  {/* Top: Maximum Blur */}
                  <circle cx="20" cy="20" r="3" fill="#84cc16" />
                  <line x1="20" y1="20" x2="55" y2="20" stroke="#84cc16" strokeWidth="1" />
                  <text x="60" y="24" fill="#a3e635" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Top: {gradientBlur.topBlur}px (Max)
                  </text>

                  {/* Mid: Transition */}
                  <circle cx="20" cy="100" r="2.5" fill="#84cc16" />
                  <line x1="20" y1="100" x2="55" y2="100" stroke="#84cc16" strokeWidth="1" />
                  <text x="60" y="104" fill="#a3e635" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Mid: {(gradientBlur.topBlur * 0.5).toFixed(0)}px
                  </text>

                  {/* Bottom: Crystal Clear */}
                  <circle cx="20" cy="180" r="3" fill="#84cc16" />
                  <line x1="20" y1="180" x2="55" y2="180" stroke="#84cc16" strokeWidth="1" />
                  <text x="60" y="184" fill="#a3e635" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Bottom: {gradientBlur.bottomBlur}px (Clear)
                  </text>
                </svg>
              </div>
            )}

            {/* 4-CORNER 10CM PHYSICAL MEASUREMENT TICKS */}
            {shape.sizeMode === "10cm" && (
              <div className="absolute inset-2 pointer-events-none z-10 flex flex-col justify-between select-none">
                <div className="flex justify-between items-center text-[9px] font-mono text-white/45">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-px bg-white/40" />
                    <span>10cm</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span>10cm</span>
                    <span className="w-1.5 h-px bg-white/40" />
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-white/45">
                  <span className="flex items-center gap-0.5">
                    <span className="w-1.5 h-px bg-white/40" />
                    <span>10cm</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span>10cm</span>
                    <span className="w-1.5 h-px bg-white/40" />
                  </span>
                </div>
              </div>
            )}

            {/* BUTTON INTERIOR: 10CM BADGE & LABEL */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-2 pointer-events-none select-none">
              {shape.sizeMode === "10cm" && shape.showDimensionBadge && (
                <div className="mb-2 px-2.5 py-0.5 rounded-full bg-black/45 border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                  <Square className="w-2.5 h-2.5 text-amber-300" />
                  <span className="font-mono text-[9px] text-amber-200 tracking-wider font-semibold">
                    10cm × 10cm × 10cm × 10cm
                  </span>
                </div>
              )}

              {buttonText ? (
                <span className="text-white text-base sm:text-xl font-bold tracking-tight drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.85)] drop-shadow-[0_0_1px_rgba(0,0,0,0.95)]">
                  {buttonText}
                </span>
              ) : (
                <span className="w-16 h-4 pointer-events-none" />
              )}

              {shape.sizeMode === "10cm" && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/75 font-medium tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Liquid Glass Slab</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default GlassSimulatorWidget;
