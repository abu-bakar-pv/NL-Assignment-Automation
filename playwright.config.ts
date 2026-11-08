import { defineConfig, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

// CI jobs set REPORT_STAGE (gate, regression). Each writes a blob report so the
// publish job can merge both stages into one HTML report for GitHub Pages.
const stage = process.env.REPORT_STAGE;
const blob: ReporterDescription[] = stage ? [['blob', { outputDir: `reports/blob-${stage}`, fileName: `${stage}.zip` }]] : [];

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
  // Playwright adds commit author, message and diff to reports in CI by default.
  // The report is published on GitHub Pages, so keep that metadata out of it.
  captureGitInfo: { commit: false, diff: false },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ...blob,
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
