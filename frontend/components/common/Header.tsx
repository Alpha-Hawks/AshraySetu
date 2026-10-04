"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GenieLink } from "@/genie/GenieLink";
import { usePathname, useRouter } from "next/navigation";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { syncManager, type SyncState } from "@/lib/sync/syncManager";
import { translations, type Language } from "@/lib/locales/translations";
import { GooeySearch } from "@/components/ui/gooey-search";
import { db, initializeDatabase } from "@/lib/db/dexie";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [lang, setLang] = useState<Language>("en");
  const [syncState, setSyncState] = useState<SyncState>("ONLINE");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [animatingBtn, setAnimatingBtn] = useState<string | null>(null);
  const [isQrGenerating, setIsQrGenerating] = useState(false);

  useEffect(() => {
    const handleQrState = (e: any) => {
      setIsQrGenerating(Boolean(e.detail?.isGenerating));
    };
    window.addEventListener("qrGeneratingState", handleQrState);
    return () => window.removeEventListener("qrGeneratingState", handleQrState);
  }, []);

  const triggerButtonWave = (id: string) => {
    setAnimatingBtn(id);
    setTimeout(() => {
      setAnimatingBtn((prev) => (prev === id ? null : prev));
    }, 750);
  };

  useEffect(() => {
    initializeDatabase().catch(console.error);

    const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
    if (savedLang) setLang(savedLang);

    const unsubscribe = syncManager.subscribe((state, count) => {
      setSyncState(state);
      setPendingCount(count);
    });

    try {
      if (sessionStorage.getItem("ashraysetu_flight_mode") === "1") {
        setIsSimulatedOffline(true);
        setSyncState("OFFLINE");
      }
    } catch {}

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        if (height > 0) {
          document.documentElement.style.setProperty("--app-header-height", `${height}px`);
        }
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && headerRef.current) {
      observer = new ResizeObserver(() => updateHeaderHeight());
      observer.observe(headerRef.current);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateHeaderHeight);
      observer?.disconnect();
    };
  }, []);

  const toggleLanguage = () => {
    let nextLang: Language = "en";
    if (lang === "en") nextLang = "or";
    else if (lang === "or") nextLang = "te";
    else nextLang = "en";

    setLang(nextLang);
    localStorage.setItem("ashraysetu_lang", nextLang);
    window.dispatchEvent(new Event("languageChanged"));
  };

  const toggleAirplaneMode = () => {
    const nextMode = !isSimulatedOffline;
    setIsSimulatedOffline(nextMode);
    try {
      sessionStorage.setItem("ashraysetu_flight_mode", nextMode ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("flightModeChanged", { detail: { enabled: nextMode } })
      );
    } catch {}

    if (nextMode) {
      setSyncState("OFFLINE");
    } else {
      setSyncState("ONLINE");
      syncManager.triggerSync();
    }
  };

  // ── Navigation routes defined for navbar search ──
  const APP_NAV_ROUTES = [
    { path: "/intake", label: "📋 Household Intake & QR Pass (/intake)", keywords: ["intake", "household", "triage", "family", "generate", "qr", "token", "pass", "printer", "/intake"] },
    { path: "/inventory", label: "📦 Shelter Stocks (/inventory)", keywords: ["inventory", "stock", "supplies", "ration", "water", "food", "/inventory"] },
    { path: "/scan", label: "📷 QR Pass Scanner (/scan)", keywords: ["scan", "qr", "pass", "camera", "token", "/scan"] },
    { path: "/map", label: "🗺️ Spatial GIS Map (/map)", keywords: ["map", "gis", "shelters", "spatial", "evacuation", "/map"] },
    { path: "/dashboard", label: "📊 Command Desk (/dashboard)", keywords: ["dashboard", "command", "desk", "deoc", "analytics", "/dashboard"] },
    { path: "/andhra-pradesh", label: "🌊 Andhra Pradesh Hub (/andhra-pradesh)", keywords: ["andhra", "pradesh", "ap", "visakhapatnam", "/andhra-pradesh"] },
    { path: "/odisha", label: "🌪️ Odisha Hub (/odisha)", keywords: ["odisha", "hub", "kendrapara", "puri", "osdma", "/odisha"] },
    { path: "/admin/dashboard", label: "🛡️ Admin Live EOC (/admin/dashboard)", keywords: ["admin", "eoc", "portal", "live", "/admin/dashboard"] },
  ];

  // ── Live Gooey Search across Routes + IndexedDB households + shelters ──
  const handleSearch = async (query: string): Promise<string[]> => {
    const q = query.toLowerCase().trim();

    // Match application routes
    const routeMatches = APP_NAV_ROUTES
      .filter((r) => {
        if (!q) return true;
        return (
          r.path.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q) ||
          r.keywords.some((k) => k.includes(q))
        );
      })
      .map((r) => r.label);

    if (!q) {
      return routeMatches.slice(0, 5);
    }

    try {
      await initializeDatabase();
      const [households, shelterList] = await Promise.all([
        db.households.toArray(),
        db.shelters.toArray(),
      ]);

      const householdMatches = households
        .filter(
          (h) =>
            h.head_name.toLowerCase().includes(q) ||
            h.hamlet_name.toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((h) => `👤 ${h.head_name} — ${h.hamlet_name} (${h.total_members} members)`);

      const shelterMatches = shelterList
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.block_name.toLowerCase().includes(q) ||
            (s.district ?? "").toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((s) => `🏠 ${s.name} — ${s.block_name} (${s.current_occupancy}/${s.capacity_persons})`);

      return [...routeMatches.slice(0, 3), ...shelterMatches, ...householdMatches].slice(0, 6);
    } catch (err) {
      console.error("Header search error:", err);
      return routeMatches.slice(0, 5);
    }
  };

  const handleResultSelect = (item: string) => {
    window.dispatchEvent(new CustomEvent("ashraysetuSearchSelect", { detail: item }));

    // Match and route to clicked navigation destination
    if (item.includes("/intake") || item.startsWith("👤") || item.toLowerCase().includes("intake") || item.toLowerCase().includes("printer") || item.toLowerCase().includes("generate qr")) {
      router.push("/intake");
    } else if (item.includes("/inventory") || item.toLowerCase().includes("inventory") || item.toLowerCase().includes("stock")) {
      router.push("/inventory");
    } else if (item.includes("/scan") || item.toLowerCase().includes("scan") || item.toLowerCase().includes("qr")) {
      router.push("/scan");
    } else if (item.includes("/map") || item.startsWith("🏠") || item.toLowerCase().includes("map")) {
      router.push("/map");
    } else if (item.includes("/admin") || item.toLowerCase().includes("admin") || item.toLowerCase().includes("eoc")) {
      router.push("/admin/dashboard");
    } else if (item.includes("/dashboard") || item.toLowerCase().includes("command")) {
      router.push("/dashboard");
    } else if (item.includes("/andhra-pradesh") || item.toLowerCase().includes("andhra")) {
      router.push("/andhra-pradesh");
    } else if (item.includes("/odisha") || item.toLowerCase().includes("odisha")) {
      router.push("/odisha");
    }
  };

  const t = translations[lang];

  const getLanguageLabel = () => {
    if (lang === "en") return "English";
    if (lang === "or") return "ଓଡ଼ିଆ";
    return "తెలుగు";
  };



  return (
    <header
      ref={headerRef}
      data-view-transition="app-shell"
      className={cn(
        "fixed top-0 left-0 right-0 w-full z-50 pointer-events-none transition-all duration-300 genie-app-shell",
        isQrGenerating && "opacity-0 -translate-y-full pointer-events-none invisible"
      )}
      style={isQrGenerating ? { display: "none" } : undefined}
    >
      {/* Edge-to-Edge Floating Glass Bar (Consuming the same shared Liquid Glass Material) */}
      <div className="pointer-events-auto w-full liquid-glass-material liquid-glass-top-navbar transition-all duration-300">
        {/* Network Status Micro-Alert Ribbon - status tint over the shared Liquid Glass Material */}
        <div
          className={`w-full border-b transition-colors ${
            syncState === "OFFLINE" || isSimulatedOffline
              ? "bg-amber-500/10 text-amber-950 border-amber-500/20"
              : syncState === "SYNCING"
              ? "bg-sky-500/10 text-sky-950 border-sky-500/20"
              : "bg-emerald-500/10 text-emerald-950 border-emerald-500/20"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 text-[11px] font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncState === "OFFLINE" || isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>{t.offlineStatus}</span>
                </>
              ) : syncState === "SYNCING" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>{t.syncingStatus}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.onlineStatus}</span>
                </>
              )}

              {pendingCount > 0 && (
                <span className="ml-1.5 px-2 py-0.2 rounded-full bg-white/60 text-[10px] font-mono text-slate-700 border border-white/80 shadow-xs backdrop-blur-md">
                  {pendingCount} Queued
                </span>
              )}
            </div>

            {/* Flight Mode Toggle Button - Figma Liquid Glass Pill */}
            <button
              onClick={() => {
                triggerButtonWave("flight");
                toggleAirplaneMode();
              }}
              className={`px-3 py-1 text-[10px] rounded-full font-mono transition backdrop-blur-md active:scale-95 figma-ocean-wave-btn ${
                animatingBtn === "flight" ? "figma-wave-animating" : ""
              } ${
                isSimulatedOffline
                  ? "!bg-amber-500/25 !text-amber-950 border-amber-400"
                  : "bg-white/70 hover:bg-white/90 text-slate-800 border-white/80"
              }`}
            >
              <span className="figma-wave-capsule" aria-hidden="true">
                <span className="figma-wave-meniscus" />
              </span>
              <span className="figma-wave-shockwave" aria-hidden="true" />
              <span className="figma-wave-shockwave-2" aria-hidden="true" />
              <span className="relative z-10">{isSimulatedOffline ? "✈️ Flight Mode: ON" : "✈️ Flight Mode: OFF"}</span>
            </button>
          </div>
        </div>

        {/* Main App Bar Controls Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 relative z-20">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0055B3] flex items-center justify-center font-bold text-sm shadow-[0_2px_10px_rgba(0,122,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/40 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight leading-none text-slate-900">
                {t.appTitle}
              </div>
              <div className="text-[10px] text-slate-500 font-medium hidden sm:block">
                {t.region}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Morphing Gooey Search - Dark Blue & Shifted 15mm Left */}
            <div className="mr-[15mm]" style={{ marginRight: "15mm" }}>
              <GooeySearch
                compact
                onSearch={handleSearch}
                placeholder={
                  lang === "or"
                    ? "ଖୋଜନ୍ତୁ..."
                    : lang === "te"
                    ? "శోధించండి..."
                    : "Search shelters, families..."
                }
                buttonLabel={
                  lang === "or"
                    ? "ଖୋଜ"
                    : lang === "te"
                    ? "వెతుକୁ"
                    : "Search"
                }
                maxResults={5}
                debounceMs={300}
                onSelect={handleResultSelect}
              />
            </div>

            {/* Multi-Language Switcher - Figma Liquid Glass Capsule */}
            <button
              onClick={() => {
                triggerButtonWave("lang");
                toggleLanguage();
              }}
              className={`px-3 py-1.5 text-xs font-semibold text-slate-800 hover:text-slate-950 border border-white/80 rounded-full transition-all shrink-0 flex items-center gap-1.5 active:scale-95 cursor-pointer figma-ocean-wave-btn ${
                animatingBtn === "lang" ? "figma-wave-animating" : ""
              }`}
              title="Click to switch language: English / ଓଡ଼ିଆ / తెలుగు"
            >
              <span className="figma-wave-capsule" aria-hidden="true">
                <span className="figma-wave-meniscus" />
              </span>
              <span className="figma-wave-shockwave" aria-hidden="true" />
              <span className="figma-wave-shockwave-2" aria-hidden="true" />
              <Globe className="w-3.5 h-3.5 text-[#007AFF] relative z-10" />
              <span className="hidden sm:inline relative z-10">{getLanguageLabel()}</span>
            </button>

            {/* Secure Admin Portal Link - Figma Liquid Glass Accent Pill */}
            <GenieLink
              href="/admin/dashboard"
              data-genie-origin="/admin/dashboard"
              onClick={() => triggerButtonWave("admin")}
              className={`px-3 py-1.5 text-rose-700 hover:text-rose-800 border border-rose-300/40 text-xs font-bold rounded-full transition-all shrink-0 flex items-center gap-1.5 active:scale-95 figma-ocean-wave-btn ${
                animatingBtn === "admin" ? "figma-wave-animating" : ""
              }`}
              title="Secure Emergency Operation Center Admin Dashboard"
            >
              <span className="figma-wave-capsule" aria-hidden="true">
                <span className="figma-wave-meniscus" />
              </span>
              <span className="figma-wave-shockwave" aria-hidden="true" />
              <span className="figma-wave-shockwave-2" aria-hidden="true" />
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 relative z-10" />
              <span className="hidden sm:inline relative z-10">Admin Live</span>
              <span className="sm:hidden relative z-10">Admin</span>
            </GenieLink>
          </div>
        </div>


      </div>
    </header>
  );
}

