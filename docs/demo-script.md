# Live demo script (18 minutes)

The demo is the main part of the session. Slides 1–6 take about 12 minutes,
then switch to this script at slide 7.

## Before the session (T-30 min)

```bash
cd api-quality-platform
npm ci
curl -s -o /dev/null -w "%{http_code}\n" https://restful-booker.herokuapp.com/ping   # expect 201
npm test                                   # warm-up run; expect 90 passed
```

Have these ready:
- **Editor** with tabs open: `tests/booking/crud.spec.ts`, `src/fixtures/index.ts`, `src/clients/BookingClient.ts`, `tests/authz/dealer-access.spec.ts`, `src/support/knownIssue.ts`, `src/schemas/booking.schema.json`
- **Terminal** at the repo root, font size large
- `src/schemas/booking.schema.json` back in its original state (`grep -c currency src/schemas/booking.schema.json` prints `0`)
- **Fallback:** if the public API is down, skip to step 3 (it runs locally), and show the recorded outputs in `quality-gate-demo.md`

---

## 1. Framework tour (2 min)

**Open** `tests/booking/crud.spec.ts`.

> "This is the most important test in the suite: the booking lifecycle, tagged
> `@critical`. Notice what's not here: no URLs, no headers, no JSON plumbing.
> The test reads as create, read, replace, patch, delete, verify."

**Open** `src/fixtures/index.ts` and scroll to `bookings`.

> "Fixtures are Playwright's dependency injection. `bookings.create()` makes a
> valid booking with a unique name and registers it. After the test, even if it
> fails, the fixture deletes it. On a shared environment that's the difference
> between a stable suite and a flaky one."

**Open** `src/clients/BookingClient.ts`.

> "One client per resource. If an endpoint path or auth scheme changes, this is
> the only file that changes. This is the pattern I'd bring into the existing
> framework first, because it can be adopted one resource at a time."

## 2. Happy path, negative and auth against the live API (3 min)

```bash
npx playwright test tests/booking/crud.spec.ts tests/auth/ --reporter=list
```

Keep the trailing slash: `tests/auth` would also match `tests/authz`, because Playwright treats paths as patterns.

**Expect:** 19 tests pass in a few seconds, with lines ending `@critical`. Some auth tests
marked `✘` are known issues (next step explains).

> "These are real calls to a public API. The auth tests check the refusal *and*
> that nothing changed. A 403 that still applied the update is the worst kind
> of security defect, and a status-only assertion would miss it."

**Open the report:**

```bash
npm run report
```

Click the lifecycle test → **Attachments**. Show a `PATCH /booking/... -> 200`
exchange with `"Cookie": "***"`.

> "Every request and response is attached, with secrets masked. A CI failure can
> be diagnosed from the report alone. The AI triage tool reads these same
> attachments."

## 3. Authorisation and DMS failures on the virtualised gateway (3 min)

**Open** `tests/authz/dealer-access.spec.ts`.

> "Restful-Booker has a single admin, so it can't show authorisation. Rather
> than pretend, I built a small gateway mock with the rules an automotive
> integration platform has: OAuth client credentials, scopes, and dealer
> isolation. Playwright starts it automatically."

```bash
npx playwright test tests/authz tests/integration --reporter=list
```

**Expect:** 17 passed. Point at:
- `a dealer cannot read another dealer's leads`: tenant isolation (OWASP API1)
- `a token with modified claims is rejected`: tampering
- `an unavailable DMS yields 503 with a Retry-After hint`: service virtualisation of a downstream that isn't available in test

> "This is how the gate stays green when a DMS sandbox is down. It never
> depends on one."

## 4. Contracts and a provider defect (2 min)

**Open** `src/schemas/booking.schema.json`. Point at `"additionalProperties": false`.

> "The schema describes what consumers rely on, and it's strict. A renamed or
> retyped field fails the gate, so it becomes a reviewed change."

**Open** `tests/booking/negative.spec.ts` and find `knownIssue('RB-009'`.

> "I probed the API before writing tests and found 12 defects. This one
> truncates 10.75 to 10, which is a money bug. I don't skip the test, and I
> don't assert the wrong value. The test asserts the correct behaviour and is
> marked as a known issue. If the provider fixes it, this test passes
> unexpectedly and the build tells us to remove the marker."

```bash
npx playwright test -g "decimal price" --reporter=list
```

**Expect:** `1 passed`. The line shows `✘` because it is expected to fail.

## 5. The quality gate (4 min)

**Open** `.github/workflows/api-quality-gate.yml`. Point at the `gate` job, then
at `regression` with `needs: gate`.

> "Two stages. The gate is static checks plus unit, critical and contract
> tests: 51 tests, about 9 seconds of test time. It's a required check, so a
> non-zero exit blocks the merge. Regression only runs once the gate is green."

**Baseline:**

```bash
npm run test:gate; echo "exit: $?"
```

**Expect:** `51 passed`, `exit: 0`.

**Open** `demo/require-currency.patch`. One line adds `currency` to `required`.

> "A consumer team needs currency for multi-market pricing, so they make it
> required in the contract. Reasonable change. But does the provider send it?"

```bash
patch -p1 < demo/require-currency.patch
npm run test:gate; echo "exit: $?"
```

**Expect:** `8 failed`, `43 passed`, `exit: 1`. Each failure message says
`must have required property 'currency'`.

> "Caught in seconds, with the field named. In CI that exit code fails the
> gate job and branch protection disables the merge button. Without the gate,
> this shows up as a broken integration in a shared environment days later."

**Leave the patch applied** for step 6.

## 6. AI-assisted triage, then human verification (3 min)

Run the triage skill on the failing run, with the patch as the "recent change".
In a Claude Code session in the repo:

```
/triage-gate-failure --diff demo/require-currency.patch --grep "GET /booking/{id}"
```

It first runs `npm run ai:bundle` and then reads only the redacted bundle. Approve
the read-only checks it asks to run (a `curl` GET, a single-test re-run).

If Claude Code isn't available, build just the bundle and use the worked example:

```bash
npm run ai:bundle -- --diff demo/require-currency.patch --grep "GET /booking/{id}"
```

**Expect:** the bundle script prints `Redacted failure bundle: ai/output/failure-bundle-<time>.json`.
With the skill, Claude then writes `ai/output/triage-<time>.md` with status UNVERIFIED
and a blank reviewer line.

**Open** the bundle. Point at `"Cookie": "[REDACTED]"` and at the dates still being intact.

> "This is exactly what leaves the machine: redacted, saved for audit. My first
> version of the redactor masked dates as phone numbers and destroyed the
> evidence. There's a unit test for that now."

**Open** `docs/ai-examples/failure-analysis.md` and scroll to **Likely root causes**, then **Human verification**.

> "It got the important call right: the contract is ahead of the provider, not
> an API bug, and it pointed to the commit. Every claim is checked with a
> command before anyone acts. Checking the claim that all 8 failures share one
> cause, I found one whose message didn't name the cause at all, so I made that
> unit test report its errors. AI drafts, an engineer decides."

**Fix and go green:**

```bash
patch -p1 -R < demo/require-currency.patch
npm run test:gate; echo "exit: $?"
```

**Expect:** `51 passed`, `exit: 0`.

> "The fix is a conversation with the provider team, not a weaker test."

**Optional (if time):** open `docs/ai-review-log.md`. Of 30 generated scenarios, 29
were already covered and 1 was a real gap. Accept GEN-15 live:

```ts
test('POST without bookingdates.checkout is rejected with 400', async ({ bookingClient, bookings }) => {
  const booking = BookingBuilder.aBooking().build();
  const response = await bookingClient.create({ ...booking, bookingdates: { checkin: booking.bookingdates.checkin } });
  await bookings.track(response);
  await expect(response).toHaveStatus(400);
});
```

Run it with `npx playwright test -g "checkout is rejected"`.

**Expect (verified 2026-11-08):** it fails with `Expected .../booking to return 400 but got 500`
and `Body: Internal Server Error`.

> "So the AI's one new proposal, once a person accepted it, found a real
> defect: the same class as RB-003. I'd add `knownIssue('RB-003', ...)`, log it
> in the register and record 'Accepted' in the review log, with my name on it."


## 7. Back to slides (1 min)

Return to slide 8 (KPIs) and continue.

---

## If something goes wrong

| Problem | Recovery |
| --- | --- |
| Public API down or slow | Run `npx playwright test tests/authz tests/integration tests/unit` (all local) and show `quality-gate-demo.md` for recorded outputs |
| Port 4010 in use | `lsof -ti:4010 \| xargs kill`, or set `DEALER_GATEWAY_PORT=4011` |
| Patch already applied or half-applied | `patch -p1 -R < demo/require-currency.patch`, then check `grep -c currency src/schemas/booking.schema.json` prints `0` |
| Unexpected failure live | Treat it as a demo of triage: open the report attachment and read the exchange |
