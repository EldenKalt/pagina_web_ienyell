'use client';
import { useEffect, useState } from 'react';
import { fetchPublicNotes, annotationError } from '../../lib/notes';
import BlogNote from './BlogNote';

export default function BlogPublicNotes({ slug }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState({ notes: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData({ notes: [], total: 0, totalPages: 0 });
    fetchPublicNotes(slug, page, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(annotationError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, page, retry]);
  return <section className="blog-public-notes" aria-label="Public notes">
    <h2>Public notes{!loading && !error ? ` (${data.total})` : ''}</h2>
    <p>Definitions, ideas and things readers want to remember.</p>
    {loading && <p role="status">Loading public notes…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
    {!loading && !error && !data.total && <p>No public notes yet.</p>}
    <div className="blog-notes-list">{data.notes.map((note) => <BlogNote key={note.id} note={note} />)}</div>
    {!loading && !error && data.totalPages > 1 && <div className="blog-note-controls" aria-label="Public notes pages">
      <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
      <span>Page {page} of {data.totalPages}</span>
      <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
    </div>}
  </section>;
}
