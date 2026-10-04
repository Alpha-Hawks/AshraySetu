// Provider failover chain and deadline manager (FR-D2, FR-D3)
import { ROUTING_CONFIG } from "./config.js";
import { circuitBreaker } from "./circuitBreaker.js";
import { selfHostedProvider } from "./providers/selfHosted.js";
import { openRouteServiceProvider } from "./providers/openrouteservice.js";
import { fossgisProvider } from "./providers/fossgis.js";

const PROVIDERS = [selfHostedProvider, openRouteServiceProvider, fossgisProvider];

export async function executeRouteChain(request) {
  const deadlineAt = Date.now() + ROUTING_CONFIG.SERVER_DEADLINE_MS;

  for (const provider of PROVIDERS) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs < ROUTING_CONFIG.MIN_TIME_FOR_NEXT_PROVIDER_MS) {
      break;
    }

    if (!provider.isAvailable()) {
      continue;
    }

    if (!circuitBreaker.canAttempt(provider.name)) {
      continue;
    }

    const providerTimeoutMs = Math.min(ROUTING_CONFIG.PROVIDER_DEADLINE_MS, remainingMs);
    const startTime = Date.now();

    try {
      const res = await provider.route(request, providerTimeoutMs);

      if (res.success) {
        circuitBreaker.recordSuccess(provider.name);
        return { status: 200, body: res.result };
      }

      // Input errors (e.g. no road nearby)
      if (res.error === "INPUT_ERROR") {
        // If avoid was requested, retry once without avoid on the same provider
        if (request.avoid) {
          const retryRemaining = deadlineAt - Date.now();
          if (retryRemaining >= ROUTING_CONFIG.MIN_TIME_FOR_NEXT_PROVIDER_MS) {
            const noAvoidRequest = { ...request, avoid: undefined };
            const retryRes = await provider.route(
              noAvoidRequest,
              Math.min(ROUTING_CONFIG.PROVIDER_DEADLINE_MS, retryRemaining)
            );
            if (retryRes.success) {
              circuitBreaker.recordSuccess(provider.name);
              retryRes.result.hazardAvoided = false;
              return { status: 200, body: retryRes.result };
            }
          }
        }

        // Input error without failover (do not trip circuit breaker)
        return {
          status: 422,
          body: { error: "NO_ROAD_NEARBY", fallback: "straightLine" },
        };
      }

      // Quota or rate limit exhaustion
      if (res.error === "QUOTA_EXHAUSTED") {
        circuitBreaker.recordExhausted(provider.name, res.retryAfter);
        console.warn(`[Routing] Provider ${provider.name} quota exhausted. Failing over.`);
        continue;
      }

      // Upstream server error / 5xx
      circuitBreaker.recordFailure(provider.name);
      console.warn(
        `[Routing] Provider ${provider.name} failed with status ${res.status} in ${Date.now() - startTime}ms`
      );
    } catch (err) {
      circuitBreaker.recordFailure(provider.name);
      console.warn(
        `[Routing] Provider ${provider.name} error: ${err.message || "timeout"} in ${Date.now() - startTime}ms`
      );
    }
  }

  // All providers failed or timed out
  return {
    status: 503,
    body: { error: "ROUTING_UNAVAILABLE", fallback: "straightLine" },
  };
}

export async function executeMatrixChain(from, toList, profile) {
  const deadlineAt = Date.now() + ROUTING_CONFIG.SERVER_DEADLINE_MS;

  for (const provider of PROVIDERS) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs < ROUTING_CONFIG.MIN_TIME_FOR_NEXT_PROVIDER_MS) {
      break;
    }

    if (!provider.isAvailable()) {
      continue;
    }

    if (!circuitBreaker.canAttempt(provider.name)) {
      continue;
    }

    const providerTimeoutMs = Math.min(ROUTING_CONFIG.PROVIDER_DEADLINE_MS, remainingMs);
    const startTime = Date.now();

    try {
      const res = await provider.matrix(from, toList, profile, providerTimeoutMs);

      if (res.success) {
        circuitBreaker.recordSuccess(provider.name);
        return { status: 200, body: res.result };
      }

      if (res.error === "QUOTA_EXHAUSTED") {
        circuitBreaker.recordExhausted(provider.name, res.retryAfter);
        continue;
      }

      circuitBreaker.recordFailure(provider.name);
      console.warn(
        `[Routing Matrix] Provider ${provider.name} failed with status ${res.status} in ${Date.now() - startTime}ms`
      );
    } catch (err) {
      circuitBreaker.recordFailure(provider.name);
      console.warn(
        `[Routing Matrix] Provider ${provider.name} error: ${err.message} in ${Date.now() - startTime}ms`
      );
    }
  }

  // All providers failed
  return {
    status: 503,
    body: { error: "ROUTING_UNAVAILABLE", fallback: "straightLine" },
  };
}
