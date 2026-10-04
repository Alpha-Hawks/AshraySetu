// FOSSGIS public demonstration routing provider (FR-D3)
import { ROUTING_CONFIG } from "../config.js";
import {
  roundLngLat,
  roundLineStringCoordinates,
  normalizeOsrmManeuver,
} from "./normalizer.js";

export const fossgisProvider = {
  name: "fossgis",
  supportsAvoid: false,

  isAvailable() {
    return (
      process.env.ROUTING_ALLOW_PUBLIC_DEMO === "1" ||
      process.env.VERCEL_ENV !== "production"
    );
  },

  async route(request, timeoutMs) {
    const { from, to, profile } = request;
    const serverPath = profile === "car" ? "routed-car" : "routed-foot";
    const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
    const url = `https://routing.openstreetmap.de/${serverPath}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&radiuses=${ROUTING_CONFIG.SNAP_RADIUS_METERS};${ROUTING_CONFIG.SNAP_RADIUS_METERS}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": ROUTING_CONFIG.USER_AGENT },
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 400 || errorData.code === "NoRoute" || errorData.code === "NoSegment") {
          return { error: "INPUT_ERROR", code: errorData.code || "NO_ROUTE" };
        }
        if (resp.status === 429) {
          const retryAfter = resp.headers.get("retry-after") || 60;
          return { error: "QUOTA_EXHAUSTED", status: 429, retryAfter };
        }
        return { error: "UPSTREAM_ERROR", status: resp.status };
      }

      const data = await resp.json();
      if (!data.routes || data.routes.length === 0) {
        return { error: "INPUT_ERROR", code: "NO_ROUTE" };
      }

      const route = data.routes[0];
      const rawCoords = route.geometry.coordinates || [];
      const roundedCoords = roundLineStringCoordinates(rawCoords);
      const snappedFrom = roundedCoords.length > 0 ? roundedCoords[0] : roundLngLat(from);

      const steps = [];
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        for (const st of route.legs[0].steps) {
          steps.push({
            maneuver: normalizeOsrmManeuver(st),
            location: roundLngLat(st.maneuver.location || from),
            name: st.name || "",
            distanceM: Math.round(st.distance || 0),
            durationS: Math.round(st.duration || 0),
          });
        }
      }

      return {
        success: true,
        result: {
          provider: "FOSSGIS OSM",
          attribution: "© OpenStreetMap contributors · Routing: FOSSGIS e.V.",
          distanceM: Math.round(route.distance),
          durationS: Math.round(route.duration),
          geometry: {
            type: "LineString",
            coordinates: roundedCoords,
          },
          steps,
          snappedFrom,
          hazardAvoided: false,
          warnings: [],
          fetchedAt: Date.now(),
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },

  async matrix(from, toList, profile, timeoutMs) {
    const serverPath = profile === "car" ? "routed-car" : "routed-foot";
    const allCoords = [from, ...toList].map((c) => `${c[0]},${c[1]}`).join(";");
    const destinations = toList.map((_, idx) => idx + 1).join(";");
    const url = `https://routing.openstreetmap.de/${serverPath}/table/v1/driving/${allCoords}?sources=0&destinations=${destinations}&annotations=duration,distance`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": ROUTING_CONFIG.USER_AGENT },
        signal: controller.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return { error: "QUOTA_EXHAUSTED", status: 429 };
        }
        return { error: "UPSTREAM_ERROR", status: resp.status };
      }

      const data = await resp.json();
      const durations = data.durations ? data.durations[0] : [];
      const distances = data.distances ? data.distances[0] : [];

      return {
        success: true,
        result: {
          provider: "FOSSGIS OSM",
          durationS: durations.map((d) => (d !== null ? Math.round(d) : null)),
          distanceM: distances.map((d) => (d !== null ? Math.round(d) : null)),
        },
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
