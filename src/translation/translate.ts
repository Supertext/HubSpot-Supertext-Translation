import type { HubSpotClient } from '../hubspot/client.js';
import {
  createArticleTranslation,
  createVersion,
  extractItem,
  removeItem,
  updateDraft,
  type Item,
  type Kind,
} from '../hubspot/content.js';
import type { Extraction } from '../hubspot/extract.js';
import type { Politeness, SupertextClient } from '../supertext/client.js';
import type { JobItem } from '../store/store.js';

/**
 * One item × one language: make the language version (unless it exists), translate its texts in
 * one Supertext request, then write them to the version's draft — a version made for the purpose
 * (HubSpot's language variant, an email clone, an article translation), or the
 * existing one when it is to be updated. Nothing is published.
 */

export interface TranslateArgs {
  client: HubSpotClient;
  /** Translates the segments (API translation); not needed with `produce`. */
  supertext?: Pick<SupertextClient, 'translateSegments'>;
  /** Supplies the translations instead of Supertext's API (an imported translation file): one per segment. */
  produce?: (extraction: Extraction) => string[];
  kind: Kind;
  /** The item (metadata). */
  source: Item;
  /** Its draft: the content that is translated. */
  draft: Item;
  /** The language's existing version, if there is one. */
  existingId?: string;
  /** HubSpot language code ("de", "de-ch"). */
  language: string;
  /** Supertext target code ("de-CH"). */
  supertextTarget: string;
  /** Supertext source code ("en"); '' = detect. */
  sourceLanguage: string;
  politeness: Politeness;
  /** Replace an existing version's draft (else it is kept). */
  overwrite: boolean;
  /** HubSpot code of the source's language when the page has none set (create-language-variation needs it). */
  primaryLanguage: string;
}

export type TranslateResult = Pick<JobItem, 'state' | 'targetId'>;

export async function translateItem(args: TranslateArgs): Promise<TranslateResult> {
  const { client, kind, source, existingId } = args;
  if (existingId && !args.overwrite) return { state: 'kept', targetId: existingId };
  const { extraction, fields } = extractItem(kind, args.draft);

  /** Translates and checks every segment (HubL tokens) before anything is written; returns the fields to write. */
  const translate = async (): Promise<Record<string, unknown>> => {
    const segments = extraction.segments;
    const translated = args.produce
      ? args.produce(extraction)
      : segments.length === 0
        ? []
        : await args.supertext!.translateSegments(
            segments.map((segment) => segment.html),
            { targetLanguage: args.supertextTarget, sourceLanguage: args.sourceLanguage, politeness: args.politeness },
          );
    extraction.apply(translated);
    return fields();
  };

  if (existingId) {
    await updateDraft(client, kind, existingId, await translate());
    return { state: 'updated', targetId: existingId };
  }
  if (kind === 'kb-article') {
    // An article is created with its content in one call.
    const created = await createArticleTranslation(client, source, args.language, await translate());
    return { state: 'created', targetId: String(created.id) };
  }
  // The language version first: if HubSpot refuses it (a blog without that language, an existing
  // variant), nothing is sent to Supertext and nothing is paid for.
  const created = await createVersion(client, kind, source, args.language, args.primaryLanguage);
  try {
    const values = await translate();
    if (Object.keys(values).length > 0) await updateDraft(client, kind, String(created.id), values);
  } catch (error) {
    // Don't leave an untranslated copy behind.
    await removeItem(client, kind, String(created.id)).catch(() => undefined);
    throw error;
  }
  return { state: 'created', targetId: String(created.id) };
}
