"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Shield,
  Layers,
} from "lucide-react";
import { db, initializeDatabase, type Shelter, type InventoryItem } from "@/lib/db/dexie";
import { translations, type Language } from "@/lib/locales/translations";
import { syncManager } from "@/lib/sync/syncManager";
import {
  getDistrictDirectory,
  COASTAL_DISTRICTS_DIRECTORY,
  type DistrictDirectoryEntry,
} from "@/lib/data/districtDirectory";

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

  useEffect(() => {
    async function loadData() {
      await initializeDatabase();
      const sList = await db.shelters.toArray();
      setShelters(sList);
      if (sList.length > 0) {
        // Default to the first shelter (which is an Odisha shelter by seed order)
        setSelectedShelterId(sList[0].id);
        setActiveShelter(sList[0]);
        loadShelterInventory(sList[0].id);
        syncDistrictDetails(sList[0]);
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t.stockTitle}
              </h1>
              <p className="text-xs text-slate-400">
                Sphere Standards • Dynamic Burn-Rate Depletion • Odisha & Andhra Pradesh Coastal Directory Grounding
              </p>
            </div>
          </div>

          {/* Source Selection Pill Strip */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-850 border border-slate-700 text-xs">
            <button
              onClick={() => handleSourceFilterChange("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedSource === "ALL"
                  ? "bg-slate-700 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Sources ({shelters.length} Shelters)
            </button>
            <button
              onClick={() => handleSourceFilterChange("ODISHA")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                selectedSource === "ODISHA"
                  ? "bg-sky-600 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-sky-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Odisha State ({odishaSheltersList.length})</span>
            </button>
            <button
              onClick={() => handleSourceFilterChange("ANDHRA_PRADESH")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                selectedSource === "ANDHRA_PRADESH"
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Andhra Pradesh ({apSheltersList.length})</span>
            </button>
          </div>
        </div>

        {/* SELECT DESIGNATED SHELTER SECTION WITH FULL ODISHA & AP DETAILS */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
              <Building className="w-4 h-4 text-amber-400" />
              <span>Select Designated Shelter:</span>
            </div>

            <div className="w-full sm:w-[420px]">
              <select
                value={selectedShelterId}
                onChange={(e) => handleShelterChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                {selectedSource === "ALL" ? (
                  <>
                    <optgroup label="📍 ODISHA STATE (OSDMA — Kendrapara, Jagatsinghpur, Puri, Ganjam, Balasore, Bhadrak)">
                      {odishaSheltersList.map((s) => (
                        <option key={s.id} value={s.id}>
                          [Odisha • {s.district}] {s.name} ({s.block_name} Block, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 ANDHRA PRADESH STATE (APSDMA — Visakhapatnam, Bapatla, Krishna, Srikakulam, Konaseema, Nellore...)">
                      {apSheltersList.map((s) => (
                        <option key={s.id} value={s.id}>
                          [Andhra Pradesh • {s.district}] {s.name} ({s.block_name} Mandal | {s.current_occupancy}/{s.capacity_persons} pax)
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : selectedSource === "ODISHA" ? (
                  <optgroup label="📍 ODISHA STATE COASTAL SHELTERS (OSDMA)">
                    {odishaSheltersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        [Odisha • {s.district}] {s.name} ({s.block_name} Block, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <optgroup label="📍 ANDHRA PRADESH COASTAL SHELTERS (APSDMA)">
                    {apSheltersList.map((s) => (
                      <option key={s.id} value={s.id}>
                        [Andhra Pradesh • {s.district}] {s.name} ({s.block_name} Mandal, GP: {s.gram_panchayat} | {s.current_occupancy}/{s.capacity_persons} pax)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* ACTIVE SELECTED SHELTER ADMINISTRATIVE PROFILE CARD (ODISHA & AP) */}
          {activeShelter && (
            <div
              className={`p-4 rounded-xl border transition-all text-xs ${
                isOdishaShelter
                  ? "bg-gradient-to-r from-sky-950/60 via-slate-900 to-sky-950/30 border-sky-500/50 shadow-md"
                  : "bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/20 border-amber-500/50 shadow-md"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isOdishaShelter
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {isOdishaShelter
                        ? "Odisha State Disaster Management Authority (OSDMA)"
                        : "Andhra Pradesh State Disaster Management Authority (APSDMA)"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      ID: {activeShelter.id}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded">
                      Status: {activeShelter.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white">
                    {activeShelter.name}
                  </h3>

                  <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      State: <strong className="text-white">{isOdishaShelter ? "Odisha (ଓଡ଼ିଶା)" : "Andhra Pradesh (ఆంధ్రప్రదేశ్)"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      District: <strong className="text-white">{activeShelter.district}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {isOdishaShelter ? "Block" : "Mandal"}:{" "}
                      <strong className="text-white">{activeShelter.block_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Gram Panchayat:{" "}
                      <strong className="text-white">{activeShelter.gram_panchayat}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Navigation className="w-3 h-3 text-sky-400" />
                      {activeShelter.latitude.toFixed(4)}° N, {activeShelter.longitude.toFixed(4)}° E
                    </span>
                  </div>
                </div>

                {/* Right side contact & lifeline info */}
                <div className="flex flex-col sm:items-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 text-[11px]">
                  <div className="text-slate-300">
                    Shelter In-Charge: <strong className="text-white">{activeShelter.incharge_name}</strong>
                  </div>
                  <a
                    href={`tel:${activeShelter.incharge_phone}`}
                    className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>{activeShelter.incharge_phone}</span>
                  </a>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span
                      className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        activeShelter.has_solar_backup
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Sun className="w-2.5 h-2.5 text-amber-400" />
                      Solar: {activeShelter.has_solar_backup ? "Active" : "None"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        activeShelter.has_borewell
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Droplet className="w-2.5 h-2.5 text-sky-400" />
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
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span className="text-slate-300">
                {t.occupancyNotice}:{" "}
                <strong className="text-white font-black text-sm">
                  {activeShelter.current_occupancy}
                </strong>{" "}
                / {activeShelter.capacity_persons} Capacity
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Saturation:</span>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    activeShelter.current_occupancy / activeShelter.capacity_persons > 0.9
                      ? "bg-red-500"
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
              <span className="font-bold text-slate-200 text-[11px]">
                {Math.round(
                  (activeShelter.current_occupancy / activeShelter.capacity_persons) * 100
                )}
                %
              </span>
            </div>
          </div>
        )}
      </div>

      {/* OFFICIAL COASTAL DISTRICT DIRECTORY DETAILS PANEL (ODISHA & ANDHRA PRADESH) */}
      {selectedDistrictSource && (
        <div
          className={`rounded-2xl border shadow-xl overflow-hidden ${
            selectedDistrictSource.state === "ODISHA"
              ? "bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border-sky-600/40"
              : "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-amber-600/40"
          }`}
        >
          {/* Dossier Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  selectedDistrictSource.state === "ODISHA"
                    ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedDistrictSource.state === "ODISHA"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {selectedDistrictSource.state === "ODISHA"
                      ? "Odisha State (OSDMA Official Coastal Directory)"
                      : "Andhra Pradesh State (APSDMA Official Directory)"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedDistrictSource.vulnerability_tier === "VERY_HIGH"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    Vulnerability: {selectedDistrictSource.vulnerability_tier}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
                  <span>{selectedDistrictSource.district_name} District Official Directory Details</span>
                </h2>
                <div className="text-[11px] text-slate-400">
                  Official Disaster Authority:{" "}
                  <span className="text-slate-300 font-semibold">{selectedDistrictSource.official_source}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDirectoryDossier(!showDirectoryDossier)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
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
            <div className="p-5 space-y-4 text-xs text-slate-300">
              {/* Directory Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Headquarters
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {selectedDistrictSource.headquarters}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Coastal Length
                  </span>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">
                    {selectedDistrictSource.coastal_length_km} km Coastline
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    DEOC 24/7 Helpline
                  </span>
                  <a
                    href="tel:1077"
                    className="text-sm font-bold text-amber-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{selectedDistrictSource.deoc_helpline}</span>
                  </a>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Designated Shelters
                  </span>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {selectedDistrictSource.designated_shelters} MCS Facilities
                  </div>
                </div>
              </div>

              {/* Coastal Mandals/Blocks & Major Historical Cyclones Grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Coastal Mandals / Blocks */}
                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
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
                        className="px-2 py-0.5 rounded text-[11px] bg-slate-700 text-slate-200 border border-slate-600"
                      >
                        {mandal}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Major Historical Cyclones */}
                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    <span>Historical Bay of Bengal Cyclonic Landfalls:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDistrictSource.major_historical_cyclones.map((cyclone) => (
                      <span
                        key={cyclone}
                        className={`px-2 py-0.5 rounded text-[11px] border ${
                          selectedDistrictSource.state === "ODISHA"
                            ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {cyclone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* District Source Browser Quick Switcher (Both Odisha & AP) */}
              <div className="pt-3 border-t border-slate-800 space-y-3 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-200 font-bold flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Browse Official Coastal Districts Directory (18 Districts):</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDirectoryStateFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                        directoryStateFilter === "ALL"
                          ? "bg-slate-700 text-white font-bold shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All (18)
                    </button>
                    <button
                      onClick={() => setDirectoryStateFilter("ODISHA")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                        directoryStateFilter === "ODISHA"
                          ? "bg-sky-600 text-white font-bold shadow"
                          : "text-slate-400 hover:text-sky-300"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <span>Odisha (6 Districts)</span>
                    </button>
                    <button
                      onClick={() => setDirectoryStateFilter("ANDHRA_PRADESH")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                        directoryStateFilter === "ANDHRA_PRADESH"
                          ? "bg-amber-600 text-white font-bold shadow"
                          : "text-slate-400 hover:text-amber-300"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Andhra Pradesh (12 Districts)</span>
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
                        onClick={() => handleSelectSpecificDistrict(dir.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? isOD
                              ? "bg-sky-600 text-white font-bold shadow-md"
                              : "bg-amber-500 text-slate-950 font-bold shadow-md"
                            : isOD
                            ? "bg-sky-950/40 text-sky-300 border border-sky-800/60 hover:bg-sky-900/50"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <span>{dir.district_name}</span>
                        <span
                          className={`text-[9px] px-1 rounded ${
                            isSelected
                              ? "bg-black/20 text-white"
                              : isOD
                              ? "bg-sky-500/20 text-sky-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
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
        <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>Inventory balance committed to local IndexedDB!</span>
        </div>
      )}

      {/* Inventory Commodity Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {inventoryList.map((item) => {
          const Icon = getItemIcon(item.item_type);
          const hoursLeft = computeHoursRemaining(item, currentOccupancy);
          const isCritical = hoursLeft < 24;

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                isCritical
                  ? "bg-red-950/40 border-red-500/50 shadow-lg shadow-red-950/50"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCritical
                        ? "bg-red-500/20 text-red-400"
                        : "bg-sky-500/20 text-sky-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {getItemLabel(item.item_type)}
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      Standard Relief Allocation
                    </div>
                  </div>
                </div>

                {isCritical && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    <span>&lt; 24h Stock</span>
                  </span>
                )}
              </div>

              {/* Quantity Display */}
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-black text-white">
                    {item.quantity_available.toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-400">
                      {item.unit}
                    </span>
                  </div>
                </div>

                {/* Hours countdown */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>{t.hoursRemaining}</span>
                  </div>
                  <div
                    className={`text-lg font-black ${
                      isCritical ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    ~{hoursLeft} hrs
                  </div>
                </div>
              </div>

              {/* Quick Adjustment Controls (+/- buttons) */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Quick Audit:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => adjustStock(item.id, -20)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95"
                  >
                    -20
                  </button>
                  <button
                    onClick={() => adjustStock(item.id, -5)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => adjustStock(item.id, 5)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => adjustStock(item.id, 50)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold active:scale-95"
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
