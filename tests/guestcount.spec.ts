import { test, expect } from '@playwright/test';
import { waiversigned_member_phoneNumber } from './test-constants';

test.describe.configure({ mode: 'parallel' });

test.describe('Guest Count Selection', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(15000);
    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('Initial state shows no guest count selected', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Check that the large display shows a dash
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('-');
    
    // Check that the check-in button is disabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeDisabled();
    
    // Check that the button text indicates selection is required
    await expect(checkInButton).toContainText('Please Select Number of Guests');
  });

  test('Selecting a preset number from dropdown updates the display', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select 3 guests from the dropdown
    await page.selectOption('[data-testid="guest-count-select"]', '3');
    
    // Check that the large display shows 3
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('3');
    
    // Check that the check-in button is enabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeEnabled();
    
    // Check that the button text indicates check-in is available
    await expect(checkInButton).toContainText('Check In Now');
  });

  test('Selecting "Other" shows the custom input field', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select "Other" from the dropdown
    await page.selectOption('[data-testid="guest-count-select"]', 'other');
    
    // Check that the custom input field is visible
    const customInput = await page.locator('[data-testid="checkin-input"]');
    await expect(customInput).toBeVisible();
    
    // Check that the large display still shows a dash
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('-');
    
    // Check that the check-in button is still disabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeDisabled();
  });

  test('Entering a custom number updates the display', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select "Other" from the dropdown
    await page.selectOption('[data-testid="guest-count-select"]', 'other');
    
    // Enter a custom number
    await page.fill('[data-testid="checkin-input"]', '7');
    
    // Check that the large display shows 7
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('7');
    
    // Check that the check-in button is enabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeEnabled();
    
    // Check that the button text indicates check-in is available
    await expect(checkInButton).toContainText('Check In Now');
  });

  test('Entering an invalid number keeps the button disabled', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select "Other" from the dropdown
    await page.selectOption('[data-testid="guest-count-select"]', 'other');
    
    // Enter an invalid number (0)
    await page.fill('[data-testid="checkin-input"]', '0');
    
    // Check that the large display still shows a dash
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('-');
    
    // Check that the check-in button is still disabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeDisabled();
  });

  test('Entering a large number works correctly', async ({ page }) => {
    // Navigate to a member with a signed waiver
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load and click on the member
    await page.waitForSelector('.member-item', { timeout: 10000 });
    await page.click('.member-item');
    
    // Wait for the guest count section to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select "Other" from the dropdown
    await page.selectOption('[data-testid="guest-count-select"]', 'other');
    
    // Enter a large number (15)
    await page.fill('[data-testid="checkin-input"]', '15');
    
    // Check that the large display shows 15
    const largeDisplay = await page.locator('.text-7xl.font-bold.text-blue-600');
    await expect(largeDisplay).toHaveText('15');
    
    // Check that the check-in button is enabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeEnabled();
    
    // Check that the button text indicates check-in is available
    await expect(checkInButton).toContainText('Check In Now');
  });
}); 