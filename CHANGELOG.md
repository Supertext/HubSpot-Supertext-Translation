# Changelog

All notable changes to Supertext Translation for HubSpot.

## Unreleased

First version, tested on a real HubSpot account (17 October 2026: installing with OAuth, token refresh, blog posts into language variants and updating their drafts) and against a stand-in of the HubSpot APIs; pages, emails and the knowledge base still to be tried on a real account.

- Hosted app installed in HubSpot with OAuth (`content` scope; the knowledge base scopes when the account has them). The HubSpot app definition is in `hubspot-project/` (developer platform 2026.09).
- Translates website pages, landing pages, blog posts, marketing emails and knowledge base articles with Supertext AI on the app's *Translate* page. Pages and posts become HubSpot language variants in the original's multi-language group, emails get one copy per language, articles a linked translation; everything as a draft, nothing published or sent.
- Translates titles, meta descriptions, subject line, preview text, plain-text version, rich text and the text fields of modules and drag-and-drop sections; keeps layout, images, links, forms and HubL / personalization tokens (refuses a translation that lost one).
- *Update existing versions* is ticked by default (with a warning that changes made by hand are replaced); unticked, existing language versions are kept. A sent email copy is never changed.
- Settings per HubSpot account: Supertext API key (stored encrypted, with account and API key links) with the automatic key check and *Test connection*, the content language, target languages with their Supertext codes chosen from a searchable dropdown of Supertext's languages (type part of a name or code), the same language's variants first, preselected with the exact code or the usual variant (German → `de-DE`, English → `en-US`, Chinese (China) → `zh-Hans`, Spanish (Mexico) → `es`), which also applies to a language nobody mapped; languages without one (`fr-be`, `en-au`, `no` …) show *— choose —* and aren't translated until chosen, form of address, *Send version information to Supertext* (Commando Center through Supertext Plugin Health 0.1.0; Supertext SDK 0.4.0), disconnecting, and the app version linked to its release.
- Recent translations with the result per language and links into HubSpot's editors.
- Supertext's look: the Supertext logo in a deep-green header, Supertext's colours, pill buttons and the Inter font (bundled), and the Supertext favicon.
- Interface in English, German, French and Italian, in the browser's language unless *Settings → Interface language* chooses another one for that browser (no language switch in the header), also on phones (the pages fit the screen; wide tables scroll inside their card; Save stays at the bottom of the settings). The stylesheet and script addresses change with every release, so browsers, Safari on iPhone included, load the new layout right away instead of a cached one.
- `npm run hubspot:probe` to look at a real account (read-only).
- A language version is made in HubSpot before its texts are translated, so a version HubSpot refuses (for example a blog without that language) costs no translation; *The blog has no “fr-ch” version in HubSpot yet* explains how to add it. A version made for a translation that then fails is removed again.
- Hosted on Railway at https://hubspot-production-ac4d.up.railway.app; the HubSpot app definition is uploaded by the *Upload HubSpot app* workflow.
