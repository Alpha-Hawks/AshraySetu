"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  X,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Sun,
  Layers,
  Zap,
  Flame,
  Palette,
} from "lucide-react";
import {
  type CardGlassSettings,
  PRESET_APPLE_GLASS,
  CARD_GLASS_PRESETS,
  applyCardGlassVariables,
} from "@/lib/liquid-glass/cardGlassSettings";

export default function CardGlassCustomizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<CardGlassSettings>(PRESET_APPLE_GLASS);
  const [activeTab, setActiveTab] = useState<"optics" | "light" | "depth" | "interaction" | "advanced" | "presets" | "code">("presets");
  const [copied, setCopied] = useState(false);

  // Load initial settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ashraysetu_card_glass_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
        applyCardGlassVariables(parsed);
      }
    } catch {}
  }, []);

  // Update a single setting
  const updateSetting = <K extends keyof CardGlassSettings>(key: K, value: CardGlassSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value, preset: "Custom" as const };
      applyCardGlassVariables(next);
      try {
        localStorage.setItem("ashraysetu_card_glass_settings", JSON.stringify(next));
      } catch {}
      window.dispatchEvent(new CustomEvent("card-glass-settings-updated", { detail: next }));
      return next;
    });
  };

  // Apply a preset
  const applyPreset = (presetName: string) => {
    const target = CARD_GLASS_PRESETS[presetName];
    if (target) {
      setSettings(target);
      applyCardGlassVariables(target);
      try {
        localStorage.setItem("ashraysetu_card_glass_settings", JSON.stringify(target));
      } catch {}
      window.dispatchEvent(new CustomEvent("card-glass-settings-updated", { detail: target }));
    }
  };

  // Reset to default
  const resetToDefault = () => {
    applyPreset("Apple Glass");
  };

  // Generate CSS code
  const generatedCss = `/* Apple Liquid Glass Master Card Specification */
:root {
  /* Optics & Glass Tint */
  --glass-refraction: ${settings.refraction};
  --glass-bezel-width: ${settings.bezelWidth}px;
  --glass-lens-blur: ${settings.lensBlur}px;
  --glass-specular-sheen: ${settings.specularSheen};
  --glass-distortion: ${settings.distortion};
  --glass-dispersion: ${settings.dispersion};
  --glass-opacity: ${settings.glassOpacity};
  --glass-tint: ${settings.tintColor};
  --glass-tint-intensity: ${settings.tintIntensity};
  --glass-saturation: ${settings.colorSaturation}%;

  /* Light & Reflection */
  --glass-reflection: ${settings.reflection};
  --glass-highlight-intensity: ${settings.highlightIntensity};
  --glass-highlight-width: ${settings.highlightWidth}px;
  --glass-light-direction: ${settings.lightDirection}deg;
  --glass-ambient-light: ${settings.ambientLight};
  --glass-edge-highlight: rgba(255, 255, 255, ${settings.edgeHighlight});

  /* Depth & Shadow */
  --glass-shadow-opacity: ${settings.shadowOpacity};
  --glass-shadow-blur: ${settings.shadowBlur}px;
  --glass-shadow-spread: ${settings.shadowSpread}px;
  --glass-elevation: ${settings.glassElevation}px;
  --glass-ambient-glow: ${settings.ambientGlow};
  --glass-glow-blur: ${settings.glowBlur}px;

  /* Interaction */
  --glass-hover-brightness: ${settings.hoverBrightness}%;
  --glass-hover-glow: ${settings.hoverGlow};
  --glass-hover-scale: ${settings.hoverScale};
  --glass-press-scale: ${settings.pressScale};
  --glass-transition-duration: ${settings.animationSpeed}ms;

  /* Advanced Glass */
  --glass-transmission: ${settings.transmission};
  --glass-frost: ${settings.frost};
  --glass-iridescence: ${settings.iridescence};
  --glass-chromatic-aberration: ${settings.chromaticAberration}px;
  --glass-thickness: ${settings.glassThickness}mm;
  --glass-optical-distortion: ${settings.opticalDistortion};
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tintSwatches = [
    { label: "White", hex: "#ffffff" },
    { label: "Ocean Sky", hex: "#38bdf8" },
    { label: "Command Azure", hex: "#0284c7" },
    { label: "Emerald", hex: "#10b981" },
    { label: "Amber Alert", hex: "#f59e0b" },
    { label: "Obsidian", hex: "#0f172a" },
    { label: "Amethyst", hex: "#a855f7" },
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 sm:left-6 z-[10002] !w-auto !min-h-0 px-4 py-2.5 rounded-full bg-white/85 hover:bg-white text-slate-900 border border-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.20),inset_0_1px_1.5px_rgba(255,255,255,0.9)] backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Liquid Glass Card Customizer Studio"
        aria-label="Toggle Liquid Glass Card Customizer Studio"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#007AFF] to-cyan-400 flex items-center justify-center text-white shadow-xs">
          <Sliders className="w-3 h-3" />
        </div>
        <span>Card Glass Studio</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/25">
          {settings.preset}
        </span>
      </button>

      {/* Floating Customizer Drawer */}
      {isOpen && (
        <div className="fixed bottom-32 left-4 sm:left-6 z-[10003] w-[92vw] sm:w-[420px] max-h-[75vh] flex flex-col rounded-3xl bg-slate-950/95 text-slate-100 border border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.7),inset_0_1.5px_2px_rgba(255,255,255,0.25)] overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#007AFF] to-cyan-300 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Liquid Glass Card Studio</span>
                  <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded-full border border-cyan-500/30">
                    Live Shader
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Real-time optical tuning for all website cards
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetToDefault}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition"
                title="Reset to Apple Glass Defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/20 transition"
                title="Close Customizer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-900/40 border-b border-white/10 overflow-x-auto [scrollbar-width:none] text-[11px]">
            <button
              onClick={() => setActiveTab("presets")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "presets"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Presets</span>
            </button>

            <button
              onClick={() => setActiveTab("optics")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "optics"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Palette className="w-3 h-3 text-sky-300" />
              <span>Optics & Tint</span>
            </button>

            <button
              onClick={() => setActiveTab("light")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "light"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sun className="w-3 h-3 text-amber-300" />
              <span>Light</span>
            </button>

            <button
              onClick={() => setActiveTab("depth")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "depth"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3 h-3 text-indigo-300" />
              <span>Depth</span>
            </button>

            <button
              onClick={() => setActiveTab("interaction")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "interaction"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-300" />
              <span>Interaction</span>
            </button>

            <button
              onClick={() => setActiveTab("advanced")}
              className={`px-2 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                activeTab === "advanced"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="w-3 h-3 text-rose-300" />
              <span>Advanced</span>
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                activeTab === "code"
                  ? "bg-white/20 text-white border border-white/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CSS
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:thin]">
            {/* PRESETS TAB */}
            {activeTab === "presets" && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">
                  Choose an Apple Liquid Glass material preset to instantly style all cards:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CARD_GLASS_PRESETS).map(([name, p]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        settings.preset === name
                          ? "bg-cyan-950/50 border-cyan-400 text-white shadow-sm shadow-cyan-500/20"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{name}</span>
                        {settings.preset === name && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Refract: {p.refraction} · Bezel: {p.bezelWidth}px · Blur: {p.lensBlur}px
                      </div>
                    </button>
                  ))}
                </div>

                {/* Live Material Badge */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">Active Material Token</span>
                    <span className="font-mono text-cyan-300 text-[11px]">{settings.preset}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    Each card gets its own GPU displacement filter <code className="text-cyan-300">#lg-card-lens-*</code> sized to it, with Snell's law convex squircle curvature & chromatic aberration.
                  </div>
                </div>
              </div>
            )}

            {/* OPTICS & GLASS TINT TAB */}
            {activeTab === "optics" && (
              <div className="space-y-3">
                {/* Refraction */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Refraction (Snell Power)</span>
                    <span className="font-mono text-cyan-300">{settings.refraction}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={settings.refraction}
                    onInput={(e) => updateSetting("refraction", Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => updateSetting("refraction", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Bezel Width */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Bezel Width</span>
                    <span className="font-mono text-cyan-300">{settings.bezelWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    step="1"
                    value={settings.bezelWidth}
                    onInput={(e) => updateSetting("bezelWidth", Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => updateSetting("bezelWidth", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Lens Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Lens Blur</span>
                    <span className="font-mono text-cyan-300">{settings.lensBlur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={settings.lensBlur}
                    onInput={(e) => updateSetting("lensBlur", Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => updateSetting("lensBlur", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Specular Sheen */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Specular Sheen</span>
                    <span className="font-mono text-cyan-300">{settings.specularSheen}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.specularSheen}
                    onChange={(e) => updateSetting("specularSheen", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Distortion */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Distortion Scale</span>
                    <span className="font-mono text-cyan-300">{settings.distortion.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.5"
                    step="0.1"
                    value={settings.distortion}
                    onChange={(e) => updateSetting("distortion", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Dispersion */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Dispersion (Prism Fringe)</span>
                    <span className="font-mono text-cyan-300">{settings.dispersion.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.25"
                    step="0.01"
                    value={settings.dispersion}
                    onChange={(e) => updateSetting("dispersion", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Tint Color Swatches */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Tint Color</span>
                    <span className="font-mono text-cyan-300 text-[10px]">{settings.tintColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tintSwatches.map((swatch) => (
                      <button
                        key={swatch.hex}
                        onClick={() => updateSetting("tintColor", swatch.hex)}
                        style={{ backgroundColor: swatch.hex }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          settings.tintColor === swatch.hex ? "border-cyan-400 scale-110 shadow-xs" : "border-white/30"
                        }`}
                        title={swatch.label}
                      />
                    ))}
                    <input
                      type="color"
                      value={settings.tintColor}
                      onChange={(e) => updateSetting("tintColor", e.target.value)}
                      className="w-6 h-6 rounded-full overflow-hidden border-0 cursor-pointer p-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* Tint Intensity */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Tint Intensity</span>
                    <span className="font-mono text-cyan-300">
                      {Math.round(settings.tintIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={settings.tintIntensity}
                    onChange={(e) => updateSetting("tintIntensity", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Color Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Color Saturation</span>
                    <span className="font-mono text-cyan-300">{settings.colorSaturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="250"
                    step="5"
                    value={settings.colorSaturation}
                    onChange={(e) => updateSetting("colorSaturation", Number(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* LIGHT & REFLECTION TAB */}
            {activeTab === "light" && (
              <div className="space-y-3">
                {/* Reflection */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Reflection Strength</span>
                    <span className="font-mono text-amber-300">
                      {Math.round(settings.reflection * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.reflection}
                    onChange={(e) => updateSetting("reflection", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Highlight Intensity */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Highlight Intensity</span>
                    <span className="font-mono text-amber-300">
                      {Math.round(settings.highlightIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.highlightIntensity}
                    onChange={(e) => updateSetting("highlightIntensity", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Highlight Width */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Highlight Border Width</span>
                    <span className="font-mono text-amber-300">{settings.highlightWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.25"
                    value={settings.highlightWidth}
                    onChange={(e) => updateSetting("highlightWidth", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Light Direction */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Light Direction Angle</span>
                    <span className="font-mono text-amber-300">{settings.lightDirection}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={settings.lightDirection}
                    onChange={(e) => updateSetting("lightDirection", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Ambient Light */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ambient Light</span>
                    <span className="font-mono text-amber-300">
                      {Math.round(settings.ambientLight * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.ambientLight}
                    onChange={(e) => updateSetting("ambientLight", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Edge Highlight */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Edge Bevel Highlight</span>
                    <span className="font-mono text-amber-300">
                      {Math.round(settings.edgeHighlight * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.edgeHighlight}
                    onChange={(e) => updateSetting("edgeHighlight", Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* DEPTH & SHADOW TAB */}
            {activeTab === "depth" && (
              <div className="space-y-3">
                {/* Shadow Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Shadow Opacity</span>
                    <span className="font-mono text-indigo-300">
                      {Math.round(settings.shadowOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.shadowOpacity}
                    onChange={(e) => updateSetting("shadowOpacity", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Shadow Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Shadow Softness Blur</span>
                    <span className="font-mono text-indigo-300">{settings.shadowBlur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="64"
                    step="2"
                    value={settings.shadowBlur}
                    onChange={(e) => updateSetting("shadowBlur", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Shadow Spread */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Shadow Spread</span>
                    <span className="font-mono text-indigo-300">{settings.shadowSpread} px</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={settings.shadowSpread}
                    onChange={(e) => updateSetting("shadowSpread", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Glass Elevation */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Glass Elevation</span>
                    <span className="font-mono text-indigo-300">{settings.glassElevation} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="2"
                    value={settings.glassElevation}
                    onChange={(e) => updateSetting("glassElevation", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Ambient Glow */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ambient Caustic Glow</span>
                    <span className="font-mono text-indigo-300">
                      {Math.round(settings.ambientGlow * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.ambientGlow}
                    onChange={(e) => updateSetting("ambientGlow", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Glow Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Glow Blur Radius</span>
                    <span className="font-mono text-indigo-300">{settings.glowBlur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={settings.glowBlur}
                    onChange={(e) => updateSetting("glowBlur", Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* INTERACTION TAB */}
            {activeTab === "interaction" && (
              <div className="space-y-3">
                {/* Hover Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hover Brightness</span>
                    <span className="font-mono text-emerald-300">{settings.hoverBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="150"
                    step="2"
                    value={settings.hoverBrightness}
                    onChange={(e) => updateSetting("hoverBrightness", Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Hover Glow */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hover Bloom Glow</span>
                    <span className="font-mono text-emerald-300">
                      {Math.round(settings.hoverGlow * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.hoverGlow}
                    onChange={(e) => updateSetting("hoverGlow", Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Hover Scale */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hover Lift Scale</span>
                    <span className="font-mono text-emerald-300">{settings.hoverScale.toFixed(3)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.000"
                    max="1.040"
                    step="0.002"
                    value={settings.hoverScale}
                    onChange={(e) => updateSetting("hoverScale", Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Press Scale */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Press Scale</span>
                    <span className="font-mono text-emerald-300">{settings.pressScale.toFixed(3)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.950"
                    max="1.000"
                    step="0.005"
                    value={settings.pressScale}
                    onChange={(e) => updateSetting("pressScale", Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Animation Speed */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Animation Speed</span>
                    <span className="font-mono text-emerald-300">{settings.animationSpeed} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="600"
                    step="20"
                    value={settings.animationSpeed}
                    onChange={(e) => updateSetting("animationSpeed", Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ADVANCED GLASS TAB */}
            {activeTab === "advanced" && (
              <div className="space-y-3">
                {/* Transmission */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Transmission</span>
                    <span className="font-mono text-rose-300">
                      {Math.round(settings.transmission * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.02"
                    value={settings.transmission}
                    onChange={(e) => updateSetting("transmission", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Frost */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Frost (Roughness)</span>
                    <span className="font-mono text-rose-300">{Math.round(settings.frost * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.frost}
                    onChange={(e) => updateSetting("frost", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Iridescence */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Iridescence (Thin Film)</span>
                    <span className="font-mono text-rose-300">
                      {Math.round(settings.iridescence * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.iridescence}
                    onChange={(e) => updateSetting("iridescence", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Chromatic Aberration */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Chromatic Aberration</span>
                    <span className="font-mono text-rose-300">{settings.chromaticAberration} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={settings.chromaticAberration}
                    onChange={(e) => updateSetting("chromaticAberration", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Edge Refraction */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Edge Normal Refraction</span>
                    <span className="font-mono text-rose-300">
                      {Math.round(settings.edgeRefraction * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.edgeRefraction}
                    onChange={(e) => updateSetting("edgeRefraction", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Surface Noise */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Surface Microsurface Noise</span>
                    <span className="font-mono text-rose-300">
                      {Math.round(settings.surfaceNoise * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.surfaceNoise}
                    onChange={(e) => updateSetting("surfaceNoise", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Glass Thickness */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Glass Thickness</span>
                    <span className="font-mono text-rose-300">{settings.glassThickness} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.glassThickness}
                    onChange={(e) => updateSetting("glassThickness", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Optical Distortion */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Optical Wave Distortion</span>
                    <span className="font-mono text-rose-300">
                      {Math.round(settings.opticalDistortion * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.opticalDistortion}
                    onChange={(e) => updateSetting("opticalDistortion", Number(e.target.value))}
                    className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* CSS CODE EXPORT TAB */}
            {activeTab === "code" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-semibold">
                    Current Customized CSS Specification
                  </span>
                  <button
                    onClick={copyCode}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold flex items-center gap-1 hover:bg-cyan-500/30 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-2xl bg-black/60 border border-white/10 font-mono text-[10px] text-cyan-200/90 overflow-x-auto whitespace-pre leading-relaxed select-all">
                  {generatedCss}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
