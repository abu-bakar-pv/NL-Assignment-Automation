# Requirement traceability

Maps each requirement in the case study brief to where it is addressed.
"Verified" means it was executed, not just written.

## Brief sections

| # | Section | Documents |
| --- | --- | --- |
| 1 | Scenario overview | [integration-test-strategy.md](integration-test-strategy.md) |
| 2 | Lifecycle walkthrough | [test-strategy.md](test-strategy.md), [architecture.md](architecture.md) |
| 3 | AI integration | [ai-in-qa.md](ai-in-qa.md), [ai-review-log.md](ai-review-log.md) |
| 4 | Results and metrics | [kpi-framework.md](kpi-framework.md) |
| 5 | Communication and leadership | [framework-assessment-and-roadmap.md](framework-assessment-and-roadmap.md) |

## Practical demonstration (primary focus)

| Requirement | Where | Verified |
| --- | --- | --- |
| How endpoints to automate first are chosen | [test-strategy.md § prioritisation](test-strategy.md#risk-based-endpoint-prioritisation) | n/a (analysis) |
| Happy-path validation | `tests/booking/crud.spec.ts` | Yes, live API |
| Negative-path testing | `tests/booking/negative.spec.ts`, `http-conformance.spec.ts` | Yes; 12 provider defects found and tracked |
| Authentication testing | `tests/auth/authentication.spec.ts` | Yes, live API |
| Authorisation testing | `tests/authz/dealer-access.spec.ts` (virtualised gateway, as the public API has no roles) | Yes, local mock |
| Schema and contract validation | `tests/contract/`, `tests/unit/schema.spec.ts`, `src/schemas/` | Yes |
| CI pipeline integration | `.github/workflows/api-quality-gate.yml` | Runs in GitHub Actions on pull requests, pushes to `main`, daily and on demand |
| Quality gate blocking a build | `demo/require-currency.patch`, [quality-gate-demo.md](quality-gate-demo.md) | Locally: apply patch → exit 1; revert → exit 0 |
| Own code and framework decisions | `src/`, [docs/adr](adr) | |

## Lifecycle and strategy

| Requirement | Where |
| --- | --- |
| Planning and test design → continuous improvement | [test-strategy.md § lifecycle](test-strategy.md#lifecycle) |
| Balance of API, contract, integration and E2E | [test-strategy.md § balancing the layers](test-strategy.md#balancing-the-layers) |
| Auth validation strategy | [test-strategy.md § auth](test-strategy.md#authentication-and-authorisation-strategy), [integration-test-strategy.md](integration-test-strategy.md#authentication-and-authorisation-between-parties) |
| Unavailable dependencies: mocks, virtualisation, contracts | `mock/dealer-gateway`, `tests/integration/dms-resilience.spec.ts`, [integration-test-strategy.md](integration-test-strategy.md#service-virtualization-and-unavailable-dependencies) |
| Monitoring and reporting | HTML/JSON/JUnit reports, `scripts/summarise-results.mjs`, request/response attachments |

## AI in QA

| Requirement | Where | Verified |
| --- | --- | --- |
| How and where AI enhances testing | [ai-in-qa.md](ai-in-qa.md) | |
| Concrete example 1: test generation + evaluation | `.claude/skills/api-test-scenarios`, [generated-scenarios.md](ai-examples/generated-scenarios.md), [ai-review-log.md](ai-review-log.md) | Example output real; skill written, not yet run from a fresh session |
| Concrete example 2: failure analysis + evaluation | `.claude/skills/triage-gate-failure`, `ai/build-failure-bundle.ts`, [failure-analysis.md](ai-examples/failure-analysis.md) | Bundle generated from a real failing run; claims verified with commands |
| No secrets or sensitive data sent to AI | `ai/redact.ts`, `tests/unit/redact.spec.ts` | Yes, unit-tested |
| AI never approves its own output | Status labels, review log with human decision columns | |

## KPIs

| Requirement | Where |
| --- | --- |
| API coverage, contract coverage, adoption, release confidence, leakage, duration, MTTD, MTTR | [kpi-framework.md](kpi-framework.md) |
| Baseline, improvement, communication to leadership | same |
| No invented results | Only formulas, sources and method; no numbers claimed |

## Coaching, communication and handover

| Requirement | Where |
| --- | --- |
| Working with the owner in the first six months | [roadmap § how I'd work with the owner](framework-assessment-and-roadmap.md#how-id-work-with-the-owner) |
| Coaching on framework evolution and AI techniques | Roadmap months 2, 3, 5 |
| New practices without destabilising delivery | Roadmap § extending without disruption |
| Communicating value and decisions | ADRs, monthly one-pager, [kpi-framework.md](kpi-framework.md#communicating-to-engineering-leadership) |
| Documentation structure, onboarding, framework docs, runbooks, knowledge sharing | [onboarding.md](onboarding.md), [runbook.md](runbook.md), [architecture.md](architecture.md), [adr/](adr), roadmap § knowledge transfer |
| Handover | Roadmap § handover checklist |

## Bonus topics

| Topic | Where |
| --- | --- |
| Scaling across teams; standardisation without bottlenecks | [integration-test-strategy.md § scaling](integration-test-strategy.md#scaling-across-teams) |
| Multi-product, multi-team adoption | same, plus roadmap month 5 |
| Scalability as APIs grow | ADR 0002 (generated clients threshold), contract broker |
| GDPR and test-data privacy | [integration-test-strategy.md § GDPR](integration-test-strategy.md#gdpr-and-test-data-privacy) |
| API security and auth validation | `tests/auth`, `tests/authz`, [integration-test-strategy.md](integration-test-strategy.md#authentication-and-authorisation-between-parties) |

## Known limitations (stated, not hidden)

- Restful-Booker is a public, shared demo API. It has no authorisation model, and its data is visible to anyone.
- The authorisation and DMS-failure tests run against a local mock, not a real platform.
- The worked AI examples were produced on 2026-11-08 by running the same instructions in Claude (Opus 5.5) on the redacted inputs, before the workflows were packaged as skills. The skills themselves have not been run from a fresh Claude Code session yet.
- GitHub Pages must be enabled for the repository (Settings → Pages → Source: GitHub Actions) before the report can be published.
