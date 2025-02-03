import { test, expect } from '@playwright/test';


test.describe('Customer Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('signed-waiver shows up appropriately', async ({ page }) => {
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '650');
    await page.click('[data-testid="search-button"]');
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('Waiver Signed');
  });
  test('unsigned-waiver shows up appropriately', async ({ page }) => {
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '888');
    await page.click('[data-testid="search-button"]');
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('No Waiver');
  });
});