import { test, expect } from '@playwright/test';
import { nowaiversigned_member_phoneNumber, nowaiversigned_nonmember_phoneNumber, waiversigned_member_phoneNumber } from './test-constants';


test.describe('Customer Waiver Signing Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(15000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('signed-waiver shows up appropriately in search', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Use first() to get only the first matching element
    await expect(page.locator('[data-testid="waiver-status"]').first())
      .toHaveText('Waiver Signed', { timeout: 10000 });
  });
  test('unsigned-waiver shows up appropriately in search', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', nowaiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
    // Add a small delay to ensure the UI has updated
    await page.waitForTimeout(500);
    
    // Use first() to get only the first matching element
    await expect(page.locator('[data-testid="waiver-status"]').first())
      .toHaveText('No Waiver', { timeout: 10000 });
  });

  test('User accepts waiver', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', nowaiversigned_nonmember_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
    console.log('Member element found');
    
    // click on the member
    await page.click('.member-item');
    console.log('Member clicked');

    // Check that the user has been notified that they cant check in unless they sign the waiver
    await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
    const cantCheckInElement = await page.locator('[data-testid="nowaiver-cant-checkin"]');
    console.log('Cant check in element found:', await cantCheckInElement.textContent());
    expect(cantCheckInElement).toBeTruthy();

    // Verify QR code is displayed
    await expect(page.locator('[data-testid="waiver-qr-code"]')).toBeVisible();
    
    // Verify "I've already signed" button is present
    await expect(page.locator('[data-testid="accept-waiver-button"]')).toHaveText('I\'ve already signed');

    // Accept the waiver
    await page.click('[data-testid="accept-waiver-button"]');
    console.log('Accept waiver button clicked');
    
    // Wait for the waiver status to update
    await page.waitForTimeout(1000);
    
    // Verify the waiver is now signed by checking for the "Waiver Already Signed" text
    await expect(page.locator('[data-testid="signwaiver-text"]')).toHaveText('Waiver Already Signed', { timeout: 10000 });
    
    // Select guest count from dropdown
    await page.selectOption('[data-testid="guest-count-select"]', '2');
    console.log('Selected 2 guests from dropdown');
    
    // Click check in button
    await page.click('[data-testid="checkin-button"]');
    console.log('Clicked check in button');
    
    // Verify the check-in confirmation appears
    await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
    const checkedInElement = await page.locator('[data-testid="green-checkmark"]');
    console.log('Checked in element found');
    expect(checkedInElement).toBeTruthy();
  });


  // TODO - add tests for
  // - user explicitly agreeing to the waiver
  // - user explicitly declining the waiver
  // - Waiver text being displayed correctly
});