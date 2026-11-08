# Example: AI-assisted failure analysis

| | |
| --- | --- |
| Failing run | `npm run test:gate` with the `demo/require-currency` change applied (then a local branch, now `demo/require-currency.patch`), 2026-11-08 (8 failed, exit 1) |
| Evidence bundle | Built by the redaction script (now `npm run ai:bundle -- --diff demo/require-currency.patch --grep "GET /booking/{id}"`) |
| Input sent | [`failure-bundle.json`](failure-bundle.json), redacted (the `Cookie` header shows as `[REDACTED]`) |
| Model | Claude Opus 5.5, given only the redacted bundle. This worked example predates the `/triage-gate-failure` skill, which now packages the same instructions. |
| Status | **UNVERIFIED until the reviewer signs off below** |

---

## AI output (verbatim)

## Summary
The contract test `GET /booking/{id} matches the booking contract`
(`contract/booking.contract.spec.ts:27`) failed because the booking returned
by the API has no `currency` property, which the `booking` schema now requires.

## Evidence
- Assertion: `(root) must have required property 'currency'`.
- `POST /booking` returned 200 and `GET /booking/765` returned 200. Both bodies
  contain exactly `firstname`, `lastname`, `totalprice`, `depositpaid`,
  `bookingdates` and `additionalneeds`. There is no `currency` and no field that
  looks like a renamed currency (e.g. `curr`, `currencyCode`).
- The request body also contained no `currency`, so the API wasn't given one
  to echo back.
- Recent change `43e195b Require currency on bookings for multi-market pricing`
  adds `"currency"` to `required` and defines it as `^[A-Z]{3}$` in
  `src/schemas/booking.schema.json`. No API-side change is visible in the bundle.
- 8 tests failed in the same run, which fits a shared schema change better than
  an endpoint-specific defect.

## Likely root causes
1. **The contract is ahead of the provider (test/contract is wrong for today).**
   Confidence: high. The only change is the schema; the API returns the same
   shape as before; the failure appeared in the commit that added the requirement.
2. **The provider was expected to ship `currency` and hasn't deployed it yet (API
   behind plan).** Confidence: medium. The commit message implies a feature
   dependency. Nothing in the bundle shows whether the provider agreed to add it.
3. **The field exists under another name or only in a different API version.**
   Confidence: low. No similarly named field appears in any response, and no
   version header or path is used.

## Debugging steps
1. Confirm the live shape: `curl -s https://restful-booker.herokuapp.com/booking/1 -H 'Accept: application/json' | jq 'keys'`.
2. Check whether the provider documents `currency` or has it on a roadmap or in a
   pending release, e.g. in the API changelog or the provider team's ticket.
3. Run `git log -p -- src/schemas/booking.schema.json` to see whether the
   requirement was coordinated with the provider (linked ticket, PR discussion).
4. Re-run only the contract tests to confirm the scope: `npx playwright test --grep @contract`.

## Suggested additional tests
- A schema unit test that fails when a new property is made `required` without
  being present in a recorded provider response (a provider-verification step,
  as in consumer-driven contract testing).
- Once `currency` exists: a contract test that it is a 3-letter ISO 4217 code,
  and a negative test that an unsupported currency is rejected.
- A backward-compatibility check that existing bookings created before the change
  still satisfy the contract (default currency, or `currency` initially optional).

## Who should act
The consumer team that made the change, together with the test owner. Revert or
make `currency` optional until the provider team confirms a release date. Raise
the requirement with the provider team as a contract change request.

---

## Human verification

Done by the QA engineer before acting on the output.

| Hypothesis / claim | How it was checked | Result |
| --- | --- | --- |
| Provider does not return `currency` | `curl .../booking/1` → keys: `additionalneeds, bookingdates, depositpaid, firstname, lastname, totalprice` | Confirmed |
| Failure caused by the schema change alone | Reverted the change → `npm run test:gate` → all gate tests passed, exit 0 | Confirmed |
| 8 failures share one cause | 7 of 8 messages name `currency`. The 8th (`accepts null where the contract allows it`) only says `expected true, received false`, and passes after the revert | Confirmed, but the 8th needed the revert to prove it. That unit test now asserts on the error list, so it names the cause |
| Suggested test: provider verification step | Valid idea for the real platform (Pact-style). Out of scope for a public API we don't own | Noted for roadmap |

**Reviewer decision:** ______ (accept / modify / reject)  **Reviewer:** ______  **Date:** ______

## What this shows

- The AI worked only from evidence the framework had already captured (request,
  response, assertion, diff). It didn't need access to systems or credentials.
- It separated "contract wrong" from "API wrong", which is the triage decision
  that matters most and the one engineers most often get wrong under pressure.
- Each claim was checked with a command before anyone acted on it.
