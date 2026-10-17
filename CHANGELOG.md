# Changelog

All notable changes to Supertext Translation for HubSpot.

## Unreleased

First version (in development: tested against a stand-in of the HubSpot APIs, not yet on a real account).

- Hosted app installed in HubSpot with OAuth (`content` scope; the knowledge base scopes when the account has them). The HubSpot app definition is in `hubspot-project/` (developer platform 2026.09).
- Translates website pages, landing pages, blog posts, marketing emails and knowledge base articles with Supertext AI on the app's *Translate* page. Pages and posts become HubSpot language variants in the original's multi-language group, emails get one copy per language, articles a linked translation; everything as a draft, nothing published or sent.
- Translates titles, meta descriptions, subject line, preview text, plain-text version, rich text and the text fields of modules and drag-and-drop sections; keeps layout, images, links, forms and HubL / personalization tokens (refuses a translation that lost one).
- Existing language versions are kept unless *Update existing versions* is ticked (with a warning); a sent email copy is never changed.
- Settings per HubSpot account: Supertext API key (stored encrypted, with account and API key links) with the automatic key check and *Test connection*, the content language, target languages with their Supertext codes (no guessed regions), form of address, *Send version information to Supertext* (Commando Center through Supertext Plugin Health 0.1.0; Supertext SDK 0.3.0), disconnecting, and the app version linked to its release.
- Recent translations with the result per language and links into HubSpot's editors.
- Interface in English, German, French and Italian, also on phones (the pages fit the screen; wide tables scroll inside their card; Save stays at the bottom of the settings).
- `npm run hubspot:probe` to look at a real account (read-only).
- Hosted on Railway at https://hubspot-production-ac4d.up.railway.app; the HubSpot app definition is uploaded by the *Upload HubSpot app* workflow.
