import { test, expect } from '@playwright/test';
import { redact, redactText } from '../../ai/redact';

test.describe('redact', { tag: '@unit' }, () => {
  test('masks sensitive keys at any depth', () => {
    const input = {
      request: {
        headers: { Authorization: 'Bearer abc.def', Cookie: 'token=123', Accept: 'application/json' },
        body: { username: 'admin', password: 'password123' },
      },
      response: { token: 'f00ba4' },
    };

    expect(redact(input)).toEqual({
      request: {
        headers: { Authorization: '[REDACTED]', Cookie: '[REDACTED]', Accept: 'application/json' },
        body: { username: 'admin', password: '[REDACTED]' },
      },
      response: { token: '[REDACTED]' },
    });
  });

  test('masks credentials embedded in free text', () => {
    const log = 'curl -H "Authorization: Bearer eyJhbGciOi.payload.sig" -b "token=8f2a1c" /booking/1';
    const out = redactText(log);

    expect(out).not.toContain('eyJhbGciOi');
    expect(out).not.toContain('8f2a1c');
    expect(out).toContain('Bearer [REDACTED]');
  });

  test('masks personal data', () => {
    const out = redactText('Guest jane.doe@example.com, tel +44 20 7946 0958, IBAN DE89370400440532013000');

    expect(out).toBe('Guest [REDACTED_EMAIL], tel [REDACTED_PHONE], IBAN [REDACTED_IBAN]');
  });

  test('masks phone numbers written without a country code', () => {
    expect(redactText('call 020 7946 0958 or 555-123-4567')).toBe('call [REDACTED_PHONE] or [REDACTED_PHONE]');
  });

  test('leaves ordinary diagnostic data intact', () => {
    const diagnostic = {
      status: 500,
      path: '/booking/42',
      error: 'Expected 400 but got 500',
      bookingdates: { checkin: '2027-03-01', checkout: '2027-03-05' },
      createdAt: '2026-10-01T09:15:00.000Z',
      ts: '1794164839',
    };
    expect(redact(diagnostic)).toEqual(diagnostic);
  });
});
