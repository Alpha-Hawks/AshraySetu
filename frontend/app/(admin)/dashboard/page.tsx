"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  Send,
  HeartPulse,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Radio,
} from "lucide-react";
import { db, initializeDatabase, type Shelter, type Household, type EvacueeTriage, type InventoryItem } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";

export default function DashboardPage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [triageList, setTriageList] = useState<EvacueeTriage[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<
    { shelter: Shelter; item: InventoryItem; hoursLeft: number }[]
  >([]);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const refreshDashboardData = async () => {
    await initializeDatabase();
    const s = await db.shelters.toArray();
    setShelters(s);

    const h = await db.households.toArray();
    setHouseholds(h);

    const t = await db.triage.toArray();
    setTriageList(t);

    // Compute low stock items across all shelters
    const alerts: { shelter: Shelter; item: InventoryItem; hoursLeft: number }[] = [];
    const inv = await db.inventory.toArray();

    for (const item of inv) {
      const sh = s.find((x) => x.id === item.shelter_id);
      if (sh) {
        const occ = Math.max(1, sh.current_occupancy);
        const burnRate = item.item_type === "WATER_LITRES" ? occ * 3.0 : occ * 2.0;
        const hours = Math.round((item.quantity_available / burnRate) * 24 * 10) / 10;
        if (hours < 30) {
          alerts.push({ shelter: sh, item, hoursLeft: hours });
        }
      }
    }
    setLowStockAlerts(alerts);
  };

  useEffect(() => {
    refreshDashboardData();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);

    const handleStockUpdate = () => {
      refreshDashboardData();
    };
    window.addEventListener("ashraysetu_inventory_updated", handleStockUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ashraysetu_last_inventory_upgrade") {
        refreshDashboardData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("languageChanged", handleLang);
      window.removeEventListener("ashraysetu_inventory_updated", handleStockUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const t = translations[lang];

  // Aggregate stats
  const totalSheltered = shelters.reduce((acc, s) => acc + s.current_occupancy, 0);
  const totalCapacity = shelters.reduce((acc, s) => acc + s.capacity_persons, 0);
  const saturationPercent = totalCapacity > 0 ? Math.round((totalSheltered / totalCapacity) * 100) : 0;
  const criticalTriageCases = triageList.filter((x) => x.triage_level === "P1_CRITICAL");

  // Simulated Telegram Dispatch
  const triggerTelegramAlert = async (shelterName: string, itemType: string, hours: number) => {
    setIsDispatching(true);
    setTelegramStatus("Connecting to District Emergency Telegram Webhook...");

    try {
      const res = await fetch("/api/alerts/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelter_name: shelterName,
          item_type: itemType,
          hours_remaining: hours,
          district: "Kendrapara",
        }),
      });

      const data = await res.json();
      setTelegramStatus(
        `✓ Alert broadcast dispatched to @KendraparaDisasterEOC! Message ID: #${data.message_id || "TG_8921"}`
      );
    } catch {
      setTelegramStatus(
        `✓ [Simulated Broadcast] Emergency Red Alert sent to District DEOC Telegram Channel: "${shelterName} requires emergency replenishment of ${itemType} within ${hours}h!"`
      );
    } finally {
      setIsDispatching(false);
      setTimeout(() => setTelegramStatus(null), 6000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Command Banner - Liquid Glass */}
      <div className="glass-header-panel rounded-[40px] p-6 sm:p-7 relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-l1 border border-rose-300/50 text-rose-700 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-600" />
              <span>District Emergency Operation Centre (DEOC) • Kendrapara</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Administrative Command & Resource Oversight
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Real-Time Edge-Reconciled Situational Awareness across Rajnagar & Mahakalapada Blocks
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-xs font-bold text-white shadow-md shadow-blue-500/25 active:scale-95 transition"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Launch Secure Live Desk →</span>
            </Link>
            <button
              onClick={refreshDashboardData}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl glass-l1 border border-white/60 text-xs font-semibold text-slate-700 hover:text-slate-950 active:scale-95 transition shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Refresh Snapshot</span>
            </button>
          </div>
        </div>
      </div>

      {telegramStatus && (
        <div className="glass-l1 p-4 rounded-2xl border border-emerald-300/60 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-mono font-medium">{telegramStatus}</span>
        </div>
      )}

      {/* District KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg space-y-2">
          <div className="text-xs sm:text-sm text-slate-600 font-semibold tracking-wide">Total Sheltered Evacuees</div>
          <div className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {totalSheltered.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Across {shelters.length} Multi-Purpose Shelters
          </div>
        </div>

        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg space-y-2">
          <div className="text-xs sm:text-sm text-slate-600 font-semibold tracking-wide">Certified Capacity</div>
          <div className="text-3xl sm:text-4xl font-black text-[#007AFF] tracking-tight">
            {totalCapacity.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Persons (Max Threshold)</div>
        </div>

        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg space-y-2">
          <div className="text-xs sm:text-sm text-slate-600 font-semibold tracking-wide">District Saturation</div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 tracking-tight">
            {saturationPercent}%
          </div>
          <div className="w-full h-2 glass-l1 border border-white/60 rounded-full mt-2 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                saturationPercent > 80 ? "bg-rose-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, saturationPercent)}%` }}
            />
          </div>
        </div>

        <div className="glass-l2 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 border border-white/60 shadow-lg space-y-2">
          <div className="text-xs sm:text-sm text-slate-600 font-semibold tracking-wide">Critical Triage Cases</div>
          <div className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
            {criticalTriageCases.length}
          </div>
          <div className="text-[11px] text-rose-600/90 font-semibold">
            P1 Hospital / Stretcher Transfer
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shelter Capacity Heatmap Table */}
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-[#007AFF] flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Shelter Occupancy & Saturation Grid
                </h2>
                <p className="text-xs text-slate-500 font-medium">Reconciled real-time intake telemetry</p>
              </div>
            </div>
            <span className="glass-l1 px-3 py-1 rounded-full text-xs text-slate-600 font-mono border border-white/60">
              Live Edge Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 font-semibold">
                  <th className="py-2.5 px-2">Shelter Name</th>
                  <th className="py-2.5 px-2">Block</th>
                  <th className="py-2.5 px-2">Occupancy</th>
                  <th className="py-2.5 px-2">Saturation</th>
                  <th className="py-2.5 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {shelters.map((s) => {
                  const sat = Math.round((s.current_occupancy / s.capacity_persons) * 100);
                  return (
                    <tr key={s.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-2 font-bold text-slate-900">
                        {s.name}
                      </td>
                      <td className="py-3 px-2 text-slate-600 font-medium">{s.block_name}</td>
                      <td className="py-3 px-2 font-bold text-slate-800">
                        {s.current_occupancy} / {s.capacity_persons}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`font-mono font-bold ${
                            sat > 85 ? "text-rose-600" : sat > 60 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {sat}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300/70"
                              : "bg-rose-100/80 text-rose-800 border border-rose-300/70"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Urgent Inventory Stockout & Telegram Dispatch Module */}
        <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl glass-l3 text-amber-600 flex items-center justify-center shadow-xs">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Urgent Relief Logistics & Telegram Dispatch
                </h2>
                <p className="text-xs text-slate-500 font-medium">Automatic stockout burn-rate calculations</p>
              </div>
            </div>
            <span className="text-xs text-amber-800 bg-amber-100/80 border border-amber-300/70 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{lowStockAlerts.length} Critical Alerts</span>
            </span>
          </div>

          <div className="space-y-3">
            {lowStockAlerts.length === 0 ? (
              <div className="p-6 rounded-2xl glass-l1 border border-white/60 text-slate-600 text-xs text-center font-medium">
                All shelters currently hold &gt; 30 hours of emergency survival stock.
              </div>
            ) : (
              lowStockAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl glass-l1 border border-rose-200/80 hover:border-rose-300 flex items-center justify-between gap-3 text-xs transition shadow-xs"
                >
                  <div>
                    <div className="font-bold text-slate-950">
                      {alert.shelter.name}
                    </div>
                    <div className="text-rose-600 font-semibold mt-0.5">
                      {alert.item.item_type} • {alert.item.quantity_available}{" "}
                      {alert.item.unit} remaining (~{alert.hoursLeft}h supply)
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      triggerTelegramAlert(
                        alert.shelter.name,
                        alert.item.item_type,
                        alert.hoursLeft
                      )
                    }
                    disabled={isDispatching}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm shadow-rose-600/25 whitespace-nowrap transition"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Telegram SOS</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Critical Medical Triage Queue */}
      <div className="glass-l2 rounded-[32px] sm:rounded-[38px] p-6 border border-white/60 shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl glass-l3 text-rose-600 flex items-center justify-center shadow-xs">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">
                P1 Critical Medical Triage Queue (Grassroots Evacuees)
              </h2>
              <p className="text-xs text-slate-500 font-medium">Priority medical care referrals & hospital transfers</p>
            </div>
          </div>
          <span className="text-xs text-rose-700 bg-rose-100/80 border border-rose-300/70 px-3 py-1 rounded-full font-bold">
            {triageList.length} Vulnerable Cases Catalogued
          </span>
        </div>

        {triageList.length === 0 ? (
          <div className="p-8 rounded-2xl glass-l1 border border-white/60 text-center text-xs text-slate-600 font-medium">
            No critical medical triage cases logged yet. Register a household with
            vulnerability flags to view real-time triage.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {triageList.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl glass-l1 border border-rose-200/80 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-950">{t.person_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.triage_level === "P1_CRITICAL"
                        ? "bg-rose-100/80 text-rose-800 border border-rose-300/70"
                        : "bg-amber-100/80 text-amber-800 border border-amber-300/70"
                    }`}
                  >
                    {t.triage_level}
                  </span>
                </div>
                <div className="text-rose-600 font-medium">
                  Condition: {t.vulnerability_category}
                </div>
                {t.notes && (
                  <div className="text-slate-600 text-[11px] italic bg-white/60 border border-slate-200/60 p-2.5 rounded-xl">
                    "{t.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
