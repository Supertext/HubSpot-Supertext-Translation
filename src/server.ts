import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { ensureDatabase, PostgresStore } from './store/postgres.js';
import { MemoryStore, Secrets, type Store } from './store/store.js';
import { VERSION } from './version.js';

const config = loadConfig();

async function main() {
  let store: Store;
  if (config.databaseUrl) {
    await ensureDatabase(config.databaseUrl);
    const postgres = new PostgresStore(
      config.databaseUrl,
      new Secrets(config.encryptionKey || config.hubspotClientSecret || 'local-development-only'),
    );
    await postgres.migrate();
    store = postgres;
  } else {
    console.warn('Supertext: DATABASE_URL is not set; settings and jobs are kept in memory only.');
    store = new MemoryStore();
  }
  await store.failRunningJobs({ message: 'The app restarted during the translation.', code: 'interrupted' });
  if (!config.hubspotClientId || !config.hubspotClientSecret) {
    console.warn('Supertext: HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET are not set; HubSpot cannot be connected.');
  }
  if (!config.sessionSecret) {
    console.warn('Supertext: SESSION_SECRET is not set; sessions are signed with a key derived from the client secret.');
  }

  const app = createApp({ config, store });
  const root = new URL('../public/', import.meta.url).pathname;
  app.use('/static/*', serveStatic({ root, rewriteRequestPath: (path) => path.replace(/^\/static/, '') }));

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`Supertext Translation for HubSpot ${VERSION} listening on port ${info.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
