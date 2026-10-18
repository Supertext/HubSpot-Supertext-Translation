import { TranslationFiles } from 'supertext-sdk';
import { describe, expect, it } from 'vitest';
import { basePath } from '../src/hubspot/content.js';
import { formatReference, MAX_UPLOAD_BYTES, parseReference } from '../src/translation/files.js';
import { PORTAL_ID, setup, STANDARD_SETTINGS } from './helpers.js';

type Env = ReturnType<typeof setup>;

const version = (env: Env, kind: Parameters<Env['hubspot']['items']>[0], sourceId: string, language: string) =>
  env.hubspot.items(kind).find((item) => item.language === language && (item.translatedFromId === sourceId || item.clonedFrom === sourceId));

/** Translates every unit of an XLIFF file: `<target>` = fn(source content), inline codes kept. */
const translateXliff = (xliff: string, fn: (source: string, id: string) => string | null) =>
  xliff.replace(/<trans-unit id="([^"]+)"([^>]*)>\s*<source>([\s\S]*?)<\/source>/g, (all, id: string, attrs: string, src: string) => {
    const target = fn(src, id);
    return target === null ? all : `<trans-unit id="${id}"${attrs}>\n<source>${src}</source><target>${target}</target>`;
  });

async function ready() {
  const env = setup();
  await env.connect();
  await env.saveSettings(STANDARD_SETTINGS);
  return env;
}

const exportFile = (env: Env, body: Record<string, unknown>) => env.api('POST', '/api/export', body);

async function importFile(env: Env, content: string, options: { includeChanged?: boolean; overwrite?: boolean } = {}) {
  const form = new FormData();
  form.set('csrf', await env.csrf());
  form.set('file', new File([content], 'translated.xlf'));
  if (options.includeChanged) form.set('includeChanged', '1');
  if (options.overwrite !== false) form.set('overwrite', '1');
  const response = await env.request('/import', { method: 'POST', body: form });
  return { status: response.status, html: await response.text() };
}

/** Writes to an item's draft in the stand-in, as an editor in HubSpot would. */
async function editDraft(env: Env, id: string, fields: Record<string, unknown>) {
  const account = await env.store.getAccount(PORTAL_ID);
  await env.fetchFn(`https://hubspot.test${basePath('site-page')}/${id}/draft`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${account!.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

describe('references', () => {
  it('round-trip account, kind, item and language', () => {
    const ref = { accountId: PORTAL_ID, kind: 'site-page' as const, itemId: '101', language: 'de-ch' };
    expect(formatReference(ref)).toBe(`${PORTAL_ID}:site-page:101:de-ch`);
    expect(parseReference(formatReference(ref))).toEqual(ref);
  });

  it.each(['', 'page:12', `${PORTAL_ID}:page:101:de-ch`, `${PORTAL_ID}:site-page::de-ch`, '%E0:site-page:1:de'])('refuses %j', (ref) => {
    expect(parseReference(ref)).toBeNull();
  });
});

describe('export for translation', () => {
  it('downloads XLIFF with the extraction keys and the mapped languages, without calling Supertext', async () => {
    const env = await ready();
    const response = await exportFile(env, { kind: 'site-page', itemId: '101', languages: ['de-ch', 'fr-ch'], format: 'xliff' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-xliff+xml');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="hubspot-101.xlf"');
    const files = TranslationFiles.read(await response.text());
    expect(files.map((f) => [f.plugin, f.reference, f.sourceLanguage, f.targetLanguage])).toEqual([
      ['HubSpot-Supertext-Translation', `${PORTAL_ID}:site-page:101:de-ch`, 'en', 'de-CH'],
      ['HubSpot-Supertext-Translation', `${PORTAL_ID}:site-page:101:fr-ch`, 'en', 'fr-CH'],
    ]);
    const keys = files[0].units.map((u) => u.key);
    expect(keys).toEqual(expect.arrayContaining(['name', 'htmlTitle', 'metaDescription', 'widgets.rich_text.body.html.0', 'widgets.cta.body.button_text']));
    expect(new Set(keys).size).toBe(keys.length);
    expect(env.supertext.documents).toEqual([]);
  });

  it('keeps HubL as protected codes and needs exactly one language for HTML', async () => {
    const env = await ready();
    const html = await exportFile(env, { kind: 'landing-page', itemId: '201', languages: ['de-ch'], format: 'html' });
    expect(html.headers.get('Content-Disposition')).toBe('attachment; filename="hubspot-201-de-ch.html"');
    const body = await html.text();
    expect(body).toContain('<span data-hs="0"></span>');
    expect(body).not.toContain('{{ contact.firstname }}');

    const two = await exportFile(env, { kind: 'landing-page', itemId: '201', languages: ['de-ch', 'fr-ch'], format: 'html' });
    expect(two.status).toBe(400);
    expect(((await two.json()) as { error: { message: string } }).error.message).toBe('Choose exactly one language for an HTML file.');
  });
});

describe('import translation', () => {
  it('writes a new language variant as a draft, like a Supertext translation', async () => {
    const env = await ready();
    const xliff = await (await exportFile(env, { kind: 'site-page', itemId: '101', languages: ['de-ch'], format: 'xliff' })).text();
    const result = await importFile(env, translateXliff(xliff, (s) => `DE ${s}`));
    expect(result.status).toBe(200);
    expect(result.html).toContain('New version (draft)');
    expect(result.html).toMatch(/Imported: \d+/);
    const german = version(env, 'site-page', '101', 'de-ch')!;
    expect(german.state).toBe('DRAFT');
    expect(german.name).toBe('DE About us');
    expect((german.widgets as any).rich_text.body.html).toContain('<strong>');
    expect(env.supertext.documents).toEqual([]);
    expect(env.hubspot.draft('101')!.name).toBe('About us');
  });

  it('refuses a translation that loses HubL and keeps the tokens of the others', async () => {
    const env = await ready();
    const xliff = await (await exportFile(env, { kind: 'landing-page', itemId: '201', languages: ['de-ch'], format: 'xliff' })).text();
    const file = translateXliff(xliff, (s, id) => (id === 'widgets.rich_text.body.html.0' ? 'Hallo, unser Adventskalender ist da.' : `DE ${s}`));
    const result = await importFile(env, file);
    expect(result.html).toContain('Formatting changed, not imported: 1');
    const german = version(env, 'landing-page', '201', 'de-ch')!;
    expect((german.widgets as any).rich_text.body.html).toContain('{{ contact.firstname }}');
  });

  it('keeps existing versions unless asked to update them, and keeps their own text where nothing is imported', async () => {
    const env = await ready();
    await env.translate('site-page', '101', ['de-ch']);
    const german = version(env, 'site-page', '101', 'de-ch')!;
    const xliff = await (await exportFile(env, { kind: 'site-page', itemId: '101', languages: ['de-ch'], format: 'xliff' })).text();
    const file = translateXliff(xliff, (s, id) => (id === 'name' ? 'Wer wir sind' : null));

    const kept = await importFile(env, file, { overwrite: false });
    expect(kept.html).toContain('Version exists, kept');
    expect(version(env, 'site-page', '101', 'de-ch')!.name).toBe('Über uns');

    const updated = await importFile(env, file);
    expect(updated.html).toContain('Draft updated');
    expect(updated.html).toContain('Imported: 1');
    expect(updated.html).toMatch(/Not translated in the file: \d+/);
    const after = version(env, 'site-page', '101', 'de-ch')!;
    expect(after.id).toBe(german.id);
    expect(after.name).toBe('Wer wir sind');
    expect(after.htmlTitle).toBe('Über Swiss Chocolate Co.'); // untranslated in the file: the version's own text
  });

  it('imports texts whose source changed only with the option', async () => {
    const env = await ready();
    const xliff = await (await exportFile(env, { kind: 'site-page', itemId: '101', languages: ['fr-ch'], format: 'xliff' })).text();
    const file = translateXliff(xliff, (s) => `FR ${s}`);
    await editDraft(env, '101', { name: 'About us, new' });

    const skipped = await importFile(env, file);
    expect(skipped.html).toContain('Skipped, source changed since the export: 1');
    expect(version(env, 'site-page', '101', 'fr-ch')!.name).toBe('About us, new');

    const included = await importFile(env, file, { includeChanged: true });
    expect(included.html).not.toContain('Skipped');
    expect(version(env, 'site-page', '101', 'fr-ch')!.name).toBe('FR About us');
  });

  it('refuses files of other systems, other accounts, unknown items and languages the site lacks', async () => {
    const env = await ready();
    const job = (plugin: string, reference: string) => ({
      plugin,
      reference,
      sourceLanguage: 'en',
      targetLanguage: 'de-CH',
      segments: [{ key: 'name', text: 'About us', html: true }],
    });
    const file = translateXliff(
      TranslationFiles.exportXliff([
        job('Mailchimp-Supertext-Translation', 'x'),
        job('HubSpot-Supertext-Translation', `999:site-page:101:de-ch`),
        job('HubSpot-Supertext-Translation', `${PORTAL_ID}:site-page:777:de-ch`),
        job('HubSpot-Supertext-Translation', `${PORTAL_ID}:site-page:101:it-ch`),
      ]),
      (s) => `X ${s}`,
    );
    const result = await importFile(env, file);
    expect(result.html).toContain('This file belongs to another system (Mailchimp-Supertext-Translation).');
    expect(result.html.match(/The item this file was exported from no longer exists\./g)?.length).toBe(2);
    expect(result.html).toContain('The site has no language it-ch.');
    expect(env.hubspot.items('site-page').filter((item) => item.translatedFromId === '101')).toEqual([]);
  });

  it('reports unreadable and too large files, and needs the session and its CSRF token', async () => {
    const env = await ready();
    expect((await importFile(env, 'hello')).html).toContain('This file isn&#39;t a valid XLIFF or HTML translation file.');
    const big = await env.request('/import', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(MAX_UPLOAD_BYTES + 100_000) },
      body: '--x--',
    });
    expect(await big.text()).toContain('The file is too large (at most 10 MB).');

    const form = new FormData();
    form.set('csrf', 'forged');
    form.set('file', new File(['<xliff/>'], 'a.xlf'));
    const forged = await env.request('/import', { method: 'POST', body: form });
    expect(forged.headers.get('location')).toBe('/?error=session');
    env.clearCookies();
    expect((await env.request('/import')).headers.get('location')).toBe('/');
  });
});
