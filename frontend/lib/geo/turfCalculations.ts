import * as turf from "@turf/turf";
import type { Shelter } from "@/lib/db/dexie";

/**
 * Calculates geodesic distance between user coordinates and a shelter in kilometers
 */
export function calculateDistanceToShelter(
  userLat: number,
  userLng: number,
  shelter: Shelter
): number {
  const from = turf.point([userLng, userLat]);
  const to = turf.point([shelter.longitude, shelter.latitude]);
  return Math.round(turf.distance(from, to, { units: "kilometers" }) * 10) / 10;
}

/**
 * Sorts shelters by proximity to the user
 */
export function findNearestShelters(
  userLat: number,
  userLng: number,
  shelters: Shelter[],
  limit = 3
): (Shelter & { distanceKm: number })[] {
  return shelters
    .map((s) => ({
      ...s,
      distanceKm: calculateDistanceToShelter(userLat, userLng, s),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Generates a simulated coastal storm-surge inundation polygon for the Bay of Bengal coastline of Kendrapara
 */
export function generateSurgeInundationZone(
  surgeLevelMeters = 3.5
): GeoJSON.Feature<GeoJSON.Polygon> {
  // Approximate coastal boundary polygon for Kendrapara (Rajnagar & Mahakalapada)
  const coastalLine = turf.lineString([
    [86.99, 20.75], // Dhamra / North
    [86.96, 20.64], // Talachua
    [86.90, 20.52], // Bhitarkanika Mouth
    [86.83, 20.48], // Batighar
    [86.81, 20.38], // Hukitola
    [86.72, 20.32], // False Point / Mahanadi Confluence
  ]);

  // Buffer coastal line inward according to surge height (e.g. 3.5m surge incurs ~4.5km inland reach)
  const bufferDistance = Math.min(8, Math.max(1.5, surgeLevelMeters * 1.3));
  return turf.buffer(coastalLine, bufferDistance, {
    units: "kilometers",
  }) as GeoJSON.Feature<GeoJSON.Polygon>;
}
