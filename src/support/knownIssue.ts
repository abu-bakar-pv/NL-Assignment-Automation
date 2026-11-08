import { test } from '@playwright/test';

/**
 * Marks the current test as an expected failure caused by a documented
 * defect in the system under test.
 *
 * The assertion still describes the *correct* behaviour. While the defect
 * exists the test is reported as "expected to fail"; once it is fixed the
 * test flips to unexpected-pass and the build tells us to remove the marker.
 *
 * Playwright reports an expected failure as passed, so every such test is
 * also tagged '@known-issue': the HTML report can filter on it, and the CI
 * summary lists the defect IDs separately from real passes.
 * See docs/api-behaviour-findings.md for the defect register.
 */
export function knownIssue(id: string, summary: string): void {
  if (!test.info().tags.includes('@known-issue')) {
    throw new Error(`Tests using knownIssue() must be tagged '@known-issue' so reports can filter them (${id})`);
  }
  test.info().annotations.push({ type: 'known-issue', description: `${id}: ${summary}` });
  test.fail(true, `${id}: ${summary}`);
}
