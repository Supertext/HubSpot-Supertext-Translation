/**
 * Runs the stand-in HubSpot (install page, OAuth and content APIs, port 8766)
 * and the stand-in Supertext API (port 8765) for local development, CI and the
 * screenshots.
 *
 *   npm run standin
 *   HUBSPOT_CLIENT_ID=standin HUBSPOT_CLIENT_SECRET=standin-secret \
 *   HUBSPOT_APP_BASE=http://127.0.0.1:8766 HUBSPOT_API_BASE=http://127.0.0.1:8766 \
 *   SUPERTEXT_API_ENDPOINT=http://127.0.0.1:8765/v1/ SUPERTEXT_API_KEY=any npm run dev
 *
 * Then open http://127.0.0.1:8080 and click Connect HubSpot: the stand-in
 * approves at once.
 */
import { serve } from '@hono/node-server';
import { createHubSpotStandin } from './hubspot.js';
import { createSupertextStandin } from './supertext.js';

const hubspotPort = Number(process.env.HUBSPOT_STANDIN_PORT || 8766);
const supertextPort = Number(process.env.SUPERTEXT_STANDIN_PORT || 8765);
const hubspot = createHubSpotStandin();
const supertext = createSupertextStandin();

serve({ fetch: (request) => hubspot.handle(request), port: hubspotPort, hostname: '127.0.0.1' });
serve({ fetch: (request) => supertext.handle(request), port: supertextPort, hostname: '127.0.0.1' });

console.log(
  `Stand-in HubSpot on http://127.0.0.1:${hubspotPort} (install page, OAuth, content APIs), stand-in Supertext API on http://127.0.0.1:${supertextPort}/v1/`,
);
