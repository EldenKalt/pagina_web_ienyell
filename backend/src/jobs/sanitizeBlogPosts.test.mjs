import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeBlogPosts } = require('./sanitizeBlogPosts.js');

function database() {
  const rows = [
    { id: 1, content: '<p onclick="bad()">Safe</p>', isPublished: true, slug: 'one' },
    { id: 4, content: '<p>Unchanged</p>', isPublished: false, slug: 'four' },
    { id: 9, content: '<script>bad()</script>', isPublished: false, slug: 'nine' },
  ];
  const prisma = { blogPost: {
    findMany: vi.fn(async ({ where, take }) => rows.filter((row) => row.id > where.id.gt).slice(0, take).map((row) => ({ ...row }))),
    updateMany: vi.fn(async ({ where, data }) => {
      const row = rows.find((row) => row.id === where.id && row.content === where.content);
      if (!row) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }),
  } };
  return { prisma, rows };
}

describe('existing blog content cleanup', () => {
  it('defaults to read-only, scans every batch and does not print content', async () => {
    const { prisma, rows } = database();
    const original = structuredClone(rows);
    const log = vi.spyOn(console, 'log');
    expect(await sanitizeBlogPosts(prisma, { batchSize: 2 })).toEqual({
      mode: 'dry-run', scanned: 3, changed: 2, updated: 0, conflicts: 0,
    });
    expect(prisma.blogPost.updateMany).not.toHaveBeenCalled();
    expect(rows).toEqual(original);
    expect(prisma.blogPost.findMany).toHaveBeenCalledTimes(3);
    expect(log).not.toHaveBeenCalled();
  });

  it('cleans published posts and drafts without deleting rows or changing metadata; repeat is a no-op', async () => {
    const { prisma, rows } = database();
    expect(await sanitizeBlogPosts(prisma, { apply: true, batchSize: 1 })).toEqual({
      mode: 'apply', scanned: 3, changed: 2, updated: 2, conflicts: 0,
    });
    expect(rows).toEqual([
      { id: 1, content: '<p>Safe</p>', isPublished: true, slug: 'one' },
      { id: 4, content: '<p>Unchanged</p>', isPublished: false, slug: 'four' },
      { id: 9, content: '', isPublished: false, slug: 'nine' },
    ]);
    expect(await sanitizeBlogPosts(prisma, { apply: true })).toMatchObject({ changed: 0, updated: 0 });
    expect(prisma.blogPost.updateMany).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite an edit made after reading and reports a conflict', async () => {
    const { prisma, rows } = database();
    prisma.blogPost.updateMany.mockImplementationOnce(async ({ where }) => {
      expect(where).toEqual({ id: 1, content: '<p onclick="bad()">Safe</p>' });
      rows[0].content = '<p>Concurrent edit</p>';
      return { count: 0 };
    });
    expect(await sanitizeBlogPosts(prisma, { apply: true })).toMatchObject({ updated: 1, conflicts: 1 });
    expect(rows[0].content).toBe('<p>Concurrent edit</p>');
  });

  it('propagates failures and can safely resume a partially completed cleanup', async () => {
    const { prisma } = database();
    prisma.blogPost.findMany.mockImplementationOnce(async () => [{ id: 1, content: '<p onclick="bad()">Safe</p>' }]);
    prisma.blogPost.findMany.mockRejectedValueOnce(new Error('Synthetic database error'));
    await expect(sanitizeBlogPosts(prisma, { apply: true, batchSize: 1 })).rejects.toThrow('Synthetic');
    expect(await sanitizeBlogPosts(prisma, { apply: true })).toMatchObject({ changed: 1, updated: 1, conflicts: 0 });
  });

  it.each([0, -1, 1.5, '2'])('rejects invalid batch size %s before querying', async (batchSize) => {
    const { prisma } = database();
    await expect(sanitizeBlogPosts(prisma, { batchSize })).rejects.toThrow(TypeError);
    expect(prisma.blogPost.findMany).not.toHaveBeenCalled();
  });
});
