import { test, expect } from '@playwright/test';
import { BookingBuilder } from '../../src/builders/BookingBuilder';

test.describe('BookingBuilder', { tag: '@unit' }, () => {
  test('generates unique guests so parallel runs do not collide', () => {
    const a = BookingBuilder.aBooking().build();
    const b = BookingBuilder.aBooking().build();
    expect(a.lastname).not.toBe(b.lastname);
  });

  test('build returns an independent copy', () => {
    const builder = BookingBuilder.aBooking();
    const first = builder.build();
    first.bookingdates.checkin = 'mutated';
    expect(builder.build().bookingdates.checkin).not.toBe('mutated');
  });

  test('buildWithout removes only the requested field', () => {
    const payload = BookingBuilder.aBooking().buildWithout('depositpaid');
    expect(payload).not.toHaveProperty('depositpaid');
    expect(payload).toHaveProperty('totalprice');
  });
});
