import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en.js';
import { errorInfo } from '../src/i18n/error.js';
import { LOCALES, MESSAGES, localeFromRequest, resolveLocale, translator } from '../src/i18n/index.js';
import { SupertextClient } from '../src/supertext/client.js';
import { fromSdk } from '../src/supertext/client.js';
import {
  hubspotCode,
  languageName,
  resolvedTarget,
  sameLanguage,
  supertextCodeOf,
  supertextSource,
  supertextTarget,
  supportsPoliteness,
} from '../src/translation/languages.js';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const urls = (text: string) => [...text.matchAll(/https:\/\/\S+?(?=[\s;)]|\.?$|\. )/g)].map((m) => m[0]).sort();

describe('message files', () => {
  for (const locale of LOCALES) {
    const messages = MESSAGES[locale];

    it(`${locale} has exactly the English keys`, () => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
    });

    it(`${locale} keeps placeholders, URLs, "Supertext" and "HubSpot"`, () => {
      for (const [key, english] of Object.entries(en)) {
        const text = messages[key as keyof typeof en];
        expect(text.trim(), key).not.toBe('');
        expect(placeholders(text), key).toEqual(placeholders(english));
        expect(urls(text), key).toEqual(urls(english));
        if (english.includes('Supertext')) expect(text, key).toContain('Supertext');
        if (english.includes('HubSpot')) expect(text, key).toContain('HubSpot');
      }
    });
  }

  it('keeps the agreed wording of the main action', () => {
    expect(MESSAGES.de['translate.submit']).toBe('Mit Supertext übersetzen');
    expect(MESSAGES.fr['translate.submit']).toBe('Traduire avec Supertext');
    expect(MESSAGES.it['translate.submit']).toBe('Traduci con Supertext');
  });
});

describe('locale', () => {
  it('uses the lang parameter, then the cookie, then Accept-Language, then English', () => {
    expect(localeFromRequest(new Request('https://app.test/?lang=de'))).toBe('de');
    expect(localeFromRequest(new Request('https://app.test/', { headers: { cookie: 'a=b; st_locale=it' } }))).toBe('it');
    expect(localeFromRequest(new Request('https://app.test/', { headers: { 'accept-language': 'ja, fr-CH;q=0.8' } }))).toBe('fr');
    expect(localeFromRequest(new Request('https://app.test/'))).toBe('en');
    expect(resolveLocale('pt-BR', 'de')).toBe('de');
  });
});

describe('translator', () => {
  it('fills placeholders and picks plural forms', () => {
    expect(translator('de').tn('translate.submitCount', 2)).toBe('In 2 Sprachen mit Supertext übersetzen');
    expect(translator('fr').tn('translate.submitCount', 1)).toBe('Traduire dans 1 langue avec Supertext');
  });

  it("translates errors and keeps the service's own detail", async () => {
    const client = new SupertextClient({
      apiKey: 'Supertext-Auth-Key wrong-key',
      fetch: (async () => new Response('{"detail":"bad key: wrong-key"}', { status: 401 })) as unknown as typeof fetch,
    });
    const info = errorInfo(await client.validate().catch((error) => error));
    expect(info.code).toBe('auth');
    // The SDK masks the key wherever the API echoes it.
    expect(translator('de').error(info)).toMatch(/^Authentifizierung fehlgeschlagen\..*\(\{"detail":"bad key: \*\*\*"\}\)$/);
    expect(translator('de').error(info)).not.toContain('wrong-key');
    expect(translator('it').error({ message: 'Something else' })).toBe('Something else');
  });
});

describe('languages', () => {
  it('names languages in the interface language', () => {
    expect(languageName('de', 'fr')).toBe('Allemand');
    expect(languageName('fr-ch', 'en')).toBe('Swiss French');
    expect(languageName('no', 'en')).toBe('Norwegian Bokmål');
    expect(languageName('zh-tw', 'de')).toMatch(/Chinesisch/);
  });

  it("sends the account's Supertext code, else an exact match, else the SDK's default", () => {
    expect(supertextTarget('de-ch', {})).toBe('de-CH');
    expect(supertextTarget('de', { de: 'de-CH' })).toBe('de-CH');
    expect(supertextTarget('es', {})).toBe('es');
    expect(supertextTarget('zh-cn', { 'zh-cn': 'zh-Hans' })).toBe('zh-Hans');
    expect(resolvedTarget('de', {})).toBe('de-DE');
    expect(resolvedTarget('zh-cn', {})).toBe('zh-Hans');
    expect(resolvedTarget('es-mx', {})).toBe('es');
    expect(resolvedTarget('no', {})).toBeNull();
    expect(resolvedTarget('fr-be', {})).toBeNull();
    expect(resolvedTarget('no', { no: 'nb' })).toBe('nb');
    const error = (() => {
      try {
        supertextTarget('fr-be', {});
      } catch (caught) {
        return fromSdk(caught) as { message: string; code: string; params: Record<string, string> };
      }
    })();
    expect(error?.code).toBe('unsupportedLanguage');
    expect(error?.params).toEqual({ code: 'fr-be' });
    expect(translator('it').error(error!)).toContain('«fr-be»');
  });

  it('accepts only Supertext codes as the mapping, in their exact form', () => {
    expect(supertextCodeOf('de_ch')).toBe('de-CH');
    expect(supertextCodeOf('ZH-hans')).toBe('zh-Hans');
    expect(supertextCodeOf('de')).toBeNull();
    expect(supertextCodeOf('fr-BE')).toBeNull();
  });

  it("sends the source as the bare language, also for HubSpot's regional codes", () => {
    expect(supertextSource('en', {})).toBe('en');
    expect(supertextSource('en-us', {})).toBe('en');
    expect(supertextSource('de-ch', {})).toBe('de');
    expect(supertextSource('pt', { pt: 'pt-BR' })).toBe('pt');
    expect(supertextSource('', {})).toBe('');
    expect(() => supertextSource('ar', {})).toThrow();
  });

  it('compares HubSpot codes regardless of case and separator', () => {
    expect(hubspotCode('de_CH')).toBe('de-ch');
    expect(sameLanguage('EN', 'en')).toBe(true);
    expect(sameLanguage('', '')).toBe(false);
  });

  it('offers formal and informal address only where Supertext does', () => {
    expect(supportsPoliteness('de-CH')).toBe(true);
    expect(supportsPoliteness('en-US')).toBe(false);
    expect(supportsPoliteness('xx')).toBe(false);
  });
});
