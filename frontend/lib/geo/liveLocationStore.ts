// Module-level singleton store for live geolocation tracking
// Implements ref-counted subscribers, single watchPosition, power modes, visibility handling, and error mapping

import {
  GEO_FIRST_FIX,
  GEO_RESUME,
  GEO_NAVIGATE,
  GEO_LOW_POWER,
  GEO_WATCHDOG_EXTRA_MS,
  ACCURACY_APPROX_M,
  STATE_RETAIN_MS,
} from "./navConfig.ts";
import { shouldCommitFix, computeHeading, type NavFix } from "./navMath.ts";

export type PermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "insecure"
  | "unsupported";

export type TrackingState =
  | "idle"
  | "locating"
  | "tracking"
  | "paused"
  | "error";

export type LocationErrorReason =
  | "denied"
  | "unavailable"
  | "timeout"
  | "watchdog"
  | "insecure"
  | "unsupported"
  | null;

export interface LiveLocationState {
  permission: PermissionState;
  tracking: TrackingState;
  errorReason: LocationErrorReason;
  currentFix: NavFix | null;
  lastCommittedFix: NavFix | null;
  lastReceivedAt: number | null;
  follow: boolean;
  isLowPower: boolean;
  isInAppBrowser: boolean;
  isInsecureContext: boolean;
  isUnsupported: boolean;
  activeWatches: number; // For test assertions
  isManualQuery: boolean;
  manualPointChosen: boolean;
}

const DEFAULT_STATE: LiveLocationState = {
  permission: "prompt",
  tracking: "idle",
  errorReason: null,
  currentFix: null,
  lastCommittedFix: null,
  lastReceivedAt: null,
  follow: true,
  isLowPower: false,
  isInAppBrowser: false,
  isInsecureContext: false,
  isUnsupported: false,
  activeWatches: 0,
  isManualQuery: false,
  manualPointChosen: false,
};

class LiveLocationStore {
  private state: LiveLocationState = { ...DEFAULT_STATE };
  private listeners = new Set<() => void>();
  private refCount = 0;
  private watchId: number | null = null;
  private watchdogTimer: any = null;
  private retainTimer: any = null;
  private resumeOnVisible = false;
  private permissionStatusObj: PermissionStatus | null = null;
  private hasInitializedPrechecks = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initPrechecks();
      this.initVisibilityListeners();
    }
  }

  private initPrechecks() {
    if (this.hasInitializedPrechecks) return;
    this.hasInitializedPrechecks = true;

    // Detect in-app browsers
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const isInApp = /FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua);
    this.state.isInAppBrowser = isInApp;

    // Check secure context
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      this.state.permission = "insecure";
      this.state.errorReason = "insecure";
      return;
    }

    // Check geolocation API support
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      this.state.permission = "unsupported";
      this.state.errorReason = "unsupported";
      return;
    }

    // Check navigator.permissions
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" as any })
          .then((status) => {
            this.permissionStatusObj = status;
            this.updatePermissionFromStatus(status.state);
            status.addEventListener("change", () => {
              this.updatePermissionFromStatus(status.state);
            });
          })
          .catch(() => {
            // Permissions API might fail or be restricted; treat as prompt
            this.state.permission = "prompt";
          });
      }
    } catch {
      this.state.permission = "prompt";
    }
  }

  private updatePermissionFromStatus(stateName: string) {
    if (stateName === "granted") {
      this.state.permission = "granted";
      if (this.state.errorReason === "denied") {
        this.state.errorReason = null;
      }
      // Auto-resume only if session flag was set
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("ashraysetu_live_location") === "on" &&
        this.state.tracking === "idle" &&
        this.refCount > 0
      ) {
        this.startTracking();
      }
    } else if (stateName === "denied") {
      this.state.permission = "denied";
      this.state.errorReason = "denied";
      if (this.state.tracking === "tracking" || this.state.tracking === "locating") {
        this.stopTracking();
      }
    } else {
      this.state.permission = "prompt";
    }
    this.notify();
  }

  private initVisibilityListeners() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        if (this.state.tracking === "tracking" || this.state.tracking === "locating") {
          this.resumeOnVisible = true;
          this.clearWatchInternal();
          this.notify();
        }
      } else if (document.visibilityState === "visible") {
        // Re-query permission in case changed in Safari
        if (this.permissionStatusObj) {
          this.updatePermissionFromStatus(this.permissionStatusObj.state);
        }
        if (this.resumeOnVisible) {
          this.resumeOnVisible = false;
          if (
            typeof sessionStorage !== "undefined" &&
            sessionStorage.getItem("ashraysetu_live_location") === "on"
          ) {
            this.startTracking(true);
          }
        }
      }
    });
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.refCount++;

    if (this.retainTimer) {
      clearTimeout(this.retainTimer);
      this.retainTimer = null;
    }

    // Auto-resume if granted and session on
    if (
      this.refCount === 1 &&
      typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("ashraysetu_live_location") === "on" &&
      this.state.tracking === "idle"
    ) {
      this.startTracking();
    }

    return () => {
      this.listeners.delete(listener);
      this.refCount = Math.max(0, this.refCount - 1);

      if (this.refCount === 0) {
        // Clear active watch
        this.clearWatchInternal();

        // Retain state in memory for STATE_RETAIN_MS
        this.retainTimer = setTimeout(() => {
          this.state.currentFix = null;
          this.state.lastCommittedFix = null;
          this.state.tracking = "idle";
          this.notify();
        }, STATE_RETAIN_MS);
      }
    };
  };

  public getSnapshot = (): LiveLocationState => {
    return this.state;
  };

  public getServerSnapshot = (): LiveLocationState => {
    return DEFAULT_STATE;
  };

  private notify() {
    this.state = {
      ...this.state,
      activeWatches: this.watchId !== null ? 1 : 0,
    };
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private clearWatchInternal() {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(this.watchId);
      } catch {}
      this.watchId = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.state.activeWatches = 0;
  }

  /**
   * Start tracking from user tap or valid auto-resume
   */
  public startTracking(isResume = false) {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      this.state.permission = "unsupported";
      this.state.errorReason = "unsupported";
      this.state.tracking = "error";
      this.notify();
      return;
    }

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      this.state.permission = "insecure";
      this.state.errorReason = "insecure";
      this.state.tracking = "error";
      this.notify();
      return;
    }

    this.clearWatchInternal();

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("ashraysetu_live_location", "on");
    }

    this.state.tracking = "locating";
    this.state.errorReason = null;
    this.notify();

    // 1. One-shot initial fix
    const optionsFirst = isResume ? GEO_RESUME : GEO_FIRST_FIX;
    navigator.geolocation.getCurrentPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      optionsFirst
    );

    // Watchdog timer for code 3 / timeout
    const watchdogMs = optionsFirst.timeout + GEO_WATCHDOG_EXTRA_MS;
    this.watchdogTimer = setTimeout(() => {
      if (this.state.tracking === "locating" && !this.state.currentFix) {
        this.state.errorReason = "watchdog";
        this.notify();
      }
    }, watchdogMs);

    // 2. Continuous watchPosition
    const watchOpts = this.state.isLowPower ? GEO_LOW_POWER : GEO_NAVIGATE;
    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handlePosition(pos),
        (err) => this.handleError(err),
        watchOpts
      );
      this.state.activeWatches = 1;
    } catch {
      this.state.tracking = "error";
      this.state.errorReason = "unavailable";
      this.notify();
    }
  }

  private handlePosition(pos: GeolocationPosition) {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    const nowReceivedAt = performance.now();
    const prev = this.state.currentFix;

    // Drop out-of-order fix
    if (prev && pos.timestamp <= prev.timestamp) {
      return;
    }

    const heading = computeHeading(
      {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        headingDeg: pos.coords.heading,
        speedMps: pos.coords.speed,
      },
      prev ? { lat: prev.lat, lng: prev.lng } : null
    );

    const fix: NavFix = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy,
      headingDeg: heading,
      speedMps: pos.coords.speed ?? null,
      timestamp: pos.timestamp,
      receivedAt: nowReceivedAt,
      approximate: pos.coords.accuracy > ACCURACY_APPROX_M,
    };

    this.state.permission = "granted";
    this.state.errorReason = null;
    this.state.lastReceivedAt = nowReceivedAt;

    // If first fix, enable follow-me automatically
    if (!this.state.currentFix) {
      this.state.follow = true;
    }

    this.state.currentFix = fix;
    this.state.tracking = "tracking";

    // Commit to React state using commit rules
    if (shouldCommitFix(fix, this.state.lastCommittedFix, nowReceivedAt)) {
      this.state.lastCommittedFix = fix;
      this.notify();
    }
  }

  private handleError(err: GeolocationPositionError) {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (err.code === 1) {
      // PERMISSION_DENIED
      this.clearWatchInternal();
      this.state.permission = "denied";
      this.state.errorReason = "denied";
      this.state.tracking = "error";
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("ashraysetu_live_location");
      }
      this.notify();
    } else if (err.code === 2) {
      // POSITION_UNAVAILABLE
      this.state.errorReason = "unavailable";
      this.notify();
    } else if (err.code === 3) {
      // TIMEOUT
      this.state.errorReason = "timeout";
      this.notify();
    }
  }

  public setPowerMode(lowPower: boolean) {
    if (this.state.isLowPower === lowPower) return;
    this.state.isLowPower = lowPower;

    if (this.state.tracking === "tracking" || this.state.tracking === "locating") {
      this.clearWatchInternal();
      const opts = lowPower ? GEO_LOW_POWER : GEO_NAVIGATE;
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(
          (pos) => this.handlePosition(pos),
          (err) => this.handleError(err),
          opts
        );
        this.state.activeWatches = 1;
      }
    }
    this.notify();
  }

  public setFollow(follow: boolean) {
    if (this.state.follow === follow) return;
    this.state.follow = follow;
    this.notify();
  }

  public pauseTracking() {
    this.clearWatchInternal();
    this.state.tracking = "paused";
    this.notify();
  }

  public resumeTracking() {
    this.startTracking(true);
  }

  public stopTracking() {
    this.clearWatchInternal();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("ashraysetu_live_location");
    }
    this.state.tracking = "idle";
    this.state.currentFix = null;
    this.state.lastCommittedFix = null;
    this.state.errorReason = null;
    this.state.isManualQuery = false;
    this.state.manualPointChosen = false;
    this.notify();
  }

  public requestPermissionAndStart() {
    this.state.isManualQuery = false;
    this.startTracking();
  }

  public recenter() {
    this.setFollow(true);
  }

  public startFallbackQuery() {
    this.state.isManualQuery = true;
    this.state.manualPointChosen = false;
    this.notify();
  }

  public selectManualFallbackPoint(lat: number, lng: number) {
    this.state.isManualQuery = true;
    this.state.manualPointChosen = true;
    this.state.currentFix = {
      lat,
      lng,
      accuracyM: 10,
      headingDeg: null,
      speedMps: null,
      timestamp: Date.now(),
      receivedAt: performance.now(),
      approximate: true,
    };
    this.notify();
  }

  /**
   * Reset store for unit testing
   */
  public _resetForTest() {
    this.clearWatchInternal();
    this.state = { ...DEFAULT_STATE };
    this.refCount = 0;
    this.listeners.clear();
  }
}

export const liveLocationStore = new LiveLocationStore();
