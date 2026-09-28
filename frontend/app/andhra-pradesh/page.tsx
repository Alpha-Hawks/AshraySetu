"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Waves,
  History,
  LifeBuoy,
  ClipboardList,
  PhoneCall,
  Wind,
  CloudRain,
  MapPin,
  Bot,
  Send,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Building,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-sky-950 border border-amber-600/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Waves className="w-3.5 h-3.5" />
              <span>Andhra Pradesh Disaster Information Module</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t.apTitle}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              {t.apSubtitle}. 974 km coastal corridor covering 12 reorganized coastal districts, historical cyclone archives (1977–2023), and fishermen safety protocols.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono text-center">
              State Helpline: <strong className="text-amber-400">1070 (SEOC)</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono text-center">
              Marine Police: <strong className="text-sky-400">1093 (Sea Safety)</strong>
            </span>
          </div>
        </div>

        {/* Quick Navigation Strip to dedicated AP sub-modules */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-semibold">
          <Link
            href="/andhra-pradesh/history"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 border border-slate-700 transition"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>{t.navAPHistory} (1977–2023)</span>
          </Link>
          <Link
            href="/andhra-pradesh/fishermen"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 border border-slate-700 transition"
          >
            <LifeBuoy className="w-4 h-4 text-sky-400" />
            <span>{t.navAPFishermen}</span>
          </Link>
          <Link
            href="/andhra-pradesh/preparedness"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 border border-slate-700 transition"
          >
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>{t.navAPPreparedness}</span>
          </Link>
          <Link
            href="/map"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 border border-slate-700 transition"
          >
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span>View Coastal Shelters Map</span>
          </Link>
        </div>
      </div>

      {/* Current Cyclone / Advisory Status Strip */}
      {activeWeather && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase">
                  Active Coastal Advisory
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeWeather.current_intensity}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                {activeWeather.cyclone_name}
              </h2>
              <div className="text-xs text-slate-400">
                Landfall Zone: {activeWeather.estimated_landfall_point} • Max Wind: {activeWeather.max_sustained_winds_kmh} km/h • Surge: ~{activeWeather.projected_surge_height_meters}m
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-600/40 text-[11px] text-amber-300 font-semibold self-start md:self-auto">
            {activeWeather.disclaimer}
          </div>
        </div>
      )}

      {/* AI Assistant Grounded Query Box (Section 11) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-600/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 text-sky-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{t.aiAssistantTitle}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Grounded in official APSDMA & IMD archives. Zero invented statistics.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600/40">
            FreeLLMAPI Connected
          </span>
        </div>

        {/* Input bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
            placeholder="Ask anything: 'Which districts were affected by Hudhud?' or 'Cyclone safety for fishermen'..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={() => handleAskAI()}
            disabled={isAiLoading}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/30 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAiLoading ? "Searching Records..." : "Query AI"}</span>
          </button>
        </div>

        {/* Preset query chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-[11px]">Suggested:</span>
          {[
            "Which districts were affected by Hudhud?",
            "What happened during Cyclone Michaung?",
            "Cyclone safety for fishermen",
            "Tell me about 1977 Diviseema Cyclone",
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => {
                setAiQuestion(promptText);
                handleAskAI(promptText);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700/80 transition"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* AI Response Card */}
        {aiAnswer && (
          <div className="p-4 rounded-xl bg-slate-950 border border-sky-500/40 space-y-3 text-xs animate-in fade-in">
            <div className="text-slate-200 whitespace-pre-line leading-relaxed">
              {aiAnswer.answer}
            </div>

            {aiAnswer.grounded_sources && aiAnswer.grounded_sources.length > 0 && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Verified Grounded Sources:</div>
                {aiAnswer.grounded_sources.map((src: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-sky-400">
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
            <h2 className="text-base font-bold text-white">
              Official Coastal Districts Directory (12 Reorganized Districts)
            </h2>
            <p className="text-xs text-slate-400">
              Government of Andhra Pradesh Gazette (April 2022 District Reorganization)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
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
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md hover:border-amber-500/50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {dist.district_name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    HQ: {dist.headquarters}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    dist.vulnerability_tier === "VERY_HIGH"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {dist.vulnerability_tier === "VERY_HIGH" ? "Very High Risk" : "High Risk"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Coastline:</span>
                  <span className="font-bold text-white">{dist.coastal_length_km} km</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Cyclone Shelters:</span>
                  <span className="font-bold text-sky-400">{dist.designated_shelters} Facilities</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">DEOC Helpline:</span>
                  <span className="font-mono text-amber-400 font-bold">{dist.deoc_helpline}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 font-semibold mb-1">
                  Key Coastal Mandals:
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-2">
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
    </div>
  );
}
