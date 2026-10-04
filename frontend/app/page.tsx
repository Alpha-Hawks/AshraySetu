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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Header Box (Apple Liquid Glass Surface) */}
      <div className="liquid-glass-card liquid-glass-custom-card p-6 sm:p-8 !rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/80">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>Bay of Bengal Cyclone Advisory Active</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight outline-none">
              {t.appTitle}
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl font-normal leading-relaxed">
              Offline-First Disaster Management & Evacuation Platform for Gram
              Panchayat committees in Kendrapara District, Odisha. Operates
              without cellular data or electrical grid power.
            </p>
          </div>

          {/* Evaluator Demo Seed Action (Apple System Blue Pill) */}
          <button
            onClick={seedDemoData}
            className="px-5 py-3 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] rounded-full shadow-[0_2px_10px_rgba(0,122,255,0.3)] transition active:scale-95 flex items-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Load Evaluator Demo Seed</span>
          </button>
        </div>

        {seedStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{seedStatus}</span>
          </div>
        )}
      </div>

      {/* KPI Stats Strip (Apple Liquid Glass Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="liquid-glass-card liquid-glass-custom-card p-4 !min-h-0 space-y-1">
          <div className="text-xs text-slate-500 font-medium">
            Active Coastal Shelters
          </div>
          <div className="text-2xl font-black text-[#007AFF]">
            {shelters.length}
          </div>
          <div className="text-[11px] text-slate-400">
            Rajnagar & Mahakalapada
          </div>
        </div>

        <div className="liquid-glass-card liquid-glass-custom-card p-4 !min-h-0 space-y-1">
          <div className="text-xs text-slate-500 font-medium">
            Registered Households
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {householdCount}
          </div>
          <div className="text-[11px] text-slate-400">
            Stored in Local IndexedDB
          </div>
        </div>

        <div className="liquid-glass-card liquid-glass-custom-card p-4 !min-h-0 space-y-1">
          <div className="text-xs text-slate-500 font-medium">
            Critical Triage Cases
          </div>
          <div className="text-2xl font-black text-rose-600">
            {triageCount}
          </div>
          <div className="text-[11px] text-slate-400">
            P1 Medical / Vulnerable
          </div>
        </div>

        <div className="liquid-glass-card liquid-glass-custom-card p-4 !min-h-0 space-y-1">
          <div className="text-xs text-slate-500 font-medium">
            Offline Storage Engine
          </div>
          <div className="text-2xl font-black text-amber-600">100%</div>
          <div className="text-[11px] text-slate-400">
            Dexie.js Transactional
          </div>
        </div>
      </div>

      {/* Role Navigation Cards (Apple Liquid Glass Customized Material) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/intake"
          className="liquid-glass-card liquid-glass-custom-card group p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-[#007AFF] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-sky-500/20 backdrop-blur-xs">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#007AFF] transition-colors">
              M2: Household Intake & Triage
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Register arriving families, record infant/elderly headcounts, and
              tag clinical triage priorities (pregnant, bedridden, disabled)
              offline.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-[#007AFF] font-semibold">
            <span>Open Intake Form →</span>
            <span className="text-[10px] text-slate-400 font-mono">
              IndexedDB Native
            </span>
          </div>
        </Link>

        <Link
          href="/inventory"
          className="liquid-glass-card liquid-glass-custom-card group p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-amber-500/20 backdrop-blur-xs">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              M4: Shelter Inventory & Burn-Rate
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Track drinking water, food packets, baby milk, and ORS. Automated
              Sphere-standard depletion calculations alert before stockouts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-amber-600 font-semibold">
            <span>View Stock Ledger →</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Sphere Standard
            </span>
          </div>
        </Link>

        <Link
          href="/scan"
          className="liquid-glass-card liquid-glass-custom-card group p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-emerald-500/20 backdrop-blur-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              M3: QR Pass & Check-In
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Gatekeeper camera scanner to verify offline digital passes,
              confirm family headcounts, and prevent duplicate relief
              entitlements.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-emerald-600 font-semibold">
            <span>Scan QR Token →</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Offline Camera
            </span>
          </div>
        </Link>

        <Link
          href="/map"
          className="liquid-glass-card liquid-glass-custom-card group p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-indigo-500/20 backdrop-blur-xs">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              M6: Spatial Map & Inundation
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Interactive Leaflet map showing Kendrapara coastal shelters,
              geodesic distances, and simulated storm-surge coastal buffers via
              Turf.js.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Open Spatial Map →</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Turf.js GIS
            </span>
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="liquid-glass-card liquid-glass-custom-card group p-5 sm:p-6 flex flex-col justify-between sm:col-span-2"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-rose-500/20 backdrop-blur-xs">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              M7 & M8: District Emergency Command Desk (DEOC)
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Administrative view for the Block Development Officer (BDO) and
              Tahsildar. Aggregates live capacity saturation, triaged medical
              cases, and sends automated Telegram emergency alerts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-rose-600 font-semibold">
            <span>View Command Desk →</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Telegram Webhook
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
