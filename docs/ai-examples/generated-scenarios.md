---
status: PROPOSED
generated: 2026-11-08
model: claude-opus-5-5
input: docs/api/booking-endpoint.md
note: produced before the /api-test-scenarios skill existed; coverage mapping was added afterwards in docs/ai-review-log.md
reviewed_by: (pending, see docs/ai-review-log.md)
---

> AI-generated proposal. Not approved. Each row must be accepted, modified
> or rejected by a QA engineer in docs/ai-review-log.md before it is automated.

| ID | Category | Scenario | Request | Expected result | Priority | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| GEN-01 | Happy path | Create a booking with all fields | POST /booking, full valid Booking | 200; body has numeric `bookingid` and `booking` equal to the request | P1 | Core write path; documented response shape |
| GEN-02 | Happy path | Read back a created booking | GET /booking/{id} for GEN-01 id | 200; body equals the created Booking | P1 | Proves persistence, not just echo |
| GEN-03 | Happy path | Replace a booking with PUT | PUT /booking/{id} with token, full Booking | 200; body equals the new Booking; subsequent GET matches | P1 | Full-replacement semantics documented |
| GEN-04 | Happy path | Partially update with PATCH | PATCH /booking/{id} with token, `{ "firstname": "X" }` | 200; only firstname changed | P1 | Partial update must not wipe other fields |
| GEN-05 | Happy path | Delete a booking | DELETE /booking/{id} with token, then GET | 201 on delete; GET returns 404 | P1 | Documented 201; also verifies effect |
| GEN-06 | Happy path | Filter list by name | GET /booking?firstname=&lastname= of a created booking | 200; list contains the created id | P2 | Query params are documented but easy to break |
| GEN-07 | Negative | Read a non-existent id | GET /booking/999999999 | 404 | P2 | Unspecified in docs; 404 is the HTTP convention |
| GEN-08 | Negative | Non-numeric id | GET /booking/abc | 404 or 400, never 500 | P3 | Docs say id is a number; error code unspecified |
| GEN-09 | Negative | Malformed JSON body | POST /booking with truncated JSON | 400 | P2 | Parser errors must not surface as 500 |
| GEN-10 | Negative | Wrong type for totalprice | POST /booking with `"totalprice": "abc"` | 400; nothing stored | P2 | Type stated as number; coercion would corrupt pricing |
| GEN-11 | Negative | Wrong type for depositpaid | POST /booking with `"depositpaid": "yes"` | 400 | P2 | Boolean stated; truthy strings are a common coercion bug |
| GEN-12 | Negative | Unknown extra field | POST /booking with `"isAdmin": true` | Field ignored or 400; never persisted | P2 | Mass-assignment risk |
| GEN-13 | Missing field | Missing firstname | POST /booking without firstname | 400 naming the field | P2 | Marked required |
| GEN-14 | Missing field | Missing bookingdates | POST /booking without bookingdates | 400 | P2 | Nested required object |
| GEN-15 | Missing field | Missing checkout inside bookingdates | POST /booking with only checkin | 400 | P3 | Nested required property is often unvalidated |
| GEN-16 | Missing field | Optional field omitted | POST /booking without additionalneeds | 200; field absent or null in response | P2 | Confirms optional really is optional |
| GEN-17 | Boundary | Zero price | totalprice 0 | 200 | P3 | Lower bound; docs give no minimum |
| GEN-18 | Boundary | Negative price | totalprice -1 | 400 | P2 | Docs give no minimum; negative price is almost certainly invalid |
| GEN-19 | Boundary | Decimal price | totalprice 10.75 | 200; value stored as 10.75 | P2 | "number" allows decimals; truncation would be a money defect |
| GEN-20 | Boundary | Same-day stay | checkin = checkout | 200 or 400; behaviour must be defined | P3 | Unspecified |
| GEN-21 | Boundary | Checkout before checkin | checkout < checkin | 400 | P2 | Logical date order |
| GEN-22 | Boundary | Invalid calendar date | checkin 2027-02-30 | 400 | P2 | Format YYYY-MM-DD does not guarantee a real date |
| GEN-23 | Auth | Token from valid credentials | POST /auth with valid credentials | 200; `token` is a non-empty string | P1 | All writes depend on it |
| GEN-24 | Auth | Invalid credentials | POST /auth with wrong password | 401; no token | P1 | Docs do not state status, see open questions |
| GEN-25 | Auth | Update without credentials | PUT /booking/{id} with no cookie or header | 401/403; booking unchanged | P1 | Unauthorised write must be refused and have no effect |
| GEN-26 | Auth | Update with forged token | PATCH with `Cookie: token=invalid` | 401/403; unchanged | P1 | Token must be validated, not just present |
| GEN-27 | Auth | Basic auth alternative | PATCH with valid Basic header | 200 | P2 | Second documented mechanism |
| GEN-28 | Auth | Delete without credentials | DELETE /booking/{id}, no auth | 401/403; booking still exists | P1 | Destructive operation |
| GEN-29 | Contract | Booking response shape | GET /booking/{id} | Matches Booking schema; no undocumented fields | P1 | Consumers rely on this shape |
| GEN-30 | Contract | List response shape | GET /booking | Array of `{ bookingid: number }` | P2 | Shape documented |

### Open questions

1. Which status code does `POST /auth` return for invalid credentials? The docs only describe success.
2. Is a same-day stay (checkin = checkout) valid?
3. Are there limits on name length or price range?
4. Should unknown fields be rejected (400) or ignored?
5. Does `additionalneeds` allow `null`, or only omission?
6. Is the token time-limited? If it is, what is the expiry, and what status code comes back when it has expired?
