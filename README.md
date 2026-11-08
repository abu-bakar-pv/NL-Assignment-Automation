# API Quality Platform

A reference implementation of API quality engineering for an integration
platform. It includes Playwright API tests in TypeScript, consumer contract
checks, a virtualised downstream gateway, a two-stage CI quality gate, and
AI-assisted test design and failure triage with human review built in.

It is a working demonstration, not a framework to adopt wholesale. The patterns
are meant to be lifted one at a time into an existing in-house framework
(see [docs/framework-assessment-and-roadmap.md](docs/framework-assessment-and-roadmap.md)).


**Latest test report:** https://abu-bakar-pv.github.io/NL-Assignment-Automation/ (published from `main` on every push and daily; see [docs/quality-gate-demo.md](docs/quality-gate-demo.md#published-html-report-github-pages))

## Quick start

```bash
nvm use            # Node 22
npm ci
npm test           # full suite: unit, API, contract, authz, integration
npm run report     # open the HTML report
```

No browsers are needed. The suite runs against:

| Target | What it is | Why |
| --- | --- | --- |
| `restful-booker.herokuapp.com` | Public sample REST API | Real network, real defects, real auth |
| `mock/dealer-gateway` | Local virtualised gateway, started automatically by Playwright | Authorisation (scopes, tenants) and downstream failure modes that the public API can't show |

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Everything |
| `npm run test:gate` | What blocks a merge: `@unit`, `@critical`, `@contract` |
| `npm run test:regression` | Broader coverage, including tracked provider defects |
| `npm run typecheck` / `npm run lint` | Static checks (also part of the gate) |
| `npm run report` | Open the last HTML report (CI also publishes a merged report to GitHub Pages from `main`) |
| `npm run mock:start` | Run the dealer gateway on its own (port 4010) |
| `npm run ai:bundle` | Build a redacted evidence bundle from the last failing run |

In Claude Code, two project skills build on these: `/api-test-scenarios` proposes
scenarios from an API description, and `/triage-gate-failure` drafts a root-cause
triage from the redacted bundle. Both only propose. See [docs/ai-in-qa.md](docs/ai-in-qa.md).

## Layout

```
src/
  config/      typed environment configuration
  http/        ApiClient: thin wrapper over Playwright's request context; attaches every exchange to the report with auth masked
  clients/     one client per API resource (AuthClient, BookingClient, DealerClient)
  builders/    BookingBuilder: valid, unique test data by default
  schemas/     JSON Schemas describing what consumers rely on
  assertions/  toMatchSchema and toHaveStatus matchers
  fixtures/    Playwright fixtures: clients, tokens, self-cleaning test data
  support/     knownIssue(): track provider defects without hiding them
mock/dealer-gateway/   virtualised DMS/CRM/OEM gateway (node:http, no dependencies)
tests/
  booking/     lifecycle (@critical), negative and boundary, HTTP conformance
  auth/        authentication: tokens, basic auth, forged/missing credentials
  authz/       authorisation against the gateway: scopes, tenant isolation, expiry
  contract/    consumer contract checks against the live provider
  integration/ DMS failure handling through the virtualised upstream
  unit/        schemas, builder, redaction
ai/            redaction and failure-bundle script (deterministic, unit-tested)
.claude/skills/ Claude Code skills: api-test-scenarios, triage-gate-failure
docs/          strategy, architecture, runbooks, roadmap
demo/          change used to demonstrate the quality gate blocking a build
```

## How a test reads

```ts
test('update with a forged token is refused and nothing changes', async ({ bookingClient, bookings }) => {
  const { bookingid, booking } = await bookings.create();

  const response = await bookingClient.partialUpdate(bookingid, { firstname: 'Intruder' }, { kind: 'token', token: 'forged' });
  await expect(response).toHaveStatus(403);

  expect(await (await bookingClient.get(bookingid)).json()).toEqual(booking);
});
```

Fixtures supply the clients and clean up the data. The builder supplies valid
input. The test only states the behaviour.

## Design decisions

The short version is below. Each decision has an ADR in [docs/adr](docs/adr).

- **Layers, not a framework.** Specs → fixtures → resource clients → `ApiClient` → Playwright. Each layer is small and can be adopted on its own.
- **Data is owned by the test.** Every test creates what it needs and the `bookings` fixture deletes it. Nothing depends on pre-existing records in a shared environment.
- **Contracts describe consumers, strictly.** Schemas use `additionalProperties: false`, so an added, renamed or retyped field is a reviewed change, not a silent one.
- **Tags drive the pipeline.** `@critical` and `@contract` gate the merge; `@regression` runs after.
- **Defects are tracked, not hidden.** `knownIssue('RB-003', ...)` keeps the correct expectation; the test is tagged `@known-issue` and reported as skipped with the defect ID. Running with `RUN_KNOWN_ISSUES=true` executes them as expected failures, so a provider fix shows up as an unexpected pass, and the build says so.
- **Authorisation is tested where it exists.** Restful-Booker has one admin role, so tenant and scope rules are tested against the virtualised gateway. This is stated explicitly rather than implied.
- **AI proposes, people decide.** Inputs are redacted before any model call, the redacted bundle is saved, and outputs are marked PROPOSED/UNVERIFIED until reviewed in [docs/ai-review-log.md](docs/ai-review-log.md).

## Adding a test for a new endpoint

1. Add or extend a resource client in `src/clients/`.
2. Add a schema in `src/schemas/` and its name to `SchemaName` in `src/assertions/schema.ts`.
3. Write the spec in the matching `tests/` folder and tag it (`@critical`, `@contract` or `@regression`).
4. Run `npm run test:gate` locally before opening a PR.

More detail is in [docs/onboarding.md](docs/onboarding.md).

## Documentation

| Topic | Document |
| --- | --- |
| Requirement traceability | [docs/00-requirements-traceability.md](docs/00-requirements-traceability.md) |
| Architecture and diagrams | [docs/architecture.md](docs/architecture.md) |
| Test strategy and endpoint prioritisation | [docs/test-strategy.md](docs/test-strategy.md) |
| Integration platform strategy (DMS, CRM, OEM) | [docs/integration-test-strategy.md](docs/integration-test-strategy.md) |
| Quality gate demo | [docs/quality-gate-demo.md](docs/quality-gate-demo.md) |
| Provider defect register | [docs/api-behaviour-findings.md](docs/api-behaviour-findings.md) |
| AI in QA: workflow and review log | [docs/ai-in-qa.md](docs/ai-in-qa.md), [docs/ai-review-log.md](docs/ai-review-log.md) |
| KPIs and ROI | [docs/kpi-framework.md](docs/kpi-framework.md) |
| Existing framework and six-month roadmap | [docs/framework-assessment-and-roadmap.md](docs/framework-assessment-and-roadmap.md) |
| Runbook | [docs/runbook.md](docs/runbook.md) |
| Onboarding | [docs/onboarding.md](docs/onboarding.md) |
