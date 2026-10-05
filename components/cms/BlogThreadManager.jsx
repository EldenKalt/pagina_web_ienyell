'use client';

import { useEffect, useState } from 'react';
import { commentError, fetchAdminThreads, reassignThreads } from '../../lib/comments';

export default function BlogThreadManager({ postId, prepare }) {
  const [data, setData] = useState({ paragraphs: [], threads: [], page: 0, totalPages: 0, total: 0 });
  const [selected, setSelected] = useState([]);
  const [destination, setDestination] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async (signal) => {
    if (!postId) return;
    setBusy(true); setError('');
    try {
      const saved = await prepare?.();
      if (saved === null) throw new Error('Save a valid article before moving conversations.');
      const result = await fetchAdminThreads(postId, signal);
      if (!signal?.aborted) { setData(result); setSelected([]); setReview(false); }
    } catch (failure) { if (!signal?.aborted) setError(commentError(failure)); }
    finally { if (!signal?.aborted) setBusy(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    // Initial view reads the already-saved article. Refresh explicitly saves edits.
    fetchAdminThreads(postId, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(commentError(failure)); });
    return () => controller.abort();
  }, [postId]);
  const toggle = (id) => { setReview(false); setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); };
  const loadMore = async () => {
    if (busy || data.page >= data.totalPages) return;
    setBusy(true); setError('');
    try {
      const next = await fetchAdminThreads(postId, undefined, data.page + 1);
      setData((current) => ({ ...next, threads: [...current.threads, ...next.threads] }));
    } catch (failure) { setError(commentError(failure)); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await prepare?.();
      if (saved === null) throw new Error('Save a valid article before moving conversations.');
      const target = destination === '__unassigned__' ? null : destination;
      const result = await reassignThreads(postId, selected, target);
      setMessage(`${result.reassigned} conversation${result.reassigned === 1 ? '' : 's'} moved.`);
      const fresh = await fetchAdminThreads(postId);
      setData(fresh); setSelected([]); setReview(false);
    } catch (failure) { setError(commentError(failure)); }
    finally { setBusy(false); }
  };
  if (!postId) return <p>Save the article before managing conversations.</p>;
  const destinationLabel = destination === '__unassigned__' ? 'Leave unassigned' : data.paragraphs.find((item) => item.id === destination)?.text.slice(0, 80);
  return <div className="cms-thread-manager">
    <p>Move complete conversations, including every reply. The original quote stays with the thread.</p>
    <button type="button" className="cms-btn cms-btn-sm" disabled={busy} onClick={() => load()}>Refresh after editing</button>
    {error && <p role="alert" className="cms-login-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="cms-thread-list">
      {data.threads.map((thread) => <label key={thread.id} className="cms-thread-row">
        <input type="checkbox" checked={selected.includes(thread.id)} disabled={busy} onChange={() => toggle(thread.id)} />
        <span><strong>{thread.author?.name || 'Reader'} · {thread.replies} replies</strong>
          <small>{thread.paragraphStatus === 'current' ? 'On a current paragraph' : thread.paragraphStatus === 'general' ? 'General comment' : 'Earlier version or unassigned'}</small>
          <span>{thread.highlight || thread.paragraphSnapshot || thread.body}</span>
        </span>
      </label>)}
      {!data.threads.length && <p>No comment threads yet.</p>}
    </div>
    {data.page < data.totalPages && <button type="button" className="cms-btn cms-btn-sm" disabled={busy} onClick={loadMore}>
      {busy ? 'Loading…' : `Load more conversations (${data.threads.length} of ${data.total})`}
    </button>}
    {selected.length > 0 && <div className="cms-thread-actions">
      <label>Move {selected.length} conversation{selected.length === 1 ? '' : 's'} to
        <select className="cms-input" value={destination} onChange={(event) => { setDestination(event.target.value); setReview(false); }}>
          <option value="">Choose a destination</option>
          {data.paragraphs.map((paragraph) => <option key={paragraph.id} value={paragraph.id}>{paragraph.text.slice(0, 100) || '(Empty paragraph)'}</option>)}
          <option value="__unassigned__">Leave unassigned</option>
        </select>
      </label>
      {!review ? <button type="button" className="cms-btn" disabled={!destination || busy} onClick={() => setReview(true)}>Review move</button> :
        <div className="cms-thread-review" role="group" aria-label="Confirm thread reassignment">
          <p>Move {selected.length} complete conversation{selected.length === 1 ? '' : 's'} to “{destinationLabel}”? Their replies move with them; original quotes remain.</p>
          <button type="button" className="cms-btn cms-btn-primary" disabled={busy} onClick={apply}>{busy ? 'Moving…' : 'Confirm move'}</button>
          <button type="button" className="cms-btn" disabled={busy} onClick={() => setReview(false)}>Cancel</button>
        </div>}
    </div>}
  </div>;
}
