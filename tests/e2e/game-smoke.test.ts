import { test, expect } from '@playwright/test';

test.describe('Plinkit E2E Smoke Test', () => {
  test('should launch game, register 2 players, and display game UI', async ({ page }) => {
    await page.goto('/');

    // Wait for registration overlay to appear
    await expect(page.locator('#overlay-container')).toBeVisible({ timeout: 10000 });

    // Should see registration form
    const regOverlay = page.locator('.registration-overlay');
    await expect(regOverlay).toBeVisible({ timeout: 5000 });

    // Fill in player names
    const nameInputs = page.locator('.registration-overlay input[type="text"]');
    await expect(nameInputs.first()).toBeVisible();

    await nameInputs.nth(0).fill('Alice');
    await nameInputs.nth(1).fill('Bob');

    // Click Start button
    const startBtn = page.locator('.registration-overlay button');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Game should start — canvas should be visible
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();

    // Scoreboard should appear with player names
    await expect(page.locator('text=Alice')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bob')).toBeVisible({ timeout: 5000 });

    // Turn indicator should show
    await expect(page.locator('text=Your Turn')).toBeVisible({ timeout: 5000 });
  });

  test('should handle puck drop via canvas click', async ({ page }) => {
    await page.goto('/');

    // Register players quickly
    const regOverlay = page.locator('.registration-overlay');
    await expect(regOverlay).toBeVisible({ timeout: 10000 });

    const nameInputs = page.locator('.registration-overlay input[type="text"]');
    await nameInputs.nth(0).fill('Player1');
    await nameInputs.nth(1).fill('Player2');

    const startBtn = page.locator('.registration-overlay button');
    await startBtn.click();

    // Wait for game to start
    await expect(page.locator('text=Your Turn')).toBeVisible({ timeout: 5000 });

    // Click on canvas to release puck
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      // Click middle-top of canvas to release puck
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.1 } });
    }

    // Wait a brief period for puck to settle
    await page.waitForTimeout(3000);

    // Game should still be running (no crashes)
    await expect(canvas).toBeVisible();
  });
});
