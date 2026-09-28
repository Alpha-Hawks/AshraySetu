"use client";

import React, { useEffect } from "react";
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

interface LeafletMapCoreProps {
  shelters: Shelter[];
  userCoords: [number, number];
  zoom?: number;
  onSelectLocation: (lat: number, lng: number) => void;
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

function MapRecenter({ coords, zoom }: { coords: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom || map.getZoom(), { animate: true });
  }, [coords, zoom, map]);
  return null;
}

export default function LeafletMapCore({
  shelters,
  userCoords,
  zoom = 10,
  onSelectLocation,
}: LeafletMapCoreProps) {
  const surgeZone = generateSurgeInundationZone(3.5);

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

      {/* User / Volunteer Location Pin */}
      <Marker position={userCoords} icon={userIcon}>
        <Popup>
          <div className="text-xs p-1 text-slate-900">
            <strong className="block text-rose-700">Field Volunteer / Query Location</strong>
            <div>Lat: {userCoords[0].toFixed(4)}</div>
            <div>Lng: {userCoords[1].toFixed(4)}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Click anywhere on map to reposition calculation point
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Cyclone Shelter Pins */}
      {shelters.map((shelter) => {
        const isAP = shelter.state === "ANDHRA_PRADESH";
        const icon = isAP ? apIcon : odishaIcon;

        return (
          <Marker
            key={shelter.id}
            position={[shelter.latitude, shelter.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="text-xs p-1 text-slate-900 space-y-1 min-w-[190px]">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isAP
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-sky-100 text-sky-900 border border-sky-300"
                    }`}
                  >
                    {isAP ? "Andhra Pradesh" : "Odisha"}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {shelter.district}
                  </span>
                </div>

                <strong className="text-slate-900 block text-xs font-bold leading-snug">
                  {shelter.name}
                </strong>

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
                  In-Charge: {shelter.incharge_name} ({shelter.incharge_phone})
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
