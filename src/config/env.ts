import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

function read(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const env = {
  booker: {
    baseUrl: read('BOOKER_BASE_URL', 'https://restful-booker.herokuapp.com'),
    username: read('BOOKER_USERNAME', 'admin'),
    password: read('BOOKER_PASSWORD', 'password123'),
  },
  dealerGateway: {
    port: Number(read('DEALER_GATEWAY_PORT', '4010')),
    get baseUrl() {
      return `http://127.0.0.1:${this.port}`;
    },
  },
  isCI: Boolean(process.env.CI),
  // Known-issue tests are skipped unless this is set (see src/support/knownIssue.ts).
  runKnownIssues: process.env.RUN_KNOWN_ISSUES === 'true',
} as const;
