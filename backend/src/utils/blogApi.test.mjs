import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBlogApi, getBlogApiBase } from '../../../lib/blogApi.js';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  vi.unstubAllGlobals();
});

describe('public blog data access', () => {
  it('normalizes the configured API base and uses live, uncached JSON reads', async () => {
    process.env.NEXT_PUBLIC_API_URL = ' https://api.example.test/// ';
    const fetch = vi.fn(async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => ({ posts: [] }),
    }));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchBlogApi('/api/blog?page=1&limit=24')).resolves.toEqual({ posts: [] });
    expect(getBlogApiBase()).toBe('https://api.example.test');
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/blog?page=1&limit=24', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  });

  it('passes cancellation and caller headers through without exposing response bodies', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
    const controller = new AbortController();
    const fetch = vi.fn(async (_url, options) => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'private server diagnostic' }),
    }));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchBlogApi('/api/blog/topics', {
      signal: controller.signal,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })).rejects.toMatchObject({ status: 500, message: 'The blog service could not complete the request.' });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      signal: controller.signal,
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
  });

  it('fails without making a request when the API base is missing', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(fetchBlogApi('/api/blog')).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });
});
