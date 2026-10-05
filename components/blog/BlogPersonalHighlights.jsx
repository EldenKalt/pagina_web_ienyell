'use client';
import { useState } from 'react';
import SidePanel from '../SidePanel';
import { annotationError } from '../../lib/notes';

export default function BlogPersonalHighlights({ open, onClose, annotations }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const remove = async (id) => {
    setBusy(id); setError('');
    try { await annotations.removeHighlight(id); }
    catch (failure) { setError(annotationError(failure)); }
    finally { setBusy(null); }
  };
  return <SidePanel open={open} onClose={onClose} title="Your highlights" titleId="personal-highlights-title" description="Only you see these marks. Quotes remain here even if the article changes.">
    {error && <p role="alert">{error}</p>}
    {annotations.highlights.map((highlight) => <div className="blog-note" key={highlight.id}>
      <blockquote className="blog-comment-highlight">{highlight.selector.exact}</blockquote>
      <button type="button" disabled={Boolean(busy)} onClick={() => remove(highlight.id)}>{busy === highlight.id ? 'Removing…' : 'Remove highlight'}</button>
    </div>)}
    {!annotations.highlights.length && <p>You have no highlights on this article yet.</p>}
  </SidePanel>;
}
