import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { contentDocument, paragraphHtml, locate, validateSelector } = require('./annotationContent.js');

describe('article annotation anchors', () => {
  it('keeps existing paragraph identities through a small edit', () => {
    const first = paragraphHtml('<p data-paragraph-id="para-one">A typo.</p>', 7);
    const second = paragraphHtml(first.replace('typo', 'correction'), 7);
    expect(second).toContain('data-paragraph-id="para-one"');
    expect(second).toContain('A correction.');
  });

  it('keeps repeated quotations distinct by text position', () => {
    const root = contentDocument('<p data-paragraph-id="para-one">A repeated quote. A repeated quote.</p>', 7);
    const first = { exact: 'A repeated quote.', prefix: '', suffix: ' A repeated quote.', start: 0, end: 17 };
    const second = { exact: 'A repeated quote.', prefix: 'A repeated quote. ', suffix: '', start: 18, end: 35 };
    expect(validateSelector(first)).toBe(true);
    expect(validateSelector(second)).toBe(true);
    expect(locate(root, first)?.selector.start).toBe(0);
    expect(locate(root, second)?.selector.start).toBe(18);
    expect(locate(root, second)?.paragraphId).toBe('para-one');
    root.ownerDocument.defaultView.close();
  });

  it('rejects inconsistent or excessive selections', () => {
    expect(validateSelector({ exact: 'abc', prefix: '', suffix: '', start: 0, end: 2 })).toBe(false);
    expect(validateSelector({ exact: 'a'.repeat(10001), prefix: '', suffix: '', start: 0, end: 10001 })).toBe(false);
  });
});
