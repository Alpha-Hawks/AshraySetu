// Pure safe shelter ranking, eligibility, provenance, hysteresis, and coverage logic
import * as turf from "@turf/turf";
import { generateSurgeInundationZone } from "./turfCalculations.ts";
import {
  TREAT_STANDBY_AS_OPEN,
  MIN_FREE_BEDS,
  NEARLY_FULL_RATIO,
  SHORTLIST_K,
  COVERAGE_WARN_KM,
  MAX_ROUTABLE_KM,
  MAX_WALK_ADVISE_KM,
  TIE_WINDOW,
  SWITCH_ROUTED,
  SWITCH_STRAIGHT,
  ACCURACY_NAV_MAX_M,
} from "./navConfig.ts";

export interface ShelterCandidate {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity_persons: number;
  current_occupancy: number;
  status: "ACTIVE" | "SATURATED" | "STANDBY" | "DAMAGED" | string;
  state?: "ODISHA" | "ANDHRA_PRADESH" | string;
  district?: string;
  block_name: string;
  gram_panchayat?: string;
  incharge_name?: string;
  incharge_phone?: string;
  has_solar_backup?: boolean;
  has_borewell?: boolean;
  lastLocalChangeAt?: number | null;
}

export interface ShelterProvenance {
  isLive: boolean;
  isSample: boolean;
  freeBeds: number;
  displayText: string;
  badgeText: string;
}

export interface RankedCandidate {
  shelter: ShelterCandidate;
  distanceKm: number; // rounded for display
  distanceM: number; // raw geodesic meters
  durationS?: number | null; // routed duration in seconds (Stage 2)
  routedDistanceM?: number | null; // routed distance in meters (Stage 2)
  freeBeds: number;
  nearlyFull: boolean;
  inSurgeZone: boolean;
  isStandby: boolean;
  provenance: ShelterProvenance;
}

// Memoized module-level surge polygon for Kendrapara coast
let _memoizedSurgeZone: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
export function getSurgeZone(): GeoJSON.Feature<GeoJSON.Polygon> {
  if (!_memoizedSurgeZone) {
    _memoizedSurgeZone = generateSurgeInundationZone(3.5);
  }
  return _memoizedSurgeZone;
}

/**
 * FR-S1. Pure eligibility check
 * Saturated, damaged, or full shelters are excluded.
 * Standby is included only if TREAT_STANDBY_AS_OPEN is true.
 * Coordinates must be finite and within geographic ranges.
 */
export function isEligibleShelter(s: ShelterCandidate): boolean {
  if (
    !s ||
    !Number.isFinite(s.latitude) ||
    !Number.isFinite(s.longitude) ||
    Math.abs(s.latitude) > 90 ||
    Math.abs(s.longitude) > 180
  ) {
    return false;
  }

  const isOpen =
    s.status === "ACTIVE" || (TREAT_STANDBY_AS_OPEN && s.status === "STANDBY");
  if (!isOpen) return false;

  if (typeof s.capacity_persons !== "number" || s.capacity_persons <= 0) {
    return false;
  }

  const occupancy = typeof s.current_occupancy === "number" ? s.current_occupancy : 0;
  const freeBeds = s.capacity_persons - occupancy;
  return freeBeds >= MIN_FREE_BEDS;
}

/**
 * Relative time formatter for provenance (offline-safe)
 */
export function formatRelativeTime(timestampMs: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * FR-S1a. Compute availability provenance
 */
export function computeShelterProvenance(
  s: ShelterCandidate,
  nowMs = Date.now()
): ShelterProvenance {
  const freeBeds = Math.max(0, s.capacity_persons - (s.current_occupancy || 0));

  if (!s.lastLocalChangeAt) {
    return {
      isLive: false,
      isSample: true,
      freeBeds,
      displayText: `Space: not live. Sample data shipped with the app. Holds about ${s.capacity_persons} people.`,
      badgeText: "Sample data (not live)",
    };
  }

  const relTime = formatRelativeTime(s.lastLocalChangeAt, nowMs);
  return {
    isLive: true,
    isSample: false,
    freeBeds,
    displayText: `Free beds: ${freeBeds} · updated on this device ${relTime}`,
    badgeText: `Updated on device (${relTime})`,
  };
}

/**
 * Extract candidate flags
 */
export function evaluateCandidateFlags(
  s: ShelterCandidate,
  surgePolygon = getSurgeZone(),
  nowMs = Date.now()
): {
  freeBeds: number;
  nearlyFull: boolean;
  inSurgeZone: boolean;
  isStandby: boolean;
  provenance: ShelterProvenance;
} {
  const freeBeds = Math.max(0, s.capacity_persons - (s.current_occupancy || 0));
  const nearlyFull = freeBeds / s.capacity_persons < NEARLY_FULL_RATIO;
  const point = turf.point([s.longitude, s.latitude]);
  const inSurgeZone = (turf as any).booleanPointInPolygon(point, surgePolygon);
  const isStandby = s.status === "STANDBY";
  const provenance = computeShelterProvenance(s, nowMs);

  return { freeBeds, nearlyFull, inSurgeZone, isStandby, provenance };
}

/**
 * FR-S5. Deterministic tie-break sorting within a tie group
 * 1. more freeBeds (descending)
 * 2. has_solar_backup (true first)
 * 3. has_borewell (true first)
 * 4. id ascending
 */
export function sortTieGroup(group: RankedCandidate[]): RankedCandidate[] {
  return group.slice().sort((a, b) => {
    if (b.freeBeds !== a.freeBeds) {
      return b.freeBeds - a.freeBeds;
    }
    const aSolar = a.shelter.has_solar_backup ? 1 : 0;
    const bSolar = b.shelter.has_solar_backup ? 1 : 0;
    if (bSolar !== aSolar) {
      return bSolar - aSolar;
    }
    const aBore = a.shelter.has_borewell ? 1 : 0;
    const bBore = b.shelter.has_borewell ? 1 : 0;
    if (bBore !== aBore) {
      return bBore - aBore;
    }
    return a.shelter.id.localeCompare(b.shelter.id);
  });
}

/**
 * FR-S3. Stage 1 Ranking (Offline, always available)
 * Calculates geodesic distance to every eligible shelter using raw turf.distance.
 * Surge-zone shelters are NEVER penalized or down-ranked.
 */
export function rankSheltersStage1(
  userLat: number,
  userLng: number,
  allShelters: ShelterCandidate[],
  nowMs = Date.now()
): RankedCandidate[] {
  const surge = getSurgeZone();
  const eligible = allShelters.filter(isEligibleShelter);
  if (eligible.length === 0) return [];

  const userPoint = turf.point([userLng, userLat]);

  const candidates: RankedCandidate[] = eligible.map((shelter) => {
    const sPoint = turf.point([shelter.longitude, shelter.latitude]);
    const kmRaw = turf.distance(userPoint, sPoint, { units: "kilometers" });
    const distanceM = kmRaw * 1000;
    const distanceKm = Math.round(kmRaw * 10) / 10;
    const flags = evaluateCandidateFlags(shelter, surge, nowMs);

    return {
      shelter,
      distanceKm,
      distanceM,
      freeBeds: flags.freeBeds,
      nearlyFull: flags.nearlyFull,
      inSurgeZone: flags.inSurgeZone,
      isStandby: flags.isStandby,
      provenance: flags.provenance,
    };
  });

  // Sort by raw distanceM ascending
  candidates.sort((a, b) => a.distanceM - b.distanceM);

  if (candidates.length <= 1) return candidates;

  // Apply FR-S5 tie-break anchored on the best candidate
  const bestM = candidates[0].distanceM;
  const isTied = (c: RankedCandidate) =>
    c.distanceM <= bestM * (1 + TIE_WINDOW.ratio) ||
    c.distanceM <= bestM + TIE_WINDOW.distanceM;

  const tieGroup: RankedCandidate[] = [];
  const nonTieGroup: RankedCandidate[] = [];

  for (const c of candidates) {
    if (isTied(c)) {
      tieGroup.push(c);
    } else {
      nonTieGroup.push(c);
    }
  }

  const sortedTieGroup = sortTieGroup(tieGroup);
  return [...sortedTieGroup, ...nonTieGroup];
}

/**
 * FR-S4. Stage 2 Ranking (Online and routing opted in)
 * Ranks candidates by durationS from routing matrix.
 * Null or unreachable durations rank after reachable ones, ordered by straight-line distance.
 */
export function rankSheltersStage2(
  stage1Candidates: RankedCandidate[],
  durationsS: (number | null)[],
  distancesM?: (number | null)[]
): RankedCandidate[] {
  if (stage1Candidates.length === 0) return [];
  if (!durationsS || durationsS.length === 0) return stage1Candidates;

  const enriched: RankedCandidate[] = stage1Candidates.map((c, idx) => ({
    ...c,
    durationS: typeof durationsS[idx] === "number" ? durationsS[idx] : null,
    routedDistanceM:
      distancesM && typeof distancesM[idx] === "number"
        ? distancesM[idx]
        : null,
  }));

  const reachable = enriched.filter((c) => c.durationS !== null);
  const unreachable = enriched.filter((c) => c.durationS === null);

  if (reachable.length === 0) {
    // All failed -> fall back to Stage 1 order
    return stage1Candidates;
  }

  reachable.sort((a, b) => (a.durationS as number) - (b.durationS as number));

  // Tie-break among reachable candidates against best duration
  const bestS = reachable[0].durationS as number;
  const isTied = (c: RankedCandidate) =>
    (c.durationS as number) <= bestS * (1 + TIE_WINDOW.ratio) ||
    (c.durationS as number) <= bestS + TIE_WINDOW.durationS;

  const tieGroup: RankedCandidate[] = [];
  const nonTieGroup: RankedCandidate[] = [];

  for (const c of reachable) {
    if (isTied(c)) {
      tieGroup.push(c);
    } else {
      nonTieGroup.push(c);
    }
  }

  const sortedTies = sortTieGroup(tieGroup);

  // Unreachable ordered by straight-line distance
  unreachable.sort((a, b) => a.distanceM - b.distanceM);

  return [...sortedTies, ...nonTieGroup, ...unreachable];
}

/**
 * FR-S3a. Imprecise fix check
 * Trigger: accuracyM > ACCURACY_NAV_MAX_M and accuracyM >= (d2 - d1)
 */
export function checkImpreciseFix(
  accuracyM: number,
  rankedCandidates: RankedCandidate[]
): {
  isImprecise: boolean;
  topCandidates: RankedCandidate[];
} {
  if (rankedCandidates.length < 2 || accuracyM <= ACCURACY_NAV_MAX_M) {
    return { isImprecise: false, topCandidates: [] };
  }

  const d1 = rankedCandidates[0].distanceM;
  const d2 = rankedCandidates[1].distanceM;

  if (accuracyM >= d2 - d1) {
    return {
      isImprecise: true,
      topCandidates: rankedCandidates.slice(0, 3),
    };
  }

  return { isImprecise: false, topCandidates: [] };
}

/**
 * FR-S6. Hysteresis switch evaluator
 */
export function evaluateTargetSwitch(params: {
  currentTarget: RankedCandidate | null;
  bestCandidate: RankedCandidate;
  isDeparted: boolean;
  mode: "routed" | "straightLine";
}): {
  action: "switch" | "suggest" | "keep";
  reason?: string;
} {
  const { currentTarget, bestCandidate, isDeparted, mode } = params;

  if (!currentTarget) {
    return { action: "switch", reason: "initial_target" };
  }

  if (currentTarget.shelter.id === bestCandidate.shelter.id) {
    return { action: "keep" };
  }

  // If current target is no longer eligible, immediate automatic switch even after departure!
  if (!isEligibleShelter(currentTarget.shelter)) {
    return { action: "switch", reason: "current_ineligible" };
  }

  // Check hysteresis thresholds
  let qualifies = false;

  if (
    mode === "routed" &&
    typeof currentTarget.durationS === "number" &&
    typeof bestCandidate.durationS === "number"
  ) {
    const cSec = currentTarget.durationS;
    const bSec = bestCandidate.durationS;
    qualifies =
      bSec <= cSec * (1 - SWITCH_ROUTED.ratio) ||
      cSec - bSec >= SWITCH_ROUTED.durationS;
  } else {
    // Straight-line comparison (or fallback if either routed duration is missing)
    const cM = currentTarget.distanceM;
    const bM = bestCandidate.distanceM;
    qualifies =
      bM <= cM * (1 - SWITCH_STRAIGHT.ratio) ||
      cM - bM >= SWITCH_STRAIGHT.distanceM;
  }

  if (!qualifies) {
    return { action: "keep" };
  }

  // If qualified:
  if (!isDeparted) {
    // Before departure, switch automatically
    return { action: "switch", reason: "significant_gain_pre_departure" };
  }

  // After departure, offer persistent suggestion card
  return { action: "suggest", reason: "nearer_available_post_departure" };
}

/**
 * FR-S8. Find nearer ineligible shelter alert
 * If the nearest ineligible shelter is at least 2 km closer than the target and at most half its distance
 */
export function findNearerIneligibleAlert(
  userLat: number,
  userLng: number,
  target: RankedCandidate,
  allShelters: ShelterCandidate[]
): {
  shelter: ShelterCandidate;
  distanceKm: number;
  reason: "Full" | "Damaged" | "Standby" | "Unavailable";
} | null {
  const userPoint = turf.point([userLng, userLat]);
  const ineligibles = allShelters.filter((s) => !isEligibleShelter(s));

  let candidate: {
    shelter: ShelterCandidate;
    distanceM: number;
  } | null = null;

  for (const s of ineligibles) {
    const sPoint = turf.point([s.longitude, s.latitude]);
    const distM =
      turf.distance(userPoint, sPoint, { units: "kilometers" }) * 1000;

    if (!candidate || distM < candidate.distanceM) {
      candidate = { shelter: s, distanceM: distM };
    }
  }

  if (
    candidate &&
    candidate.distanceM <= target.distanceM - 2000 &&
    candidate.distanceM <= target.distanceM / 2
  ) {
    let reason: "Full" | "Damaged" | "Standby" | "Unavailable" = "Unavailable";
    const status = candidate.shelter.status;
    if (status === "DAMAGED") reason = "Damaged";
    else if (status === "STANDBY") reason = "Standby";
    else if (
      status === "SATURATED" ||
      candidate.shelter.capacity_persons - (candidate.shelter.current_occupancy || 0) <
        MIN_FREE_BEDS
    ) {
      reason = "Full";
    }

    return {
      shelter: candidate.shelter,
      distanceKm: Math.round((candidate.distanceM / 1000) * 10) / 10,
      reason,
    };
  }

  return null;
}

/**
 * FR-S9. Coverage state check
 */
export function checkCoverageState(nearestDistanceKm: number | null): {
  isOutOfCoverage: boolean;
  isBeyondMaxRoutable: boolean;
} {
  if (nearestDistanceKm === null) {
    return { isOutOfCoverage: false, isBeyondMaxRoutable: false };
  }
  return {
    isOutOfCoverage: nearestDistanceKm > COVERAGE_WARN_KM,
    isBeyondMaxRoutable: nearestDistanceKm > MAX_ROUTABLE_KM,
  };
}

/**
 * FR-S10. Walk distance advisory check
 */
export function checkWalkAdvisory(profile: "foot" | "car", distanceKm: number): boolean {
  return profile === "foot" && distanceKm > MAX_WALK_ADVISE_KM;
}
