import { LocalizedError } from '../i18n/error.js';
import { retryDelayMs } from '../supertext/client.js';

/**
 * The HubSpot calls this app needs: OAuth (install, token refresh, token
 * introspection) and a small HTTP client for the content APIs, with HubSpot's
 * date-based API versions (see docs/DEVELOPER.md → HubSpot APIs). Which
 * content endpoints are called is in content.ts.
 */

/** HubSpot's date-based API version used for OAuth, pages, blog posts and marketing emails. */
export const API_VERSION = '2026-09';
/** The knowledge base API is still in beta (Service Hub Professional or higher). */
export const KB_API_VERSION = '2027-03-beta';

export class HubSpotError extends LocalizedError {
  constructor(
    message: string,
    code: string,
    options: { status?: number; detail?: string; params?: Record<string, string | number>; category?: string } = {},
  ) {
    super(message, code, options.params ?? {}, options.detail);
    this.name = 'HubSpotError';
    this.status = options.status;
    this.category = options.category;
  }

  public readonly status?: number;
  /** HubSpot's error category ("OBJECT_NOT_FOUND", "VALIDATION_ERROR" …). */
  public readonly category?: string;
}

/** OAuth tokens of one HubSpot account. Access tokens live 30 minutes; the refresh token doesn't expire. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Unix milliseconds. */
  expiresAt: number;
}

/** What the token introspection tells about the account that installed the app. */
export interface Installation {
  /** HubSpot's account ID ("hub ID", "portal ID"). */
  portalId: string;
  /** The account's domain as HubSpot reports it, shown in the app. */
  hubDomain: string;
  scopes: string[];
}

export interface OAuthOptions {
  /** https://app.hubspot.com (the install page). */
  appBase: string;
  /** https://api.hubapi.com (tokens). */
  apiBase: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  optionalScopes: string;
  fetch?: typeof fetch;
}

/** Where to send the user to install the app. */
export function authorizeUrl(options: OAuthOptions, state: string): string {
  const query = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scopes,
    state,
  });
  if (options.optionalScopes) query.set('optional_scope', options.optionalScopes);
  return `${options.appBase}/oauth/authorize?${query}`;
}

const timeout = () => AbortSignal.timeout(30_000);

async function call(fetchFn: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, { ...init, signal: timeout() });
  } catch (error) {
    const reason = (error as Error).message;
    throw new HubSpotError(`Could not reach HubSpot: ${reason}`, 'hubspotUnreachable', { params: { reason } });
  }
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  hub_id?: number | string;
  error?: string;
  error_description?: string;
  status?: string;
  message?: string;
}

async function tokenRequest(options: OAuthOptions, body: Record<string, string>, now = Date.now()): Promise<Tokens> {
  const response = await call(options.fetch ?? fetch, `${options.apiBase}/oauth/${API_VERSION}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ ...body, client_id: options.clientId, client_secret: options.clientSecret }),
  });
  const data = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !data.access_token) {
    const detail = data.error_description || data.message || data.error || undefined;
    // A refresh token that was revoked (app uninstalled) or doesn't belong to the app.
    if (data.error === 'invalid_grant' || data.status === 'BAD_REFRESH_TOKEN' || response.status === 400 || response.status === 401) {
      throw new HubSpotError('HubSpot refused the connection. Connect HubSpot again.', 'hubspotAuth', { status: response.status, detail });
    }
    throw new HubSpotError('HubSpot did not grant access.', 'oauthFailed', { status: response.status, detail });
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || body.refresh_token || '',
    expiresAt: now + Math.max(60, Number(data.expires_in) || 1800) * 1000,
  };
}

/** Exchanges the install's code for tokens and reads which account installed the app. */
export async function exchangeCode(options: OAuthOptions, code: string): Promise<{ tokens: Tokens; installation: Installation }> {
  let tokens: Tokens;
  try {
    tokens = await tokenRequest(options, { grant_type: 'authorization_code', code, redirect_uri: options.redirectUri });
  } catch (error) {
    // A code is single-use: a refused code is an OAuth failure, not a revoked connection.
    if (error instanceof HubSpotError && error.code === 'hubspotAuth') {
      throw new HubSpotError('HubSpot did not grant access.', 'oauthFailed', { status: error.status, detail: error.detail });
    }
    throw error;
  }
  if (!tokens.refreshToken) throw new HubSpotError('HubSpot did not return a refresh token.', 'oauthFailed');
  return { tokens, installation: await introspect(options, tokens.accessToken) };
}

/** A new access token for a refresh token. */
export const refreshTokens = (options: OAuthOptions, refreshToken: string): Promise<Tokens> =>
  tokenRequest(options, { grant_type: 'refresh_token', refresh_token: refreshToken });

/** The account (hub ID, domain) and the granted scopes of an access token. */
export async function introspect(options: OAuthOptions, accessToken: string): Promise<Installation> {
  const response = await call(options.fetch ?? fetch, `${options.apiBase}/oauth/${API_VERSION}/token/introspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      token_type_hint: 'access_token',
      token: accessToken,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    active?: boolean;
    hub_id?: number | string;
    hub_domain?: string;
    scopes?: string[];
  };
  if (!response.ok || data.active === false || data.hub_id === undefined) {
    throw new HubSpotError('HubSpot did not return the account details.', 'oauthFailed', { status: response.status });
  }
  return { portalId: String(data.hub_id), hubDomain: data.hub_domain ?? '', scopes: data.scopes ?? [] };
}

/** Gives the client a valid access token, and a fresh one after HubSpot refused the current one. */
export interface TokenSource {
  accessToken(): Promise<string>;
  /** Called after a 401: refresh even if the token isn't due yet. */
  refreshed(): Promise<string>;
}

export interface HubSpotClientOptions {
  /** https://api.hubapi.com */
  apiBase: string;
  tokens: TokenSource;
  /** Injected for tests. */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/** Retries after HTTP 429 (HubSpot limits requests per 10 seconds per app and account). */
const RATE_LIMIT_RETRIES = 4;

export class HubSpotClient {
  private readonly base: string;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly options: HubSpotClientOptions) {
    this.base = options.apiBase.replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? fetch;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.request(method, path, body);
    if (response.status === 204) return {} as T;
    return (await response.json().catch(() => ({}))) as T;
  }

  async request(method: string, path: string, body?: unknown): Promise<Response> {
    let token = await this.options.tokens.accessToken();
    let refreshed = false;
    let response: Response;
    for (let attempt = 0; ; ) {
      response = await call(this.fetchFn, this.base + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (response.status === 401 && !refreshed) {
        // The access token expired early or was revoked: one refresh, then the same request again.
        await response.body?.cancel().catch(() => undefined);
        refreshed = true;
        token = await this.options.tokens.refreshed();
        continue;
      }
      if (response.status !== 429 || attempt >= RATE_LIMIT_RETRIES) break;
      await response.body?.cancel().catch(() => undefined);
      await this.sleep(retryDelayMs(attempt, response.headers.get('retry-after')));
      attempt++;
    }
    if (response.ok) return response;
    throw await hubspotError(response);
  }
}

/** A HubSpotError for a failed response; HubSpot's own message is kept, untranslated. */
export async function hubspotError(response: Response): Promise<HubSpotError> {
  const status = response.status;
  const text = await response.text().catch(() => '');
  let detail = '';
  let category: string | undefined;
  try {
    const data = JSON.parse(text) as { message?: string; category?: string; errors?: { message?: string }[] };
    category = data.category;
    const more = (data.errors ?? []).map((e) => e.message).filter((m) => m && m !== data.message);
    detail = [data.message, ...more].filter(Boolean).join(' ');
  } catch {
    detail = text.replace(/<[^>]*>/g, '').trim();
  }
  detail = detail.slice(0, 300);
  const options = { status, detail: detail || undefined, params: { status }, category };
  if (status === 401) return new HubSpotError('HubSpot refused the connection. Connect HubSpot again.', 'hubspotAuth', options);
  if (status === 403) return new HubSpotError('HubSpot refused the request.', 'hubspotForbidden', options);
  if (status === 404) return new HubSpotError('Not found in HubSpot.', 'hubspotNotFound', options);
  if (status === 429) return new HubSpotError('Too many requests to HubSpot.', 'hubspotRateLimited', options);
  if (status >= 500) return new HubSpotError('HubSpot is currently unavailable.', 'hubspotUnavailable', options);
  return new HubSpotError(`HubSpot answered with HTTP ${status}.`, 'hubspotHttp', options);
}
