# KPIs and ROI

The aim is to measure whether quality engineering lets teams release with more
confidence and less effort, not to count tests. No targets below are results:
they are set only after a baseline exists.

## The KPIs

| KPI | Definition | Formula | Source | Direction |
| --- | --- | --- | --- | --- |
| API coverage | Share of endpoints (method + path) with at least one automated test | tested endpoints ÷ endpoints in the OpenAPI specs | OpenAPI inventory vs test tags/clients | ↑ |
| Critical API coverage | Same, restricted to P1 endpoints from the risk matrix | tested P1 ÷ all P1 | Risk matrix | ↑ to 100% |
| Contract coverage | Share of consumer–provider pairs with a verified contract | verified pairs ÷ known integration pairs | Contract broker / schema registry | ↑ |
| Automation adoption | Share of teams (or repos) running the shared gate on every PR | teams with required gate ÷ teams | CI configuration | ↑ |
| Release confidence | Share of releases shipped without rollback or hotfix within 7 days | clean releases ÷ releases | Deploy log + incident tracker | ↑ |
| Production defect leakage | Defects found in production as a share of all defects | prod defects ÷ (prod + pre-prod defects), per release or month | Defect tracker, tagged by stage found | ↓ |
| Test execution duration | Time from PR push to gate result (p50 and p90) | CI timestamps | GitHub Actions API | ↓, or flat while coverage grows |
| Flaky rate | Share of runs where a test passed only on retry | flaky ÷ total test executions | Playwright JSON reports | ↓ |
| MTTD | Mean time from a defect being introduced to being detected | detected_at − introduced_at (commit time) | Defect tracker + git | ↓ |
| MTTR | Mean time from detection to fix deployed | resolved_at − detected_at | Defect/incident tracker | ↓ |

Two supporting measures keep the main ones honest:

- **Escaped-defect root cause:** for each production defect, which test layer
  should have caught it. This turns leakage into a backlog.
- **Gate override count:** how often a red gate is bypassed. If this rises, the
  gate has lost trust and the other numbers can't be trusted either.

## Establishing a baseline (month 1)

1. **Inventory.** Endpoints from the OpenAPI specs, integration pairs from the
   gateway configuration and event subscriptions, and teams and repos from CI.
2. **Back-fill history.** Pull the last 3–6 months of defects and incidents.
   Tag where each was found (dev, CI, staging, production) and which layer
   should have caught it. Most of this exists in the tracker already. It needs
   consistent labels, which is a one-off effort with the QA owner.
3. **Instrument CI.** Keep Playwright JSON reports as artifacts (already in
   place here) and collect run duration, failures and flakes into a small
   dataset each night.
4. **Agree definitions with engineering leadership before showing numbers.**
   "What counts as a production defect?" is a conversation to have once, early.
5. **Record the baseline and freeze it.** Every later comparison is against this snapshot.

## Measuring improvement

- Compare trends, not single points. Use rolling 4-week windows for leakage,
  MTTD and MTTR, because releases are lumpy.
- Attribute carefully. When leakage drops, check the escaped-defect root causes
  to see whether the drop came from the new tests or from fewer releases.
- Look at pairs. Coverage up with duration flat is good. Coverage up with
  duration doubling is a problem being created.

## ROI

ROI is estimated from the time saved and incidents avoided, using the
organisation's own numbers:

```
Time saved per month   = (manual regression hours replaced) + (triage hours saved per failure × failures)
Incident cost avoided  = (baseline leakage − current leakage) × releases × average cost per production defect
Investment             = engineering hours on automation + CI minutes + tooling
ROI                    = (time saved × loaded hourly rate + incident cost avoided − investment) ÷ investment
```

Every input comes from the baseline or from finance. The calculation is shown
with its assumptions, so leadership can challenge the inputs rather than the
conclusion.

## Communicating to engineering leadership

| Audience | Cadence | Format | Content |
| --- | --- | --- | --- |
| Engineering leadership | Monthly | One page | 4 headline KPIs (leakage, release confidence, MTTR, gate duration) with trend, one sentence on why each moved, one decision needed |
| Team leads | Fortnightly | Dashboard + 15 min review | Coverage gaps by P1 endpoint, flaky tests by owner, escaped defects by layer |
| Teams | Every PR | CI summary | Pass/fail, known issues, flaky tests (already in `$GITHUB_STEP_SUMMARY`) |
| Quarterly review | Quarterly | Short deck | Baseline vs now, ROI estimate with assumptions, next quarter's focus |

Principles:

- Lead with outcomes (leakage, confidence, MTTR), then show activity metrics
  (coverage) as the explanation.
- Every chart has a "so what" line and, where relevant, an ask.
- Report bad news early, such as a flaky rate going up. Credibility matters
  more than a good month.
