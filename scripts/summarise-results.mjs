// Turns reports/results.json into a Markdown summary for $GITHUB_STEP_SUMMARY.
import { existsSync, readFileSync } from 'node:fs';

const stage = process.argv[2] ?? 'tests';
const file = 'reports/results.json';

if (!existsSync(file)) {
  console.log(`### ${stage}: no results\nThe test run did not produce ${file}. Check the job log.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const tests = [];

(function walk(suites, path = []) {
  for (const suite of suites ?? []) {
    walk(suite.suites, suite.title ? [...path, suite.title] : path);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        tests.push({ title: [...path.slice(1), spec.title].join(' › '), file: spec.file, ...test });
      }
    }
  }
})(report.suites);

const { expected, unexpected, flaky, skipped, duration } = report.stats;
const knownIssues = tests.filter((t) => t.annotations.some((a) => a.type === 'known-issue'));
const trulyPassed = expected - knownIssues.filter((t) => t.status === 'expected').length;
const failures = tests.filter((t) => t.status === 'unexpected');
const flakyTests = tests.filter((t) => t.status === 'flaky');

const lines = [
  `### ${unexpected === 0 ? 'PASSED' : 'FAILED'}: ${stage}`,
  '',
  '| Passed | Failed | Flaky | Skipped | Known issues (expected to fail) | Duration |',
  '| ---: | ---: | ---: | ---: | ---: | ---: |',
  `| ${trulyPassed} | ${unexpected} | ${flaky} | ${skipped} | ${knownIssues.length} | ${(duration / 1000).toFixed(1)}s |`,
];

if (failures.length) {
  lines.push('', '#### Failures');
  for (const t of failures) {
    const error = t.results.at(-1)?.error?.message?.split('\n')[0] ?? '';
    lines.push(`- \`${t.file}\` ${t.title}: ${stripAnsi(error)}`);
  }
}

if (flakyTests.length) {
  lines.push('', '#### Flaky (passed on retry, needs triage)');
  for (const t of flakyTests) lines.push(`- \`${t.file}\` ${t.title}`);
}

if (knownIssues.length) {
  const ids = [...new Set(knownIssues.map((t) => t.annotations.find((a) => a.type === 'known-issue').description.split(':')[0]))];
  lines.push(
    '',
    `<details><summary>Tracked provider defects (${ids.length}). These tests fail on purpose and are counted separately; filter the HTML report with <code>@known-issue</code></summary>`,
    '',
    ids.sort().join(', '),
    '',
    '</details>',
  );
}

console.log(lines.join('\n'));

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
