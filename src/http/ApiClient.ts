import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RequestOptions {
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);

/**
 * Thin wrapper over Playwright's APIRequestContext.
 *
 * Every exchange is attached to the test report so a failed run can be
 * diagnosed from the HTML report alone, without re-running locally.
 * Auth headers are masked before they are written anywhere.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    private readonly testInfo?: TestInfo,
    private readonly defaultHeaders: Record<string, string> = {},
  ) {}

  withHeaders(headers: Record<string, string>): ApiClient {
    return new ApiClient(this.request, this.baseUrl, this.testInfo, {
      ...this.defaultHeaders,
      ...headers,
    });
  }

  get(path: string, options?: RequestOptions) {
    return this.send('GET', path, options);
  }

  post(path: string, options?: RequestOptions) {
    return this.send('POST', path, options);
  }

  put(path: string, options?: RequestOptions) {
    return this.send('PUT', path, options);
  }

  patch(path: string, options?: RequestOptions) {
    return this.send('PATCH', path, options);
  }

  delete(path: string, options?: RequestOptions) {
    return this.send('DELETE', path, options);
  }

  async send(method: Method, path: string, options: RequestOptions = {}): Promise<APIResponse> {
    const url = `${this.baseUrl}${path}`;
    const headers = { Accept: 'application/json', ...this.defaultHeaders, ...options.headers };

    const response = await this.request.fetch(url, {
      method,
      headers,
      params: options.params,
      data: options.data,
      failOnStatusCode: false,
    });

    await this.record(method, url, headers, options.data, response);
    return response;
  }

  private async record(
    method: Method,
    url: string,
    headers: Record<string, string>,
    body: unknown,
    response: APIResponse,
  ) {
    if (!this.testInfo) return;

    const responseText = method === 'HEAD' ? '' : await response.text();
    const exchange = {
      request: { method, url, headers: maskHeaders(headers), body: body ?? null },
      response: {
        status: response.status(),
        headers: maskHeaders(response.headers()),
        body: tryParse(responseText),
      },
    };

    await this.testInfo.attach(`${method} ${new URL(url).pathname} -> ${response.status()}`, {
      body: JSON.stringify(exchange, null, 2),
      contentType: 'application/json',
    });
  }
}

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) =>
      SENSITIVE_HEADERS.has(key.toLowerCase()) ? [key, '***'] : [key, value],
    ),
  );
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
