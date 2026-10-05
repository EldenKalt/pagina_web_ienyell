'use client';

import { useEffect, useState } from 'react';
import { fetchComments, commentError } from '../../lib/comments';
import SidePanel from '../SidePanel';
import BlogComment from './BlogComment';
import BlogCommentComposer from './BlogCommentComposer';

const PAGE_SIZE = 24;

export default function BlogCommentsPanel({ open, onClose, slug, total = 0, paragraphId = null, anchor = null, quote = null, revision = 0, onCreated, onOpenHighlight }) {
  const [data, setData] = useState({ comments: [], page: 0, totalPages: 0, filteredTotal: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !slug) return undefined;
    const controller = new AbortController();
    setLoading(true); setError(''); setData({ comments: [], page: 0, totalPages: 0, filteredTotal: 0 });
    fetchComments(slug, { page: 1, limit: PAGE_SIZE, paragraphId, signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((failure) => { if (!controller.signal.aborted) setError(commentError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, slug, paragraphId, revision]);
  const more = async () => {
    setLoading(true); setError('');
    try {
      const next = await fetchComments(slug, { page: data.page + 1, limit: PAGE_SIZE, paragraphId });
      setData((current) => ({ ...next, comments: [...current.comments, ...next.comments] }));
    } catch (failure) { setError(commentError(failure)); }
    finally { setLoading(false); }
  };
  const title = paragraphId ? `Conversation on this paragraph (${data.filteredTotal})` : `Read it and drop a comment! (${total})`;
  return <SidePanel open={open} onClose={onClose} titleId="blog-comments-panel-title" title={title}
    description="Read the conversation and add your thoughts.">
    {(anchor?.exact || quote) && <blockquote className="blog-comment-highlight blog-highlight-quote"><p>{anchor?.exact || quote}</p></blockquote>}
    <BlogCommentComposer slug={slug} paragraphId={paragraphId} anchor={anchor} onCreated={onCreated}
      placeholder={paragraphId ? 'Comment on this paragraph…' : 'Share what you think…'} />
    {error && <p className="blog-public-error" role="alert">{error}</p>}
    {loading && !data.comments.length && <p role="status">Loading comments…</p>}
    {!loading && !error && !data.comments.length && <p>No comments here yet.</p>}
    <div className="blog-comments-list">{data.comments.map((comment) => <BlogComment key={comment.id} comment={comment}
      onCreated={onCreated} onOpenHighlight={onOpenHighlight} />)}</div>
    {data.page < data.totalPages && <div className="blog-comments-foot"><button type="button" className="blog-comments-all"
      disabled={loading} onClick={more}>{loading ? 'Loading…' : 'Read more comments'}</button></div>}
  </SidePanel>;
}
