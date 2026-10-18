import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { MemoryStore } from '../src/store/store.js';
import { createHubSpotStandin } from './standin/hubspot.js';
import { createSupertextStandin } from './standin/supertext.js';

export { PORTAL_ID } from './standin/seed.js';

/** The app wired to the stand-in HubSpot and Supertext APIs, with an in-memory store. */
export function setup(env: Record<string, string> = {}) {
  const hubspot = createHubSpotStandin();
  const supertext = createSupertextStandin();
  const store = new MemoryStore();
  /** Requests to Supertext and to the review service (review.test, the same stand-in): "METHOD host/path". */
  const supertextRequests: string[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const host = url.host;
    if (host === 'hubspot.test') return hubspot.handle(request);
    if (host === 'supertext.test' || host === 'review.test') supertextRequests.push(`${request.method} ${host}${url.pathname}`);
    if (host === 'supertext.test' || host === 'review.test' || host === 'center.test') return supertext.handle(request);
    throw new Error(`Unexpected request to ${request.url}`);
  }) as typeof fetch;
  const config = loadConfig({
    APP_URL: 'https://app.test',
    HUBSPOT_CLIENT_ID: 'client-id',
    HUBSPOT_CLIENT_SECRET: 'client-secret',
    HUBSPOT_APP_BASE: 'https://hubspot.test',
    HUBSPOT_API_BASE: 'https://hubspot.test',
    SESSION_SECRET: 'session-secret',
    SUPERTEXT_API_ENDPOINT: 'https://supertext.test/v1/',
    SUPERTEXT_API_KEY: 'server-key',
    // Version reports go to the stand-in (supertext.reports), never to the live Commando Center.
    SUPERTEXT_REPORT_URL: 'https://center.test/api/v1/report',
    ...env,
  });
  const jobs: Promise<unknown>[] = [];
  const onJob = (done: Promise<unknown>) => jobs.push(done);
  const app = createApp({ config, store, fetch: fetchFn, onJob });
  let cookies: Record<string, string> = {};
  const cookieHeader = () =>
    Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  const remember = (response: Response) => {
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [name, ...value] = pair.split('=');
      if (/Max-Age=0/i.test(line) || value.join('=') === '') delete cookies[name];
      else cookies[name] = value.join('=');
    }
    return response;
  };

  /** A request as the browser would send it (cookies kept between requests). */
  const request = async (path: string, init: RequestInit = {}) =>
    remember(
      await app.request(`https://app.test${path}`, {
        ...init,
        headers: { Cookie: cookieHeader(), 'Accept-Language': 'en', ...(init.headers ?? {}) },
      }),
    );

  /** Installs the app in the stand-in HubSpot account through the OAuth flow. */
  const connect = async () => {
    const start = await request('/oauth/start');
    const authorize = await hubspot.handle(new Request(start.headers.get('location')!));
    const callback = new URL(authorize.headers.get('location')!);
    return request(callback.pathname + callback.search);
  };

  /** The CSRF token of the current session (as the pages embed it). */
  const csrf = async () => {
    const page = await (await request('/settings')).text();
    return /data-csrf="([^"]+)"/.exec(page)?.[1] ?? '';
  };

  const api = async (method: string, path: string, body?: unknown) =>
    request(path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  /** Saves settings through the form, as the settings page does. */
  const saveSettings = async (fields: [string, string][]) => {
    const form = new URLSearchParams([['csrf', await csrf()], ...fields]);
    return request('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  };

  /** Starts a job through the API and waits for it; returns the job's panel. */
  const translate = async (kind: string, itemId: string, languages: string[], overwrite = false) => {
    const started = await api('POST', '/api/jobs', { kind, itemId, languages, overwrite });
    const { id } = (await started.json()) as { id: string };
    await settle();
    const status = (await (await api('GET', `/api/jobs/${id}`)).json()) as { status: string; html: string };
    const job = await store.getJob(PORTAL, id);
    return { ...status, job: job! };
  };

  const settle = async () => {
    while (jobs.length) await Promise.all(jobs.splice(0));
  };
  const clearCookies = () => {
    cookies = {};
  };
  return { app, hubspot, supertext, supertextRequests, store, config, request, connect, csrf, api, saveSettings, translate, settle, onJob, fetchFn, clearCookies };
}

const PORTAL = '48210377';

/** The usual settings: German and French for Switzerland (HubSpot codes that are Supertext codes as they are: no mapping). */
export const STANDARD_SETTINGS: [string, string][] = [
  ['sourceLanguage', 'en'],
  ['target', 'de-ch'],
  ['target', 'fr-ch'],
  ['tone', 'default'],
  ['versionReports', '1'],
];
