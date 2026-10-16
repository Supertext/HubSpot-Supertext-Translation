import { describe, expect, it } from 'vitest';
import { editorUrl, extractItem, itemState, summary, translationMap } from '../src/hubspot/content.js';
import { Extraction } from '../src/hubspot/extract.js';
import { protect, restore, RichText } from '../src/hubspot/rich-text.js';

/** "Translates" every segment by upper-casing its text (outside tags). */
const shout = (html: string) => html.replace(/>([^<]+)</g, (_m, text: string) => `>${text.toUpperCase()}<`).replace(/^([^<]+)/, (text) => text.toUpperCase());

describe('rich text', () => {
  it('sends one segment per paragraph, with formatting and links inline', () => {
    const doc = new RichText('<h2>Our story</h2><p>We make <strong>bean-to-bar</strong> chocolate. <a href="https://x.test">Visit us</a>.</p><ul><li>One</li><li>Two</li></ul>');
    expect(doc.segments.map((s) => s.html)).toEqual([
      'Our story',
      'We make <strong>bean-to-bar</strong> chocolate. <a href="https://x.test">Visit us</a>.',
      'One',
      'Two',
    ]);
  });

  it('protects HubL and refuses a translation that lost a token', () => {
    const { html, tags } = protect('Hi {{ contact.firstname }}, {% if contact.city %}see you{% endif %} <a href="{{ link }}">here</a>');
    expect(html).toBe('Hi <span data-hs="0"></span>, <span data-hs="1"></span>see you<span data-hs="2"></span> <a href="{{ link }}">here</a>');
    expect(tags).toEqual(['{{ contact.firstname }}', '{% if contact.city %}', '{% endif %}']);
    expect(restore(html, tags)).toContain('{{ contact.firstname }}');
    expect(() => restore('Hallo, <span data-hs="1"></span>bis bald<span data-hs="2"></span>', tags)).toThrow(/2 of 3 HubL/);
    expect(() => restore('<span data-hs="0"></span><span data-hs="0"></span><span data-hs="1"></span><span data-hs="2"></span>', tags)).toThrow();
  });

  it('translates alt texts and leaves code, styles and notranslate alone', () => {
    const doc = new RichText('<p>Look <img src="a.png" alt="A bar"></p><pre><code>{{ x }}</code></pre><p class="notranslate">Brand</p><style>p{}</style>');
    expect(doc.segments.map((s) => s.html)).toEqual(['Look <img src="a.png" alt="A bar" data-st-a="0">', 'A bar']);
    const out = doc.apply(new Map([[0, 'SCHAU <img src="a.png" alt="A bar" data-st-a="0">'], [1, 'Eine Tafel']]));
    expect(out).toBe('<p>SCHAU <img src="a.png" alt="Eine Tafel"></p><pre><code>{{ x }}</code></pre><p class="notranslate">Brand</p><style>p{}</style>');
  });
});

describe('module data', () => {
  it('translates text fields only, never addresses, styles, IDs or settings', () => {
    const widgets = {
      hero: {
        name: 'hero',
        type: 'module',
        module_id: 1,
        label: 'Hero banner',
        body: {
          heading: 'Fresh chocolate',
          sub_heading: 'Every week',
          button_text: 'Buy',
          image: { src: 'https://cdn.test/a.jpg', alt: 'A bar' },
          link: { url: { href: 'https://shop.test' } },
          background_color: '#ffffff',
          alignment: 'center',
          layout: 'wide',
          cta_url: 'https://shop.test/cta',
          card_title: 'Gift box',
          items: ['left', 'right'],
          quotes: [{ quote: 'Best chocolate in Bern', author: 'Anna' }],
          rich: { html: '<p>Hello <b>there</b></p>' },
          tags: ['seasonal'],
          empty_text: '   ',
          token_only_text: '{{ contact.firstname }}',
        },
      },
    };
    const extraction = new Extraction();
    extraction.addModules(widgets);
    expect(extraction.segments.map((s) => s.html)).toEqual([
      'Fresh chocolate',
      'Every week',
      'Buy',
      'A bar',
      'Gift box',
      'Best chocolate in Bern',
      'Hello <b>there</b>',
    ]);
    extraction.apply(extraction.segments.map((s) => shout(s.html)));
    expect(widgets.hero.body.heading).toBe('FRESH CHOCOLATE');
    expect(widgets.hero.body.image).toEqual({ src: 'https://cdn.test/a.jpg', alt: 'A BAR' });
    expect(widgets.hero.body.rich.html).toBe('<p>HELLO <b>THERE</b></p>');
    expect(widgets.hero.body.quotes[0]).toEqual({ quote: 'BEST CHOCOLATE IN BERN', author: 'Anna' });
    expect(widgets.hero.body.items).toEqual(['left', 'right']);
    expect(widgets.hero.label).toBe('Hero banner');
    expect(widgets.hero.body.layout).toBe('wide');
  });

  it("writes nothing if a segment lost a HubL token", () => {
    const fields = { html: '<p>Hi {{ contact.firstname }}</p>', title: 'Hello {{ contact.firstname }}' };
    const extraction = new Extraction();
    extraction.addModules(fields);
    expect(() => extraction.apply(['Hallo', 'Hallo <span data-hs="0"></span>'])).toThrow(/HubL/);
    expect(fields).toEqual({ html: '<p>Hi {{ contact.firstname }}</p>', title: 'Hello {{ contact.firstname }}' });
  });

  it('keeps the empty lines and tokens of a plain-text version', () => {
    const { extraction, fields } = extractItem('email', {
      id: '1',
      subject: 'Hi',
      content: { plainTextVersion: 'Hello {{ contact.firstname }},\n\nBye.\n{{ unsubscribe_link }}' },
    });
    expect(extraction.segments.map((s) => s.html)).toEqual(['Hi', 'Hello <span data-hs="0"></span>,', 'Bye.']);
    extraction.apply(['Salut', 'Bonjour <span data-hs="0"></span>,', 'Au revoir.']);
    expect(fields()).toEqual({
      subject: 'Salut',
      content: { plainTextVersion: 'Bonjour {{ contact.firstname }},\n\nAu revoir.\n{{ unsubscribe_link }}' },
    });
  });

  it('leaves the source item untouched', () => {
    const draft = { id: '1', name: 'Page', widgets: { a: { body: { text: 'Hello' } } } };
    const { extraction } = extractItem('site-page', draft);
    extraction.apply(['SEITE', 'HALLO']);
    expect(draft.widgets.a.body.text).toBe('Hello');
  });
});

describe('HubSpot items', () => {
  it("reads HubSpot's states", () => {
    expect(itemState({ state: 'PUBLISHED_OR_SCHEDULED', currentlyPublished: true })).toBe('published');
    expect(itemState({ state: 'SCHEDULED' })).toBe('scheduled');
    expect(itemState({ state: 'DRAFT' })).toBe('draft');
    expect(itemState({ state: 'AUTOMATED' })).toBe('published');
    expect(itemState({})).toBe('draft');
  });

  it('reads language versions as a map or a list, without the item itself', () => {
    expect(translationMap({ en: { id: 1 }, 'de-ch': { id: 2 } }, '1')).toEqual({ 'de-ch': '2' });
    expect(translationMap([{ id: '7', language: 'FR-CH' }], '1')).toEqual({ 'fr-ch': '7' });
    expect(translationMap(undefined, '1')).toEqual({});
    expect(summary('site-page', { id: '5', name: 'x', translatedFromId: '4' }).isVariant).toBe(true);
    expect(summary('site-page', { id: '4', name: 'x', translatedFromId: '4' }).isVariant).toBe(false);
    expect(summary('kb-article', { id: '6', title: 'FAQ', translationOfId: '3' })).toMatchObject({ name: 'FAQ', isVariant: true });
  });

  it("links into HubSpot's editors", () => {
    expect(editorUrl('site-page', '42', '7')).toBe('https://app.hubspot.com/pages/42/editor/7/content');
    expect(editorUrl('blog-post', '42', '7')).toBe('https://app.hubspot.com/blog/42/editor/7/content');
    expect(editorUrl('email', '42', '7')).toBe('https://app.hubspot.com/email/42/edit/7/content');
    expect(editorUrl('kb-article', '42', '7')).toBe('https://app.hubspot.com/knowledge/42/edit/7');
  });
});
