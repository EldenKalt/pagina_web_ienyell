'use client';

import { useEffect, useState } from 'react';
import { fetchComments } from '../../lib/comments';
import SidePanel from '../SidePanel';
import BlogComment from './BlogComment';
import BlogCommentComposer from './BlogCommentComposer';

/**
 * The comments off-canvas — the whole thread, opened from the comment button in
 * the action bar.
 *
 * Unlike the section under the article, which grows a block at a time, the panel
 * is where a reader goes to read everything, so it asks for the lot at once.
 *
 * Same composer and same comment row as the inline section, so the two can never
 * drift apart; only the container and the framing differ.
 *
 * Loads on open, not on mount: an unopened panel should not cost a request.
 */
const ALL = 100;

export default function BlogCommentsPanel({ open, onClose, slug, total = 0 }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !slug) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchComments(slug, { page: 1, limit: ALL })
      .then((data) => {
        if (!cancelled) setComments(data.comments);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'The comments could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      titleId="blog-comments-panel-title"
      title={`Read it and drop a comment! (${total})`}
      description="Check out what others are feeling in this post, have fun, and join the community!"
    >
      <BlogCommentComposer />

      {error ? (
        <div className="blog-public-error" role="alert">
          {error}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {loading ? 'Loading reactions…' : `${comments.length} reactions shown`}
      </p>

      {loading && !comments.length ? (
        <div className="blog-loading" role="status">
          <span className="blog-loading-spinner" />
          Loading reactions…
        </div>
      ) : (
        <div className="blog-comments-list">
          {comments.map((comment) => (
            <BlogComment key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </SidePanel>
  );
}
