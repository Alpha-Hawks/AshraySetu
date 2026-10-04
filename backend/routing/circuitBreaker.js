// In-memory circuit breaker for upstream routing providers (FR-D2)
import { ROUTING_CONFIG } from "./config.js";

class ProviderCircuitBreaker {
  constructor() {
    this.breakers = new Map();
  }

  getBreaker(name) {
    let b = this.breakers.get(name);
    if (!b) {
      b = {
        state: "CLOSED", // "CLOSED" | "OPEN" | "HALF_OPEN"
        consecutiveFailures: 0,
        openUntil: 0,
      };
      this.breakers.set(name, b);
    }
    return b;
  }

  canAttempt(name) {
    const b = this.getBreaker(name);
    const now = Date.now();

    if (b.state === "OPEN") {
      if (now >= b.openUntil) {
        b.state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    return true;
  }

  recordSuccess(name) {
    const b = this.getBreaker(name);
    b.consecutiveFailures = 0;
    b.state = "CLOSED";
  }

  recordFailure(name) {
    const b = this.getBreaker(name);
    b.consecutiveFailures++;

    if (b.consecutiveFailures >= ROUTING_CONFIG.BREAKER_FAILURE_THRESHOLD) {
      b.state = "OPEN";
      b.openUntil = Date.now() + ROUTING_CONFIG.BREAKER_RESET_TIMEOUT_MS;
    }
  }

  recordExhausted(name, retryAfterSeconds) {
    const b = this.getBreaker(name);
    b.state = "OPEN";
    const durationMs = (retryAfterSeconds ? Number(retryAfterSeconds) : 60) * 1000;
    b.openUntil = Date.now() + durationMs;
  }
}

export const circuitBreaker = new ProviderCircuitBreaker();
