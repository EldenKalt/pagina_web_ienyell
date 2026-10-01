'use client';

import { useEffect, useState } from 'react';
import { fetchComments } from '../../lib/comments';
import SidePanel from '../SidePanel';
import BlogComment from './BlogComment';
import BlogCommentComposer from './BlogCommentComposer';

/**
 * "React to this fragment!" — the conversation about one highlighted passage.
 *
 * Shows the fragment itself at the top, then the comments anchored to it. Only
 * comments: a reader's notes never appear here, even published ones. A note is
 * someone's own reading and belongs on their profile and beside the paragraph;
 * this panel is for conversation.
 *
 * NOT PERSISTED, and not yet filtered by anchor: lib/comments.js has no
 * per-highlight query because the endpoint does not exist. The comments shown
 * are the ones whose `highlight` matches the fragment, which is the filter the
 * API will do server-side.
 */
export default function BlogHighlightPanel({ open, onClose, slug, fragment }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !slug) return undefined;

    let cancelled = false;
    setLoading(true);

    fetchComments(slug, { page: 1, limit: 100 })
      .then((data) => {
        if (cancelled) return;
        // Stands in for `?anchor=`: the server will do this, not the client.
        setComments(data.comments.filter((comment) => comment.highlight === fragment));
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, fragment]);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      titleId="blog-highlight-panel-title"
      title={`React to this fragment! (${comments.length})`}
      description="Check out what folks are feeling in this highlight and join the community! I'll read your comments."
    >
      {fragment ? (
        <blockquote className="blog-comment-highlight blog-highlight-quote">
          <p>{fragment}</p>
        </blockquote>
      ) : null}

      <BlogCommentComposer placeholder="React to this fragment…" />

      <p className="sr-only" aria-live="polite">
        {loading ? 'Loading reactions…' : `${comments.length} reactions to this fragment`}
      </p>

      {loading ? (
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

      <div className="blog-comments-foot">
        {/* The reference says "to this chapter"; chapters belong to the literary
            side of the site. */}
        <button type="button" className="blog-comments-all" onClick={onClose}>
          Read all the reactions to this post
        </button>
      </div>
    </SidePanel>
  );
}
