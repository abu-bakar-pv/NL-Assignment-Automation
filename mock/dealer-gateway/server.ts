/**
 * Virtualised dealer integration gateway.
 *
 * Stands in for downstream systems (DMS, CRM, OEM) that are not reliably
 * available in shared test environments. It implements just enough behaviour
 * to exercise the contracts we care about: OAuth2 client-credentials tokens,
 * scope checks, tenant isolation and downstream failure modes.
 *
 * All data is synthetic. No real customer data is ever loaded here.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { clients, leads, serviceHistory, type Lead } from './data';

const PORT = Number(process.env.DEALER_GATEWAY_PORT ?? 4010);
const SIGNING_KEY = process.env.DEALER_GATEWAY_SIGNING_KEY ?? randomUUID();
const DEFAULT_TTL_SECONDS = 300;

interface TokenClaims {
  sub: string;
  tenant: string;
  scope: string[];
  exp: number;
}

type Handler = (ctx: Context) => void | Promise<void>;

interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  body: unknown;
  claims?: TokenClaims;
}

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [];

function route(method: string, path: string, handler: Handler) {
  const pattern = new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`);
  routes.push({ method, pattern, handler });
}

// ---------------------------------------------------------------- tokens

function sign(claims: TokenClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', SIGNING_KEY).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verify(token: string): TokenClaims | 'invalid' | 'expired' {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return 'invalid';

  const expected = createHmac('sha256', SIGNING_KEY).update(payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return 'invalid';

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenClaims;
  return claims.exp * 1000 < Date.now() ? 'expired' : claims;
}

function authenticate(requiredScope: string, next: Handler): Handler {
  return (ctx) => {
    const header = ctx.req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return problem(ctx.res, 401, 'unauthorized', 'Bearer token required', {
        'WWW-Authenticate': 'Bearer realm="dealer-gateway"',
      });
    }

    const result = verify(token);
    if (result === 'invalid') {
      return problem(ctx.res, 401, 'invalid_token', 'Token signature is invalid', {
        'WWW-Authenticate': 'Bearer error="invalid_token"',
      });
    }
    if (result === 'expired') {
      return problem(ctx.res, 401, 'invalid_token', 'Token has expired', {
        'WWW-Authenticate': 'Bearer error="invalid_token", error_description="expired"',
      });
    }
    if (!result.scope.includes(requiredScope)) {
      return problem(ctx.res, 403, 'insufficient_scope', `Scope "${requiredScope}" is required`);
    }

    ctx.claims = result;
    return next(ctx);
  };
}

function ownTenantOnly(next: Handler): Handler {
  return (ctx) => {
    if (ctx.claims?.tenant !== ctx.params.dealerId) {
      return problem(ctx.res, 403, 'forbidden', 'Access to another dealer is not permitted');
    }
    return next(ctx);
  };
}

// ---------------------------------------------------------------- routes

route('GET', '/health', ({ res }) => json(res, 200, { status: 'UP' }));

route('POST', '/oauth/token', ({ req, res, body }) => {
  const { grant_type, client_id, client_secret } = (body ?? {}) as Record<string, string>;
  if (grant_type !== 'client_credentials') {
    return problem(res, 400, 'unsupported_grant_type', 'Only client_credentials is supported');
  }

  const client = clients.find((c) => c.id === client_id && c.secret === client_secret);
  if (!client) return problem(res, 401, 'invalid_client', 'Client authentication failed');

  const ttl = Number(req.headers['x-mock-token-ttl'] ?? DEFAULT_TTL_SECONDS);
  const claims: TokenClaims = {
    sub: client.id,
    tenant: client.tenant,
    scope: client.scopes,
    exp: Math.floor(Date.now() / 1000) + ttl,
  };

  json(res, 200, {
    access_token: sign(claims),
    token_type: 'Bearer',
    expires_in: ttl,
    scope: client.scopes.join(' '),
  });
});

route(
  'GET',
  '/dealers/:dealerId/leads',
  authenticate('leads:read', ownTenantOnly(({ res, params }) => {
    json(res, 200, leads.filter((l) => l.dealerId === params.dealerId));
  })),
);

route(
  'POST',
  '/dealers/:dealerId/leads',
  authenticate('leads:write', ownTenantOnly(({ res, params, body }) => {
    const input = body as Partial<Lead> | undefined;
    if (!input?.vehicle?.vin || !input.vehicle.model) {
      return problem(res, 400, 'validation_error', 'vehicle.vin and vehicle.model are required');
    }

    const lead: Lead = {
      leadId: `LD-${String(1000 + leads.length + 1)}`,
      dealerId: params.dealerId!,
      vehicle: { vin: input.vehicle.vin, model: input.vehicle.model },
      status: 'NEW',
      customerRef: input.customerRef ?? null,
      createdAt: new Date().toISOString(),
    };
    leads.push(lead);
    json(res, 201, lead);
  })),
);

route(
  'GET',
  '/oem/lead-stats',
  authenticate('leads:read:aggregate', ({ res }) => {
    const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});
    json(res, 200, { total: leads.length, byStatus });
  }),
);

/**
 * Proxies the dealer's DMS. X-Mock-Scenario lets a test drive the failure
 * modes we see from real DMS integrations without needing the real system.
 */
route(
  'GET',
  '/dealers/:dealerId/vehicles/:vin/service-history',
  authenticate('leads:read', ownTenantOnly(async ({ req, res, params }) => {
    switch (req.headers['x-mock-scenario']) {
      case 'dms-unavailable':
        return problem(res, 503, 'upstream_unavailable', 'DMS did not respond', { 'Retry-After': '30' });
      case 'dms-timeout':
        await new Promise((r) => setTimeout(r, 1500));
        return problem(res, 504, 'upstream_timeout', 'DMS timed out after 1500ms');
      case 'dms-malformed':
        return json(res, 502, { title: 'bad_gateway', detail: 'DMS returned an unparseable payload' });
    }

    const history = serviceHistory[params.vin!];
    if (!history) return problem(res, 404, 'not_found', 'No service history for this VIN');
    json(res, 200, { vin: params.vin, visits: history });
  })),
);

// ---------------------------------------------------------------- plumbing

function json(res: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(payload));
}

function problem(res: ServerResponse, status: number, title: string, detail: string, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/problem+json', ...headers });
  res.end(JSON.stringify({ status, title, detail }));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : undefined;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const candidates = routes.filter((r) => r.pattern.test(url.pathname));
  const match = candidates.find((r) => r.method === req.method);

  if (!match) {
    if (candidates.length > 0) {
      const allow = candidates.map((r) => r.method).join(', ');
      return problem(res, 405, 'method_not_allowed', `Use one of: ${allow}`, { Allow: allow });
    }
    return problem(res, 404, 'not_found', `No route for ${url.pathname}`);
  }

  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    return problem(res, 400, 'malformed_json', 'Request body is not valid JSON');
  }

  const params = match.pattern.exec(url.pathname)?.groups ?? {};
  try {
    await match.handler({ req, res, params, body });
  } catch (error) {
    console.error(error);
    problem(res, 500, 'internal_error', 'Unexpected error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`dealer-gateway mock listening on http://127.0.0.1:${PORT}`);
});
