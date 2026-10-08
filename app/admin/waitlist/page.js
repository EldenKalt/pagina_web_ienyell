'use client';

import { useEffect, useState } from 'react';

import { authFetch } from '../../../lib/authHelper';

const pageSize = 20;

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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === debouncedQuery) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    async function loadWaitlist() {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch(`/api/waitlist?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const legacy = Array.isArray(response);
          setEntries(legacy ? response : (response?.waitlist || []));
          setTotal(legacy ? response.length : response.total);
          setPage(legacy ? 1 : response.page);
          setTotalPages(legacy ? 1 : response.totalPages);
        }
      } catch (requestError) {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setError(requestError?.data?.error || 'The waitlist could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadWaitlist();
    return () => controller.abort();
  }, [page, debouncedQuery]);

  return (
    <section className="ienyell-admin-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Future collaborations</p>
          <h1>The people waiting for the right moment.</h1>
          <p>This is a quiet list of people who asked to hear from you when they are ready to commission.</p>
        </div>
        <span className="ienyell-admin-count">{total} people</span>
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
      ) : !entries.length ? (
        <div className="ienyell-admin-empty">No one is waiting here yet.</div>
      ) : (
        <div className="ienyell-admin-table-wrap">
          <table className="ienyell-admin-table">
            <thead><tr><th>Person</th><th>Interested in</th><th>Joined</th><th>Notes</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
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
      {totalPages > 1 ? (
        <nav className="ienyell-admin-pager" aria-label="Pagination">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </nav>
      ) : null}
    </section>
  );
}
