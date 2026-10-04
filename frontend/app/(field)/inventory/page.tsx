"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Droplet,
  Utensils,
  Baby,
  HeartPulse,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Building,
  MapPin,
  PhoneCall,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Waves,
  Sun,
  Compass,
  Navigation,
} from "lucide-react";
import { db, initializeDatabase, type Shelter, type InventoryItem } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { syncManager } from "@/lib/sync/syncManager";
import {
  getDistrictDirectory,
  COASTAL_DISTRICTS_DIRECTORY,
  type DistrictDirectoryEntry,
} from "@/lib/data/districtDirectory";
import { cn } from "@/lib/utils";

type SourceRegion = "ALL" | "ODISHA" | "ANDHRA_PRADESH";

export default function InventoryPage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedSource, setSelectedSource] = useState<SourceRegion>("ALL");
  const [selectedShelterId, setSelectedShelterId] = useState<string>("");
  const [activeShelter, setActiveShelter] = useState<Shelter | null>(null);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [updateToast, setUpdateToast] = useState(false);
  const [showDirectoryDossier, setShowDirectoryDossier] = useState(true);
  const [selectedDistrictSource, setSelectedDistrictSource] = useState<DistrictDirectoryEntry | null>(null);
  const [directoryStateFilter, setDirectoryStateFilter] = useState<"ALL" | "ODISHA" | "ANDHRA_PRADESH">("ALL");

  // Real-Time Automatic Stock Upgrade State
  const [recentUpgradeNotice, setRecentUpgradeNotice] = useState<{
    shelterId: string;
    shelterName?: string;
    shortRef?: string;
    headName?: string;
    hamletName?: string;
    newOccupancy: number;
    addedMembers: number;
    prevOccupancy?: number;
    capacityPersons?: number;
    rationWater: number;
    rationFood: number;
    timestamp: number;
    isRevert?: boolean;
  } | null>(null);
  const [highlightItems, setHighlightItems] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      await initializeDatabase();
      const sList = await db.shelters.toArray();
      setShelters(sList);
      if (sList.length > 0) {
        let initialShelterId = sList[0].id;
        const lastUpgradeRaw = localStorage.getItem("ashraysetu_last_inventory_upgrade");
        if (lastUpgradeRaw) {
          try {
            const detail = JSON.parse(lastUpgradeRaw);
            if (detail && Date.now() - detail.timestamp < 300000) {
              const matchedShelter = sList.find((s) => s.id === detail.shelterId);
              if (matchedShelter) {
                initialShelterId = matchedShelter.id;
                setSelectedSource("ALL");
                setRecentUpgradeNotice(detail);
                setHighlightItems(true);
                setTimeout(() => setHighlightItems(false), 3500);
              }
            }
          } catch { }
        }
        const activeS = sList.find((s) => s.id === initialShelterId) || sList[0];
        setSelectedShelterId(activeS.id);
        setActiveShelter(activeS);
        loadShelterInventory(activeS.id);
        syncDistrictDetails(activeS);
      }
    }
    loadData();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);

    // Real-Time Automatic Stock Upgrade Event Listener
    const handleStockUpdate = (e?: any) => {
      const detail = e?.detail;
      db.shelters.toArray().then((sList) => {
        setShelters(sList);
        const currentTargetId = detail?.shelterId || selectedShelterId || (sList[0] ? sList[0].id : "");
        if (currentTargetId) {
          setSelectedSource("ALL");
          setSelectedShelterId(currentTargetId);
          loadShelterInventory(currentTargetId);
        }
      });
      if (detail) {
        setRecentUpgradeNotice(detail);
        setHighlightItems(true);
        setTimeout(() => setHighlightItems(false), 3500);
      }
    };
    window.addEventListener("ashraysetu_inventory_updated", handleStockUpdate);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ashraysetu_last_inventory_upgrade" && e.newValue) {
        try {
          const detail = JSON.parse(e.newValue);
          handleStockUpdate({ detail });
        } catch { }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("languageChanged", handleLang);
      window.removeEventListener("ashraysetu_inventory_updated", handleStockUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const syncDistrictDetails = (shelter: Shelter) => {
    const dir = getDistrictDirectory(shelter.district, shelter.state);
    if (dir) {
      setSelectedDistrictSource(dir);
    } else {
      const fallbackDir = getDistrictDirectory(shelter.district);
      setSelectedDistrictSource(fallbackDir || null);
    }
  };

  const loadShelterInventory = async (shelterId: string) => {
    const items = await db.inventory
      .where("shelter_id")
      .equals(shelterId)
      .toArray();
    setInventoryList(items);

    const s = await db.shelters.get(shelterId);
    if (s) {
      setActiveShelter(s);
      syncDistrictDetails(s);
    }
  };

  const handleSourceFilterChange = (source: SourceRegion) => {
    setSelectedSource(source);
    setDirectoryStateFilter(source);
    const filtered =
      source === "ALL"
        ? shelters
        : shelters.filter((s) => s.state === source);

    if (filtered.length > 0) {
      setSelectedShelterId(filtered[0].id);
      setActiveShelter(filtered[0]);
      loadShelterInventory(filtered[0].id);
      syncDistrictDetails(filtered[0]);
    }
  };

  const handleShelterChange = async (shelterId: string) => {
    setSelectedShelterId(shelterId);
    await loadShelterInventory(shelterId);
  };

  const handleSelectSpecificDistrict = (districtId: string) => {
    const found = COASTAL_DISTRICTS_DIRECTORY.find((d) => d.id === districtId);
    if (found) {
      setSelectedDistrictSource(found);
      const matchShelter = shelters.find(
        (s) => (s.district || "").toLowerCase() === found.district_name.toLowerCase()
      );
      if (matchShelter) {
        setSelectedShelterId(matchShelter.id);
        setActiveShelter(matchShelter);
        loadShelterInventory(matchShelter.id);
      }
    }
  };

  const adjustStock = async (itemId: string, delta: number) => {
    const item = await db.inventory.get(itemId);
    if (!item) return;

    const newQty = Math.max(0, item.quantity_available + delta);
    await db.inventory.update(itemId, {
      quantity_available: newQty,
      last_updated: Date.now(),
    });

    await syncManager.enqueueMutation("inventory", itemId, "UPDATE", {
      ...item,
      quantity_available: newQty,
    });

    await loadShelterInventory(selectedShelterId);
    setUpdateToast(true);
    setTimeout(() => setUpdateToast(false), 2000);
  };

  const t = translations[lang];

  // Helper to compute hours of survival remaining
  const computeHoursRemaining = (item: InventoryItem, occupancy: number) => {
    const safeOccupancy = Math.max(1, occupancy);
    let perPersonPerDay = 3.0; // default water

    if (item.item_type === "WATER_LITRES") perPersonPerDay = 3.0;
    else if (item.item_type === "FOOD_PACKETS") perPersonPerDay = 2.0;
    else if (item.item_type === "BABY_FORMULA") perPersonPerDay = 0.08;
    else perPersonPerDay = 0.2;

    const dailyBurn = safeOccupancy * perPersonPerDay;
    const days = item.quantity_available / dailyBurn;
    return Math.round(days * 24 * 10) / 10;
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "WATER_LITRES":
        return Droplet;
      case "FOOD_PACKETS":
        return Utensils;
      case "BABY_FORMULA":
        return Baby;
      default:
        return HeartPulse;
    }
  };

  const getItemLabel = (type: string) => {
    switch (type) {
      case "WATER_LITRES":
        return t.water;
      case "FOOD_PACKETS":
        return t.food;
      case "BABY_FORMULA":
        return t.formula;
      default:
        return t.ors;
    }
  };

  const currentOccupancy = activeShelter ? activeShelter.current_occupancy : 0;
  const isOdishaShelter = activeShelter?.state === "ODISHA";

  const odishaSheltersList = shelters.filter((s) => s.state === "ODISHA");
  const apSheltersList = shelters.filter((s) => s.state === "ANDHRA_PRADESH");

  const displayedShelters =
    selectedSource === "ALL"
      ? shelters
      : shelters.filter((s) => s.state === selectedSource);

  const displayedDistricts =
    directoryStateFilter === "ALL"
      ? COASTAL_DISTRICTS_DIRECTORY
      : COASTAL_DISTRICTS_DIRECTORY.filter((d) => d.state === directoryStateFilter);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header Card - Liquid Glass Panel */}
      <div className="p-6 sm:p-7 rounded-[40px] glass-header-panel space-y-5 relative overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl glass-l3 text-[#007AFF] border border-white/60 flex items-center justify-center shadow-xs shrink-0">
              <Package className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {t.stockTitle}
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Sphere Standards • Dynamic Burn-Rate Depletion • Odisha & Andhra Pradesh Coastal Directory Grounding
              </p>
            </div>
          </div>

          {/* Source Selection Pill Strip - Fixed Single Row Alignment */}
          <div className="flex flex-nowrap items-center gap-1.5 p-1.5 rounded-full glass-l1 border border-white/50 shadow-inner self-start xl:self-auto overflow-x-auto max-w-full [scrollbar-width:none] shrink-0">
            <button
              type="button"
              onClick={() => handleSourceFilterChange("ALL")}
              className={cn(
                "px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedSource === "ALL"
                  ? "glass-pill-tab-all-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              All Sources ({shelters.length})
            </button>
            <button
              type="button"
              onClick={() => handleSourceFilterChange("ODISHA")}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedSource === "ODISHA"
                  ? "glass-pill-tab-odisha-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              <span>Odisha ({odishaSheltersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSourceFilterChange("ANDHRA_PRADESH")}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-250 select-none cursor-pointer border whitespace-nowrap shrink-0",
                selectedSource === "ANDHRA_PRADESH"
                  ? "glass-pill-tab-ap-active"
                  : "text-slate-700 hover:text-slate-950 hover:bg-white/40 border-transparent"
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Andhra Pradesh ({apSheltersList.length})</span>
            </button>
          </div>
        </div>

        {/* SELECT DESIGNATED SHELTER SECTION */}
        <div className="pt-4 border-t border-white/40 space-y-3.5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
              <Building className="w-4 h-4 text-[#007AFF] stroke-[2.2]" />
              <span>Select Designated Shelter:</span>
            </div>

            <div className="w-full sm:w-[460px]">
              <select
                value={selectedShelterId}
                onChange={(e) => handleShelterChange(e.target.value)}
                className="w-full glass-select rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition shadow-inner cursor-pointer"
              >
                {selectedSource === "ALL" ? (
                  <>
                    <optgroup label="📍 ODISHA STATE (OSDMA — Kendrapara, Jagatsinghpur, Puri, Ganjam, Balasore, Bhadrak)" className="bg-white text-slate-900">
                      {odishaSheltersList.map((s) => (
                        <option key={s.id} value={s.id} className="bg-white text-slate-900">
                          [Odisha • {s.district}] {s.name} ({s.block_name} Block, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 ANDHRA PRADESH STATE (APSDMA — Visakhapatnam, Bapatla, Krishna, Srikakulam, Konaseema, Nellore...)" className="bg-white text-slate-900">
                      {apSheltersList.map((s) => (
                        <option key={s.id} value={s.id} className="bg-white text-slate-900">
                          [Andhra Pradesh • {s.district}] {s.name} ({s.block_name} Mandal | {s.current_occupancy}/{s.capacity_persons} pax)
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : selectedSource === "ODISHA" ? (
                  <optgroup label="📍 ODISHA STATE COASTAL SHELTERS (OSDMA)" className="bg-white text-slate-900">
                    {odishaSheltersList.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white text-slate-900">
                        [Odisha • {s.district}] {s.name} ({s.block_name} Block, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup label="📍 ANDHRA PRADESH COASTAL SHELTERS (APSDMA)" className="bg-white text-slate-900">
                    {apSheltersList.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white text-slate-900">
                        [Andhra Pradesh • {s.district}] {s.name} ({s.block_name} Mandal, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* ACTIVE SELECTED SHELTER ADMINISTRATIVE PROFILE CARD */}
          {activeShelter && (
            <div className="p-5 sm:p-6 rounded-[32px] glass-l2 border border-white/60 space-y-4 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-mono font-bold glass-l1 border",
                        isOdishaShelter
                          ? "bg-sky-500/20 text-sky-900 border-sky-400/60"
                          : "bg-amber-500/20 text-amber-900 border-amber-400/60"
                      )}
                    >
                      {isOdishaShelter
                        ? "Odisha State Disaster Management Authority (OSDMA)"
                        : "Andhra Pradesh State Disaster Management Authority (APSDMA)"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-700 glass-l1 px-2.5 py-1 rounded-full border border-white/60">
                      ID: {activeShelter.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 glass-l1 border border-emerald-300/60 px-2.5 py-1 rounded-full">
                      Status: {activeShelter.status}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-950">
                    {activeShelter.name}
                  </h3>

                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      State: <strong className="text-slate-900">{isOdishaShelter ? "Odisha (ଓଡ଼ିଶା)" : "Andhra Pradesh (ఆంధ్రప్రదేశ్)"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      District: <strong className="text-slate-900">{activeShelter.district}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {isOdishaShelter ? "Block" : "Mandal"}:{" "}
                      <strong className="text-slate-900">{activeShelter.block_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Gram Panchayat:{" "}
                      <strong className="text-slate-900">{activeShelter.gram_panchayat}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[#007AFF] font-bold">
                      <Navigation className="w-3 h-3 text-[#007AFF]" />
                      {activeShelter.latitude.toFixed(4)}° N, {activeShelter.longitude.toFixed(4)}° E
                    </span>
                  </div>
                </div>

                {/* Right side contact & lifeline info */}
                <div className="flex flex-col sm:items-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/40 text-[11px]">
                  <div className="text-slate-600">
                    Shelter In-Charge: <strong className="text-slate-900">{activeShelter.incharge_name}</strong>
                  </div>
                  <a
                    href={`tel:${activeShelter.incharge_phone}`}
                    className="inline-flex items-center gap-1 font-bold text-[#007AFF] hover:underline"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>{activeShelter.incharge_phone}</span>
                  </a>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full flex items-center gap-1 glass-l1 border border-white/60 font-semibold",
                        activeShelter.has_solar_backup
                          ? "text-amber-800"
                          : "text-slate-500"
                      )}
                    >
                      <Sun className="w-2.5 h-2.5 text-amber-500" />
                      Solar: {activeShelter.has_solar_backup ? "Active" : "None"}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full flex items-center gap-1 glass-l1 border border-white/60 font-semibold",
                        activeShelter.has_borewell
                          ? "text-sky-800"
                          : "text-slate-500"
                      )}
                    >
                      <Droplet className="w-2.5 h-2.5 text-sky-500" />
                      Borewell: {activeShelter.has_borewell ? "Equipped" : "None"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shelter Occupancy Badge Strip */}
        {activeShelter && (
          <div className="pt-3.5 border-t border-white/40 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#007AFF]" />
              <span className="text-slate-700 font-semibold">
                {t.occupancyNotice}:{" "}
                <strong className="text-slate-950 font-black text-sm">
                  {activeShelter.current_occupancy}
                </strong>{" "}
                / {activeShelter.capacity_persons} Capacity
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold">Saturation:</span>
              <div className="w-28 h-2.5 rounded-full bg-slate-200/80 border border-white/80 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all ${
                    activeShelter.current_occupancy / activeShelter.capacity_persons > 0.9
                      ? "bg-rose-500"
                      : isOdishaShelter
                      ? "bg-sky-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (activeShelter.current_occupancy / activeShelter.capacity_persons) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="font-bold text-slate-900 text-xs font-mono">
                {Math.round(
                  (activeShelter.current_occupancy / activeShelter.capacity_persons) * 100
                )}
                %
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Stock Upgrade via QR Pass Scan Banner */}
      {recentUpgradeNotice && (
        <div className="p-5 rounded-[28px] glass-l2 border border-emerald-400/60 shadow-lg text-xs text-slate-900 space-y-3 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center justify-between relative z-10">
            <span className="flex items-center gap-2 font-black text-emerald-900 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span>
                {recentUpgradeNotice.isRevert
                  ? "↩ Shelter Stock Allocation Reverted"
                  : "⚡ Real-Time Stock Upgrade via QR Pass Scan"}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {recentUpgradeNotice.shortRef && (
                <span className="text-[11px] font-mono text-emerald-900 glass-l1 px-2.5 py-1 rounded-full border border-emerald-400/60 font-bold">
                  Pass #{recentUpgradeNotice.shortRef}
                </span>
              )}
              <button
                type="button"
                onClick={() => setRecentUpgradeNotice(null)}
                className="text-slate-500 hover:text-slate-900 transition text-xs px-2 py-1 rounded-full glass-l1 border border-white/60 cursor-pointer"
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs relative z-10">
            <span className="px-3 py-1.5 rounded-xl glass-l1 border border-emerald-300/70 font-bold text-emerald-900">
              👥 Muster Occupancy: {recentUpgradeNotice.isRevert ? "" : "+"}{recentUpgradeNotice.addedMembers} Pax (Current: {recentUpgradeNotice.newOccupancy})
            </span>
            <span className="px-3 py-1.5 rounded-xl glass-l1 border border-sky-300/70 font-bold text-sky-900">
              💧 Water: {recentUpgradeNotice.isRevert ? "+" : "-"}{Math.abs(recentUpgradeNotice.rationWater)} L Allocated
            </span>
            <span className="px-3 py-1.5 rounded-xl glass-l1 border border-amber-300/70 font-bold text-amber-900">
              🍲 Food: {recentUpgradeNotice.isRevert ? "+" : "-"}{Math.abs(recentUpgradeNotice.rationFood)} Packets Allocated
            </span>
            {recentUpgradeNotice.headName && (
              <span className="text-slate-700 text-[11px] font-medium">
                Head: <strong>{recentUpgradeNotice.headName}</strong> • Daily burn rates recalculated dynamically.
              </span>
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL COASTAL DISTRICT DIRECTORY DETAILS PANEL */}
      {selectedDistrictSource && (
        <div className="rounded-[32px] glass-l2 border border-white/60 shadow-lg overflow-hidden relative">
          {/* Dossier Header Bar */}
          <div className="p-5 sm:p-6 border-b border-white/40 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl glass-l3 flex items-center justify-center flex-shrink-0 border border-white/60 shadow-xs",
                  selectedDistrictSource.state === "ODISHA"
                    ? "text-[#007AFF]"
                    : "text-amber-600"
                )}
              >
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold glass-l1 border",
                      selectedDistrictSource.state === "ODISHA"
                        ? "bg-sky-500/20 text-sky-900 border-sky-400/60"
                        : "bg-amber-500/20 text-amber-900 border-amber-400/60"
                    )}
                  >
                    {selectedDistrictSource.state === "ODISHA"
                      ? "Odisha State (OSDMA Official Coastal Directory)"
                      : "Andhra Pradesh State (APSDMA Official Directory)"}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold glass-l1 border",
                      selectedDistrictSource.vulnerability_tier === "VERY_HIGH"
                        ? "bg-rose-500/20 text-rose-900 border-rose-400/60 animate-pulse"
                        : "bg-amber-500/20 text-amber-900 border-amber-400/60"
                    )}
                  >
                    Vulnerability: {selectedDistrictSource.vulnerability_tier}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-950 mt-1 flex items-center gap-2">
                  <span>{selectedDistrictSource.district_name} District Official Directory Details</span>
                </h2>
                <div className="text-[11px] text-slate-600 font-medium">
                  Official Disaster Authority:{" "}
                  <span className="text-slate-900 font-semibold">{selectedDistrictSource.official_source}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDirectoryDossier(!showDirectoryDossier)}
              className="p-2.5 rounded-2xl glass-l1 hover:bg-white/60 text-slate-700 hover:text-slate-950 transition border border-white/60 cursor-pointer shadow-xs"
              title="Toggle Directory Dossier"
            >
              {showDirectoryDossier ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Dossier Body Content */}
          {showDirectoryDossier && (
            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 relative z-10">
              {/* Directory Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                    Headquarters
                  </span>
                  <div className="text-sm font-bold text-slate-950 mt-0.5">
                    {selectedDistrictSource.headquarters}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                    Coastal Length
                  </span>
                  <div className="text-sm font-bold text-[#007AFF] mt-0.5">
                    {selectedDistrictSource.coastal_length_km} km Coastline
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                    DEOC 24/7 Helpline
                  </span>
                  <a
                    href="tel:1077"
                    className="text-sm font-bold text-amber-800 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                    <span>{selectedDistrictSource.deoc_helpline}</span>
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl glass-l1 border border-white/60 shadow-inner">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">
                    Designated Shelters
                  </span>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">
                    {selectedDistrictSource.designated_shelters} MCS Facilities
                  </div>
                </div>
              </div>

              {/* Coastal Mandals/Blocks & Major Historical Cyclones Grid */}
              <div className="grid sm:grid-cols-2 gap-3.5">
                {/* Coastal Mandals / Blocks */}
                <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-2.5">
                  <div className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {selectedDistrictSource.state === "ODISHA"
                        ? "Vulnerable Coastal Blocks / Tehsils (Odisha):"
                        : "Official Coastal Mandals (Andhra Pradesh):"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDistrictSource.key_coastal_mandals.map((mandal) => (
                      <span
                        key={mandal}
                        className="px-2.5 py-1 rounded-xl text-[11px] glass-l1 text-slate-800 border border-white/70 font-semibold"
                      >
                        {mandal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Major Historical Cyclones */}
                <div className="p-4 rounded-2xl glass-l1 border border-white/60 space-y-2.5">
                  <div className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>Historical Bay of Bengal Cyclonic Landfalls:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDistrictSource.major_historical_cyclones.map((cyclone) => (
                      <span
                        key={cyclone}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] glass-l1 border font-semibold",
                          selectedDistrictSource.state === "ODISHA"
                            ? "text-sky-900 border-sky-300/60 bg-sky-500/10"
                            : "text-amber-900 border-amber-300/60 bg-amber-500/10"
                        )}
                      >
                        {cyclone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* District Source Browser Quick Switcher */}
              <div className="pt-3.5 border-t border-white/40 space-y-3 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-950 font-bold flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>Browse Official Coastal Districts Directory (18 Districts):</span>
                  </span>

                  <div className="flex items-center gap-1.5 p-1 rounded-full glass-l1 border border-white/50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setDirectoryStateFilter("ALL")}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border",
                        directoryStateFilter === "ALL"
                          ? "glass-pill-tab-all-active"
                          : "text-slate-700 hover:text-slate-950 border-transparent"
                      )}
                    >
                      All (18)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectoryStateFilter("ODISHA")}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border",
                        directoryStateFilter === "ODISHA"
                          ? "glass-pill-tab-odisha-active"
                          : "text-slate-700 hover:text-slate-950 border-transparent"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span>Odisha (6)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectoryStateFilter("ANDHRA_PRADESH")}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border",
                        directoryStateFilter === "ANDHRA_PRADESH"
                          ? "glass-pill-tab-ap-active"
                          : "text-slate-700 hover:text-slate-950 border-transparent"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Andhra Pradesh (12)</span>
                    </button>
                  </div>
                </div>

                {/* District quick buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {displayedDistricts.map((dir) => {
                    const isSelected = selectedDistrictSource.id === dir.id;
                    const isOD = dir.state === "ODISHA";
                    return (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => handleSelectSpecificDistrict(dir.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer border",
                          isSelected
                            ? isOD
                              ? "glass-pill-tab-odisha-active"
                              : "glass-pill-tab-ap-active"
                            : "glass-l1 text-slate-700 hover:text-slate-950 border-white/60"
                        )}
                      >
                        <span>{dir.district_name}</span>
                        <span
                          className={cn(
                            "text-[9px] px-1 rounded-md font-mono",
                            isSelected
                              ? "bg-black/20 text-white"
                              : isOD
                              ? "bg-sky-100 text-sky-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {isOD ? "OD" : "AP"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {updateToast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Inventory balance committed to local IndexedDB!</span>
        </div>
      )}

      {/* Inventory Commodity Cards Grid - Liquid Glass Specification */}
      <div className="grid sm:grid-cols-2 gap-5">
        {inventoryList.map((item) => {
          const Icon = getItemIcon(item.item_type);
          const hoursLeft = computeHoursRemaining(item, currentOccupancy);
          const isCritical = hoursLeft < 24;
          const isHighlighted = highlightItems && (item.item_type === "WATER_LITRES" || item.item_type === "FOOD_PACKETS");

          return (
            <div
              key={item.id}
              className={cn(
                "p-6 rounded-[32px] glass-l2 border border-white/60 transition-all relative space-y-4 shadow-sm",
                isHighlighted && "ring-2 ring-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.25)]",
                isCritical && "border-rose-400/60 shadow-[0_0_24px_rgba(244,63,94,0.18)]"
              )}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl glass-l3 flex items-center justify-center border border-white/60 shadow-xs shrink-0",
                      isCritical ? "text-rose-600 border-rose-300" : "text-[#007AFF] border-sky-300"
                    )}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      {getItemLabel(item.item_type)}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Standard Relief Allocation
                    </div>
                  </div>
                </div>

                {isCritical && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold glass-l1 bg-rose-500/15 text-rose-700 border border-rose-400/50 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>&lt; 24h Stock</span>
                  </span>
                )}
              </div>

              {/* Quantity Display */}
              <div className="mt-4 flex items-baseline justify-between relative z-10">
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
                    {item.quantity_available.toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-500 font-sans">
                      {item.unit}
                    </span>
                  </div>
                </div>

                {/* Hours countdown */}
                <div className="glass-l1 rounded-2xl px-3.5 py-2 border border-white/60 shadow-inner text-right">
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold justify-end">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{t.hoursRemaining}</span>
                  </div>
                  <div
                    className={cn(
                      "text-base sm:text-lg font-black font-mono mt-0.5",
                      isCritical ? "text-rose-600" : "text-emerald-700"
                    )}
                  >
                    ~{hoursLeft} hrs
                  </div>
                </div>
              </div>

              {/* Quick Adjustment Controls (+/- buttons) */}
              <div className="mt-4 pt-3.5 border-t border-white/40 flex items-center justify-between text-xs relative z-10">
                <span className="text-slate-600 font-bold">Quick Audit:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustStock(item.id, -20)}
                    className="px-3 py-1.5 rounded-xl glass-l1 hover:bg-white/60 text-slate-800 font-bold active:scale-95 border border-white/60 cursor-pointer transition shadow-xs"
                  >
                    -20
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStock(item.id, -5)}
                    className="px-3 py-1.5 rounded-xl glass-l1 hover:bg-white/60 text-slate-800 font-bold active:scale-95 border border-white/60 cursor-pointer transition shadow-xs"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStock(item.id, 5)}
                    className="px-3 py-1.5 rounded-xl glass-l1 hover:bg-white/60 text-slate-800 font-bold active:scale-95 border border-white/60 cursor-pointer transition shadow-xs"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustStock(item.id, 50)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer border border-blue-400 transition"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
