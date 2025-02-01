import { test, expect } from '@playwright/test';


test.describe('Customer Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(5000);

    await page.goto('http://localhost:5173/');
    console.log('Page loaded');
  });

  test('basic navigation test', async ({ page }) => {
    
    const title = await page.title();
    console.log('Page title:', title);
    
    expect(title).toBeTruthy();
  });
test('search for member by phone fragment', async ({ page }) => {
    
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '650');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item');
    expect(memberElement).toBeTruthy();
});
test('search for member by phone fragment with no results', async ({ page }) => {
      
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', '12345678915');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('[data-testid="member-not-found"]');
    expect(memberElement).toBeTruthy();
});
test('search for member by email fragment', async ({ page }) => {
    
    await page.click('[data-testid="email-search"]');
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', 'gmail');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('.member-item');
    expect(memberElement).toBeTruthy();
});
test('search for member by email fragment with no results', async ({ page }) => {

    
    await page.click('[data-testid="email-search"]');
    await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
    await page.fill('[data-testid="search-input"]', 'thisistextthatwontmatchanyemail');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results to load
    const memberElement = await page.waitForSelector('[data-testid="member-not-found"]');
    expect(memberElement).toBeTruthy();
});

test('member shows up appropriately', async ({ page }) => {
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
  await page.fill('[data-testid="search-input"]', '650');
  await page.click('[data-testid="search-button"]');
  
  // Use locator with text matcher
  await expect(page.locator('[data-testid="membership-type"]'))
    .toHaveText('Member');
});

test('non-member shows up appropriately', async ({ page }) => {
  await page.waitForSelector('[data-testid="search-input"]', { state: 'visible' });
  await page.fill('[data-testid="search-input"]', '303');
  await page.click('[data-testid="search-button"]');
  
  // Use locator with text matcher
  await expect(page.locator('[data-testid="membership-type"]'))
    .toHaveText('Non-Member');
});
});