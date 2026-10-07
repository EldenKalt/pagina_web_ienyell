import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { withBlogStats } = require('./blogStats.js');

describe('public blog counters', () => {
  it('counts likes and root/reply comments in batches, and hides disabled conversations', async () => {
    const db = {
      blogPostLike: { groupBy: vi.fn(async () => [{ postId: 1, _count: { _all: 2 } }]) },
      annotationTarget: { findMany: vi.fn(async () => [{ id: 10, targetId: 1 }, { id: 20, targetId: 2 }]) },
      blogComment: { groupBy: vi.fn(async () => [{ targetId: 10, _count: { _all: 3 } }, { targetId: 20, _count: { _all: 4 } }]) },
    };
    const result = await withBlogStats(db, [
      { id: 1, slug: 'one', shareCount: 5, commentsEnabled: true },
      { id: 2, slug: 'two', shareCount: 0, commentsEnabled: false },
    ]);
    expect(result).toMatchObject([
      { slug: 'one', stats: { likes: 2, comments: 3, shares: 5 } },
      { slug: 'two', stats: { likes: 0, comments: 0, shares: 0 } },
    ]);
    expect(result[0]).not.toHaveProperty('shareCount');
    expect(db.blogPostLike.groupBy).toHaveBeenCalledTimes(1);
    expect(db.blogComment.groupBy).toHaveBeenCalledTimes(1);
  });
});
