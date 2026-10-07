import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { estimateReadingTime, postMetadata } = require('./blogMetadata');

describe('public article metadata', () => {
  it('estimates actual prose and respects paragraph boundaries and encoded spaces', () => {
    expect(estimateReadingTime('<p>word</p>'.repeat(201))).toBe(2);
    expect(estimateReadingTime(`<p>${'word&nbsp;'.repeat(200)}</p><script>${'ignored '.repeat(1000)}</script>`)).toBe(1);
    expect(estimateReadingTime('<iframe src="https://example.test"></iframe><p hidden>Hidden text</p>')).toBeNull();
  });

  it('keeps full text and private author fields out of list responses', () => {
    const result = postMetadata({ id: 7, content: '<p>Article</p>',
      series: { name: 'Series', slug: 'series' },
      author: { id: 3, name: 'Author', email: 'private@example.test', passwordHash: 'private',
        pronouns: 'she/her', bio: 'Biography', patreonUrl: 'https://www.patreon.com/author',
        socialLinks: [{ label: 'Website', url: 'https://example.test/' }, { label: 'Unsafe', url: 'javascript:alert(1)' }] } });
    expect(result).not.toHaveProperty('content');
    expect(result).toMatchObject({ readingTime: 1, seriesName: 'Series', seriesSlug: 'series',
      author: { pronouns: 'she/her', bio: 'Biography', socials: [{ name: 'Website', url: 'https://example.test/' }] } });
    expect(result.author).not.toHaveProperty('email');
    expect(result.author).not.toHaveProperty('passwordHash');
  });
});
