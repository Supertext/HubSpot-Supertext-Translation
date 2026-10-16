import { editorUrl } from '../hubspot/content.js';
import type { MessageKey, Translator } from '../i18n/index.js';
import type { Job, JobItem } from '../store/store.js';
import { jobTotals } from '../translation/jobs.js';
import { languageName } from '../translation/languages.js';

/** Progress and results of a translation job (rendered on the server, refreshed by polling). */
export function JobPanel(props: { t: Translator; job: Job; portalId: string; appBase: string }) {
  const { t, job } = props;
  const totals = jobTotals(job);
  return (
    <div class="card job">
      <h2>
        {t.t('job.heading')}: {job.itemTitle || job.itemId}
      </h2>
      <p class="muted">{t.t(`kind.${job.kind}` as MessageKey)}</p>
      {job.status === 'running' && (
        <p class="progress" role="status">
          <span class="spinner" aria-hidden="true"></span>
          {t.t('job.running', {
            item: job.itemTitle || job.itemId,
            completed: job.items.length,
            total: job.languages.length,
          })}
        </p>
      )}
      {job.status === 'done' && (
        <div class={`notice ${totals.failed > 0 ? 'warning' : 'success'}`}>{t.t('job.done', totals)}</div>
      )}
      {job.status === 'failed' && job.error && (
        <div class="notice error">{t.t('job.failed', { reason: t.error(job.error) })}</div>
      )}
      {job.items.length > 0 && (
        <table class="results">
          <tbody>
            {job.items.map((item) => (
              <tr>
                <td class="title">{languageName(item.language, t.locale)}</td>
                <td>
                  <ItemResult t={t} item={item} />
                </td>
                <td class="link">
                  {item.state !== 'failed' && item.targetId && (
                    <a href={editorUrl(job.kind, props.portalId, item.targetId, props.appBase)} target="_blank" rel="noopener">
                      {t.t('job.open')}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {job.status === 'done' && totals.created + totals.updated > 0 && <p class="help">{t.t('job.review')}</p>}
    </div>
  );
}

function ItemResult(props: { t: Translator; item: JobItem }) {
  const { t, item } = props;
  if (item.state === 'failed') {
    return <span class="result failed">{item.error ? t.error(item.error) : ''}</span>;
  }
  return <span class={`result ${item.state}`}>{t.t(`job.${item.state}`)}</span>;
}

/** The last translations, newest first. */
export function History(props: { t: Translator; jobs: Job[] }) {
  const { t, jobs } = props;
  const date = new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section class="card history">
      <h2>{t.t('history.heading')}</h2>
      {jobs.length === 0 ? (
        <p class="muted">{t.t('history.empty')}</p>
      ) : (
        <table class="results">
          <tbody>
            {jobs.map((job) => {
              const totals = jobTotals(job);
              return (
                <tr>
                  <td class="when">{date.format(new Date(job.createdAt))}</td>
                  <td class="title">{job.itemTitle || job.itemId}</td>
                  <td class="muted">{t.t(`kind.${job.kind}` as MessageKey)}</td>
                  <td>{job.languages.map((code) => code.toUpperCase()).join(', ')}</td>
                  <td>
                    {job.status === 'running' ? (
                      <span class="spinner" aria-hidden="true"></span>
                    ) : job.status === 'failed' && job.error ? (
                      <span class="result failed">{t.error(job.error)}</span>
                    ) : (
                      <span class={totals.failed > 0 ? 'result failed' : 'result created'}>{t.t('job.done', totals)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
