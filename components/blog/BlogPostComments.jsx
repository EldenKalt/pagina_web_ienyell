'use client';

import { useEffect, useState } from 'react';
import { fetchComments, COMMENTS_PER_BLOCK, commentError } from '../../lib/comments';
import BlogComment from './BlogComment';
import BlogCommentComposer from './BlogCommentComposer';

const empty = { comments: [], page: 0, totalPages: 0 };

export default function BlogPostComments({ slug, total = 0, revision = 0, onCreated, onOpenHighlight }) {
  const [current, setCurrent] = useState(empty);
  const [previous, setPrevious] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setCurrent(empty); setPrevious(empty);
    Promise.all([
      fetchComments(slug, { page: 1, limit: COMMENTS_PER_BLOCK, placement: 'current', signal: controller.signal }),
      fetchComments(slug, { page: 1, limit: COMMENTS_PER_BLOCK, placement: 'previous', signal: controller.signal }),
    ]).then(([fresh, old]) => {
      if (!controller.signal.aborted) { setCurrent(fresh); setPrevious(old); }
    }).catch((failure) => { if (!controller.signal.aborted) setError(commentError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, revision]);
  const more = async (placement) => {
    const data = placement === 'current' ? current : previous;
    setBusy(placement); setError('');
    try {
      const next = await fetchComments(slug, { page: data.page + 1, limit: COMMENTS_PER_BLOCK, placement });
      const update = (value) => ({ ...next, comments: [...value.comments, ...next.comments] });
      if (placement === 'current') setCurrent(update);
      else setPrevious(update);
    } catch (failure) { setError(commentError(failure)); }
    finally { setBusy(''); }
  };
  const rows = (data) => data.comments.map((comment) => <BlogComment key={comment.id} comment={comment}
    onOpenHighlight={onOpenHighlight} onCreated={onCreated} />);
  return <section className="blog-comments" aria-labelledby="blog-comments-title">
    <header className="blog-comments-head">
      <h2 className="blog-comments-title" id="blog-comments-title">Read it and drop a comment! ({total})</h2>
      <p className="blog-comments-intro">Check out what others are feeling in this post, have fun, and join the community!</p>
    </header>
    <BlogCommentComposer slug={slug} onCreated={onCreated} />
    {loading && <p role="status">Loading comments…</p>}
    {error && <p className="blog-public-error" role="alert">{error}</p>}
    {!loading && !error && total === 0 && <p>Be the first to comment.</p>}
    <div className="blog-comments-list">{rows(current)}</div>
    {current.page < current.totalPages && <div className="blog-comments-foot"><button type="button" className="blog-comments-all"
      disabled={Boolean(busy)} onClick={() => more('current')}>{busy === 'current' ? 'Loading…' : 'Read more comments'}</button></div>}
    {previous.comments.length > 0 && <section className="blog-previous-comments" aria-label="Conversations without a current paragraph">
      <h3>Earlier versions and unassigned conversations</h3>
      <p>These conversations keep their original quote and context, even when the paragraph was removed or left unassigned.</p>
      <div className="blog-comments-list">{rows(previous)}</div>
      {previous.page < previous.totalPages && <button type="button" className="blog-comments-all" disabled={Boolean(busy)}
        onClick={() => more('previous')}>{busy === 'previous' ? 'Loading…' : 'Read more earlier conversations'}</button>}
    </section>}
  </section>;
}
