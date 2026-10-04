import * as turf from "@turf/turf";
const turfAny = turf as any;
import { getSurgeZone } from "./safeShelter.ts";
import {
  COMMIT_MIN_INTERVAL_MS,
  COMMIT_MIN_MOVE_M,
  COMMIT_ACCURACY_CHANGE,
  COMMIT_MAX_SILENCE_MS,
  ACCURACY_NAV_MAX_M,
  HEADING_MIN_SPEED_MPS,
  HEADING_MIN_MOVE_M,
  OFF_ROUTE,
  ARRIVAL,
  WALK_SPEED_KMH,
  PROVIDER_FOOT_KMH,
} from "./navConfig.ts";

export type LatLng = [number, number]; // [lat, lng] (Leaflet standard)
export type LngLat = [number, number]; // [lng, lat] (GeoJSON / Turf standard)

export interface NavFix {
  lat: number;
  lng: number;
  accuracyM: number;
  headingDeg: number | null;
  speedMps: number | null;
  timestamp: number;
  receivedAt: number;
  approximate: boolean;
}

/**
 * Coordinate conversions at explicit boundaries
 */
export function toLngLat(latLng: LatLng): LngLat {
  return [latLng[1], latLng[0]];
}

export function toLatLng(lngLat: LngLat): LatLng {
  return [lngLat[1], lngLat[0]];
}

/**
 * Fast geodesic distance in meters between two [lat, lng] points
 */
export function distanceM(a: LatLng, b: LatLng): number {
  const p1 = turf.point([a[1], a[0]]);
  const p2 = turf.point([b[1], b[0]]);
  return turf.distance(p1, p2, { units: "kilometers" }) * 1000;
}

/**
 * FR-T3. Commit filter rule
 * Drops out-of-order timestamps and throttles state commits.
 */
export function shouldCommitFix(
  current: NavFix,
  lastCommitted: NavFix | null,
  nowReceivedAt = performance.now()
): boolean {
  if (!lastCommitted) {
    return true;
  }

  // Drop out-of-order fixes
  if (current.timestamp <= lastCommitted.timestamp) {
    return false;
  }

  const elapsedMs = nowReceivedAt - lastCommitted.receivedAt;
  if (elapsedMs < COMMIT_MIN_INTERVAL_MS) {
    return false;
  }

  // Silence safety valve
  if (elapsedMs >= COMMIT_MAX_SILENCE_MS) {
    return true;
  }

  // Movement check
  const moveDist = distanceM(
    [current.lat, current.lng],
    [lastCommitted.lat, lastCommitted.lng]
  );
  if (moveDist >= COMMIT_MIN_MOVE_M) {
    return true;
  }

  // Accuracy change check
  const accChange =
    Math.abs(current.accuracyM - lastCommitted.accuracyM) /
    lastCommitted.accuracyM;
  if (accChange >= COMMIT_ACCURACY_CHANGE) {
    return true;
  }

  return false;
}

/**
 * FR-T5. Heading derivation
 */
export function computeHeading(
  current: {
    lat: number;
    lng: number;
    headingDeg: number | null;
    speedMps: number | null;
  },
  prev: { lat: number; lng: number } | null
): number | null {
  if (
    current.headingDeg !== null &&
    Number.isFinite(current.headingDeg) &&
    current.speedMps !== null &&
    current.speedMps >= HEADING_MIN_SPEED_MPS
  ) {
    return ((current.headingDeg % 360) + 360) % 360;
  }

  if (prev) {
    const moveDist = distanceM(
      [prev.lat, prev.lng],
      [current.lat, current.lng]
    );
    if (moveDist >= HEADING_MIN_MOVE_M) {
      const b = turfAny.bearing(
        turf.point([prev.lng, prev.lat]),
        turf.point([current.lng, current.lat])
      );
      return ((b % 360) + 360) % 360;
    }
  }

  return null;
}

/**
 * FR-D8. Off-route detection for a single fix
 */
export function evaluateFixOffRoute(
  fix: NavFix,
  routeLine: GeoJSON.LineString
): {
  isOff: boolean;
  distanceToRouteM: number;
  thresholdM: number;
} {
  const thresholdM = Math.min(
    OFF_ROUTE.maxM,
    Math.max(OFF_ROUTE.minM, OFF_ROUTE.accuracyFactor * fix.accuracyM)
  );

  const pt = turf.point([fix.lng, fix.lat]);
  const distanceToRouteM = turfAny.pointToLineDistance(pt, routeLine, {
    units: "meters",
  });

  const isOff =
    fix.accuracyM <= ACCURACY_NAV_MAX_M && distanceToRouteM > thresholdM;

  return { isOff, distanceToRouteM, thresholdM };
}

/**
 * FR-D8. Off-route consecutive history evaluator
 */
export function checkOffRouteHistory(
  samples: Array<{ isOff: boolean; receivedAt: number; accuracyM: number }>
): boolean {
  if (samples.length < OFF_ROUTE.consecutiveFixes) {
    return false;
  }

  const qualifying = samples.filter((s) => s.accuracyM <= ACCURACY_NAV_MAX_M);
  if (qualifying.length < OFF_ROUTE.consecutiveFixes) {
    return false;
  }

  const tail = qualifying.slice(-OFF_ROUTE.consecutiveFixes);
  const allOff = tail.every((s) => s.isOff);
  if (!allOff) return false;

  const durationMs = tail[tail.length - 1].receivedAt - tail[0].receivedAt;
  return durationMs >= OFF_ROUTE.minDurationMs;
}

/**
 * FR-D11. Arrival check
 */
export function checkArrivalAtShelter(
  fix: NavFix,
  shelterLat: number,
  shelterLng: number
): boolean {
  if (fix.accuracyM > ACCURACY_NAV_MAX_M) {
    return false;
  }

  const radiusM = Math.max(ARRIVAL.minRadiusM, fix.accuracyM);
  const dist = distanceM([fix.lat, fix.lng], [shelterLat, shelterLng]);
  return dist <= radiusM;
}

/**
 * FR-D6. Route progress calculation
 */
export function calculateRouteProgress(
  fixLatLng: LatLng,
  routeGeoJson: GeoJSON.LineString,
  totalDurationS: number,
  totalDistanceM: number,
  profile: "foot" | "car"
): {
  remainingDistanceM: number;
  remainingDurationS: number;
  snappedPoint: LatLng;
} {
  const pt = turf.point([fixLatLng[1], fixLatLng[0]]);
  const snapped = turfAny.nearestPointOnLine(routeGeoJson, pt);
  const snappedCoords: LatLng = [
    snapped.geometry.coordinates[1],
    snapped.geometry.coordinates[0],
  ];

  const totalLengthKm = turfAny.length(routeGeoJson, { units: "kilometers" });
  const locationKm = (snapped.properties?.location as number) || 0;
  const remainingKm = Math.max(0, totalLengthKm - locationKm);
  const remainingDistanceM = remainingKm * 1000;

  // Fraction remaining
  const fraction = totalLengthKm > 0 ? remainingKm / totalLengthKm : 0;
  let rawDurationS = totalDurationS * fraction;

  // Walking time scaling (PROVIDER_FOOT_KMH / WALK_SPEED_KMH = 5 / 3 = 1.6667)
  if (profile === "foot") {
    rawDurationS = rawDurationS * (PROVIDER_FOOT_KMH / WALK_SPEED_KMH);
  }

  const remainingDurationS = Math.max(0, Math.round(rawDurationS));

  return {
    remainingDistanceM,
    remainingDurationS,
    snappedPoint: snappedCoords,
  };
}

/**
 * FR-D9. Bearing and 8-point cardinal
 */
export function calculateBearingAndCardinal(
  from: LatLng,
  to: LatLng
): {
  bearingDeg: number;
  cardinalKey: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
} {
  const pFrom = turf.point([from[1], from[0]]);
  const pTo = turf.point([to[1], to[0]]);
  const b = turfAny.bearing(pFrom, pTo);
  const bearingDeg = Math.round(((b % 360) + 360) % 360);

  // 8-point cardinal: each sector is 45 degrees, centered on the cardinal
  const cardinals: Array<"N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"> = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
  ];
  const index = Math.round(bearingDeg / 45) % 8;
  return { bearingDeg, cardinalKey: cardinals[index] };
}

/**
 * Section 7.2. Number & distance formatting
 */
export function formatDistanceDisplay(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.round(meters / 10) * 10;
    return `${rounded} m`;
  }
  const km = meters / 1000;
  if (km < 100) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Section 7.2. Time formatting
 */
export function formatDurationDisplay(seconds: number): string {
  if (seconds < 60) {
    return "<1 min";
  }
  const totalMin = Math.ceil(seconds / 60);
  if (totalMin < 60) {
    return `${totalMin} min`;
  }
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours} h ${String(mins).padStart(2, "0")} min`;
}

/**
 * FR-D12. Deep links (Never include device coordinates!)
 */
export function buildExternalMapLinks(
  shelterLat: number,
  shelterLng: number,
  shelterName: string,
  profile: "foot" | "car"
): {
  google: string;
  apple: string;
  androidGeo: string;
} {
  const travelMode = profile === "foot" ? "walking" : "driving";
  const appleFlg = profile === "foot" ? "w" : "d";
  const encodedName = encodeURIComponent(shelterName);

  const google = `https://www.google.com/maps/dir/?api=1&destination=${shelterLat}%2C${shelterLng}&travelmode=${travelMode}&dir_action=navigate`;
  const apple = `https://maps.apple.com/?daddr=${shelterLat},${shelterLng}&dirflg=${appleFlg}`;
  const androidGeo = `geo:0,0?q=${shelterLat},${shelterLng}(${encodedName})`;

  return { google, apple, androidGeo };
}

/**
 * FR-D7. Hazard avoidance polygon builder
 * Clips surge polygon to bounding box of from/to padded by 2km.
 * Sends avoid polygon ONLY if neither endpoint is inside surge polygon,
 * clipped area is <= 200 sq km, and both bbox sides are <= 20km.
 */
export function buildSurgeAvoidPolygon(
  fromLngLat: LngLat,
  toLngLat: LngLat,
  surgePolygon = getSurgeZone()
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const pFrom = turf.point(fromLngLat);
  const pTo = turf.point(toLngLat);

  // If either endpoint is inside the surge polygon, send no avoid!
  if (
    turfAny.booleanPointInPolygon(pFrom, surgePolygon) ||
    turfAny.booleanPointInPolygon(pTo, surgePolygon)
  ) {
    return null;
  }

  // Bounding box of from & to
  const minLng = Math.min(fromLngLat[0], toLngLat[0]);
  const maxLng = Math.max(fromLngLat[0], toLngLat[0]);
  const minLat = Math.min(fromLngLat[1], toLngLat[1]);
  const maxLat = Math.max(fromLngLat[1], toLngLat[1]);

  // Pad by ~2 km (approx 0.018 degrees)
  const pad = 0.018;
  const paddedBbox: [number, number, number, number] = [
    minLng - pad,
    minLat - pad,
    maxLng + pad,
    maxLat + pad,
  ];

  try {
    const clipped = turfAny.bboxClip(surgePolygon, paddedBbox);
    if (!clipped || !clipped.geometry) {
      return null;
    }

    const geom = clipped.geometry;
    if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") {
      return null;
    }

    // Check area <= 200 sq km (200,000,000 m²)
    const areaM2 = turfAny.area(clipped);
    if (areaM2 === 0 || areaM2 > 200e6) {
      return null;
    }

    // Check bbox sides <= 20 km
    const widthKm = turf.distance(
      turf.point([paddedBbox[0], paddedBbox[1]]),
      turf.point([paddedBbox[2], paddedBbox[1]]),
      { units: "kilometers" }
    );
    const heightKm = turf.distance(
      turf.point([paddedBbox[0], paddedBbox[1]]),
      turf.point([paddedBbox[0], paddedBbox[3]]),
      { units: "kilometers" }
    );

    if (widthKm > 20 || heightKm > 20) {
      return null;
    }

    // Round coordinates to 5 decimal places
    const roundCoord = (c: number[]) => [
      Math.round(c[0] * 1e5) / 1e5,
      Math.round(c[1] * 1e5) / 1e5,
    ];

    if (geom.type === "Polygon") {
      const roundedRings = geom.coordinates.map((ring: number[][]) => ring.map(roundCoord));
      return { type: "Polygon", coordinates: roundedRings };
    } else {
      const roundedMulti = geom.coordinates.map((poly: number[][][]) =>
        poly.map((ring: number[][]) => ring.map(roundCoord))
      );
      return { type: "MultiPolygon", coordinates: roundedMulti };
    }
  } catch {
    return null;
  }
}

/**
 * FR-D12. External deep links ("Open in Maps"). Never includes device coordinates.
 */
export function generateGoogleMapsUrl(
  lat: number,
  lng: number,
  profile: "foot" | "car"
): string {
  const mode = profile === "foot" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}&travelmode=${mode}&dir_action=navigate`;
}

export function generateAppleMapsUrl(
  lat: number,
  lng: number,
  profile: "foot" | "car"
): string {
  const dirflg = profile === "foot" ? "w" : "d";
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=${dirflg}`;
}

export function generateGeoUri(lat: number, lng: number, name?: string): string {
  const encodedName = name ? `(${encodeURIComponent(name)})` : "";
  return `geo:0,0?q=${lat},${lng}${encodedName}`;
}

