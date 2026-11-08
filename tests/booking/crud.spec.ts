import { test, expect } from '../../src/fixtures';
import { BookingBuilder } from '../../src/builders/BookingBuilder';
import type { Booking, BookingRef, CreatedBooking } from '../../src/models/booking';

/**
 * Status codes asserted here are the ones the provider documents
 * (https://restful-booker.herokuapp.com/apidoc). Where the documented
 * behaviour departs from HTTP conventions, that is tracked separately in
 * http-conformance.spec.ts rather than mixed into the critical path.
 */
test.describe('Booking lifecycle', { tag: '@critical' }, () => {
  test('a booking can be created, read, updated and deleted', async ({ bookingClient, adminAuth }) => {
    const original = BookingBuilder.aBooking().build();
    let bookingId = 0;

    await test.step('create', async () => {
      const response = await bookingClient.create(original);
      await expect(response).toHaveStatus(200);

      const body = (await response.json()) as CreatedBooking;
      expect(body).toMatchSchema('created-booking');
      expect(body.booking).toEqual(original);
      bookingId = body.bookingid;
    });

    await test.step('read', async () => {
      const response = await bookingClient.get(bookingId);
      await expect(response).toHaveStatus(200);
      expect(await response.json()).toEqual(original);
    });

    const updated: Booking = BookingBuilder.aBooking()
      .withGuest('Updated', original.lastname)
      .withPrice(480)
      .withDeposit(false)
      .withDates('2027-04-10', '2027-04-14')
      .withAdditionalNeeds('Late checkout')
      .build();

    await test.step('replace with PUT', async () => {
      const response = await bookingClient.update(bookingId, updated, adminAuth);
      await expect(response).toHaveStatus(200);
      expect(await response.json()).toEqual(updated);
    });

    await test.step('partially update with PATCH', async () => {
      const response = await bookingClient.partialUpdate(bookingId, { totalprice: 500 }, adminAuth);
      await expect(response).toHaveStatus(200);
      expect(await response.json()).toEqual({ ...updated, totalprice: 500 });
    });

    await test.step('changes are persisted', async () => {
      const response = await bookingClient.get(bookingId);
      expect(await response.json()).toEqual({ ...updated, totalprice: 500 });
    });

    await test.step('delete', async () => {
      const response = await bookingClient.remove(bookingId, adminAuth);
      await expect(response).toHaveStatus(201);
    });

    await test.step('deleted booking is no longer retrievable', async () => {
      await expect(await bookingClient.get(bookingId)).toHaveStatus(404);
    });
  });

  test('a new booking is discoverable by guest name', async ({ bookingClient, bookings }) => {
    const { bookingid, booking } = await bookings.create();

    const response = await bookingClient.list({ firstname: booking.firstname, lastname: booking.lastname });
    await expect(response).toHaveStatus(200);

    const ids = ((await response.json()) as BookingRef[]).map((b) => b.bookingid);
    expect(ids).toContain(bookingid);
  });
});
