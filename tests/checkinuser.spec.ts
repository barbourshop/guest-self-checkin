import { test, expect } from '@playwright/test';


test.describe('Customer Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

test('click on member from search', async ({ page }) => {
    
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '303');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item');

    // click on the member
    await page.click('.member-item');
    // Wait for checkin input to load
    const checkinElement = await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible' });
    // Wait for checkin input to load
    const waiverElement = await page.waitForSelector('[data-testid="signwaiver-text"]', { state: 'visible' });
    expect(checkinElement).toBeTruthy();
    expect(waiverElement).toBeTruthy();

});

test('Sign in member', async ({ page }) => {
    
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '303');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item');

    // click on the member
    await page.click('.member-item');
    // Wait for checkin input to load
    await page.waitForSelector('[data-testid="checkin-input"]', { state: 'visible' });

    await page.click('[data-testid="checkin-button"]');
    const checkedInElement = await page.waitForSelector('[data-testid="green-checkmark"]', { state: 'visible' });
    expect(checkedInElement).toBeTruthy();
});

});