/**
 * Unit Tests for originStore.ts
 *
 * Validates:
 * 1. setGenieOrigin & resolveOriginForRoute caching and timestamp invalidation.
 * 2. Fallback to 48x48 virtual dock origin at viewport bottom-center.
 * 3. SimpleRect conversion and isolation.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  setGenieOrigin,
  clearGenieOrigin,
  resolveOriginForRoute,
  getVirtualDockOrigin,
  toSimpleRect,
} from "../originStore.ts";

describe("Genie Origin Store", () => {
  test("1. Stores and retrieves clicked origin rect", () => {
    clearGenieOrigin();
    const testRect = {
      left: 200,
      top: 50,
      right: 320,
      bottom: 90,
      width: 120,
      height: 40,
    };

    setGenieOrigin("/intake", testRect);
    const resolved = resolveOriginForRoute("/intake");
    assert.deepEqual(resolved, testRect);

    // After resolution, cached origin is consumed
    const nextResolved = resolveOriginForRoute("/intake");
    // In node environment without DOM, it falls back to virtual dock
    const fallback = getVirtualDockOrigin();
    assert.deepEqual(nextResolved, fallback);
  });

  test("2. Virtual Dock Fallback returns 48x48 origin at bottom-center", () => {
    clearGenieOrigin();
    const fallback = getVirtualDockOrigin();
    assert.equal(fallback.width, 48);
    assert.equal(fallback.height, 48);
    assert.equal(fallback.right - fallback.left, 48);
    assert.equal(fallback.bottom - fallback.top, 48);
  });

  test("3. toSimpleRect handles DOMRect-like structures", () => {
    const raw = {
      left: 10,
      top: 20,
      right: 110,
      bottom: 70,
      width: 100,
      height: 50,
      x: 10,
      y: 20,
      toJSON: () => {},
    };
    const simple = toSimpleRect(raw as any);
    assert.deepEqual(simple, {
      left: 10,
      top: 20,
      right: 110,
      bottom: 70,
      width: 100,
      height: 50,
    });
  });
});
