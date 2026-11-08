import { test, expect } from '../../src/fixtures';
import { BookingBuilder } from '../../src/builders/BookingBuilder';
import { knownIssue } from '../../src/support/knownIssue';

/**
 * Consumer-side contract checks against the live provider.
 *
 * The schemas in src/schemas describe what *our consumers rely on*, not
 * everything the provider happens to return. They are strict
 * (additionalProperties: false) on purpose: a new or renamed field fails the
 * gate so the change is reviewed instead of silently absorbed.
 */
test.describe('Booking API contract', { tag: '@contract' }, () => {
  test('GET /booking returns a list of booking references', async ({ bookingClient }) => {
    const response = await bookingClient.list();
    await expect(response).toHaveStatus(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toMatchSchema('booking-list');
  });

  test('POST /booking response matches the created-booking contract', async ({ bookingClient, bookings }) => {
    const response = await bookingClient.create(BookingBuilder.aBooking().build());
    await bookings.track(response);
    expect(await response.json()).toMatchSchema('created-booking');
  });

  test('GET /booking/{id} matches the booking contract', async ({ bookingClient, bookings }) => {
    const { bookingid } = await bookings.create();
    expect(await (await bookingClient.get(bookingid)).json()).toMatchSchema('booking');
  });

  test('PATCH returns the full resource, not just the changed fields', async ({ bookingClient, bookings, adminAuth }) => {
    const { bookingid } = await bookings.create();
    const response = await bookingClient.partialUpdate(bookingid, { lastname: 'Patched' }, adminAuth);
    expect(await response.json()).toMatchSchema('booking');
  });

  test.describe('optional and nullable fields', () => {
    test('additionalneeds may be omitted', async ({ bookingClient, bookings }) => {
      const { bookingid } = await bookings.create(BookingBuilder.aBooking().withAdditionalNeeds(undefined));
      const body = await (await bookingClient.get(bookingid)).json();

      expect(body).toMatchSchema('booking');
      expect(body).not.toHaveProperty('additionalneeds');
    });

    test('additionalneeds may be null', async ({ bookingClient, bookings }) => {
      const { bookingid } = await bookings.create(BookingBuilder.aBooking().withAdditionalNeeds(null));
      const body = await (await bookingClient.get(bookingid)).json();

      expect(body).toMatchSchema('booking');
      expect(body.additionalneeds).toBeNull();
    });
  });
});

test.describe('Booking API contract: known provider drift', { tag: '@regression' }, () => {
  test('totalprice is never returned as null', { tag: '@known-issue' }, async ({ bookingClient, bookings }) => {
    knownIssue('RB-004', 'A non-numeric totalprice is stored and served as null, breaking the contract');

    const response = await bookingClient.create(BookingBuilder.aBooking().buildWith('totalprice', 'abc'));
    await bookings.track(response);
    expect((await response.json()).booking).toMatchSchema('booking');
  });
});
