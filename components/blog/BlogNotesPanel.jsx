'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { fetchNotes } from '../../lib/notes';
import SidePanel from '../SidePanel';
import BlogNote from './BlogNote';

/**
 * "Your notes" — the reader's own notes on this post, and the form to add one.
 *
 * NOTES ARE NOT COMMENTS. Publishing one puts it in the post's public thread and
 * on the author's profile, and it stays a note: it does not appear in a
 * highlight's reactions panel, which is for conversation. The checkbox says what
 * it does rather than relying on the word "publish" alone.
 *
 * NOT PERSISTED. lib/notes.js reads the placeholder file today and the API later;
 * creating a note clears the form and stores nothing.
 */
export default function BlogNotesPanel({ open, onClose, slug }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [publish, setPublish] = useState(false);
  const fieldId = `note-${useId()}`;
  const publishId = `note-publish-${useId()}`;

  const locked = !isLoading && !user;

  useEffect(() => {
    if (!open || !slug) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchNotes(slug)
      .then((data) => {
        if (!cancelled) setNotes(data.notes);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Your notes could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (locked) {
      router.push('/users/login');
      return;
    }
    setDraft('');
    setPublish(false);
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      titleId="blog-notes-panel-title"
      title="Your notes"
      description="Read the notes that you take from this content."
    >
      <form className="blog-note-composer" onSubmit={handleSubmit}>
        <h3 className="blog-note-composer-title">Create a note!</h3>
        <p className="blog-note-composer-hint">
          All your notes are kept on{' '}
          <Link href="/users/profile">your profile</Link>.
        </p>

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
          </p>
        </div>

        <label className="sr-only" htmlFor={fieldId}>
          Write a note
        </label>
        <textarea
          id={fieldId}
          className="blog-comment-field"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={locked ? 'Sign in to take notes' : 'Write a note for yourself…'}
          readOnly={locked}
        />

        <div className="blog-note-publish">
          <input
            type="checkbox"
            id={publishId}
            checked={publish}
            onChange={(event) => setPublish(event.target.checked)}
            disabled={locked}
          />
          <label htmlFor={publishId}>
            Publish this note.
            <span className="blog-note-publish-hint">
              It joins the post&rsquo;s conversation and shows on your profile.
            </span>
          </label>
        </div>

        <div className="blog-comment-composer-actions">
          <button type="submit" className="blog-comment-submit" aria-disabled={locked || undefined}>
            {locked ? 'Sign in to take notes' : 'Save note'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="blog-public-error" role="alert">
          {error}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {loading ? 'Loading your notes…' : `${notes.length} notes`}
      </p>

      {loading && !notes.length ? (
        <div className="blog-loading" role="status">
          <span className="blog-loading-spinner" />
          Loading your notes…
        </div>
      ) : (
        <div className="blog-notes-list">
          {notes.map((note) => (
            <BlogNote key={note.id} note={note} />
          ))}
        </div>
      )}
    </SidePanel>
  );
}
