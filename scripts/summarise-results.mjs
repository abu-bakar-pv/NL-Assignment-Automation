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
const knownSkipped = knownIssues.filter((t) => t.status === 'skipped').length;
const trulyPassed = expected - knownIssues.filter((t) => t.status === 'expected' && t.expectedStatus === 'failed').length;
// A known-issue test that fails "unexpectedly" was expected to fail but passed: the provider may have fixed it.
const possiblyFixed = knownIssues.filter((t) => t.status === 'unexpected');
const failures = tests.filter((t) => t.status === 'unexpected' && !possiblyFixed.includes(t));
const flakyTests = tests.filter((t) => t.status === 'flaky');

const lines = [
  `### ${unexpected === 0 ? 'PASSED' : 'FAILED'}: ${stage}`,
  '',
  '| Passed | Failed | Flaky | Skipped | Known issues | Duration |',
  '| ---: | ---: | ---: | ---: | ---: | ---: |',
  `| ${trulyPassed} | ${failures.length} | ${flaky} | ${skipped - knownSkipped} | ${knownIssues.length} | ${(duration / 1000).toFixed(1)}s |`,
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

if (possiblyFixed.length) {
  lines.push('', '#### Known issues that now pass (provider may have fixed them)');
  for (const t of possiblyFixed) lines.push(`- \`${t.file}\` ${t.title}: confirm, then remove knownIssue() and update the defect register`);
}

if (knownIssues.length) {
  const byDefect = new Map();
  for (const t of knownIssues) {
    const description = t.annotations.find((a) => a.type === 'known-issue').description;
    const id = description.split(':')[0];
    const entry = byDefect.get(id) ?? { summary: description.slice(id.length + 2), tests: 0, states: new Set() };
    entry.tests += 1;
    entry.states.add(t.status === 'skipped' ? 'skipped' : t.status === 'unexpected' ? 'NOW PASSING' : 'still failing');
    byDefect.set(id, entry);
  }
  lines.push(
    '',
    '#### Known issues (provider defects, see docs/api-behaviour-findings.md)',
    '',
    'Filter the HTML report with `@known-issue`. Re-check them with the RUN_KNOWN_ISSUES option.',
    '',
    '| Defect | Summary | Tests | Result |',
    '| --- | --- | ---: | --- |',
    ...[...byDefect.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, e]) => `| ${id} | ${e.summary} | ${e.tests} | ${[...e.states].join(', ')} |`),
  );
}

console.log(lines.join('\n'));

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
