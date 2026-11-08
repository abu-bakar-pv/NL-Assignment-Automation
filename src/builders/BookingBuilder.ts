import type { Booking } from '../models/booking';

let sequence = 0;

/**
 * Test Data Builder for bookings.
 *
 * Defaults are valid and deterministic apart from a unique surname, so
 * records created by parallel workers on a shared environment never collide
 * and are easy to trace back to the run that created them.
 */
export class BookingBuilder {
  private booking: Booking;

  constructor() {
    sequence += 1;
    this.booking = {
      firstname: 'Qa',
      lastname: `Auto-${process.pid}-${Date.now().toString(36)}-${sequence}`,
      totalprice: 250,
      depositpaid: true,
      bookingdates: { checkin: '2027-03-01', checkout: '2027-03-05' },
      additionalneeds: 'Breakfast',
    };
  }

  static aBooking(): BookingBuilder {
    return new BookingBuilder();
  }

  withGuest(firstname: string, lastname: string): this {
    this.booking.firstname = firstname;
    this.booking.lastname = lastname;
    return this;
  }

  withPrice(totalprice: number): this {
    this.booking.totalprice = totalprice;
    return this;
  }

  withDeposit(depositpaid: boolean): this {
    this.booking.depositpaid = depositpaid;
    return this;
  }

  withDates(checkin: string, checkout: string): this {
    this.booking.bookingdates = { checkin, checkout };
    return this;
  }

  withAdditionalNeeds(additionalneeds: string | null | undefined): this {
    if (additionalneeds === undefined) {
      delete this.booking.additionalneeds;
    } else {
      this.booking.additionalneeds = additionalneeds;
    }
    return this;
  }

  build(): Booking {
    return structuredClone(this.booking);
  }

  /** Returns the payload with a field removed, for missing-field scenarios. */
  buildWithout<K extends keyof Booking>(field: K): Omit<Booking, K> {
    const copy = this.build();
    delete copy[field];
    return copy;
  }

  /** Returns the payload with a field overridden by an arbitrary value, for type-violation scenarios. */
  buildWith(field: keyof Booking, value: unknown): Record<string, unknown> {
    return { ...this.build(), [field]: value };
  }
}
