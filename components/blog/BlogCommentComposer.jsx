'use client';

import { useEffect, useId, useState } from 'react';
import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import { COMMENT_LIMIT, commentError, createComment, createReply } from '../../lib/comments';

export default function BlogCommentComposer({ slug, paragraphId = null, anchor = null, parentId = null, onCreated, placeholder = 'Share what you think…' }) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fieldId = `comment-${useId()}`;
  const locked = !user;
  const tooLong = draft.length > COMMENT_LIMIT;
  useEffect(() => { setDraft(''); setError(''); }, [user?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading || busy) return;
    if (locked) { requestSignIn('post a comment'); return; }
    if (!draft.trim() || tooLong) return;
    setBusy(true); setError('');
    try {
      const result = parentId ? await createReply(parentId, draft) : await createComment(slug, { body: draft, anchor, paragraphId });
      setDraft('');
      onCreated?.(result.reply || result.comment);
    } catch (failure) {
      setError(commentError(failure));
      if (failure.status === 401) requestSignIn('post your comment');
    } finally { setBusy(false); }
  };

  return <form className="blog-comment-composer" onSubmit={handleSubmit}>
    <div className="blog-comment-head">
      {user?.avatarUrl ? <img className="blog-comment-avatar" src={user.avatarUrl} alt="" /> :
        <span className="blog-comment-avatar blog-comment-avatar--fallback" aria-hidden="true">{(user?.name || '?').trim().charAt(0)}</span>}
      <p className="blog-comment-who"><span className="blog-comment-name">{user?.name || 'Your name'}</span></p>
    </div>
    <label className="sr-only" htmlFor={fieldId}>Write a comment</label>
    <textarea id={fieldId} className="blog-comment-field" rows={3} value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={locked ? 'Sign in to join the conversation' : placeholder}
      readOnly={locked || busy} aria-invalid={tooLong || undefined} aria-describedby={`${fieldId}-count`} />
    <p id={`${fieldId}-count`} className={`blog-note-counter${tooLong ? ' is-over-limit' : ''}`} aria-live="polite">
      {draft.length.toLocaleString('en-US')} / 2,500 characters{tooLong ? ' — Shorten your comment before posting.' : ''}
    </p>
    {error && <p className="blog-public-error" role="alert">{error}</p>}
    <div className="blog-comment-composer-actions">
      <button type="submit" className="blog-comment-submit" disabled={isLoading || busy || tooLong || (!locked && !draft.trim())}>
        {busy ? 'Posting…' : locked ? 'Sign in to comment' : parentId ? 'Post reply' : 'Post comment'}
      </button>
    </div>
  </form>;
}
