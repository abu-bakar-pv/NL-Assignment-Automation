import { test } from '@playwright/test';
import { env } from '../config/env';

/**
 * Marks the current test as blocked by a documented defect in the system
 * under test. See docs/api-behaviour-findings.md for the defect register.
 *
 * The assertion still describes the *correct* behaviour.
 *
 * - Default: the test is reported as **skipped**, with the defect ID as the
 *   reason, so the report shows it neither as a pass nor as a failure.
 * - RUN_KNOWN_ISSUES=true: the test runs as an expected failure. If the
 *   provider has fixed the defect, it passes unexpectedly and the build fails,
 *   which tells us to remove the marker. Run this periodically.
 *
 * Every such test is tagged '@known-issue' so reports can filter on it.
 */
export function knownIssue(id: string, summary: string): void {
  if (!test.info().tags.includes('@known-issue')) {
    throw new Error(`Tests using knownIssue() must be tagged '@known-issue' so reports can filter them (${id})`);
  }

  const reason = `${id}: ${summary}`;
  test.info().annotations.push({ type: 'known-issue', description: reason });

  if (env.runKnownIssues) {
    test.fail(true, reason);
  } else {
    test.skip(true, `Known issue ${reason}`);
  }
}
