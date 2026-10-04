// Configuration and constants for the routing proxy (FR-D2)
export const ROUTING_CONFIG = {
  // Deadlines in ms
  SERVER_DEADLINE_MS: 6500,
  PROVIDER_DEADLINE_MS: 4000,
  MIN_TIME_FOR_NEXT_PROVIDER_MS: 1000,

  // Payload limits
  MAX_BODY_BYTES: 10 * 1024, // 10 KB
  MAX_AVOID_VERTICES: 300,
  MAX_MATRIX_DESTINATIONS: 10,

  // Rate limits
  PER_IP_WINDOW_MS: 60 * 1000,
  PER_IP_MAX_REQUESTS: 60,
  PER_IP_BURST: 20,

  // Upstream ORS limits
  ORS_TOKEN_BUCKET_RATE_PER_MIN: 40,
  ORS_DAILY_DIRECTIONS_QUOTA: 2000,
  ORS_DAILY_MATRIX_QUOTA: 500,

  // Circuit breaker
  BREAKER_FAILURE_THRESHOLD: 3,
  BREAKER_RESET_TIMEOUT_MS: 60 * 1000,

  // Cache
  CACHE_MAX_ENTRIES: 500,
  CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes

  // Upstream metadata
  USER_AGENT: "AshraySetu/1.0 (+https://ashray-setu.vercel.app/)",
  SNAP_RADIUS_METERS: 2000,
};
