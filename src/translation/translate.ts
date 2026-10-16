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
import type { Politeness, SupertextClient } from '../supertext/client.js';
import type { JobItem } from '../store/store.js';

/**
 * One item × one language: translate its texts in one Supertext request, then
 * write them to the language version's draft — a version made for the purpose
 * (HubSpot's language variant, an email clone, an article translation), or the
 * existing one when it is to be updated. Nothing is published.
 */

export interface TranslateArgs {
  client: HubSpotClient;
  supertext: Pick<SupertextClient, 'translateSegments'>;
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

  // Everything is translated and checked (HubL tokens) before anything is written to HubSpot.
  const { extraction, fields } = extractItem(kind, args.draft);
  const segments = extraction.segments;
  const translated =
    segments.length === 0
      ? []
      : await args.supertext.translateSegments(
          segments.map((segment) => segment.html),
          { targetLanguage: args.supertextTarget, sourceLanguage: args.sourceLanguage, politeness: args.politeness },
        );
  extraction.apply(translated);
  const values = fields();

  if (existingId) {
    await updateDraft(client, kind, existingId, values);
    return { state: 'updated', targetId: existingId };
  }
  if (kind === 'kb-article') {
    const created = await createArticleTranslation(client, source, args.language, values);
    return { state: 'created', targetId: String(created.id) };
  }
  const created = await createVersion(client, kind, source, args.language, args.primaryLanguage);
  try {
    if (Object.keys(values).length > 0) await updateDraft(client, kind, String(created.id), values);
  } catch (error) {
    // Don't leave an untranslated copy behind.
    await removeItem(client, kind, String(created.id)).catch(() => undefined);
    throw error;
  }
  return { state: 'created', targetId: String(created.id) };
}
