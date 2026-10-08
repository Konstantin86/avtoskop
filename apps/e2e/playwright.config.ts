import { defineConfig } from '@playwright/test';
import { BASE_URL } from './src/env.ts';

// Runs against a production build of the site (build it first: `pnpm e2e:build`), with a
// fresh database and a stand-in Telegram. Tests share one database, so they run one by one.
export default defineConfig({
  testDir: 'tests',
  globalSetup: './src/setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // The installed Chrome; no browser download needed.
    channel: 'chrome',
    locale: 'uk-UA',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
  },
});
