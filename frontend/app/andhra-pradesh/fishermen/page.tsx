"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Anchor,
  Radio,
  AlertTriangle,
  ShieldCheck,
  PhoneCall,
  CheckSquare,
  Square,
  Waves,
  Navigation,
  Compass,
  Ship,
  Info,
  ExternalLink,
  MapPin,
  Clock,
} from "lucide-react";
import { translations, type Language } from "@/lib/locales/translations";

interface SafeHarbour {
  id: string;
  name: string;
  district: string;
  coordinates: string;
  shelter_type: string;
  capacity_crafts: number;
  contact_officer: string;
  phone: string;
  key_feature: string;
}

const AP_SAFE_HARBOURS: SafeHarbour[] = [
  {
    id: "HARBOUR-VSP",
    name: "Visakhapatnam Fishing Harbour",
    district: "Visakhapatnam",
    coordinates: "17.6975° N, 83.2986° E",
    shelter_type: "Deep Basin Inner Harbour",
    capacity_crafts: 750,
    contact_officer: "Port Assistant Director (Fisheries)",
    phone: "0891-2565150",
    key_feature: "Sheltered inner channel with massive outer breakwaters; high protection from wave action.",
  },
  {
    id: "HARBOUR-KKD",
    name: "Kakinada Anchorage & Deep Water Harbour",
    district: "Kakinada",
    coordinates: "16.9891° N, 82.2674° E",
    shelter_type: "Natural Bay (Hope Island Shield)",
    capacity_crafts: 1200,
    contact_officer: "Joint Director of Fisheries, Kakinada",
    phone: "0884-2362489",
    key_feature: "Naturally protected by the 16km sand spit of Hope Island against direct easterly cyclone surges.",
  },
  {
    id: "HARBOUR-NZP",
    name: "Nizampatnam Fishing Harbour",
    district: "Bapatla",
    coordinates: "15.9082° N, 80.6698° E",
    shelter_type: "Estuarine Tidal Creek Anchorage",
    capacity_crafts: 450,
    contact_officer: "Fisheries Development Officer, Nizampatnam",
    phone: "08648-257224",
    key_feature: "Inland tidal channel suitable for mechanized trawlers escaping open sea waves.",
  },
  {
    id: "HARBOUR-MCP",
    name: "Machilipatnam (Gilakaladindi) Anchorage",
    district: "Krishna",
    coordinates: "16.1845° N, 81.1610° E",
    shelter_type: "River Mouth Creek Basin",
    capacity_crafts: 350,
    contact_officer: "Assistant Director of Fisheries, Machilipatnam",
    phone: "08672-252431",
    key_feature: "Designated inland mooring berths for gillnetters and country craft.",
  },
  {
    id: "HARBOUR-KPT",
    name: "Krishnapatnam Port Mooring Basin",
    district: "SPS Nellore",
    coordinates: "14.2541° N, 80.1256° E",
    shelter_type: "Deep Draft Estuarine Basin",
    capacity_crafts: 300,
    contact_officer: "Coastal Security Sub-Inspector / Port Officer",
    phone: "0861-2374100",
    key_feature: "Kandaleru river creek mouth offering deep anchorage with maritime police post.",
  },
  {
    id: "HARBOUR-BVP",
    name: "Bhavanapadu Fishing Harbour",
    district: "Srikakulam",
    coordinates: "18.5684° N, 84.3491° E",
    shelter_type: "Coastal Lagoon Inlet",
    capacity_crafts: 250,
    contact_officer: "Fisheries Inspector, Santhabommali",
    phone: "08942-278210",
    key_feature: "Northern coastal refuge providing shelter for motorized country craft.",
  },
];

export default function FishermenSafetyPage() {
  const [lang, setLang] = useState<Language>("en");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    life_jackets: true,
    vhf_radio: true,
    navic_gps: false,
    flares_smoke: false,
    water_rations: true,
    spare_battery: true,
    anchor_ropes: false,
    first_aid: true,
  });

  useEffect(() => {
    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);
    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  const t = translations[lang];

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    {
      id: "life_jackets",
      label: "BIS/SOLAS Certified Life Jackets",
      desc: "One life jacket per crew member, equipped with whistle and retro-reflective tape.",
    },
    {
      id: "vhf_radio",
      label: "Marine VHF Radio Set (Channel 16 Active)",
      desc: "VHF transceivers tuned to international calling & distress frequency 156.800 MHz.",
    },
    {
      id: "navic_gps",
      label: "NavIC / GPS Maritime Receiver",
      desc: "Satellite-based emergency messaging and positioning unit with IMD cyclone broadcast sync.",
    },
    {
      id: "flares_smoke",
      label: "Distress Pyrotechnics & Waterproof Strobe",
      desc: "Red parachute flares and orange smoke canisters stored in waterproof dry canister.",
    },
    {
      id: "water_rations",
      label: "72-Hour Potable Water & Emergency Food",
      desc: "Minimum 3 liters drinking water per person per day in sealed high-buoyancy containers.",
    },
    {
      id: "spare_battery",
      label: "Auxiliary Heavy-Duty Marine Battery",
      desc: "Separate battery reserve dedicated solely for communication and navigation lights.",
    },
    {
      id: "anchor_ropes",
      label: "Double Heavy Mooring Lines & Storm Anchor",
      desc: "Nylon braided anchor rode of minimum 3x depth for safe harbor storm tie-downs.",
    },
    {
      id: "first_aid",
      label: "Waterproof Marine First-Aid & Burn Kit",
      desc: "Bandages, tourniquet, antiseptic, ORS sachets, and seasickness medications.",
    },
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/andhra-pradesh"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Andhra Pradesh Overview</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t.fishermenTitle}
              </h1>
              <p className="text-xs text-slate-400">
                AP Coastal Security • IMD 4-Stage Protocols • Safe Mooring Directory
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Call Buttons */}
        <div className="flex flex-wrap gap-2">
          <a
            href="tel:1093"
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Marine Police: 1093</span>
          </a>
          <a
            href="tel:1554"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Coast Guard: 1554</span>
          </a>
        </div>
      </div>

      {/* Advisory Status vs Educational Guidance Notice */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-bold">Official Protocol Status</strong>
            This module combines statutory India Meteorological Department (IMD) warning stage standards with operational fisheries advisories. In an active event, mandatory sea-prohibition orders issued by District Collectors supersede routine guidance.
          </div>
        </div>
        <span className="px-3 py-1 rounded-lg bg-amber-900/60 border border-amber-700 text-amber-300 font-mono text-[11px] whitespace-nowrap self-start sm:self-auto">
          INCOIS Sea State Synced
        </span>
      </div>

      {/* IMD 4-Stage Cyclone Warning System */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>IMD 4-Stage Marine Cyclone Warning Mechanism</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Statutory color-coded alerts governing commercial, mechanized, and artisanal fishing movements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Stage 1 */}
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400">Stage 1</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-200">
                  72h Advance
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-2">Pre-Cyclone Watch</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Issued when a depression forms in Bay of Bengal with cyclogenesis potential towards Andhra coast.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-sky-300 font-semibold">
              Action: No deep-sea ventures. Vessels beyond 50 nautical miles advised to initiate return.
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-amber-400">Stage 2 • Yellow</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  48h Advance
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-300 mt-2">Cyclone Alert</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Specific coastal district belt identified. Expected landfall time, wind gusts, and tidal rise projected.
              </p>
            </div>
            <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-300 font-semibold">
              Action: Immediate fishing ban. All artisanal crafts and trawlers must dock at designated safe harbours.
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-500/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-orange-400">Stage 3 • Orange</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300">
                  24h Advance
                </span>
              </div>
              <h3 className="text-sm font-bold text-orange-300 mt-2">Cyclone Warning</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Gale winds and storm surge warning. Bulletins broadcast at 3-hour intervals over AIR and NavIC.
              </p>
            </div>
            <div className="pt-2 border-t border-orange-500/20 text-[11px] text-orange-300 font-semibold">
              Action: Complete harbour lockdown. Boats winched to high ground. Crew evacuated from harbour basins.
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-rose-400">Stage 4 • Red</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                  12h Advance
                </span>
              </div>
              <h3 className="text-sm font-bold text-rose-300 mt-2">Post-Landfall Outlook</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Actual landfall execution and inland track progression. Severe rainfall and inland river flood alert.
              </p>
            </div>
            <div className="pt-2 border-t border-rose-500/20 text-[11px] text-rose-300 font-semibold">
              Action: Stay inside storm shelters. Zero outdoor movement. Beware of the calm "eye" lull.
            </div>
          </div>
        </div>
      </div>

      {/* Safe Harbours & Anchorages Directory */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Anchor className="w-4 h-4 text-sky-400" />
            <span>Designated Safe Harbours & Cyclone Anchorages in Andhra Pradesh</span>
          </h2>
          <p className="text-xs text-slate-400">
            Certified maritime refuges with breakwater or natural inlet protection for mechanized vessels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AP_SAFE_HARBOURS.map((h) => (
            <div
              key={h.id}
              className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-sky-500/40 transition space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {h.district}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Cap: ~{h.capacity_crafts} boats
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                  {h.name}
                </h3>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Navigation className="w-3 h-3 text-sky-400" />
                  <span>{h.coordinates}</span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {h.key_feature}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Harbour Control</div>
                  <a
                    href={`tel:${h.phone}`}
                    className="font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-0.5"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>{h.phone}</span>
                  </a>
                </div>
                <span className="text-[10px] text-slate-400 text-right max-w-[120px] truncate">
                  {h.shelter_type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Vessel Emergency Kit Checklist */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Marine Vessel Emergency Safety Checklist</span>
            </h2>
            <p className="text-xs text-slate-400">
              Mandatory pre-departure and emergency preparation items for fishing craft crews.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono">
            Readiness Score: <strong className="text-emerald-400">{completedCount} / {checklistItems.length} verified</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklistItems.map((item) => {
            const isChecked = !!checklist[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 select-none ${
                  isChecked
                    ? "bg-emerald-950/20 border-emerald-500/40 text-slate-200"
                    : "bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="mt-0.5">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className={`text-xs font-bold ${isChecked ? "text-white" : "text-slate-300"}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Immediate Emergency Action Summary */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Critical Survival Rule at Sea:</strong> If caught in gale winds before reaching safe harbour, steer perpendicular to the approaching cyclone track toward the navigable semi-circle (left of storm track in Bay of Bengal). Drop sea anchors (drogues) to prevent capsize, ensure life jackets are donned with safety tethers attached to the deck, and broadcast distress coordinates over VHF Channel 16.
        </div>
      </div>
    </div>
  );
}
