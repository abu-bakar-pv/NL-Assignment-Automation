# ADR 0004: Track provider defects as known issues

**Status:** Accepted  **Date:** 2026-11-08

## Context
The provider has defects we can't fix (e.g. 500 on missing fields). Options were to skip those tests, assert the wrong behaviour, or let them fail.

## Decision
Assert the correct behaviour, tag the test `@known-issue` and call `knownIssue(id, summary)`, which records the defect ID. These tests are in `@regression`, not the gate.

- Default: reported as **skipped**, with the defect ID as the reason. Reports then show them clearly, as neither passes nor failures. (Revised on 2026-11-08: reporting them as expected failures showed failing tests as "passed", which confused readers.)
- `RUN_KNOWN_ISSUES=true` (or the workflow's `run_known_issues` input): they run as expected failures.

## Consequences
- The gate stays meaningful: red means something new.
- When the provider fixes a defect, a run with known issues enabled passes the test unexpectedly and fails the build, which prompts removal of the marker. This only happens when someone runs that mode, so it's scheduled (monthly, and on provider releases).
- The defect register (`docs/api-behaviour-findings.md`) and the tests stay in sync.
