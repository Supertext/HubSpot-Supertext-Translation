import type { HubSpotClient } from '../hubspot/client.js';
import { getDraft, getItem, hasVariants, itemState, summary, type ContentSummary, type Item, type Kind } from '../hubspot/content.js';
import { errorInfo, LocalizedError, type ErrorInfo } from '../i18n/error.js';
import { fromSdk, type SupertextClient } from '../supertext/client.js';
import { newJobId, type Account, type Job, type JobItem, type Store } from '../store/store.js';
import { hubspotCode, sameLanguage, supertextSource, supertextTarget, supportsPoliteness } from './languages.js';
import { translateItem } from './translate.js';

/**
 * A translation job: one item into one or more languages, one after the other
 * (Supertext limits requests per second). Runs in the web process; progress is
 * saved after every language so the page can poll it.
 */

export interface JobDeps {
  store: Store;
  hubspot: (account: Account) => HubSpotClient;
  /** `forReview(true)`: the client for a language with Translation review on (the review service). */
  supertext: (account: Account) => Pick<SupertextClient, 'translateSegments' | 'forReview'>;
  /** Supertext rejected the key (HTTP 401/403) during a translation: the Commando Center hears of it once. */
  onAuthenticationFailed?: (account: Account, httpStatus: number) => void;
}

export interface JobRequest {
  accountId: string;
  kind: Kind;
  itemId: string;
  languages: string[];
  overwrite: boolean;
}

/** Errors that make every further language fail too: stop the job. */
const FATAL = new Set([
  'noApiKey',
  'auth',
  'limitExceeded',
  'unreachable',
  'notConnected',
  'hubspotAuth',
  'hubspotForbidden',
  'hubspotUnreachable',
  'itemMissing',
  'isTranslation',
  'noSourceLanguage',
]);

/** Items with a job running, so the same item isn't translated twice at once. */
const running = new Map<string, Promise<Job>>();

/** Starts the job and returns at once; `done` resolves when it has finished. */
export async function startJob(deps: JobDeps, request: JobRequest): Promise<{ job: Job; done: Promise<Job> }> {
  const key = `${request.accountId}|${request.kind}|${request.itemId}`;
  const job: Job = {
    id: newJobId(),
    accountId: request.accountId,
    status: 'running',
    kind: request.kind,
    itemId: request.itemId,
    itemTitle: '',
    languages: [...new Set(request.languages)],
    overwrite: request.overwrite,
    items: [],
    createdAt: new Date().toISOString(),
  };
  await deps.store.saveJob(job);
  const previous = running.get(key) ?? Promise.resolve(undefined);
  const done = previous
    .catch(() => undefined)
    .then(() => runJob(deps, job))
    .catch(async (error) => {
      console.error('Supertext: job failed', error);
      job.status = 'failed';
      job.error = errorInfo(error);
      job.finishedAt = new Date().toISOString();
      await deps.store.saveJob(job).catch(() => undefined);
      return job;
    })
    .finally(() => {
      if (running.get(key) === done) running.delete(key);
    });
  running.set(key, done);
  return { job, done };
}

/** An item ready to be translated: its metadata, draft, language and the versions the app made. */
export interface PreparedItem {
  client: HubSpotClient;
  source: Item;
  info: ContentSummary;
  draft: Item;
  /** HubSpot code of the item's language (or the account's content language). */
  itemLanguage: string;
  /** Versions the app recorded for the item (emails): language → ID. */
  own: Record<string, string>;
}

/**
 * Loads an item for translating (by API or from a translation file). Throws `itemMissing`,
 * `isTranslation` (a language version itself) or `noSourceLanguage`. `onName` hears the item's name early.
 */
export async function prepareItem(
  deps: Pick<JobDeps, 'store' | 'hubspot'>,
  account: Account,
  kind: Kind,
  itemId: string,
  onName?: (name: string) => Promise<void>,
): Promise<PreparedItem> {
  const client = deps.hubspot(account);
  const source = await getItem(client, kind, itemId);
  if (!source) throw new LocalizedError('The item no longer exists in HubSpot.', 'itemMissing');
  const info = summary(kind, source);
  await onName?.(info.name);
  const records = await deps.store.translations(account.accountId, kind);
  const madeByApp = [...records.values()].some((languages) => Object.values(languages).includes(info.id));
  if (info.isVariant || madeByApp) {
    throw new LocalizedError('This is a language version of another item. Translate its primary instead.', 'isTranslation');
  }
  const itemLanguage = info.language || hubspotCode(account.sourceLanguage);
  if (hasVariants(kind) && !itemLanguage) {
    throw new LocalizedError(
      'The item has no language in HubSpot. Set it there, or set the language of your content under Settings.',
      'noSourceLanguage',
    );
  }
  const draft = await getDraft(client, kind, info.id);
  return { client, source, info, draft, itemLanguage, own: records.get(info.id) ?? {} };
}

/** The language's existing version to update, if any (an email clone that was deleted or sent doesn't count). */
export async function existingVersion(item: PreparedItem, kind: Kind, language: string): Promise<string | undefined> {
  let existingId: string | undefined = hasVariants(kind) ? item.info.translations[hubspotCode(language)] : item.own[language];
  if (existingId && kind === 'email') {
    // A clone that was deleted, or sent already, is left alone: a new one is made.
    const existing = await getItem(item.client, kind, existingId);
    if (!existing || existing.archived === true || itemState(existing) !== 'draft') existingId = undefined;
  }
  return existingId;
}

export async function runJob(deps: JobDeps, job: Job): Promise<Job> {
  const { store } = deps;
  const account = await store.getAccount(job.accountId);
  if (!account) throw new LocalizedError('HubSpot is not connected.', 'notConnected');
  const supertext = deps.supertext(account);
  const { kind } = job;

  const prepared = await prepareItem(deps, account, kind, job.itemId, async (name) => {
    job.itemTitle = name;
    await store.saveJob(job);
  });
  const { client, source, info, draft, itemLanguage } = prepared;

  // The item's language, as Supertext knows it (the same for every target).
  let sourceLanguage: string;
  try {
    sourceLanguage = supertextSource(itemLanguage, account.languageCodes);
  } catch (error) {
    throw fromSdk(error);
  }

  for (const language of job.languages) {
    const item: JobItem = { language, state: 'kept' };
    try {
      if (sameLanguage(language, itemLanguage)) {
        throw new LocalizedError('This is the language of the item itself.', 'sameLanguage');
      }
      let target: string;
      try {
        target = supertextTarget(language, account.languageCodes);
      } catch (error) {
        throw fromSdk(error); // unsupportedLanguage: nothing is sent for this language
      }
      const existingId = await existingVersion(prepared, kind, language);
      const result = await translateItem({
        client,
        // Translation review on for this language: through the review service, else directly.
        supertext: supertext.forReview(account.reviewLanguages.includes(language)),
        kind,
        source,
        draft,
        existingId,
        language,
        supertextTarget: target,
        sourceLanguage,
        // Formal/informal only where Supertext offers it for the target.
        politeness: supportsPoliteness(target) ? account.tone : 'default',
        overwrite: job.overwrite,
        primaryLanguage: itemLanguage,
      });
      Object.assign(item, result);
      if (result.targetId && result.state !== 'kept') {
        await store.saveTranslation(account.accountId, {
          kind,
          sourceId: info.id,
          language,
          targetId: result.targetId,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      const failure: ErrorInfo = errorInfo(error);
      item.state = 'failed';
      item.error = failure;
      if (failure.code === 'auth') {
        const status = (error as { status?: number }).status;
        deps.onAuthenticationFailed?.(account, status === 403 ? 403 : 401);
      }
      if (failure.code && FATAL.has(failure.code)) {
        job.items.push(item);
        return finish(store, job, 'failed', failure);
      }
    }
    job.items.push(item);
    await store.saveJob(job);
  }
  return finish(store, job, 'done');
}

async function finish(store: Store, job: Job, status: Job['status'], error?: ErrorInfo): Promise<Job> {
  job.status = status;
  if (error) job.error = error;
  job.finishedAt = new Date().toISOString();
  await store.saveJob(job);
  return job;
}

/** Totals for the summary line. */
export function jobTotals(job: Job): { created: number; updated: number; kept: number; failed: number } {
  const count = (state: JobItem['state']) => job.items.filter((item) => item.state === state).length;
  return { created: count('created'), updated: count('updated'), kept: count('kept'), failed: count('failed') };
}
