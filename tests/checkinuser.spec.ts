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
    await page.fill('[data-testid="search-input"]', checkinmember_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });

    // click on the member
    await page.click('.member-item');
    // Wait for checkin input to load
    const checkinElement = await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });
    // Wait for checkin input to load
    const waiverElement = await page.waitForSelector('[data-testid="signwaiver-text"]', { state: 'visible', timeout: 10000 });
    expect(checkinElement).toBeTruthy();
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
    // Wait for checkin input to load
    await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });

    await page.click('[data-testid="checkin-button"]');
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
  // Wait for checkin input to load
  await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });

  await page.click('[data-testid="checkin-button"]');
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

  // Check that the user can check in since they have a previously signed waiver
  const CheckinButton = await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });
  expect(CheckinButton).toBeTruthy();
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

  // Check that the user can check in since they have a previously signed waiver
  const CheckinButton = await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });
  expect(CheckinButton).toBeTruthy();
});

test('Check in not allowed for member without signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', nowaiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');

  // Check that the user has been notified that they cant check in unless they sign the waiver
  const cantCheckInElement = await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
  expect(cantCheckInElement).toBeTruthy();
});

test('Check in not allowed for nonmember without signed waiver', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', nowaiversigned_nonmember_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  
  // click on the member
  await page.click('.member-item');

  // Check that the user has been notified that they cant check in unless they sign the waiver
  const cantCheckInElement = await page.waitForSelector('[data-testid="nowaiver-cant-checkin"]', { state: 'visible', timeout: 10000 });
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
  // Wait for checkin input to load
  await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="checkin-input"]', '10');

  await page.click('[data-testid="checkin-button"]');
  const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible', timeout: 10000 });
  expect(checkedInElement).toBeTruthy();
});

});