"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  Eye,
  Radio,
  ChevronRight,
  Flame,
  CheckCircle2,
  Waves,
} from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function LiquidGlassShowcase() {
  const [activeTab, setActiveTab] = useState<"hero" | "navbar" | "buttons">("hero");
  const [blobTheme, setBlobTheme] = useState<"ocean" | "sunset" | "aurora">("ocean");
  const [clickCount, setClickCount] = useState(0);
  const [activeNavIdx, setActiveNavIdx] = useState(0);

  const sampleNavItems = [
    { label: "Overview", icon: Layers },
    { label: "Refraction", icon: Eye },
    { label: "Chromatic Spectrum", icon: Sparkles },
    { label: "Telemetry", icon: Radio },
  ];

  return (
    <section className="relative my-10 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="liquid-glass-pill px-3 py-1 text-xs font-semibold text-cyan-300 mb-2 border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Liquid Glass Design System • v2.0 Elite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hyper-Realistic Glassmorphism & Chromatic Aberration
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
            Optical refraction with layered semi-transparent panels, 16px dynamic backdrop blur, 
            specular rim lighting, and iridescent chromatic displacement.
          </p>
        </div>

        {/* Ambient Theme Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-pill border-white/10 self-start sm:self-auto">
          <span className="text-[11px] text-slate-400 font-mono px-2">Refraction Mood:</span>
          {(
            [
              { id: "ocean", label: "Oceanic Cyan", color: "bg-cyan-500" },
              { id: "sunset", label: "Amber Sunset", color: "bg-amber-500" },
              { id: "aurora", label: "Aurora Purple", color: "bg-purple-500" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setBlobTheme(item.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition flex items-center gap-1.5 ${
                blobTheme === item.id
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Container with Localized Drifting Refraction Blobs */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] bg-slate-950/40 backdrop-blur-2xl">
        {/* Dynamic Refraction Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div
            className={`liquid-blob top-[-20%] left-[-10%] w-[350px] h-[350px] transition-all duration-1000 ${
              blobTheme === "ocean"
                ? "blob-cyan"
                : blobTheme === "sunset"
                ? "blob-amber"
                : "blob-purple"
            }`}
          />
          <div
            className={`liquid-blob bottom-[-20%] right-[-10%] w-[400px] h-[400px] transition-all duration-1000 ${
              blobTheme === "ocean"
                ? "blob-purple"
                : blobTheme === "sunset"
                ? "blob-amber"
                : "blob-cyan"
            }`}
          />
          <div className="liquid-grid-overlay" />
        </div>

        {/* Tab Controls */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "hero"
                ? "liquid-glass-btn-primary"
                : "liquid-glass-btn-secondary"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            <span>1. Hero Card Showcase</span>
          </button>

          <button
            onClick={() => setActiveTab("navbar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "navbar"
                ? "liquid-glass-btn-primary"
                : "liquid-glass-btn-secondary"
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-300" />
            <span>2. Liquid Glass Navbar</span>
          </button>

          <button
            onClick={() => setActiveTab("buttons")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "buttons"
                ? "liquid-glass-btn-primary"
                : "liquid-glass-btn-secondary"
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-300" />
            <span>3. Buttons & Pills Interaction</span>
          </button>
        </div>

        {/* Tab 1: Hero Card Showcase */}
        {activeTab === "hero" && (
          <div className="relative z-10 space-y-6">
            <LiquidGlassCard className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="liquid-glass-pill px-3 py-1 text-[11px] font-bold text-cyan-300 border-cyan-400/40">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Specular Rim Lighting • 1px Optical Gradient
                    </span>
                    <span className="liquid-glass-pill px-3 py-1 text-[11px] font-mono text-emerald-300 border-emerald-500/40">
                      WCAG AA Contrast Compliant
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    Bay of Bengal Coastal Defense Matrix
                  </h3>

                  <p className="text-sm text-slate-200 leading-relaxed font-normal">
                    Experience hyper-realistic glassmorphism: Move your pointer across this card to watch the 
                    specular light refraction track your cursor, while the 1px chromatic border disperses micro-prismatic 
                    highlights of soft cyan, magenta, and amber.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button className="liquid-glass-btn-primary px-5 py-2.5 text-xs">
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Experience Liquid Tactility</span>
                    </button>

                    <button className="liquid-glass-btn-secondary px-5 py-2.5 text-xs">
                      <span>Explore Technical Tokens</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Optical Metrics HUD inside Hero */}
                <div className="grid grid-cols-2 gap-3 w-full lg:w-80">
                  <div className="p-3.5 rounded-2xl liquid-glass-pill flex-col items-start gap-1 w-full border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Backdrop Blur</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">16px / 180% Sat</span>
                    <span className="text-[10px] text-slate-400">Dynamic Refraction</span>
                  </div>

                  <div className="p-3.5 rounded-2xl liquid-glass-pill flex-col items-start gap-1 w-full border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Rim Highlights</span>
                    <span className="text-lg font-black text-white font-mono">Inset 0 1px 1px</span>
                    <span className="text-[10px] text-slate-400">30% Opacity Edge</span>
                  </div>

                  <div className="p-3.5 rounded-2xl liquid-glass-pill flex-col items-start gap-1 w-full border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Chromatic Depth</span>
                    <span className="text-lg font-black text-pink-400 font-mono">RGB Prismatic</span>
                    <span className="text-[10px] text-slate-400">Cyan / Magenta Stops</span>
                  </div>

                  <div className="p-3.5 rounded-2xl liquid-glass-pill flex-col items-start gap-1 w-full border-white/15">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Hover Motion</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">-3px Float</span>
                    <span className="text-[10px] text-slate-400">Fluid Sheen Sweep</span>
                  </div>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* Tab 2: Navigation Bar Showcase */}
        {activeTab === "navbar" && (
          <div className="relative z-10 space-y-6 py-4">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white">Liquid Glass Floating Navigation Bar</h3>
              <p className="text-xs text-slate-300">
                Pill navigation housed in a 20px blurred glass corridor with edge refraction, 
                dynamic active indicator, and translucent hover states.
              </p>
            </div>

            {/* Live Sample Navbar */}
            <div className="flex justify-center py-4">
              <nav className="liquid-glass-navbar px-3 py-2 flex items-center gap-1.5 shadow-2xl">
                {sampleNavItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeNavIdx === idx;
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveNavIdx(idx)}
                      className={`relative px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 ${
                        isActive
                          ? "bg-white text-slate-950 shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-600" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_#38bdf8]" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="text-center text-[11px] text-slate-400 font-mono">
              Active Destination: <strong className="text-cyan-400">{sampleNavItems[activeNavIdx].label}</strong> • Click any tab to see fluid active transitions
            </div>
          </div>
        )}

        {/* Tab 3: Buttons & Pills Interaction Showcase */}
        {activeTab === "buttons" && (
          <div className="relative z-10 space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Primary Glass Button Card */}
              <div className="p-5 rounded-2xl liquid-glass-card space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Primary Glass CTA</h4>
                  <p className="text-xs text-slate-400 mt-0.5">High-tactility button with sheen travel and active click depression.</p>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    onClick={() => setClickCount((c) => c + 1)}
                    className="liquid-glass-btn-primary px-5 py-3 text-xs w-full"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Click Interactive Button ({clickCount})</span>
                  </button>

                  <div className="text-[11px] text-slate-400 text-center font-mono">
                    Includes <code>:active</code> soft scale distortion (0.97)
                  </div>
                </div>
              </div>

              {/* Secondary Translucent Button Card */}
              <div className="p-5 rounded-2xl liquid-glass-card space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Secondary Glass Action</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Ultra-subtle surface with 16px blur and rim illumination.</p>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button className="liquid-glass-btn-secondary px-5 py-3 text-xs w-full">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    <span>Secondary Refractive Action</span>
                  </button>

                  <div className="text-[11px] text-slate-400 text-center font-mono">
                    Smooth sheen travel sweep on hover
                  </div>
                </div>
              </div>

              {/* Pills & Badges Collection */}
              <div className="p-5 rounded-2xl liquid-glass-card space-y-4 sm:col-span-2 lg:col-span-1">
                <div>
                  <h4 className="text-sm font-bold text-white">Liquid Glass Pills & Tags</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Rounded-full pill containers with optical specular depth.</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="liquid-glass-pill px-3 py-1.5 text-xs text-cyan-300 border-cyan-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Translucent Tag</span>
                  </span>

                  <span className="liquid-glass-pill px-3 py-1.5 text-xs text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Safe Status</span>
                  </span>

                  <span className="liquid-glass-pill px-3 py-1.5 text-xs text-pink-300 border-pink-500/30">
                    <Flame className="w-3.5 h-3.5 text-pink-400" />
                    <span>Chromatic Tag</span>
                  </span>

                  <span className="liquid-glass-pill px-3 py-1.5 text-xs text-amber-300 border-amber-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>1070 SEOC</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default LiquidGlassShowcase;
