import { API_VERSION, HubSpotError, KB_API_VERSION, type HubSpotClient } from './client.js';
import { LocalizedError } from '../i18n/error.js';
import { Extraction } from './extract.js';

/**
 * The five kinds of HubSpot content the app translates, and the endpoints for
 * each: list, read, make a language version, write a draft, remove.
 *
 * - Website pages, landing pages and blog posts have HubSpot's own language
 *   variants (multi-language groups): a translation is a variant made with
 *   `create-language-variation` (a copy of the primary's draft), then its draft
 *   is written. HubSpot lists the variants in the primary's `translations`.
 * - Marketing emails have no variants: a translation is a clone with the
 *   target language (`clone`), recorded by the app.
 * - Knowledge base articles (beta API, Service Hub Professional+): a
 *   translation is a new article with `language` and `translationOfId`.
 *
 * Nothing is published: translations are drafts until an editor publishes them.
 */

export type Kind = 'site-page' | 'landing-page' | 'blog-post' | 'email' | 'kb-article';
export const KINDS: readonly Kind[] = ['site-page', 'landing-page', 'blog-post', 'email', 'kb-article'];
export const isKind = (value: string): value is Kind => (KINDS as readonly string[]).includes(value);

/** Kinds whose language versions HubSpot itself links (pages, posts, articles); emails are recorded by the app. */
export const hasVariants = (kind: Kind): boolean => kind !== 'email';

export type ItemState = 'draft' | 'published' | 'scheduled' | 'other';

/** One item in a list: enough for the Translate page. */
export interface ContentSummary {
  id: string;
  name: string;
  /** HubSpot language code ("en", "de-ch"); '' = not set. */
  language: string;
  state: ItemState;
  /** HubSpot's language versions: language code (lower case) → item ID, without the item itself. */
  translations: Record<string, string>;
  /** The item is itself a language version of another one. */
  isVariant: boolean;
  updatedAt?: string;
}

/** A whole item as HubSpot returns it. */
export type Item = Record<string, unknown> & { id: string };

const paths: Record<Kind, string> = {
  'site-page': `/cms/pages/${API_VERSION}/site-pages`,
  'landing-page': `/cms/pages/${API_VERSION}/landing-pages`,
  'blog-post': `/cms/blogs/${API_VERSION}/posts`,
  email: `/marketing/emails/${API_VERSION}`,
  'kb-article': `/cms/knowledge-base/${KB_API_VERSION}/articles`,
};

export const basePath = (kind: Kind): string => paths[kind];

const str = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');

/** HubSpot's states (`PUBLISHED`, `DRAFT`, `SCHEDULED`, `PUBLISHED_OR_SCHEDULED` …) → four badges. */
export function itemState(item: Record<string, unknown>): ItemState {
  const state = str(item.currentState || item.state).toUpperCase();
  if (item.currentlyPublished === true || item.isPublished === true) return 'published';
  if (/SCHEDULED/.test(state)) return 'scheduled';
  if (/PUBLISHED|AUTOMATED|SENT|PROCESSING/.test(state)) return 'published';
  if (/DRAFT/.test(state) || state === '') return 'draft';
  return 'other';
}

/** `translations` as a map language → ID; HubSpot returns objects keyed by language (articles may return a list). */
export function translationMap(value: unknown, ownId: string): Record<string, string> {
  const result: Record<string, string> = {};
  const add = (language: unknown, id: unknown) => {
    const code = str(language).toLowerCase();
    const target = str(id);
    if (code && target && target !== ownId) result[code] = target;
  };
  if (Array.isArray(value)) {
    for (const entry of value) if (entry && typeof entry === 'object') add((entry as Item).language, (entry as Item).id);
  } else if (value && typeof value === 'object') {
    for (const [language, entry] of Object.entries(value as Record<string, unknown>)) {
      add((entry as Item | null)?.language ?? language, typeof entry === 'object' && entry ? (entry as Item).id : entry);
    }
  }
  return result;
}

/** The primary's ID if the item is a language version (pages, posts: translatedFromId; articles: translationOfId). */
export const primaryOf = (item: Record<string, unknown>): string => str(item.translatedFromId || item.translationOfId);

export function summary(kind: Kind, item: Item): ContentSummary {
  const primary = primaryOf(item);
  return {
    id: str(item.id),
    name: str(kind === 'kb-article' ? item.title : item.name) || str(item.subject) || str(item.htmlTitle) || str(item.id),
    language: str(item.language).toLowerCase(),
    state: itemState(item),
    translations: hasVariants(kind) ? translationMap(item.translations, str(item.id)) : {},
    isVariant: Boolean(primary) && primary !== str(item.id),
    updatedAt: str(item.updated || item.updatedAt) || undefined,
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  /** Cursor of the next page (HubSpot's `paging.next.after`). */
  after?: string;
}

/** One page of items of a kind, most recently updated first, without archived ones. */
export async function listItems(client: HubSpotClient, kind: Kind, options: { limit: number; after?: string }): Promise<Page<ContentSummary>> {
  const query = new URLSearchParams({ limit: String(options.limit), sort: '-updatedAt', archived: 'false' });
  if (options.after) query.set('after', options.after);
  const data = await client.json<{ results?: Item[]; total?: number; paging?: { next?: { after?: string } } }>(
    'GET',
    `${paths[kind]}?${query}`,
  );
  const items = (data.results ?? []).map((item) => summary(kind, item));
  return { items, total: data.total ?? items.length, after: data.paging?.next?.after || undefined };
}

/** The item (metadata and language versions), or undefined if it doesn't exist (any more). */
export async function getItem(client: HubSpotClient, kind: Kind, id: string): Promise<Item | undefined> {
  try {
    return await client.json<Item>('GET', `${paths[kind]}/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof HubSpotError && error.status === 404) return undefined;
    throw error;
  }
}

/** The item's draft: what editors see in HubSpot's editor, including changes not yet published. */
export async function getDraft(client: HubSpotClient, kind: Kind, id: string): Promise<Item> {
  try {
    return await client.json<Item>('GET', `${paths[kind]}/${encodeURIComponent(id)}/draft`);
  } catch (error) {
    // An item that never had separate draft changes: its live version is the draft.
    if (error instanceof HubSpotError && error.status === 404) {
      const live = await getItem(client, kind, id);
      if (live) return live;
    }
    throw error;
  }
}

/**
 * Makes the language version of a page, post or email (an empty copy to be written).
 * `primaryLanguage`: the source's language when it has none set in HubSpot (pages only).
 */
export async function createVersion(
  client: HubSpotClient,
  kind: Exclude<Kind, 'kb-article'>,
  source: Item,
  language: string,
  primaryLanguage: string,
): Promise<Item> {
  if (kind === 'email') {
    const name = `${str(source.name) || str(source.subject) || source.id} · ${language.toUpperCase()}`;
    return client.json<Item>('POST', `${paths.email}/clone`, { id: source.id, cloneName: name, language });
  }
  const body: Record<string, unknown> = { id: source.id, language };
  if (!str(source.language) && primaryLanguage && kind !== 'blog-post') body.primaryLanguage = primaryLanguage;
  try {
    return await client.json<Item>('POST', `${paths[kind]}/multi-language/create-language-variation`, body);
  } catch (error) {
    // HubSpot: "Blog does not have a variation for language fr-ch" (the blog needs that language first).
    if (error instanceof HubSpotError && error.status === 400 && /does not have a variation for language/i.test(error.detail ?? '')) {
      throw new LocalizedError(`The blog has no ${language} version in HubSpot yet.`, 'blogLanguageMissing', { language });
    }
    throw error;
  }
}

/** A new knowledge base article in another language, linked to the primary (made with its content at once). */
export function createArticleTranslation(client: HubSpotClient, source: Item, language: string, fields: Record<string, unknown>): Promise<Item> {
  const body: Record<string, unknown> = {
    ...fields,
    language,
    translationOfId: source.id,
    path: source.path,
  };
  if (Array.isArray(source.tagIds)) body.tagIds = source.tagIds;
  return client.json<Item>('POST', paths['kb-article'], body);
}

/** Writes fields to the item's draft (partial update; the live version stays until someone publishes). */
export function updateDraft(client: HubSpotClient, kind: Kind, id: string, fields: Record<string, unknown>): Promise<Item> {
  return client.json<Item>('PATCH', `${paths[kind]}/${encodeURIComponent(id)}/draft`, fields);
}

/** Removes a half-made language version (pages, posts and emails are archived; an article is deleted). */
export async function removeItem(client: HubSpotClient, kind: Kind, id: string): Promise<void> {
  if (kind === 'kb-article') {
    await client.request('PATCH', `${paths[kind]}/${encodeURIComponent(id)}`, { archived: true });
  } else {
    await client.request('DELETE', `${paths[kind]}/${encodeURIComponent(id)}`);
  }
}

const clone = <T>(value: T): T => (value === undefined || value === null ? value : structuredClone(value));

/**
 * What is translated in an item of a kind, as segments, and the fields that are written to the
 * language version once `extraction.apply()` has run (`fields()`).
 */
export function extractItem(kind: Kind, draft: Item): { extraction: Extraction; fields: () => Record<string, unknown> } {
  const extraction = new Extraction();
  const fields: Record<string, unknown> = {};
  const plain = (name: string) => extraction.addPlain(draft[name], (value) => (fields[name] = value));
  const html = (name: string) => extraction.addHtml(draft[name], (value) => (fields[name] = value));
  const modules = (target: Record<string, unknown>, source: Record<string, unknown>, names: string[]) => {
    for (const name of names) {
      if (!source[name] || typeof source[name] !== 'object') continue;
      target[name] = clone(source[name]);
      extraction.addModules(target[name]);
    }
  };

  switch (kind) {
    case 'site-page':
    case 'landing-page':
      for (const name of ['name', 'htmlTitle', 'metaDescription', 'featuredImageAltText']) plain(name);
      modules(fields, draft, ['widgets', 'widgetContainers', 'layoutSections']);
      break;
    case 'blog-post':
      // A post's `name` is its title (the heading readers see).
      for (const name of ['name', 'htmlTitle', 'metaDescription', 'featuredImageAltText']) plain(name);
      html('postBody');
      html('postSummary');
      modules(fields, draft, ['widgets', 'widgetContainers', 'layoutSections']);
      break;
    case 'email': {
      plain('subject');
      const content = draft.content && typeof draft.content === 'object' ? clone(draft.content as Record<string, unknown>) : undefined;
      if (content) {
        // The whole content object goes back (styles and layout unchanged), with the modules translated.
        modules(content, content, ['widgets', 'widgetContainers']);
        extraction.addLines(content.plainTextVersion, (value) => (content.plainTextVersion = value));
        fields.content = content;
      }
      const web = draft.webversion && typeof draft.webversion === 'object' ? clone(draft.webversion as Record<string, unknown>) : undefined;
      if (web && (web.title || web.metaDescription)) {
        extraction.addPlain(web.title, (value) => (web.title = value));
        extraction.addPlain(web.metaDescription, (value) => (web.metaDescription = value));
        fields.webversion = web;
      }
      break;
    }
    case 'kb-article':
      for (const name of ['title', 'subtitle', 'metaDescription']) plain(name);
      html('body');
      break;
  }
  return { extraction, fields: () => fields };
}

/** The item in HubSpot's editor. EU accounts are redirected from app.hubspot.com by HubSpot. */
export function editorUrl(kind: Kind, portalId: string, id: string, appBase = 'https://app.hubspot.com'): string {
  const p = encodeURIComponent(portalId);
  const i = encodeURIComponent(id);
  switch (kind) {
    case 'site-page':
    case 'landing-page':
      return `${appBase}/pages/${p}/editor/${i}/content`;
    case 'blog-post':
      return `${appBase}/blog/${p}/editor/${i}/content`;
    case 'email':
      return `${appBase}/email/${p}/edit/${i}/content`;
    case 'kb-article':
      return `${appBase}/knowledge/${p}/edit/${i}`;
  }
}
