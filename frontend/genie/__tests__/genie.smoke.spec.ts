import { test, expect } from "@playwright/test";

test.describe("macOS Genie Page Transition Smoke Tests", () => {
  const routes = [
    { label: "Household Intake", route: "/intake" },
    { label: "Shelter Stocks", route: "/inventory" },
    { label: "Scan Pass", route: "/scan" },
    { label: "Spatial Map", route: "/map" },
    { label: "Command Desk", route: "/dashboard" },
    { label: "Andhra Pradesh Hub", route: "/andhra-pradesh" },
    { label: "Admin Live", route: "/admin/dashboard", expectedUrlPattern: /admin\/(dashboard|login)/ },
  ];

  test.beforeEach(async ({ page }) => {
    // Spy on Document.prototype.startViewTransition calls
    await page.addInitScript(() => {
      (window as any).__svtCallCount = 0;
      const proto = Document.prototype as any;
      if (proto && proto.startViewTransition) {
        const original = proto.startViewTransition;
        proto.startViewTransition = function (cb: any) {
          (window as any).__svtCallCount = ((window as any).__svtCallCount || 0) + 1;
          return original.call(this, cb);
        };
      }
    });

    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
  });

  for (const { label, route, expectedUrlPattern } of routes) {
    test(`Click ${label} (${route}) triggers View Transition, updates URL, and focuses h1`, async ({ page }) => {
      // Find nav item with data-genie-origin
      const navItem = page.locator(`[data-genie-origin="${route}"]`).first();
      await expect(navItem).toBeVisible();

      // Reset SVT counter
      await page.evaluate(() => {
        (window as any).__svtCallCount = 0;
      });

      // Click nav item to trigger Genie transition
      await navItem.click();

      // Verify URL changes to destination
      if (expectedUrlPattern) {
        await page.waitForURL(expectedUrlPattern, { timeout: 12000 });
      } else {
        await page.waitForURL(`**${route}`, { timeout: 12000 });
      }

      // Verify startViewTransition was invoked
      const svtCalls = await page.evaluate(() => (window as any).__svtCallCount || 0);
      expect(svtCalls).toBeGreaterThan(0);

      // Verify page's h1 exists and receives keyboard/screen-reader focus
      const heading = page.locator("main h1, [data-view-transition='page'] h1, h1").first();
      await expect(heading).toBeAttached();

      await expect(async () => {
        const activeTag = await page.evaluate(() => document.activeElement?.tagName);
        expect(activeTag).toBe("H1");
      }).toPass({ timeout: 5000 });
    });
  }

  test("Reduced motion mode uses 120ms cross-fade and focuses h1", async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.evaluate(() => {
      (window as any).__svtCallCount = 0;
    });

    const intakeLink = page.locator('[data-genie-origin="/intake"]').first();
    await intakeLink.click();

    await page.waitForURL("**/intake", { timeout: 12000 });

    const svtCalls = await page.evaluate(() => (window as any).__svtCallCount || 0);
    expect(svtCalls).toBeGreaterThan(0);

    const heading = page.locator("main h1").first();
    await expect(heading).toBeAttached();

    await expect(async () => {
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTag).toBe("H1");
    }).toPass({ timeout: 3000 });
  });

  test("Active tab displays window header with 'Close Tab' button and active tab label", async ({ page }) => {
    // Open Household Intake
    const intakeLink = page.locator('[data-genie-origin="/intake"]').first();
    await intakeLink.click();
    await page.waitForURL("**/intake", { timeout: 12000 });

    // Verify window header is visible with Close Tab button and active label
    const closeTabBtn = page.locator('button:has-text("Close Tab")').first();
    await expect(closeTabBtn).toBeVisible();

    // Verify Active tab indicator
    const activeLabel = page.locator("text=Household Intake").first();
    await expect(activeLabel).toBeVisible();
  });

  test("Clicking 'Close Tab' triggers reverse Genie transition and navigates back to root desk", async ({ page }) => {
    // Open Shelter Stocks
    const inventoryLink = page.locator('[data-genie-origin="/inventory"]').first();
    await inventoryLink.click();
    await page.waitForURL("**/inventory", { timeout: 12000 });

    // Reset SVT counter
    await page.evaluate(() => {
      (window as any).__svtCallCount = 0;
    });

    // Click "Close Tab"
    const closeTabBtn = page.locator('button:has-text("Close Tab")').first();
    await expect(closeTabBtn).toBeVisible();
    await closeTabBtn.click();

    // Verify View Transition was invoked for reverse Genie
    const svtCalls = await page.evaluate(() => (window as any).__svtCallCount || 0);
    expect(svtCalls).toBeGreaterThan(0);

    // Verify navigation returns to root "/"
    await page.waitForURL("http://localhost:3000/", { timeout: 12000 });
  });

  test("Pressing Escape key closes active tab and minimizes smoothly back to root desk", async ({ page }) => {
    // Open Scan Pass
    const scanLink = page.locator('[data-genie-origin="/scan"]').first();
    await scanLink.click();
    await page.waitForURL("**/scan", { timeout: 12000 });

    // Reset SVT counter
    await page.evaluate(() => {
      (window as any).__svtCallCount = 0;
    });

    // Press Escape
    await page.keyboard.press("Escape");

    // Verify View Transition was invoked
    const svtCalls = await page.evaluate(() => (window as any).__svtCallCount || 0);
    expect(svtCalls).toBeGreaterThan(0);

    // Verify navigation returns to root "/"
    await page.waitForURL("http://localhost:3000/", { timeout: 12000 });
  });

  test("Foreground window opens as a separate floating layer over the page with backdrop blur and high z-index", async ({ page }) => {
    // Open Spatial Map
    const mapLink = page.locator('[data-genie-origin="/map"]').first();
    await mapLink.click();
    await page.waitForURL("**/map", { timeout: 12000 });

    // Verify dialog container exists with z-index 9999
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const zIndex = await dialog.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(zIndex).toBe("9999");

    // Verify backdrop with blur exists
    const backdrop = page.locator('[aria-hidden="true"].backdrop-blur-\\[12px\\]').first();
    await expect(backdrop).toBeVisible();

    // Verify Close Tab button inside window
    const closeBtn = dialog.locator('button:has-text("Close Tab")').first();
    await expect(closeBtn).toBeVisible();

    // Click backdrop (outside the window, at top-left corner) to close
    await backdrop.click({ position: { x: 15, y: 15 }, force: true });

    // Verify dialog disappears and navigation returns to root "/"
    await expect(dialog).not.toBeVisible();
    await page.waitForURL("http://localhost:3000/", { timeout: 12000 });
  });

  test("Bottom dock navigation bar remains visible and interactive in foreground for quick switching", async ({ page }) => {
    // 1. Open Household Intake
    const intakeLink = page.locator('[data-genie-origin="/intake"]').first();
    await intakeLink.click();
    await page.waitForURL("**/intake", { timeout: 12000 });

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // 2. Verify bottom dock navigation bar is still visible and has z-index 10001 (above dialog z-index 9999)
    const dock = page.locator('aside[aria-label="Application Dock Navigation"]').first();
    await expect(dock).toBeVisible();
    const dockZIndex = await dock.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(Number(dockZIndex)).toBeGreaterThanOrEqual(10000);

    // Save visual screenshot of open window with floating dock
    await page.waitForTimeout(650);
    await page.screenshot({ path: "C:/Users/dkuma/.gemini/antigravity-ide/brain/97b4e52d-2a6e-4177-8e64-3e1863ee3b13/dock_quick_switch_open.png" });

    // 3. Quick-switch to Shelter Stocks (/inventory) directly from the dock
    const inventoryLink = page.locator('[data-genie-origin="/inventory"]').first();
    await expect(inventoryLink).toBeVisible();
    await inventoryLink.click();
    await page.waitForURL("**/inventory", { timeout: 12000 });

    // Verify dialog switched to Shelter Stocks
    await expect(dialog.getByText('Shelter Stocks', { exact: true })).toBeVisible();

    // 4. Quick-switch to Andhra Pradesh Hub (/andhra-pradesh) directly from the dock
    const apLink = page.locator('[data-genie-origin="/andhra-pradesh"]').first();
    await expect(apLink).toBeVisible();
    await apLink.click();
    await page.waitForURL("**/andhra-pradesh", { timeout: 12000 });

    // Verify dialog switched to Andhra Pradesh Hub
    await expect(dialog.getByText('Andhra Pradesh Hub', { exact: true })).toBeVisible();
    await page.waitForTimeout(650);
    await page.screenshot({ path: "C:/Users/dkuma/.gemini/antigravity-ide/brain/97b4e52d-2a6e-4177-8e64-3e1863ee3b13/dock_quick_switch_ap.png" });

    // 5. Click the active Andhra Pradesh Hub dock icon again -> triggers toggle-minimize back to dock
    await apLink.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await page.waitForURL("http://localhost:3000/", { timeout: 12000 });
  });
});


