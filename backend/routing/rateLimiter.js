// In-memory per-IP rate limiter and upstream provider quotas (FR-D2)
import { ROUTING_CONFIG } from "./config.js";

export function extractClientIpKey(req) {
  let ip =
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  // Check for IPv6 and mask to /64
  if (ip.includes(":")) {
    // Normalise IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (ip.startsWith("::ffff:")) {
      return ip.substring(7);
    }
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::/64";
  }

  return ip;
}

class MemoryRateLimiter {
  constructor() {
    this.ipBuckets = new Map();
    // ORS global token bucket
    this.orsTokens = ROUTING_CONFIG.ORS_TOKEN_BUCKET_RATE_PER_MIN;
    this.orsLastRefill = Date.now();
    // ORS daily counters
    this.orsDayStart = Date.now();
    this.orsDailyDirections = 0;
    this.orsDailyMatrix = 0;
  }

  /**
   * Check per-IP rate limit. Returns { allowed: boolean, retryAfter: number }
   */
  checkClientLimit(ipKey) {
    const now = Date.now();
    let bucket = this.ipBuckets.get(ipKey);

    if (!bucket) {
      bucket = {
        tokens: ROUTING_CONFIG.PER_IP_BURST,
        lastRefill: now,
      };
      this.ipBuckets.set(ipKey, bucket);
    }

    // Refill tokens: 60 tokens per 60,000ms = 1 token per 1,000ms
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 1000) * (ROUTING_CONFIG.PER_IP_MAX_REQUESTS / 60);
    bucket.tokens = Math.min(ROUTING_CONFIG.PER_IP_BURST, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfter: 0 };
    }

    const waitSeconds = Math.ceil((1 - bucket.tokens) / (ROUTING_CONFIG.PER_IP_MAX_REQUESTS / 60));
    return { allowed: false, retryAfter: Math.max(1, waitSeconds) };
  }

  /**
   * Check ORS global limits
   */
  checkOrsAvailable(isMatrix = false) {
    const now = Date.now();

    // Reset daily counters every 24 hours
    if (now - this.orsDayStart > 24 * 60 * 60 * 1000) {
      this.orsDayStart = now;
      this.orsDailyDirections = 0;
      this.orsDailyMatrix = 0;
    }

    // Check daily quotas
    if (isMatrix && this.orsDailyMatrix >= ROUTING_CONFIG.ORS_DAILY_MATRIX_QUOTA) {
      return false;
    }
    if (!isMatrix && this.orsDailyDirections >= ROUTING_CONFIG.ORS_DAILY_DIRECTIONS_QUOTA) {
      return false;
    }

    // Refill ORS token bucket (40/min)
    const elapsed = now - this.orsLastRefill;
    const tokensToAdd = (elapsed / 60000) * ROUTING_CONFIG.ORS_TOKEN_BUCKET_RATE_PER_MIN;
    this.orsTokens = Math.min(ROUTING_CONFIG.ORS_TOKEN_BUCKET_RATE_PER_MIN, this.orsTokens + tokensToAdd);
    this.orsLastRefill = now;

    if (this.orsTokens >= 1) {
      this.orsTokens -= 1;
      if (isMatrix) this.orsDailyMatrix++;
      else this.orsDailyDirections++;
      return true;
    }

    return false;
  }
}

export const rateLimiter = new MemoryRateLimiter();
