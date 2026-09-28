"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  QrCode,
  MapPin,
  LayoutDashboard,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { syncManager } from "@/lib/sync/syncManager";

export default function HomePage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [householdCount, setHouseholdCount] = useState(0);
  const [triageCount, setTriageCount] = useState(0);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      await initializeDatabase();
      const s = await db.shelters.toArray();
      setShelters(s);
      const hCount = await db.households.count();
      const tCount = await db.triage.count();
      setHouseholdCount(hCount);
      setTriageCount(tCount);
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

  // Quick Seed for Hackathon Demonstration
  const seedDemoData = async () => {
    setSeedStatus("Generating 3 simulated household intakes...");
    const sampleShelterId = "OD-KEN-RAJ-001"; // Batighar

    const mockFamilies = [
      {
        id: crypto.randomUUID(),
        shelter_id: sampleShelterId,
        head_name: "Pravat Kumar Nayak",
        hamlet_name: "Talachua",
        ward_number: 4,
        total_members: 5,
        male_count: 2,
        female_count: 2,
        child_under_five_count: 1,
        elderly_above_sixty_count: 0,
        livestock_count: 2,
        registered_at: Date.now() - 3600000,
        sync_status: "PENDING_SYNC" as const,
        triage: {
          category: "PREGNANT" as const,
          level: "P1_CRITICAL" as const,
          name: "Sasmita Nayak",
          notes: "3rd Trimester pregnancy, medical review required",
        },
      },
      {
        id: crypto.randomUUID(),
        shelter_id: sampleShelterId,
        head_name: "Bishnu Charan Das",
        hamlet_name: "Batighar Para",
        ward_number: 2,
        total_members: 6,
        male_count: 2,
        female_count: 3,
        child_under_five_count: 0,
        elderly_above_sixty_count: 1,
        livestock_count: 4,
        registered_at: Date.now() - 1800000,
        sync_status: "PENDING_SYNC" as const,
        triage: {
          category: "ELDERLY_BEDRIDDEN" as const,
          level: "P1_CRITICAL" as const,
          name: "Padma Charan Das (Age 74)",
          notes: "Chronic respiratory distress, requires mobility assistance",
        },
      },
    ];

    for (const fam of mockFamilies) {
      await db.households.add({
        id: fam.id,
        shelter_id: fam.shelter_id,
        head_name: fam.head_name,
        hamlet_name: fam.hamlet_name,
        ward_number: fam.ward_number,
        total_members: fam.total_members,
        male_count: fam.male_count,
        female_count: fam.female_count,
        child_under_five_count: fam.child_under_five_count,
        elderly_above_sixty_count: fam.elderly_above_sixty_count,
        livestock_count: fam.livestock_count,
        registered_at: fam.registered_at,
        sync_status: fam.sync_status,
      });

      await db.triage.add({
        id: crypto.randomUUID(),
        household_id: fam.id,
        shelter_id: fam.shelter_id,
        person_name: fam.triage.name,
        vulnerability_category: fam.triage.category,
        triage_level: fam.triage.level,
        notes: fam.triage.notes,
        created_at: Date.now(),
      });

      await syncManager.enqueueMutation(
        "households",
        fam.id,
        "INSERT",
        fam
      );
    }

    const hCount = await db.households.count();
    const tCount = await db.triage.count();
    setHouseholdCount(hCount);
    setTriageCount(tCount);
    setSeedStatus("Demo households generated & queued in offline IndexedDB!");
    setTimeout(() => setSeedStatus(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Alert Header Box */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border border-sky-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              Bay of Bengal Cyclone Advisory Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Offline-First Disaster Management & Evacuation Platform for Gram
              Panchayat committees in Kendrapara District, Odisha. Operates
              without cellular data or electrical grid power.
            </p>
          </div>

          <button
            onClick={seedDemoData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-lg shadow-sky-600/30 whitespace-nowrap self-start sm:self-auto"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Load Evaluator Demo Seed</span>
          </button>
        </div>

        {seedStatus && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{seedStatus}</span>
          </div>
        )}
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            Active Coastal Shelters
          </div>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {shelters.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Rajnagar & Mahakalapada
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            Registered Households
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {householdCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Stored in Local IndexedDB
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            Critical Triage Cases
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {triageCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            P1 Medical / Vulnerable
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">
            Offline Storage Engine
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">100%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Dexie.js Transactional
          </div>
        </div>
      </div>

      {/* Role Navigation Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/intake"
          className="group p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 transition-all shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
              M2: Household Intake & Triage
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Register arriving families, record infant/elderly headcounts, and
              tag clinical triage priorities (pregnant, bedridden, disabled)
              offline.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-sky-400 font-semibold">
            <span>Open Intake Form →</span>
            <span className="text-[10px] text-slate-500 font-mono">
              IndexedDB Native
            </span>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="group p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 transition-all shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
              M4: Shelter Inventory & Burn-Rate
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Track drinking water, food packets, baby milk, and ORS. Automated
              Sphere-standard depletion calculations alert before stockouts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>View Stock Ledger →</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Sphere Standard
            </span>
          </div>
        </Link>

        <Link
          href="/scan"
          className="group p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
              M3: QR Pass & Check-In
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Gatekeeper camera scanner to verify offline digital passes,
              confirm family headcounts, and prevent duplicate relief
              entitlements.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Scan QR Token →</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Offline Camera
            </span>
          </div>
        </Link>

        <Link
          href="/map"
          className="group p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              M6: Spatial Map & Inundation
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Interactive Leaflet map showing Kendrapara coastal shelters,
              geodesic distances, and simulated storm-surge coastal buffers via
              Turf.js.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-semibold">
            <span>Open Spatial Map →</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Turf.js GIS
            </span>
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="group p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 transition-all shadow-md flex flex-col justify-between sm:col-span-2"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
              M7 & M8: District Emergency Command Desk (DEOC)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Administrative view for the Block Development Officer (BDO) and
              Tahsildar. Aggregates live capacity saturation, triaged medical
              cases, and sends automated Telegram emergency alerts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-rose-400 font-semibold">
            <span>View Command Desk →</span>
            <span className="text-[10px] text-slate-500 font-mono">
              Telegram Webhook
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
