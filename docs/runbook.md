# Runbook

## The gate is red on my PR

1. Open the failed run → **Summary**. The results table lists each failure with its first error line.
2. Download the `gate-report` artifact → open `html/index.html`. Each failed test has its request/response exchanges attached (auth masked).
3. Decide which case it is:

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Typecheck or lint failed | Code issue in the PR | Fix and push |
| `does not match schema` | Contract changed, either by your PR (schema edit) or by the provider | If your PR changed the schema, does the provider actually send it? If the provider changed, raise it with the provider team; don't loosen the schema to make it pass |
| Status code mismatch on a P1 endpoint | Behaviour change or regression | Reproduce locally with `npx playwright test <file> -g "<title>"` |
| `Test setup failed: POST /booking returned 5xx` | Provider unavailable | Check `curl -s -o /dev/null -w "%{http_code}" https://restful-booker.herokuapp.com/ping` (expect 201). If it's down, re-run once it's back. Don't merge on a red gate |
| Authz test failed | Mock gateway changed or failed to start | Run `npm run mock:start` locally and check the log |

4. Optional: in Claude Code, run `/triage-gate-failure` for root-cause hypotheses. It only reads the redacted bundle (`npm run ai:bundle`). Verify each claim before acting.

**Never** bypass the gate by removing the tag, adding `test.skip`, or loosening a schema without a review from the test owner.

## A test passed only on retry (flaky)

1. It is listed under "Flaky" in the run summary.
2. Open a ticket within one working day with the test name and run link. The test owner triages it.
3. Common causes: shared data (use the builder and fixture), timing assumptions (poll a condition, don't sleep), provider cold start (first request of the run).
4. Still flaky after a week: quarantine it. Move it to `@regression` with a `// quarantined: TICKET-123, owner, review date` comment.

## A known-issue test shows an error but "passed"

Expected. It's tagged `@known-issue`: it asserts the correct behaviour, the provider still has the defect, so the failure is expected and counted as a pass. Check the defect ID in the test's annotations against `docs/api-behaviour-findings.md`. Nothing to do.

## A known issue started passing

The job fails with an "expected to fail, but passed" error on a `knownIssue()` test. Good news: the provider fixed it.

1. Confirm the fix with curl (see `docs/api-behaviour-findings.md` for the original probe).
2. Remove the `knownIssue()` line from the test.
3. Mark the entry as resolved in the defect register, with the date.

## The dealer gateway mock needs a new behaviour

1. Add the route or scenario in `mock/dealer-gateway/server.ts`. Keep data synthetic in `data.ts`.
2. Add a method to `src/clients/DealerClient.ts`.
3. Write the test first, watch it fail, then implement the mock behaviour.
4. If the behaviour comes from a real system, link the source (contract, ticket, recording) in the PR.

## Rotating credentials

Real environments read credentials from GitHub Actions secrets (`BOOKER_USERNAME`, `BOOKER_PASSWORD`). Rotate them in the secret store and re-run the pipeline. No code change is needed. Never paste credentials into AI tools, tickets or PR comments.
