// Provider-agnostic routing types as defined in FR-D1

export type LngLat = [number, number]; // [lng, lat]
export type LatLng = [number, number]; // [lat, lng]
export type Profile = "foot" | "car";

export type Maneuver =
  | "depart"
  | "arrive"
  | "turn-left"
  | "turn-right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "straight"
  | "uturn"
  | "roundabout"
  | "keep-left"
  | "keep-right"
  | "other";

export interface Step {
  maneuver: Maneuver;
  exit?: number;
  location: LngLat;
  name: string;
  distanceM: number;
  durationS: number;
}

export interface RouteRequest {
  from: LngLat;
  to: LngLat;
  profile: Profile;
  avoid?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface RouteResult {
  provider: string;
  attribution: string;
  distanceM: number;
  durationS: number;
  geometry: GeoJSON.LineString;
  steps: Step[];
  snappedFrom: LngLat;
  hazardAvoided: boolean;
  warnings: string[];
  fetchedAt: number;
}

export interface MatrixResult {
  provider: string;
  durationS: (number | null)[];
  distanceM: (number | null)[];
}
