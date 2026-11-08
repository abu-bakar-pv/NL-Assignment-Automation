import { test, expect } from '../../src/fixtures';
import { BookingBuilder } from '../../src/builders/BookingBuilder';
import { knownIssue } from '../../src/support/knownIssue';

/**
 * Where the provider's documented behaviour departs from HTTP semantics.
 *
 * These are not blocking for consumers today (the gate pins the documented
 * contract), but they are raised with the provider team and tracked here so
 * the conversation is backed by an executable record.
 */
test.describe('HTTP conformance', { tag: '@regression' }, () => {
  test('creating a booking returns 201 Created', { tag: '@known-issue' }, async ({ bookingClient, bookings }) => {
    knownIssue('RB-001', 'POST /booking returns 200 instead of 201');

    const response = await bookingClient.create(BookingBuilder.aBooking().build());
    await bookings.track(response);
    await expect(response).toHaveStatus(201);
  });

  test('deleting a booking returns 204 No Content', { tag: '@known-issue' }, async ({ bookingClient, bookings, adminAuth }) => {
    knownIssue('RB-002', 'DELETE /booking/{id} returns 201 instead of 204');

    const { bookingid } = await bookings.create();
    await expect(await bookingClient.remove(bookingid, adminAuth)).toHaveStatus(204);
  });

  test('deleting an already deleted booking returns 404', { tag: '@known-issue' }, async ({ bookingClient, bookings, adminAuth }) => {
    knownIssue('RB-011', 'Second DELETE returns 405 instead of 404');

    const { bookingid } = await bookings.create();
    await bookingClient.remove(bookingid, adminAuth);
    await expect(await bookingClient.remove(bookingid, adminAuth)).toHaveStatus(404);
  });

  const unsupported = [
    ['PATCH', '/booking'],
    ['DELETE', '/booking'],
    ['PUT', '/auth'],
  ] as const;

  for (const [method, path] of unsupported) {
    test(`${method} ${path} returns 405 Method Not Allowed`, { tag: '@known-issue' }, async ({ bookerApi }) => {
      knownIssue('RB-008', 'Unsupported methods return 404 instead of 405');

      await expect(await bookerApi.send(method, path, { data: {} })).toHaveStatus(405);
    });
  }

  test('unsupported methods never succeed', async ({ bookerApi }) => {
    for (const [method, path] of unsupported) {
      const response = await bookerApi.send(method, path, { data: {} });
      expect(response.ok(), `${method} ${path} must not succeed`).toBe(false);
    }
  });
});
