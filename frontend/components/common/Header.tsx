"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";
import { GooeySearch } from "@/components/ui/gooey-search";
import { db, initializeDatabase } from "@/lib/db/dexie";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");
  const [syncState, setSyncState] = useState<SyncState>("ONLINE");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  useEffect(() => {
    initializeDatabase().catch(console.error);

    const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
    if (savedLang) setLang(savedLang);

    const unsubscribe = syncManager.subscribe((state, count) => {
      setSyncState(state);
      setPendingCount(count);
    });

    return () => unsubscribe();
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
    if (nextMode) {
      setSyncState("OFFLINE");
    } else {
      setSyncState("ONLINE");
      syncManager.triggerSync();
    }
  };

  // ── Navigation routes defined for navbar search ──
  const APP_NAV_ROUTES = [
    { path: "/intake", label: "📋 Household Intake (/intake)", keywords: ["intake", "household", "triage", "family", "/intake"] },
    { path: "/inventory", label: "📦 Shelter Stocks (/inventory)", keywords: ["inventory", "stock", "supplies", "ration", "water", "food", "/inventory"] },
    { path: "/scan", label: "📷 QR Pass Scanner (/scan)", keywords: ["scan", "qr", "pass", "camera", "token", "/scan"] },
    { path: "/map", label: "🗺️ Spatial GIS Map (/map)", keywords: ["map", "gis", "shelters", "spatial", "evacuation", "/map"] },
    { path: "/dashboard", label: "📊 Command Desk (/dashboard)", keywords: ["dashboard", "command", "desk", "deoc", "analytics", "/dashboard"] },
    { path: "/andhra-pradesh", label: "🌊 Andhra Pradesh Hub (/andhra-pradesh)", keywords: ["andhra", "pradesh", "ap", "visakhapatnam", "/andhra-pradesh"] },
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
    if (item.includes("/intake") || item.startsWith("👤") || item.toLowerCase().includes("intake")) {
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
    }
  };

  const t = translations[lang];

  const getLanguageLabel = () => {
    if (lang === "en") return "English";
    if (lang === "or") return "ଓଡ଼ିଆ";
    return "తెలుగు";
  };

  const navLinks = [
    { href: "/intake", label: t.navIntake },
    { href: "/inventory", label: t.navInventory },
    { href: "/scan", label: t.navScan },
    { href: "/map", label: t.navMap },
    { href: "/dashboard", label: t.navDashboard },
    { href: "/andhra-pradesh", label: t.navAP },
    { href: "/admin/dashboard", label: "Admin Live EOC" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white">
      {/* Network Status Alert Banner */}
      <div
        className={`px-4 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
          syncState === "OFFLINE" || isSimulatedOffline
            ? "bg-amber-600 text-black"
            : syncState === "SYNCING"
            ? "bg-blue-600 text-white"
            : "bg-emerald-700 text-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {syncState === "OFFLINE" || isSimulatedOffline ? (
            <>
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>{t.offlineStatus}</span>
            </>
          ) : syncState === "SYNCING" ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t.syncingStatus}</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>{t.onlineStatus}</span>
            </>
          )}

          {pendingCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-white">
              {pendingCount} Queued
            </span>
          )}
        </div>

        {/* Demo Airplane Mode Toggle Button */}
        <button
          onClick={toggleAirplaneMode}
          className="px-2 py-0.5 text-[11px] rounded bg-black/30 hover:bg-black/50 text-white border border-white/20 transition-all font-mono"
        >
          {isSimulatedOffline ? "✈️ Flight Mode: ON" : "✈️ Flight Mode: OFF"}
        </button>
      </div>

      {/* Main App Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between relative z-30">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-sky-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight leading-none text-sky-400">
              {t.appTitle}
            </div>
            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {t.region}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Gooey Search on the left side of language change button */}
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
                ? "వెతుకు"
                : "Search"
            }
            maxResults={5}
            debounceMs={300}
            onSelect={handleResultSelect}
          />

          {/* Multi-Language Switcher (EN -> OR -> TE) */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition shrink-0"
            title="Click to switch language: English / ଓଡ଼ିଆ / తెలుగు"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{getLanguageLabel()}</span>
          </button>

          {/* Secure Admin Portal Link */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-bold transition shadow-sm shrink-0"
            title="Secure Emergency Operation Center Admin Dashboard"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Admin EOC</span>
            <span className="sm:hidden">EOC</span>
          </Link>
        </div>
      </div>

      {/* Sub-Navigation with Spotlight Effect */}
      <nav className="border-t border-slate-800/80 bg-slate-950/70 overflow-x-auto relative z-10">
        <div className="max-w-7xl mx-auto px-3 py-1 flex items-center">
          <SpotlightNavbar />
        </div>
      </nav>
    </header>
  );
}
