import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isEligibleShelter,
  computeShelterProvenance,
  rankSheltersStage1,
  rankSheltersStage2,
  checkImpreciseFix,
  evaluateTargetSwitch,
  findNearerIneligibleAlert,
  checkCoverageState,
  checkWalkAdvisory,
  type ShelterCandidate,
} from "../safeShelter.ts";

const mockShelter = (overrides: Partial<ShelterCandidate> = {}): ShelterCandidate => ({
  id: "TEST-001",
  name: "Test Shelter",
  latitude: 20.5,
  longitude: 86.8,
  capacity_persons: 400,
  current_occupancy: 100,
  status: "ACTIVE",
  state: "ODISHA",
  district: "Kendrapara",
  block_name: "Rajnagar",
  has_solar_backup: true,
  has_borewell: true,
  ...overrides,
});

describe("Safe Shelter Eligibility (FR-S1)", () => {
  test("Excludes SATURATED shelter (e.g. Hukitola 395/400)", () => {
    const hukitola = mockShelter({
      id: "OD-KEN-MAH-005",
      name: "Hukitola High School",
      capacity_persons: 400,
      current_occupancy: 395,
      status: "SATURATED",
    });
    assert.equal(isEligibleShelter(hukitola), false);
  });

  test("Excludes ACTIVE shelter at capacity", () => {
    const full = mockShelter({
      capacity_persons: 200,
      current_occupancy: 200,
      status: "ACTIVE",
    });
    assert.equal(isEligibleShelter(full), false);
  });

  test("Excludes DAMAGED shelter", () => {
    const damaged = mockShelter({ status: "DAMAGED" });
    assert.equal(isEligibleShelter(damaged), false);
  });

  test("STANDBY shelter is included when TREAT_STANDBY_AS_OPEN is true", () => {
    const standby = mockShelter({ status: "STANDBY", current_occupancy: 50 });
    assert.equal(isEligibleShelter(standby), true);
  });

  test("Excludes capacity_persons <= 0 and invalid/NaN coordinates", () => {
    assert.equal(isEligibleShelter(mockShelter({ capacity_persons: 0 })), false);
    assert.equal(isEligibleShelter(mockShelter({ latitude: NaN })), false);
    assert.equal(isEligibleShelter(mockShelter({ longitude: 200 })), false);
  });

  test("OD-KEN-RAJ-001 and RAJ-002 are in surge zone, stay eligible, and get surge flag", () => {
    const raj001 = mockShelter({
      id: "OD-KEN-RAJ-001",
      latitude: 20.48,
      longitude: 86.83,
    });
    assert.equal(isEligibleShelter(raj001), true);
    const ranked = rankSheltersStage1(20.5214, 86.8523, [raj001]);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].inSurgeZone, true);
  });
});

describe("Availability Provenance (FR-S1a)", () => {
  test("Shelter with no local rows is treated as sample data", () => {
    const s = mockShelter({ lastLocalChangeAt: null, capacity_persons: 350 });
    const prov = computeShelterProvenance(s);
    assert.equal(prov.isSample, true);
    assert.equal(prov.isLive, false);
    assert.match(prov.displayText, /Space: not live\. Sample data shipped with the app/);
  });

  test("Shelter with real admission/registration shows updated on device", () => {
    const now = 1700000000000;
    const s = mockShelter({
      lastLocalChangeAt: now - 300_000, // 5 min ago
      capacity_persons: 300,
      current_occupancy: 120,
    });
    const prov = computeShelterProvenance(s, now);
    assert.equal(prov.isSample, false);
    assert.equal(prov.isLive, true);
    assert.match(prov.displayText, /Free beds: 180 · updated on this device 5 min ago/);
  });
});

describe("Ranking & Tie-Breaks (FR-S3, FR-S5)", () => {
  test("Shelters at 0.36 km and 0.44 km rank 0.36 km first", () => {
    // 0.36 km = ~360m, 0.44 km = ~440m (80m and 22% apart: exceeds 5% and 50m tie window)
    const userLat = 20.5000;
    const userLng = 86.8000;
    // ~360m north is lat ~20.50325
    const s1 = mockShelter({ id: "S1", latitude: 20.50325, longitude: 86.8000 });
    // ~440m north is lat ~20.50397
    const s2 = mockShelter({ id: "S2", latitude: 20.50397, longitude: 86.8000 });

    const ranked = rankSheltersStage1(userLat, userLng, [s2, s1]);
    assert.equal(ranked[0].shelter.id, "S1");
    assert.equal(ranked[1].shelter.id, "S2");
  });

  test("Shelters 40m apart are tied and sorted by FR-S5 rules (freeBeds > solar > borewell > id)", () => {
    const userLat = 20.5000;
    const userLng = 86.8000;
    // Base point at ~1000m
    const sA = mockShelter({
      id: "S-A",
      latitude: 20.5090,
      longitude: 86.8000,
      capacity_persons: 500,
      current_occupancy: 100, // freeBeds = 400
      has_solar_backup: true,
      has_borewell: true,
    });
    // ~40m away: still tied (within 50m of S-A)
    const sB = mockShelter({
      id: "S-B",
      latitude: 20.50936, // ~40m further
      longitude: 86.8000,
      capacity_persons: 600,
      current_occupancy: 100, // freeBeds = 500 (more free beds!)
      has_solar_backup: true,
      has_borewell: true,
    });

    const ranked = rankSheltersStage1(userLat, userLng, [sA, sB]);
    // sB wins tie-break because 500 free beds > 400 free beds
    assert.equal(ranked[0].shelter.id, "S-B");
    assert.equal(ranked[1].shelter.id, "S-A");
  });

  test("Surge-zone shelter is never penalized vs further non-surge shelter", () => {
    // Batighar (surge zone) ~1.0 km vs non-surge ~1.2 km
    const surgeNear = mockShelter({
      id: "SURGE-NEAR",
      latitude: 20.48,
      longitude: 86.83, // Batighar area
    });
    const inlandFar = mockShelter({
      id: "INLAND-FAR",
      latitude: 20.58,
      longitude: 86.70, // Kendrapara inland
    });

    const ranked = rankSheltersStage1(20.488, 86.835, [inlandFar, surgeNear]);
    assert.equal(ranked[0].shelter.id, "SURGE-NEAR");
  });

  test("Stage 2 matrix ranking: null durations rank last, sorted by straight-line", () => {
    const s1 = mockShelter({ id: "S1", latitude: 20.51, longitude: 86.81 });
    const s2 = mockShelter({ id: "S2", latitude: 20.52, longitude: 86.82 });
    const s3 = mockShelter({ id: "S3", latitude: 20.53, longitude: 86.83 });

    const stage1 = rankSheltersStage1(20.50, 86.80, [s1, s2, s3]);
    // s1 has null duration, s2 has 500s, s3 has 300s
    const stage2 = rankSheltersStage2(stage1, [null, 500, 300]);

    assert.equal(stage2[0].shelter.id, "S3"); // 300s fastest
    assert.equal(stage2[1].shelter.id, "S2"); // 500s
    assert.equal(stage2[2].shelter.id, "S1"); // null unreachable ranks last
  });
});

describe("Imprecise Fix Detector (FR-S3a)", () => {
  test("3 km accuracy with candidates 1 km apart triggers multi-choice", () => {
    const s1 = mockShelter({ id: "S1", latitude: 20.509, longitude: 86.80 }); // ~1 km
    const s2 = mockShelter({ id: "S2", latitude: 20.518, longitude: 86.80 }); // ~2 km
    const stage1 = rankSheltersStage1(20.50, 86.80, [s1, s2]);

    const res = checkImpreciseFix(3000, stage1);
    assert.equal(res.isImprecise, true);
    assert.equal(res.topCandidates.length, 2);
  });

  test("3 km accuracy with candidates at 1 km and 15 km does not trigger multi-choice", () => {
    const s1 = mockShelter({ id: "S1", latitude: 20.509, longitude: 86.80 }); // ~1 km
    const s2 = mockShelter({ id: "S2", latitude: 20.635, longitude: 86.80 }); // ~15 km
    const stage1 = rankSheltersStage1(20.50, 86.80, [s1, s2]);

    const res = checkImpreciseFix(3000, stage1);
    assert.equal(res.isImprecise, false);
  });
});

describe("Hysteresis & Departure Switch Rules (FR-S6)", () => {
  const current = (durationS: number, distanceM: number) => ({
    shelter: mockShelter({ id: "CURRENT" }),
    distanceKm: distanceM / 1000,
    distanceM,
    durationS,
    freeBeds: 200,
    nearlyFull: false,
    inSurgeZone: false,
    isStandby: false,
    provenance: computeShelterProvenance(mockShelter()),
  });

  const candidate = (durationS: number, distanceM: number, id = "BETTER") => ({
    shelter: mockShelter({ id }),
    distanceKm: distanceM / 1000,
    distanceM,
    durationS,
    freeBeds: 200,
    nearlyFull: false,
    inSurgeZone: false,
    isStandby: false,
    provenance: computeShelterProvenance(mockShelter()),
  });

  test("Routed: 15% faster on 600s (90s gain): no switch", () => {
    const res = evaluateTargetSwitch({
      currentTarget: current(600, 5000),
      bestCandidate: candidate(510, 4250), // 90s faster (15%)
      isDeparted: false,
      mode: "routed",
    });
    assert.equal(res.action, "keep");
  });

  test("Routed: 25% faster on 600s: switch before departure", () => {
    const res = evaluateTargetSwitch({
      currentTarget: current(600, 5000),
      bestCandidate: candidate(450, 3750), // 150s faster (25%)
      isDeparted: false,
      mode: "routed",
    });
    assert.equal(res.action, "switch");
  });

  test("Routed: 130s faster on 1,200s: switch before departure", () => {
    const res = evaluateTargetSwitch({
      currentTarget: current(1200, 10000),
      bestCandidate: candidate(1070, 9000), // 130s faster (>= 120s)
      isDeparted: false,
      mode: "routed",
    });
    assert.equal(res.action, "switch");
  });

  test("Straight-line: 200m shorter at 5 km: no switch. 300m shorter: switch", () => {
    const noSwitch = evaluateTargetSwitch({
      currentTarget: current(null as any, 5000),
      bestCandidate: candidate(null as any, 4800), // 200m shorter (<250m and <20%)
      isDeparted: false,
      mode: "straightLine",
    });
    assert.equal(noSwitch.action, "keep");

    const doSwitch = evaluateTargetSwitch({
      currentTarget: current(null as any, 5000),
      bestCandidate: candidate(null as any, 4700), // 300m shorter (>=250m)
      isDeparted: false,
      mode: "straightLine",
    });
    assert.equal(doSwitch.action, "switch");
  });

  test("Target becomes ineligible: immediate automatic switch even after departure", () => {
    const ineligCurrent = current(600, 5000);
    ineligCurrent.shelter.status = "DAMAGED";

    const res = evaluateTargetSwitch({
      currentTarget: ineligCurrent,
      bestCandidate: candidate(550, 4800),
      isDeparted: true, // departed!
      mode: "routed",
    });
    assert.equal(res.action, "switch");
    assert.equal(res.reason, "current_ineligible");
  });

  test("After departure, qualifying gain emits suggestion card instead of automatic switch", () => {
    const res = evaluateTargetSwitch({
      currentTarget: current(600, 5000),
      bestCandidate: candidate(420, 3500), // 180s faster (30%)
      isDeparted: true,
      mode: "routed",
    });
    assert.equal(res.action, "suggest");
  });
});

describe("Ineligible Alert, Coverage, & Advisory (FR-S8, S9, S10)", () => {
  test("FR-S8: Ineligible shelter 2km closer and <= half distance emits alert", () => {
    const userLat = 20.50;
    const userLng = 86.80;
    const target = {
      shelter: mockShelter({ id: "TARGET", latitude: 20.58, longitude: 86.80 }), // ~8.8 km away
      distanceKm: 8.8,
      distanceM: 8800,
      freeBeds: 200,
      nearlyFull: false,
      inSurgeZone: false,
      isStandby: false,
      provenance: computeShelterProvenance(mockShelter()),
    };
    const damaged = mockShelter({
      id: "DAMAGED-1",
      name: "Nearby Damaged School",
      latitude: 20.525, // ~2.7 km away
      longitude: 86.80,
      status: "DAMAGED",
    });

    const alert = findNearerIneligibleAlert(userLat, userLng, target, [damaged]);
    assert.notEqual(alert, null);
    assert.equal(alert?.reason, "Damaged");
  });

  test("Coverage: outside coverage area (>50 km) and beyond max routable (>100 km)", () => {
    assert.deepEqual(checkCoverageState(40), { isOutOfCoverage: false, isBeyondMaxRoutable: false });
    assert.deepEqual(checkCoverageState(65), { isOutOfCoverage: true, isBeyondMaxRoutable: false });
    assert.deepEqual(checkCoverageState(120), { isOutOfCoverage: true, isBeyondMaxRoutable: true });
  });

  test("Walk advisory shown if walking distance > 3 km", () => {
    assert.equal(checkWalkAdvisory("foot", 2.8), false);
    assert.equal(checkWalkAdvisory("foot", 3.5), true);
    assert.equal(checkWalkAdvisory("car", 10), false);
  });
});
