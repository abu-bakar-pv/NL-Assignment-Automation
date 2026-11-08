import { test as base, type APIResponse } from '@playwright/test';
import { env } from '../config/env';
import { ApiClient } from '../http/ApiClient';
import { AuthClient } from '../clients/AuthClient';
import { BookingClient, type AuthMode } from '../clients/BookingClient';
import { DealerClient } from '../clients/DealerClient';
import { BookingBuilder } from '../builders/BookingBuilder';
import type { Booking, CreatedBooking } from '../models/booking';

export { expect } from '../assertions/matchers';

interface BookingFactory {
  /** Creates a booking and registers it for deletion when the test ends. */
  create(builder?: BookingBuilder): Promise<CreatedBooking>;
  /** Registers a booking created outside the factory (e.g. by a negative test the API wrongly accepted). */
  track(response: APIResponse): Promise<void>;
}

interface TestFixtures {
  bookerApi: ApiClient;
  authClient: AuthClient;
  bookingClient: BookingClient;
  dealerClient: DealerClient;
  adminAuth: AuthMode;
  bookings: BookingFactory;
}

interface WorkerFixtures {
  adminToken: string;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // One token per worker keeps load on the shared public API low.
  adminToken: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      const token = await new AuthClient(new ApiClient(request, env.booker.baseUrl)).tokenFor({
        username: env.booker.username,
        password: env.booker.password,
      });
      await use(token);
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  adminAuth: async ({ adminToken }, use) => {
    await use({ kind: 'token', token: adminToken });
  },

  bookerApi: async ({ request }, use, testInfo) => {
    await use(new ApiClient(request, env.booker.baseUrl, testInfo));
  },

  authClient: async ({ bookerApi }, use) => {
    await use(new AuthClient(bookerApi));
  },

  bookingClient: async ({ bookerApi }, use) => {
    await use(new BookingClient(bookerApi));
  },

  dealerClient: async ({ request }, use, testInfo) => {
    await use(new DealerClient(new ApiClient(request, env.dealerGateway.baseUrl, testInfo)));
  },

  bookings: async ({ bookingClient, adminAuth }, use) => {
    const created: number[] = [];

    await use({
      async create(builder = BookingBuilder.aBooking()) {
        const payload: Booking = builder.build();
        const response = await bookingClient.create(payload);
        if (!response.ok()) {
          throw new Error(`Test setup failed: POST /booking returned ${response.status()}`);
        }
        const body = (await response.json()) as CreatedBooking;
        created.push(body.bookingid);
        return body;
      },
      async track(response) {
        if (!response.ok()) return;
        const body = (await response.json().catch(() => ({}))) as Partial<CreatedBooking>;
        if (body.bookingid) created.push(body.bookingid);
      },
    });

    // Cleanup is best effort: a test may already have deleted its own data.
    await Promise.allSettled(created.map((id) => bookingClient.remove(id, adminAuth)));
  },
});
