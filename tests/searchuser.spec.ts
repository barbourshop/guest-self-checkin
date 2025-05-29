import { test, expect } from '@playwright/test';
import { testmember_phoneNumber, noresults_phoneNumber, testmember_email, nonmember_email, noresults_email, nonmember_phoneNumber, noresults_lotNumber, testmember_lotNumber, waiversigned_member_phoneNumber } from './test-constants';

test.describe.configure({ mode: 'parallel' });

test.describe('Search For User Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(15000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('basic navigation test', async ({ page }) => {
    
    const title = await page.title();
    //console.log('Page title:', title);
    
    expect(title).toBeTruthy();
  });

test('search for user by phone fragment', async ({ page }) => {
    await page.click('[data-testid="phone-search"]');   
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', testmember_phoneNumber);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
    expect(memberElement).toBeTruthy();
});

test('search for user by phone fragment with no results', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', noresults_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('[data-testid="member-not-found"]', { state: 'visible', timeout: 10000 });
  // Add a small delay to ensure the UI has updated
  await page.waitForTimeout(500);
  const memberElement = await page.locator('[data-testid="member-not-found"]');
  expect(memberElement).toBeTruthy();
});

test('search for user by email fragment', async ({ page }) => {
    
    await page.click('[data-testid="email-search"]');
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
    await page.fill('[data-testid="search-input"]', testmember_email);
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
    expect(memberElement).toBeTruthy();
});

test('search for user by email fragment with no results', async ({ page }) => {
  await page.click('[data-testid="email-search"]');
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', noresults_email);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('[data-testid="member-not-found"]', { state: 'visible', timeout: 10000 });
  // Add a small delay to ensure the UI has updated
  await page.waitForTimeout(500);
  const memberElement = await page.locator('[data-testid="member-not-found"]');
  expect(memberElement).toBeTruthy();
});

test('search for user by lot number', async ({ page }) => {
    
  await page.click('[data-testid="lot-search"]');
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', testmember_lotNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  const memberElement = await page.waitForSelector('.member-item', { timeout: 10000 });
  expect(memberElement).toBeTruthy();
});

test('search for user by lot number with no results', async ({ page }) => {
  await page.click('[data-testid="lot-search"]');
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', noresults_lotNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('[data-testid="member-not-found"]', { state: 'visible', timeout: 10000 });
  const memberElement = await page.locator('[data-testid="member-not-found"]');
  expect(memberElement).toBeTruthy();
});

test('member text shows up exactly correct', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', waiversigned_member_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
  // Add a small delay to ensure the UI has updated
  await page.waitForTimeout(500);
  
  // Wait for the membership type element to be visible
  await page.waitForSelector('[data-testid="membership-type"]', { state: 'visible', timeout: 10000 });
  
  // Use first() to get only the first matching element
  await expect(page.locator('[data-testid="membership-type"]').first())
    .toHaveText('Member', { timeout: 10000 });
});

test('non-member text shows up exactly correct', async ({ page }) => {
  await page.click('[data-testid="phone-search"]');  
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  await page.fill('[data-testid="search-input"]', nonmember_phoneNumber);
  await page.click('[data-testid="search-button"]');
  
  // Wait for search results to load
  await page.waitForSelector('.member-item', { state: 'visible', timeout: 10000 });
  // Add a small delay to ensure the UI has updated
  await page.waitForTimeout(500);
  
  // Use first() to get only the first matching element
  await expect(page.locator('[data-testid="membership-type"]').first())
    .toHaveText('Non-Member', { timeout: 10000 });
});

test('default search type is Name', async ({ page }) => {
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible', timeout: 10000 });
  // The Name button should have the selected class
  const nameButton = await page.locator('[data-testid="name-search"]');
  await expect(nameButton).toHaveClass(/bg-primary-600/);
});
});