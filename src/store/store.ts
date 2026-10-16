import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ReporterState } from 'supertext-plugin-health';
import type { Tokens } from '../hubspot/client.js';
import type { Kind } from '../hubspot/content.js';
import type { ErrorInfo } from '../i18n/error.js';
import type { Politeness } from '../supertext/client.js';

/** A connected HubSpot account and its settings, keyed by HubSpot's account ID (hub ID). */
export interface Account {
  accountId: string;
  /** Shown in the app (the account's domain as HubSpot reports it). */
  accountName: string;
  /** OAuth tokens ('' after HubSpot refused them: the account has to connect again). Written only by `saveTokens`. */
  accessToken: string;
  refreshToken: string;
  /** Unix milliseconds. */
  tokenExpiresAt: number;
  /** The scopes HubSpot granted (the knowledge base needs its own, Service Hub Professional+). */
  scopes: string[];
  /** The account's own Supertext API key ('' = use SUPERTEXT_API_KEY). */
  apiKey: string;
  tone: Politeness;
  /** HubSpot code of the content's language, used where an item has none set ("en"); '' = let Supertext detect it. */
  sourceLanguage: string;
  /** HubSpot codes of the languages to translate into, in the order shown. */
  targets: string[];
  /**
   * The language mapping: HubSpot code → Supertext code ("de" → "de-CH"), one for both
   * directions. A language without one is sent only if its HubSpot code is a Supertext code
   * as it is ("de-ch", "es"); otherwise it fails with `unsupportedLanguage`.
   */
  languageCodes: Record<string, string>;
  /** "Send version information to Supertext" (SUPERTEXT_VERSION_REPORTS=0 turns it off for all accounts). */
  versionReports: boolean;
  /** The Commando Center reporter's state (Plugin Health's ReporterState JSON); see reporting.ts. */
  reporter?: ReporterState | null;
  connectedAt: string;
}

export const defaultAccount = (accountId: string): Account => ({
  accountId,
  accountName: '',
  accessToken: '',
  refreshToken: '',
  tokenExpiresAt: 0,
  scopes: [],
  apiKey: '',
  tone: 'default',
  sourceLanguage: 'en',
  targets: [],
  languageCodes: {},
  versionReports: true,
  reporter: null,
  connectedAt: new Date().toISOString(),
});

/** A language version the app made: source item × language → the version's ID. */
export interface Translation {
  kind: Kind;
  sourceId: string;
  language: string;
  targetId: string;
  updatedAt: string;
}

export type ResultState = 'created' | 'updated' | 'kept' | 'failed';

export interface JobItem {
  language: string;
  state: ResultState;
  targetId?: string;
  error?: ErrorInfo;
}

export interface Job {
  id: string;
  accountId: string;
  status: 'running' | 'done' | 'failed';
  kind: Kind;
  itemId: string;
  itemTitle: string;
  languages: string[];
  overwrite: boolean;
  items: JobItem[];
  /** Set when the whole job stopped (authentication, limit, HubSpot errors). */
  error?: ErrorInfo;
  createdAt: string;
  finishedAt?: string;
}

export interface Store {
  getAccount(accountId: string): Promise<Account | undefined>;
  /** Saves the settings; keeps the stored tokens (only `saveTokens` writes them) and `reporter` (only `saveReporterState`). */
  saveAccount(account: Account): Promise<void>;
  /** Stores new tokens (null: forget them, the account has to connect again). */
  saveTokens(accountId: string, tokens: Tokens | null): Promise<void>;
  /** Stores only the reporter's state, so a report finishing late never overwrites newer settings. */
  saveReporterState(accountId: string, state: ReporterState): Promise<void>;
  /** Forgets everything about the account: settings, tokens, translations, jobs. */
  deleteAccount(accountId: string): Promise<void>;

  /** The language versions the app made for one kind: source ID → language → version ID. */
  translations(accountId: string, kind: Kind): Promise<Map<string, Record<string, string>>>;
  saveTranslation(accountId: string, translation: Translation): Promise<void>;

  saveJob(job: Job): Promise<void>;
  getJob(accountId: string, id: string): Promise<Job | undefined>;
  recentJobs(accountId: string, limit: number): Promise<Job[]>;
  /** Jobs still "running" after a restart are marked failed. */
  failRunningJobs(error: ErrorInfo): Promise<void>;
}

export const newJobId = (): string => randomUUID();

/** AES-256-GCM for stored tokens and API keys. */
export class Secrets {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret) throw new Error('An encryption key or the HubSpot client secret is required.');
    this.key = createHash('sha256').update(`supertext-hubspot:${secret}`).digest();
  }

  encrypt(value: string): string {
    if (!value) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
  }

  decrypt(value: string): string {
    if (!value) return '';
    const [version, iv, tag, data] = value.split(':');
    if (version !== 'v1' || !iv || !tag || !data) return '';
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }
}

/** In-memory store: tests, local development without a database, screenshots. */
export class MemoryStore implements Store {
  private readonly accounts = new Map<string, Account>();
  private readonly records = new Map<string, Translation[]>();
  private readonly jobs = new Map<string, Job>();

  async getAccount(accountId: string) {
    const account = this.accounts.get(accountId);
    return account ? structuredClone(account) : undefined;
  }

  async saveAccount(account: Account) {
    const stored = this.accounts.get(account.accountId);
    this.accounts.set(account.accountId, {
      ...structuredClone(account),
      accessToken: stored?.accessToken ?? '',
      refreshToken: stored?.refreshToken ?? '',
      tokenExpiresAt: stored?.tokenExpiresAt ?? 0,
      reporter: stored?.reporter ?? null,
    });
  }

  async saveTokens(accountId: string, tokens: Tokens | null) {
    const account = this.accounts.get(accountId);
    if (!account) return;
    account.accessToken = tokens?.accessToken ?? '';
    account.refreshToken = tokens?.refreshToken ?? '';
    account.tokenExpiresAt = tokens?.expiresAt ?? 0;
  }

  async saveReporterState(accountId: string, state: ReporterState) {
    const account = this.accounts.get(accountId);
    if (account) account.reporter = structuredClone(state);
  }

  async deleteAccount(accountId: string) {
    this.accounts.delete(accountId);
    this.records.delete(accountId);
    for (const [id, job] of this.jobs) if (job.accountId === accountId) this.jobs.delete(id);
  }

  async translations(accountId: string, kind: Kind) {
    const result = new Map<string, Record<string, string>>();
    for (const t of this.records.get(accountId) ?? []) {
      if (t.kind !== kind) continue;
      result.set(t.sourceId, { ...(result.get(t.sourceId) ?? {}), [t.language]: t.targetId });
    }
    return result;
  }

  async saveTranslation(accountId: string, translation: Translation) {
    const list = (this.records.get(accountId) ?? []).filter(
      (t) => !(t.kind === translation.kind && t.sourceId === translation.sourceId && t.language === translation.language),
    );
    list.push(structuredClone(translation));
    this.records.set(accountId, list);
  }

  async saveJob(job: Job) {
    this.jobs.set(job.id, structuredClone(job));
  }

  async getJob(accountId: string, id: string) {
    const job = this.jobs.get(id);
    return job && job.accountId === accountId ? structuredClone(job) : undefined;
  }

  async recentJobs(accountId: string, limit: number) {
    return [...this.jobs.values()]
      .filter((job) => job.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((job) => structuredClone(job));
  }

  async failRunningJobs(error: ErrorInfo) {
    for (const job of this.jobs.values()) {
      if (job.status === 'running') Object.assign(job, { status: 'failed', error, finishedAt: new Date().toISOString() });
    }
  }
}
