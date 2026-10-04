import { test, expect } from "@playwright/test";

test.describe("Single-Layer Progressive Blur: Decreasing Top to Down", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
  });

  test("Verifies all blur layers combined into single layer with decreasing blur from top to down", async ({ page }) => {
    // 1. Locate the 10cm rectangular liquid glass button
    const glassSlab = page.locator('div[title*="10cm × 10cm × 10cm × 10cm"]').first();
    await expect(glassSlab).toBeVisible();

    // 2. Open edit options beside the button
    const editBtn = page.locator('button:has-text("Edit Options")').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await page.waitForTimeout(300);

    // 3. Switch to "Blur Gradient" tab
    const blurTab = page.locator('button:has-text("Blur Gradient")').first();
    await expect(blurTab).toBeVisible();
    await blurTab.click();
    await page.waitForTimeout(300);

    // Verify Single Combined Layer and Decreasing Blur controls
    await expect(page.locator("text=Single Combined Blur Layer")).toBeVisible();
    await expect(page.locator("text=Decreasing Blur: Top to Down")).toBeVisible();
    await expect(page.locator("text=Top Blur Strength (Maximum)")).toBeVisible();
    await expect(page.locator("text=Bottom Blur (Decreased Falloff)")).toBeVisible();
    await expect(page.locator("text=0px (100% Crystal Clear)")).toBeVisible();

    // Capture screenshot of the Single Combined Blur Layer controls
    await page.screenshot({
      path: "C:/Users/dkuma/.gemini/antigravity-ide/brain/97b4e52d-2a6e-4177-8e64-3e1863ee3b13/glass_single_layer_blur_gradient_studio.png",
    });

    // 4. Toggle Guides to verify the vertical top-to-down decreasing blur profile overlay
    const guidesBtn = page.locator('button:has-text("Guides")').first();
    await guidesBtn.click();
    await page.waitForTimeout(300);

    // Capture screenshot showing vertical top-to-down blur profile guides
    await page.screenshot({
      path: "C:/Users/dkuma/.gemini/antigravity-ide/brain/97b4e52d-2a6e-4177-8e64-3e1863ee3b13/glass_top_down_blur_guides_overlay.png",
    });

    // 5. Test Deep Top Glow preset
    const deepGlowBtn = page.locator('button:has-text("Deep Top Glow")').first();
    await deepGlowBtn.click();
    await page.waitForTimeout(200);

    // Turn off guides for clean view
    await guidesBtn.click();
    await page.waitForTimeout(200);

    // 6. Drag the 10cm liquid glass plate over the dashboard cards
    const slabBox = await glassSlab.boundingBox();
    expect(slabBox).not.toBeNull();

    if (slabBox) {
      await page.mouse.move(slabBox.x + slabBox.width / 2, slabBox.y + slabBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(slabBox.x - 340, slabBox.y - 230, { steps: 25 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    }

    // Capture screenshot showing clear top-to-down decreasing blur across dashboard content
    await page.screenshot({
      path: "C:/Users/dkuma/.gemini/antigravity-ide/brain/97b4e52d-2a6e-4177-8e64-3e1863ee3b13/glass_single_layer_decreasing_blur_rolled.png",
    });
  });
});
