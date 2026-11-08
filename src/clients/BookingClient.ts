import type { ApiClient } from '../http/ApiClient';
import type { Booking } from '../models/booking';

export type AuthMode =
  | { kind: 'token'; token: string }
  | { kind: 'basic'; username: string; password: string }
  | { kind: 'none' };

export class BookingClient {
  constructor(private readonly api: ApiClient) {}

  list(filters?: Partial<Pick<Booking, 'firstname' | 'lastname'>>) {
    return this.api.get('/booking', { params: filters });
  }

  get(id: number | string) {
    return this.api.get(`/booking/${id}`);
  }

  create(booking: unknown, headers?: Record<string, string>) {
    return this.api.post('/booking', { data: booking, headers });
  }

  update(id: number, booking: unknown, auth: AuthMode) {
    return this.api.put(`/booking/${id}`, { data: booking, headers: authHeaders(auth) });
  }

  partialUpdate(id: number, changes: unknown, auth: AuthMode) {
    return this.api.patch(`/booking/${id}`, { data: changes, headers: authHeaders(auth) });
  }

  remove(id: number, auth: AuthMode) {
    return this.api.delete(`/booking/${id}`, { headers: authHeaders(auth) });
  }
}

function authHeaders(auth: AuthMode): Record<string, string> {
  switch (auth.kind) {
    case 'token':
      return { Cookie: `token=${auth.token}` };
    case 'basic':
      return {
        Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`,
      };
    case 'none':
      return {};
  }
}
