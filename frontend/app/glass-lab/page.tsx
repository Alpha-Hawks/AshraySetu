"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { Glass } from "@/lib/liquid-glass/Glass";
import { GlassGroup } from "@/lib/liquid-glass/GlassGroup";
import { LG_TOKENS } from "@/lib/liquid-glass/tokens";

type BackdropMode =
  | "busy-photo"
  | "dense-text"
  | "flat-white"
  | "flat-black"
  | "brand-gradient"
  | "video-loop";

export default function GlassLabPage() {
  const [backdrop, setBackdrop] = useState<BackdropMode>("flat-black");
  const [tone, setTone] = useState<"dark" | "light">("dark");
  const [killSwitch, setKillSwitch] = useState(false);
  const [reducedTransparency, setReducedTransparency] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [tier2Lens, setTier2Lens] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Sync kill switch to documentElement attribute [data-lg="off"]
  useEffect(() => {
    if (killSwitch) {
      document.documentElement.setAttribute("data-lg", "off");
    } else {
      document.documentElement.removeAttribute("data-lg");
    }
    return () => {
      document.documentElement.removeAttribute("data-lg");
    };
  }, [killSwitch]);

  return (
    <div className="min-h-screen -m-4 sm:-m-6 p-4 sm:p-8 flex flex-col font-sans relative">
      {/* Dev-Only Guard & NoIndex Badge */}
      <div className="fixed top-3 left-4 z-50 flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>DEV ONLY • GLASS LAB (NOINDEX)</span>
        </div>
        <Link
          href="/"
          className="px-3 py-1 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold backdrop-blur-md"
        >
          ← Return to App
        </Link>
      </div>

      {/* Floating Control Toolbar for Testing */}
      <div className="fixed top-3 right-4 z-50 flex flex-wrap items-center gap-2 max-w-xl justify-end">
        {/* Backdrop Selector */}
        <select
          value={backdrop}
          onChange={(e) => setBackdrop(e.target.value as BackdropMode)}
          className="px-3 py-1.5 rounded-full bg-slate-900/90 text-xs text-white border border-slate-700 backdrop-blur-lg focus:outline-none focus:border-cyan-400"
        >
          <option value="busy-photo">Backdrop: 1. High-Detail Photo</option>
          <option value="dense-text">Backdrop: 2. Dense News Text</option>
          <option value="flat-white">Backdrop: 3. Flat White (#FFF)</option>
          <option value="flat-black">Backdrop: 4. Flat Black (#000)</option>
          <option value="brand-gradient">Backdrop: 5. Brand Gradient</option>
          <option value="video-loop">Backdrop: 6. Motion Video Grid</option>
        </select>

        {/* Tone Toggle */}
        <button
          onClick={() => setTone((t) => (t === "dark" ? "light" : "dark"))}
          className="px-3 py-1.5 rounded-full bg-slate-900/90 text-xs text-slate-200 border border-slate-700 backdrop-blur-lg flex items-center gap-1 hover:border-slate-500"
        >
          {tone === "dark" ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          <span>Tone: {tone.toUpperCase()}</span>
        </button>

        {/* Kill Switch Toggle */}
        <button
          onClick={() => setKillSwitch(!killSwitch)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 border ${
            killSwitch
              ? "bg-rose-600 text-white border-rose-400 shadow-md"
              : "bg-slate-900/90 text-slate-300 border-slate-700"
          }`}
        >
          <span>Kill Switch: {killSwitch ? "ON (Glass OFF)" : "OFF"}</span>
        </button>

        {/* Accessibility Toggles */}
        <button
          onClick={() => setReducedTransparency(!reducedTransparency)}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold border ${
            reducedTransparency
              ? "bg-emerald-600 text-white border-emerald-400"
              : "bg-slate-900/90 text-slate-400 border-slate-700"
          }`}
          title="Simulate prefers-reduced-transparency: reduce"
        >
          Frosted (88%)
        </button>
      </div>

      {/* Dynamic Background Stage */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {backdrop === "busy-photo" && (
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=80')",
            }}
          />
        )}

        {backdrop === "dense-text" && (
          <div className="w-full h-full p-12 bg-slate-900 text-slate-400 text-xs font-serif leading-loose select-none overflow-hidden opacity-90">
            <h1 className="text-3xl font-black text-slate-100 mb-4 font-sans">
              Odisha State Disaster Management Authority & Kendrapara Relief Operations
            </h1>
            <p className="mb-4">
              Tropical cyclones originating in the Bay of Bengal undergo rapid cyclogenesis during the post-monsoon transition season. The interaction between warm sea-surface temperatures exceeding 28 degrees Celsius, low vertical wind shear, and high mid-tropospheric humidity generates self-sustaining convective complexes that organize into cyclonic vortices with pressure drops exceeding 40 hectopascals.
            </p>
            <p className="mb-4">
              Coastal blocks including Rajnagar, Mahakalapada, Marshaghai, and Erasama maintain georeferenced multihazard shelters elevated at minimum 4.5 meters above mean sea level to counter catastrophic storm surge inundation. Evacuee admissions are registered via offline Dexie.js transactional tables, ensuring demographic continuity across vulnerable pregnant mothers, bedridden elderly individuals, and infant cohorts.
            </p>
            <p className="mb-4">
              Ration buffer allocations conform to global Sphere Project minimum standards: 3.0 liters per person per day of potable chlorinated drinking water, 2,100 kilocalories of emergency dry rations, supplemental zinc-enriched oral rehydration salts, and dedicated infant formula packets. Stock depletion trajectories operate on continuous burn-rate projections, dispatching automated alerts when remaining reserve levels fall below 24 operational hours.
            </p>
            <p>
              Communication channels integrate cellular-independent wireless networks, VHF maritime bands, and satellite transponders to ensure high-command situational awareness between the Special Relief Commissioner (SRC) in Bhubaneswar and decentralized Gram Panchayat disaster task forces.
            </p>
          </div>
        )}

        {backdrop === "flat-white" && (
          <div className="w-full h-full bg-white transition-colors duration-500 flex items-center justify-center">
            <div className="text-slate-300 font-bold text-4xl select-none">Flat #FFFFFF Ground</div>
          </div>
        )}

        {backdrop === "flat-black" && (
          <div className="w-full h-full bg-black transition-colors duration-500 flex items-center justify-center">
            <div className="text-slate-800 font-bold text-4xl select-none">Flat #000000 Ground</div>
          </div>
        )}

        {backdrop === "brand-gradient" && (
          <div
            className="w-full h-full transition-all duration-500"
            style={{
              background:
                "linear-gradient(135deg, #0284c7 0%, #0369a1 25%, #4f46e5 50%, #ec4899 85%, #f59e0b 100%)",
            }}
          />
        )}

        {backdrop === "video-loop" && (
          <div className="w-full h-full bg-slate-950 relative flex items-center justify-center overflow-hidden">
            {/* Animated Canvas / CSS Motion Simulation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-600 via-indigo-900 to-rose-600 animate-pulse duration-1000" />
            <div className="absolute w-[80vw] h-[80vw] rounded-full bg-cyan-400/30 blur-[100px] animate-spin duration-[20s]" />
            <div className="relative text-white font-mono text-xl font-black tracking-widest drop-shadow-lg">
              HIGH-MOTION MEDIA SIMULATION
            </div>
          </div>
        )}
      </div>

      {/* Main Glass Showcase Canvas */}
      <div
        className="relative z-10 max-w-5xl mx-auto w-full space-y-10 my-auto py-16"
        data-tone={tone}
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Apple Liquid Glass Material System
          </h2>
          <p className="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            A floating, light-bending functional layer above untouched content. Restraint is the aesthetic: content is the hero; the glass recedes.
          </p>
        </div>

        {/* 1. REGULAR CONTROL: GlassGroup Navigation Capsule */}
        <div className="flex flex-col items-center space-y-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-white/90 drop-shadow">
            1. Regular Control — Unified GlassGroup Capsule (SwiftUI GlassEffectContainer Analogue)
          </div>
          <div className="text-[11px] text-white/70 max-w-md text-center drop-shadow">
            Rule 2 & 3: Single glass container holding multiple controls. Sub-items use translucent fills — zero glass-on-glass.
          </div>

          <GlassGroup
            variant="regular"
            thickness="control"
            shape="capsule"
            interactive
            enableLens={tier2Lens}
            className="h-12 px-2 shadow-2xl"
          >
            {[
              { label: "Overview", count: null },
              { label: "Household Intake", count: "12" },
              { label: "Shelter Stocks", count: "Live" },
              { label: "GIS Radar", count: null },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition flex items-center gap-1.5 ${
                  activeTab === idx ? "lg-inner-item-selected" : "lg-inner-item"
                }`}
              >
                <span>{item.label}</span>
                {item.count && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </GlassGroup>
        </div>

        {/* 2. REGULAR VS CLEAR VARIANT TEST RIG */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Regular Control Variant */}
          <div className="flex flex-col items-center space-y-3 p-6 rounded-3xl bg-black/30 backdrop-blur-xs border border-white/10">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider drop-shadow">
              2. Regular Variant (Default ~95% of Uses)
            </div>
            <div className="text-xs text-white/70 text-center">
              10px blur • 180% saturation • adaptive tone • 1px directional rim-light
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Glass
                variant="regular"
                thickness="control"
                shape="capsule"
                interactive
                enableLens={tier2Lens}
                className="h-11 px-5 text-xs font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Standard Floating Pill</span>
                </div>
              </Glass>

              {/* Single Primary Action per view (Rule 6) */}
              <Glass
                variant="primary"
                thickness="control"
                shape="capsule"
                interactive
                enableLens={tier2Lens}
                className="h-11 px-6 text-xs text-white"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Single Primary Action</span>
                </div>
              </Glass>
            </div>
          </div>

          {/* Clear Variant */}
          <div className="flex flex-col items-center space-y-3 p-6 rounded-3xl bg-black/30 backdrop-blur-xs border border-white/10">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wider drop-shadow">
              3. Clear Variant (Media Overlay Only)
            </div>
            <div className="text-xs text-white/70 text-center">
              3px minimal blur • 0.30 dimming scrim • 0.08 tint • bold high-contrast text
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Glass
                variant="clear"
                thickness="control"
                shape="capsule"
                interactive
                enableLens={tier2Lens}
                className="h-11 px-6 text-xs font-bold text-white shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Camera HUD Viewfinder</span>
                </div>
              </Glass>
            </div>
          </div>
        </div>

        {/* 3. REGULAR SURFACE: Modal Sheet / Menu Surface */}
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-center text-white/90 drop-shadow">
            4. Regular Surface Thickness (Sheets, Modals, Menus)
          </div>
          <div className="text-[11px] text-white/70 text-center drop-shadow">
            22px deeper blur • layered elevation shadow • 24px concentric radius
          </div>

          <Glass
            variant="regular"
            thickness="surface"
            shape="surface"
            className="p-6 sm:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SURFACE ARCHITECTURE
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Kendrapara DEOC Live Tactical Console
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-emerald-400 font-bold">ALL STATIONS ONLINE</div>
                <div className="text-[10px] text-slate-400">12 Coastal Shelters Active</div>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-normal">
              Notice how the surface glass recedes optically into the environment: light bends smoothly through the convex bezel perimeter, the 1px directional rim-light guides edge perception, and text remains crisp with WCAG AAA contrast regardless of the underlying photo or video backdrop.
            </p>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Glass on Glass Violation</span>
              </div>

              <button className="lg-inner-item px-4 py-2 text-xs font-bold text-white">
                Dismiss Sheet
              </button>
            </div>
          </Glass>
        </div>

        {/* Token Inspection Spec Strip */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-500">Blur:</span> {LG_TOKENS.blurControl} (ctl) / {LG_TOKENS.blurSurface} (srf)
          </div>
          <div>
            <span className="text-slate-500">Saturate:</span> {LG_TOKENS.saturate}
          </div>
          <div>
            <span className="text-slate-500">Primary Tint:</span> {LG_TOKENS.tintPrimary}
          </div>
          <div>
            <span className="text-slate-500">Tier 2 Lensing:</span> {tier2Lens ? "Chromium Snell Bezel" : "Tier 1 Pure CSS"}
          </div>
        </div>
      </div>
    </div>
  );
}
