// HubSpot content languages ↔ Supertext language codes.
//
// HubSpot gives each page, post, email and article a language code in lower
// case, bare or with a region ("de", "de-ch", "zh-tw"); language variants are
// keyed by it. Supertext accepts only the codes its `GET features` lists (the
// SDK's `Languages`): targets regional only for de/en/fr/it/pt ("de-CH"),
// script for zh/sr ("zh-Hans"), bare for the rest ("es", "nl"); sources bare
// ("en"). Nothing is guessed: the account's own Supertext code for the language
// (Settings → Languages) wins, else a HubSpot code that is a Supertext code as
// it is ("de-ch" → "de-CH", "es"), else the SDK's error `unsupported_language`
// and nothing is sent. One mapping serves both directions (`de-CH` as a source
// is sent as `de`).

import { Languages, type LanguageMapping } from 'supertext-sdk/v1';

/** HubSpot language codes offered as targets and as the content's language. */
export const LANGUAGE_CODES: readonly string[] = [
  'ar', 'bg', 'ca', 'cs', 'da', 'de', 'de-at', 'de-ch', 'el', 'en', 'en-au', 'en-ca', 'en-gb', 'en-us', 'es',
  'es-mx', 'et', 'fi', 'fr', 'fr-be', 'fr-ca', 'fr-ch', 'he', 'hr', 'hu', 'id', 'it', 'it-ch', 'ja', 'ko', 'lt',
  'lv', 'nl', 'nl-be', 'no', 'pl', 'pt', 'pt-br', 'ro', 'ru', 'sk', 'sl', 'sr', 'sv', 'th', 'tr', 'uk', 'vi',
  'zh-cn', 'zh-hk', 'zh-tw',
];

export const isLanguage = (code: string): boolean => LANGUAGE_CODES.includes(code);

/** HubSpot's code in its usual form ("de_CH", "DE-ch" → "de-ch"). */
export const hubspotCode = (code: string): string => code.trim().toLowerCase().replace(/_/g, '-');

/** Same language code in HubSpot's sense (case and _/- ignored). */
export const sameLanguage = (a: string, b: string): boolean => Boolean(a) && hubspotCode(a) === hubspotCode(b);

/** The language's name in the given interface language ("de-ch" in English → "Swiss High German"). */
export function languageName(code: string, uiLocale: string): string {
  try {
    const tag = code === 'no' ? 'nb' : code.replace(/-(\w+)$/, (_m, region: string) => `-${region.toUpperCase()}`);
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(tag);
    if (name && name.toLowerCase() !== code.toLowerCase()) return name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1);
  } catch {
    // fall through
  }
  return code;
}

/** Supertext's target codes, as they are to be entered ("de-CH", "es", "zh-Hans"). */
export const SUPERTEXT_TARGETS: readonly string[] = Languages.TARGETS.map((language) => language.code);

/** A typed Supertext code in its exact form ("de_ch" → "de-CH"), or null if Supertext doesn't offer it. */
export const supertextCodeOf = (code: string): string | null => Languages.matchTarget(code.trim());

/**
 * The target code sent for a HubSpot language: the account's mapping, else an exact match.
 * Throws the SDK's `unsupported_language` error otherwise (see supertext/client.ts → fromSdk).
 */
export const supertextTarget = (language: string, mapping: LanguageMapping): string => Languages.target(language, mapping);

/** Like `supertextTarget`, but null for a language that has no Supertext code (for the settings and translate pages). */
export function resolvedTarget(language: string, mapping: LanguageMapping): string | null {
  try {
    return supertextTarget(language, mapping);
  } catch {
    return null;
  }
}

/**
 * The source code sent for an item's language: the mapping's value in its source form
 * ("en-US" → "en"), else the bare Supertext source ("de-ch" → "de"). '' = let Supertext detect it.
 * Throws `unsupported_language` for a language Supertext doesn't translate from.
 */
export const supertextSource = (language: string, mapping: LanguageMapping): string =>
  language ? Languages.source(language, mapping) : '';

/** Whether Supertext offers formal and informal address for this target code. */
export const supportsPoliteness = (target: string): boolean => Languages.supportsPoliteness(target) === true;

const DIALECT_PLACES: Record<string, string> = { chzh: 'Zürich', chbe: 'Bern' };

/** A Supertext target code's name in the interface language ("de-CH" → "German (Switzerland)", "gsw-u-sd-chzh" → "Swiss German (Zürich)"). */
export function supertextName(code: string, uiLocale: string): string {
  const dialect = /^gsw-u-sd-(\w+)$/.exec(code);
  if (dialect) return `${languageName('gsw', uiLocale)} (${DIALECT_PLACES[dialect[1]] ?? dialect[1]})`;
  return languageName(code, uiLocale);
}

/**
 * Supertext's target codes for a HubSpot language, for the dropdown: the codes of the same
 * language first ("de" → de-CH, de-DE, de-AT and the Swiss German dialects; "no" → nb).
 */
export function suggestedTargets(language: string): string[] {
  const base = hubspotCode(language).split('-')[0];
  const bases = base === 'no' ? ['nb', 'no'] : base === 'de' ? ['de', 'gsw'] : [base];
  return SUPERTEXT_TARGETS.filter((code) => bases.includes(code.split('-')[0].toLowerCase()));
}
