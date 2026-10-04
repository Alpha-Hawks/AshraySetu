// Leaflet map layers for device dot, accuracy circle, target ring, route, and follow camera
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  Marker,
  Circle,
  CircleMarker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useReducedMotion } from "framer-motion";
import type { NavFix } from "@/lib/geo/navMath";
import type { RankedCandidate } from "@/lib/geo/safeShelter";
import type { RouteResult } from "@/lib/routing/types";
import {
  FOLLOW_DEADZONE_RATIO,
  FOLLOW_PAN_MIN_INTERVAL_MS,
  SNAP_SEGMENT_MIN_M,
} from "@/lib/geo/navConfig";

interface LiveLocationLayersProps {
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

export default function LiveLocationLayers({
  liveFix,
  follow = true,
  onFollowChange,
  navTarget,
  navRoute,
  guidanceMode = "straightLine",
  routeProgress,
  isBatterySaver = false,
  fitRouteRequest,
}: LiveLocationLayersProps) {
  const map = useMap();
  const prefersReduced = useReducedMotion();
  const isControllerMoveRef = useRef(false);
  const lastPanTimeRef = useRef(0);
  const hasFirstCenteredRef = useRef(false);

  // Detect user manual pan/zoom to disable follow-me
  useMapEvents({
    movestart() {
      if (!isControllerMoveRef.current && follow) {
        onFollowChange?.(false);
      }
    },
    zoomstart() {
      if (!isControllerMoveRef.current && follow) {
        onFollowChange?.(false);
      }
    },
    moveend() {
      isControllerMoveRef.current = false;
    },
  });

  // Follow-me camera controller
  useEffect(() => {
    if (!liveFix) return;

    const fixCoords: [number, number] = [liveFix.lat, liveFix.lng];

    // Initial first fix auto-center at zoom >= 15
    if (!hasFirstCenteredRef.current) {
      hasFirstCenteredRef.current = true;
      isControllerMoveRef.current = true;
      const targetZoom = isBatterySaver
        ? 15
        : Math.max(map.getZoom(), 15);
      map.setView(fixCoords, targetZoom, {
        animate: !prefersReduced && !isBatterySaver,
      });
      return;
    }

    if (!follow) return;

    // Follow deadzone check: pan only if point leaves center area
    const now = Date.now();
    if (now - lastPanTimeRef.current < FOLLOW_PAN_MIN_INTERVAL_MS) {
      return;
    }

    const size = map.getSize();
    const point = map.latLngToContainerPoint(fixCoords);
    const minX = size.x * FOLLOW_DEADZONE_RATIO;
    const maxX = size.x * (1 - FOLLOW_DEADZONE_RATIO);
    const minY = size.y * FOLLOW_DEADZONE_RATIO;
    const maxY = size.y * (1 - FOLLOW_DEADZONE_RATIO);

    const isOutsideDeadzone =
      point.x < minX || point.x > maxX || point.y < minY || point.y > maxY;

    if (isOutsideDeadzone) {
      lastPanTimeRef.current = now;
      isControllerMoveRef.current = true;
      map.panTo(fixCoords, {
        animate: !prefersReduced && !isBatterySaver,
        duration: 0.8,
      });
    }
  }, [liveFix, follow, isBatterySaver, prefersReduced, map]);

  // Fit Route Nonce handler
  const prevFitNonceRef = useRef(fitRouteRequest);
  useEffect(() => {
    if (
      fitRouteRequest !== undefined &&
      fitRouteRequest !== prevFitNonceRef.current
    ) {
      prevFitNonceRef.current = fitRouteRequest;

      const points: L.LatLngExpression[] = [];
      if (liveFix) {
        points.push([liveFix.lat, liveFix.lng]);
      }
      if (navTarget) {
        points.push([
          navTarget.shelter.latitude,
          navTarget.shelter.longitude,
        ]);
      }
      if (navRoute && navRoute.geometry && navRoute.geometry.coordinates) {
        for (const coord of navRoute.geometry.coordinates) {
          points.push([coord[1], coord[0]]);
        }
      }

      if (points.length >= 2) {
        isControllerMoveRef.current = true;
        onFollowChange?.(false);
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [48, 48], animate: !prefersReduced });
      }
    }
  }, [fitRouteRequest, liveFix, navTarget, navRoute, onFollowChange, prefersReduced, map]);

  // Device DivIcon
  const deviceIcon = useMemo(() => {
    if (!liveFix) return null;

    const heading = liveFix.headingDeg;
    const hasHeading = heading !== null && Number.isFinite(heading);
    const coneHtml = hasHeading
      ? `<div class="live-heading-cone" style="transform: rotate(${heading}deg);"></div>`
      : "";

    const pulseClass = prefersReduced ? "" : "pulsing";

    const html = `
      <div class="live-device-marker">
        ${coneHtml}
        <div class="live-device-dot ${pulseClass}"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "live-device-divicon",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }, [liveFix, prefersReduced]);

  // Route Polyline coordinates
  const routeLatLngs = useMemo(() => {
    const activeRoute = navRoute;
    if (
      !activeRoute ||
      !activeRoute.geometry ||
      !activeRoute.geometry.coordinates
    ) {
      return null;
    }
    return activeRoute.geometry.coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    );
  }, [navRoute]);

  // Snap segment coordinates
  const snapSegmentLatLngs = useMemo(() => {
    if (
      !liveFix ||
      !routeProgress ||
      !routeProgress.snappedPoint ||
      guidanceMode === "straightLine"
    ) {
      return null;
    }
    const distToSnap = L.latLng(liveFix.lat, liveFix.lng).distanceTo(
      L.latLng(routeProgress.snappedPoint[0], routeProgress.snappedPoint[1])
    );
    if (distToSnap >= SNAP_SEGMENT_MIN_M) {
      return [
        [liveFix.lat, liveFix.lng] as [number, number],
        routeProgress.snappedPoint,
      ];
    }
    return null;
  }, [liveFix, routeProgress, guidanceMode]);

  // Straight line coordinates
  const straightLineLatLngs = useMemo(() => {
    if (!liveFix || !navTarget || guidanceMode !== "straightLine") {
      return null;
    }
    return [
      [liveFix.lat, liveFix.lng] as [number, number],
      [
        navTarget.shelter.latitude,
        navTarget.shelter.longitude,
      ] as [number, number],
    ];
  }, [liveFix, navTarget, guidanceMode]);

  return (
    <>
      {/* 1. Accuracy Circle */}
      {liveFix && (
        <Circle
          center={[liveFix.lat, liveFix.lng]}
          radius={liveFix.accuracyM}
          pathOptions={{
            color: "#007AFF",
            weight: 1,
            fillColor: "#007AFF",
            fillOpacity: 0.12,
            interactive: false,
          }}
        />
      )}

      {/* 2. Device Location Dot */}
      {liveFix && deviceIcon && (
        <Marker
          position={[liveFix.lat, liveFix.lng]}
          icon={deviceIcon}
          zIndexOffset={2000}
          keyboard={false}
          interactive={false}
        />
      )}

      {/* 3. Emerald Target Ring around Safe Shelter */}
      {navTarget && (
        <CircleMarker
          center={[
            navTarget.shelter.latitude,
            navTarget.shelter.longitude,
          ]}
          radius={18}
          pathOptions={{
            color: "#10B981", // Emerald
            weight: 3,
            fillColor: "transparent",
            fillOpacity: 0,
            interactive: false,
          }}
        />
      )}

      {/* 4. Road Route Polyline (White casing + Blue center) */}
      {routeLatLngs && (guidanceMode === "routed" || guidanceMode === "cachedRoute") && (
        <>
          <Polyline
            positions={routeLatLngs}
            pathOptions={{
              color: "#FFFFFF",
              weight: 9,
              opacity: 0.9,
              interactive: false,
            }}
          />
          <Polyline
            positions={routeLatLngs}
            pathOptions={{
              color: "#007AFF",
              weight: 5,
              opacity: 1,
              interactive: false,
            }}
          />
        </>
      )}

      {/* 5. Snap Segment to Mapped Road */}
      {snapSegmentLatLngs && (
        <Polyline
          positions={snapSegmentLatLngs}
          pathOptions={{
            color: "#64748B",
            weight: 2,
            dashArray: "4 6",
            opacity: 0.7,
            interactive: false,
          }}
        />
      )}

      {/* 6. Straight-Line Approximate Guidance Line */}
      {straightLineLatLngs && (
        <Polyline
          positions={straightLineLatLngs}
          pathOptions={{
            color: "#007AFF",
            weight: 3,
            dashArray: "10 10",
            opacity: 0.85,
            interactive: false,
          }}
        />
      )}
    </>
  );
}
