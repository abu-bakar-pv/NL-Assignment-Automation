# Interview preparation

Answers are written to be said out loud: short first, then detail if asked.
Where the answer points to something in this repo, the file is named so it can
be shown.

## Framework design and architecture

**1. Walk us through your framework architecture.**
Five thin layers. Specs state behaviour. Fixtures inject clients, tokens and
self-cleaning data. One resource client per API resource owns paths, verbs and
auth. A small `ApiClient` handles transport, evidence and secret masking. Under
that is Playwright's request context. Each layer has one reason to change, so an
endpoint change touches one client and an auth change touches one fixture.
(`docs/architecture.md`)

**2. Why Playwright for API testing rather than REST Assured, Postman or plain Jest/axios?**
Playwright's request context gives retries, parallelism, fixtures, tagging,
HTML/JSON/JUnit reports and attachments out of the box, in TypeScript. That's
the same language many platform teams use. If the company later adds UI
tests, they share the runner, the reports and CI. If the existing framework
is on something else, I wouldn't switch it for that reason alone. The patterns
transfer.

**3. Why fixtures instead of a base test class?**
Composition over inheritance. A base class grows into a god object that every
test inherits. Fixtures are opt-in per test, lazily created and torn down
automatically, including when a test fails. They also make dependencies visible
in the test signature.

**4. How does this scale as the number of APIs grows?**
Clients and schemas scale linearly and stay small. Past about 30 endpoints I'd
generate clients and schemas from OpenAPI rather than hand-write them (ADR 0002).
Tags keep the gate fast as the suite grows: the gate stays "P1 plus
contracts", and everything else runs after. Tests are independent and
data-isolated, so they parallelise across workers or shards.

**5. You were asked not to over-engineer. What did you deliberately leave out?**
No custom reporter, no generic "request builder" DSL, no config framework, no
database seeding layer, no page objects. The mock is about 300 lines of plain
Node, not WireMock. Each of those can be added when there's a real need. Until
then, it's code the owner would have to maintain.

**6. How do you manage test data?**
Builders produce valid data by default with unique names. Tests override only
what matters. The fixture deletes everything the test created, even on
failure. Tests never depend on pre-existing records. In real environments:
synthetic data only, and per-test tenants where the platform supports them.

**7. How do you handle environments and secrets?**
Typed config read from environment variables with safe defaults for the demo.
In CI, credentials come from repository secrets. The `ApiClient` masks
`Authorization` and `Cookie` in every report attachment, and the AI tooling
redacts again before anything leaves the machine.

## API and contract testing

**8. What's the difference between API testing and contract testing?**
API tests check that a service *behaves* correctly: status codes, business
rules, side effects. Contract tests check that two parties *agree on the
shape* of what passes between them. The provider can pass all its own API
tests and still break a consumer by renaming a field. Contract tests catch
that.

**9. How did you do contract testing here, and what would you do on the real platform?**
Here: consumer-side JSON Schemas, strict, validated against the live provider,
plus unit tests proving the schemas reject drift. On the real platform:
consumer-driven contracts (Pact or similar) with a broker. Consumers publish
expectations, providers verify them in their own pipeline before deploying,
and "can I deploy?" becomes a query. For events, the same idea applies with a
schema registry and compatibility rules.

**10. Why `additionalProperties: false`? Doesn't that make tests brittle?**
It makes them *strict*, which is deliberate. A new field might be harmless, or
it might be personal data leaking into a response, or a renamed field. I'd
rather the change be reviewed and the schema updated in the same PR. If a
particular endpoint is known to be extensible, I'd relax it there explicitly.

**11. What negative tests matter most?**
The ones where a wrong answer corrupts data silently, not the ones that return
a clean error. On Restful-Booker the worst finds were: decimal prices truncated
(10.75 → 10), a non-numeric price stored as `null`, and invalid dates stored as
`"0NaN-aN-aN"`. All three return 200. A test that only checks status codes would
miss them.

**12. How do you test unsupported methods and boundaries?**
Unsupported methods must never succeed, and ideally return 405 with an
`Allow` header. Boundaries: zero, negative, decimal and very large values,
empty strings, same-day and reversed date ranges, invalid calendar dates.
Where the spec is silent (is a same-day stay valid?), that's a question for
the product owner, not an assumption in a test.

**13. What do you do when the API under test has bugs you can't fix?**
Keep the correct assertion, tag the test `@known-issue` and call
`knownIssue(id)`. Day to day it's reported as skipped with the defect ID as
the reason, so it's visible but neither a pass nor a failure. The run summary
lists every open defect. A periodic run with known issues enabled executes them
as expected failures: when the provider fixes one, it passes unexpectedly and
fails the build, so we remove the marker. That's better than a silent skip
(which hides the defect) or asserting the wrong value (which locks it in).

## Authentication and authorisation

**14. How do you approach auth testing?**
A matrix per endpoint: owner, other tenant, read-only client, wrong role,
expired token, forged or tampered token, no token. For each refusal, assert
the status *and* that nothing changed. The highest-risk case on a multi-tenant
platform is broken object-level authorisation: dealer A reading dealer B's
leads.

**15. Restful-Booker doesn't support authorisation. How did you handle that?**
I didn't pretend. The authentication tests run against Restful-Booker.
Authorisation (scopes, tenant isolation, OEM vs dealer roles, expiry) runs
against a small virtualised gateway I built, which Playwright starts locally.
The docs say so explicitly.

**16. 401 vs 403: does it matter?**
Yes. 401 means "I don't know who you are" (missing, expired or invalid
credentials) and should carry a `WWW-Authenticate` challenge. 403 means "I know
who you are and you're not allowed". Clients rely on the difference: a 401
triggers re-authentication, a 403 shouldn't. Restful-Booker returns 403 for
missing auth, which I tracked as RB-007.

**17. How would you include security testing in CI?**
The auth matrix runs in the gate. Dependency and secret scanning run on every
PR. A DAST scan (e.g. OWASP ZAP API scan from the OpenAPI spec) runs nightly
against staging, with findings triaged like defects. Pen tests stay periodic
and human.

## Integration testing and dependencies

**18. How do you test integrations between DMS, CRM and OEM systems?**
Layered. Contract tests at every boundary, on every PR. Integration tests
with real neighbours where they're stable and virtualised ones where they
aren't, on merge to main. A few end-to-end journeys (lead from DMS to CRM)
nightly against sandbox tenants. Event tests for publish, shape, ordering,
idempotency and dead-lettering. (`docs/integration-test-strategy.md`)

**19. Some downstream systems are unavailable in test. What do you do?**
The gate never depends on them. Stubs are generated from contracts the
provider verifies, or recorded from real traffic and reviewed. A programmable
mock covers failure modes (timeouts, 503s, malformed payloads), like the DMS
scenarios here. Real systems are kept for nightly E2E. Mock drift is guarded
by provider verification and a nightly recording comparison.

**20. Service virtualisation vs mocking: what's the difference?**
Mostly scope and fidelity. A mock is usually in-process and specific to one
test. Service virtualisation is a stand-in *service* that many tests and
teams can use, with realistic behaviour, state and failure modes, often
generated from contracts or recordings. The gateway here is a small example
of the latter.

**21. How do you test event-driven integrations?**
Producer side: the right event, valid against the registered schema, with an
idempotency key. Consumer side: replay the same event twice and assert one
effect. Send a poison message and assert it lands in the DLQ without blocking
the stream. Send events out of order and assert they're handled or parked,
never lost. Use an embedded broker or a dedicated test topic, not a shared
one.

**22. How do you balance API, contract, integration and E2E tests?**
Push each check to the cheapest layer that can catch it. API and contract
tests gate every PR because they're fast, precise and independent of other
systems. Integration tests run on merge. E2E covers a handful of
business-critical journeys nightly. When an E2E test catches something, I ask
which lower layer should have caught it, and add the test there.

## CI/CD and quality gates

**23. Explain your quality gate.**
Two jobs. `gate`: typecheck, lint, unit, `@critical` and `@contract` tests,
51 tests in about 9 seconds of test time. It's a required status check, so red
blocks the merge. `regression` runs only after the gate passes and covers
everything else, including tracked provider defects. Both upload HTML/JUnit
reports and write a summary to the PR.

**24. How do you stop the gate becoming something people ignore or bypass?**
Keep it fast and precise, so a red gate always means "look now". Known
provider defects stay out of it. Flaky tests are reported, not hidden, and
quarantined within a week. Gates start report-only and become blocking once
their false-positive rate is known. I also track override count as a KPI.

**25. How do you handle flaky tests?**
One retry in CI, but a pass-on-retry is reported as flaky in the summary.
Each one gets a ticket within a day. Typical causes are shared data, timing
assumptions and environment cold starts. After a week it's quarantined with
an owner and a date. Never fixed with a sleep.

**26. Why do API and contract tests run before E2E tests?**
Speed, precision and independence. They run in seconds, name the exact field
or endpoint, and don't need every downstream system up. E2E tests are slower,
flakier and vaguer when they fail. Making them the gate trains people to
ignore the gate.

## Prioritisation

**27. How do you decide which endpoints to automate first?**
A weighted risk matrix with seven factors: business criticality, usage,
integration dependencies, security, defect history, failure impact and data
sensitivity. Scored with the owner, using data where it exists (gateway
traffic, incident tracker, data classification). P1 endpoints get contracts,
lifecycle, auth and the riskiest negatives first. (`docs/test-strategy.md`)

**28. What if business and engineering disagree on priority?**
The matrix makes the disagreement concrete: we argue about a score for a
factor, not about opinions. If the weights themselves are contested, the
engineering manager or product owner decides, and we re-score after the next
incident.

## AI in QA

**29. Where does AI actually help in QA?**
Drafting scenarios from API docs (useful for finding gaps and documentation
ambiguities), triaging failures from captured evidence, analysing
requirements for ambiguity, and suggesting edge-case test data. It doesn't
decide release readiness, approve its own output, or write assertions nobody
reviews.

**30. How do you evaluate AI-generated tests?**
Each proposal is accepted, modified, rejected or marked duplicate by a named
engineer, with a reason, in a review log. Checks: is the expected behaviour
grounded in the docs or assumed? Is it already covered? Is it worth the run
and maintenance cost? Over time I track acceptance rate, novelty and time
saved after review effort. In the worked example, 29 of 30 were already
covered and 1 was a real gap. When I accepted that one, it found a real 500 in
the provider.

**31. How do you stop sensitive data reaching AI tools?**
A redaction step that runs unconditionally before any prompt is built. It
masks auth headers, cookies, tokens, passwords, API keys, emails, phones and
IBANs, and it's unit-tested. The exact redacted input is saved for audit. Only
approved model endpoints with agreed retention terms are used. And never
production data, which shouldn't be in test environments in the first place.

**32. What went wrong with your AI tooling, and what did you learn?**
My first redactor masked ISO dates as phone numbers. That removed the
evidence the analysis needed. Separately, when I verified the analysis I
first wrote down that all 8 failure messages named the cause. Checking the log
showed only 7 did; the 8th was an uninformative unit-test message, which I then
fixed. Both were caught by checking, not by trusting, whether the claim came
from the model or from me. Lesson: over-redaction is a real failure mode, and
verification has to be a habit.

**33. How would you introduce AI to a sceptical, experienced QA engineer?**
As a trial on their real work, with their judgement as the measure. We use it
for a month on two or three changes, count time saved *after* review, and keep
only what they find useful. They own the review process and the decision. If
it doesn't pay, we drop it, and that's a fine outcome.

## Leadership, coaching and handover

**34. The company has an in-house framework. Why not replace it with yours?**
Because the owner has years of domain knowledge encoded in it, a rewrite stalls
delivery for months, and they'd end up maintaining something they didn't
design. This repo is a reference for patterns, introduced one at a time,
additively and reversibly, with the owner reviewing every change to the core.

**35. How would you work with the experienced engineer in the first six months?**
Month 1: I learn from them. Shadowing, pairing on their work, and a joint
assessment where most items are "keep". Then we pair two or three times a
week, and they increasingly drive. They present improvements to other teams,
not me. Disagreements go into a short ADR, and if their option is reasonable,
it wins. By month 6 they run everything and I only observe.

**36. How do you introduce new practices without destabilising delivery?**
One change in flight at a time. Additive or behind a flag. New gates
report-only for two weeks before blocking. Feature testing is never paused for
framework work. Improvements ride along with real changes.

**37. How do you communicate automation value to leadership?**
Monthly, on one page: four outcome metrics (defect leakage, release
confidence, MTTD, MTTR) with trends, one line on why each moved, and one
decision I need. Coverage and adoption appear only as explanations. ROI is
shown with its assumptions visible. And real catches: "this check stopped
this broken change on Tuesday".

**38. How do you establish a KPI baseline without historical data?**
Back-fill from what exists: the defect tracker (tag by where found), CI history
(duration, failures), deploy logs (rollbacks). It takes a few days with the
owner. Agree definitions with leadership before showing numbers. Freeze the
baseline and compare trends against it, not single points.

**39. What does a good handover look like?**
The owner has changed every framework layer alone, triaged red gates using
only the runbook, and onboarded someone else using the onboarding guide.
Every mock, secret and pipeline has a named owner. ADRs are current. Open
improvements are in the team backlog, not in my notes. If they still need me
in month 6, the handover failed.

**40. How do you standardise quality practices across teams without becoming a bottleneck?**
A paved road, not a gatekeeper. A versioned shared library and templates, lint
rules for conventions, and contracts as the integration point between teams.
Each team owns its own tests. A guild reviews patterns fortnightly. Teams can
diverge with a short ADR. The platform QA function owns the tools, not every
test.

## Curveballs

**41. What would you do differently with more time?**
Generate clients and schemas from an OpenAPI spec, add Pact with a broker,
publish KPI trends from the CI reports automatically, and run the AI
workflows against a real model endpoint for a measured trial.

**42. What's the weakest part of this demo?**
Restful-Booker is a shared public sandbox. Its data is visible to anyone, and
it has no authorisation, so the authorisation story runs on a mock I wrote.
I've been explicit about that. On the real platform, those tests would run
against the real gateway with sandbox tenants.

**43. How do you know your tests are good, not just green?**
They fail when they should. The schema unit tests prove each contract rejects
drift. The demo patch proves the gate goes red on a real contract break. The
known-issue tests prove they'd flip if the provider changed. Mutation-style
thinking: if I break the behaviour, does a test fail?

**44. Why are your AI workflows Claude Code skills rather than scripts that call a model API?**
Three reasons. No API keys to issue, rotate or leak. The skill can read the
repo, so scenario proposals come with existing coverage mapped, and triage
hypotheses come with real command output as evidence. And every command a
skill runs needs the engineer's approval, which keeps the human in the loop by
construction. What I deliberately kept as plain code is redaction: the
guarantee about what leaves the machine can't depend on a model following
instructions. The bundle script also works with any other approved AI tool,
so the team isn't locked in.
