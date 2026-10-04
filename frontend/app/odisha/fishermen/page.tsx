"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Anchor,
  AlertTriangle,
  ShieldCheck,
  PhoneCall,
  CheckSquare,
  Square,
  MapPin,
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

const ODISHA_SAFE_HARBOURS: SafeHarbour[] = [
  {
    id: "HARBOUR-PDP",
    name: "Paradip Fishing Harbour & Basin",
    district: "Jagatsinghpur",
    coordinates: "20.2644° N, 86.6685° E",
    shelter_type: "Deep Basin Inner Harbour with Marine Breakwaters",
    capacity_crafts: 1200,
    contact_officer: "Deputy Director of Fisheries (Marine), Paradip",
    phone: "06722-222045 / 1093",
    key_feature: "Heavy concrete breakwaters shield against direct Bay of Bengal storm surges; heavy slipways and diesel supply jetty.",
  },
  {
    id: "HARBOUR-DHM",
    name: "Dhamra Fishing Harbour & Estuary",
    district: "Bhadrak",
    coordinates: "20.8033° N, 86.9602° E",
    shelter_type: "Protected River Estuary (Dhamra & Baitarani Mouth)",
    capacity_crafts: 900,
    contact_officer: "Assistant Director of Fisheries, Chandbali / Dhamra",
    phone: "06786-220033 / 1093",
    key_feature: "Estuarine mangrove buffer dampens tidal surges; designated cyclone mooring canal for mechanized trawlers.",
  },
  {
    id: "HARBOUR-AST",
    name: "Astrang / Nuagarh Fishing Harbour",
    district: "Puri",
    coordinates: "19.9822° N, 86.2691° E",
    shelter_type: "Devi River Estuarine Sheltered Bay",
    capacity_crafts: 650,
    contact_officer: "Fisheries Extension Officer, Astrang",
    phone: "06754-256012 / 1093",
    key_feature: "Inner natural creek shelter providing calm mooring for mechanized gill-netters and fiber-reinforced boats.",
  },
  {
    id: "HARBOUR-GPL",
    name: "Gopalpur Port Basin & Haripur Fishing Harbour",
    district: "Ganjam",
    coordinates: "19.3086° N, 84.9667° E",
    shelter_type: "Engineered Deepwater Coastal Basin",
    capacity_crafts: 500,
    contact_officer: "Joint Director of Fisheries (Southern Zone), Berhampur",
    phone: "0680-2228304 / 1093",
    key_feature: "Strategic southern Odisha harbour serving Gopalpur, Boxipalli, and Markandi fishing communities with reinforced anchor pylons.",
  },
  {
    id: "HARBOUR-BLR",
    name: "Balaramgadi / Bahabalpur Marine Landing Complex",
    district: "Balasore",
    coordinates: "21.4682° N, 87.0389° E",
    shelter_type: "Burhabalanga River Estuarine Anchorage",
    capacity_crafts: 450,
    contact_officer: "District Fisheries Officer, Balasore",
    phone: "06782-262104 / 1093",
    key_feature: "Protected upriver navigation channel safe from open-sea breaking waves; concrete haulage ramps.",
  },
  {
    id: "HARBOUR-CHB",
    name: "Chandrabhaga Marine Fish Landing Center",
    district: "Puri",
    coordinates: "19.8631° N, 86.1158° E",
    shelter_type: "Elevated Beach Mooring & Mechanical Winch Slipways",
    capacity_crafts: 350,
    contact_officer: "Marine Fisheries Officer, Konark / Puri",
    phone: "06752-222137 / 1093",
    key_feature: "Mechanized beach winches enable quick landward haulage of motorized crafts beyond high-water spring-tide lines.",
  },
];

export default function OdishaFishermenSafetyPage() {
  const [lang, setLang] = useState<Language>("en");
  const [selectedHarbour, setSelectedHarbour] = useState<SafeHarbour>(ODISHA_SAFE_HARBOURS[0]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    life_jackets: true,
    vhf_radio: true,
    gps_navigator: true,
    distress_flares: false,
    first_aid_kit: true,
    fresh_water: true,
    incois_app: true,
    battery_backup: false,
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

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalItems = Object.keys(checklist).length;
  const readinessPct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/odisha"
            className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Odisha Hub Overview</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t.odishaFishermenTitle}
              </h1>
              <p className="text-xs text-slate-400">
                OSDMA • Directorate of Fisheries Odisha • Indian Coast Guard Protocols
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-teal-300 font-mono">
            Marine Police: <strong className="text-white">1093 (Toll Free)</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-sky-300 font-mono">
            Coast Guard SAR: <strong className="text-white">1554</strong>
          </span>
        </div>
      </div>

      {/* Immediate Port & Sea Warning Signal Table */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-sky-950 border border-teal-600/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
              Official IMD / INCOIS Port Warning System
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Standard Bay of Bengal Storm Warning Signals for Odisha Ports
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
            Mandatory Compliance at Paradip & Dhamra
          </span>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-300">Local Cautionary (LC-III)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            </div>
            <p className="text-slate-300 text-[11px]">
              Port threatened by squally weather. Sea condition rough. Small crafts advised not to venture into deep sea.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">Local Warning (LW-IV)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <p className="text-slate-300 text-[11px]">
              Port threatened, but not immediately in severe danger. Trawlers must remain within sheltered anchorages.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400">Danger (D-VII)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-slate-300 text-[11px]">
              Severe cyclonic storm expected to cross coast near port. All fishing crafts must be hauled to shore immediately.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-500">Great Danger (GD-X)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            </div>
            <p className="text-slate-300 text-[11px]">
              Super cyclonic storm crossing port. Gale winds exceeding 120-220 km/h. Complete marine evacuation enforced.
            </p>
          </div>
        </div>
      </div>

      {/* Main Section: Safe Harbours Directory + Boat Safety Checklist */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Safe Harbours Directory (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Anchor className="w-4 h-4 text-teal-400" />
                <span>Odisha Certified Cyclone Safe Harbours & Estuaries</span>
              </h2>
              <p className="text-xs text-slate-400">
                Designated deep-water basins and river mouths equipped with pylon moorings
              </p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-950 px-2.5 py-1 rounded-xl border border-teal-600/40">
              6 Certified Basins
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {ODISHA_SAFE_HARBOURS.map((harbour) => (
              <div
                key={harbour.id}
                onClick={() => setSelectedHarbour(harbour)}
                className={`p-4 rounded-2xl border cursor-pointer transition shadow-md flex flex-col justify-between space-y-3 ${
                  selectedHarbour.id === harbour.id
                    ? "bg-slate-850 border-teal-500 ring-1 ring-teal-500/50"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {harbour.name}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{harbour.district} District</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {harbour.capacity_crafts} Crafts
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-2 line-clamp-2">
                    {harbour.key_feature}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
                  <span className="font-mono text-[10px]">{harbour.coordinates}</span>
                  <span className="text-teal-400 font-semibold">{harbour.phone.split(" / ")[0]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Selected Harbour Spotlight */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-teal-600/40 space-y-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">
                  Active Harbour Inspection Dossier
                </span>
                <h3 className="text-lg font-black text-white">
                  {selectedHarbour.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Type: {selectedHarbour.shelter_type}
                </p>
              </div>

              <a
                href={`tel:${selectedHarbour.phone.replace(/[^0-9]/g, "")}`}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/30"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Harbour Control</span>
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <div className="text-slate-500 text-[10px]">Coordinates</div>
                <div className="font-mono font-bold text-slate-200 mt-0.5">{selectedHarbour.coordinates}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Harbour Berth Capacity</div>
                <div className="font-bold text-teal-400 mt-0.5">{selectedHarbour.capacity_crafts} Motorized / Mechanized Crafts</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-slate-500 text-[10px]">Nodal Officer</div>
                <div className="font-semibold text-slate-200 mt-0.5">{selectedHarbour.contact_officer}</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Operational Protection Profile:</strong> {selectedHarbour.key_feature}
            </p>
          </div>
        </div>

        {/* Mandatory Pre-Voyage Sea Safety Checklist (1 Col) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mandatory Marine Safety Audit</span>
            </h2>
            <p className="text-xs text-slate-400">
              Regulatory compliance required under OSDMA & Merchant Shipping Act
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
            {/* Readiness Gauge */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-white">Vessel Readiness Rating</span>
                <span className={`font-mono font-bold ${readinessPct >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                  {readinessPct}% Complete
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    readinessPct >= 80 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${readinessPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {readinessPct === 100
                  ? "✓ All statutory life-saving appliances verified."
                  : "⚠ Complete remaining safety checks before departing harbour."}
              </p>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 text-xs">
              {[
                { key: "life_jackets", label: "Approved Life Jackets (1 per crew member)" },
                { key: "vhf_radio", label: "Marine VHF Radio (Channel 16 Active)" },
                { key: "gps_navigator", label: "GPS / NavIC Navigation Receiver" },
                { key: "distress_flares", label: "Parachute Distress Rocket Flares (Min 4)" },
                { key: "fresh_water", label: "72-Hour Potable Water in Sealed Cans" },
                { key: "first_aid_kit", label: "Waterproof First Aid Kit with Antiseptics" },
                { key: "incois_app", label: "INCOIS SAMUDRA / GEMINI Receiver Synced" },
                { key: "battery_backup", label: "Auxiliary Sealed Battery Backup for Radio" },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => toggleCheck(key)}
                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                    checklist[key]
                      ? "bg-slate-950/70 border-emerald-600/40 text-slate-200"
                      : "bg-slate-950/30 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {checklist[key] ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium">{label}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/30 text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Under OSDMA Section 34 directives, venture into sea during Red/Orange alerts is strictly forbidden and punishable by vessel impoundment.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
