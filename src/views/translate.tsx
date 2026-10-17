import { editorUrl, type ContentSummary, type Kind } from '../hubspot/content.js';
import type { ErrorInfo } from '../i18n/error.js';
import type { MessageKey } from '../i18n/index.js';
import type { Account, Job } from '../store/store.js';
import { languageName, resolvedTarget } from '../translation/languages.js';
import { History, JobPanel } from './job.js';
import { ApiKeyHelp, appUrl, Layout, Notice, splitTemplate, type PageContext } from './layout.js';

export interface ItemRow {
  item: ContentSummary;
  /** Language (HubSpot code) → ID of its version. */
  versions: Record<string, string>;
}

export interface TranslatePageProps {
  ctx: PageContext;
  account: Account;
  hasKey: boolean;
  /** The kinds offered (the knowledge base only with its scopes). */
  kinds: readonly Kind[];
  kind: Kind;
  rows?: ItemRow[];
  /** Cursor of the next page, if there is one. */
  after?: string;
  /** This isn't the first page. */
  paged: boolean;
  selected?: string;
  job?: Job;
  history: Job[];
  error?: ErrorInfo;
  /** The knowledge base tab is open but the account didn't grant its scopes. */
  kbMissing?: boolean;
  appBase: string;
}

export function TranslatePage(props: TranslatePageProps) {
  const { ctx, account, rows, kind } = props;
  const { t } = ctx;
  const heading = t.t('translate.heading');
  const targets = account.targets;

  return (
    <Layout ctx={ctx} title={heading}>
      <h1>{heading}</h1>
      <p class="intro">{t.t('translate.intro')}</p>

      {!props.hasKey && <NoKey ctx={ctx} />}
      {targets.length === 0 && <NoLanguages ctx={ctx} />}

      {targets.length > 0 && (
        <form id="translate-form" class="card" data-kind={kind}>
          <h2>{t.t('translate.step1')}</h2>
          <nav class="kinds" aria-label={t.t('translate.step1')}>
            {props.kinds.map((k) => (
              <a href={appUrl('/', { kind: k })} class={k === kind ? 'active' : ''}>
                {t.t(`kind.${k}` as MessageKey)}
              </a>
            ))}
          </nav>
          {props.kbMissing && <Notice tone="info">{t.t('translate.kbMissing')}</Notice>}
          {props.error && <Notice tone="error">{t.error(props.error)}</Notice>}
          {rows && rows.length === 0 && <p class="muted">{t.t('translate.empty')}</p>}
          {rows && rows.length > 0 && (
            <>
              <div class="table-scroll">
              <table class="items">
                <thead>
                  <tr>
                    <th class="check"></th>
                    <th>{t.t('translate.name')}</th>
                    <th>{t.t('translate.language')}</th>
                    {targets.map((code) => (
                      <th>{languageName(code, t.locale)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, versions }) => (
                    <tr>
                      <td class="check">
                        <input
                          type="radio"
                          name="item"
                          value={item.id}
                          id={`i-${item.id}`}
                          checked={item.id === props.selected}
                        />
                      </td>
                      <td class="title">
                        <label for={`i-${item.id}`}>{item.name}</label>
                        <span class="sub">
                          <span class={`badge state-${item.state}`}>{t.t(`state.${item.state}` as MessageKey)}</span>
                        </span>
                      </td>
                      <td class="lang">{item.language || '–'}</td>
                      {targets.map((code) => {
                        const id = versions[code];
                        if (!id) return <td><span class="badge none">{t.t('version.none')}</span></td>;
                        return (
                          <td>
                            <a class="badge done" href={editorUrl(kind, account.accountId, id, props.appBase)} target="_blank" rel="noopener">
                              {t.t('version.exists')}
                            </a>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <div class="pager">
                <span class="spacer"></span>
                {props.paged && <a href={appUrl('/', { kind })}>{t.t('translate.firstPage')}</a>}
                {props.after && <a href={appUrl('/', { kind, after: props.after })}>{t.t('translate.nextPage')}</a>}
              </div>
            </>
          )}

          {rows && rows.length > 0 && (
            <>
              <h2>{t.t('translate.step2')}</h2>
              <p class="muted">
                {account.sourceLanguage
                  ? t.t('translate.from', { language: languageName(account.sourceLanguage, t.locale) })
                  : t.t('translate.fromAuto')}
              </p>
              <div class="languages">
                {targets.map((code) => (
                  <label class="language">
                    <input type="checkbox" name="language" value={code} checked />
                    <span>{languageName(code, t.locale)}</span>
                    {resolvedTarget(code, account.languageCodes) ? (
                      <code>{resolvedTarget(code, account.languageCodes)}</code>
                    ) : (
                      <span class="warning-text">{t.t('translate.notMapped')}</span>
                    )}
                  </label>
                ))}
              </div>

              <label class="inline overwrite">
                <input type="checkbox" id="overwrite" name="overwrite" />
                {t.t('translate.overwrite')}
              </label>
              <p class="help" id="overwrite-hint">
                {t.t('translate.overwriteHint')}
              </p>
              <div id="overwrite-warning" class="notice warning" hidden>
                {t.t('translate.overwriteWarning')}
              </div>

              <div class="actions">
                <button
                  type="submit"
                  class="primary"
                  id="translate-button"
                  disabled={!props.hasKey}
                  data-label={t.t('translate.submit')}
                  data-label-one={t.t('translate.submitCount.one')}
                  data-label-other={t.t('translate.submitCount.other')}
                  data-starting={t.t('translate.starting')}
                  data-select={t.t('translate.selectSomething')}
                >
                  {t.t('translate.submit')}
                </button>
                <span id="form-message" class="muted" role="status"></span>
              </div>
            </>
          )}
        </form>
      )}

      <section id="job-panel" data-job={props.job?.status === 'running' ? props.job.id : undefined}>
        {props.job && <JobPanel t={t} job={props.job} portalId={account.accountId} appBase={props.appBase} />}
      </section>
      <History t={t} jobs={props.history} />
    </Layout>
  );
}

function NoKey(props: { ctx: PageContext }) {
  const { t } = props.ctx;
  const [before, after] = splitTemplate(t.t('translate.noKey.text'), ['{settings}']);
  return (
    <Notice tone="warning">
      <strong>{t.t('translate.noKey.heading')}</strong>
      <p>
        {before}
        <a href="/settings">{t.t('translate.noKey.settings')}</a>
        {after}
      </p>
      <ApiKeyHelp t={t} />
    </Notice>
  );
}

function NoLanguages(props: { ctx: PageContext }) {
  const { t } = props.ctx;
  const [before, after] = splitTemplate(t.t('translate.noLanguages.text'), ['{settings}']);
  return (
    <Notice tone="info">
      <strong>{t.t('translate.noLanguages.heading')}</strong>
      <p>
        {before}
        <a href="/settings">{t.t('translate.noKey.settings')}</a>
        {after}
      </p>
    </Notice>
  );
}
