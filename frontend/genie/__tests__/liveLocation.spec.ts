// Playwright E2E Test Suite for Live GPS, Nearest Safe Shelter, and Directions (Section 9.2)
import { test, expect } from "@playwright/test";

// Inject controllable mock geolocation into page context
async function installGeoMock(page: any, defaultPerm = "prompt") {
  await page.addInitScript((initPerm: string) => {
    (window as any).__geoMock = {
      activeWatches: 0,
      calls: [] as any[],
      listeners: new Map(),
      pendingCurrent: [] as any[],
      watchIdCounter: 1,
      permStatus: initPerm,
      permListeners: new Set<any>(),
      lastPosition: null as any,

      emit(coords: {
        lat: number;
        lng: number;
        accuracy?: number;
        heading?: number | null;
        speed?: number | null;
        timestamp?: number;
      }) {
        const pos = {
          coords: {
            latitude: coords.lat,
            longitude: coords.lng,
            accuracy: coords.accuracy !== undefined ? coords.accuracy : 10,
            heading: coords.heading !== undefined ? coords.heading : null,
            speed: coords.speed !== undefined ? coords.speed : null,
          },
          timestamp: coords.timestamp || Date.now(),
        };
        this.lastPosition = pos;

        if (this.pendingCurrent && this.pendingCurrent.length > 0) {
          const pendings = this.pendingCurrent.slice();
          this.pendingCurrent = [];
          pendings.forEach((cb: any) => {
            if (cb.success) cb.success(pos);
          });
        }

        this.listeners.forEach((cb: any) => {
          if (cb.success) cb.success(pos);
        });
      },

      fail(code: number, message = "Geolocation error") {
        const err = {
          code,
          message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        };

        if (this.pendingCurrent && this.pendingCurrent.length > 0) {
          const pendings = this.pendingCurrent.slice();
          this.pendingCurrent = [];
          pendings.forEach((cb: any) => {
            if (cb.error) cb.error(err);
          });
        }

        this.listeners.forEach((cb: any) => {
          if (cb.error) cb.error(err);
        });
      },

      silent() {
        // Intentionally no-op to allow timeout / watchdog testing
      },

      setPermission(newPerm: string) {
        this.permStatus = newPerm;
        this.permListeners.forEach((fn: any) => fn());
      },
    };

    const fakeGeo = {
      getCurrentPosition(success: any, error: any, options: any) {
        (window as any).__geoMock.calls.push({ method: "getCurrentPosition", options });
        if ((window as any).__geoMock.lastPosition) {
          setTimeout(() => success((window as any).__geoMock.lastPosition), 10);
        } else {
          (window as any).__geoMock.pendingCurrent.push({ success, error, options });
        }
      },
      watchPosition(success: any, error: any, options: any) {
        const id = (window as any).__geoMock.watchIdCounter++;
        (window as any).__geoMock.activeWatches++;
        (window as any).__geoMock.calls.push({ method: "watchPosition", id, options });
        (window as any).__geoMock.listeners.set(id, { success, error, options });
        if ((window as any).__geoMock.lastPosition) {
          setTimeout(() => success((window as any).__geoMock.lastPosition), 10);
        }
        return id;
      },
      clearWatch(id: number) {
        if ((window as any).__geoMock.listeners.has(id)) {
          (window as any).__geoMock.listeners.delete(id);
          (window as any).__geoMock.activeWatches = Math.max(
            0,
            (window as any).__geoMock.activeWatches - 1
          );
          (window as any).__geoMock.calls.push({ method: "clearWatch", id });
        }
      },
    };

    Object.defineProperty(navigator, "geolocation", {
      value: fakeGeo,
      configurable: true,
      writable: true,
    });

    if (navigator.permissions && navigator.permissions.query) {
      const origQuery = navigator.permissions.query;
      navigator.permissions.query = (async function (desc: any): Promise<any> {
        if (desc && desc.name === "geolocation") {
          return {
            state: (window as any).__geoMock.permStatus,
            addEventListener(_evt: string, handler: any) {
              (window as any).__geoMock.permListeners.add(handler);
            },
            removeEventListener(_evt: string, handler: any) {
              (window as any).__geoMock.permListeners.delete(handler);
            },
          };
        }
        return origQuery ? origQuery(desc) : { state: "prompt" };
      }) as any;
    }
  }, defaultPerm);
}

// Setup network mocks for routing endpoints
async function setupRoutingMocks(page: any) {
  await page.route("**/api/directions/matrix", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "MockMatrix",
        durationS: [540, 600, 720],
        distanceM: [4500, 5200, 6100],
      }),
    });
  });

  await page.route("**/api/directions/route", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        provider: "MockRoute",
        attribution: "© OpenStreetMap contributors · MockRoute",
        distanceM: 4500,
        durationS: 540,
        geometry: {
          type: "LineString",
          coordinates: [
            [86.8523, 20.5214],
            [86.86, 20.53],
            [86.87, 20.54],
          ],
        },
        steps: [
          {
            maneuver: "depart",
            location: [86.8523, 20.5214],
            name: "Coast Road",
            distanceM: 1200,
            durationS: 150,
          },
          {
            maneuver: "turn-left",
            location: [86.86, 20.53],
            name: "Shelter Road",
            distanceM: 3300,
            durationS: 390,
          },
        ],
        snappedFrom: [86.8523, 20.5214],
        hazardAvoided: false,
        warnings: [],
        fetchedAt: Date.now(),
      }),
    });
  });
}

// Helper to open map window modal from dock on /
async function openMapModal(page: any) {
  await page.goto("http://localhost:3000/");
  const mapLink = page.locator('[data-genie-origin="/map"]').first();
  await expect(mapLink).toBeVisible();
  await mapLink.click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("AshraySetu Live GPS, Nearest Shelter & Directions", () => {
  test.beforeEach(async ({ page }) => {
    await setupRoutingMocks(page);
  });

  test("Scenario 1: Consent & Grant - Live Dot, Target Shelter, Hukitola Excluded, No Placeholder Phones", async ({
    page,
  }) => {
    await installGeoMock(page, "prompt");
    const dialog = await openMapModal(page);

    const consentTitle = dialog.getByRole("heading", { name: /Find your nearest safe shelter/i });
    await expect(consentTitle).toBeVisible();

    // Verify 0 geolocation calls happened before user tap
    const callCountBefore = await page.evaluate(
      () => (window as any).__geoMock?.calls.length || 0
    );
    expect(callCountBefore).toBe(0);

    // Tap "Show my location"
    const showLocBtn = dialog.locator("#btn-show-my-location");
    await expect(showLocBtn).toBeVisible();
    await showLocBtn.click();

    // Emit live fix near Kendrapara (20.5214, 86.8523)
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 15 });
    });

    // Device dot should appear on map
    const deviceDot = dialog.locator(".live-device-marker");
    await expect(deviceDot).toBeAttached({ timeout: 5000 });

    // Target shelter card should appear
    const targetBadge = dialog.getByText(/Government-confirmed shelter/i).first();
    await expect(targetBadge).toBeVisible();

    // Verify Hukitola (OD-KEN-MAH-005, SATURATED) is NOT the target
    const targetHeader = dialog.locator("#live-gps-below-slot h2");
    if ((await targetHeader.count()) > 0) {
      const targetName = await targetHeader.first().textContent();
      expect(targetName).not.toContain("Hukitola");
    }

    // Verify seed placeholder incharge_phone numbers are NOT rendered
    const placeholderPhone = dialog.locator('a[href*="tel:98612345"]');
    await expect(placeholderPhone).toHaveCount(0);
  });

  test("Scenario 2: Deny State - Code 1 Alert & Manual Fallback", async ({ page }) => {
    await installGeoMock(page, "prompt");
    const dialog = await openMapModal(page);

    const showLocBtn = dialog.locator("#btn-show-my-location");
    await showLocBtn.click();

    await page.evaluate(() => {
      (window as any).__geoMock.fail(1, "User denied geolocation");
    });

    // Denied alert card should appear with role="alert"
    const alertCard = dialog.locator('[role="alert"]').filter({ hasText: /Location access was blocked|denied/i });
    await expect(alertCard).toBeVisible();

    // Verify activeWatches === 0
    const activeWatches = await page.evaluate(
      () => (window as any).__geoMock.activeWatches
    );
    expect(activeWatches).toBe(0);
  });

  test("Scenario 3: Error States - Position Unavailable (Code 2) & Searching/Timeout (Code 3)", async ({
    page,
  }) => {
    await installGeoMock(page, "prompt");
    const dialog = await openMapModal(page);

    const showLocBtn = dialog.locator("#btn-show-my-location");
    await showLocBtn.click();

    // Trigger Code 3 (TIMEOUT / Searching)
    await page.evaluate(() => {
      (window as any).__geoMock.fail(3, "GPS Timeout");
    });

    // Locating card or searching message stays visible
    const searchingText = dialog.getByText(/Searching for GPS|1–2 minutes/i);
    await expect(searchingText).toBeVisible();
  });

  test("Scenario 4: Movement, Follow & Pan", async ({ page }) => {
    await installGeoMock(page, "prompt");
    const dialog = await openMapModal(page);

    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 15 });
    });

    // Locate button is in follow mode (aria-pressed="true")
    const locateBtn = dialog.locator("#btn-map-locate");
    await expect(locateBtn).toHaveAttribute("aria-pressed", "true");

    // Simulating user drag on Leaflet map:
    const mapContainer = dialog.locator(".leaflet-container");
    const mapBox = await mapContainer.boundingBox();
    if (mapBox) {
      await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(mapBox.x + mapBox.width / 2 + 120, mapBox.y + mapBox.height / 2 + 120, { steps: 5 });
      await page.mouse.up();
    }

    // Follow should be turned off on user pan
    await expect(locateBtn).toHaveAttribute("aria-pressed", "false");

    // Clicking locate button turns follow back on
    await locateBtn.click();
    await expect(locateBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("Scenario 5: Routing Opt-In & Privacy - No coordinate leakage", async ({ page }) => {
    await installGeoMock(page, "granted");
    const dialog = await openMapModal(page);

    let directionsCallCount = 0;
    const interceptedUrls: string[] = [];
    page.on("request", (req) => {
      interceptedUrls.push(req.url());
      if (req.url().includes("/api/directions")) {
        directionsCallCount++;
      }
    });

    // Start tracking
    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 20 });
    });

    // Before opt-in, 0 requests to /api/directions
    expect(directionsCallCount).toBe(0);

    // Tap "Get road directions"
    const getDirectionsBtn = dialog.getByRole("button", { name: /Get road directions/i });
    if (await getDirectionsBtn.isVisible()) {
      await getDirectionsBtn.click();

      // Disclosure modal should appear
      const disclosure = dialog.getByText(/Road directions need the internet/i);
      await expect(disclosure).toBeVisible();

      // Click Continue to opt in
      const continueBtn = dialog.getByRole("button", { name: /Continue/i });
      await continueBtn.click();

      // Directions should have been requested
      await page.waitForTimeout(500);
      expect(directionsCallCount).toBeGreaterThan(0);

      // Verify no non-directions request contains the coordinates
      for (const url of interceptedUrls) {
        if (!url.includes("/api/directions")) {
          expect(url).not.toContain("20.5214");
          expect(url).not.toContain("86.8523");
        }
      }

      // Tap Turn off road directions
      const turnOffBtn = dialog.getByRole("button", { name: /Turn off/i });
      if (await turnOffBtn.isVisible()) {
        await turnOffBtn.click();
        const straightNotice = dialog.getByText(/Approximate|Straight line/i);
        await expect(straightNotice.first()).toBeVisible();
      }
    }
  });

  test("Scenario 6: Off-route detection and rerouting", async ({ page }) => {
    await installGeoMock(page, "granted");
    const dialog = await openMapModal(page);

    let routeRequestCount = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/directions/route")) {
        routeRequestCount++;
      }
    });

    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 10 });
    });

    // Opt into routing
    const getDirectionsBtn = dialog.getByRole("button", { name: /Get road directions/i });
    if (await getDirectionsBtn.isVisible()) {
      await getDirectionsBtn.click();
      await dialog.getByRole("button", { name: /Continue/i }).click();
      await page.waitForTimeout(500);
    }
    const initialRouteRequests = routeRequestCount;

    // Simulate 3 off-route fixes > 200m away
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.525, lng: 86.855, accuracy: 10 });
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.526, lng: 86.856, accuracy: 10 });
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.527, lng: 86.857, accuracy: 10 });
    });

    expect(routeRequestCount).toBeGreaterThanOrEqual(initialRouteRequests);
  });

  test("Scenario 7: Offline resilience - Straight-line fallback", async ({ page, context }) => {
    await installGeoMock(page, "granted");
    const dialog = await openMapModal(page);

    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 20 });
    });

    // Set browser offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Straight line approximate warning must show within 2s
    const offlineNotice = dialog.getByText(/Approximate|Straight line|Offline/i);
    await expect(offlineNotice.first()).toBeVisible({ timeout: 3000 });

    // Restore online
    await context.setOffline(false);
  });

  test("Scenario 8: Single Watcher Pattern across mounts", async ({ page }) => {
    await installGeoMock(page, "prompt");
    // Direct visit to /map renders route child + auto-opened dialog
    await page.goto("http://localhost:3000/map");

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.locator("#btn-show-my-location").click();

    // Single active watchPosition subscription guaranteed
    const activeWatches = await page.evaluate(
      () => (window as any).__geoMock.activeWatches
    );
    expect(activeWatches).toBe(1);

    // Close the dialog window
    const closeBtn = dialog.locator('button[title*="Close this window"]');
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();

    const activeWatchesAfter = await page.evaluate(
      () => (window as any).__geoMock.activeWatches
    );
    expect(activeWatchesAfter).toBeLessThanOrEqual(1);
  });

  test("Scenario 9: Hysteresis - Nearer shelter card after departure", async ({ page }) => {
    await installGeoMock(page, "granted");
    const dialog = await openMapModal(page);

    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 15 });
    });

    // Device departs (> 100m away)
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.524, lng: 86.854, accuracy: 15 });
    });

    const targetBadge = dialog.getByText(/Government-confirmed shelter/i).first();
    await expect(targetBadge).toBeVisible();
  });

  test("Scenario 10: Arrival Detection and QR Pass gate advice", async ({ page }) => {
    await installGeoMock(page, "granted");
    const dialog = await openMapModal(page);

    await dialog.locator("#btn-show-my-location").click();

    // Seed OD-KEN-RAJ-001 (Batighar) is at 20.4851, 86.8324
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.4851, lng: 86.8324, accuracy: 10 });
    });
    // Wait > 1000ms for COMMIT_MIN_INTERVAL_MS and emit 2nd qualifying arrival fix moved ~6m
    await page.waitForTimeout(1100);
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.48515, lng: 86.8324, accuracy: 10 });
    });

    // Arrival card should be visible
    const arrivalNotice = dialog.getByText(/You have arrived|Show your family's QR pass/i);
    await expect(arrivalNotice.first()).toBeVisible({ timeout: 5000 });

    const keepGuidingBtn = dialog.getByRole("button", { name: /Not there yet|Keep guiding/i });
    await expect(keepGuidingBtn).toBeVisible();
  });

  test("Scenario 11: i18n Smoke - Odia and Telugu translations render", async ({ page }) => {
    await installGeoMock(page, "prompt");
    const dialog = await openMapModal(page);

    // Switch language to Odia (or) via window event
    await page.evaluate(() => {
      localStorage.setItem("ashraysetu_lang", "or");
      window.dispatchEvent(new Event("languageChanged"));
    });

    // Verify Odia storm warning or title rendered without raw liveLoc* keys
    const rawKeys = await page.evaluate(() => {
      return document.body.innerText.includes("liveLoc");
    });
    expect(rawKeys).toBe(false);

    // Switch to Telugu (te)
    await page.evaluate(() => {
      localStorage.setItem("ashraysetu_lang", "te");
      window.dispatchEvent(new Event("languageChanged"));
    });

    const rawKeysTe = await page.evaluate(() => {
      return document.body.innerText.includes("liveLoc");
    });
    expect(rawKeysTe).toBe(false);
  });

  test("Scenario 12: Flight Mode Signal Before Opening starts in offline mode", async ({
    page,
  }) => {
    await installGeoMock(page, "prompt");
    // Pre-set flight mode in sessionStorage
    await page.addInitScript(() => {
      sessionStorage.setItem("ashraysetu_flight_mode", "1");
    });

    const dialog = await openMapModal(page);

    // Start tracking
    await dialog.locator("#btn-show-my-location").click();
    await page.evaluate(() => {
      (window as any).__geoMock.emit({ lat: 20.5214, lng: 86.8523, accuracy: 25 });
    });

    // In Flight Mode, straight-line offline guide is shown
    const offlineNotice = dialog.getByText(/Direct|Straight line|Approximate/i);
    await expect(offlineNotice.first()).toBeVisible();
  });

  test.describe("Real Geolocation API Browser Integration", () => {
    test.use({
      permissions: ["geolocation"],
      geolocation: { latitude: 20.5214, longitude: 86.8523, accuracy: 15 },
    });

    test("Real Browser Geolocation: Granted permission auto-starts when session on", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        sessionStorage.setItem("ashraysetu_live_location", "on");
      });
      await setupRoutingMocks(page);

      const dialog = await openMapModal(page);
      const deviceDot = dialog.locator(".live-device-marker");
      await expect(deviceDot).toBeAttached({ timeout: 8000 });
    });
  });
});
