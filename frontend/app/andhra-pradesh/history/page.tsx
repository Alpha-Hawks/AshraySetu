"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  Wind,
  Waves,
  Users,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  ExternalLink,
  X,
  FileText,
  AlertTriangle,
  Building,
  CheckCircle2,
  MapPin,
  TrendingDown,
  Info,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";

interface HistoricalCyclone {
  id: string;
  cyclone_name: string;
  year: number;
  start_date: string;
  end_date: string;
  landfall_location: string;
  affected_districts: string[];
  maximum_wind_speed_kmh: number | "Data unavailable";
  rainfall_mm: string | "Data unavailable";
  storm_surge_meters: number | "Data unavailable";
  evacuated_population: number | "Data unavailable";
  casualties: number | "Data unavailable";
  houses_damaged: number | "Data unavailable";
  infrastructure_damage: string;
  agricultural_damage: string;
  fisheries_impact: string;
  power_disruption: string;
  communication_disruption: string;
  government_response: string;
  lessons_learned: string;
  source_name: string;
  source_url: string;
  retrieved_at: string;
  last_verified_at: string;
}

export default function CycloneHistoryPage() {
  const [lang, setLang] = useState<Language>("en");
  const [cyclones, setCyclones] = useState<HistoricalCyclone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEra, setSelectedEra] = useState<string>("ALL");
  const [selectedCyclone, setSelectedCyclone] = useState<HistoricalCyclone | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/ap/cyclones");
        if (res.ok) {
          const data = await res.json();
          setCyclones(data.cyclones || []);
        }
      } catch (err) {
        console.warn("Failed to fetch historical cyclone archives", err);
      } finally {
        setLoading(false);
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

  // Filtering
  const filteredCyclones = cyclones.filter((c) => {
    const matchesSearch =
      c.cyclone_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.landfall_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.affected_districts.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedEra === "1970_1999") return c.year >= 1970 && c.year <= 1999;
    if (selectedEra === "2000_2015") return c.year >= 2000 && c.year <= 2015;
    if (selectedEra === "2016_2024") return c.year >= 2016;

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/andhra-pradesh"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Andhra Pradesh Overview</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t.historicalTitle}
              </h1>
              <p className="text-xs text-slate-400">
                Official Archives • IMD / APSDMA Certified Data (1977–2023)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono">
            {cyclones.length} Verified Historical Events
          </span>
        </div>
      </div>

      {/* Evolution of Disaster Management Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Mortality Reduction Trajectory
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              From 10,000+ casualties in 1977 to Zero-Casualty Approach in 2023
            </p>
            <p className="text-xs text-slate-300 max-w-2xl">
              Comparative analysis demonstrates how community cyclone shelter networks, Doppler radar tracking, and proactive mass evacuations transformed Andhra Pradesh coastal vulnerability.
            </p>
          </div>
          <div className="flex gap-4 border-l border-slate-700 pl-4 py-1">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">1977 Diviseema</div>
              <div className="text-base font-bold text-rose-400">10,000+ Dead</div>
              <div className="text-[10px] text-slate-400">50k Evacuated</div>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <div className="text-[10px] text-slate-400 uppercase font-mono">2023 Michaung</div>
              <div className="text-base font-bold text-emerald-400">2 Casualties</div>
              <div className="text-[10px] text-slate-400">94k Evacuated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cyclone, district, or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Era:</span>
          </span>
          {[
            { id: "ALL", label: "All Events" },
            { id: "1970_1999", label: "1970–1999" },
            { id: "2000_2015", label: "2000–2015" },
            { id: "2016_2024", label: "2016–2023" },
          ].map((era) => (
            <button
              key={era.id}
              onClick={() => setSelectedEra(era.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedEra === era.id
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {era.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cyclone Timeline Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading certified historical cyclone records...
        </div>
      ) : filteredCyclones.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-sm">
          No historical cyclones found matching "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCyclones.map((cyclone) => (
            <div
              key={cyclone.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-lg hover:shadow-amber-500/5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {cyclone.year}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cyclone.start_date.slice(5)} to {cyclone.end_date.slice(5)}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition leading-snug">
                    {cyclone.cyclone_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{cyclone.landfall_location}</span>
                  </p>
                </div>

                {/* Key Metrics Chips */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-400" />
                      Peak Wind
                    </span>
                    <span className="font-bold text-white mt-0.5 block">
                      {cyclone.maximum_wind_speed_kmh !== "Data unavailable"
                        ? `${cyclone.maximum_wind_speed_kmh} km/h`
                        : "Data unavailable"}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Waves className="w-3 h-3 text-sky-400" />
                      Storm Surge
                    </span>
                    <span className="font-bold text-white mt-0.5 block">
                      {cyclone.storm_surge_meters !== "Data unavailable"
                        ? `${cyclone.storm_surge_meters} meters`
                        : "Data unavailable"}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      Evacuated
                    </span>
                    <span className="font-bold text-white mt-0.5 block">
                      {cyclone.evacuated_population !== "Data unavailable"
                        ? Number(cyclone.evacuated_population).toLocaleString()
                        : "Data unavailable"}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Casualties
                    </span>
                    <span className="font-bold text-rose-300 mt-0.5 block">
                      {cyclone.casualties !== "Data unavailable"
                        ? Number(cyclone.casualties).toLocaleString()
                        : "Data unavailable"}
                    </span>
                  </div>
                </div>

                {/* Affected Districts Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {cyclone.affected_districts.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedCyclone(cyclone)}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full Dossier & Lessons</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Comparative Analytical Matrix */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>Comparative Cyclone Parameter Matrix (Official Records)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Direct side-by-side comparison across major historical cyclonic events in Coastal Andhra Pradesh.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Cyclone / Year</th>
                <th className="py-2.5 px-3">Landfall Sector</th>
                <th className="py-2.5 px-3">Peak Wind</th>
                <th className="py-2.5 px-3">Surge Height</th>
                <th className="py-2.5 px-3">Evacuated</th>
                <th className="py-2.5 px-3">Casualties</th>
                <th className="py-2.5 px-3">Key Mitigation Shift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {cyclones.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 text-slate-200">
                  <td className="py-3 px-3 font-bold text-white">
                    {c.cyclone_name.split("(")[0]}
                    <span className="block text-[10px] text-amber-400 font-mono">{c.year}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-[180px] truncate" title={c.landfall_location}>
                    {c.landfall_location}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold">
                    {c.maximum_wind_speed_kmh !== "Data unavailable" ? `${c.maximum_wind_speed_kmh} km/h` : "N/A"}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {c.storm_surge_meters !== "Data unavailable" ? `${c.storm_surge_meters}m` : "N/A"}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                    {c.evacuated_population !== "Data unavailable" ? Number(c.evacuated_population).toLocaleString() : "N/A"}
                  </td>
                  <td className="py-3 px-3 font-mono text-rose-400 font-bold">
                    {c.casualties !== "Data unavailable" ? Number(c.casualties).toLocaleString() : "N/A"}
                  </td>
                  <td className="py-3 px-3 text-slate-300 text-[11px] max-w-[240px]">
                    {c.lessons_learned.split(";")[0].slice(0, 85)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Data Notice */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Strict Official Data Grounding:</strong> All metrics, damage reports, and casualty figures are sourced directly from the India Meteorological Department (IMD) Technical Archives and Andhra Pradesh State Disaster Management Authority (APSDMA). Historical variables that were unrecorded or ambiguous in archival reports are explicitly represented as <em>Data unavailable</em> to prevent manufactured statistics.
        </div>
      </div>

      {/* Detailed Cyclone Modal (Liquid Glass Surface) */}
      {selectedCyclone && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="lg-base lg-surface w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedCyclone.year}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedCyclone.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedCyclone.cyclone_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCyclone(null)}
                className="p-1.5 rounded-full lg-inner-item text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Peak Wind</span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {selectedCyclone.maximum_wind_speed_kmh !== "Data unavailable"
                      ? `${selectedCyclone.maximum_wind_speed_kmh} km/h`
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Storm Surge</span>
                  <div className="text-base font-bold text-sky-400 mt-0.5">
                    {selectedCyclone.storm_surge_meters !== "Data unavailable"
                      ? `${selectedCyclone.storm_surge_meters} meters`
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Evacuated</span>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    {selectedCyclone.evacuated_population !== "Data unavailable"
                      ? Number(selectedCyclone.evacuated_population).toLocaleString()
                      : "Data unavailable"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Casualties</span>
                  <div className="text-base font-bold text-rose-400 mt-0.5">
                    {selectedCyclone.casualties !== "Data unavailable"
                      ? Number(selectedCyclone.casualties).toLocaleString()
                      : "Data unavailable"}
                  </div>
                </div>
              </div>

              {/* Geographical Profile */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Geographical & Landfall Profile</span>
                </h4>
                <p><strong>Landfall Sector:</strong> {selectedCyclone.landfall_location}</p>
                <p><strong>Precipitation:</strong> {selectedCyclone.rainfall_mm}</p>
                <div>
                  <strong>Affected Districts: </strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCyclone.affected_districts.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded bg-slate-700 text-white text-[11px]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sector Damage Breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-400" />
                  <span>Sectoral Impact Analysis</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <strong className="text-amber-400 block mb-1">Infrastructure & Housing</strong>
                    <p className="text-slate-300 leading-relaxed">{selectedCyclone.infrastructure_damage}</p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Houses Damaged: {selectedCyclone.houses_damaged !== "Data unavailable" ? Number(selectedCyclone.houses_damaged).toLocaleString() : "Data unavailable"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <strong className="text-emerald-400 block mb-1">Agriculture & Delta Ecology</strong>
                    <p className="text-slate-300 leading-relaxed">{selectedCyclone.agricultural_damage}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <strong className="text-sky-400 block mb-1">Fisheries & Coastal Communities</strong>
                    <p className="text-slate-300 leading-relaxed">{selectedCyclone.fisheries_impact}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <strong className="text-yellow-400 block mb-1">Power & Telecommunications</strong>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedCyclone.power_disruption} • {selectedCyclone.communication_disruption}
                    </p>
                  </div>
                </div>
              </div>

              {/* Governance & Lessons Learned */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Government Response & Long-Term Institutional Lessons</span>
                </h4>
                <p><strong className="text-white">Relief Action:</strong> {selectedCyclone.government_response}</p>
                <p><strong className="text-white">Institutional Shift:</strong> {selectedCyclone.lessons_learned}</p>
              </div>

              {/* Official Source Provenance */}
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400">Source: </span>
                  <span className="font-semibold text-white">{selectedCyclone.source_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Verified: {selectedCyclone.last_verified_at}</span>
                  <a
                    href={selectedCyclone.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedCyclone(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
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
