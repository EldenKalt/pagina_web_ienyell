import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  ARTICLE_HTML_ALLOWANCES as frontendAllowances,
  sanitizeArticleHtml as frontendSanitize,
} from '../../../lib/articleHtml.js';

const require = createRequire(import.meta.url);
const { ARTICLE_HTML_ALLOWANCES, sanitizeArticleHtml } = require('./articleHtml.js');
const { JSDOM } = require('jsdom');

describe('stored blog HTML', () => {
  it('uses the authoritative editor allowances and keeps the frontend guard', () => {
    expect(ARTICLE_HTML_ALLOWANCES).toEqual(frontendAllowances);
    expect(() => frontendSanitize('<p>API content</p>', { trusted: false })).toThrow('refusing');
    expect(() => frontendSanitize('<p>Unmarked</p>')).toThrow('refusing');
    expect(frontendSanitize('<p>Placeholder</p>', { trusted: true })).toBe('<p>Placeholder</p>');
  });

  it.each([
    '<script>alert(1)</script><p>Safe</p>',
    '<p onclick="alert(1)">Safe<img src="x" onerror="alert(1)"></p>',
    '<a href="javascript:alert(1)">Safe</a>',
    '<a href="java&#x09;script:alert(1)">Safe</a>',
    '<iframe src="javascript:alert(1)" onload="alert(1)"></iframe><p>Safe</p>',
    '<iframe src="data:text/html,<script>alert(1)</script>" srcdoc="<script>alert(1)</script>"></iframe>',
    '<svg><g onload="alert(1)"></g><a href="javascript:alert(1)">Safe</a></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',
    '<p><iframe//src=jAva&Tab;script:alert(1)>Safe</p>',
    '<object data="javascript:alert(1)"></object><embed src="x"><p>Safe</p>',
  ])('removes executable HTML: %s', (dirty) => {
    const clean = sanitizeArticleHtml(dirty);
    const fragment = JSDOM.fragment(clean);
    expect(fragment.querySelector('script, object, embed')).toBeNull();
    for (const node of fragment.querySelectorAll('*')) {
      for (const attr of node.attributes) {
        expect(attr.name).not.toMatch(/^on|^srcdoc$/i);
        if (['href', 'src', 'xlink:href'].includes(attr.name)) {
          expect(attr.value.replace(/\s/g, '')).not.toMatch(/^(javascript|vbscript|data:text\/html):/i);
        }
      }
    }
    expect(sanitizeArticleHtml(clean)).toBe(clean);
  });

  it('preserves editor formatting, tables, images, task lists and YouTube', () => {
    const dirty = '<h2 style="text-align: center">Heading</h2>'
      + '<p><strong>Bold</strong><em>Italic</em><u>Underline</u><s>Strike</s><mark>Mark</mark>'
      + '<span style="color: rgb(255, 0, 0)">Color</span><a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a></p>'
      + '<blockquote>Quote</blockquote><pre><code class="language-js">const x = 1;</code></pre><hr>'
      + '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Task</p></div></li></ul>'
      + '<table><tbody><tr><th colspan="2">Header</th></tr><tr><td data-colwidth="100">Cell</td></tr></tbody></table>'
      + '<img src="https://example.com/image.png" alt="Image" style="width: 50%">'
      + '<div data-youtube-video=""><iframe src="https://www.youtube.com/embed/test" width="640" height="360" allow="accelerometer; autoplay; encrypted-media" allowfullscreen="true" frameborder="0" scrolling="no"></iframe></div>';
    const fragment = JSDOM.fragment(sanitizeArticleHtml(dirty));
    for (const tag of ['h2', 'strong', 'em', 'u', 's', 'mark', 'blockquote', 'pre', 'code', 'hr', 'ul', 'li', 'input', 'table', 'th', 'td', 'img', 'iframe']) {
      expect(fragment.querySelector(tag), tag).not.toBeNull();
    }
    expect(fragment.querySelector('h2').getAttribute('style')).toBe('text-align: center');
    expect(fragment.querySelector('span[style]').getAttribute('style')).toContain('color:');
    expect(fragment.querySelector('a').getAttribute('target')).toBe('_blank');
    expect(fragment.querySelector('li').getAttribute('data-checked')).toBe('true');
    for (const attribute of ['src', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'width', 'height']) {
      expect(fragment.querySelector('iframe').hasAttribute(attribute), attribute).toBe(true);
    }
  });

  it('rejects non-string input and removes content made only of scripts', () => {
    expect(() => sanitizeArticleHtml({ html: '<p>Test</p>' })).toThrow(TypeError);
    expect(sanitizeArticleHtml('<script>alert(1)</script>')).toBe('');
  });
});
