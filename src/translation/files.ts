import { TranslationFileError, TranslationFiles, type FileJob, type FileSegment, type ImportedSegment } from 'supertext-sdk';
import { extractItem, getDraft, isKind, type Kind } from '../hubspot/content.js';
import type { Extraction } from '../hubspot/extract.js';
import { segmentResult } from '../hubspot/rich-text.js';
import { errorInfo, LocalizedError, type ErrorInfo } from '../i18n/error.js';
import { PLUGIN_NAME } from '../reporting.js';
import type { Account, ResultState } from '../store/store.js';
import { existingVersion, prepareItem, type JobDeps, type PreparedItem } from './jobs.js';
import { resolvedTarget, sameLanguage, supertextSource } from './languages.js';
import { translateItem } from './translate.js';

/**
 * Translation files (the Supertext SDK's `TranslationFiles`): *Export for translation* writes one
 * item's texts as XLIFF 1.2 or HTML, *Import translation* reads a translated file and writes it
 * into the language version exactly as an API translation does (`translateItem` with `produce`).
 *
 * Segments: the item's extraction (`extractItem`), keyed by field path (`htmlTitle`,
 * `widgets.module_1.body.html.0`, `content.plainTextVersion.3`). Every segment travels as HTML,
 * so HubL placeholders (`<span data-hs="N">`) stay protected codes; an imported text that loses
 * or doubles one is refused like a Supertext answer would be.
 *
 * Reference format (the job's `reference`, the XLIFF `original`):
 *   `<HubSpot account ID>:<kind>:<item ID>:<language>`, each part URI-encoded, e.g. `123456:site-page:98765:de-ch`.
 */

/** Uploads larger than this are refused before they are read. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type FileFormat = 'xliff' | 'html';

export interface ItemReference {
  accountId: string;
  kind: Kind;
  itemId: string;
  /** HubSpot code of the target language ("de-ch"). */
  language: string;
}

export function formatReference(ref: ItemReference): string {
  return [ref.accountId, ref.kind, ref.itemId, ref.language].map(encodeURIComponent).join(':');
}

/** The reference back, or null when it isn't one of ours. */
export function parseReference(reference: string): ItemReference | null {
  let parts: string[];
  try {
    parts = reference.split(':').map(decodeURIComponent);
  } catch {
    return null;
  }
  if (parts.length !== 4 || parts.some((p) => p === '')) return null;
  const [accountId, kind, itemId, language] = parts;
  return isKind(kind) ? { accountId, kind, itemId, language } : null;
}

/** The extraction's segments as file segments: the field path is the key, every text goes as HTML (HubL placeholders). */
export const fileSegments = (extraction: Extraction): FileSegment[] =>
  extraction.segments.map((segment, index) => ({ key: extraction.keys[index], text: segment.html, html: true }));

const fileSafe = (value: string) => value.replace(/[^A-Za-z0-9_-]+/g, '_');

/** A file-level error (the whole file is unusable): too large, not a translation file, no metadata. */
export const fileError = (error: TranslationFileError): LocalizedError =>
  error.code === 'too_large'
    ? tooLarge()
    : error.code === 'missing_metadata'
      ? new LocalizedError("This file wasn't exported by the Supertext app, or its header was removed.", 'fileMissingMetadata')
      : new LocalizedError("This file isn't a valid XLIFF or HTML translation file.", 'fileInvalid');

export const tooLarge = () => new LocalizedError('The file is too large (at most 10 MB).', 'fileTooLarge');

export interface ExportRequest {
  kind: Kind;
  itemId: string;
  languages: string[];
  format: FileFormat;
}

export interface ExportedFile {
  body: string;
  contentType: string;
  filename: string;
}

/** The file for one item: XLIFF with one job per language, or HTML for exactly one. */
export async function exportItem(deps: Pick<JobDeps, 'store' | 'hubspot'>, account: Account, request: ExportRequest): Promise<ExportedFile> {
  const { kind, format } = request;
  const languages = [...new Set(request.languages)];
  if (languages.length === 0) throw new LocalizedError('Select an item and at least one language.', 'select');
  if (format === 'html' && languages.length !== 1) {
    throw new LocalizedError('An HTML file holds exactly one language.', 'fileHtmlOneLanguage');
  }
  const item = await prepareItem(deps, account, kind, request.itemId);
  const segments = fileSegments(extractItem(kind, item.draft).extraction);
  if (segments.length === 0) throw new LocalizedError('Nothing to translate.', 'fileNothing');
  for (const language of languages) {
    if (sameLanguage(language, item.itemLanguage)) throw new LocalizedError('This is the language of the item itself.', 'sameLanguage');
  }
  // Supertext codes from the mapping, else the HubSpot code: a file can go to any translator.
  let sourceLanguage: string;
  try {
    sourceLanguage = supertextSource(item.itemLanguage, account.languageCodes) || item.itemLanguage;
  } catch {
    sourceLanguage = item.itemLanguage;
  }
  const jobs: FileJob[] = languages.map((language) => ({
    plugin: PLUGIN_NAME,
    reference: formatReference({ accountId: account.accountId, kind, itemId: item.info.id, language }),
    sourceLanguage: sourceLanguage || 'und',
    targetLanguage: resolvedTarget(language, account.languageCodes) ?? language,
    segments,
  }));
  const name = `hubspot-${fileSafe(item.info.id)}${languages.length === 1 ? `-${fileSafe(languages[0])}` : ''}`;
  return format === 'html'
    ? { body: TranslationFiles.exportHtml(jobs[0]), contentType: 'text/html; charset=utf-8', filename: `${name}.html` }
    : { body: TranslationFiles.exportXliff(jobs), contentType: 'application/x-xliff+xml', filename: `${name}.xlf` };
}

/** One job of an imported file. */
export interface ImportResult {
  kind: Kind | null;
  itemId: string | null;
  itemName: string;
  language: string;
  /** What happened to the language version (no state: nothing was written). */
  state?: Exclude<ResultState, 'failed'>;
  targetId?: string;
  imported?: number;
  /** Translated, but the source changed since the export; not imported (the option was off). */
  sourceChanged?: number;
  untranslated?: number;
  invalid?: number;
  missing?: number;
  error?: ErrorInfo;
}

export interface ImportRequest {
  content: string;
  /** Also write `source_changed` results. */
  includeChanged: boolean;
  /** Replace an existing version's draft (else the language is kept), as on the Translate page. */
  overwrite: boolean;
}

/**
 * Reads a translated file and writes each job into its language version. A file-level problem
 * throws (LocalizedError `fileInvalid`, `fileMissingMetadata`, `fileTooLarge`); a problem with
 * one job ends up in its result.
 */
export async function importFile(
  deps: Pick<JobDeps, 'store' | 'hubspot'>,
  account: Account,
  request: ImportRequest,
): Promise<ImportResult[]> {
  let files;
  try {
    files = TranslationFiles.read(request.content);
  } catch (error) {
    throw error instanceof TranslationFileError ? fileError(error) : error;
  }
  const results: ImportResult[] = [];
  for (const file of files) {
    const ref = parseReference(file.reference);
    const result: ImportResult = {
      kind: ref?.kind ?? null,
      itemId: ref?.itemId ?? null,
      itemName: ref?.itemId ?? file.reference,
      language: ref?.language ?? file.targetLanguage,
    };
    try {
      if (file.plugin !== PLUGIN_NAME) {
        throw new LocalizedError(`This file belongs to another system (${file.plugin}).`, 'fileOtherSystem', { plugin: file.plugin });
      }
      const notFound = () => new LocalizedError('The item this file was exported from no longer exists.', 'fileNotFound');
      if (!ref || ref.accountId !== account.accountId) throw notFound();
      if (ref.kind === 'kb-article' && !account.scopes.includes('cms.knowledge_base.articles.write')) throw notFound();
      if (!account.targets.includes(ref.language)) {
        throw new LocalizedError(`The site has no language ${ref.language}.`, 'fileNoLanguage', { language: ref.language });
      }
      let item: PreparedItem;
      try {
        item = await prepareItem(deps, account, ref.kind, ref.itemId);
      } catch (error) {
        throw error instanceof LocalizedError && error.code === 'itemMissing' ? notFound() : error;
      }
      result.itemName = item.info.name;
      if (sameLanguage(ref.language, item.itemLanguage)) {
        throw new LocalizedError('This is the language of the item itself.', 'sameLanguage');
      }
      Object.assign(result, await importJob(item, ref, file, request, account, deps));
    } catch (error) {
      if (!(error instanceof LocalizedError)) console.error('Supertext: import of a translation file failed', error);
      result.error = errorInfo(error);
    }
    results.push(result);
  }
  return results;
}

async function importJob(
  item: PreparedItem,
  ref: ItemReference,
  file: ReturnType<typeof TranslationFiles.read>[number],
  request: ImportRequest,
  account: Account,
  deps: Pick<JobDeps, 'store' | 'hubspot'>,
): Promise<Partial<ImportResult>> {
  const { extraction } = extractItem(ref.kind, item.draft);
  const segments = extraction.segments;
  const keys = extraction.keys;
  const byKey = new Map<string, ImportedSegment>(TranslationFiles.importTranslations(file, fileSegments(extraction)).map((r) => [r.key, r]));

  /** The value written per key; keys without one get the source (or the existing version's) text. */
  const values = new Map<string, string>();
  const counts = { imported: 0, sourceChanged: 0, untranslated: 0, invalid: 0, missing: 0 };
  keys.forEach((key, index) => {
    const r = byKey.get(key);
    if (r && r.text !== null && (r.status === 'ok' || (r.status === 'source_changed' && request.includeChanged))) {
      try {
        segmentResult(segments[index], r.text); // HubL placeholders all there, exactly once
        values.set(key, r.text);
        counts.imported++;
      } catch {
        counts.invalid++;
      }
      return;
    }
    if (r?.status === 'source_changed') counts.sourceChanged++;
    else if (r?.status === 'untranslated') counts.untranslated++;
    else if (r?.status === 'invalid_markup') counts.invalid++;
    else if (r?.status === 'missing') counts.missing++;
  });
  if (counts.imported === 0) return counts;

  const existingId = await existingVersion(item, ref.kind, ref.language);
  if (existingId && !request.overwrite) return { ...counts, imported: 0, state: 'kept', targetId: existingId };

  // Not imported: keep the existing version's text at that place where it has one (with the same HubL).
  const kept = new Map<string, string>();
  if (existingId) {
    const target = extractItem(ref.kind, await getDraft(item.client, ref.kind, existingId)).extraction;
    target.keys.forEach((key, index) => kept.set(key, target.segments[index].html));
  }
  const produce = (written: Extraction): string[] =>
    written.keys.map((key, index) => {
      const value = values.get(key);
      if (value !== undefined) return value;
      const own = kept.get(key);
      if (own !== undefined) {
        try {
          segmentResult(written.segments[index], own);
          return own;
        } catch {
          // different HubL: fall back to the source
        }
      }
      return written.segments[index].html;
    });

  const written = await translateItem({
    client: item.client,
    kind: ref.kind,
    source: item.source,
    draft: item.draft,
    existingId,
    language: ref.language,
    supertextTarget: resolvedTarget(ref.language, account.languageCodes) ?? ref.language,
    sourceLanguage: '',
    politeness: 'default',
    overwrite: true,
    primaryLanguage: item.itemLanguage,
    produce,
  });
  if (written.targetId && written.state !== 'kept') {
    await deps.store.saveTranslation(account.accountId, {
      kind: ref.kind,
      sourceId: item.info.id,
      language: ref.language,
      targetId: written.targetId,
      updatedAt: new Date().toISOString(),
    });
  }
  return { ...counts, state: written.state as Exclude<ResultState, 'failed'>, targetId: written.targetId };
}

