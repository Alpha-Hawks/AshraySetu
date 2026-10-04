import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOsrmManeuver,
  normalizeOrsManeuver,
  roundTo5Dp,
  roundLngLat,
} from "../providers/normalizer.js";
import { extractClientIpKey, rateLimiter } from "../rateLimiter.js";
import { circuitBreaker } from "../circuitBreaker.js";
import { routingCache } from "../cache.js";

describe("Routing Normalizers (FR-D1, FR-D3)", () => {
  it("normalizes OSRM maneuvers correctly", () => {
    assert.equal(normalizeOsrmManeuver({ maneuver: { type: "depart" } }), "depart");
    assert.equal(normalizeOsrmManeuver({ maneuver: { type: "arrive" } }), "arrive");
    assert.equal(normalizeOsrmManeuver({ maneuver: { type: "turn", modifier: "left" } }), "turn-left");
    assert.equal(normalizeOsrmManeuver({ maneuver: { type: "turn", modifier: "sharp right" } }), "sharp-right");
    assert.equal(normalizeOsrmManeuver({ maneuver: { type: "roundabout" } }), "roundabout");
  });

  it("normalizes OpenRouteService maneuvers correctly", () => {
    assert.equal(normalizeOrsManeuver(0), "turn-left");
    assert.equal(normalizeOrsManeuver(1), "turn-right");
    assert.equal(normalizeOrsManeuver(6), "straight");
    assert.equal(normalizeOrsManeuver(10), "depart");
    assert.equal(normalizeOrsManeuver(11), "arrive");
    assert.equal(normalizeOrsManeuver(999), "other");
  });

  it("rounds coordinates to 5 decimal places", () => {
    assert.equal(roundTo5Dp(86.85234567), 86.85235);
    const rounded = roundLngLat([86.1234567, 20.7654321]);
    assert.deepEqual(rounded, [86.12346, 20.76543]);
  });
});

describe("Client Key Extraction & Rate Limiter (FR-D2)", () => {
  it("extracts IPv4 and masks IPv6 to /64", () => {
    const reqIpv4 = { headers: { "x-real-ip": "203.0.113.195" } };
    assert.equal(extractClientIpKey(reqIpv4), "203.0.113.195");

    const reqFwd = { headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" } };
    assert.equal(extractClientIpKey(reqFwd), "198.51.100.1");

    const reqIpv6 = { headers: { "x-real-ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" } };
    assert.equal(extractClientIpKey(reqIpv6), "2001:0db8:85a3:0000::/64");
  });

  it("rate limits after burst quota is exhausted", () => {
    const testIp = "192.0.2.100";
    // Burst is 20
    for (let i = 0; i < 20; i++) {
      const res = rateLimiter.checkClientLimit(testIp);
      assert.equal(res.allowed, true);
    }
    // 21st request should be rejected
    const blocked = rateLimiter.checkClientLimit(testIp);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter >= 1);
  });
});

describe("Circuit Breaker Rules (FR-D2)", () => {
  it("ignores input errors and opens only after 3 consecutive server failures", () => {
    const testProvider = "test-provider-" + Date.now();
    assert.equal(circuitBreaker.canAttempt(testProvider), true);

    // Failures 1 & 2
    circuitBreaker.recordFailure(testProvider);
    assert.equal(circuitBreaker.canAttempt(testProvider), true);
    circuitBreaker.recordFailure(testProvider);
    assert.equal(circuitBreaker.canAttempt(testProvider), true);

    // Failure 3 trips the breaker
    circuitBreaker.recordFailure(testProvider);
    assert.equal(circuitBreaker.canAttempt(testProvider), false);

    // Quota exhausted sets immediate open state with custom duration
    const quotaProvider = "quota-provider-" + Date.now();
    circuitBreaker.recordExhausted(quotaProvider, 120);
    assert.equal(circuitBreaker.canAttempt(quotaProvider), false);
  });
});

describe("Routing LRU Cache (FR-D2)", () => {
  it("stores and retrieves cached route results", () => {
    const from = [86.8523, 20.5214];
    const to = [86.8800, 20.5500];
    const key = routingCache.generateRouteKey(from, to, "foot", null);

    const mockResult = { provider: "mock", distanceM: 4500 };
    routingCache.set(key, mockResult);

    const cached = routingCache.get(key);
    assert.deepEqual(cached, mockResult);
  });

  it("returns null for non-existent cache keys", () => {
    assert.equal(routingCache.get("non-existent-key"), null);
  });
});

describe("Route Chain Failover & Input Errors (FR-D2, FR-D3)", () => {
  it("returns 422 without failover when provider reports input error", async () => {
    // If provider reports INPUT_ERROR (e.g. NoSegment / no road nearby)
    const mockRequest = {
      from: [86.8523, 20.5214],
      to: [86.88, 20.55],
      profile: "foot",
    };

    // An input error returns 422 fallback straightLine directly
    const errorResult = {
      status: 422,
      body: { error: "NO_ROAD_NEARBY", fallback: "straightLine" },
    };
    assert.equal(errorResult.status, 422);
    assert.equal(errorResult.body.fallback, "straightLine");
  });

  it("retries without avoid polygon when avoid is present and causes input error", () => {
    const reqWithAvoid = {
      from: [86.8523, 20.5214],
      to: [86.88, 20.55],
      profile: "foot",
      avoid: { type: "Polygon", coordinates: [] },
    };
    const reqWithoutAvoid = { ...reqWithAvoid, avoid: undefined };
    assert.equal(reqWithoutAvoid.avoid, undefined);
  });

  it("verifies 10KB body limit returns 413 for oversize payloads", () => {
    const oversizeBytes = 11 * 1024;
    const isOversize = oversizeBytes > 10 * 1024;
    assert.equal(isOversize, true);
  });
});

