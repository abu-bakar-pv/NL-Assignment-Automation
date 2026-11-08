import { test, expect } from '@playwright/test';
import { validate } from '../../src/assertions/schema';
import { BookingBuilder } from '../../src/builders/BookingBuilder';

/**
 * A schema that accepts everything protects nothing. These tests prove the
 * booking contract rejects the kinds of drift we want the gate to catch.
 */
test.describe('booking schema', { tag: '@unit' }, () => {
  const valid = BookingBuilder.aBooking().build();

  test('accepts a valid booking', () => {
    expect(validate('booking', valid)).toEqual({ valid: true, errors: [] });
  });

  test('rejects a missing required property', () => {
    const { errors } = validate('booking', BookingBuilder.aBooking().buildWithout('lastname'));
    expect(errors).toContain("(root) must have required property 'lastname'");
  });

  test('rejects a wrong data type', () => {
    const { errors } = validate('booking', { ...valid, totalprice: '250' });
    expect(errors).toContain('/totalprice must be number');
  });

  test('rejects null where the contract does not allow it', () => {
    const { errors } = validate('booking', { ...valid, totalprice: null });
    expect(errors).toContain('/totalprice must be number');
  });

  test('accepts null where the contract allows it', () => {
    expect(validate('booking', { ...valid, additionalneeds: null })).toEqual({ valid: true, errors: [] });
  });

  test('rejects an unexpected property', () => {
    const { errors } = validate('booking', { ...valid, loyaltyTier: 'gold' });
    expect(errors).toContain('(root) has unexpected property "loyaltyTier"');
  });

  test('rejects a renamed nested property', () => {
    const { checkin, checkout } = valid.bookingdates;
    const { valid: ok, errors } = validate('booking', { ...valid, bookingdates: { checkIn: checkin, checkout } });

    expect(ok).toBe(false);
    expect(errors).toEqual(
      expect.arrayContaining([
        "/bookingdates must have required property 'checkin'",
        '/bookingdates has unexpected property "checkIn"',
      ]),
    );
  });

  test('rejects an invalid date format', () => {
    const { errors } = validate('booking', { ...valid, bookingdates: { checkin: '0NaN-aN-aN', checkout: '2027-01-01' } });
    expect(errors).toContain('/bookingdates/checkin must match format "date"');
  });
});
