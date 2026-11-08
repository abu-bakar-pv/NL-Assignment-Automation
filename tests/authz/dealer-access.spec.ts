import { test, expect } from '../../src/fixtures';
import type { ClientCredentials } from '../../src/clients/DealerClient';

/**
 * Restful-Booker has a single admin role, so it cannot demonstrate
 * authorisation. These tests run against the virtualised dealer gateway
 * (mock/dealer-gateway), which models the access rules of a multi-tenant
 * integration platform: OAuth2 client credentials, scopes and dealer isolation.
 */

const northCrm: ClientCredentials = { clientId: 'dealer-north-crm', clientSecret: 'north-test-secret' };
const southDms: ClientCredentials = { clientId: 'dealer-south-dms', clientSecret: 'south-test-secret' };
const oemAnalytics: ClientCredentials = { clientId: 'oem-analytics', clientSecret: 'oem-test-secret' };

const newLead = { vehicle: { vin: 'WVWZZZ1KZAW000099', model: 'Compact EV' }, customerRef: 'CUST-test' };

test.describe('Dealer gateway access control', { tag: '@critical' }, () => {
  test.describe('authentication', () => {
    test('client credentials grant returns a bearer token with scopes', async ({ dealerClient }) => {
      const response = await dealerClient.requestToken(northCrm);
      await expect(response).toHaveStatus(200);
      expect(await response.json()).toMatchObject({
        token_type: 'Bearer',
        expires_in: expect.any(Number),
        scope: 'leads:read leads:write',
      });
    });

    test('a wrong client secret is rejected with 401', async ({ dealerClient }) => {
      const response = await dealerClient.requestToken({ ...northCrm, clientSecret: 'wrong' });
      await expect(response).toHaveStatus(401);
      expect(await response.json()).not.toHaveProperty('access_token');
    });

    test('a request without a token is rejected with 401 and a challenge', async ({ dealerClient }) => {
      const response = await dealerClient.listLeads('DLR-NORTH');
      await expect(response).toHaveStatus(401);
      expect(response.headers()['www-authenticate']).toContain('Bearer');
    });

    test('an expired token is rejected with 401', async ({ dealerClient }) => {
      const expired = await dealerClient.tokenFor(northCrm, -1);
      const response = await dealerClient.listLeads('DLR-NORTH', expired);
      await expect(response).toHaveStatus(401);
      expect(response.headers()['www-authenticate']).toContain('expired');
    });

    test('a token with modified claims is rejected with 401', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(southDms);
      const [payload, signature] = token.split('.');
      const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
      const forged = Buffer.from(JSON.stringify({ ...claims, tenant: 'DLR-NORTH' })).toString('base64url');

      await expect(await dealerClient.listLeads('DLR-NORTH', `${forged}.${signature}`)).toHaveStatus(401);
    });
  });

  test.describe('authorisation', () => {
    test('a dealer can read its own leads and only its own', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(northCrm);
      const response = await dealerClient.listLeads('DLR-NORTH', token);
      await expect(response).toHaveStatus(200);

      const leads = (await response.json()) as Array<{ dealerId: string }>;
      expect(leads.length).toBeGreaterThan(0);
      for (const lead of leads) {
        expect(lead).toMatchSchema('dealer-lead');
        expect(lead.dealerId).toBe('DLR-NORTH');
      }
    });

    test("a dealer cannot read another dealer's leads", async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(northCrm);
      await expect(await dealerClient.listLeads('DLR-SOUTH', token)).toHaveStatus(403);
    });

    test('a read-only client cannot create leads', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(southDms);
      const response = await dealerClient.createLead('DLR-SOUTH', newLead, token);
      await expect(response).toHaveStatus(403);
      expect(await response.json()).toMatchObject({ title: 'insufficient_scope' });
    });

    test('a client with write scope can create a lead for its own dealer', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(northCrm);
      const response = await dealerClient.createLead('DLR-NORTH', newLead, token);
      await expect(response).toHaveStatus(201);
      expect(await response.json()).toMatchSchema('dealer-lead');
    });

    test('write scope does not extend to other dealers', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(northCrm);
      await expect(await dealerClient.createLead('DLR-SOUTH', newLead, token)).toHaveStatus(403);
    });

    test('the OEM sees aggregate statistics but no dealer-level records', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(oemAnalytics);

      await expect(await dealerClient.leadStats(token)).toHaveStatus(200);
      await expect(await dealerClient.listLeads('DLR-NORTH', token)).toHaveStatus(403);
    });

    test('a dealer cannot read OEM statistics', async ({ dealerClient }) => {
      const token = await dealerClient.tokenFor(northCrm);
      await expect(await dealerClient.leadStats(token)).toHaveStatus(403);
    });
  });
});
