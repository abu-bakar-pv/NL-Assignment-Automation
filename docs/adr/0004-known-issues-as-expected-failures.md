# ADR 0004: Track provider defects as expected failures

**Status:** Accepted  **Date:** 2026-11-08

## Context
The provider has defects we can't fix (e.g. 500 on missing fields). Options were to skip those tests, assert the wrong behaviour, or let them fail.

## Decision
Assert the correct behaviour and call `knownIssue(id, summary)`, which marks the test as expected-to-fail and records the defect ID. These tests are tagged `@regression`, not `@critical`.

## Consequences
- The gate stays meaningful: red means something new.
- When the provider fixes a defect, the test passes unexpectedly and fails the build, which prompts removal of the marker.
- The defect register (`docs/api-behaviour-findings.md`) and the tests stay in sync.
