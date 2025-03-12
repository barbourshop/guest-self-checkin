import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 10000,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 10000,
    ignoreHTTPSErrors: true
  },  
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    viewport: { width: 1280, height: 720 },
    trace: 'on',
    video: 'on-first-retry'
  },
  retries: 1
});
