/**
 * Looks at a real HubSpot account, read-only: lists a few items of each kind with
 * their language and language versions, and shows how the app would split one item
 * into Supertext segments. Nothing is written to HubSpot and nothing is sent to Supertext.
 *
 *   HUBSPOT_TOKEN=<private app token or OAuth access token> npm run hubspot:probe -- [kind id]
 *
 * A private app (HubSpot → Development → Legacy apps → Private app, scope `content`,
 * plus the knowledge base scopes for articles) gives a token for this.
 */
import { HubSpotClient } from '../src/hubspot/client.js';
import { extractItem, getDraft, getItem, isKind, KINDS, listItems, summary } from '../src/hubspot/content.js';

const token = process.env.HUBSPOT_TOKEN ?? '';
if (!token) {
  console.error('Set HUBSPOT_TOKEN (a private app token or an OAuth access token).');
  process.exit(1);
}
const client = new HubSpotClient({
  apiBase: process.env.HUBSPOT_API_BASE || 'https://api.hubapi.com',
  tokens: { accessToken: async () => token, refreshed: async () => token },
});

const [kind, id] = process.argv.slice(2);
if (kind && id && isKind(kind)) {
  const item = await getItem(client, kind, id);
  if (!item) throw new Error(`${kind} ${id} not found`);
  console.log(JSON.stringify(summary(kind, item), null, 2));
  const draft = await getDraft(client, kind, id);
  const { extraction } = extractItem(kind, draft);
  console.log(`\n${extraction.size} segments:`);
  extraction.segments.forEach((segment, i) => console.log(`${String(i).padStart(3)} ${segment.plain ? 'text' : 'html'}  ${segment.html}`));
  console.log('\nTop-level fields of the draft:', Object.keys(draft).sort().join(', '));
} else {
  for (const k of KINDS) {
    try {
      const page = await listItems(client, k, { limit: 5 });
      console.log(`\n${k}: ${page.total}`);
      for (const item of page.items) {
        const versions = Object.entries(item.translations).map(([language, vid]) => `${language}=${vid}`).join(' ');
        console.log(`  ${item.id}  [${item.language || '-'}] ${item.state}${item.isVariant ? ' (variant)' : ''}  ${item.name}  ${versions}`);
      }
    } catch (error) {
      console.log(`\n${k}: ${(error as Error).message} ${(error as { detail?: string }).detail ?? ''}`);
    }
  }
}
