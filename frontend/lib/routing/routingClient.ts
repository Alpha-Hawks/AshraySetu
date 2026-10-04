// Client-side routing requester and in-memory session cache
import type { RouteRequest, RouteResult, MatrixResult, Profile, LngLat } from "./types.ts";
import {
  CLIENT_ROUTE_TIMEOUT_MS,
  ROUTE_CACHE_TTL_MS,
  ORIGIN_ROUND_DP,
} from "../geo/navConfig.ts";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry<RouteResult>>();
const matrixCache = new Map<string, CacheEntry<MatrixResult>>();
let backoffUntil = 0;

function roundLngLat(coord: LngLat, dp: number): LngLat {
  const factor = Math.pow(10, dp);
  return [
    Math.round(coord[0] * factor) / factor,
    Math.round(coord[1] * factor) / factor,
  ];
}

function makeRouteKey(req: RouteRequest): string {
  const fromR = roundLngLat(req.from, ORIGIN_ROUND_DP);
  const toR = roundLngLat(req.to, 5);
  const avoidKey = req.avoid ? JSON.stringify(req.avoid) : "none";
  return `${fromR[0]},${fromR[1]}_${toR[0]},${toR[1]}_${req.profile}_${avoidKey}`;
}

function makeMatrixKey(from: LngLat, toList: LngLat[], profile: Profile): string {
  const fromR = roundLngLat(from, ORIGIN_ROUND_DP);
  const toStr = toList.map((t) => `${roundLngLat(t, 5).join(",")}`).join(";");
  return `${fromR.join(",")}_${toStr}_${profile}`;
}

export function isRoutingOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("ashraysetu_online_routing") === "true";
}

export function setRoutingOptIn(optedIn: boolean) {
  if (typeof window === "undefined") return;
  if (optedIn) {
    sessionStorage.setItem("ashraysetu_online_routing", "true");
  } else {
    sessionStorage.removeItem("ashraysetu_online_routing");
    clearRoutingSessionCache();
  }
}

export function clearRoutingSessionCache() {
  routeCache.clear();
  matrixCache.clear();
}

/**
 * Request road route from backend proxy
 */
export async function requestRoute(
  req: RouteRequest,
  signal?: AbortSignal
): Promise<RouteResult> {
  const now = Date.now();
  if (now < backoffUntil) {
    throw new Error("RATE_LIMITED_BACKOFF");
  }

  const cacheKey = makeRouteKey(req);
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_ROUTE_TIMEOUT_MS);

  // Link external abort signal if provided
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const payload: RouteRequest = {
      from: roundLngLat(req.from, ORIGIN_ROUND_DP),
      to: roundLngLat(req.to, 5),
      profile: req.profile,
      avoid: req.avoid,
    };

    const res = await fetch("/api/directions/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429 || res.status >= 500) {
      const retryHeader = res.headers.get("Retry-After");
      const retrySec = retryHeader ? parseInt(retryHeader, 10) : 30;
      backoffUntil = Date.now() + (Number.isFinite(retrySec) ? retrySec * 1000 : 30000);
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const error = new Error(errJson.error || `HTTP_${res.status}`);
      (error as any).status = res.status;
      (error as any).fallback = errJson.fallback;
      throw error;
    }

    const data: RouteResult = await res.json();
    routeCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    });
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutErr = new Error("CLIENT_TIMEOUT");
      (timeoutErr as any).fallback = "straightLine";
      throw timeoutErr;
    }
    throw err;
  }
}

/**
 * Request distance/duration matrix from backend proxy
 */
export async function requestMatrix(
  from: LngLat,
  toList: LngLat[],
  profile: Profile,
  signal?: AbortSignal
): Promise<MatrixResult> {
  const now = Date.now();
  if (now < backoffUntil) {
    throw new Error("RATE_LIMITED_BACKOFF");
  }

  const cacheKey = makeMatrixKey(from, toList, profile);
  const cached = matrixCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_ROUTE_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const payload = {
      from: roundLngLat(from, ORIGIN_ROUND_DP),
      to: toList.map((t) => roundLngLat(t, 5)),
      profile,
    };

    const res = await fetch("/api/directions/matrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 429 || res.status >= 500) {
      const retryHeader = res.headers.get("Retry-After");
      const retrySec = retryHeader ? parseInt(retryHeader, 10) : 30;
      backoffUntil = Date.now() + (Number.isFinite(retrySec) ? retrySec * 1000 : 30000);
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const error = new Error(errJson.error || `HTTP_${res.status}`);
      (error as any).status = res.status;
      throw error;
    }

    const data: MatrixResult = await res.json();
    matrixCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    });
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
