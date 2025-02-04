import { test, expect } from '@playwright/test';
import { nowaiversigned_member_phoneNumber, waiversigned_member_phoneNumber } from './test-constants';


test.describe('Customer Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('signed-waiver shows up appropriately in search', async ({ page }) => {
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('Waiver Signed');
  });
  test('unsigned-waiver shows up appropriately in search', async ({ page }) => {
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', nowaiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('No Waiver');
  });
});