// OpenRouteService provider (FR-D3)
import { ROUTING_CONFIG } from "../config.js";
import { rateLimiter } from "../rateLimiter.js";
import {
  roundLngLat,
  roundLineStringCoordinates,
  normalizeOrsManeuver,
} from "./normalizer.js";

export const openRouteServiceProvider = {
  name: "openrouteservice",
  supportsAvoid: true,

  isAvailable() {
    return Boolean(process.env.ORS_API_KEY);
  },

  async route(request, timeoutMs) {
    if (!rateLimiter.checkOrsAvailable(false)) {
      return { error: "QUOTA_EXHAUSTED", status: 429 };
    }

    const { from, to, profile, avoid } = request;
    const orsProfile = profile === "car" ? "driving-car" : "foot-walking";
    const url = `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`;

    const bodyPayload = {
      coordinates: [from, to],
      radiuses: [ROUTING_CONFIG.SNAP_RADIUS_METERS, ROUTING_CONFIG.SNAP_RADIUS_METERS],
      instructions: true,
      preference: "recommended",
    };

    if (avoid && (avoid.type === "Polygon" || avoid.type === "MultiPolygon")) {
      bodyPayload.options = {
        avoid_polygons: avoid,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
          "User-Agent": ROUTING_CONFIG.USER_AGENT,
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const orsCode = errorData.error?.code;

        // Upstream rate limit or quota
        if (resp.status === 429 || resp.status === 403) {
          const retryAfter = resp.headers.get("retry-after") || 60;
          return { error: "QUOTA_EXHAUSTED", status: resp.status, retryAfter };
        }

        // Input errors: 2010 (Could not find point within radius), 2004, 2009
        if (orsCode === 2010 || orsCode === 2004 || orsCode === 2009 || resp.status === 400) {
          return { error: "INPUT_ERROR", code: orsCode || "NO_ROAD_NEARBY" };
        }

        return { error: "UPSTREAM_ERROR", status: resp.status };
      }

      const data = await resp.json();
      if (!data.features || data.features.length === 0) {
        return { error: "INPUT_ERROR", code: "NO_ROUTE" };
      }

      const feature = data.features[0];
      const summary = feature.properties?.summary || {};
      const rawCoords = feature.geometry?.coordinates || [];
      const roundedCoords = roundLineStringCoordinates(rawCoords);
      const snappedFrom = roundedCoords.length > 0 ? roundedCoords[0] : roundLngLat(from);

      const steps = [];
      const segments = feature.properties?.segments || [];
      if (segments.length > 0 && segments[0].steps) {
        for (const st of segments[0].steps) {
          const loc =
            st.way_points && rawCoords[st.way_points[0]]
              ? roundLngLat(rawCoords[st.way_points[0]])
              : roundLngLat(from);

          steps.push({
            maneuver: normalizeOrsManeuver(st.type),
            location: loc,
            name: st.name || "",
            distanceM: Math.round(st.distance || 0),
            durationS: Math.round(st.duration || 0),
          });
        }
      }

      return {
        success: true,
        result: {
          provider: "OpenRouteService",
          attribution: "© OpenStreetMap contributors · OpenRouteService",
          distanceM: Math.round(summary.distance || 0),
          durationS: Math.round(summary.duration || 0),
          geometry: {
            type: "LineString",
            coordinates: roundedCoords,
          },
          steps,
          snappedFrom,
          hazardAvoided: Boolean(avoid),
          warnings: [],
          fetchedAt: Date.now(),
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async matrix(from, toList, profile, timeoutMs) {
    if (!rateLimiter.checkOrsAvailable(true)) {
      return { error: "QUOTA_EXHAUSTED", status: 429 };
    }

    const orsProfile = profile === "car" ? "driving-car" : "foot-walking";
    const url = `https://api.openrouteservice.org/v2/matrix/${orsProfile}`;

    const locations = [from, ...toList];
    const destinations = toList.map((_, idx) => idx + 1);

    const bodyPayload = {
      locations,
      sources: [0],
      destinations,
      metrics: ["duration", "distance"],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
          "User-Agent": ROUTING_CONFIG.USER_AGENT,
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 403) {
          return { error: "QUOTA_EXHAUSTED", status: resp.status };
        }
        return { error: "UPSTREAM_ERROR", status: resp.status };
      }

      const data = await resp.json();
      const durations = data.durations ? data.durations[0] : [];
      const distances = data.distances ? data.distances[0] : [];

      return {
        success: true,
        result: {
          provider: "OpenRouteService",
          durationS: durations.map((d) => (d !== null ? Math.round(d) : null)),
          distanceM: distances.map((d) => (d !== null ? Math.round(d) : null)),
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
