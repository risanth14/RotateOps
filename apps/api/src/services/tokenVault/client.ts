import axios, { AxiosInstance } from "axios";
import { env } from "../../config/env.js";
import { maskReference } from "../../lib/secrets.js";

export interface TokenVaultIssueInput {
  provider: string;
  integrationId: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
}

export interface TokenVaultIssuedToken {
  tokenId: string;
  token: string;
  maskedReference?: string;
}

export interface TokenVaultIntrospection {
  tokenId: string;
  active: boolean;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface TokenVaultClient {
  issueToken(input: TokenVaultIssueInput): Promise<TokenVaultIssuedToken>;
  introspectToken(tokenId: string): Promise<TokenVaultIntrospection>;
  revokeToken(tokenId: string): Promise<void>;
}

class RestTokenVaultClient implements TokenVaultClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.http = axios.create({
      baseURL: baseUrl.replace(/\/+$/, ""),
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
  }

  async issueToken(input: TokenVaultIssueInput): Promise<TokenVaultIssuedToken> {
    const response = await this.http.post("/v1/tokens/issue", input);
    const body = response.data as Partial<TokenVaultIssuedToken>;
    if (!body?.tokenId || !body?.token) {
      throw new Error("Token Vault issue response is missing required fields.");
    }
    return body as TokenVaultIssuedToken;
  }

  async introspectToken(tokenId: string): Promise<TokenVaultIntrospection> {
    const response = await this.http.post("/v1/tokens/introspect", { tokenId });
    const body = response.data as Partial<TokenVaultIntrospection>;
    if (!body?.tokenId || typeof body.active !== "boolean") {
      throw new Error("Token Vault introspection response is invalid.");
    }
    return body as TokenVaultIntrospection;
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.http.post("/v1/tokens/revoke", { tokenId });
  }
}

class DemoTokenVaultClient implements TokenVaultClient {
  async issueToken(input: TokenVaultIssueInput): Promise<TokenVaultIssuedToken> {
    const token = `tv_${input.provider}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    return {
      tokenId: `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      token,
      maskedReference: maskReference(token)
    };
  }

  async introspectToken(tokenId: string): Promise<TokenVaultIntrospection> {
    return {
      tokenId,
      active: true
    };
  }

  async revokeToken(_tokenId: string): Promise<void> {
    return;
  }
}

let client: TokenVaultClient | null = null;

export function getTokenVaultClient(): TokenVaultClient {
  if (client) {
    return client;
  }

  if (env.TOKEN_VAULT_BASE_URL && env.TOKEN_VAULT_API_KEY) {
    client = new RestTokenVaultClient(env.TOKEN_VAULT_BASE_URL, env.TOKEN_VAULT_API_KEY);
    return client;
  }

  if (env.APP_MODE === "provider") {
    throw new Error("Token Vault is required for provider mode. Set TOKEN_VAULT_BASE_URL and TOKEN_VAULT_API_KEY.");
  }

  client = new DemoTokenVaultClient();
  return client;
}
