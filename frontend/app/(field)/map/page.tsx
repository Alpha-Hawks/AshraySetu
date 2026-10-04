"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Shield,
  Users,
  Compass,
  Building,
  ExternalLink,
  Phone,
  Zap,
  Droplets,
  Route,
  X,
  Crosshair,
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import {
  findNearestShelters,
  calculateDistanceToShelter,
} from "@/lib/geo/turfCalculations";
import { translations, type Language } from "@/lib/locales/translations";
import { useLiveLocation } from "@/lib/geo/useLiveLocation";
import { useLiveNavigation } from "@/lib/geo/useLiveNavigation";
import { AboveMapSlot } from "@/components/map/SafeShelterPanel";

// Dynamically import client-only Leaflet & UI controls to keep initial bundle compact (6.6)
const LeafletMapComponent = dynamic(
  () => import("@/components/map/LeafletMapCore"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-2xl glass-l1 border border-white/60 flex items-center justify-center text-slate-600 text-xs font-medium">
        Loading offline GIS vector engine...
      </div>
    ),
  }
);

const LiveLocationControls = dynamic(
  () => import("@/components/map/LiveLocationControls"),
  { ssr: false }
);

const BelowMapSlot = dynamic(
  () => import("@/components/map/SafeShelterPanel").then((mod) => mod.BelowMapSlot),
  { ssr: false }
);

type CoastalRegion = "ALL" | "ODISHA" | "ANDHRA_PRADESH";

export default function MapPage() {
  const [lang, setLang] = useState<Language>("en");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<CoastalRegion>("ALL");
  const [userLocation, setUserLocation] = useState<[number, number]>([
    20.5214, 86.8523,
  ]); // Default near Batighar, Odisha
  const [mapZoom, setMapZoom] = useState<number>(9);
  const [nearestList, setNearestList] = useState<
    (Shelter & { distanceKm: number })[]
  >([]);

  // Selected Map Point / Shelter State (for showing chosen location data)
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{
    lat: number;
    lng: number;
    nearest?: (Shelter & { distanceKm: number }) | null;
  } | null>(null);

  // Live GPS Geolocation & Safe Shelter Navigation hooks
  const {
    currentFix,
    follow,
    setFollow,
    isManualQuery,
    selectManualFallbackPoint,
  } = useLiveLocation();

  const {
    target,
    routeResult,
    guidanceMode,
    routeProgress,
    isBatterySaver,
  } = useLiveNavigation();

  const [fitRouteNonce, setFitRouteNonce] = useState(0);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      const s = await db.shelters.toArray();
      setShelters(s);
      updateNearest(userLocation[0], userLocation[1], s, selectedRegion);
    }
    init();

    const handleLang = () => {
      const savedLang = localStorage.getItem("ashraysetu_lang") as Language;
      if (savedLang) setLang(savedLang);
    };
    handleLang();
    window.addEventListener("languageChanged", handleLang);

    // Preload dynamic map components when browser is idle (6.6)
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        import("@/components/map/LiveLocationControls");
        import("@/components/map/SafeShelterPanel");
      });
    }

    return () => window.removeEventListener("languageChanged", handleLang);
  }, []);

  const updateNearest = (
    lat: number,
    lng: number,
    allShelters: Shelter[],
    region: CoastalRegion
  ) => {
    const pool =
      region === "ALL"
        ? allShelters
        : allShelters.filter((s) => s.state === region);

    const nearest = findNearestShelters(lat, lng, pool, 3);
    setNearestList(nearest);
  };

  const handleRegionChange = (region: CoastalRegion) => {
    setSelectedRegion(region);
    setSelectedShelter(null);
    setSelectedMapPoint(null);
    if (region === "ODISHA") {
      const coords: [number, number] = [20.5214, 86.8523];
      setUserLocation(coords);
      setMapZoom(10);
      updateNearest(coords[0], coords[1], shelters, region);
    } else if (region === "ANDHRA_PRADESH") {
      const coords: [number, number] = [17.6868, 83.2185]; // Visakhapatnam Coast
      setUserLocation(coords);
      setMapZoom(9);
      updateNearest(coords[0], coords[1], shelters, region);
    } else {
      const coords: [number, number] = [18.8, 84.5]; // Midpoint between AP and Odisha coast
      setUserLocation(coords);
      setMapZoom(7);
      updateNearest(coords[0], coords[1], shelters, "ALL");
    }
  };

  // Called when user clicks a shelter pin on the map
  const handleSelectShelter = (s: Shelter) => {
    setSelectedShelter(s);
    setSelectedMapPoint(null);
  };

  // Called when user clicks an arbitrary location on the map
  const handleSelectLocation = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    updateNearest(lat, lng, shelters, selectedRegion);

    // If user is in manual fallback mode, route engine uses this tapped point (FR-P5)
    if (isManualQuery) {
      selectManualFallbackPoint(lat, lng);
    }

    // Compute the closest shelter to this exact clicked coordinate
    const closest = findNearestShelters(lat, lng, shelters, 1)[0] || null;
    setSelectedMapPoint({
      lat,
      lng,
      nearest: closest,
    });
    setSelectedShelter(null);
  };

  const handleClearSelection = () => {
    setSelectedShelter(null);
    setSelectedMapPoint(null);
  };

  const t = translations[lang];

  const displayedShelters =
    selectedRegion === "ALL"
      ? shelters
      : shelters.filter((s) => s.state === selectedRegion);

  // Distance from query location to selected shelter
  const selectedShelterDistance = selectedShelter
    ? calculateDistanceToShelter(
        userLocation[0],
        userLocation[1],
        selectedShelter
      )
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Map Header Card */}
      <div className="glass-header-panel rounded-[40px] p-6 sm:p-7 relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl glass-l3 text-[#007AFF] flex items-center justify-center shadow-xs">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {t.navMap}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                East Coast Coastal Multi-Hazard Vector Topology & Real-Time Proximity Analysis
              </p>
            </div>
          </div>

          {/* Region Toggle Pill - Fixed Single-Row Alignment */}
          <div className="glass-l1 rounded-full p-1.5 border border-white/50 shadow-inner flex flex-nowrap items-center gap-1.5 text-xs overflow-x-auto [scrollbar-width:none] shrink-0">
            <button
              onClick={() => handleRegionChange("ALL")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition whitespace-nowrap shrink-0 ${
                selectedRegion === "ALL"
                  ? "glass-pill-tab-all-active text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              All Shelters ({shelters.length})
            </button>
            <button
              onClick={() => handleRegionChange("ODISHA")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                selectedRegion === "ODISHA"
                  ? "glass-pill-tab-odisha-active text-white shadow-sm"
                  : "text-slate-600 hover:text-sky-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Odisha Coast</span>
            </button>
            <button
              onClick={() => handleRegionChange("ANDHRA_PRADESH")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                selectedRegion === "ANDHRA_PRADESH"
                  ? "glass-pill-tab-ap-active text-white shadow-sm"
                  : "text-slate-600 hover:text-amber-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Andhra Pradesh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Consent & Geolocation Warnings Slot (FR-U4 Above-Map Slot) */}
      <AboveMapSlot
        onPickPointOnMap={() => {
          const el = document.getElementById("ashraysetu-map-container");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {/* Main Interactive Map (FR-U5 responsive height) */}
      <div className="h-[min(480px,60svh)] w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border border-white/60 glass-l2 p-2 shadow-2xl relative">
        <div
          className="w-full h-full rounded-[26px] overflow-hidden relative"
          id="ashraysetu-map-container"
        >
          <LeafletMapComponent
            shelters={displayedShelters}
            userCoords={userLocation}
            zoom={mapZoom}
            selectedShelterId={selectedShelter?.id}
            onSelectLocation={handleSelectLocation}
            onSelectShelter={handleSelectShelter}
            liveFix={currentFix}
            follow={follow}
            onFollowChange={setFollow}
            navTarget={target}
            navRoute={routeResult}
            guidanceMode={guidanceMode}
            routeProgress={routeProgress}
            isBatterySaver={isBatterySaver}
            fitRouteRequest={fitRouteNonce}
          />

          {/* Map Overlay Controls (FR-U3) */}
          <LiveLocationControls
            onScrollToConsent={() => {
              const el = document.getElementById("live-gps-above-slot");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                const btn = el.querySelector<HTMLButtonElement>("button");
                btn?.focus();
              }
            }}
            onScrollToPanel={() => {
              const el = document.getElementById("live-gps-below-slot");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
          />

          {/* Map Legend: !absolute to override glass-l2 relative (2.3, FR-U3) */}
          <div className="!absolute bottom-3 left-3 z-[1000] glass-l2 rounded-2xl px-4 py-2.5 text-[11px] text-slate-800 space-y-1.5 shadow-xl border border-white/70 pointer-events-none backdrop-blur-md">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm inline-block" />
              <span>Odisha Shelters (Kendrapara)</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm inline-block" />
              <span>Andhra Pradesh Shelters (12 Coastal Districts)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse shadow-sm" />
              <span className="text-slate-900">Your Query Position (Click map to move)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" />
              <span>Gold Marker = Selected Shelter Point</span>
            </div>

            {/* New live GPS and navigation layers (FR-U3) */}
            <div className="flex items-center gap-2 font-semibold text-[#007AFF]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] inline-block shadow-sm ring-2 ring-white" />
              <span>Live Location (Your Device)</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm ring-2 ring-emerald-300" />
              <span>Emerald Ring = Target Safe Shelter</span>
            </div>
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <span className="w-4 h-1 rounded bg-[#007AFF] inline-block shadow-xs" />
              <span>Route Line (Road / Direct Guide)</span>
            </div>
            <div className="flex items-center gap-2 font-medium text-sky-800">
              <span className="w-3 h-2 rounded bg-sky-400/50 border border-sky-600 inline-block" />
              <span>Storm-surge area (model, Kendrapara coast only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Navigation & Safe Shelter Dossier (FR-U4 Below-Map Slot) */}
      <BelowMapSlot
        onFitRoute={() => setFitRouteNonce((prev) => prev + 1)}
      />

      {/* ========================================================
          SELECTED LOCATION DATA DOSSIER (Rendered on Map Point Click)
          ======================================================== */}
      {selectedShelter && (
        <div className="glass-l2 rounded-[32px] sm:rounded-[36px] p-6 sm:p-7 border border-white/70 shadow-2xl relative overflow-hidden space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-l1 text-amber-800 border border-amber-300/60 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Selected Map Location Data
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    selectedShelter.state === "ANDHRA_PRADESH"
                      ? "bg-amber-100/90 text-amber-900 border border-amber-300/70"
                      : "bg-sky-100/90 text-sky-900 border border-sky-300/70"
                  }`}
                >
                  {selectedShelter.state === "ANDHRA_PRADESH"
                    ? "Andhra Pradesh Coast"
                    : "Odisha Coast"}
                </span>
                <span className="glass-l1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold text-slate-700 border border-white/60">
                  ID: {selectedShelter.id}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {selectedShelter.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>
                  {selectedShelter.district} District • {selectedShelter.block_name} Block
                  {selectedShelter.gram_panchayat ? ` • Gram Panchayat: ${selectedShelter.gram_panchayat}` : ""}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 rounded-full glass-l1 hover:bg-white/60 text-slate-500 hover:text-slate-950 transition border border-white/60 self-start cursor-pointer shadow-xs"
              title="Close Location Data"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location Data 4-Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GPS & Distance */}
            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                <Compass className="w-4 h-4 text-[#007AFF]" />
                <span>GPS Coordinates</span>
              </div>
              <div className="text-base font-black text-slate-950 font-mono">
                {selectedShelter.latitude.toFixed(4)}° N, {selectedShelter.longitude.toFixed(4)}° E
              </div>
              <div className="text-xs text-emerald-700 font-bold font-mono">
                {selectedShelterDistance != null ? `${selectedShelterDistance} km from query position` : "Selected Point"}
              </div>
            </div>

            {/* Capacity & Saturation */}
            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Capacity & Saturation</span>
              </div>
              <div className="text-base font-black text-slate-950 font-mono">
                {selectedShelter.current_occupancy} / {selectedShelter.capacity_persons} Persons
              </div>
              <div className="w-full h-1.5 glass-l2 rounded-full overflow-hidden border border-white/60">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (selectedShelter.current_occupancy /
                          selectedShelter.capacity_persons) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500">
                {selectedShelter.capacity_persons - selectedShelter.current_occupancy} spots remaining
              </div>
            </div>

            {/* Disaster Amenities */}
            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-2 shadow-xs text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider font-mono">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Resilience Amenities</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Solar Backup: <strong>{selectedShelter.has_solar_backup ? "Operational (24h)" : "Grid Only"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    Potable Water: <strong>{selectedShelter.has_borewell ? "Deep Borewell" : "Supply Tank"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* In-Charge Officer & Emergency Contact */}
            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-1.5 shadow-xs text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-wider font-mono">
                <Phone className="w-4 h-4 text-rose-600" />
                <span>Shelter Field Officer</span>
              </div>
              <div className="font-bold text-slate-950 text-sm">
                {selectedShelter.incharge_name}
              </div>
              <div className="font-mono text-slate-700 font-semibold">
                Tel: <a href={`tel:${selectedShelter.incharge_phone}`} className="text-[#007AFF] hover:underline">{selectedShelter.incharge_phone}</a>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                State EOC Helpline: 1070 / 1077
              </div>
            </div>
          </div>

          {/* Action Links Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShelter.latitude},${selectedShelter.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Navigate in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <Link
              href={`/inventory?shelter=${selectedShelter.id}`}
              className="glass-l1 px-4 py-2 rounded-xl border border-white/60 text-slate-800 hover:text-slate-950 hover:bg-white/60 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Building className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Inspect Shelter Stocks</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setUserLocation([selectedShelter.latitude, selectedShelter.longitude]);
                updateNearest(
                  selectedShelter.latitude,
                  selectedShelter.longitude,
                  shelters,
                  selectedRegion
                );
              }}
              className="glass-l1 px-4 py-2 rounded-xl border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/60 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <Crosshair className="w-3.5 h-3.5 text-rose-600" />
              <span>Set as Active Query Origin</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Custom Map Point Location Dossier */}
      {selectedMapPoint && !selectedShelter && (
        <div className="glass-l2 rounded-[32px] sm:rounded-[36px] p-6 sm:p-7 border border-white/70 shadow-2xl relative overflow-hidden space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-l1 text-rose-700 border border-rose-300/60 text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Selected Geographic Map Coordinates
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-950 mt-1">
                Custom Point: {selectedMapPoint.lat.toFixed(5)}° N, {selectedMapPoint.lng.toFixed(5)}° E
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Geodesic calculation point updated. Proximity calculations and turf routing computed from this pin.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 rounded-full glass-l1 hover:bg-white/60 text-slate-500 hover:text-slate-950 transition border border-white/60 cursor-pointer shadow-xs"
              title="Close Location Data"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-1 shadow-xs">
              <div className="text-slate-500 font-semibold">Closest Designated Shelter:</div>
              {selectedMapPoint.nearest ? (
                <div>
                  <div className="font-bold text-slate-950 text-sm">
                    {selectedMapPoint.nearest.name}
                  </div>
                  <div className="text-slate-600">
                    {selectedMapPoint.nearest.district} • {selectedMapPoint.nearest.distanceKm} km away
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectShelter(selectedMapPoint.nearest!)}
                    className="mt-2 text-xs font-bold text-[#007AFF] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View this shelter's full data →</span>
                  </button>
                </div>
              ) : (
                <div className="text-slate-500">No shelters found nearby.</div>
              )}
            </div>

            <div className="glass-l1 p-4 rounded-2xl border border-white/60 space-y-1 shadow-xs">
              <div className="text-slate-500 font-semibold">Coastal Multi-Hazard Status:</div>
              <div className="text-slate-800 font-medium">
                Bay of Bengal East Coast Vector Inundation Analysis Active (Turf.js geodesic buffering).
              </div>
              <div className="text-slate-500 text-[11px] pt-1">
                Click any specific shelter pin to review designated capacity & emergency logistics.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nearest Shelters Proximity List (computed via Turf.js) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-sky-700 uppercase tracking-wider px-1">
          <div className="w-6 h-6 rounded-lg glass-l3 flex items-center justify-center text-sky-600">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <span>{t.nearestShelters} (Turf.js Geodesic Calculations)</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {nearestList.map((s, idx) => {
            const isAP = s.state === "ANDHRA_PRADESH";
            const isSelected = selectedShelter?.id === s.id;

            return (
              <div
                key={s.id}
                onClick={() => handleSelectShelter(s)}
                className={`p-5 rounded-[28px] glass-l2 border space-y-3 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? "border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/10"
                    : "border-white/60 hover:border-[#007AFF]/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                      isAP
                        ? "bg-amber-100/90 text-amber-900 border border-amber-300/70"
                        : "bg-sky-100/90 text-sky-900 border border-sky-300/70"
                    }`}
                  >
                    #{idx + 1} • {isAP ? "Andhra Pradesh" : "Odisha"}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 glass-l1 px-2.5 py-0.5 rounded-lg border border-emerald-300/50">
                    {s.distanceKm} km away
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-950 line-clamp-1">
                    {s.name}
                  </h4>
                  <div className="text-xs text-slate-600 font-medium">
                    {s.district} • {s.block_name}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">Occupancy:</span>
                  <span className="font-bold text-slate-900 glass-l1 px-2 py-0.5 rounded-md">
                    {s.current_occupancy} / {s.capacity_persons}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>In-Charge: <strong className="text-slate-800">{s.incharge_name}</strong></span>
                  <span className="text-[#007AFF] text-[11px] font-bold">Select Point →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
