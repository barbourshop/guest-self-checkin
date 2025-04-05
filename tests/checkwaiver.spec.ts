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
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('Waiver Signed', { timeout: 10000 });
  });
  test('unsigned-waiver shows up appropriately in search', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', nowaiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Use locator with text matcher
    await expect(page.locator('[data-testid="waiver-status"]'))
      .toHaveText('No Waiver', { timeout: 10000 });
  });

  test('User accepts waiver', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', nowaiversigned_nonmember_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
    console.log('Member element found');
    
    // click on the member
    await page.click('.member-item');
    console.log('Member clicked');

    // Add a small delay to allow for waiver status check
    await page.waitForTimeout(2000);

    // Check that the user has been notified that they cant check in unless they sign the waiver
    const cantCheckInElement = await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
    console.log('Cant check in element found:', await cantCheckInElement.textContent());
    expect(cantCheckInElement).toBeTruthy();

    // Accept the waiver
    await page.click('[data-testid="accept-waiver-button"]');
    console.log('Accept waiver button clicked');
    
    // Wait for the waiver panel to disappear and the guest count input to be focused
    await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });
    console.log('Guest count input is visible');
    
    // Verify the waiver is now signed
    await expect(page.locator('[data-testid="signwaiver-text"]')).toHaveText('Waiver Already Signed', { timeout: 10000 });
    
    // Now the user should manually check in by entering guest count and clicking check in
    await page.fill('[data-testid="checkin-input"]', '2');
    await page.click('[data-testid="checkin-button"]');
    
    // Verify the check-in confirmation appears
    const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
    console.log('Checked in element found');
    expect(checkedInElement).toBeTruthy();
  });


  test('User declines waiver', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', nowaiversigned_nonmember_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
    console.log('Member element found');
    
    // click on the member
    await page.click('.member-item');
    console.log('Member clicked');
  
    // Check that the user has been notified that they cant check in unless they sign the waiver
    const cantCheckInElement = await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
    console.log('Cant check in element found:', await cantCheckInElement.textContent());
    expect(cantCheckInElement).toBeTruthy();
  
    // Decline the waiver, which takes the user back to the main screen
    await page.click('[data-testid="decline-waiver-button"]');
    console.log('Decline waiver button clicked');
    
    const homePage = await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    console.log('Home page search input found');
    expect(homePage).toBeTruthy();
  });
  

  // TODO - add tests for
  // - user explicitly agreeing to the waiver
  // - user explicitly declining the waiver
  // - Waiver text being displayed correctly
});