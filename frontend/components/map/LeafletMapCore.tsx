"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Shelter } from "@/lib/db/dexie";
import { generateSurgeInundationZone } from "@/lib/geo/turfCalculations";
import LiveLocationLayers from "./LiveLocationLayers";
import type { NavFix } from "@/lib/geo/navMath";
import type { RankedCandidate } from "@/lib/geo/safeShelter";
import type { RouteResult } from "@/lib/routing/types";

// Fix Leaflet default icon issues in React
const odishaIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const apIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [45, 45],
});

export interface LeafletMapCoreProps {
  shelters: Shelter[];
  userCoords: [number, number];
  zoom?: number;
  selectedShelterId?: string | null;
  onSelectLocation: (lat: number, lng: number) => void;
  onSelectShelter?: (shelter: Shelter) => void;
  // Optional Live GPS props (FR-U2)
  liveFix?: NavFix | null;
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  navTarget?: RankedCandidate | null;
  navRoute?: RouteResult | null;
  guidanceMode?: "straightLine" | "routed" | "cachedRoute";
  routeProgress?: {
    remainingDistanceM: number;
    remainingDurationS: number;
    snappedPoint: [number, number];
  } | null;
  isBatterySaver?: boolean;
  fitRouteRequest?: number;
}

function LocationPicker({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Split MapRecenter (FR-U2):
// - coords-only change calls setView(coords, map.getZoom()) keeping user's zoom
// - zoom prop change applies the zoom
// - region presets change both
function MapRecenter({ coords, zoom }: { coords: [number, number]; zoom?: number }) {
  const map = useMap();
  const prevZoomRef = useRef(zoom);
  const prevCoordsRef = useRef(coords);

  useEffect(() => {
    const zoomChanged = zoom !== undefined && zoom !== prevZoomRef.current;
    const coordsChanged =
      coords[0] !== prevCoordsRef.current[0] || coords[1] !== prevCoordsRef.current[1];

    if (zoomChanged && coordsChanged) {
      map.setView(coords, zoom, { animate: true });
    } else if (zoomChanged) {
      map.setZoom(zoom, { animate: true });
    } else if (coordsChanged) {
      map.setView(coords, map.getZoom(), { animate: true });
    }

    prevZoomRef.current = zoom;
    prevCoordsRef.current = coords;
  }, [coords, zoom, map]);

  return null;
}

function MapSelectedFocus({
  selectedCoords,
}: {
  selectedCoords?: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedCoords) {
      map.panTo(selectedCoords, { animate: true, duration: 0.8 });
    }
  }, [selectedCoords, map]);
  return null;
}

function MapGenieResize() {
  const map = useMap();
  useEffect(() => {
    let debounceTimer: any = null;
    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 100);
    };

    window.addEventListener("genie-transition-finished", handleResize);
    window.addEventListener("resize", handleResize);

    const container = map.getContainer();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && container) {
      ro = new ResizeObserver(handleResize);
      ro.observe(container);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("genie-transition-finished", handleResize);
      window.removeEventListener("resize", handleResize);
      if (ro) ro.disconnect();
    };
  }, [map]);
  return null;
}

export default function LeafletMapCore({
  shelters,
  userCoords,
  zoom = 10,
  selectedShelterId,
  onSelectLocation,
  onSelectShelter,
  liveFix,
  follow,
  onFollowChange,
  navTarget,
  navRoute,
  guidanceMode,
  routeProgress,
  isBatterySaver,
  fitRouteRequest,
}: LeafletMapCoreProps) {
  // Memoize surge zone buffer (FR-U2)
  const surgeZone = useMemo(() => generateSurgeInundationZone(3.5), []);

  const selectedShelterObj = shelters.find((s) => s.id === selectedShelterId);
  // Memoize selectedCoords on [selectedShelterId, lat, lng] (FR-U2)
  const selectedCoords: [number, number] | null = useMemo(() => {
    return selectedShelterObj
      ? [selectedShelterObj.latitude, selectedShelterObj.longitude]
      : null;
  }, [selectedShelterId, selectedShelterObj?.latitude, selectedShelterObj?.longitude]);

  return (
    <MapContainer
      center={userCoords}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationPicker onSelect={onSelectLocation} />
      <MapRecenter coords={userCoords} zoom={zoom} />
      <MapSelectedFocus selectedCoords={selectedCoords} />
      <MapGenieResize />

      {/* 3.5m Storm Surge Inundation Polygon (Turf.js buffer) */}
      <GeoJSON
        data={surgeZone as any}
        style={() => ({
          color: "#0284C7",
          weight: 2,
          fillColor: "#38BDF8",
          fillOpacity: 0.25,
        })}
      />

      {/* Live Location & Navigation Layers (FR-U1, FR-U2) */}
      <LiveLocationLayers
        liveFix={liveFix}
        follow={follow}
        onFollowChange={onFollowChange}
        navTarget={navTarget}
        navRoute={navRoute}
        guidanceMode={guidanceMode}
        routeProgress={routeProgress}
        isBatterySaver={isBatterySaver}
        fitRouteRequest={fitRouteRequest}
      />

      {/* User / Volunteer Location Pin */}
      <Marker position={userCoords} icon={userIcon}>
        <Popup>
          <div className="text-xs p-1 text-slate-900">
            <strong className="block text-rose-700">Field Volunteer / Query Location</strong>
            <div>Lat: {userCoords[0].toFixed(4)}° N</div>
            <div>Lng: {userCoords[1].toFixed(4)}° E</div>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              Click anywhere on map to select and calculate proximity
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Cyclone Shelter Pins */}
      {shelters.map((shelter) => {
        const isAP = shelter.state === "ANDHRA_PRADESH";
        const isSelected = selectedShelterId === shelter.id;
        const icon = isSelected ? selectedIcon : isAP ? apIcon : odishaIcon;

        return (
          <Marker
            key={shelter.id}
            position={[shelter.latitude, shelter.longitude]}
            icon={icon}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => {
                onSelectShelter?.(shelter);
              },
            }}
          >
            <Popup>
              <div className="text-xs p-1.5 text-slate-900 space-y-1.5 min-w-[210px]">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      isAP
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-sky-100 text-sky-900 border border-sky-300"
                    }`}
                  >
                    {isAP ? "Andhra Pradesh" : "Odisha"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 font-bold">
                    {shelter.district}
                  </span>
                </div>

                <strong className="text-slate-950 block text-xs font-bold leading-snug">
                  {shelter.name}
                </strong>

                <div className="text-[11px] text-slate-600 font-mono">
                  {shelter.latitude.toFixed(4)}° N, {shelter.longitude.toFixed(4)}° E
                </div>

                <div className="text-[11px] text-slate-700">
                  Block: <strong>{shelter.block_name}</strong>
                  {shelter.gram_panchayat ? ` (${shelter.gram_panchayat})` : ""}
                </div>

                <div className="text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Occupancy:</span>
                  <strong>
                    {shelter.current_occupancy} / {shelter.capacity_persons}
                  </strong>
                </div>

                <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-200">
                  In-Charge: <strong>{shelter.incharge_name}</strong> ({shelter.incharge_phone})
                </div>

                <button
                  type="button"
                  onClick={() => onSelectShelter?.(shelter)}
                  className="w-full mt-1.5 py-1 px-2 rounded-lg bg-[#007AFF] text-white text-[11px] font-bold hover:bg-[#0062cc] transition shadow-xs cursor-pointer text-center block"
                >
                  ✓ Show Detailed Location Data
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
