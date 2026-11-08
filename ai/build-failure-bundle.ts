/**
 * Builds a redacted evidence bundle for a failing test run.
 *
 *   npm run test:gate                                   # produces reports/results.json
 *   npm run ai:bundle                                   # first unexpected failure
 *   npm run ai:bundle -- --grep "GET /booking/{id}"     # pick a failure by title
 *   npm run ai:bundle -- --all --with-diff              # all failures + recent change from git
 *   npm run ai:bundle -- --diff path/to/change.patch    # recent change from a file
 *
 * The bundle holds the assertion, the request/response exchanges, the schema
 * involved and optionally the recent change, all passed through redact().
 * It is the only failure data the /triage-gate-failure skill (or any other AI
 * tool) is allowed to read, and it is saved so a reviewer can see exactly
 * what was shared.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { redact } from './redact';

interface Attachment {
  name: string;
  contentType: string;
  body?: string;
  path?: string;
}

interface TestResult {
  status: string;
  error?: { message?: string };
  errors?: Array<{ message?: string }>;
  attachments: Attachment[];
}

interface Failure {
  title: string;
  file: string;
  line: number;
  error: string;
  exchanges: unknown[];
}

const RELEVANT_HEADERS = ['content-type', 'retry-after', 'www-authenticate', 'allow', 'location'];

const { values } = parseArgs({
  options: {
    report: { type: 'string', default: 'reports/results.json' },
    all: { type: 'boolean', default: false },
    grep: { type: 'string' },
    'with-diff': { type: 'boolean', default: false },
    diff: { type: 'string' },
  },
});

if (!existsSync(values.report!)) {
  console.error(`No report at ${values.report}. Run the tests first.`);
  process.exit(1);
}

// Failures with captured HTTP exchanges carry the most evidence, so they go first.
const failures = collectFailures(JSON.parse(readFileSync(values.report!, 'utf8')))
  .filter((f) => !values.grep || f.title.includes(values.grep))
  .sort((a, b) => b.exchanges.length - a.exchanges.length);
if (failures.length === 0) {
  console.log('No unexpected failures in the report. Nothing to bundle.');
  process.exit(0);
}

const selected = values.all ? failures : failures.slice(0, 1);
const bundle = redact({
  failures: selected,
  totalFailuresInRun: failures.length,
  schemas: referencedSchemas(selected),
  recentChange: values.diff ? readFileSync(values.diff, 'utf8').slice(0, 6000) : values['with-diff'] ? recentDiff() : undefined,
});

mkdirSync('ai/output', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bundleFile = `ai/output/failure-bundle-${stamp}.json`;
writeFileSync(bundleFile, JSON.stringify(bundle, null, 2));
console.log(`Redacted failure bundle: ${bundleFile} (${selected.length} of ${failures.length} failures)`);

// ---------------------------------------------------------------------------

function collectFailures(report: { suites: unknown[] }): Failure[] {
  const out: Failure[] = [];

  const walk = (suites: unknown[], path: string[]) => {
    for (const suite of suites as Array<Record<string, unknown>>) {
      const title = suite.title as string;
      const next = title && !title.endsWith('.ts') ? [...path, title] : path;
      walk((suite.suites as unknown[]) ?? [], next);

      for (const spec of (suite.specs as Array<Record<string, unknown>>) ?? []) {
        for (const test of spec.tests as Array<{ status: string; results: TestResult[] }>) {
          if (test.status !== 'unexpected') continue;
          const result = test.results.at(-1)!;
          out.push({
            title: [...next, spec.title as string].join(' > '),
            file: spec.file as string,
            line: spec.line as number,
            error: stripAnsi(result.error?.message ?? result.errors?.[0]?.message ?? 'unknown error'),
            exchanges: result.attachments
              .filter((a) => a.contentType === 'application/json' && a.body)
              .map((a) => trimExchange(JSON.parse(Buffer.from(a.body!, 'base64').toString()))),
          });
        }
      }
    }
  };

  walk(report.suites, []);
  return out;
}

/** Drops hosting/telemetry headers that add tokens but no diagnostic value. */
function trimExchange(exchange: { response?: { headers?: Record<string, string> } }) {
  const headers = exchange.response?.headers;
  if (headers) {
    exchange.response!.headers = Object.fromEntries(
      Object.entries(headers).filter(([key]) => RELEVANT_HEADERS.includes(key.toLowerCase())),
    );
  }
  return exchange;
}

function referencedSchemas(failures: Failure[]): Record<string, unknown> {
  const names = new Set(failures.flatMap((f) => [...f.error.matchAll(/schema "([\w-]+)"/g)].map((m) => m[1]!)));
  // created-booking references booking, so include it when either appears.
  if (names.has('created-booking')) names.add('booking');

  return Object.fromEntries(
    [...names].map((name) => [name, JSON.parse(readFileSync(`src/schemas/${name}.schema.json`, 'utf8'))]),
  );
}

function recentDiff(): string {
  try {
    const log = execFileSync('git', ['log', '-1', '--format=%h %s'], { encoding: 'utf8' }).trim();
    const diff = execFileSync('git', ['diff', 'HEAD~1', '--', 'src', 'tests'], { encoding: 'utf8' });
    return `${log}\n\n${diff.slice(0, 6000)}`;
  } catch {
    return 'unavailable';
  }
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
