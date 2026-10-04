// In-memory LRU cache for route and matrix results (FR-D2)
import { ROUTING_CONFIG } from "./config.js";

class MemoryLRUCache {
  constructor(maxEntries = ROUTING_CONFIG.CACHE_MAX_ENTRIES, ttlMs = ROUTING_CONFIG.CACHE_TTL_MS) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  generateRouteKey(from, to, profile, avoid) {
    const fromR = [from[0].toFixed(4), from[1].toFixed(4)].join(",");
    const toR = [to[0].toFixed(4), to[1].toFixed(4)].join(",");
    const avoidHash = avoid ? JSON.stringify(avoid).length : "none";
    return `route:${fromR}:${toR}:${profile}:${avoidHash}`;
  }

  generateMatrixKey(from, toList, profile) {
    const fromR = [from[0].toFixed(4), from[1].toFixed(4)].join(",");
    const toR = toList.map((t) => [t[0].toFixed(4), t[1].toFixed(4)].join(",")).join(";");
    return `matrix:${fromR}:${toR}:${profile}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order: delete and re-insert
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Remove oldest (first inserted in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const routingCache = new MemoryLRUCache();
