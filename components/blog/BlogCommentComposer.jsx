'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

/**
 * The "write a comment" field, shared by the inline comment section and the
 * comments panel — the reference shows the same composer in both, and two copies
 * of a form with six states would drift.
 *
 * NOT PERSISTED. There is no comments endpoint, so submitting clears the field
 * and nothing else. It does not pretend the comment was published.
 *
 * Signed out, the field is read-only and the button sends the reader to log in,
 * the same rule the rest of the post follows.
 */
export default function BlogCommentComposer({ placeholder = 'Share what you think…' }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const fieldId = `comment-${useId()}`;

  const locked = !isLoading && !user;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (locked) {
      router.push('/users/login');
      return;
    }
    setDraft('');
  };

  return (
    <form className="blog-comment-composer" onSubmit={handleSubmit}>
      <div className="blog-comment-head">
        {user?.avatarUrl ? (
          <img className="blog-comment-avatar" src={user.avatarUrl} alt="" />
        ) : (
          <span className="blog-comment-avatar blog-comment-avatar--fallback" aria-hidden="true">
            {(user?.name || '?').trim().charAt(0)}
          </span>
        )}
        <p className="blog-comment-who">
          <span className="blog-comment-name">{user?.name || 'Your name'}</span>
          {/* (Dynamic metadata: the signed-in reader's display name) */}
        </p>
      </div>

      <label className="sr-only" htmlFor={fieldId}>
        Write a comment
      </label>
      <textarea
        id={fieldId}
        className="blog-comment-field"
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={locked ? 'Sign in to join the conversation' : placeholder}
        readOnly={locked}
      />

      <div className="blog-comment-composer-actions">
        <button type="submit" className="blog-comment-submit" aria-disabled={locked || undefined}>
          {locked ? 'Sign in to comment' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
