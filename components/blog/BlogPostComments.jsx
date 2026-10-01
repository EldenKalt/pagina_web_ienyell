'use client';

import { useCallback, useEffect, useState } from 'react';
import { placeholderAttrs } from '../../lib/placeholder';
import { fetchComments, COMMENTS_PER_BLOCK } from '../../lib/comments';
import BlogComment from './BlogComment';
import BlogCommentComposer from './BlogCommentComposer';

/**
 * The comment thread at the foot of the post.
 *
 * "Read all reactions" loads the next block into this list — it does not open a
 * panel. The off-canvas is opened from the comment button in the action bar
 * instead, which is the control that appears both above and below the article.
 *
 * Blocks rather than everything at once: a thread can be long, and the reader
 * asked to see more, not to wait for all of it.
 *
 * NOT PERSISTED. The source is lib/comments.js, which reads the placeholder file
 * today and the API later; nothing a reader writes is stored.
 *
 * The reference says "in this chapter" in its subtitle; it says "post" here.
 * Chapters belong to the literary side of the site and the word should mean one
 * thing across it.
 */
export default function BlogPostComments({ slug, total = 0, onOpenHighlight }) {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBlock = useCallback(
    async (nextPage) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchComments(slug, { page: nextPage, limit: COMMENTS_PER_BLOCK });
        // Appended, not replaced: each block adds to what is already read.
        setComments((current) => [...current, ...data.comments]);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (loadError) {
        setError(loadError.message || 'The comments could not be loaded.');
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setPage(0);
    fetchComments(slug, { page: 1, limit: COMMENTS_PER_BLOCK })
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'The comments could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasMore = page > 0 && page < totalPages;

  return (
    <section className="blog-comments" aria-labelledby="blog-comments-title">
      <header className="blog-comments-head">
        <h2 className="blog-comments-title" id="blog-comments-title">
          Read it and drop a comment!{' '}
          <span {...placeholderAttrs('post.stats.comments')}>({total})</span>
        </h2>
        <p className="blog-comments-intro">
          Check out what others are feeling in this post, have fun, and join the community!
        </p>
      </header>

      <BlogCommentComposer />

      <div className="blog-comments-list">
        {comments.map((comment) => (
          <BlogComment key={comment.id} comment={comment} onOpenHighlight={onOpenHighlight} />
        ))}
      </div>

      {/* Announces each arriving block, so a screen reader is told the list grew
          rather than being left to discover it. */}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Loading more reactions…' : `${comments.length} reactions shown`}
      </p>

      {error ? (
        <div className="blog-public-error" role="alert">
          {error}
        </div>
      ) : null}

      {hasMore ? (
        <div className="blog-comments-foot">
          <button
            type="button"
            className="blog-comments-all"
            onClick={() => loadBlock(page + 1)}
            aria-disabled={loading || undefined}
          >
            {loading ? 'Loading…' : 'Read all reactions'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
