# Onboarding: your first test in an afternoon

## 1. Run it (15 min)

```bash
git clone <repo> && cd api-quality-platform
nvm use && npm ci
npm test
npm run report
```

In the report, open any test and expand the attachments: each request and response is there.

## 2. Read three files (30 min)

1. `tests/booking/crud.spec.ts`: what a test looks like
2. `src/fixtures/index.ts`: where `bookingClient`, `bookings` and `adminAuth` come from
3. `src/builders/BookingBuilder.ts`: how test data is made

Then skim [architecture.md](architecture.md) for the big picture.

## 3. Write a test (60 min)

Exercise: the AI review log found a gap. Bookings without `bookingdates.checkout` are not tested. Add a test to `tests/booking/negative.spec.ts` under "missing required fields":

- Build a booking, remove `checkout` from `bookingdates`
- POST it, `track` the response for cleanup
- Expect 400

Run `npx playwright test -g "checkout"`. If the provider gets it wrong, check [api-behaviour-findings.md](api-behaviour-findings.md) and decide with the test owner whether it's a new known issue.

## 4. Open a PR (15 min)

```bash
npm run typecheck && npm run lint && npm run test:gate
```

Push and watch the gate. Ask the test owner for review.

## Conventions

| Topic | Convention |
| --- | --- |
| Tags | `@critical` (P1 behaviour), `@contract` (shape), `@regression` (everything else), `@unit` (no network) |
| Test names | Describe behaviour: "a dealer cannot read another dealer's leads", not "test_leads_403" |
| Data | Always via builder + `bookings` fixture; never rely on existing records |
| Assertions | `toHaveStatus` for status (prints the body on failure), `toMatchSchema` for shape |
| Negative auth | Assert the refusal **and** that nothing changed |
| Waiting | No sleeps; poll a condition with a deadline |
| Provider bugs | Tag the test `@known-issue`, call `knownIssue('ID', 'summary')`, add an entry to the defect register |

## Who to ask

| Topic | Owner |
| --- | --- |
| Framework and conventions | API automation owner |
| Pipeline and gate | API automation owner |
| A specific API's behaviour | Owning service team |
