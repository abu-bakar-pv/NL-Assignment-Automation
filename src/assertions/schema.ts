import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCHEMA_DIR = join(import.meta.dirname, '..', 'schemas');

export type SchemaName =
  | 'booking'
  | 'created-booking'
  | 'booking-list'
  | 'auth-token'
  | 'auth-failure'
  | 'dealer-lead';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')));
}

export function validatorFor(name: SchemaName): ValidateFunction {
  const validate = ajv.getSchema(name);
  if (!validate) throw new Error(`Unknown schema "${name}"`);
  return validate;
}

export function validate(name: SchemaName, payload: unknown): { valid: boolean; errors: string[] } {
  const fn = validatorFor(name);
  const valid = fn(payload) as boolean;
  return { valid, errors: valid ? [] : formatErrors(fn.errors) };
}

export function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const where = e.instancePath || '(root)';
    if (e.keyword === 'additionalProperties') {
      return `${where} has unexpected property "${(e.params as { additionalProperty: string }).additionalProperty}"`;
    }
    return `${where} ${e.message}`;
  });
}
