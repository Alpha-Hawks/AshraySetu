"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Waves,
  History,
  LifeBuoy,
  ClipboardList,
  Wind,
  MapPin,
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";
import {
  HistoricalCyclone,
  AP_HISTORICAL_CYCLONES,
} from "@/lib/data/apCyclonesData";
import { cn } from "@/lib/utils";

interface APDistrict {
  id: string;
  district_name: string;
  headquarters: string;
  coastal_length_km: number;
  vulnerability_tier: "VERY_HIGH" | "HIGH" | "MODERATE";
  key_coastal_mandals: string[];
  major_historical_cyclones: string[];
  deoc_helpline: string;
  designated_shelters: number;
}

export default function AndhraPradeshPage() {
  const [lang, setLang] = useState<Language>("en");
  const [districts, setDistricts] = useState<APDistrict[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [activeWeather, setActiveWeather] = useState<any>(null);

  // Past Historical Incidents State
  const [cyclones, setCyclones] = useState<HistoricalCyclone[]>(AP_HISTORICAL_CYCLONES);
  const [cycloneSearch, setCycloneSearch] = useState("");
  const [cycloneEra, setCycloneEra] = useState<string>("ALL");
  const [selectedCyclone, setSelectedCyclone] = useState<HistoricalCyclone | null>(null);

  // AI Assistant State
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const dRes = await fetch("/api/ap/districts");
        if (dRes.ok) {
          const dData = await dRes.json();
          setDistricts(dData.districts || []);
        }

        const cRes = await fetch("/api/ap/cyclones");
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.cyclones && cData.cyclones.length > 0) {
            setCyclones(cData.cyclones);
          }
        }

        const wRes = await fetch("/api/weather/cyclone-track?region=AP");
        if (wRes.ok) {
          const wData = await wRes.json();
          setActiveWeather(wData);
        }
      } catch (err) {
        console.warn("Could not fetch AP live datasets", err);
      }
    }
    loadData();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);
    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  // Listen to Escape key to close modal if open
  useEffect(() => {
    if (!selectedCyclone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCyclone(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCyclone]);

  const t = translations[lang];

  const handleAskAI = async (queryText?: string) => {
    const q = queryText || aiQuestion;
    if (!q.trim()) return;

    setIsAiLoading(true);
    setAiAnswer(null);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data);
      }
    } catch {
      setAiAnswer({
        answer: "AI retrieval offline. Please refer to verified APSDMA documentation.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredDistricts =
    selectedDistrict === "ALL"
      ? districts
      : districts.filter((d) => d.id === selectedDistrict);

  // Compute filtered past incidents based on search, era, and selected district
  const filteredCyclones = useMemo(() => {
    return cyclones.filter((c) => {
      // If a specific district is selected in the directory filter
      if (selectedDistrict !== "ALL") {
        const distObj = districts.find((d) => d.id === selectedDistrict);
        const distName = distObj ? distObj.district_name.toLowerCase() : "";
        const matchesDistrict = c.affected_districts.some(
          (d) => d.toLowerCase().includes(distName) || distName.includes(d.toLowerCase())
        );
        if (!matchesDistrict) return false;
      }

      // Search query filter
      if (cycloneSearch.trim()) {
        const q = cycloneSearch.toLowerCase();
        const matchesName = c.cyclone_name.toLowerCase().includes(q);
        const matchesLoc = c.landfall_location.toLowerCase().includes(q);
        const matchesYear = String(c.year).includes(q);
        const matchesDist = c.affected_districts.some((d) => d.toLowerCase().includes(q));
        if (!matchesName && !matchesLoc && !matchesYear && !matchesDist) return false;
      }

      // Era filter
      if (cycloneEra === "SUPER_SEVERE") {
        const wind = typeof c.maximum_wind_speed_kmh === "number" ? c.maximum_wind_speed_kmh : 0;
        return (
          wind >= 160 ||
          c.cyclone_name.toLowerCase().includes("super") ||
          c.cyclone_name.toLowerCase().includes("extremely")
        );
      }
      if (cycloneEra === "RECENT") return c.year >= 2014;
      if (cycloneEra === "HISTORIC") return c.year < 2014;

      return true;
    });
  }, [cyclones, selectedDistrict, districts, cycloneSearch, cycloneEra]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner - Liquid Glass */}
      <div className="glass-header-panel rounded-[40px] p-6 sm:p-7 relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-l1 text-amber-800 border border-amber-300/50 text-xs font-semibold uppercase tracking-wider">
              <Waves className="w-3.5 h-3.5 text-amber-600" />
              <span>Andhra Pradesh Disaster Information Module</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              {t.apTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              {t.apSubtitle}. 974 km coastal corridor covering 12 reorganized coastal districts, historical cyclone archives (1977–2023), and fishermen safety protocols.
            </p>
          </div>

          <div className="flex flex-col gap-2 self-start sm:self-auto">
            <span className="glass-l1 px-3.5 py-1.5 rounded-2xl border border-white/60 text-xs text-slate-700 font-mono text-center shadow-xs">
              State Helpline: <strong className="text-amber-700">1070 (SEOC)</strong>
            </span>
            <span className="glass-l1 px-3.5 py-1.5 rounded-2xl border border-white/60 text-xs text-slate-700 font-mono text-center shadow-xs">
              Marine Police: <strong className="text-[#007AFF]">1093 (Sea Safety)</strong>
            </span>
          </div>
        </div>

        {/* Quick Navigation Strip to dedicated AP sub-modules */}
        <div className="pt-4 border-t border-slate-200/60 flex flex-wrap gap-2 text-xs font-semibold">
          <Link
            href="/andhra-pradesh/history"
            className="glass-l1 px-4 py-2 rounded-2xl border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/50 transition flex items-center gap-2 shadow-xs"
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>{t.navAPHistory} (1977–2023)</span>
          </Link>
          <Link
            href="/andhra-pradesh/fishermen"
            className="glass-l1 px-4 py-2 rounded-2xl border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/50 transition flex items-center gap-2 shadow-xs"
          >
            <LifeBuoy className="w-4 h-4 text-[#007AFF]" />
            <span>{t.navAPFishermen}</span>
          </Link>
          <Link
            href="/andhra-pradesh/preparedness"
            className="glass-l1 px-4 py-2 rounded-2xl border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/50 transition flex items-center gap-2 shadow-xs"
          >
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>{t.navAPPreparedness}</span>
          </Link>
          <Link
            href="/map"
            className="glass-l1 px-4 py-2 rounded-2xl border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/50 transition flex items-center gap-2 shadow-xs"
          >
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>View Coastal Shelters Map</span>
          </Link>
          <Link
            href="/odisha"
            className="glass-l1 px-4 py-2 rounded-2xl border border-teal-300/60 text-teal-800 hover:bg-teal-50/50 transition flex items-center gap-2 ml-auto shadow-xs"
          >
            <Waves className="w-4 h-4 text-teal-600" />
            <span>Switch to Odisha Hub (OSDMA) →</span>
          </Link>
        </div>
      </div>

      {/* Current Cyclone / Advisory Status Strip */}
      {activeWeather && (
        <div className="glass-l2 rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl glass-l3 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 uppercase">
                  Active Coastal Advisory
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300/70">
                  {activeWeather.current_intensity}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 mt-0.5">
                {activeWeather.cyclone_name}
              </h2>
              <div className="text-xs text-slate-600 font-medium">
                Landfall Zone: {activeWeather.estimated_landfall_point} • Max Wind: {activeWeather.max_sustained_winds_kmh} km/h • Surge: ~{activeWeather.projected_surge_height_meters}m
              </div>
            </div>
          </div>

          <div className="glass-l1 px-3.5 py-2 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-semibold self-start md:self-auto shadow-xs">
            {activeWeather.disclaimer}
          </div>
        </div>
      )}

      {/* ========================================================
          HISTORICAL PAST INCIDENTS SECTION (SMALL CARDS GRID)
          ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-l1 text-amber-800 border border-amber-300/50 text-[11px] font-bold uppercase tracking-wider mb-1">
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Historical Cyclone Archive & Past Incidents</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-950 tracking-tight">
              Major Past Incidents (1977 – 2023)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Official IMD & APSDMA verified chronological records of storm landfalls, surges, evacuations, and mitigation milestones.
            </p>
          </div>

          <Link
            href="/andhra-pradesh/history"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007AFF] hover:text-[#005bb5] transition-colors shrink-0"
          >
            <span>View Full Timeline Matrix</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="glass-l2 rounded-[28px] p-3.5 sm:p-4 border border-white/60 shadow-md flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cycloneSearch}
              onChange={(e) => setCycloneSearch(e.target.value)}
              placeholder="Filter by cyclone name, location, or district (e.g., Hudhud, Diviseema, Bapatla)..."
              className="glass-input rounded-2xl w-full pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
            {cycloneSearch && (
              <button
                type="button"
                onClick={() => setCycloneSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Era Filter Chips */}
          <div className="glass-l1 rounded-full p-1.5 border border-white/50 shadow-inner flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {[
              { id: "ALL", label: `All Events (${cyclones.length})` },
              { id: "SUPER_SEVERE", label: "Super & Severe" },
              { id: "RECENT", label: "2014 – 2023" },
              { id: "HISTORIC", label: "1977 – 2012" },
            ].map((era) => (
              <button
                key={era.id}
                type="button"
                onClick={() => setCycloneEra(era.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  cycloneEra === era.id
                    ? "glass-pill-tab-all-active text-white shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                {era.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active District Filter Indicator (when district dropdown is active) */}
        {selectedDistrict !== "ALL" && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl glass-l1 border border-amber-300/60 text-xs text-amber-900 shadow-xs">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Filtering past incidents affecting{" "}
                <strong>{districts.find((d) => d.id === selectedDistrict)?.district_name}</strong>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDistrict("ALL")}
              className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
            >
              Show All Districts
            </button>
          </div>
        )}

        {/* Small Cards Grid */}
        {filteredCyclones.length === 0 ? (
          <div className="p-8 text-center glass-l1 rounded-3xl border border-white/60 text-xs text-slate-600 font-medium">
            No historical cyclone incidents match your current search/filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCyclones.map((c) => {
              const shortName = c.cyclone_name.split("(")[0].trim();
              const categoryMatch = c.cyclone_name.match(/\((.*?)\)/);
              const categoryText = categoryMatch ? categoryMatch[1].replace(/^\d{4}\s*/, "") : "Cyclonic Storm";

              return (
                <div
                  key={c.id}
                  className="group p-5 rounded-[28px] glass-l2 border border-white/60 shadow-md hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Year Pill & Category Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono glass-l1 text-amber-800 border border-amber-300/50 shrink-0">
                        {c.year}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md glass-l1 text-slate-700 border border-white/60 truncate max-w-[150px]"
                        title={categoryText}
                      >
                        {categoryText}
                      </span>
                    </div>

                    {/* Cyclone Name */}
                    <h3 className="text-sm font-bold text-slate-950 mt-2 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {shortName}
                    </h3>

                    {/* Landfall Location */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate" title={c.landfall_location}>
                        {c.landfall_location}
                      </span>
                    </div>

                    {/* Compact 2x2 Telemetry Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60">
                      <div className="p-2 rounded-xl glass-l1 border border-white/60">
                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Peak Wind</span>
                        <span className="font-bold text-slate-950 text-xs">
                          {c.maximum_wind_speed_kmh !== "Data unavailable"
                            ? `${c.maximum_wind_speed_kmh} km/h`
                            : "N/A"}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl glass-l1 border border-white/60">
                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Surge Height</span>
                        <span className="font-bold text-sky-700 text-xs">
                          {c.storm_surge_meters !== "Data unavailable"
                            ? `${c.storm_surge_meters}m`
                            : "N/A"}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl glass-l1 border border-white/60">
                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Evacuated</span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {c.evacuated_population !== "Data unavailable"
                            ? Number(c.evacuated_population).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl glass-l1 border border-white/60">
                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Casualties</span>
                        <span
                          className={cn(
                            "font-bold text-xs",
                            c.casualties !== "Data unavailable" && Number(c.casualties) > 100
                              ? "text-rose-600"
                              : c.casualties !== "Data unavailable" && Number(c.casualties) > 0
                              ? "text-amber-700"
                              : "text-slate-800"
                          )}
                        >
                          {c.casualties !== "Data unavailable"
                            ? Number(c.casualties).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Affected Districts Tags */}
                    <div className="mt-3">
                      <div className="text-[9px] text-slate-500 font-semibold mb-1 uppercase font-mono">
                        Affected Districts
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.affected_districts.slice(0, 3).map((d) => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded-md text-[10px] glass-l1 text-slate-700 border border-white/60 font-medium"
                          >
                            {d}
                          </span>
                        ))}
                        {c.affected_districts.length > 3 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] glass-l1 text-slate-600 font-mono">
                            +{c.affected_districts.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button: View Incident Dossier */}
                  <button
                    type="button"
                    onClick={() => setSelectedCyclone(c)}
                    className="mt-4 w-full py-2.5 px-3 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Incident Details</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Assistant Grounded Query Box (Liquid Glass) */}
      <div className="glass-l2 rounded-[32px] sm:rounded-[36px] p-6 border border-white/60 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl glass-l3 text-[#007AFF] flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-1.5">
                <span>{t.aiAssistantTitle}</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Grounded in official APSDMA & IMD archives. Zero invented statistics.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300/70 font-semibold shadow-xs">
            FreeLLMAPI Connected
          </span>
        </div>

        {/* Input bar */}
        <div className="flex gap-2.5">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
            placeholder="Ask anything: 'Which districts were affected by Hudhud?' or 'Cyclone safety for fishermen'..."
            className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={() => handleAskAI()}
            disabled={isAiLoading}
            className="px-5 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/25 whitespace-nowrap cursor-pointer active:scale-95 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAiLoading ? "Searching Records..." : "Query AI"}</span>
          </button>
        </div>

        {/* Preset query chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold">Suggested:</span>
          {[
            "Which districts were affected by Hudhud?",
            "What happened during Cyclone Gulab?",
            "Cyclone safety for fishermen",
            "Tell me about 1977 Diviseema Cyclone",
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => {
                setAiQuestion(promptText);
                handleAskAI(promptText);
              }}
              className="glass-l1 px-3 py-1 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-white/60 text-[11px] border border-white/60 transition cursor-pointer font-medium shadow-xs"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* AI Response Card */}
        {aiAnswer && (
          <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-3 text-xs animate-in fade-in shadow-xs">
            <div className="text-slate-900 whitespace-pre-line leading-relaxed font-medium">
              {aiAnswer.answer}
            </div>

            {aiAnswer.grounded_sources && aiAnswer.grounded_sources.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700">Verified Grounded Sources:</div>
                {aiAnswer.grounded_sources.map((src: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-[#007AFF] font-medium">
                    <ExternalLink className="w-3 h-3" />
                    <span>{src.source}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coastal Districts Section with Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-950">
              Official Coastal Districts Directory (12 Reorganized Districts)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Government of Andhra Pradesh Gazette (April 2022 District Reorganization)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Filter:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="glass-select rounded-2xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Coastal Districts (12)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDistricts.map((dist) => (
            <div
              key={dist.id}
              className="p-5 rounded-[28px] glass-l2 border border-white/60 space-y-3.5 shadow-md hover:border-amber-300 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {dist.district_name}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium">
                    HQ: {dist.headquarters}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    dist.vulnerability_tier === "VERY_HIGH"
                      ? "bg-rose-100/80 text-rose-800 border border-rose-300/70"
                      : "bg-amber-100/80 text-amber-800 border border-amber-300/70"
                  }`}
                >
                  {dist.vulnerability_tier === "VERY_HIGH" ? "Very High Risk" : "High Risk"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Coastline:</span>
                  <span className="font-bold text-slate-950">{dist.coastal_length_km} km</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Cyclone Shelters:</span>
                  <span className="font-bold text-[#007AFF]">{dist.designated_shelters} Facilities</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">DEOC Helpline:</span>
                  <span className="font-mono text-amber-800 font-bold">{dist.deoc_helpline}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <div className="text-[11px] text-slate-600 font-semibold mb-1">
                  Key Coastal Mandals:
                </div>
                <div className="text-[11px] text-slate-800 line-clamp-2 font-medium">
                  {dist.key_coastal_mandals.join(", ")}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono">
                Past Events: {dist.major_historical_cyclones.join(" • ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================
          DETAILED CYCLONE INCIDENT DOSSIER MODAL (LIQUID GLASS)
          ======================================================== */}
      {selectedCyclone && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedCyclone.cyclone_name}
          className="fixed inset-0 z-[10000] bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedCyclone(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] glass-header-panel rounded-[36px] shadow-2xl border border-white/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/60 flex items-center justify-between glass-l1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono glass-l1 text-amber-800 border border-amber-300/50">
                    {selectedCyclone.year}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedCyclone.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-950 mt-1">
                  {selectedCyclone.cyclone_name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{selectedCyclone.landfall_location}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCyclone(null)}
                aria-label="Close Incident Details"
                className="p-2 rounded-full glass-l1 hover:bg-white/60 text-slate-600 hover:text-slate-950 transition-colors cursor-pointer border border-white/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Peak Wind</span>
                  <div className="text-sm sm:text-base font-bold text-slate-950 mt-0.5">
                    {selectedCyclone.maximum_wind_speed_kmh !== "Data unavailable"
                      ? `${selectedCyclone.maximum_wind_speed_kmh} km/h`
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Storm Surge</span>
                  <div className="text-sm sm:text-base font-bold text-sky-700 mt-0.5">
                    {selectedCyclone.storm_surge_meters !== "Data unavailable"
                      ? `${selectedCyclone.storm_surge_meters} meters`
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Evacuated</span>
                  <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                    {selectedCyclone.evacuated_population !== "Data unavailable"
                      ? Number(selectedCyclone.evacuated_population).toLocaleString()
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Casualties</span>
                  <div className="text-sm sm:text-base font-bold text-rose-600 mt-0.5">
                    {selectedCyclone.casualties !== "Data unavailable"
                      ? Number(selectedCyclone.casualties).toLocaleString()
                      : "Data unavailable"}
                  </div>
                </div>
              </div>

              {/* Rainfall and Houses Damaged */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Rainfall Record</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedCyclone.rainfall_mm}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Dwellings Damaged</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {selectedCyclone.houses_damaged !== "Data unavailable"
                      ? Number(selectedCyclone.houses_damaged).toLocaleString() + " units"
                      : "Data unavailable"}
                  </div>
                </div>
              </div>

              {/* Impact Breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-950 text-xs uppercase tracking-wider font-mono">
                  Impact Assessment & Lifeline Damages
                </h4>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl glass-l1 border border-amber-200/80 text-slate-800">
                    <strong className="text-amber-900 block mb-0.5">Infrastructure & Roads:</strong>
                    {selectedCyclone.infrastructure_damage}
                  </div>

                  <div className="p-3.5 rounded-2xl glass-l1 border border-emerald-200/80 text-slate-800">
                    <strong className="text-emerald-900 block mb-0.5">Agriculture & Crops:</strong>
                    {selectedCyclone.agricultural_damage}
                  </div>

                  <div className="p-3.5 rounded-2xl glass-l1 border border-sky-200/80 text-slate-800">
                    <strong className="text-sky-900 block mb-0.5">Fisheries & Marine Sector:</strong>
                    {selectedCyclone.fisheries_impact}
                  </div>

                  <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 text-slate-800">
                    <strong className="text-slate-950 block mb-0.5">Power & Telecommunications:</strong>
                    <div>{selectedCyclone.power_disruption}</div>
                    <div className="mt-1">{selectedCyclone.communication_disruption}</div>
                  </div>
                </div>
              </div>

              {/* Lessons Learned & Government Response */}
              <div className="p-5 rounded-2xl glass-l2 border border-amber-300/70 text-slate-950 space-y-2 shadow-md">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Mitigation Shift & Institutional Lessons Learned:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedCyclone.lessons_learned}
                </p>
                <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200/60">
                  <strong className="text-slate-900">Response Action:</strong> {selectedCyclone.government_response}
                </div>
              </div>

              {/* Grounded Source Footer */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                <div>
                  Verified IMD / APSDMA Record: <strong className="text-slate-900">{selectedCyclone.source_name}</strong>
                </div>
                {selectedCyclone.source_url && (
                  <a
                    href={selectedCyclone.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#007AFF] hover:underline font-semibold"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/60 glass-l1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedCyclone(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
