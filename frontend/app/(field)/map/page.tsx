"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  Waves,
  Shield,
  Users,
  Compass,
  Building,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { db, initializeDatabase, type Shelter } from "@/lib/db/dexie";
import { findNearestShelters } from "@/lib/geo/turfCalculations";
import { translations, type Language } from "@/lib/locales/translations";

// Dynamically import Leaflet map component to prevent SSR 'window is not defined' errors
const LeafletMapComponent = dynamic(
  () => import("@/components/map/LeafletMapCore"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 text-xs">
        Loading offline GIS vector engine...
      </div>
    ),
  }
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

  const handleSelectLocation = (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    updateNearest(lat, lng, shelters, selectedRegion);
  };

  const t = translations[lang];

  const displayedShelters =
    selectedRegion === "ALL"
      ? shelters
      : shelters.filter((s) => s.state === selectedRegion);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Map Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t.navMap}
              </h1>
              <p className="text-xs text-slate-400">
                East Coast Coastal Multi-Hazard Vector Topology & Real-Time Proximity Analysis
              </p>
            </div>
          </div>

          {/* Region Toggle Pill */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => handleRegionChange("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedRegion === "ALL"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Shelters ({shelters.length})
            </button>
            <button
              onClick={() => handleRegionChange("ODISHA")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedRegion === "ODISHA"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-sky-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Odisha Coast</span>
            </button>
            <button
              onClick={() => handleRegionChange("ANDHRA_PRADESH")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                selectedRegion === "ANDHRA_PRADESH"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Andhra Pradesh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map */}
      <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
        <LeafletMapComponent
          shelters={displayedShelters}
          userCoords={userLocation}
          zoom={mapZoom}
          onSelectLocation={handleSelectLocation}
        />
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Odisha Shelters (Kendrapara)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Andhra Pradesh Shelters (12 Coastal Districts)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>Your Query Position (Click map to move)</span>
          </div>
        </div>
      </div>

      {/* Nearest Shelters Proximity List (computed via Turf.js) */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5" />
          <span>{t.nearestShelters} (Turf.js Geodesic Calculations)</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {nearestList.map((s, idx) => {
            const isAP = s.state === "ANDHRA_PRADESH";
            return (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 shadow-md hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      isAP
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    #{idx + 1} • {isAP ? "Andhra Pradesh" : "Odisha"}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {s.distanceKm} km away
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {s.name}
                  </h4>
                  <div className="text-xs text-slate-400">
                    {s.district} • {s.block_name}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span>Occupancy:</span>
                  <span className="font-semibold text-white">
                    {s.current_occupancy} / {s.capacity_persons}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  In-Charge: {s.incharge_name} ({s.incharge_phone})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
