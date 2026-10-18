/**
 * The app's layer over the Supertext SDK (the `supertext-sdk` dependency from vendor/, see
 * docs/DEVELOPER.md → Supertext SDK): one client per account, and the SDK's
 * error codes turned into the app's LocalizedErrors (`error.<code>` in the
 * interface languages).
 */

import { LocalizedError, type MessageParams } from '../i18n/error.js';
import { SupertextClient as SdkClient, SupertextError as SdkError, type ApiKeyCheck, type FetchLike } from 'supertext-sdk/v1';
import { VERSION } from '../version.js';

export { retryDelayMs } from 'supertext-sdk/v1';

/** The User-Agent suffix of every Supertext request (the GitHub repository name and version). */
export const USER_AGENT = `HubSpot-Supertext-Translation/${VERSION || 'dev'}`;

/** `more`: formal address (Sie, vous, Lei). `less`: informal (du, tu). `default`: Supertext decides. */
export type Politeness = 'default' | 'more' | 'less';

export interface ClientOptions {
  apiKey: string;
  /** Default: the live API (https://api.supertext.com/v1/). Points at a stand-in in tests. */
  endpoint?: string;
  /**
   * The review service for languages with *Translation review* on (see `forReview`).
   * '' or the same URL as `endpoint` = no review client.
   */
  reviewEndpoint?: string;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  /** Injected for tests. */
  fetch?: typeof fetch;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface TranslateOptions {
  /** A Supertext target code as Supertext lists it ("de-CH", "es"), see translation/languages.ts. */
  targetLanguage: string;
  /** A bare Supertext source code ("en"). Empty = auto-detect. */
  sourceLanguage?: string;
  /** Only for targets that offer it (`Languages.supportsPoliteness`). */
  politeness?: Politeness;
}

/** Errors that come from Supertext (as opposed to HubSpot). */
export class SupertextError extends LocalizedError {
  constructor(message: string, code: string, options: { params?: MessageParams; status?: number; detail?: string } = {}) {
    super(message, code, options.params, options.detail);
    this.name = 'SupertextError';
    this.status = options.status;
  }

  public readonly status?: number;
}

const DEFAULT_ENDPOINT = 'https://api.supertext.com/v1/';
const sameUrl = (a: string, b: string) => a.trim().replace(/\/+$/, '') === b.trim().replace(/\/+$/, '');

export class SupertextClient {
  private readonly client: SdkClient;
  private readonly options: ClientOptions;
  private reviewClient?: SupertextClient;

  constructor(options: ClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new SupertextError('No Supertext API key configured.', 'noApiKey');
    }
    this.options = options;
    this.client = new SdkClient(options.apiKey, {
      baseUrl: options.endpoint || undefined,
      pollIntervalMs: options.pollIntervalMs,
      timeoutMs: options.pollTimeoutMs,
      userAgent: USER_AGENT,
      fetch: options.fetch as FetchLike | undefined,
      sleep: options.sleep,
    });
  }

  /** The base URL this client sends to. */
  get endpoint(): string {
    return this.options.endpoint || DEFAULT_ENDPOINT;
  }

  /**
   * The client for a language: the review service when its *Translation review* is on (same key,
   * timeouts, transport and User-Agent; created on first use), else this one. Without a review
   * URL (or with the API's own URL), always this one. A translation is uploaded, polled,
   * downloaded and deleted with the same client (`translateSegments` does all four).
   */
  forReview(review: boolean): SupertextClient {
    const reviewUrl = this.options.reviewEndpoint?.trim() ?? '';
    if (!review || !reviewUrl || sameUrl(reviewUrl, this.endpoint)) return this;
    this.reviewClient ??= new SupertextClient({ ...this.options, endpoint: reviewUrl, reviewEndpoint: '' });
    return this.reviewClient;
  }

  /**
   * Translates HTML fragments (one per paragraph or text, see hubspot/rich-text.ts) and
   * returns them in the same order. All of them come back, or an error is thrown.
   */
  async translateSegments(segments: string[], options: TranslateOptions): Promise<string[]> {
    const input = new Map(segments.map((html, i) => [String(i), { text: html, html: true }]));
    try {
      const result = await this.client.translateTexts(input, options.targetLanguage, {
        sourceLang: options.sourceLanguage || null,
        politeness: options.politeness,
      });
      return segments.map((_, i) => result.get(String(i)) ?? '');
    } catch (error) {
      throw fromSdk(error);
    }
  }

  /** The automatic API key check (cost-free, never throws): ok, invalid, missing, unreachable or error. */
  checkApiKey(): Promise<ApiKeyCheck> {
    return this.client.checkApiKey();
  }

  /** Cost-free check that the key is valid and the API reachable. */
  async validate(): Promise<void> {
    try {
      await this.client.validateApiKey();
    } catch (error) {
      throw fromSdk(error);
    }
  }
}

const KEY_LINKS =
  'No Supertext account yet? Create one at https://www.supertext.com/person/en/account/signin. Generate your API key at https://www.supertext.com/en/integrations/api (requires the Admin role).';

/** The SDK's error codes (shared by all Supertext SDKs) → the app's error codes and English messages. */
export function fromSdk(error: unknown): unknown {
  if (!(error instanceof SdkError)) return error;
  const { status, detail } = error;
  const make = (code: string, english: string, params: MessageParams = {}, keepDetail = true) =>
    new SupertextError(keepDetail && detail ? `${english} (${detail})` : english, code, {
      params,
      status,
      detail: keepDetail ? detail : undefined,
    });
  switch (error.code) {
    case 'missing_api_key':
      return make('noApiKey', `No Supertext API key configured. ${KEY_LINKS}`, {}, false);
    case 'authentication_failure':
      return make('auth', `Authentication failed. Please check the Supertext API key. ${KEY_LINKS}`);
    case 'invalid_language_pair': {
      const source = error.sourceLang ?? '';
      const target = error.targetLang ?? '';
      return source && target
        ? make('languagePair', `Supertext doesn't translate from "${source}" into "${target}".`, { source, target }, false)
        : make('languagePairUnknown', "Supertext doesn't translate into this language.", {}, false);
    }
    case 'unsupported_language': {
      const code = error.targetLang ?? error.sourceLang ?? '';
      return make(
        'unsupportedLanguage',
        `The language "${code}" has no Supertext code yet. Choose one in the Supertext code dropdown under Settings → Languages.`,
        { code },
        false,
      );
    }
    case 'unsupported_feature':
      return make(
        'unsupportedFeature',
        'Supertext offers no formal or informal address for this language. Set the form of address to "Let Supertext decide" under Settings.',
        { feature: error.feature ?? '' },
        false,
      );
    case 'quota_exceeded':
      return make('limitExceeded', 'Your Supertext translation limit is exceeded.');
    case 'too_many_requests':
      return make('rateLimited', 'Too many requests to Supertext. Please try again shortly.');
    case 'payload_too_large':
      return make('tooLarge', 'The content is too large for Supertext to translate in one go.');
    case 'translation_error':
      return make('translationFailed', 'Supertext failed to translate the document.');
    case 'timeout':
      return make('timeout', 'Timed out waiting for the Supertext translation.');
    case 'service_unavailable':
      return make('unavailable', 'The Supertext service is currently unavailable.');
    case 'transport_error':
      return make('unreachable', `Could not reach Supertext: ${detail ?? ''}`, { reason: detail ?? '' }, false);
    case 'not_found':
      return make('notFound', 'The requested Supertext resource was not found.');
    case 'file_deleted':
      return make('fileDeleted', 'The Supertext file was deleted before it could be downloaded.');
    case 'no_file_id':
      return make('noFileId', 'Supertext did not return a file id.');
    case 'incomplete_response':
      return make('incomplete', 'Supertext returned an incomplete translation; nothing was saved for this language.', {}, false);
    default:
      return make('http', `Supertext answered with HTTP ${status ?? '?'}.`, { status: status ?? '?' });
  }
}
