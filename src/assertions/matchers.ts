import { expect as base, type APIResponse } from '@playwright/test';
import { validate, type SchemaName } from './schema';

export const expect = base.extend({
  toMatchSchema(received: unknown, schema: SchemaName) {
    const result = validate(schema, received);
    return {
      pass: result.valid,
      name: 'toMatchSchema',
      message: () =>
        result.valid
          ? `Expected payload not to match schema "${schema}"`
          : `Payload does not match schema "${schema}":\n  - ${result.errors.join('\n  - ')}\n\nPayload:\n${JSON.stringify(received, null, 2)}`,
    };
  },

  async toHaveStatus(response: APIResponse, expected: number) {
    const actual = response.status();
    const pass = actual === expected;
    const body = pass ? '' : await response.text().catch(() => '<unreadable>');
    return {
      pass,
      name: 'toHaveStatus',
      message: () =>
        pass
          ? `Expected status not to be ${expected}`
          : `Expected ${response.url()} to return ${expected} but got ${actual}\nBody: ${body.slice(0, 500)}`,
    };
  },
});

// Response bodies from APIResponse.json() are typed `any`, and Playwright only
// exposes custom matchers on `any` through the global Matchers interface.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchSchema(schema: SchemaName): R;
    }
  }
}
