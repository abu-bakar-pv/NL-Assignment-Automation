import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { knownIssue } from '../../src/support/knownIssue';

const valid = { username: env.booker.username, password: env.booker.password };

test.describe('Authentication', () => {
  test.describe('token issuance', { tag: '@critical' }, () => {
    test('valid credentials return a token', async ({ authClient }) => {
      const response = await authClient.createToken(valid);
      await expect(response).toHaveStatus(200);
      expect(await response.json()).toMatchSchema('auth-token');
    });

    const rejected = {
      'wrong password': { ...valid, password: 'not-the-password' },
      'unknown user': { username: 'nobody', password: valid.password },
      'empty credentials': {},
      'username only': { username: valid.username },
    };

    for (const [name, credentials] of Object.entries(rejected)) {
      test(`${name} does not return a token`, async ({ authClient }) => {
        const body = await (await authClient.createToken(credentials)).json();
        expect(body).toMatchSchema('auth-failure');
        expect(body).not.toHaveProperty('token');
      });
    }

    test('each login issues a distinct token', async ({ authClient }) => {
      const [first, second] = await Promise.all([authClient.tokenFor(valid), authClient.tokenFor(valid)]);
      expect(first).not.toBe(second);
    });
  });

  test.describe('protected operations', { tag: '@critical' }, () => {
    test('a valid token authorises an update', async ({ bookingClient, bookings, adminAuth }) => {
      const { bookingid } = await bookings.create();
      const response = await bookingClient.partialUpdate(bookingid, { firstname: 'Token' }, adminAuth);
      await expect(response).toHaveStatus(200);
    });

    test('basic auth is accepted as an alternative to a token', async ({ bookingClient, bookings }) => {
      const { bookingid } = await bookings.create();
      const response = await bookingClient.partialUpdate(
        bookingid,
        { firstname: 'Basic' },
        { kind: 'basic', ...valid },
      );
      await expect(response).toHaveStatus(200);
    });

    const unauthorised = {
      'no credentials': { kind: 'none' } as const,
      'a forged token': { kind: 'token', token: 'abc123forged' } as const,
      'wrong basic credentials': { kind: 'basic', username: 'admin', password: 'guess' } as const,
    };

    for (const [name, auth] of Object.entries(unauthorised)) {
      test(`update with ${name} is refused and nothing changes`, async ({ bookingClient, bookings }) => {
        const { bookingid, booking } = await bookings.create();

        const response = await bookingClient.partialUpdate(bookingid, { firstname: 'Intruder' }, auth);
        await expect(response).toHaveStatus(403);

        expect(await (await bookingClient.get(bookingid)).json()).toEqual(booking);
      });

      test(`delete with ${name} is refused and the booking survives`, async ({ bookingClient, bookings }) => {
        const { bookingid } = await bookings.create();

        await expect(await bookingClient.remove(bookingid, auth)).toHaveStatus(403);
        await expect(await bookingClient.get(bookingid)).toHaveStatus(200);
      });
    }

    test('a tampered token is refused', async ({ bookingClient, bookings, adminToken }) => {
      const { bookingid } = await bookings.create();
      const tampered = adminToken.slice(0, -1) + (adminToken.endsWith('a') ? 'b' : 'a');

      const response = await bookingClient.remove(bookingid, { kind: 'token', token: tampered });
      await expect(response).toHaveStatus(403);
    });
  });

  test.describe('HTTP semantics', { tag: '@regression' }, () => {
    test('rejected credentials return 401', async ({ authClient }) => {
      knownIssue('RB-006', 'POST /auth returns 200 with {"reason":"Bad credentials"} instead of 401');
      await expect(await authClient.createToken({ ...valid, password: 'wrong' })).toHaveStatus(401);
    });

    test('a missing token returns 401 rather than 403', async ({ bookingClient, bookings }) => {
      knownIssue('RB-007', 'Unauthenticated requests return 403 instead of 401');
      const { bookingid } = await bookings.create();
      await expect(await bookingClient.remove(bookingid, { kind: 'none' })).toHaveStatus(401);
    });
  });
});
