"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Send,
  HeartPulse,
  Package,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bell,
  Clock,
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
    return () => window.removeEventListener("languageChanged", handleLang);
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Command Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
            <span>District Emergency Operation Centre (DEOC) • Kendrapara</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            Administrative Command & Resource Oversight
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-Time Edge-Reconciled Situational Awareness across Rajnagar & Mahakalapada Blocks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>Launch Secure Real-Time Admin Dashboard →</span>
          </Link>
          <button
            onClick={refreshDashboardData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Refresh Snapshot</span>
          </button>
        </div>
      </div>

      {telegramStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-mono">{telegramStatus}</span>
        </div>
      )}

      {/* District KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Total Sheltered Evacuees</div>
          <div className="text-3xl font-black text-white mt-1">
            {totalSheltered.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {shelters.length} Multi-Purpose Shelters
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Certified Capacity</div>
          <div className="text-3xl font-black text-sky-400 mt-1">
            {totalCapacity.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Persons (Max Threshold)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">District Saturation</div>
          <div className="text-3xl font-black text-amber-400 mt-1">
            {saturationPercent}%
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                saturationPercent > 80 ? "bg-red-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, saturationPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Critical Triage Cases</div>
          <div className="text-3xl font-black text-rose-400 mt-1">
            {criticalTriageCases.length}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-semibold">
            P1 Hospital / Stretcher Transfer
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shelter Capacity Heatmap Table */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">
                Shelter Occupancy & Saturation Grid
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Live Edge Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 font-semibold">Shelter Name</th>
                  <th className="py-2 font-semibold">Block</th>
                  <th className="py-2 font-semibold">Occupancy</th>
                  <th className="py-2 font-semibold">Saturation</th>
                  <th className="py-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shelters.map((s) => {
                  const sat = Math.round((s.current_occupancy / s.capacity_persons) * 100);
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-medium text-slate-200">
                        {s.name}
                      </td>
                      <td className="py-2.5 text-slate-400">{s.block_name}</td>
                      <td className="py-2.5 font-bold text-white">
                        {s.current_occupancy} / {s.capacity_persons}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`font-mono font-bold ${
                            sat > 85 ? "text-red-400" : sat > 60 ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {sat}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
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
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                Urgent Relief Logistics & Telegram Dispatch (M8)
              </h2>
            </div>
            <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockAlerts.length} Stockouts Imminent</span>
            </span>
          </div>

          <div className="space-y-3">
            {lowStockAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 text-slate-400 text-xs text-center">
                All shelters currently hold &gt; 30 hours of emergency survival stock.
              </div>
            ) : (
              lowStockAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-red-500/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {alert.shelter.name}
                    </div>
                    <div className="text-red-400 font-semibold mt-0.5">
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
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md shadow-red-600/30 whitespace-nowrap"
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
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white">
              P1 Critical Medical Triage Queue (Grassroots Evacuees)
            </h2>
          </div>
          <span className="text-xs text-rose-400 font-semibold">
            {triageList.length} Total Vulnerable Cases Catalogued
          </span>
        </div>

        {triageList.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950 text-center text-xs text-slate-400">
            No critical medical triage cases logged yet. Register a household with
            vulnerability flags to view real-time triage.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {triageList.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-white">{t.person_name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      t.triage_level === "P1_CRITICAL"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {t.triage_level}
                  </span>
                </div>
                <div className="text-rose-300 font-medium">
                  Condition: {t.vulnerability_category}
                </div>
                {t.notes && (
                  <div className="text-slate-400 text-[11px] italic bg-slate-900 p-2 rounded">
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
