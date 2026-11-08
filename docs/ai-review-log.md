# AI review log

Every AI-generated artefact gets a human decision before it influences the test
suite. This log is where that decision is recorded. AI tooling never writes to
this file.

## How to review a generated scenario

For each row, check:

1. **Is it grounded?** Does the expected result follow from the documentation,
   or did the model assume behaviour? Assumed behaviour becomes an open question,
   not a test.
2. **Is it new?** Does an existing test already cover it?
3. **Is it worth automating?** Weigh the risk it covers against its run cost and
   maintenance cost.
4. **Is the expectation right for *our* consumers?** Sometimes the documented
   behaviour is what we pin, and the "correct" behaviour is tracked as a known issue.

Decisions: **Accept** (automate as proposed), **Modify** (automate with changes,
and say what changed), **Reject** (say why), **Duplicate** (already covered).

## Review: booking scenarios, 2026-11-08

Source: [`ai-examples/generated-scenarios.md`](ai-examples/generated-scenarios.md)

The "Existing coverage" column was filled by tracing each scenario to the
current suite. The **Decision** and **Reviewer notes** columns are for the
reviewing engineer.

| ID | Scenario | Existing coverage | Observations from tracing | Decision | Reviewer notes |
| --- | --- | --- | --- | --- | --- |
| GEN-01..05 | CRUD lifecycle | `booking/crud.spec.ts` lifecycle test (one test, five steps) | Proposal splits into 5 tests; suite uses `test.step` to keep one data lifecycle | | |
| GEN-06 | Filter by name | `crud.spec.ts` "discoverable by guest name" | | | |
| GEN-07 | Unknown id → 404 | `negative.spec.ts` resource identity | | | |
| GEN-08 | Non-numeric id | `negative.spec.ts` (`abc`) | Suite asserts 404 exactly; proposal allows 400 | | |
| GEN-09 | Malformed JSON | `negative.spec.ts` | | | |
| GEN-10, 11 | Wrong types | `negative.spec.ts` (RB-004) | Live API coerces these; tracked as known issue | | |
| GEN-12 | Unknown field | `negative.spec.ts` "unknown properties are not persisted" | Matches the "ignored, never persisted" branch | | |
| GEN-13, 14 | Missing required | `negative.spec.ts` (RB-003), all 5 fields | | | |
| GEN-15 | Missing nested `checkout` | **Not covered** | Genuine gap | | |
| GEN-16 | Optional omitted | `booking.contract.spec.ts` | | | |
| GEN-17 | Zero price | `negative.spec.ts` boundary | | | |
| GEN-18, 21 | Negative price, date order | `negative.spec.ts` (RB-005) | | | |
| GEN-19 | Decimal price | `negative.spec.ts` (RB-009) | Model flagged the money risk that the live API actually has | | |
| GEN-20 | Same-day stay | `negative.spec.ts` asserts accepted | Proposal correctly marks behaviour as unspecified | | |
| GEN-22 | Invalid calendar date | `negative.spec.ts` (RB-010) | | | |
| GEN-23 | Token issued | `authentication.spec.ts` | | | |
| GEN-24 | Invalid credentials → 401 | `authentication.spec.ts` (RB-006) | Expected result is an assumption (see open question 1) | | |
| GEN-25, 26, 28 | Unauthorised writes | `authentication.spec.ts` (none / forged / wrong basic, update and delete) | Suite also verifies "nothing changed" | | |
| GEN-27 | Basic auth | `authentication.spec.ts` | | | |
| GEN-29, 30 | Contract shape | `booking.contract.spec.ts` | | | |
| (none) | Tampered token, token uniqueness | `authentication.spec.ts` | Present in suite, not proposed by the model | | |
| (none) | Unsupported methods → 405 | `http-conformance.spec.ts` | Not proposed by the model | | |
| (none) | Non-JSON content type | `negative.spec.ts` (RB-012) | Not proposed by the model | | |

**Reviewer:** ______  **Date:** ______

### Summary for discussion

- 29 of 30 proposals were already covered; 1 genuine gap (GEN-15).
- The model missed unsupported HTTP methods, content-type handling and token
  tampering. Human test design still covered ground the model did not.
- 6 open questions are useful on their own: each is a gap in the API
  documentation to raise with the provider team.
- Takeaway for the team: use generation for **coverage review and gap finding**
  on an existing suite, and as a starting point for new endpoints. Don't use it as
  a source of truth for expected behaviour.
