import pg from 'pg';
import type { ReporterState } from 'supertext-plugin-health';
import type { Tokens } from '../hubspot/client.js';
import type { Kind } from '../hubspot/content.js';
import type { ErrorInfo } from '../i18n/error.js';
import { defaultAccount, type Account, type Job, type Secrets, type Store, type Translation } from './store.js';

/**
 * PostgreSQL store (the shared Railway Postgres; its own database, created on
 * first start). Accounts keep the OAuth tokens and the Supertext key
 * encrypted; the other settings are JSON.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  token_expires_at BIGINT NOT NULL DEFAULT 0,
  api_key TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS translations (
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  language TEXT NOT NULL,
  target_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, kind, source_id, language)
);
CREATE TABLE IF NOT EXISTS translation_jobs (
  id UUID PRIMARY KEY,
  account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS translation_jobs_account ON translation_jobs (account_id, created_at DESC);
`;

/** Creates the database named in the URL if it doesn't exist (the shared server has several). */
export async function ensureDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!name || name === 'postgres') return;
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      console.log(`Created database ${name}.`);
    }
  } finally {
    await admin.end();
  }
}

interface AccountRow {
  account_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | number;
  api_key: string;
  data: Partial<Account>;
}

export class PostgresStore implements Store {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string, private readonly secrets: Secrets) {
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  }

  async migrate(): Promise<void> {
    await this.pool.query(SCHEMA);
  }

  private account(row: AccountRow): Account {
    return {
      ...defaultAccount(row.account_id),
      ...row.data,
      accountId: row.account_id,
      accessToken: this.secrets.decrypt(row.access_token),
      refreshToken: this.secrets.decrypt(row.refresh_token),
      tokenExpiresAt: Number(row.token_expires_at) || 0,
      apiKey: this.secrets.decrypt(row.api_key),
    };
  }

  async getAccount(accountId: string) {
    const { rows } = await this.pool.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
    return rows[0] ? this.account(rows[0] as AccountRow) : undefined;
  }

  async saveAccount(account: Account) {
    // Tokens are written only by saveTokens and the reporter's state only by saveReporterState:
    // a settings save that started before a token refresh or a background report finished must
    // not put back older values.
    const { accessToken: _a, refreshToken: _r, tokenExpiresAt: _e, apiKey, reporter: _reporter, ...data } = account;
    await this.pool.query(
      `INSERT INTO accounts (account_id, api_key, data, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (account_id) DO UPDATE SET api_key = $2,
         data = CASE WHEN accounts.data ? 'reporter' THEN $3::jsonb || jsonb_build_object('reporter', accounts.data->'reporter') ELSE $3::jsonb END,
         updated_at = now()`,
      [account.accountId, this.secrets.encrypt(apiKey), data],
    );
  }

  async saveTokens(accountId: string, tokens: Tokens | null) {
    await this.pool.query(
      'UPDATE accounts SET access_token = $2, refresh_token = $3, token_expires_at = $4, updated_at = now() WHERE account_id = $1',
      [
        accountId,
        this.secrets.encrypt(tokens?.accessToken ?? ''),
        this.secrets.encrypt(tokens?.refreshToken ?? ''),
        tokens?.expiresAt ?? 0,
      ],
    );
  }

  async saveReporterState(accountId: string, state: ReporterState) {
    await this.pool.query(
      `UPDATE accounts SET data = jsonb_set(data, '{reporter}', $2::jsonb, true) WHERE account_id = $1`,
      [accountId, JSON.stringify(state)],
    );
  }

  async deleteAccount(accountId: string) {
    for (const table of ['accounts', 'translations', 'translation_jobs']) {
      await this.pool.query(`DELETE FROM ${table} WHERE account_id = $1`, [accountId]);
    }
  }

  async translations(accountId: string, kind: Kind) {
    const { rows } = await this.pool.query(
      'SELECT source_id, language, target_id FROM translations WHERE account_id = $1 AND kind = $2',
      [accountId, kind],
    );
    const result = new Map<string, Record<string, string>>();
    for (const row of rows) {
      result.set(row.source_id, { ...(result.get(row.source_id) ?? {}), [row.language]: row.target_id });
    }
    return result;
  }

  async saveTranslation(accountId: string, translation: Translation) {
    await this.pool.query(
      `INSERT INTO translations (account_id, kind, source_id, language, target_id, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (account_id, kind, source_id, language) DO UPDATE SET target_id = $5, updated_at = $6`,
      [accountId, translation.kind, translation.sourceId, translation.language, translation.targetId, translation.updatedAt],
    );
  }

  async saveJob(job: Job) {
    await this.pool.query(
      `INSERT INTO translation_jobs (id, account_id, status, data, created_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET status = $3, data = $4`,
      [job.id, job.accountId, job.status, job, job.createdAt],
    );
  }

  async getJob(accountId: string, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const { rows } = await this.pool.query('SELECT data FROM translation_jobs WHERE id = $1 AND account_id = $2', [
      id,
      accountId,
    ]);
    return rows[0]?.data as Job | undefined;
  }

  async recentJobs(accountId: string, limit: number) {
    const { rows } = await this.pool.query(
      'SELECT data FROM translation_jobs WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2',
      [accountId, limit],
    );
    return rows.map((row) => row.data as Job);
  }

  async failRunningJobs(error: ErrorInfo) {
    const { rows } = await this.pool.query("SELECT data FROM translation_jobs WHERE status = 'running'");
    for (const row of rows) {
      const job = row.data as Job;
      await this.saveJob({ ...job, status: 'failed', error, finishedAt: new Date().toISOString() });
    }
  }
}
