// AshraySetu Live Navigation & Geolocation Configuration
// All threshold constants and owner-level feature flags as specified in Section 4

// --- Owner-only flags ---
/**
 * Owner-confirmed: every listed shelter in AshraySetu is an officially confirmed safe shelter by the government.
 */
export const SHELTERS_GOV_CONFIRMED = true;

/**
 * True only when occupancy/status reach visitors' phones from an official live feed.
 * When false, local storage/seed occupancy is treated as sample data unless updated on this device.
 */
export const OCCUPANCY_IS_LIVE = false;

/**
 * True only after the owner replaces the placeholder sequential incharge_phone values with verified official numbers.
 */
export const INCHARGE_PHONES_VERIFIED = false;

// --- Eligibility and ranking ---
export const TREAT_STANDBY_AS_OPEN = true;
export const MIN_FREE_BEDS = 1;
export const NEARLY_FULL_RATIO = 0.10;
export const SHORTLIST_K = 5;
export const COVERAGE_WARN_KM = 50;
export const MAX_ROUTABLE_KM = 100;
export const MAX_WALK_ADVISE_KM = 3;

export const TIE_WINDOW = {
  ratio: 0.05,
  durationS: 30,
  distanceM: 50,
} as const;

export const SWITCH_ROUTED = {
  ratio: 0.20,
  durationS: 120,
} as const;

export const SWITCH_STRAIGHT = {
  ratio: 0.20,
  distanceM: 250,
} as const;

export const REEVAL_MIN_INTERVAL_MS = 60_000;
export const REEVAL_MIN_MOVE_M = 100;

// --- Geolocation ---
export const GEO_FIRST_FIX = {
  enableHighAccuracy: false,
  maximumAge: 300_000,
  timeout: 8_000,
} as const;

export const GEO_RESUME = {
  enableHighAccuracy: false,
  maximumAge: 30_000,
  timeout: 8_000,
} as const;

export const GEO_NAVIGATE = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 20_000,
} as const;

export const GEO_LOW_POWER = {
  enableHighAccuracy: false,
  maximumAge: 30_000,
  timeout: 30_000,
} as const;

export const GEO_WATCHDOG_EXTRA_MS = 5_000;
export const COMMIT_MIN_INTERVAL_MS = 1_000;
export const COMMIT_MIN_MOVE_M = 5;
export const COMMIT_ACCURACY_CHANGE = 0.20;
export const COMMIT_MAX_SILENCE_MS = 15_000;

export const ACCURACY_APPROX_M = 100;
export const ACCURACY_NAV_MAX_M = 75;
export const ACCURACY_LOW_WARN_M = 1_000;

export const STALE_FIX_WARN_S = 30;
export const STALE_FIX_GREY_S = 120;
export const AGE_LABEL_REFRESH_MS = 10_000;

export const HEADING_MIN_SPEED_MPS = 0.5;
export const HEADING_MIN_MOVE_M = 10;

export const FOLLOW_DEADZONE_RATIO = 0.25;
export const FOLLOW_PAN_MIN_INTERVAL_MS = 3_000;
export const STATE_RETAIN_MS = 600_000;

// --- Navigation ---
export const OFF_ROUTE = {
  accuracyFactor: 1.5,
  minM: 35,
  maxM: 150,
  consecutiveFixes: 3,
  minDurationMs: 10_000,
} as const;

export const REROUTE_MIN_INTERVAL_MS = 30_000;
export const REROUTE_BACKOFF_MS = [30_000, 60_000, 120_000, 300_000] as const;
export const AUTO_ROUTE_DEBOUNCE_MS = 5_000;

export const ARRIVAL = {
  minRadiusM: 30,
  consecutiveFixes: 2,
  undoWindowMs: 300_000,
} as const;

export const CACHED_ROUTE_CORRIDOR_M = 200;
export const SNAP_SEGMENT_MIN_M = 20;
export const SNAP_WARN_M = 1_000;

export const WALK_SPEED_KMH = 3.0;
export const PROVIDER_FOOT_KMH = 5.0;

export const CLIENT_ROUTE_TIMEOUT_MS = 8_000;
export const ROUTE_CACHE_TTL_MS = 900_000;
export const ORIGIN_ROUND_DP = 4;
