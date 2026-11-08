/**
 * Removes secrets and personal data from anything that is about to leave the
 * machine for an LLM. This runs unconditionally: a prompt is never built from
 * unredacted input, and the redacted bundle is saved so a reviewer can see
 * exactly what was shared.
 */

const SENSITIVE_KEYS = /^(authorization|cookie|set-cookie|token|access_token|refresh_token|password|client_secret|secret|api[-_]?key|x-api-key)$/i;

const PATTERNS: Array<[RegExp, string]> = [
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, '$1 [REDACTED]'],
  [/\btoken=[^;\s"]+/gi, 'token=[REDACTED]'],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, '[REDACTED_API_KEY]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]'],
  // IBAN before phone: an IBAN's digit run would otherwise be taken for a phone number.
  [/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, '[REDACTED_IBAN]'],
  // Phone numbers need a "+" prefix or grouped digits, so dates (2027-03-01),
  // IDs and timestamps survive: they are the evidence a triage needs.
  [/\+\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]'],
  [/\b\d{3}[\s.-]\d{3,4}[\s.-]\d{4}\b/g, '[REDACTED_PHONE]'],
];

export function redactText(text: string): string {
  return PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

export function redact<T>(value: T): T {
  if (typeof value === 'string') return redactText(value) as T;
  if (Array.isArray(value)) return value.map(redact) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(v)]),
    ) as T;
  }
  return value;
}
