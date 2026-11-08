import { test, expect } from '../../src/fixtures';
import { BookingBuilder } from '../../src/builders/BookingBuilder';
import { knownIssue } from '../../src/support/knownIssue';
import type { Booking } from '../../src/models/booking';

test.describe('Booking input validation', { tag: '@regression' }, () => {
  test.describe('resource identity', () => {
    for (const id of ['999999999', '0', '-1', 'abc']) {
      test(`GET /booking/${id} returns 404`, async ({ bookingClient }) => {
        await expect(await bookingClient.get(id)).toHaveStatus(404);
      });
    }

    test('updating a booking that does not exist does not create it', async ({ bookingClient, adminAuth }) => {
      const response = await bookingClient.update(999999999, BookingBuilder.aBooking().build(), adminAuth);
      expect(response.ok()).toBe(false);
    });
  });

  test.describe('missing required fields', () => {
    const required: Array<keyof Booking> = ['firstname', 'lastname', 'totalprice', 'depositpaid', 'bookingdates'];

    for (const field of required) {
      test(`POST without ${field} is rejected with 400`, async ({ bookingClient, bookings }) => {
        knownIssue('RB-003', 'Missing required fields cause 500 instead of 400');

        const response = await bookingClient.create(BookingBuilder.aBooking().buildWithout(field));
        await bookings.track(response);
        await expect(response).toHaveStatus(400);
      });
    }

    test('PUT with a partial body is rejected with 400', async ({ bookingClient, bookings, adminAuth }) => {
      const { bookingid } = await bookings.create();
      const response = await bookingClient.update(bookingid, { firstname: 'OnlyThis' }, adminAuth);
      await expect(response).toHaveStatus(400);
    });
  });

  test.describe('invalid data types', () => {
    const cases: Array<[keyof Booking, unknown]> = [
      ['totalprice', 'two hundred'],
      ['depositpaid', 'yes'],
      ['bookingdates', '2027-03-01'],
    ];

    for (const [field, value] of cases) {
      test(`${field} as ${JSON.stringify(value)} is rejected with 400`, async ({ bookingClient, bookings }) => {
        knownIssue('RB-004', 'Wrong types are coerced or crash the service instead of returning 400');

        const response = await bookingClient.create(BookingBuilder.aBooking().buildWith(field, value));
        await bookings.track(response);
        await expect(response).toHaveStatus(400);
      });
    }
  });

  test.describe('invalid payloads', () => {
    test('malformed JSON is rejected with 400', async ({ bookingClient }) => {
      const response = await bookingClient.create('{"firstname": "Broken",', {
        'Content-Type': 'application/json',
      });
      await expect(response).toHaveStatus(400);
    });

    test('a non-JSON content type is rejected with 415', async ({ bookingClient }) => {
      knownIssue('RB-012', 'text/plain body returns 500 instead of 415 Unsupported Media Type');

      const response = await bookingClient.create('firstname=Plain', { 'Content-Type': 'text/plain' });
      await expect(response).toHaveStatus(415);
    });

    test('unknown properties are not persisted', async ({ bookingClient, bookings }) => {
      const response = await bookingClient.create({ ...BookingBuilder.aBooking().build(), isAdmin: true });
      await bookings.track(response);

      await expect(response).toHaveStatus(200);
      expect((await response.json()).booking).not.toHaveProperty('isAdmin');
    });
  });

  test.describe('boundary values', () => {
    test('a zero price is accepted', async ({ bookings }) => {
      const { booking } = await bookings.create(BookingBuilder.aBooking().withPrice(0));
      expect(booking.totalprice).toBe(0);
    });

    test('same-day check-in and check-out is accepted', async ({ bookings }) => {
      const { booking } = await bookings.create(BookingBuilder.aBooking().withDates('2027-05-01', '2027-05-01'));
      expect(booking.bookingdates).toEqual({ checkin: '2027-05-01', checkout: '2027-05-01' });
    });

    test('a negative price is rejected', async ({ bookingClient, bookings }) => {
      knownIssue('RB-005', 'Business rules (price >= 0, non-empty names, date order) are not validated');

      const response = await bookingClient.create(BookingBuilder.aBooking().withPrice(-1).build());
      await bookings.track(response);
      await expect(response).toHaveStatus(400);
    });

    test('check-out before check-in is rejected', async ({ bookingClient, bookings }) => {
      knownIssue('RB-005', 'Business rules (price >= 0, non-empty names, date order) are not validated');

      const response = await bookingClient.create(
        BookingBuilder.aBooking().withDates('2027-05-10', '2027-05-01').build(),
      );
      await bookings.track(response);
      await expect(response).toHaveStatus(400);
    });

    test('an empty first name is rejected', async ({ bookingClient, bookings }) => {
      knownIssue('RB-005', 'Business rules (price >= 0, non-empty names, date order) are not validated');

      const response = await bookingClient.create(BookingBuilder.aBooking().withGuest('', 'Smith').build());
      await bookings.track(response);
      await expect(response).toHaveStatus(400);
    });

    test('a decimal price is stored without loss of precision', async ({ bookings }) => {
      knownIssue('RB-009', 'Decimal prices are silently truncated (10.75 -> 10)');

      const { booking } = await bookings.create(BookingBuilder.aBooking().withPrice(10.75));
      expect(booking.totalprice).toBe(10.75);
    });

    test('an invalid calendar date is rejected', async ({ bookingClient, bookings }) => {
      knownIssue('RB-010', 'Invalid dates are accepted and stored as "0NaN-aN-aN"');

      const response = await bookingClient.create(
        BookingBuilder.aBooking().withDates('2027-02-30', '2027-03-02').build(),
      );
      await bookings.track(response);
      await expect(response).toHaveStatus(400);
    });
  });
});
