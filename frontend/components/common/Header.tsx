"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Package,
  QrCode,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
  Globe,
  Waves,
} from "lucide-react";
import { syncManager, type SyncState } from "@/lib/sync/syncManager";
import { translations, type Language } from "@/lib/locales/translations";

export default function Header() {
  const pathname = usePathname();
  const [lang, setLang] = useState<Language>("en");
  const [syncState, setSyncState] = useState<SyncState>("ONLINE");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  useEffect(() => {
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

  const t = translations[lang];

  const getLanguageLabel = () => {
    if (lang === "en") return "English";
    if (lang === "or") return "ଓଡ଼ିଆ";
    return "తెలుగు";
  };

  const navLinks = [
    { href: "/intake", label: t.navIntake, icon: Users },
    { href: "/inventory", label: t.navInventory, icon: Package },
    { href: "/scan", label: t.navScan, icon: QrCode },
    { href: "/map", label: t.navMap, icon: MapPin },
    { href: "/dashboard", label: t.navDashboard, icon: LayoutDashboard },
    { href: "/andhra-pradesh", label: t.navAP, icon: Waves, badge: "AP" },
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
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-sky-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight leading-none text-sky-400">
              {t.appTitle}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {t.region}
            </div>
          </div>
        </Link>

        {/* Multi-Language Switcher (EN -> OR -> TE) */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition"
          title="Click to switch language: English / ଓଡ଼ିଆ / తెలుగు"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>{getLanguageLabel()}</span>
        </button>
      </div>

      {/* Sub-Navigation for Field & Command Views */}
      <nav className="border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-2 flex space-x-1 sm:space-x-3 py-1.5 text-xs">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap font-medium transition ${
                  isActive
                    ? item.badge
                      ? "bg-amber-600 text-white shadow-sm font-bold"
                      : "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white/20 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
