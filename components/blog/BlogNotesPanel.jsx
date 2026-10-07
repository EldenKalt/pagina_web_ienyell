'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NOTE_LIMIT, NOTES_DEMO, annotationError } from '../../lib/notes';
import { useBlogSignIn } from './BlogSignInPrompt';
import SidePanel from '../SidePanel';
import BlogNote from './BlogNote';

// Parent owns the notes so the list, public section and paragraph margin agree.
export default function BlogNotesPanel({ open, onClose, anchor, annotations }) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [draft, setDraft] = useState('');
  const [isPublic, setPublic] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const request = useRef(null);
  const field = useId();
  const editor = useRef(null);
  const locked = !user;
  const tooLong = draft.length > NOTE_LIMIT;
  useEffect(() => {
    setDraft(''); setPublic(false); setEditing(null); setDeleting(null); setError(''); request.current = null;
  }, [user?.id]);
  useEffect(() => { if (anchor) { setEditing(null); setError(''); } }, [anchor]);
  const reset = () => { setDraft(''); setPublic(false); setEditing(null); request.current = null; };
  const submit = async (event) => {
    event.preventDefault();
    if (isLoading || busy) return;
    if (locked) { requestSignIn('save a note'); return; }
    if (!draft.trim() || tooLong) return;
    const payload = editing ? { body: draft, isPublic } : { body: draft, isPublic, anchor: anchor || null };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const result = await annotations.saveNote(editing?.id, payload, request.current.key);
      if (result) reset();
    } catch (failure) { setError(annotationError(failure)); if (failure.status === 401) requestSignIn('save your note'); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    setBusy(true); setError('');
    try { await annotations.removeNote(id); setDeleting(null); if (editing?.id === id) reset(); }
    catch (failure) { setError(annotationError(failure)); }
    finally { setBusy(false); }
  };
  const quote = editing?.anchor || anchor?.exact;
  return (
    <SidePanel open={open} onClose={onClose} titleId={`notes-${field}`} title="Your notes" description="Your definitions, ideas and things to remember.">
      <form className="blog-note-composer" onSubmit={submit}>
        <h3 className="blog-note-composer-title">{editing ? 'Edit your note' : 'Create a note'}</h3>
        {quote && <blockquote className="blog-note-anchor"><p>{quote}</p></blockquote>}
        <label htmlFor={field}>Write a note</label>
        <textarea ref={editor} id={field} className="blog-comment-field" rows={4} value={draft}
          onChange={(event) => setDraft(event.target.value)} readOnly={locked || busy}
          placeholder={locked ? 'Sign in to take notes' : 'One idea you want to remember…'}
          aria-describedby={`${field}-count`} aria-invalid={tooLong || undefined} />
        <p id={`${field}-count`} className={`blog-note-counter${tooLong ? ' is-over-limit' : ''}`} aria-live="polite">
          {draft.length.toLocaleString('en-US')} / 2,500 characters{tooLong ? ' — Shorten your note before saving.' : ''}
        </p>
        <label className="blog-note-publish">
          <input type="checkbox" checked={isPublic} onChange={(event) => setPublic(event.target.checked)} disabled={locked || busy} />
          <span>Publish this note<span className="blog-note-publish-hint">Others can read it in this article's Public notes.</span></span>
        </label>
        <div className="blog-note-controls">
          <button type="submit" className="blog-comment-submit" disabled={isLoading || busy || tooLong || annotations.loading || annotations.error || (!locked && (!draft.trim() || NOTES_DEMO))}>
            {busy ? 'Saving…' : locked ? 'Sign in to take notes' : 'Save note'}
          </button>
          {editing && <button type="button" disabled={busy} onClick={reset}>Cancel editing</button>}
        </div>
        {NOTES_DEMO && <p>Demo notes are read-only.</p>}
      </form>
      {error && <p className="blog-public-error" role="alert">{error}</p>}
      {annotations.error && <div className="blog-public-error" role="alert"><p>{annotations.error}</p><button type="button" onClick={annotations.reload}>Try again</button></div>}
      {annotations.loading && <p role="status">Loading your notes…</p>}
      <div className="blog-notes-list">
        {annotations.notes.map((note) => <div key={note.id}>
          <BlogNote note={note} />
          <div className="blog-note-controls">
            <button type="button" disabled={busy || NOTES_DEMO} onClick={() => { setEditing(note); setDraft(note.body); setPublic(note.isPublic); setError(''); editor.current?.focus(); }}>Edit</button>
            <button type="button" disabled={busy || NOTES_DEMO} onClick={() => setDeleting(note.id)}>Delete</button>
          </div>
          {deleting === note.id && <div className="blog-note-controls" role="group" aria-label="Confirm note deletion">
            <span>Delete this note permanently?</span>
            <button type="button" disabled={busy} onClick={() => remove(note.id)}>Delete note</button>
            <button type="button" disabled={busy} onClick={() => setDeleting(null)}>Keep note</button>
          </div>}
        </div>)}
      </div>
      {user && !annotations.loading && !annotations.error && !annotations.notes.length && <p>You have no notes on this article yet.</p>}
    </SidePanel>
  );
}
