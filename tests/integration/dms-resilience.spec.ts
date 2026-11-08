import { test, expect } from '../../src/fixtures';

/**
 * The real DMS is not available in shared test environments, so its failure
 * modes are reproduced through the gateway's virtualised upstream. What we
 * verify is the gateway's behaviour towards its consumers: clear status
 * codes, a retry hint where a retry makes sense, and no hanging requests.
 */

const dealer = 'DLR-NORTH';
const vin = 'WVWZZZ1KZAW000001';

test.describe('DMS integration failure handling', { tag: '@regression' }, () => {
  let token: string;

  test.beforeEach(async ({ dealerClient }) => {
    token = await dealerClient.tokenFor({ clientId: 'dealer-north-crm', clientSecret: 'north-test-secret' });
  });

  test('service history is returned when the DMS is healthy', async ({ dealerClient }) => {
    const response = await dealerClient.serviceHistory(dealer, vin, token);
    await expect(response).toHaveStatus(200);
    expect((await response.json()).visits).toHaveLength(2);
  });

  test('an unavailable DMS yields 503 with a Retry-After hint', async ({ dealerClient }) => {
    const response = await dealerClient.serviceHistory(dealer, vin, token, 'dms-unavailable');
    await expect(response).toHaveStatus(503);
    expect(response.headers()['retry-after']).toBe('30');
    expect(response.headers()['content-type']).toContain('application/problem+json');
  });

  test('a slow DMS yields 504 within the gateway time budget', async ({ dealerClient }) => {
    const started = Date.now();
    const response = await dealerClient.serviceHistory(dealer, vin, token, 'dms-timeout');

    await expect(response).toHaveStatus(504);
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  test('a malformed DMS payload yields 502 instead of leaking upstream data', async ({ dealerClient }) => {
    const response = await dealerClient.serviceHistory(dealer, vin, token, 'dms-malformed');
    await expect(response).toHaveStatus(502);
    expect(Object.keys(await response.json()).sort()).toEqual(['detail', 'title']);
  });

  test('an unknown vehicle yields 404', async ({ dealerClient }) => {
    await expect(await dealerClient.serviceHistory(dealer, 'WVWZZZ1KZAW999999', token)).toHaveStatus(404);
  });
});
