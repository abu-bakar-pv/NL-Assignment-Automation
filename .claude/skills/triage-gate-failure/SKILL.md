---
name: triage-gate-failure
description: Triage a failing API quality gate run, local or from a GitHub Actions pipeline run. Builds a redacted evidence bundle from the Playwright JSON report, proposes ranked root-cause hypotheses, gathers read-only evidence for each, and writes an UNVERIFIED triage note for an engineer to sign off. Use after `npm run test:gate` or a CI run goes red.
argument-hint: "[--run <GitHub Actions run id or URL>] [--grep <test title>] [--diff <patch file> | --with-diff]"
---

# Triage a red quality gate

You produce hypotheses and evidence. An engineer decides what happens next.
You never fix, revert or mark anything as resolved.

## 1. Get the report

**Pipeline failure** (the user gives `--run <id or URL>`, or says the CI run
failed): download that run's report artifact. Take the run id from the URL
(`.../actions/runs/<id>`). Use `gate-report` when the Gate job failed and
`regression-report` when Regression failed. If unsure, list the run's failed
jobs with `gh run view <id>`.

```bash
gh run download <id> --name gate-report --dir reports/ci-<id>
```

Then pass `--report reports/ci-<id>/results.json` to the bundle script below,
together with the user's other arguments (without `--run`). If `gh` isn't
installed or authenticated, ask the user to download the artifact from the
run page and unzip it into `reports/ci-<id>/`.

**Local failure:** the script reads `reports/results.json` by default.

## 2. Build the redacted bundle

The bundle is the only failure data you may read. It is produced by a
deterministic, unit-tested script that masks credentials and personal data.

```bash
npm run ai:bundle -- [--report <path>] [--grep ...] [--diff ... | --with-diff]
```

- If it reports `No report at ...`, ask the user to run `npm run test:gate`
  (or give a pipeline run id) and stop.
- If it reports no unexpected failures, say so and stop. Skipped tests,
  including `@known-issue` tests skipped by default, are not failures.
- If the failing test is tagged `@known-issue` and the run used
  `RUN_KNOWN_ISSUES=true`, the "failure" means the defect may be **fixed**.
  Say so, check the defect's entry in `docs/api-behaviour-findings.md`, and
  suggest confirming with curl. Don't treat it as a regression.

Read the bundle file the script names (`ai/output/failure-bundle-*.json`).

**Do not read** `reports/`, `test-results/`, `.env`, or Playwright trace or
attachment files directly. They hold unredacted data. If you need more
evidence than the bundle gives, ask the user or use the read-only checks
below.

## 3. Analyse

Write these sections:

- **Summary:** what failed and where, in one or two sentences.
- **Evidence:** what the assertion, request, response, schema and recent
  change actually show. Quote field names and values from the bundle.
- **Likely root causes:** numbered, most likely first. For each: confidence
  (high/medium/low) and the evidence for and against. Always separate
  "the test or contract is wrong" from "the API is wrong".
- **Suggested additional tests:** what would have caught this earlier.
- **Who should act:** test owner, consumer team or provider team.

## 4. Gather evidence (read-only)

For each hypothesis, run at most one or two read-only checks and record the
exact command and its real output. Allowed:

- `curl -s` GET requests to the API under test (never with credentials)
- `npx playwright test <file> -g "<title>"` to re-run a single test
- `git log` / `git diff` when the project is a git repository
- `gh run view <id>` for job and step status of a pipeline run (not `--log` or `--log-failed`: logs are unredacted)
- Reading source, schema and test files

Never modify files under `src/`, `tests/` or `mock/`, never apply or revert
patches, and never change git state. If a check would need any of that,
describe it as a debugging step for the engineer instead.

## 5. Write the triage note

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
