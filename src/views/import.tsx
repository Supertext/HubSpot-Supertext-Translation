import { editorUrl } from '../hubspot/content.js';
import type { ErrorInfo } from '../i18n/error.js';
import type { MessageKey } from '../i18n/index.js';
import type { Account } from '../store/store.js';
import type { ImportResult } from '../translation/files.js';
import { languageName } from '../translation/languages.js';
import { Layout, Notice, type PageContext } from './layout.js';

export interface ImportPageProps {
  ctx: PageContext;
  account: Account;
  appBase: string;
  results?: ImportResult[];
  error?: ErrorInfo;
}

/** Import translation: upload a translated XLIFF or HTML file, then a summary per item and language. */
export function ImportPage(props: ImportPageProps) {
  const { ctx, account, results } = props;
  const { t } = ctx;
  const heading = t.t('import.heading');
  return (
    <Layout ctx={ctx} title={heading}>
      <h1>{heading}</h1>
      <p class="intro">{t.t('import.intro')}</p>

      <form id="import-form" class="card" method="post" action="/import" enctype="multipart/form-data">
        <input type="hidden" name="csrf" value={ctx.csrf} />
        <label class="field">
          <span>{t.t('import.file')}</span>
          <input type="file" name="file" accept=".xlf,.xliff,.html,.htm,application/x-xliff+xml,text/html" required />
        </label>
        <p class="help">{t.t('import.fileHelp')}</p>
        <label class="inline">
          <input type="checkbox" name="includeChanged" value="1" />
          {t.t('import.includeChanged')}
        </label>
        <label class="inline">
          <input type="checkbox" name="overwrite" value="1" checked />
          {t.t('translate.overwrite')}
        </label>
        <p class="help">{t.t('import.overwriteHelp')}</p>
        <div class="actions">
          <button type="submit" class="primary">
            {t.t('import.submit')}
          </button>
        </div>
      </form>

      {props.error && <Notice tone="error">{t.error(props.error)}</Notice>}

      {results && (
        <section class="card job" aria-live="polite">
          <h2>{t.t('import.results')}</h2>
          <table class="results">
            <tbody>
              {results.map((result) => (
                <tr>
                  <td class="title">
                    {result.itemName}
                    {result.kind && <span class="sub muted"> · {t.t(`kind.${result.kind}` as MessageKey)}</span>}
                  </td>
                  <td>{languageName(result.language, t.locale)}</td>
                  <td>
                    {result.error ? (
                      <span class="result failed">{t.error(result.error)}</span>
                    ) : (
                      <ul class="counts">
                        {result.state && (
                          <li class={`result ${result.state}`}>{t.t(`job.${result.state}` as MessageKey)}</li>
                        )}
                        <li>{t.t('import.ok', { count: result.imported ?? 0 })}</li>
                        {(result.sourceChanged ?? 0) > 0 && <li>{t.t('import.changed', { count: result.sourceChanged ?? 0 })}</li>}
                        {(result.untranslated ?? 0) > 0 && <li>{t.t('import.untranslated', { count: result.untranslated ?? 0 })}</li>}
                        {(result.invalid ?? 0) > 0 && <li>{t.t('import.invalid', { count: result.invalid ?? 0 })}</li>}
                        {(result.missing ?? 0) > 0 && <li>{t.t('import.missing', { count: result.missing ?? 0 })}</li>}
                      </ul>
                    )}
                  </td>
                  <td class="link">
                    {!result.error && result.targetId && result.kind && (
                      <a href={editorUrl(result.kind, account.accountId, result.targetId, props.appBase)} target="_blank" rel="noopener">
                        {t.t('job.open')}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.some((r) => r.state === 'created' || r.state === 'updated') && <p class="help">{t.t('job.review')}</p>}
        </section>
      )}
    </Layout>
  );
}
