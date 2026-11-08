---
name: triage-gate-failure
description: Triage a failing API quality gate run. Builds a redacted evidence bundle from reports/results.json, proposes ranked root-cause hypotheses, gathers read-only evidence for each, and writes an UNVERIFIED triage note for an engineer to sign off. Use after `npm run test:gate` or a CI run goes red.
argument-hint: "[--grep <test title>] [--diff <patch file> | --with-diff]"
---

# Triage a red quality gate

You produce hypotheses and evidence. An engineer decides what happens next.
You never fix, revert or mark anything as resolved.

## 1. Build the redacted bundle

The bundle is the only failure data you may read. It is produced by a
deterministic, unit-tested script that masks credentials and personal data.

```bash
npm run ai:bundle -- $ARGUMENTS
```

- If it reports `No report at reports/results.json`, ask the user to run
  `npm run test:gate` first and stop.
- If it reports no unexpected failures, say so and stop.

Read the bundle file the script names (`ai/output/failure-bundle-*.json`).

**Do not read** `reports/`, `test-results/`, `.env`, or Playwright trace or
attachment files directly. They hold unredacted data. If you need more
evidence than the bundle gives, ask the user or use the read-only checks
below.

## 2. Analyse

Write these sections:

- **Summary:** what failed and where, in one or two sentences.
- **Evidence:** what the assertion, request, response, schema and recent
  change actually show. Quote field names and values from the bundle.
- **Likely root causes:** numbered, most likely first. For each: confidence
  (high/medium/low) and the evidence for and against. Always separate
  "the test or contract is wrong" from "the API is wrong".
- **Suggested additional tests:** what would have caught this earlier.
- **Who should act:** test owner, consumer team or provider team.

## 3. Gather evidence (read-only)

For each hypothesis, run at most one or two read-only checks and record the
exact command and its real output. Allowed:

- `curl -s` GET requests to the API under test (never with credentials)
- `npx playwright test <file> -g "<title>"` to re-run a single test
- `git log` / `git diff` when the project is a git repository
- Reading source, schema and test files

Never modify files under `src/`, `tests/` or `mock/`, never apply or revert
patches, and never change git state. If a check would need any of that,
describe it as a debugging step for the engineer instead.

## 4. Write the triage note

Write `ai/output/triage-<YYYY-MM-DD-HHmm>.md`:

```markdown
<!-- status: UNVERIFIED | bundle: <bundle path> -->
> AI-drafted triage. Hypotheses and evidence only. An engineer decides.

## Summary
## Evidence
## Likely root causes
## Evidence gathered
| Hypothesis | Command | Output (trimmed) | Supports / contradicts |
## Debugging steps for the engineer
## Suggested additional tests
## Who should act

**Reviewer decision:** ______  **Reviewer:** ______  **Date:** ______
```

Leave the reviewer line blank. Finish by telling the user the most likely
cause, how strongly the gathered evidence supports it, and where the note is.
