// Module-level singleton store for navigation, routing, guidance, and target selection
"use client";

import { liveQuery, type Subscription } from "dexie";
import { db, initializeDatabase } from "../db/dexie.ts";
import {
  liveLocationStore,
  type LiveLocationState,
} from "./liveLocationStore.ts";
import {
  SHORTLIST_K,
  REEVAL_MIN_INTERVAL_MS,
  REEVAL_MIN_MOVE_M,
  REROUTE_MIN_INTERVAL_MS,
  AUTO_ROUTE_DEBOUNCE_MS,
  ARRIVAL,
  CACHED_ROUTE_CORRIDOR_M,
  STATE_RETAIN_MS,
} from "./navConfig.ts";
import {
  rankSheltersStage1,
  rankSheltersStage2,
  checkImpreciseFix,
  evaluateTargetSwitch,
  findNearerIneligibleAlert,
  checkCoverageState,
  checkWalkAdvisory,
  type RankedCandidate,
  type ShelterCandidate,
} from "./safeShelter.ts";
import {
  distanceM,
  evaluateFixOffRoute,
  checkOffRouteHistory,
  checkArrivalAtShelter,
  calculateRouteProgress,
  calculateBearingAndCardinal,
  formatDistanceDisplay,
  formatDurationDisplay,
  buildSurgeAvoidPolygon,
  toLngLat,
  type LatLng,
  type NavFix,
} from "./navMath.ts";
import {
  requestRoute,
  requestMatrix,
  isRoutingOptedIn,
  setRoutingOptIn,
} from "../routing/routingClient.ts";
import type { RouteResult, Profile } from "../routing/types.ts";

export interface LiveNavigationState {
  target: RankedCandidate | null;
  pinnedTargetId: string | null;
  profile: Profile;
  guidanceMode: "straightLine" | "routed" | "cachedRoute";
  isOnlineRoutingOptedIn: boolean;
  routeResult: RouteResult | null;
  cachedRoute: RouteResult | null;
  routeProgress: {
    remainingDistanceM: number;
    remainingDurationS: number;
    snappedPoint: LatLng;
  } | null;
  straightLine: {
    distanceM: number;
    distanceKm: number;
    bearingDeg: number;
    cardinalKey: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
    durationS: number | null;
  } | null;
  isDeparted: boolean;
  departurePoint: LatLng | null;
  impreciseMultiChoice: {
    isImprecise: boolean;
    choices: RankedCandidate[];
  };
  alternatives: RankedCandidate[];
  nearerIneligibleAlert: {
    shelter: ShelterCandidate;
    distanceKm: number;
    reason: "Full" | "Damaged" | "Standby" | "Unavailable";
  } | null;
  coverage: {
    isOutOfCoverage: boolean;
    isBeyondMaxRoutable: boolean;
  };
  walkAdvisory: boolean;
  suggestedTarget: {
    candidate: RankedCandidate;
    current: RankedCandidate;
  } | null;
  isArrived: boolean;
  arrivalUndoPossible: boolean;
  isRerouting: boolean;
  isOffline: boolean;
  isBatterySaver: boolean;
  keepScreenOn: boolean;
  fitRouteNonce: number;
  latestAnnouncement: string;
  announcementNonce: number;
}

const DEFAULT_NAV_STATE: LiveNavigationState = {
  target: null,
  pinnedTargetId: null,
  profile: "foot",
  guidanceMode: "straightLine",
  isOnlineRoutingOptedIn: false,
  routeResult: null,
  cachedRoute: null,
  routeProgress: null,
  straightLine: null,
  isDeparted: false,
  departurePoint: null,
  impreciseMultiChoice: { isImprecise: false, choices: [] },
  alternatives: [],
  nearerIneligibleAlert: null,
  coverage: { isOutOfCoverage: false, isBeyondMaxRoutable: false },
  walkAdvisory: false,
  suggestedTarget: null,
  isArrived: false,
  arrivalUndoPossible: false,
  isRerouting: false,
  isOffline: false,
  isBatterySaver: false,
  keepScreenOn: false,
  fitRouteNonce: 0,
  latestAnnouncement: "",
  announcementNonce: 0,
};

class LiveNavigationStore {
  private state: LiveNavigationState = { ...DEFAULT_NAV_STATE };
  private listeners = new Set<() => void>();
  private refCount = 0;
  private locationUnsub: (() => void) | null = null;
  private dbSubscription: Subscription | null = null;
  private allShelters: ShelterCandidate[] = [];
  private lastEvaluationTime = 0;
  private lastEvaluationCoords: LatLng | null = null;
  private lastRerouteTime = 0;
  private offRouteHistory: Array<{
    isOff: boolean;
    receivedAt: number;
    accuracyM: number;
  }> = [];
  private arrivalHistory: Array<{
    isArrived: boolean;
    receivedAt: number;
  }> = [];
  private arrivalTime = 0;
  private previousTargetBeforeArrival: RankedCandidate | null = null;
  private previousRouteBeforeArrival: RouteResult | null = null;
  private autoRouteTimer: any = null;
  private lastAnnouncedTimeSec = 0;
  private lastAnnouncedTimeTimestamp = 0;
  private wakeLockSentinel: any = null;
  private retainTimer: any = null;
  private currentAbortController: AbortController | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initConnectivityListeners();
      this.state.isOnlineRoutingOptedIn = isRoutingOptedIn();
    }
  }

  private initConnectivityListeners() {
    const updateOfflineState = () => {
      const flightMode =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem("ashraysetu_flight_mode") === "1";
      const isOff =
        (typeof navigator !== "undefined" && !navigator.onLine) || flightMode;

      if (this.state.isOffline !== isOff) {
        this.state.isOffline = isOff;

        if (isOff) {
          // Going offline: cancel in-flight requests, switch to cached or straight line
          if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
          }
          if (this.state.cachedRoute) {
            this.state.guidanceMode = "cachedRoute";
          } else {
            this.state.guidanceMode = "straightLine";
          }
          this.announce("Offline: approximate guide");
        } else {
          // Coming online with opt-in triggers re-evaluation
          if (this.state.isOnlineRoutingOptedIn) {
            this.reEvaluate(true);
          }
        }
        this.notify();
      }
    };

    updateOfflineState();
    window.addEventListener("online", updateOfflineState);
    window.addEventListener("offline", updateOfflineState);
    window.addEventListener("flightModeChanged", updateOfflineState);
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    this.refCount++;

    if (this.retainTimer) {
      clearTimeout(this.retainTimer);
      this.retainTimer = null;
    }

    if (this.refCount === 1) {
      this.startSubscriptions();
    }

    return () => {
      this.listeners.delete(listener);
      this.refCount = Math.max(0, this.refCount - 1);

      if (this.refCount === 0) {
        this.stopSubscriptions();
        this.retainTimer = setTimeout(() => {
          this.state = {
            ...DEFAULT_NAV_STATE,
            isOnlineRoutingOptedIn: isRoutingOptedIn(),
            isOffline: this.state.isOffline,
          };
          this.notify();
        }, STATE_RETAIN_MS);
      }
    };
  };

  public getSnapshot = (): LiveNavigationState => {
    return this.state;
  };

  public getServerSnapshot = (): LiveNavigationState => {
    return DEFAULT_NAV_STATE;
  };

  private notify() {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private announce(text: string) {
    this.state.latestAnnouncement = text;
    this.state.announcementNonce++;
  }

  private startSubscriptions() {
    // 1. Subscribe to Live Location Store
    this.locationUnsub = liveLocationStore.subscribe(() => {
      const locState = liveLocationStore.getSnapshot();
      this.handleLocationUpdate(locState);
    });

    // 2. Subscribe to Dexie Database for Shelters with Provenance
    initializeDatabase().then(() => {
      const shelterQuery = liveQuery(async () => {
        const shelters = await db.shelters.toArray();
        const admissions = await db.admissions.toArray();
        const households = await db.households.toArray();

        const changeMap = new Map<string, number>();

        for (const a of admissions) {
          if (!a.id?.includes("-demo-") && typeof a.admitted_at === "number") {
            const cur = changeMap.get(a.shelter_id) || 0;
            if (a.admitted_at > cur) changeMap.set(a.shelter_id, a.admitted_at);
          }
        }

        for (const h of households) {
          if (!h.id?.includes("-demo-") && typeof h.registered_at === "number") {
            const cur = changeMap.get(h.shelter_id) || 0;
            if (h.registered_at > cur) changeMap.set(h.shelter_id, h.registered_at);
          }
        }

        return shelters.map((s) => ({
          ...s,
          lastLocalChangeAt: changeMap.get(s.id) || null,
        }));
      });

      this.dbSubscription = shelterQuery.subscribe({
        next: (shelters) => {
          this.allShelters = shelters;
          // If current target changed status or capacity, re-evaluate immediately
          this.reEvaluate(false);
        },
        error: (err) => console.error("Shelter liveQuery error:", err),
      });
    });
  }

  private stopSubscriptions() {
    if (this.locationUnsub) {
      this.locationUnsub();
      this.locationUnsub = null;
    }
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
    if (this.autoRouteTimer) {
      clearTimeout(this.autoRouteTimer);
      this.autoRouteTimer = null;
    }
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.releaseWakeLock();
  }

  private handleLocationUpdate(locState: LiveLocationState) {
    const fix = locState.currentFix;
    if (!fix) return;

    const fixLatLng: LatLng = [fix.lat, fix.lng];

    // Check departure
    if (this.state.departurePoint && !this.state.isDeparted) {
      const movedFromDep = distanceM(fixLatLng, this.state.departurePoint);
      if (movedFromDep >= REEVAL_MIN_MOVE_M) {
        this.state.isDeparted = true;
      }
    }

    // Check arrival undo window
    if (this.state.isArrived && this.state.target) {
      const targetLatLng: LatLng = [
        this.state.target.shelter.latitude,
        this.state.target.shelter.longitude,
      ];
      const distToTarget = distanceM(fixLatLng, targetLatLng);
      const arrivalRadius = Math.max(ARRIVAL.minRadiusM, fix.accuracyM);
      const timeSinceArrival = Date.now() - this.arrivalTime;

      if (
        timeSinceArrival <= ARRIVAL.undoWindowMs &&
        distToTarget > arrivalRadius * 2
      ) {
        // Automatically restore guidance if walked away
        this.undoArrival();
        return;
      }
    }

    // Check re-evaluation triggers
    this.checkReEvaluationTriggers(fix);

    // Update navigation progress if target exists
    if (this.state.target && !this.state.isArrived) {
      this.updateProgressAndNavigation(fix);
    }
  }

  private checkReEvaluationTriggers(fix: NavFix) {
    const now = Date.now();
    const fixLatLng: LatLng = [fix.lat, fix.lng];

    if (!this.lastEvaluationCoords) {
      // First fix: immediate evaluation
      this.reEvaluate(true);
      return;
    }

    const elapsed = now - this.lastEvaluationTime;
    const moved = distanceM(fixLatLng, this.lastEvaluationCoords);
    const minMove = Math.max(REEVAL_MIN_MOVE_M, 2 * fix.accuracyM);

    if (moved >= minMove || elapsed >= REEVAL_MIN_INTERVAL_MS) {
      this.reEvaluate(moved >= minMove);
    }
  }

  /**
   * Core Re-Evaluation logic (FR-S3, FR-S4, FR-S5, FR-S6, FR-S7, FR-S8)
   */
  public async reEvaluate(allowMatrix = true) {
    const locState = liveLocationStore.getSnapshot();
    const fix = locState.currentFix;
    if (!fix || this.allShelters.length === 0) return;

    this.lastEvaluationTime = Date.now();
    this.lastEvaluationCoords = [fix.lat, fix.lng];

    // 1. Stage 1 geodesic ranking
    const stage1 = rankSheltersStage1(fix.lat, fix.lng, this.allShelters);

    if (stage1.length === 0) {
      // No eligible shelters found
      this.state.target = null;
      this.state.impreciseMultiChoice = { isImprecise: false, choices: [] };
      this.state.alternatives = [];
      this.state.coverage = checkCoverageState(null);
      this.notify();
      return;
    }

    // Check coverage
    const nearestKm = stage1[0].distanceKm;
    this.state.coverage = checkCoverageState(nearestKm);

    // 2. Check imprecise fix (FR-S3a)
    const imprecise = checkImpreciseFix(fix.accuracyM, stage1);
    if (imprecise.isImprecise) {
      this.state.impreciseMultiChoice = {
        isImprecise: true,
        choices: imprecise.topCandidates,
      };
      this.state.target = null;
      this.state.alternatives = [];
      this.state.guidanceMode = "straightLine";
      this.notify();
      return;
    } else {
      this.state.impreciseMultiChoice = { isImprecise: false, choices: [] };
    }

    // Handle Pinned Target
    if (this.state.pinnedTargetId) {
      const pinned = stage1.find(
        (c) => c.shelter.id === this.state.pinnedTargetId
      );
      if (pinned) {
        this.setTargetCandidate(pinned, false);
        this.updateAlternatives(stage1, pinned);
        this.notify();
        return;
      } else {
        // Pinned shelter is no longer eligible!
        const rawPinned = this.allShelters.find(
          (s) => s.id === this.state.pinnedTargetId
        );
        this.announce(
          `${rawPinned?.name || "Pinned shelter"} is now full or unavailable.`
        );
      }
    }

    // 3. Stage 2 matrix ranking if online & opted-in
    let ranked = stage1;
    const shortlist = stage1.slice(0, SHORTLIST_K);

    if (
      allowMatrix &&
      !this.state.isOffline &&
      this.state.isOnlineRoutingOptedIn &&
      shortlist.length > 1
    ) {
      try {
        const fromLngLat = toLngLat([fix.lat, fix.lng]);
        const toLngLatList = shortlist.map((c) =>
          toLngLat([c.shelter.latitude, c.shelter.longitude])
        );

        const matrixRes = await requestMatrix(
          fromLngLat,
          toLngLatList,
          this.state.profile
        );

        ranked = rankSheltersStage2(
          shortlist,
          matrixRes.durationS,
          matrixRes.distanceM
        );
      } catch (err) {
        // Matrix failed: gracefully fall back to Stage 1 order
        ranked = stage1;
      }
    }

    const bestCandidate = ranked[0];

    // 4. Hysteresis switch evaluation (FR-S6)
    const switchDecision = evaluateTargetSwitch({
      currentTarget: this.state.target,
      bestCandidate,
      isDeparted: this.state.isDeparted,
      mode:
        this.state.guidanceMode === "routed" ? "routed" : "straightLine",
    });

    if (switchDecision.action === "switch") {
      this.setTargetCandidate(bestCandidate, true);
    } else if (switchDecision.action === "suggest") {
      this.state.suggestedTarget = {
        candidate: bestCandidate,
        current: this.state.target!,
      };
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(200);
        } catch {}
      }
      this.announce(
        `A nearer shelter is available: ${bestCandidate.shelter.name}`
      );
    }

    // Update alternatives & nearer ineligible alerts
    if (this.state.target) {
      this.updateAlternatives(ranked, this.state.target);
      this.state.nearerIneligibleAlert = findNearerIneligibleAlert(
        fix.lat,
        fix.lng,
        this.state.target,
        this.allShelters
      );
      this.state.walkAdvisory = checkWalkAdvisory(
        this.state.profile,
        this.state.target.distanceKm
      );
      this.updateProgressAndNavigation(fix);
    }

    this.notify();
  }

  private setTargetCandidate(candidate: RankedCandidate, isAutoSwitch: boolean) {
    const isNew = !this.state.target || this.state.target.shelter.id !== candidate.shelter.id;
    this.state.target = candidate;
    this.state.suggestedTarget = null;

    if (isNew) {
      const loc = liveLocationStore.getSnapshot().currentFix;
      if (loc) {
        this.state.departurePoint = [loc.lat, loc.lng];
        this.state.isDeparted = false;
      }

      const distStr = formatDistanceDisplay(candidate.distanceM);
      const timeStr = candidate.durationS
        ? formatDurationDisplay(candidate.durationS)
        : "approx";
      this.announce(
        `Nearest safe shelter: ${candidate.shelter.name}, ${distStr}, about ${timeStr}`
      );

      // Trigger route fetch if online and opted in
      if (!this.state.isOffline && this.state.isOnlineRoutingOptedIn) {
        this.triggerRouteFetch(isAutoSwitch);
      }
    }
  }

  private updateAlternatives(
    rankedList: RankedCandidate[],
    target: RankedCandidate
  ) {
    this.state.alternatives = rankedList
      .filter((c) => c.shelter.id !== target.shelter.id)
      .slice(0, 2);
  }

  /**
   * Fetch road route (FR-D4, FR-D6, FR-D7)
   */
  public triggerRouteFetch(debounce = false) {
    if (this.autoRouteTimer) {
      clearTimeout(this.autoRouteTimer);
      this.autoRouteTimer = null;
    }

    if (debounce) {
      this.autoRouteTimer = setTimeout(() => {
        this.executeRouteFetch();
      }, AUTO_ROUTE_DEBOUNCE_MS);
    } else {
      this.executeRouteFetch();
    }
  }

  private async executeRouteFetch() {
    const locState = liveLocationStore.getSnapshot();
    const fix = locState.currentFix;
    const target = this.state.target;

    if (
      !fix ||
      !target ||
      this.state.isOffline ||
      !this.state.isOnlineRoutingOptedIn
    ) {
      return;
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const controller = new AbortController();
    this.currentAbortController = controller;

    const fromLngLat = toLngLat([fix.lat, fix.lng]);
    const toLngLatCoords = toLngLat([
      target.shelter.latitude,
      target.shelter.longitude,
    ]);

    // Build hazard avoid polygon
    const avoid = buildSurgeAvoidPolygon(fromLngLat, toLngLatCoords);

    try {
      const result = await requestRoute(
        {
          from: fromLngLat,
          to: toLngLatCoords,
          profile: this.state.profile,
          avoid: avoid || undefined,
        },
        controller.signal
      );

      this.state.routeResult = result;
      this.state.cachedRoute = result;
      this.state.guidanceMode = "routed";
      this.offRouteHistory = [];
      this.notify();
    } catch (err: any) {
      if (err.name === "AbortError") return;

      // Routing failed -> straight-line fallback
      this.state.guidanceMode = "straightLine";
      this.notify();
    } finally {
      if (this.currentAbortController === controller) {
        this.currentAbortController = null;
      }
    }
  }

  /**
   * Update progress, off-route checks, and straight-line data on each fix
   */
  private updateProgressAndNavigation(fix: NavFix) {
    const target = this.state.target;
    if (!target) return;

    const fixLatLng: LatLng = [fix.lat, fix.lng];
    const shelterLatLng: LatLng = [
      target.shelter.latitude,
      target.shelter.longitude,
    ];

    // 1. Straight-line update (always computed)
    const slDistM = distanceM(fixLatLng, shelterLatLng);
    const bearingCard = calculateBearingAndCardinal(fixLatLng, shelterLatLng);
    const walkSec = Math.round((slDistM / 1000 / 3.0) * 3600); // 3 km/h
    this.state.straightLine = {
      distanceM: slDistM,
      distanceKm: Math.round((slDistM / 1000) * 10) / 10,
      bearingDeg: bearingCard.bearingDeg,
      cardinalKey: bearingCard.cardinalKey,
      durationS: this.state.profile === "foot" ? walkSec : null,
    };

    // 2. Check Arrival (FR-D11)
    const isArrivedNow = checkArrivalAtShelter(
      fix,
      target.shelter.latitude,
      target.shelter.longitude
    );

    this.arrivalHistory.push({
      isArrived: isArrivedNow,
      receivedAt: fix.receivedAt,
    });
    if (this.arrivalHistory.length > 5) {
      this.arrivalHistory.shift();
    }

    const tailArrival = this.arrivalHistory.slice(-ARRIVAL.consecutiveFixes);
    if (
      tailArrival.length >= ARRIVAL.consecutiveFixes &&
      tailArrival.every((a) => a.isArrived) &&
      !this.state.isArrived
    ) {
      this.triggerArrival(target);
      return;
    }

    // 3. Route progress & Off-route (when routed or cached-route)
    const activeRoute = this.state.routeResult || this.state.cachedRoute;
    if (
      activeRoute &&
      (this.state.guidanceMode === "routed" ||
        this.state.guidanceMode === "cachedRoute")
    ) {
      const progress = calculateRouteProgress(
        fixLatLng,
        activeRoute.geometry,
        activeRoute.durationS,
        activeRoute.distanceM,
        this.state.profile
      );
      this.state.routeProgress = progress;

      // Periodic time announcement (at most once per 60s if changed >= 1 min)
      const now = Date.now();
      const currentMin = Math.round(progress.remainingDurationS / 60);
      if (
        now - this.lastAnnouncedTimeTimestamp >= 60000 &&
        Math.abs(currentMin - this.lastAnnouncedTimeSec) >= 1
      ) {
        this.lastAnnouncedTimeSec = currentMin;
        this.lastAnnouncedTimeTimestamp = now;
        this.announce(`About ${formatDurationDisplay(progress.remainingDurationS)} remaining`);
      }

      // Check Off-route (FR-D8)
      const offEval = evaluateFixOffRoute(fix, activeRoute.geometry);
      this.offRouteHistory.push({
        isOff: offEval.isOff,
        receivedAt: fix.receivedAt,
        accuracyM: fix.accuracyM,
      });
      if (this.offRouteHistory.length > 10) {
        this.offRouteHistory.shift();
      }

      if (checkOffRouteHistory(this.offRouteHistory)) {
        this.handleOffRouteDetected();
      }
    }

    this.notify();
  }

  private handleOffRouteDetected() {
    if (this.state.isOffline) {
      // Offline: never reroute, switch to straight-line guidance
      this.state.guidanceMode = "straightLine";
      this.notify();
      return;
    }

    const now = Date.now();
    if (now - this.lastRerouteTime < REROUTE_MIN_INTERVAL_MS) {
      return;
    }

    this.lastRerouteTime = now;
    this.state.isRerouting = true;
    this.announce("Rerouting");
    this.offRouteHistory = [];
    this.triggerRouteFetch(false);
  }

  private triggerArrival(target: RankedCandidate) {
    this.state.isArrived = true;
    this.state.arrivalUndoPossible = true;
    this.arrivalTime = Date.now();
    this.previousTargetBeforeArrival = target;
    this.previousRouteBeforeArrival = this.state.routeResult;

    // Switch to low power mode
    liveLocationStore.setPowerMode(true);
    this.releaseWakeLock();

    this.announce(`You have arrived at ${target.shelter.name}`);
    this.notify();
  }

  public undoArrival() {
    this.state.isArrived = false;
    this.state.arrivalUndoPossible = false;
    liveLocationStore.setPowerMode(this.state.isBatterySaver);
    if (this.previousTargetBeforeArrival) {
      this.state.target = this.previousTargetBeforeArrival;
    }
    if (this.previousRouteBeforeArrival) {
      this.state.routeResult = this.previousRouteBeforeArrival;
      this.state.guidanceMode = "routed";
    }
    this.notify();
  }

  // --- Public Actions ---

  public setProfile(profile: Profile) {
    if (this.state.profile === profile) return;
    this.state.profile = profile;
    this.reEvaluate(true);
    this.notify();
  }

  public optInOnlineRouting() {
    setRoutingOptIn(true);
    this.state.isOnlineRoutingOptedIn = true;
    this.reEvaluate(true);
    this.notify();
  }

  public turnOffOnlineRouting() {
    setRoutingOptIn(false);
    this.state.isOnlineRoutingOptedIn = false;
    this.state.routeResult = null;
    this.state.guidanceMode = "straightLine";
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.notify();
  }

  public pinShelter(shelterId: string) {
    this.state.pinnedTargetId = shelterId;
    const target = this.allShelters.find((s) => s.id === shelterId);
    if (target) {
      const loc = liveLocationStore.getSnapshot().currentFix;
      const lat = loc ? loc.lat : target.latitude;
      const lng = loc ? loc.lng : target.longitude;
      const ranked = rankSheltersStage1(lat, lng, [target]);
      if (ranked[0]) {
        this.setTargetCandidate(ranked[0], false);
      }
    }
    this.notify();
  }

  public unpinShelter() {
    this.state.pinnedTargetId = null;
    this.reEvaluate(true);
    this.notify();
  }

  public switchTarget(candidate: RankedCandidate) {
    this.setTargetCandidate(candidate, false);
    this.notify();
  }

  public toggleBatterySaver() {
    const nextVal = !this.state.isBatterySaver;
    this.state.isBatterySaver = nextVal;
    liveLocationStore.setPowerMode(nextVal);
    this.notify();
  }

  public async toggleKeepScreenOn() {
    if (this.state.keepScreenOn) {
      this.releaseWakeLock();
      this.state.keepScreenOn = false;
    } else {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        try {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
          this.state.keepScreenOn = true;
          this.wakeLockSentinel.addEventListener("release", () => {
            this.state.keepScreenOn = false;
            this.notify();
          });
        } catch {
          this.state.keepScreenOn = false;
        }
      }
    }
    this.notify();
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
    this.state.keepScreenOn = false;
  }

  public requestFitRoute() {
    this.state.fitRouteNonce++;
    this.notify();
  }
}

export const liveNavigationStore = new LiveNavigationStore();
