import { hasLetters, plainSegment, RichText, segmentResult, type Segment } from './rich-text.js';

/**
 * Collects the texts of one HubSpot item (page, blog post, email, article) as
 * Supertext segments, and writes the translations into a copy of its fields.
 *
 * Plain fields (title, meta description, subject line) are one plain-text
 * segment each; HTML (rich text, a post's body) is split by RichText into one
 * segment per paragraph. Module data (`widgets`, `widgetContainers`,
 * `layoutSections`) is walked by `addModules`: only fields whose name says
 * they hold text are translated (see TEXT_KEY), never addresses, styles,
 * IDs or settings.
 */

interface Unit {
  segment: Segment;
  apply(value: string): void;
}

export class Extraction {
  private readonly units: Unit[] = [];
  private readonly finishers: (() => void)[] = [];

  get segments(): Segment[] {
    return this.units.map((unit) => unit.segment);
  }

  get size(): number {
    return this.units.length;
  }

  /** A plain text; `set` receives the translation. Texts without letters are left out. */
  addPlain(text: unknown, set: (value: string) => void): void {
    if (typeof text !== 'string' || !hasLetters(text)) return;
    const segment = plainSegment(text.trim());
    const lead = text.match(/^\s*/)?.[0] ?? '';
    const trail = text.match(/\s*$/)?.[0] ?? '';
    this.units.push({ segment, apply: (value) => set(lead + segmentResult(segment, value) + trail) });
  }

  /** Plain text over several lines (an email's plain-text version): one segment per line. */
  addLines(text: unknown, set: (value: string) => void): void {
    if (typeof text !== 'string' || !hasLetters(text)) return;
    const lines = text.split('\n');
    const done = [...lines];
    lines.forEach((line, index) => this.addPlain(line, (value) => (done[index] = value)));
    this.finishers.push(() => set(done.join('\n')));
  }

  /** HTML: one segment per paragraph; `set` receives the whole translated HTML. */
  addHtml(html: unknown, set: (value: string) => void): void {
    if (typeof html !== 'string' || !hasLetters(html)) return;
    const document = new RichText(html);
    const translations = new Map<number, string>();
    document.segments.forEach((segment, index) => {
      this.units.push({ segment, apply: (value) => translations.set(index, value) });
    });
    this.finishers.push(() => set(document.apply(translations)));
  }

  /** Module data: walks the object in place (it must be the copy that is written back). */
  addModules(value: unknown): void {
    walk(value, [], this);
  }

  /**
   * Writes the translations (one per segment, in order). Checks everything first
   * (HubL tokens): if a segment is refused, it throws before any field changes.
   */
  apply(translated: string[]): void {
    if (translated.length !== this.units.length) throw new Error('Translation count mismatch');
    // segmentResult throws on lost HubL: check every segment before touching anything.
    this.units.forEach((unit, index) => segmentResult(unit.segment, translated[index]));
    this.units.forEach((unit, index) => unit.apply(translated[index]));
    for (const finish of this.finishers) finish();
  }
}

/** Field names that hold text a visitor reads. */
const TEXT_KEY =
  /^(html|text|title|heading|header|headline|subheading|sub_heading|subtitle|caption|description|summary|content|quote|alt|button_text|cta_text|link_text|placeholder|message|body_text|tagline|intro|eyebrow|label_text)$|_(text|title|heading|headline|html|description|caption|alt|label|subtitle|summary)$/;
/** Never walked into: layout, styling and technical data. */
const SKIP_KEY = new Set([
  'css', 'styles', 'style', 'cssclass', 'cssid', 'cssstyle', 'rowmetadata', 'path', 'module_id', 'schema_version',
  'id', 'type', 'name', 'label', 'src', 'href', 'url', 'link', 'target', 'smart_type', 'child_css', 'widget_name',
  'theme', 'font', 'color', 'background', 'background_color', 'background_image', 'alignment', 'spacing', 'loading',
  'form_id', 'cta_id', 'portal_id', 'guid', 'response_type', 'redirect_url', 'embed_code', 'video_id', 'icon',
]);
const HTML_LIKE = /<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/i;
const NOT_TEXT = /^\s*(https?:|mailto:|tel:|#|\/|www\.|data:)|^#?[0-9a-f]{3,8}$|^[\w.-]+\.(png|jpe?g|gif|svg|webp|ico|css|js|pdf|mp4)$/i;

function walk(value: unknown, path: string[], extraction: Extraction): void {
  if (Array.isArray(value)) {
    // A list of strings is text only under a text field's name ("items" of a list module aren't).
    const textList = TEXT_KEY.test((path[path.length - 1] ?? '').toLowerCase());
    value.forEach((item, index) => {
      if (typeof item === 'string') {
        if (textList) visitString(item, path, extraction, (text) => (value[index] = text));
      } else walk(item, path, extraction);
    });
    return;
  }
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(object)) {
    const name = key.toLowerCase();
    if (SKIP_KEY.has(name)) continue;
    if (typeof child === 'string') {
      // The preview text of an email is a module whose text sits in `value`.
      const isText = TEXT_KEY.test(name) || (name === 'value' && path.some((part) => /preview_?text/i.test(part)));
      if (isText) visitString(child, [...path, key], extraction, (text) => (object[key] = text));
    } else if (child && typeof child === 'object') {
      walk(child, [...path, key], extraction);
    }
  }
}

function visitString(text: string, path: string[], extraction: Extraction, set: (value: string) => void) {
  if (NOT_TEXT.test(text.trim()) || !hasLetters(text)) return;
  const key = (path[path.length - 1] ?? '').toLowerCase();
  if (key === 'html' || key.endsWith('_html') || HTML_LIKE.test(text)) extraction.addHtml(text, set);
  else extraction.addPlain(text, set);
}
