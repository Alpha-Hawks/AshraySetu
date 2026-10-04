import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as turf from "@turf/turf";
import {
  toLngLat,
  toLatLng,
  distanceM,
  shouldCommitFix,
  computeHeading,
  evaluateFixOffRoute,
  checkOffRouteHistory,
  checkArrivalAtShelter,
  calculateRouteProgress,
  calculateBearingAndCardinal,
  formatDistanceDisplay,
  formatDurationDisplay,
  buildExternalMapLinks,
  buildSurgeAvoidPolygon,
  type NavFix,
} from "../navMath.ts";

const makeFix = (overrides: Partial<NavFix> = {}): NavFix => ({
  lat: 20.5000,
  lng: 86.8000,
  accuracyM: 10,
  headingDeg: null,
  speedMps: null,
  timestamp: 1000,
  receivedAt: 1000,
  approximate: false,
  ...overrides,
});

describe("Coordinate Conversions & Geodesic Distance", () => {
  test("toLngLat and toLatLng invert accurately", () => {
    const latLng: [number, number] = [20.5214, 86.8523];
    const lngLat = toLngLat(latLng);
    assert.deepEqual(lngLat, [86.8523, 20.5214]);
    assert.deepEqual(toLatLng(lngLat), latLng);
  });

  test("distanceM calculates correct geodesic distance", () => {
    // 1 deg latitude is approx 111 km = 111,000 m
    const d = distanceM([20.0, 86.0], [21.0, 86.0]);
    assert.ok(d > 110_000 && d < 112_000);
  });
});

describe("FR-T3. Commit Rule", () => {
  test("Drops out-of-order timestamps", () => {
    const last = makeFix({ timestamp: 2000, receivedAt: 2000 });
    const old = makeFix({ timestamp: 1999, receivedAt: 3500 });
    assert.equal(shouldCommitFix(old, last, 3500), false);

    const same = makeFix({ timestamp: 2000, receivedAt: 3500 });
    assert.equal(shouldCommitFix(same, last, 3500), false);
  });

  test("Stationary fix commits after COMMIT_MAX_SILENCE_MS (15s)", () => {
    const last = makeFix({ timestamp: 1000, receivedAt: 1000 });
    const current = makeFix({ timestamp: 16000, receivedAt: 16000 });
    assert.equal(shouldCommitFix(current, last, 16000), true);
  });

  test("Accuracy worsening from 10m to 800m commits", () => {
    const last = makeFix({ accuracyM: 10, timestamp: 1000, receivedAt: 1000 });
    const current = makeFix({ accuracyM: 800, timestamp: 3000, receivedAt: 3000 });
    assert.equal(shouldCommitFix(current, last, 3000), true);
  });

  test("Movement >= 5m commits after interval", () => {
    const last = makeFix({ lat: 20.5000, lng: 86.8000, timestamp: 1000, receivedAt: 1000 });
    // ~10m move north
    const current = makeFix({ lat: 20.50009, lng: 86.8000, timestamp: 2500, receivedAt: 2500 });
    assert.equal(shouldCommitFix(current, last, 2500), true);
  });
});

describe("FR-T5. Heading Calculation", () => {
  test("Uses device heading when speed >= 0.5 m/s", () => {
    const cur = { lat: 20.5, lng: 86.8, headingDeg: 85, speedMps: 1.2 };
    assert.equal(computeHeading(cur, null), 85);
  });

  test("Derives heading from turf.bearing when moved >= 10m", () => {
    const prev = { lat: 20.5000, lng: 86.8000 };
    // Move ~20m East
    const cur = { lat: 20.5000, lng: 86.8002, headingDeg: null, speedMps: 0.1 };
    const heading = computeHeading(cur, prev);
    assert.notEqual(heading, null);
    assert.ok(Math.abs((heading as number) - 90) < 5); // East ~90 deg
  });

  test("Returns null if stationary without compass heading", () => {
    const prev = { lat: 20.5000, lng: 86.8000 };
    const cur = { lat: 20.500001, lng: 86.8000, headingDeg: null, speedMps: 0 };
    assert.equal(computeHeading(cur, prev), null);
  });
});

describe("FR-D8. Off-Route Detection", () => {
  // A straight road from west to east
  const routeLine: GeoJSON.LineString = {
    type: "LineString",
    coordinates: [
      [86.8000, 20.5000],
      [86.8200, 20.5000],
    ],
  };

  test("Fix close to route is not off-route", () => {
    const fix = makeFix({ lat: 20.5001, lng: 86.8100, accuracyM: 10 }); // ~11m away
    const res = evaluateFixOffRoute(fix, routeLine);
    assert.equal(res.isOff, false);
  });

  test("Fix with accuracy > 75m is ignored for off-route decisions", () => {
    const fix = makeFix({ lat: 20.5050, lng: 86.8100, accuracyM: 90 }); // far, but imprecise
    const res = evaluateFixOffRoute(fix, routeLine);
    assert.equal(res.isOff, false);
  });

  test("Threshold clamps between 35m and 150m", () => {
    // accuracy = 10m -> 1.5 * 10 = 15m -> clamped to 35m
    const resLow = evaluateFixOffRoute(makeFix({ accuracyM: 10 }), routeLine);
    assert.equal(resLow.thresholdM, 35);

    // accuracy = 60m -> 1.5 * 60 = 90m
    const resMid = evaluateFixOffRoute(makeFix({ accuracyM: 60 }), routeLine);
    assert.equal(resMid.thresholdM, 90);
  });

  test("checkOffRouteHistory requires 3 consecutive fixes spanning >= 10s", () => {
    // 2 fixes: not enough
    assert.equal(
      checkOffRouteHistory([
        { isOff: true, receivedAt: 1000, accuracyM: 15 },
        { isOff: true, receivedAt: 12000, accuracyM: 15 },
      ]),
      false
    );

    // 3 fixes, but only 5s span: not enough
    assert.equal(
      checkOffRouteHistory([
        { isOff: true, receivedAt: 1000, accuracyM: 15 },
        { isOff: true, receivedAt: 3000, accuracyM: 15 },
        { isOff: true, receivedAt: 6000, accuracyM: 15 },
      ]),
      false
    );

    // 3 fixes spanning 11s: off-route!
    assert.equal(
      checkOffRouteHistory([
        { isOff: true, receivedAt: 1000, accuracyM: 15 },
        { isOff: true, receivedAt: 6000, accuracyM: 15 },
        { isOff: true, receivedAt: 12000, accuracyM: 15 },
      ]),
      true
    );
  });
});

describe("FR-D11. Arrival Detection", () => {
  test("Arrives when within max(30, accuracyM)", () => {
    const shelter = { lat: 20.5000, lng: 86.8000 };
    // 20m away with 10m accuracy (radius is 30m) -> arrived!
    const fixClose = makeFix({ lat: 20.50015, lng: 86.8000, accuracyM: 10 });
    assert.equal(checkArrivalAtShelter(fixClose, shelter.lat, shelter.lng), true);

    // 45m away with 10m accuracy -> not arrived
    const fixFar = makeFix({ lat: 20.5004, lng: 86.8000, accuracyM: 10 });
    assert.equal(checkArrivalAtShelter(fixFar, shelter.lat, shelter.lng), false);
  });

  test("Ignores fixes with accuracy > 75m for arrival", () => {
    const shelter = { lat: 20.5000, lng: 86.8000 };
    const fixImprecise = makeFix({ lat: 20.50005, lng: 86.8000, accuracyM: 100 });
    assert.equal(checkArrivalAtShelter(fixImprecise, shelter.lat, shelter.lng), false);
  });
});

describe("FR-D6. Route Progress & Walking Scaling", () => {
  const routeLine: GeoJSON.LineString = {
    type: "LineString",
    coordinates: [
      [86.8000, 20.5000],
      [86.8100, 20.5000],
      [86.8200, 20.5000],
    ],
  };

  test("Scales foot walking time by PROVIDER_FOOT_KMH / WALK_SPEED_KMH (1.667x)", () => {
    const progress = calculateRouteProgress(
      [20.5000, 86.8000],
      routeLine,
      600, // 10 min
      2000,
      "foot"
    );
    // At start, remaining is ~100%, scaled by 5 / 3 = 1000s
    assert.ok(Math.abs(progress.remainingDurationS - 1000) < 5);
  });

  test("Car driving time is not scaled", () => {
    const progress = calculateRouteProgress(
      [20.5000, 86.8000],
      routeLine,
      600,
      2000,
      "car"
    );
    assert.ok(Math.abs(progress.remainingDurationS - 600) < 5);
  });
});

describe("FR-D9. Bearing & 8-point Cardinal", () => {
  test("Calculates correct bearing and cardinal at sector boundaries", () => {
    // Directly North
    assert.equal(calculateBearingAndCardinal([20.0, 86.0], [21.0, 86.0]).cardinalKey, "N");
    // Directly East
    assert.equal(calculateBearingAndCardinal([20.0, 86.0], [20.0, 87.0]).cardinalKey, "E");
    // Directly South
    assert.equal(calculateBearingAndCardinal([21.0, 86.0], [20.0, 86.0]).cardinalKey, "S");
    // Directly West
    assert.equal(calculateBearingAndCardinal([20.0, 87.0], [20.0, 86.0]).cardinalKey, "W");
    // North-East
    assert.equal(calculateBearingAndCardinal([20.0, 86.0], [21.0, 87.0]).cardinalKey, "NE");
  });
});

describe("Section 7.2 Formatting", () => {
  test("Distance formatting boundaries: <1000m rounded to 10m, <100km to 1dp, >=100km whole", () => {
    assert.equal(formatDistanceDisplay(453), "450 m");
    assert.equal(formatDistanceDisplay(994), "990 m");
    assert.equal(formatDistanceDisplay(1005), "1.0 km");
    assert.equal(formatDistanceDisplay(4250), "4.3 km");
    assert.equal(formatDistanceDisplay(99950), "100.0 km");
    assert.equal(formatDistanceDisplay(124300), "124 km");
  });

  test("Duration formatting: <1 min, minutes, and h min format", () => {
    assert.equal(formatDurationDisplay(45), "<1 min");
    assert.equal(formatDurationDisplay(120), "2 min");
    assert.equal(formatDurationDisplay(3600), "1 h 00 min");
    assert.equal(formatDurationDisplay(3900), "1 h 05 min");
    assert.equal(formatDurationDisplay(7320), "2 h 02 min");
  });
});

describe("FR-D12. Deep Links", () => {
  test("Deep links never contain origin coordinates", () => {
    const links = buildExternalMapLinks(20.4800, 86.8300, "Batighar Cyclone Shelter", "foot");
    assert.match(links.google, /destination=20\.48%2C86\.83/);
    assert.doesNotMatch(links.google, /origin=/);
    assert.match(links.apple, /daddr=20\.48,86\.83/);
    assert.doesNotMatch(links.apple, /saddr=/);
    assert.match(links.androidGeo, /geo:0,0\?q=20\.48,86\.83/);
  });
});

describe("FR-D7. Hazard Avoid Polygon", () => {
  test("Origin inside surge polygon (e.g. Batighar 20.5214, 86.8523) returns null avoid", () => {
    // Default query point 20.5214, 86.8523 is inside surge
    const avoid = buildSurgeAvoidPolygon([86.8523, 20.5214], [86.8300, 20.4800]);
    assert.equal(avoid, null);
  });

  test("Inland origin to inland destination returns null or clipped avoid polygon", () => {
    // Both inland: Kendrapara town [86.42, 20.50] to Cuttack [85.88, 20.46] (miles away from coast)
    const avoid = buildSurgeAvoidPolygon([86.42, 20.50], [85.88, 20.46]);
    assert.equal(avoid, null);
  });
});
