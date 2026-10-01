'use client';

import { useEffect, useMemo, useState } from 'react';

import { authFetch } from '../../../lib/authHelper';

function listFromResponse(response) {
  return Array.isArray(response) ? response : (response?.waitlist || []);
}

function formatDate(value) {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'No date recorded'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadWaitlist() {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch('/api/waitlist');
        if (!cancelled) setEntries(listFromResponse(response));
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'The waitlist could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadWaitlist();
    return () => { cancelled = true; };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => [entry.name, entry.email, entry.category]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery)));
  }, [entries, query]);

  return (
    <section className="ienyell-admin-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Future collaborations</p>
          <h1>The people waiting for the right moment.</h1>
          <p>This is a quiet list of people who asked to hear from you when they are ready to commission.</p>
        </div>
        <span className="ienyell-admin-count">{entries.length} people</span>
      </header>

      <div className="ienyell-admin-toolbar">
        <label className="ienyell-admin-search-label">
          <span className="sr-only">Search waitlist</span>
          <input
            type="search"
            className="ienyell-admin-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the waitlist…"
          />
        </label>
      </div>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      {loading ? (
        <div className="ienyell-admin-empty">Loading the waitlist…</div>
      ) : !filteredEntries.length ? (
        <div className="ienyell-admin-empty">No one is waiting here yet.</div>
      ) : (
        <div className="ienyell-admin-table-wrap">
          <table className="ienyell-admin-table">
            <thead><tr><th>Person</th><th>Interested in</th><th>Joined</th><th>Notes</th></tr></thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td><strong>{entry.name || 'Unnamed'}</strong>{entry.email ? <a href={`mailto:${entry.email}`}>{entry.email}</a> : null}</td>
                  <td>{entry.category || 'General commission'}</td>
                  <td>{formatDate(entry.receivedAt || entry.registeredAt)}</td>
                  <td>{entry.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
