import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parsePage, parsePageSize, parseSearch, buildPageMeta,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_PAGE } = require('./adminListQuery.js');

describe('admin list query normalization', () => {
  it.each([
    [undefined, 1, 20], ['abc', 1, 20], ['0', 1, 20], ['-3', 1, 20],
    ['2.7', 2, 2], ['500', 500, 100], ['20000', 10000, 100],
  ])('U1 normalizes %s to page %s and pageSize %s', (value, page, pageSize) => {
    expect(parsePage(value)).toBe(page);
    expect(parsePageSize(value)).toBe(pageSize);
    expect([DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_PAGE]).toEqual([20, 100, 10000]);
  });

  it.each([undefined, null, 42, ['a', 'b'], {}])('U2 ignores non-string search %j', (value) => {
    expect(parseSearch(value)).toBe('');
  });
  it('U2 removes NUL before trimming search', () => {
    expect(parseSearch('  a\u0000b  ')).toBe('ab');
  });
  it('U2 limits search to 100 characters', () => {
    expect(parseSearch('x'.repeat(300))).toBe('x'.repeat(100));
  });

  it.each([[0, 1, 20, 1], [41, 3, 20, 3]])('U3 builds metadata for total %s', (total, page, pageSize, totalPages) => {
    expect(buildPageMeta(total, page, pageSize)).toEqual({ total, page, pageSize, totalPages });
  });
});
