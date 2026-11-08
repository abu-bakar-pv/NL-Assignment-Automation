import type { ApiClient } from '../http/ApiClient';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

export class DealerClient {
  constructor(private readonly api: ApiClient) {}

  requestToken(credentials: Partial<ClientCredentials>, ttlSeconds?: number) {
    return this.api.post('/oauth/token', {
      data: {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
      headers: ttlSeconds === undefined ? undefined : { 'X-Mock-Token-TTL': String(ttlSeconds) },
    });
  }

  async tokenFor(credentials: ClientCredentials, ttlSeconds?: number): Promise<string> {
    const response = await this.requestToken(credentials, ttlSeconds);
    if (!response.ok()) {
      throw new Error(`Token request for ${credentials.clientId} failed with ${response.status()}`);
    }
    return ((await response.json()) as { access_token: string }).access_token;
  }

  listLeads(dealerId: string, token?: string) {
    return this.api.get(`/dealers/${dealerId}/leads`, { headers: bearer(token) });
  }

  createLead(dealerId: string, lead: unknown, token?: string) {
    return this.api.post(`/dealers/${dealerId}/leads`, { data: lead, headers: bearer(token) });
  }

  leadStats(token?: string) {
    return this.api.get('/oem/lead-stats', { headers: bearer(token) });
  }

  serviceHistory(dealerId: string, vin: string, token?: string, scenario?: string) {
    return this.api.get(`/dealers/${dealerId}/vehicles/${vin}/service-history`, {
      headers: { ...bearer(token), ...(scenario ? { 'X-Mock-Scenario': scenario } : {}) },
    });
  }
}

function bearer(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
