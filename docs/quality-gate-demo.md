# Quality gate demonstration

How to show the gate blocking a change and releasing it again, using the real
pipeline in `.github/workflows/api-quality-gate.yml`.

## How the gate is built

| Stage | Job | Runs | Blocks merge |
| --- | --- | --- | --- |
| 1 | `gate` | typecheck, lint, `@unit`, `@critical`, `@contract` (51 tests, about 9s of test time locally) | Yes (required status check) |
| 2 | `regression` | `@regression` incl. tracked provider defects | Yes, if configured as required; it only runs once `gate` is green |

| 3 | `publish-report` | Merges both stages into one HTML report and deploys it to GitHub Pages | No; runs on `main` only, also after a red gate |

A test that fails unexpectedly fails the job. A `knownIssue()` test that
starts *passing* also fails the job, so a provider fix can't slip through
unnoticed.

### Why some failing tests show as "passed"

Tests tagged `@known-issue` assert the *correct* behaviour of an API that has a
documented defect (see `docs/api-behaviour-findings.md`). They are marked
`test.fail()`, so Playwright reports the expected failure as a pass. The error
and the request/response are still shown in the report as evidence. Filter the
HTML report with `@known-issue` to see them all. The CI summary counts them
separately from real passes. If one of them ever passes, that is an
*unexpected* pass and the job fails, which means the provider fixed the bug.

## Published HTML report (GitHub Pages)

On every push to `main`, `publish-report` merges the gate and regression blob
reports and deploys the result to the repository's GitHub Pages site.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After the next run on `main`, the URL is shown on the `publish-report` job and
in **Settings → Pages**.

The report is public if the repository is. `ApiClient` masks `Authorization`,
`Cookie` and credential fields (`password`, `token`, `client_secret`, ...) in
every attachment. A local merge of both stages (90 tests, 154 attachments) was
checked and contained none of the demo credentials.

Reproduce the merged report locally:

```bash
REPORT_STAGE=gate npm run test:gate
REPORT_STAGE=regression npm run test:regression
mkdir -p reports/all-blob && cp reports/blob-*/*.zip reports/all-blob/
PLAYWRIGHT_HTML_OUTPUT_DIR=site npx playwright merge-reports --reporter html reports/all-blob
npx playwright show-report site
```

## The four steps (local, no git needed)

The breaking change lives in [`demo/require-currency.patch`](../demo/require-currency.patch).
`patch` applies and reverts it, so the demo works without git or GitHub.

### 1. Green baseline

```bash
npm run test:gate; echo "exit: $?"     # 51 passed, exit: 0
```

### 2. A plausible change that breaks the contract

A developer adds `currency` as a required field to the booking contract
because a new multi-market pricing feature needs it:

```diff
-  "required": ["firstname", "lastname", "totalprice", "depositpaid", "bookingdates"],
+  "required": ["firstname", "lastname", "totalprice", "depositpaid", "bookingdates", "currency"],
```

```bash
patch -p1 < demo/require-currency.patch
```

### 3. The gate blocks it

```bash
npm run test:gate; echo "exit: $?"
```

Recorded on 2026-11-08 against the live API:

```
  8 failed
  43 passed (9.5s)
exit: 1

  Error: Payload does not match schema "created-booking":
    - /booking must have required property 'currency'
```

A non-zero exit code is what fails the `gate` job in
`.github/workflows/api-quality-gate.yml`. With branch protection that makes
**Gate** a required check, that job blocks the merge.

Talking point: the consumer wants a field the provider doesn't send. The gate
catches the mismatch at PR time, before an integration breaks in a shared
environment or in production. The fix is a conversation with the provider
team, not a change to the test.

### 4. Fix and go green

Back out the requirement until the provider ships the field:

```bash
patch -p1 -R < demo/require-currency.patch
npm run test:gate; echo "exit: $?"     # 51 passed, exit: 0
```

## Running it in GitHub Actions (optional, only if you choose to publish)

Nothing in this project has been pushed anywhere. If you later put it in a
repository you control, the same flow runs in CI:

1. Push `main`, then add a branch protection rule on `main`: require a pull
   request, and require the **Gate (static checks, unit, critical, contract)**
   status check.
2. Create a branch, apply the patch, commit, and open a PR. The `gate` job
   fails, `regression` is skipped, and merging is blocked.
3. Revert the change and push. Both jobs go green.

The workflow file has been parsed and its commands verified locally. It has
not been run on GitHub.

## Why this protects releases

- **Shift left.** Contract drift shows up in the PR that introduces it, not in a later E2E run or after release.
- **Cheap and fast.** The gate needs no browsers and no shared environment state, so teams don't learn to bypass it.
- **Signal over noise.** Known provider defects are tracked separately and don't make the gate red. A red gate always means "look at this now".
- **Evidence.** Every run uploads an HTML report with each request/response pair attached, with auth headers masked.
