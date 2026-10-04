// Express router for /api/directions (FR-D2)
import express from "express";
import { ROUTING_CONFIG } from "./config.js";
import { rateLimiter, extractClientIpKey } from "./rateLimiter.js";
import { routingCache } from "./cache.js";
import { executeRouteChain, executeMatrixChain } from "./chain.js";

export const directionsRouter = express.Router();

/**
 * Origin validation middleware (FR-D2)
 */
function checkRoutingOrigin(req, res, next) {
  const origin = req.headers.origin;

  // 1. Allow absent Origin (same-origin, curl, server-to-server)
  if (!origin) {
    return next();
  }

  try {
    const originUrl = new URL(origin);
    const hostHeader = (req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0];

    // 2. Allow if origin host matches current host header
    if (originUrl.hostname === hostHeader) {
      return next();
    }

    // 3. Known production and development domains
    if (
      origin === "https://ashray-setu.vercel.app" ||
      origin === "http://localhost:3000" ||
      origin === "http://127.0.0.1:3000"
    ) {
      return next();
    }

    // 4. Vercel preview environments
    if (
      process.env.VERCEL_URL &&
      originUrl.hostname === process.env.VERCEL_URL.replace(/^https?:\/\//, "")
    ) {
      return next();
    }
    if (
      process.env.VERCEL_BRANCH_URL &&
      originUrl.hostname === process.env.VERCEL_BRANCH_URL.replace(/^https?:\/\//, "")
    ) {
      return next();
    }

    // 5. Configured custom origins
    if (process.env.ROUTING_ALLOWED_ORIGINS) {
      const allowed = process.env.ROUTING_ALLOWED_ORIGINS.split(",").map((o) => o.trim());
      if (allowed.includes(origin)) {
        return next();
      }
    }
  } catch {
    // Malformed origin URL
  }

  return res.status(403).json({ error: "ORIGIN_NOT_ALLOWED" });
}

/**
 * Coordinate validator: [lng, lat]
 */
function isValidLngLat(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lng, lat] = coord;
  return (
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Count vertices in GeoJSON Polygon or MultiPolygon
 */
function countVertices(geom) {
  if (!geom || !geom.coordinates) return 0;
  let count = 0;
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) {
      count += ring.length;
    }
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        count += ring.length;
      }
    }
  }
  return count;
}

// Apply origin check to all routes in this subrouter
directionsRouter.use(checkRoutingOrigin);

/**
 * POST /api/directions/route
 */
directionsRouter.post("/route", async (req, res) => {
  // Check payload size
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > ROUTING_CONFIG.MAX_BODY_BYTES) {
    return res.status(413).json({ error: "PAYLOAD_TOO_LARGE" });
  }

  const { from, to, profile, avoid } = req.body || {};

  // Validate coordinates and profile
  if (!isValidLngLat(from) || !isValidLngLat(to)) {
    return res.status(400).json({ error: "INVALID_COORDINATES" });
  }

  if (profile !== "foot" && profile !== "car") {
    return res.status(400).json({ error: "INVALID_PROFILE" });
  }

  // Validate avoid polygon if present
  if (avoid) {
    const vertices = countVertices(avoid);
    if (vertices === 0 || vertices > ROUTING_CONFIG.MAX_AVOID_VERTICES) {
      return res.status(400).json({ error: "INVALID_AVOID_POLYGON" });
    }
  }

  // Rate limit by client IP
  const clientKey = extractClientIpKey(req);
  const rateCheck = rateLimiter.checkClientLimit(clientKey);
  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", String(rateCheck.retryAfter));
    return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED" });
  }

  // Cache check
  const cacheKey = routingCache.generateRouteKey(from, to, profile, avoid);
  const cached = routingCache.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  // Execute provider chain
  const chainResult = await executeRouteChain({ from, to, profile, avoid });

  if (chainResult.status === 200) {
    routingCache.set(cacheKey, chainResult.body);
    res.setHeader("X-Cache", "MISS");
  }

  return res.status(chainResult.status).json(chainResult.body);
});

/**
 * POST /api/directions/matrix
 */
directionsRouter.post("/matrix", async (req, res) => {
  // Check payload size
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > ROUTING_CONFIG.MAX_BODY_BYTES) {
    return res.status(413).json({ error: "PAYLOAD_TOO_LARGE" });
  }

  const { from, to, profile } = req.body || {};

  if (!isValidLngLat(from) || !Array.isArray(to) || to.length === 0) {
    return res.status(400).json({ error: "INVALID_COORDINATES" });
  }

  if (to.length > ROUTING_CONFIG.MAX_MATRIX_DESTINATIONS) {
    return res.status(400).json({ error: "TOO_MANY_DESTINATIONS" });
  }

  for (const dest of to) {
    if (!isValidLngLat(dest)) {
      return res.status(400).json({ error: "INVALID_DESTINATION_COORDINATE" });
    }
  }

  if (profile !== "foot" && profile !== "car") {
    return res.status(400).json({ error: "INVALID_PROFILE" });
  }

  // Rate limit by client IP
  const clientKey = extractClientIpKey(req);
  const rateCheck = rateLimiter.checkClientLimit(clientKey);
  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", String(rateCheck.retryAfter));
    return res.status(429).json({ error: "RATE_LIMIT_EXCEEDED" });
  }

  // Cache check
  const cacheKey = routingCache.generateMatrixKey(from, to, profile);
  const cached = routingCache.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  // Execute provider chain
  const chainResult = await executeMatrixChain(from, to, profile);

  if (chainResult.status === 200) {
    routingCache.set(cacheKey, chainResult.body);
    res.setHeader("X-Cache", "MISS");
  }

  return res.status(chainResult.status).json(chainResult.body);
});
