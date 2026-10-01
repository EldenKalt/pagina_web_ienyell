'use client';

import { useEffect, useMemo, useState } from 'react';

import { authFetch, getApiBase } from '../../../lib/authHelper';

const STATUS_OPTIONS = [
  ['pending', 'New'],
  ['reviewing', 'Reviewing'],
  ['accepted', 'Accepted'],
  ['declined', 'Declined'],
  ['closed', 'Closed'],
];

function listFromResponse(response) {
  return Array.isArray(response) ? response : (response?.commissions || []);
}

function formatDate(value) {
  if (!value) return 'No date recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date recorded';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function contactFor(request) {
  return request?.contact && typeof request.contact === 'object' ? request.contact : {};
}

function requestName(request) {
  const contact = contactFor(request);
  return contact.name || request.name || 'Unnamed request';
}

function requestEmail(request) {
  const contact = contactFor(request);
  return contact.email || request.email || '';
}

function requestType(request) {
  return request.service || request.category || request.wizard || 'Custom commission';
}

function requestDescription(request) {
  const contact = contactFor(request);
  return contact.description || contact.message || request.description || request.message || '';
}

function referenceHref(request, filename) {
  const apiBase = getApiBase();
  return `${apiBase}/api/commissions/${encodeURIComponent(request.id)}/references/${encodeURIComponent(filename)}`;
}

export default function CommissionsAdminPage() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch('/api/commissions');
        if (!cancelled) setRequests(listFromResponse(response));
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'Requests could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRequests();
    return () => { cancelled = true; };
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return requests.filter((request) => {
      const status = String(request.status || 'pending').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalizedQuery) return true;
      return [request.id, requestName(request), requestEmail(request), requestType(request)]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    });
  }, [query, requests, statusFilter]);

  const selectedRequest = requests.find((request) => request.id === selectedId) || filteredRequests[0] || null;

  async function updateStatus(request, status) {
    setSavingId(request.id);
    setError('');
    try {
      const response = await authFetch(`/api/commissions/${encodeURIComponent(request.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const updated = response?.commission || { ...request, status };
      setRequests((current) => current.map((entry) => (entry.id === request.id ? updated : entry)));
    } catch (requestError) {
      setError(requestError?.data?.error || 'The request status could not be updated.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="ienyell-admin-page ienyell-admin-requests-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Commission desk</p>
          <h1>Requests worth making space for.</h1>
          <p>Review the briefs sent through the commission flow and keep every answer in one place.</p>
        </div>
        <span className="ienyell-admin-count">{requests.length} total</span>
      </header>

      <div className="ienyell-admin-toolbar">
        <label className="ienyell-admin-search-label">
          <span className="sr-only">Search commission requests</span>
          <input
            type="search"
            className="ienyell-admin-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or request…"
          />
        </label>
        <label className="ienyell-admin-select-label">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All requests</option>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}

      {loading ? (
        <div className="ienyell-admin-empty">Loading requests…</div>
      ) : !filteredRequests.length ? (
        <div className="ienyell-admin-empty">No requests match this view yet.</div>
      ) : (
        <div className="ienyell-admin-request-layout">
          <div className="ienyell-admin-request-list" aria-label="Commission requests">
            {filteredRequests.map((request) => {
              const active = selectedRequest?.id === request.id;
              const status = String(request.status || 'pending').toLowerCase();
              return (
                <button
                  key={request.id}
                  type="button"
                  className={`ienyell-admin-request-row ${active ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(request.id)}
                >
                  <span className="ienyell-admin-request-row-head">
                    <strong>{requestName(request)}</strong>
                    <span className={`ienyell-admin-status is-${status}`}>{status}</span>
                  </span>
                  <span>{requestType(request)}</span>
                  <small>{formatDate(request.receivedAt || request.submittedAt)}</small>
                </button>
              );
            })}
          </div>

          {selectedRequest ? (
            <article className="ienyell-admin-request-detail">
              <div className="ienyell-admin-request-detail-top">
                <div>
                  <p className="ienyell-admin-eyebrow">{requestType(selectedRequest)}</p>
                  <h2>{requestName(selectedRequest)}</h2>
                  {requestEmail(selectedRequest) ? (
                    <a href={`mailto:${requestEmail(selectedRequest)}`}>{requestEmail(selectedRequest)}</a>
                  ) : null}
                </div>
                <label className="ienyell-admin-status-control">
                  <span className="sr-only">Request status</span>
                  <select
                    value={String(selectedRequest.status || 'pending').toLowerCase()}
                    onChange={(event) => updateStatus(selectedRequest, event.target.value)}
                    disabled={savingId === selectedRequest.id}
                  >
                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <dl className="ienyell-admin-request-meta">
                <div><dt>Received</dt><dd>{formatDate(selectedRequest.receivedAt || selectedRequest.submittedAt)}</dd></div>
                <div><dt>Request ID</dt><dd>{selectedRequest.id}</dd></div>
                {contactFor(selectedRequest).budget ? <div><dt>Budget</dt><dd>{contactFor(selectedRequest).budget}</dd></div> : null}
              </dl>

              {requestDescription(selectedRequest) ? (
                <div className="ienyell-admin-request-copy">
                  <h3>Brief</h3>
                  <p>{requestDescription(selectedRequest)}</p>
                </div>
              ) : null}

              {Array.isArray(selectedRequest.referenceFiles) && selectedRequest.referenceFiles.length ? (
                <div className="ienyell-admin-request-copy">
                  <h3>References</h3>
                  <div className="ienyell-admin-file-list">
                    {selectedRequest.referenceFiles.map((filename) => (
                      <a key={filename} href={referenceHref(selectedRequest, filename)} target="_blank" rel="noreferrer">
                        {filename}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
