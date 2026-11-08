# Restful-Booker: observed behaviour and defect register

Recorded on 2026-11-08 by probing `https://restful-booker.herokuapp.com` with
curl before writing the tests. Each entry is backed by a `knownIssue()` test
that asserts the *correct* behaviour. It is reported as skipped by default, and when run with `RUN_KNOWN_ISSUES=true` it is expected to fail until the
provider fixes it.

| ID | Area | Expected | Observed | Severity | Test |
| --- | --- | --- | --- | --- | --- |
| RB-001 | POST /booking | 201 Created | 200 | Low | `http-conformance.spec.ts` |
| RB-002 | DELETE /booking/{id} | 204 No Content | 201 Created | Low | `http-conformance.spec.ts` |
| RB-003 | Missing required field | 400 with field error | 500 Internal Server Error | High | `negative.spec.ts` |
| RB-004 | Wrong data type | 400 | Coerced silently (`"abc"` → `null`, `"yes"` → `true`) or 500 | High | `negative.spec.ts`, `booking.contract.spec.ts` |
| RB-005 | Business rules | 400 | Negative price, empty name and checkout-before-checkin accepted | Medium | `negative.spec.ts` |
| RB-006 | POST /auth bad credentials | 401 | 200 with `{"reason":"Bad credentials"}` | Medium | `authentication.spec.ts` |
| RB-007 | Missing or invalid auth | 401 | 403 | Low | `authentication.spec.ts` |
| RB-008 | Unsupported method | 405 with `Allow` | 404 | Low | `http-conformance.spec.ts` |
| RB-009 | Decimal price | Stored as sent | Truncated, 10.75 → 10 | High (money) | `negative.spec.ts` |
| RB-010 | Invalid date | 400 | Stored as `"0NaN-aN-aN"` | High | `negative.spec.ts` |
| RB-011 | Repeat DELETE | 404 | 405 | Low | `http-conformance.spec.ts` |
| RB-012 | `Content-Type: text/plain` | 415 | 500 | Medium | `negative.spec.ts` |

## Behaviour pinned as the documented contract

The provider's documentation describes 200 for create and 201 for delete. The
critical lifecycle test pins those documented values so the gate protects
consumers today. The conformance tests above record where that contract
departs from HTTP semantics.

## Limitations of the sample API

- **No authorisation model.** There is a single admin credential, with no
  roles, tenants or scopes. Authorisation is demonstrated against the
  virtualised dealer gateway in `mock/dealer-gateway` (see
  `tests/authz/dealer-access.spec.ts`).
- **Shared, public data.** Other people write to the same instance. Tests
  create their own records with unique names and delete them afterwards. They
  never assume a record they didn't create.
- **Free-tier hosting.** Occasional cold starts are absorbed by one CI retry.
  A test that needs the retry is reported as flaky in the run summary rather
  than hidden.

## Why record this at all

On a real integration platform these would go to the owning team as tickets.
Executable known-issue tests turn "we think it's still broken" into a fact
that every pipeline run re-checks.
