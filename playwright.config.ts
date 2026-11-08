import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  // The public demo API is hosted on a free tier and occasionally cold-starts.
  // One retry in CI absorbs that; anything flakier is treated as a defect.
  retries: env.isCI ? 1 : 0,
  workers: env.isCI ? 4 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    extraHTTPHeaders: { 'User-Agent': 'api-quality-platform-tests' },
  },

  projects: [
    { name: 'unit', testDir: './tests/unit' },
    { name: 'api', testIgnore: /unit\// },
  ],

  webServer: {
    command: 'npx tsx mock/dealer-gateway/server.ts',
    url: `${env.dealerGateway.baseUrl}/health`,
    reuseExistingServer: !env.isCI,
    timeout: 15_000,
    stdout: 'ignore',
  },
});
