import type { ApiClient } from '../http/ApiClient';

export interface Credentials {
  username: string;
  password: string;
}

export class AuthClient {
  constructor(private readonly api: ApiClient) {}

  createToken(credentials: Partial<Credentials>) {
    return this.api.post('/auth', { data: credentials });
  }

  async tokenFor(credentials: Credentials): Promise<string> {
    const response = await this.createToken(credentials);
    const body = (await response.json()) as { token?: string; reason?: string };
    if (!body.token) {
      throw new Error(`Could not obtain token: ${body.reason ?? response.status()}`);
    }
    return body.token;
  }
}
