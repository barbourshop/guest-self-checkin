import { test, expect } from '@playwright/test';
import { checkinmember_phoneNumber, nowaiversigned_member_phoneNumber, nowaiversigned_nonmember_phoneNumber, waiversigned_member_phoneNumber, waiversigned_nonmember_phoneNumber } from './test-constants';

test.describe.configure({ mode: 'parallel' });

test.describe('User Check-in Flows', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(15000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

test('Open customer details page from search', async ({ page }) => {
  
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

    // click on the member
    await page.click('.member-item');
    // Wait for guest count select to load
    const guestCountSelect = await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    // Wait for waiver text to load
    const waiverElement = await page.waitForSelector('[data-testid="signwaiver-text"]', { state: 'visible', timeout: 10000 });
    expect(guestCountSelect).toBeTruthy();
    expect(waiverElement).toBeTruthy();

});

test('After check in, member sees a confirmation', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');  
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

    // click on the member
    await page.click('.member-item');
    // Wait for guest count select to load
    await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
    
    // Select a guest count
    await page.selectOption('[data-testid="guest-count-select"]', '2');

    // Check that the check-in button is enabled
    const checkInButton = await page.locator('[data-testid="checkin-button"]');
    await expect(checkInButton).toBeEnabled();
    
    // Click the check-in button
    await checkInButton.click();
    
    // Verify confirmation appears
    const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
    expect(checkedInElement).toBeTruthy();
});

test('After Check in, non-member sees a confirmation', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_nonmember_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

  // click on the member
  await page.click('.member-item');
  // Wait for guest count select to load
  await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
  
  // Select a guest count
  await page.selectOption('[data-testid="guest-count-select"]', '3');

  // Check that the check-in button is enabled
  const checkInButton = await page.locator('[data-testid="checkin-button"]');
  await expect(checkInButton).toBeEnabled();
  
  // Click the check-in button
  await checkInButton.click();
  
  // Verify confirmation appears
  const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
  expect(checkedInElement).toBeTruthy();
});

test('Check in allowed for member with signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');

  // Check that the guest count select is visible
  const guestCountSelect = await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
  expect(guestCountSelect).toBeTruthy();
  
  // Check that the check-in button is initially disabled
  const checkInButton = await page.locator('[data-testid="checkin-button"]');
  await expect(checkInButton).toBeDisabled();
  await expect(checkInButton).toContainText('Please Select Number of Guests');
});

test('Check in allowed for non-member with signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_nonmember_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');

  // Check that the guest count select is visible
  const guestCountSelect = await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
  expect(guestCountSelect).toBeTruthy();
  
  // Check that the check-in button is initially disabled
  const checkInButton = await page.locator('[data-testid="checkin-button"]');
  await expect(checkInButton).toBeDisabled();
  await expect(checkInButton).toContainText('Please Select Number of Guests');
});

test('Check in not allowed for member without signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', nowaiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');
  
  // Wait for the customer detail view to load
  await page.waitForTimeout(500);

  // Check that the user has been notified that they cant check in unless they sign the waiver
  await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
  const cantCheckInElement = await page.locator('[data-testid="nowaiver-cant-checkin"]');
  expect(cantCheckInElement).toBeTruthy();
});

test('Check in not allowed for nonmember without signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', nowaiversigned_nonmember_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');
  
  // Wait for the customer detail view to load
  await page.waitForTimeout(500);

  // Check that the user has been notified that they cant check in unless they sign the waiver
  await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
  const cantCheckInElement = await page.locator('[data-testid="nowaiver-cant-checkin"]');
  expect(cantCheckInElement).toBeTruthy();
});

test('Check in 10 guests, member sees a confirmation', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

  // click on the member
  await page.click('.member-item');
  // Wait for guest count select to load
  await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
  
  // Select 10 guests from the dropdown
  await page.selectOption('[data-testid="guest-count-select"]', '10');
  
  // Check that the large display shows 10
  const largeDisplay = await page.locator('.text-7xl.font-bold.text-primary-600');
  await expect(largeDisplay).toHaveText('10');

  // Check that the check-in button is enabled
  const checkInButton = await page.locator('[data-testid="checkin-button"]');
  await expect(checkInButton).toBeEnabled();
  
  // Click the check-in button
  await checkInButton.click();
  
  // Verify confirmation appears
  const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
  expect(checkedInElement).toBeTruthy();
});

test('Check in with custom number of guests', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

  // click on the member
  await page.click('.member-item');
  // Wait for guest count select to load
  await page.waitForSelector('[data-testid="guest-count-select"]', { state: 'visible', timeout: 10000 });
  
  // Select "Other" from the dropdown
  await page.selectOption('[data-testid="guest-count-select"]', 'other');
  
  // Enter a custom number
  await page.fill('[data-testid="checkin-input"]', '15');
  
  // Check that the large display shows 15
  const largeDisplay = await page.locator('.text-7xl.font-bold.text-primary-600');
  await expect(largeDisplay).toHaveText('15');

  // Check that the check-in button is enabled
  const checkInButton = await page.locator('[data-testid="checkin-button"]');
  await expect(checkInButton).toBeEnabled();
  
  // Click the check-in button
  await checkInButton.click();
  
  // Verify confirmation appears
  const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
  expect(checkedInElement).toBeTruthy();
});

test('Clicking close button returns to search page', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  expect(memberElement).toBeTruthy();
  
  // Click on the member
  await page.click('.member-item');
  
  // Click the close button
  await page.click('[data-testid="close-details"]');
  
  // Verify we're back on the search page
  const searchInput = await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  expect(searchInput).toBeTruthy();
});

});