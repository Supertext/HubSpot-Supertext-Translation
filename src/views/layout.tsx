import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Child } from 'hono/jsx';
import { LOCALES, type Translator } from '../i18n/index.js';

/** What every page needs: the language, the current page, the CSRF token and the connected account. */
export interface PageContext {
  t: Translator;
  page: 'connect' | 'translate' | 'import' | 'settings';
  /** Empty on the connect page (no session). */
  csrf: string;
  accountName?: string;
}

export const SIGNUP_URL = 'https://www.supertext.com/person/en/account/signin';
export const API_KEY_URL = 'https://www.supertext.com/en/integrations/api';

/**
 * The static files' addresses carry a hash of their content (`/static/app.css?v=…`), so a
 * browser fetches the new file right after a deploy instead of a cached old one.
 */
function assetVersion(file: string): string {
  try {
    return createHash('sha256').update(readFileSync(new URL(`../../public/${file}`, import.meta.url))).digest('hex').slice(0, 12);
  } catch {
    return 'dev';
  }
}
export const ASSETS = {
  css: `/static/app.css?v=${assetVersion('app.css')}`,
  js: `/static/app.js?v=${assetVersion('app.js')}`,
  logo: `/static/supertext-logo.svg?v=${assetVersion('supertext-logo.svg')}`,
};

export const LANGUAGE_NAMES: Record<string, string> = { en: 'English', de: 'Deutsch', fr: 'Français', it: 'Italiano' };

/** A link within the app. */
export function appUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function Layout(props: { ctx: PageContext; title: string; children: Child }) {
  const { ctx } = props;
  const { t } = ctx;
  return (
    <html lang={t.locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title}</title>
        <link rel="preload" href="/static/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin="" />
        <link rel="stylesheet" href={ASSETS.css} />
        <link rel="icon" href="/static/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#003230" />
      </head>
      <body data-locale={t.locale} data-csrf={ctx.csrf}>
        <header class="topbar">
          <a class="brand" href="/" aria-label="Supertext × HubSpot">
            <img src={ASSETS.logo} alt="Supertext" width="122" height="22" />
            <span class="for">× HubSpot</span>
          </a>
          {ctx.page !== 'connect' && (
            <nav class="tabs">
              <a href="/" class={ctx.page === 'translate' ? 'tab active' : 'tab'}>
                {t.t('nav.translate')}
              </a>
              <a href="/import" class={ctx.page === 'import' ? 'tab active' : 'tab'}>
                {t.t('nav.import')}
              </a>
              <a href="/settings" class={ctx.page === 'settings' ? 'tab active' : 'tab'}>
                {t.t('nav.settings')}
              </a>
            </nav>
          )}
          <span class="spacer"></span>
          {ctx.accountName && <span class="account">{ctx.accountName}</span>}
        </header>
        <main class="page">{props.children}</main>
        <script src={ASSETS.js} defer></script>
      </body>
    </html>
  );
}

/** The four interface languages as links (the connect page, before there are settings). */
export function LanguageLinks(props: { t: Translator; path: string }) {
  return (
    <nav class="langs" aria-label={props.t.t('nav.language')}>
      {LOCALES.map((locale) => (
        <a href={appUrl(props.path, { lang: locale })} class={locale === props.t.locale ? 'active' : ''} lang={locale}>
          {LANGUAGE_NAMES[locale]}
        </a>
      ))}
    </nav>
  );
}

/** "No Supertext account yet? Create one at supertext.com. Generate your API key at …" with links. */
export function ApiKeyHelp(props: { t: Translator }) {
  const { t } = props;
  const [before, middle, after] = splitTemplate(t.t('apiKeyHelp.text'), ['{signup}', '{apiKey}']);
  return (
    <p class="help">
      {before}
      <a href={SIGNUP_URL} target="_blank" rel="noopener">
        {t.t('apiKeyHelp.signup')}
      </a>
      {middle}
      <a href={API_KEY_URL} target="_blank" rel="noopener">
        {t.t('apiKeyHelp.apiKey')}
      </a>
      {after}
    </p>
  );
}

/** Splits "a {x} b {y} c" at the given placeholders, in order. */
export function splitTemplate(text: string, placeholders: string[]): string[] {
  const parts: string[] = [];
  let rest = text;
  for (const placeholder of placeholders) {
    const index = rest.indexOf(placeholder);
    if (index < 0) {
      parts.push(rest);
      rest = '';
      continue;
    }
    parts.push(rest.slice(0, index));
    rest = rest.slice(index + placeholder.length);
  }
  parts.push(rest);
  return parts;
}

export function Notice(props: { tone: 'info' | 'success' | 'warning' | 'error'; children: Child }) {
  return <div class={`notice ${props.tone}`}>{props.children}</div>;
}
