import { BLOGS, HUB_DOMAIN, PORTAL_ID, seed } from './seed.js';

/**
 * A stand-in for the HubSpot calls the app makes: OAuth (install page, tokens,
 * introspection) and the content APIs for website pages, landing pages, blog
 * posts, marketing emails and knowledge base articles, with the sample account
 * of seed.ts. Behaves like HubSpot where the app depends on it: access tokens
 * expire (`expireTokens()`), language variants form groups listed in each
 * member's `translations`, a blog post can only get a language its blog has,
 * a page without a language needs `primaryLanguage`, and the knowledge base
 * answers 403 without its scopes. Not covered: anything the app doesn't call.
 */

type Kind = 'site-page' | 'landing-page' | 'blog-post' | 'email' | 'kb-article';
type Item = Record<string, unknown> & { id: string };

interface Entry {
  kind: Kind;
  live: Item;
  draft: Item;
  archived: boolean;
  /** The primary of its language group (itself for a primary). */
  group: string;
}

export interface HubSpotStandin {
  handle(request: Request): Promise<Response>;
  /** Every API request (method and path) after OAuth. */
  requests: { method: string; path: string; body?: unknown }[];
  /** The item as HubSpot has it now (draft fields), or undefined. */
  draft(id: string): Item | undefined;
  /** The items of a kind, archived ones included. */
  items(kind: Kind): Item[];
  /** Makes every access token expire (the next call gets 401). */
  expireTokens(): void;
  /** Revokes the refresh token (as uninstalling the app does). */
  revoke(): void;
  /** Install without the knowledge base scopes (an account without Service Hub Professional). */
  withoutKnowledgeBase(): void;
  /** Sets an item's state, as publishing or sending it in HubSpot would. */
  setState(id: string, state: string): void;
}

const PATHS: [Kind, RegExp][] = [
  ['site-page', /^\/cms\/pages\/2026-09\/site-pages/],
  ['landing-page', /^\/cms\/pages\/2026-09\/landing-pages/],
  ['blog-post', /^\/cms\/blogs\/2026-09\/posts/],
  ['email', /^\/marketing\/emails\/2026-09/],
  ['kb-article', /^\/cms\/knowledge-base\/2027-03-beta\/articles/],
];

const KB_SCOPES = ['cms.knowledge_base.articles.read', 'cms.knowledge_base.articles.write'];

export function createHubSpotStandin(): HubSpotStandin {
  const entries = new Map<string, Entry>();
  for (const [kind, items] of Object.entries(seed()) as [Kind, Item[]][]) {
    for (const item of items) entries.set(item.id, { kind, live: item, draft: structuredClone(item), archived: false, group: item.id });
  }
  let nextId = 1000;
  let tokenCount = 0;
  const validTokens = new Set<string>();
  let refreshToken = 'standin-refresh';
  let kb = true;
  const granted = () => ['oauth', 'content', ...(kb ? KB_SCOPES : [])];

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const error = (status: number, message: string, category = 'VALIDATION_ERROR') =>
    json({ status: 'error', message, correlationId: '00000000-0000-0000-0000-000000000000', category }, status);
  const issue = () => {
    const token = `standin-token-${++tokenCount}`;
    validTokens.add(token);
    return token;
  };

  /** The language group's members other than `entry`, as HubSpot's `translations`. */
  const translations = (entry: Entry) => {
    const members = [...entries.values()].filter((e) => e.group === entry.group && !e.archived && e.kind === entry.kind);
    if (entry.kind === 'email') return undefined;
    if (entry.kind === 'kb-article') {
      return members.filter((e) => e !== entry).map((e) => ({ id: e.live.id, language: e.live.language }));
    }
    const map: Record<string, unknown> = {};
    for (const member of members) {
      if (member === entry) continue;
      map[String(member.live.language)] = { id: Number(member.live.id), name: member.live.name, state: member.live.state, slug: member.live.slug };
    }
    return map;
  };
  const view = (entry: Entry, which: 'live' | 'draft'): Item => {
    const item = structuredClone(entry[which]);
    const t = translations(entry);
    if (t !== undefined) item.translations = t;
    if (entry.archived) item.archived = true;
    return item;
  };

  const state: HubSpotStandin = {
    requests: [],
    draft: (id) => {
      const entry = entries.get(id);
      return entry ? view(entry, 'draft') : undefined;
    },
    items: (kind) => [...entries.values()].filter((e) => e.kind === kind).map((e) => view(e, 'draft')),
    expireTokens: () => validTokens.clear(),
    revoke: () => {
      refreshToken = 'revoked';
      validTokens.clear();
    },
    withoutKnowledgeBase: () => {
      kb = false;
    },
    setState: (id, value) => {
      const entry = entries.get(id);
      if (!entry) return;
      const published = /PUBLISHED/.test(value);
      for (const item of [entry.live, entry.draft]) {
        item.state = value;
        if (entry.kind === 'email') item.isPublished = published;
        else item.currentlyPublished = published;
      }
    },
    handle: async (request) => {
      const url = new URL(request.url);
      const path = url.pathname;

      // --- OAuth ---
      if (request.method === 'GET' && path === '/oauth/authorize') {
        const redirect = new URL(url.searchParams.get('redirect_uri') ?? '');
        if (!url.searchParams.get('client_id') || !url.searchParams.get('scope')?.split(' ').includes('content')) {
          return new Response('bad request', { status: 400 });
        }
        redirect.searchParams.set('code', 'standin-code');
        redirect.searchParams.set('state', url.searchParams.get('state') ?? '');
        return new Response(null, { status: 302, headers: { Location: redirect.toString() } });
      }
      if (request.method === 'POST' && path === '/oauth/2026-09/token') {
        const form = new URLSearchParams(await request.text());
        if (!form.get('client_id') || !form.get('client_secret')) return json({ error: 'invalid_client' }, 400);
        if (form.get('grant_type') === 'authorization_code') {
          if (form.get('code') !== 'standin-code') return json({ error: 'invalid_grant', error_description: 'bad code' }, 400);
          refreshToken = 'standin-refresh';
          return json({ token_type: 'bearer', access_token: issue(), refresh_token: refreshToken, expires_in: 1800, hub_id: Number(PORTAL_ID), scopes: granted() });
        }
        if (form.get('grant_type') === 'refresh_token') {
          if (form.get('refresh_token') !== refreshToken || refreshToken === 'revoked') {
            return json({ error: 'invalid_grant', error_description: 'refresh token is invalid', status: 'BAD_REFRESH_TOKEN' }, 400);
          }
          return json({ token_type: 'bearer', access_token: issue(), refresh_token: refreshToken, expires_in: 1800, hub_id: Number(PORTAL_ID) });
        }
        return json({ error: 'unsupported_grant_type' }, 400);
      }
      if (request.method === 'POST' && path === '/oauth/2026-09/token/introspect') {
        const form = new URLSearchParams(await request.text());
        const token = form.get('token') ?? '';
        if (!validTokens.has(token)) return json({ active: false });
        return json({ active: true, token, hub_id: Number(PORTAL_ID), hub_domain: HUB_DOMAIN, user: 'editor@swiss-chocolate.example', scopes: granted(), token_use: 'access_token', expires_in: 1800 });
      }

      // --- Content APIs ---
      const auth = request.headers.get('authorization') ?? '';
      if (!validTokens.has(auth.replace(/^Bearer /, ''))) return error(401, 'The OAuth token used to make this call expired.', 'EXPIRED_AUTHENTICATION');
      const match = PATHS.find(([, pattern]) => pattern.test(path));
      if (!match) return error(404, `Unknown path ${path}`, 'OBJECT_NOT_FOUND');
      const [kind, pattern] = match;
      if (kind === 'kb-article' && !kb) return error(403, 'This app hasn\'t been granted all required scopes to make this call.', 'MISSING_SCOPES');
      const rest = path.replace(pattern, '');
      const body = request.method === 'GET' || request.method === 'DELETE' ? undefined : ((await request.json().catch(() => ({}))) as Record<string, unknown>);
      state.requests.push({ method: request.method, path, ...(body !== undefined ? { body } : {}) });

      // List
      if (request.method === 'GET' && rest === '') {
        const all = [...entries.values()]
          .filter((e) => e.kind === kind && !e.archived)
          .sort((a, b) => String(b.live.updated ?? b.live.updatedAt ?? '').localeCompare(String(a.live.updated ?? a.live.updatedAt ?? '')));
        const limit = Number(url.searchParams.get('limit')) || 20;
        const offset = Number(url.searchParams.get('after')) || 0;
        const page = all.slice(offset, offset + limit).map((e) => view(e, 'live'));
        return json({
          total: all.length,
          results: page,
          ...(offset + limit < all.length ? { paging: { next: { after: String(offset + limit), link: '' } } } : {}),
        });
      }

      // Language versions
      if (request.method === 'POST' && rest === '/multi-language/create-language-variation') {
        const source = entries.get(String(body?.id));
        if (!source || source.kind !== kind || source.archived) return error(404, 'Content not found', 'OBJECT_NOT_FOUND');
        const language = String(body?.language ?? '').toLowerCase();
        if (!language) return error(400, 'language is required');
        if (!source.live.language) {
          if (!body?.primaryLanguage) return error(400, 'The primary content has no language; set primaryLanguage.');
          source.live.language = source.draft.language = String(body.primaryLanguage);
        }
        if (kind === 'blog-post') {
          const blog = BLOGS.find((b) => b.id === source.live.contentGroupId);
          if (!blog?.translations.includes(language)) {
            return error(400, `The blog has no ${language} language variant. Add one under Settings → Content → Blog.`);
          }
        }
        if ([...entries.values()].some((e) => e.group === source.group && e.live.language === language && !e.archived)) {
          return error(400, `A ${language} variation already exists`, 'CONFLICT');
        }
        const id = String(nextId++);
        const copy: Item = { ...structuredClone(source.draft), id, language, translatedFromId: source.live.id, state: 'DRAFT', currentlyPublished: false };
        entries.set(id, { kind, live: copy, draft: structuredClone(copy), archived: false, group: source.group });
        return json(view(entries.get(id)!, 'live'));
      }
      if (request.method === 'POST' && rest === '/clone' && kind === 'email') {
        const source = entries.get(String(body?.id));
        if (!source || source.kind !== 'email') return error(404, 'Email not found', 'OBJECT_NOT_FOUND');
        const id = String(nextId++);
        const copy: Item = {
          ...structuredClone(source.draft),
          id,
          name: String(body?.cloneName ?? `${source.live.name} (clone)`),
          language: String(body?.language ?? source.live.language),
          state: 'DRAFT',
          isPublished: false,
          clonedFrom: source.live.id,
        };
        entries.set(id, { kind, live: copy, draft: structuredClone(copy), archived: false, group: id });
        return json(copy);
      }
      if (request.method === 'POST' && rest === '' && kind === 'kb-article') {
        const primary = entries.get(String(body?.translationOfId ?? ''));
        const id = String(nextId++);
        const article: Item = {
          id,
          knowledgeBaseId: 'kb-1',
          state: 'DRAFT',
          accessGroupIds: [],
          accessType: primary?.live.accessType ?? 'PUBLIC',
          archivedInDashboard: false,
          categoryId: body?.categoryId ?? primary?.live.categoryId,
          tagIds: [],
          ...body,
        };
        if (!article.title || !article.language) return error(400, 'title and language are required');
        entries.set(id, { kind, live: article, draft: structuredClone(article), archived: false, group: primary ? primary.group : id });
        return json(view(entries.get(id)!, 'live'));
      }

      // One item
      const one = rest.match(/^\/([^/]+)(\/draft)?$/);
      const entry = one ? entries.get(decodeURIComponent(one[1])) : undefined;
      if (!one || !entry || entry.kind !== kind) return error(404, 'Not found', 'OBJECT_NOT_FOUND');
      if (request.method === 'GET') {
        if (entry.archived && !one[2]) return error(404, 'Not found', 'OBJECT_NOT_FOUND');
        return json(view(entry, one[2] ? 'draft' : 'live'));
      }
      if (request.method === 'PATCH' && one[2]) {
        Object.assign(entry.draft, structuredClone(body ?? {}));
        return json(view(entry, 'draft'));
      }
      if (request.method === 'PATCH' && kind === 'kb-article' && body?.archived === true) {
        entry.archived = true;
        return new Response(null, { status: 204 });
      }
      if (request.method === 'DELETE') {
        entry.archived = true;
        return new Response(null, { status: 204 });
      }
      return error(405, 'Method not allowed');
    },
  };
  return state;
}
