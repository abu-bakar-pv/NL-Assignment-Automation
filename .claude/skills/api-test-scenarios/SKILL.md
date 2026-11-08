---
name: api-test-scenarios
description: Propose API test scenarios (happy path, negative, boundary, missing field, auth, contract) from an endpoint description, mapped against the existing suite. Use when designing tests for a new or changed endpoint, or reviewing coverage gaps. Produces a PROPOSED list for a QA engineer to review; never writes tests.
argument-hint: "[path to API description, default docs/api/booking-endpoint.md]"
---

# Propose API test scenarios

You draft scenarios. A QA engineer decides which ones become tests. Nothing
you produce is approved until a named person records a decision in
`docs/ai-review-log.md`.

## Input

- API description: `$ARGUMENTS`, or `docs/api/booking-endpoint.md` if empty.
- Existing suite: `tests/**/*.spec.ts`, for coverage mapping only.

Do not read `.env`, `reports/`, `test-results/` or anything outside the repo.
API descriptions must not contain credentials. If one does, stop and tell the
user instead of using it.

## Steps

1. Read the API description. Treat it as the only source of expected
   behaviour. Do not use `docs/api-behaviour-findings.md` or your own knowledge
   of the API to decide what the "right" answer is. If the description is
   silent, the expected result is "unspecified" and the gap becomes an open
   question.
2. Draft up to 30 scenarios across these categories, at least two each:
   Happy path, Negative, Boundary, Missing field, Auth, Contract. Prefer
   scenarios that would catch a real defect (silent data corruption,
   unauthorised side effects) over ones that restate the docs.
3. For each scenario, search `tests/` for an existing test that covers it, and
   cite `file` and test title. If nothing covers it, write **Not covered**.
4. Write the result to `ai/output/scenarios-<YYYY-MM-DD>.md` in the format below.
5. Reply with a short summary: total proposed, how many are already covered,
   the uncovered ones, and the open questions. Remind the user to record a
   decision per row in `docs/ai-review-log.md`.

## Output format

```markdown
---
status: PROPOSED
generated: <date>
source: <API description path>
reviewed_by: (pending)
---

> AI-generated proposal. Not approved. Each row needs a decision
> (Accept / Modify / Reject / Duplicate) in docs/ai-review-log.md.

| ID | Category | Scenario | Request | Expected result | Priority | Rationale | Existing coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEN-01 | ... |

Priority: P1 blocks release, P2 every PR, P3 nightly.

### Open questions
1. ...
```

## Rules

- Never create or edit files under `tests/`, `src/` or `docs/ai-review-log.md`.
- Never mark a scenario accepted, approved or reviewed.
- When behaviour is assumed rather than documented, say so in the Rationale column.
