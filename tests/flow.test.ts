import { SDK_VERSION } from 'supertext-sdk';
import { describe, expect, it } from 'vitest';
import { PORTAL_ID, setup, STANDARD_SETTINGS } from './helpers.js';

/** The language version of `sourceId` in `language`, as the stand-in has it now. */
const version = (env: ReturnType<typeof setup>, kind: Parameters<ReturnType<typeof setup>['hubspot']['items']>[0], sourceId: string, language: string) =>
  env.hubspot.items(kind).find((item) => item.language === language && (item.translatedFromId === sourceId || item.translationOfId === sourceId || item.clonedFrom === sourceId));

describe('connecting HubSpot', () => {
  it('installs through OAuth and opens the settings', async () => {
    const env = setup();
    const start = await env.request('/');
    expect(await start.text()).toContain('Connect HubSpot');
    const begin = await env.request('/oauth/start');
    const location = new URL(begin.headers.get('location')!);
    expect(location.origin + location.pathname).toBe('https://hubspot.test/oauth/authorize');
    expect(location.searchParams.get('scope')).toBe('oauth content');
    expect(location.searchParams.get('optional_scope')).toBe('cms.knowledge_base.articles.read cms.knowledge_base.articles.write');
    expect(location.searchParams.get('redirect_uri')).toBe('https://app.test/oauth/callback');

    const done = await env.connect();
    expect(done.headers.get('location')).toBe('/settings');
    const account = await env.store.getAccount(PORTAL_ID);
    expect(account).toMatchObject({ accountName: 'swiss-chocolate.example', refreshToken: 'standin-refresh' });
    expect(account!.scopes).toContain('cms.knowledge_base.articles.write');
    const settings = await (await env.request('/settings')).text();
    expect(settings).toContain('swiss-chocolate.example');
    expect(settings).toContain('Knowledge base: connected.');
  });

  it('refuses a forged OAuth state', async () => {
    const env = setup();
    const response = await env.request('/oauth/callback?code=standin-code&state=forged');
    expect(response.headers.get('location')).toBe('/?error=session');
  });

  it('refuses API calls without a session or CSRF token', async () => {
    const env = setup();
    expect((await env.request('/api/jobs', { method: 'POST', body: '{}' })).status).toBe(401);
    await env.connect();
    const response = await env.request('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(403);
  });
});

describe('website pages', () => {
  it('makes a HubSpot language variant per language, as a draft, with modules translated', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const list = await (await env.request('/')).text();
    expect(list).toContain('About us');
    expect(list).toContain('Not translated');

    const { job, html } = await env.translate('site-page', '101', ['de-ch', 'fr-ch']);
    expect(job.status).toBe('done');
    expect(html).toContain('Done: 2 created, 0 updated, 0 kept, 0 failed.');
    expect(html).toContain(`https://app.hubspot.com/pages/${PORTAL_ID}/editor/`);

    const german = version(env, 'site-page', '101', 'de-ch')!;
    expect(german.state).toBe('DRAFT');
    expect(german.name).toBe('Über uns');
    expect(german.htmlTitle).toBe('Über Swiss Chocolate Co.');
    expect(german.metaDescription).toBe('Familienbetrieb für Schokolade in Bern seit 1932.');
    const widgets = german.widgets as Record<string, { body: Record<string, unknown> }>;
    expect(widgets.header_1.body.text).toBe('Seit 1932 in Bern gemacht');
    expect(widgets.header_1.body.heading_level).toBe('h1');
    expect(widgets.rich_text.body.html).toBe(
      '<h2>Unsere Geschichte</h2><p>Wir stellen in unserer Werkstatt in Bern <strong>Bean-to-Bar</strong>-Schokolade her. <a href="https://example.com/visit">Besuchen Sie uns</a> samstags.</p>',
    );
    expect(widgets.cta.body).toEqual({
      button_text: 'Jetzt bestellen',
      link: { url: { href: 'https://shop.example.com', type: 'EXTERNAL' } },
      style: { color: '#ff6e40' },
    });
    expect((widgets.hero_image.body.img as Record<string, unknown>).alt).toBe('Unsere Werkstatt in Bern');
    const cell = ((german.layoutSections as any).dnd_area.rows[0]['0'].params) as Record<string, unknown>;
    expect(cell).toEqual({ html: '<p>Jede Tafel wird von Hand verpackt.</p>', path: '@hubspot/rich_text', schema_version: 2, css_class: 'dnd-module' });
    expect(((german.layoutSections as any).dnd_area.label)).toBe('Main section');

    // One Supertext document per language, from the bare source language.
    expect(env.supertext.documents.map((d) => [d.source, d.target])).toEqual([
      ['en', 'de-CH'],
      ['en', 'fr-CH'],
    ]);
    // The original is unchanged.
    expect(env.hubspot.draft('101')!.name).toBe('About us');

    const after = await (await env.request('/?kind=site-page')).text();
    expect(after.match(/>Translated</g)?.length).toBe(2);
    expect(after).not.toContain('Über uns'); // variants aren't listed as items of their own
  });

  it('keeps existing versions unless asked to update their drafts', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.translate('site-page', '101', ['de-ch']);
    const german = version(env, 'site-page', '101', 'de-ch')!;
    const kept = await env.translate('site-page', '101', ['de-ch']);
    expect(kept.html).toContain('0 created, 0 updated, 1 kept');
    expect(env.supertext.documents.length).toBe(1);

    const updated = await env.translate('site-page', '101', ['de-ch', 'fr-ch'], true);
    expect(updated.html).toContain('1 created, 1 updated, 0 kept');
    expect(updated.job.items[0]).toMatchObject({ language: 'de-ch', state: 'updated', targetId: german.id });
    expect(env.hubspot.items('site-page').filter((item) => item.language === 'de-ch').length).toBe(1);
  });

  it('gives a page without a language the content language of the settings', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const { job } = await env.translate('site-page', '102', ['de-ch']);
    expect(job.status).toBe('done');
    const call = env.hubspot.requests.find((r) => r.path.endsWith('/create-language-variation'));
    expect(call?.body).toEqual({ id: '102', language: 'de-ch', primaryLanguage: 'en' });
    expect(version(env, 'site-page', '102', 'de-ch')!.name).toBe('Kontakt');
  });

  it('refuses to translate a language version itself', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.translate('site-page', '101', ['de-ch']);
    const german = version(env, 'site-page', '101', 'de-ch')!;
    const { job } = await env.translate('site-page', german.id, ['fr-ch']);
    expect(job).toMatchObject({ status: 'failed', error: { code: 'isTranslation' } });
  });
});

describe('landing pages', () => {
  it('keeps HubL personalization tokens and leaves forms alone', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.translate('landing-page', '201', ['fr-ch']);
    const french = version(env, 'landing-page', '201', 'fr-ch')!;
    const widgets = french.widgets as Record<string, { body: Record<string, unknown> }>;
    expect(widgets.rich_text.body.html).toBe(
      '<p>Bonjour {{ contact.firstname }}, notre calendrier de l’Avent peut être commandé.</p><p>Commandez avant le 30 novembre pour une livraison avant le 1er décembre.</p>',
    );
    expect(widgets.form.body).toEqual({ form_id: 'f0e1d2c3', response_type: 'inline' });
    expect(env.supertext.documents[0].html).toContain('<span data-hs="0"></span>');
    expect(env.supertext.documents[0].html).not.toContain('contact.firstname');
  });
});

describe('blog posts', () => {
  it("translates the body and fails only the language the blog doesn't have", async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings([...STANDARD_SETTINGS, ['target', 'it-ch']]);
    const { job, html } = await env.translate('blog-post', '301', ['de-ch', 'fr-ch', 'it-ch']);
    expect(job.status).toBe('done');
    expect(html).toContain('2 created, 0 updated, 0 kept, 1 failed');
    expect(job.items[2]).toMatchObject({ language: 'it-ch', state: 'failed', error: { code: 'blogLanguageMissing', params: { language: 'it-ch' } } });
    expect(html).toContain('The blog has no “it-ch” version in HubSpot yet, so nothing was translated for this language.');
    // HubSpot refused the version before anything was sent to Supertext.
    expect(env.supertext.documents.map((d) => d.target)).toEqual(['de-CH', 'fr-CH']);
    const german = version(env, 'blog-post', '301', 'de-ch')!;
    expect(german.name).toBe('Wie wir unsere Kakaobohnen rösten');
    expect(german.postBody).toBe(
      '<p>Das Rösten bringt das Aroma der Bohnen zur Geltung.</p><h2>Sanft und langsam</h2><p>Wir rösten <em>vierzig Minuten</em> lang bei 120 °C.</p>',
    );
    expect(german.postSummary).toBe('<p>Das Rösten bringt das Aroma der Bohnen zur Geltung.</p>');
    expect(german.featuredImageAltText).toBe('Unser Röster');
    expect(german.featuredImage).toBe('https://cdn.example.com/roaster.jpg');
  });
});

describe('marketing emails', () => {
  it('clones the email per language and translates subject, preview text, body and plain text', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const { job } = await env.translate('email', '401', ['de-ch']);
    expect(job.status).toBe('done');
    const clone = version(env, 'email', '401', 'de-ch')!;
    expect(clone.name).toBe('Autumn newsletter · DE-CH');
    expect(clone.subject).toBe('Unsere Herbstschokoladen sind da');
    const content = clone.content as Record<string, any>;
    expect(content.widgets.preview_text.body.value).toBe('Haselnuss, Marroni und Kürbisgewürz');
    expect(content.widgets['module-0-0-0'].body.html).toBe(
      '<p>Hallo {{ contact.firstname }},</p><p>Unsere Herbstkollektion ist eingetroffen: <a href="https://shop.example.com/autumn">alle Tafeln ansehen</a>.</p>',
    );
    expect(content.widgets.button.body).toEqual({ button_text: 'Jetzt einkaufen', destination: 'https://shop.example.com' });
    expect(content.plainTextVersion).toBe('Hallo {{ contact.firstname }},\n\nUnsere Herbstkollektion ist eingetroffen.\n\n{{ unsubscribe_link }}');
    expect(content.styleSettings).toEqual({ backgroundColor: '#ffffff', primaryAccentColor: '#ff6e40' });
    expect(content.flexAreas.main.sections[0].id).toBe('section-0');
    expect((clone.webversion as Record<string, unknown>).title).toBe('Herbst-Newsletter');

    // The list shows the clone as the original's translation, not as an email of its own.
    const list = await (await env.request('/?kind=email')).text();
    expect(list).toContain('Autumn newsletter');
    expect(list).not.toContain('Autumn newsletter · DE-CH');
    expect(list).toContain(`https://app.hubspot.com/email/${PORTAL_ID}/edit/${clone.id}/content`);

    // Translating a clone is refused; translating again updates the clone only when asked.
    expect((await env.translate('email', clone.id, ['fr-ch'])).job.error?.code).toBe('isTranslation');
    expect((await env.translate('email', '401', ['de-ch'])).job.items[0].state).toBe('kept');
    expect((await env.translate('email', '401', ['de-ch'], true)).job.items[0]).toMatchObject({ state: 'updated', targetId: clone.id });
  });

  it('makes a new clone when the earlier one was sent', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.translate('email', '401', ['de-ch']);
    const first = version(env, 'email', '401', 'de-ch')!;
    env.hubspot.setState(first.id, 'PUBLISHED');
    const { job } = await env.translate('email', '401', ['de-ch']);
    expect(job.items[0].state).toBe('created');
    expect(job.items[0].targetId).not.toBe(first.id);
    expect((await env.store.translations(PORTAL_ID, 'email')).get('401')).toEqual({ 'de-ch': job.items[0].targetId });
    expect(env.hubspot.draft(first.id)!.subject).toBe('Unsere Herbstschokoladen sind da');
  });
});

describe('knowledge base', () => {
  it('creates the article translation linked to the primary', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const list = await (await env.request('/?kind=kb-article')).text();
    expect(list).toContain('How do I track my order?');
    const { job } = await env.translate('kb-article', '501', ['de-ch']);
    expect(job.status).toBe('done');
    const german = version(env, 'kb-article', '501', 'de-ch')!;
    expect(german).toMatchObject({
      title: 'Wie verfolge ich meine Bestellung?',
      subtitle: 'Finden Sie Ihr Paket mit wenigen Klicks',
      metaDescription: 'Ihre Schokoladenbestellung verfolgen',
      path: 'track-my-order',
      state: 'DRAFT',
      translationOfId: '501',
      tagIds: [11],
    });
    expect(german.body).toBe(
      '<p>Sie erhalten einen Tracking-Link per E-Mail, sobald Ihre Bestellung versandt wird.</p><ol><li>Öffnen Sie die E-Mail.</li><li>Klicken Sie auf <strong>Paket verfolgen</strong>.</li></ol>',
    );
    // HubSpot lists articles' translations as a list; the app reads it.
    const again = await (await env.request('/?kind=kb-article')).text();
    expect(again).toContain(`/knowledge/${PORTAL_ID}/edit/${german.id}`);
  });

  it('is only offered when the account granted its scopes', async () => {
    const env = setup();
    env.hubspot.withoutKnowledgeBase();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const page = await (await env.request('/')).text();
    expect(page).not.toContain('Knowledge base');
    expect(await (await env.request('/?kind=kb-article')).text()).toContain('The knowledge base isn&#39;t connected');
    const refused = await env.api('POST', '/api/jobs', { kind: 'kb-article', itemId: '501', languages: ['de-ch'] });
    expect(refused.status).toBe(400);
    expect(await (await env.request('/settings')).text()).toContain('Knowledge base: not connected');
  });
});

describe('languages', () => {
  it('sends nothing for a language without a Supertext code, and uses the mapping where there is one', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings([
      ['sourceLanguage', 'en'],
      ['target', 'fr-be'],
      ['target', 'it'],
      ['code:it', 'it-ch'],
      ['tone', 'more'],
    ]);
    const settings = await (await env.request('/settings')).text();
    expect(settings).toContain('These languages have no Supertext code yet');
    const { job } = await env.translate('landing-page', '201', ['fr-be', 'it']);
    expect(job.items[0]).toMatchObject({ language: 'fr-be', state: 'failed', error: { code: 'unsupportedLanguage', params: { code: 'fr-be' } } });
    expect(job.items[1]).toMatchObject({ language: 'it', state: 'created' });
    expect(env.supertext.documents.map((d) => [d.target, d.politeness])).toEqual([['it-CH', 'more']]);
    expect(version(env, 'landing-page', '201', 'it')!.htmlTitle).toBe('Calendario dell’Avvento 2026');
  });

  it("refuses codes Supertext doesn't offer", async () => {
    const env = setup();
    await env.connect();
    const saved = await env.saveSettings([['target', 'de'], ['code:de', 'de-XX']]);
    expect(saved.headers.get('location')).toContain('invalid=de-XX');
    expect((await env.store.getAccount(PORTAL_ID))!.languageCodes).toEqual({});
  });

  it('offers the Supertext codes as a dropdown, the same language first', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings([['target', 'de'], ['target', 'de-ch'], ['code:de', 'de-DE']]);
    const html = await (await env.request('/settings')).text();
    const row = (code: string) => html.slice(html.indexOf(`name="code:${code}"`), html.indexOf('</select>', html.indexOf(`name="code:${code}"`)));
    expect(row('de')).toContain('<option value="de-DE" selected');
    expect(row('de').indexOf('gsw-u-sd-chzh')).toBeLessThan(row('de').indexOf('All Supertext languages'));
    // Nothing saved: the exact match or the SDK's default is preselected, else "— choose —".
    expect(row('de-ch')).toContain('<option value="de-CH" selected');
    expect(row('zh-cn')).toContain('<option value="zh-Hans" selected');
    expect(row('zh-cn')).not.toContain('— choose —');
    expect(row('zh-cn')).toMatch(/Suggested[\s\S]*zh-Hans[\s\S]*zh-Hant[\s\S]*All Supertext/);
    expect(row('fr-be')).toContain('<option value="" selected="">— choose —');
    expect(html).not.toContain('<datalist');
  });
});

describe('interface language', () => {
  it('follows the browser, and Settings can choose another one for this browser only', async () => {
    const env = setup();
    await env.connect();
    const english = await (await env.request('/settings')).text();
    expect(english).toContain('Automatic (your browser’s language)');
    expect(english).not.toContain('class="langs"'); // no switcher in the header any more
    await env.saveSettings([...STANDARD_SETTINGS, ['uiLanguage', 'de']]);
    const german = await (await env.request('/settings')).text();
    expect(german).toContain('Supertext-Einstellungen');
    expect(german).toMatch(/<option value="de" lang="de" selected/);
    expect(await (await env.request('/')).text()).toContain('Mit Supertext übersetzen');
    await env.saveSettings([...STANDARD_SETTINGS, ['uiLanguage', 'auto']]);
    expect(await (await env.request('/settings')).text()).toContain('Supertext settings');
  });

  it('offers the four languages as links on the connect page', async () => {
    const env = setup();
    const page = await (await env.request('/')).text();
    expect(page).toContain('href="/?lang=fr"');
    expect(await (await env.request('/?lang=fr')).text()).toContain('Connecter HubSpot');
  });
});

describe('HubSpot tokens', () => {
  it('refreshes an expired access token and goes on', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    env.hubspot.expireTokens();
    const { job } = await env.translate('site-page', '101', ['de-ch']);
    expect(job.status).toBe('done');
    expect((await env.store.getAccount(PORTAL_ID))!.accessToken).not.toBe('standin-token-1');
  });

  it('forgets the tokens when HubSpot refuses the refresh token (app uninstalled)', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    env.hubspot.revoke();
    const page = await (await env.request('/')).text();
    expect(page).toContain('HubSpot refused the connection');
    expect((await env.store.getAccount(PORTAL_ID))!.refreshToken).toBe('');
    expect(await (await env.request('/')).text()).toContain('Connect HubSpot');
  });
});

describe('disconnecting', () => {
  it('deletes the account and its data', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.translate('site-page', '101', ['de-ch']);
    const form = new URLSearchParams({ csrf: await env.csrf() });
    const response = await env.request('/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    expect(response.headers.get('location')).toBe('/?disconnected=1');
    expect(await env.store.getAccount(PORTAL_ID)).toBeUndefined();
    expect(await env.store.recentJobs(PORTAL_ID, 5)).toEqual([]);
  });
});

describe('Commando Center', () => {
  it('checks the key and reports "installed", then "settings_saved", with the account as the site', async () => {
    const env = setup();
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.saveSettings(STANDARD_SETTINGS);
    await env.settle();
    expect(env.supertext.reports.map((report) => report.event)).toEqual(['installed', 'settings_saved', 'settings_saved']);
    const [installed] = env.supertext.reports;
    expect(installed).toMatchObject({
      schema: 1,
      event: 'installed',
      site_url: `https://app.hubspot.com/settings/${PORTAL_ID}`,
      plugin: { name: 'HubSpot-Supertext-Translation' },
      system: { name: 'HubSpot' },
      runtime: { name: 'Node.js' },
      api_key_configured: true,
      api_key_check: { status: 'ok' },
      sdk_version: SDK_VERSION,
    });
    expect(installed).not.toHaveProperty('callback');
    expect(JSON.stringify(env.supertext.reports)).not.toContain('server-key');
    expect(JSON.stringify(env.supertext.reports)).not.toContain('swiss-chocolate');
    const page = await (await env.request('/settings')).text();
    expect(page).toContain('API key checked: the connection to Supertext works.');
  });

  it('sends nothing when the setting is off, but still checks the key', async () => {
    const env = setup({ SUPERTEXT_VERSION_REPORTS: '0' });
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    await env.request('/');
    await env.settle();
    expect(env.supertext.reports).toEqual([]);
    expect(await (await env.request('/settings')).text()).toContain('API key checked');
  });

  it('reports a key Supertext rejects during a translation once', async () => {
    const env = setup({ SUPERTEXT_API_KEY: 'invalid' });
    await env.connect();
    await env.saveSettings(STANDARD_SETTINGS);
    const { job } = await env.translate('site-page', '101', ['de-ch', 'fr-ch']);
    expect(job).toMatchObject({ status: 'failed', error: { code: 'auth' } });
    expect(job.items.length).toBe(1);
    // The version made before translating was removed again (archived, as HubSpot does).
    expect(version(env, 'site-page', '101', 'de-ch')?.archived).toBe(true);
  });
});
