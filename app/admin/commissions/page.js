'use client';

import { useEffect, useState } from 'react';

import { authFetch, authFetchBlob, getApiBase } from '../../../lib/authHelper';

const STATUS_OPTIONS = [
  ['pending', 'New'],
  ['reviewing', 'Reviewing'],
  ['accepted', 'Accepted'],
  ['declined', 'Declined'],
  ['closed', 'Closed'],
];

const pageSize = 20;

function buildFilterParams(query, status, family, category, subService, from, to) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (status !== 'all') params.set('status', status);
  if (family !== 'all') params.set('family', family);
  if (category !== 'all') {
    params.set('category', category);
    if (subService !== 'all') params.set('subService', subService);
  }
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params;
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceOptions, setServiceOptions] = useState(null);
  const [serviceFiltersUnavailable, setServiceFiltersUnavailable] = useState(false);
  const [family, setFamily] = useState('all');
  const [category, setCategory] = useState('all');
  const [subService, setSubService] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [debouncedFrom, setDebouncedFrom] = useState('');
  const [debouncedTo, setDebouncedTo] = useState('');
  const [includeName, setIncludeName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');

  const invalidDateRange = Boolean(debouncedFrom && debouncedTo && debouncedFrom > debouncedTo);
  const serviceFiltersDisabled = !serviceOptions || serviceFiltersUnavailable;
  const subServices = serviceOptions?.categories.find((option) => option.id === category)?.subServices || [];

  useEffect(() => {
    const controller = new AbortController();
    async function loadServiceOptions() {
      try {
        const response = await authFetch('/api/commissions/filters', { signal: controller.signal });
        if (!controller.signal.aborted) setServiceOptions(response);
      } catch (requestError) {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setServiceFiltersUnavailable(true);
        }
      }
    }
    loadServiceOptions();
    return () => controller.abort();
  }, []);

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
    if (from === debouncedFrom && to === debouncedTo) return;
    const timer = setTimeout(() => {
      setDebouncedFrom(from);
      setDebouncedTo(to);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [from, to, debouncedFrom, debouncedTo]);

  useEffect(() => {
    if (invalidDateRange) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const params = buildFilterParams(debouncedQuery, statusFilter, family, category, subService, debouncedFrom, debouncedTo);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    async function loadRequests() {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch(`/api/commissions?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          const legacy = Array.isArray(response);
          setRequests(legacy ? response : (response?.commissions || []));
          setTotal(legacy ? response.length : response.total);
          setPage(legacy ? 1 : response.page);
          setTotalPages(legacy ? 1 : response.totalPages);
        }
      } catch (requestError) {
        if (!controller.signal.aborted && requestError?.name !== 'AbortError') {
          setError(requestError?.data?.error || 'Requests could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadRequests();
    return () => controller.abort();
  }, [page, debouncedQuery, statusFilter, family, category, subService, debouncedFrom, debouncedTo, invalidDateRange]);

  const selectedRequest = requests.find((request) => request.id === selectedId) || requests[0] || null;

  function clearFilters() {
    setFamily('all');
    setCategory('all');
    setSubService('all');
    setFrom('');
    setTo('');
    setDebouncedFrom('');
    setDebouncedTo('');
    setPage(1);
  }

  async function exportCsv() {
    if (exporting || invalidDateRange) return;
    setExporting(true);
    setError('');
    try {
      const params = buildFilterParams(debouncedQuery, statusFilter, family, category, subService, debouncedFrom, debouncedTo);
      if (includeName) params.set('includeName', 'true');
      const blob = await authFetchBlob(`/api/commissions/export?${params}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      try {
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        link.href = url;
        link.download = `commissions-${date}.csv`;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (exportError) {
      setError(exportError?.data?.error || 'The export could not be created.');
    } finally {
      setExporting(false);
    }
  }

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
        <span className="ienyell-admin-count">{total} total</span>
      </header>

      <div className="ienyell-admin-toolbar ienyell-admin-requests-toolbar">
        <label className="ienyell-admin-search-label">
          <span className="sr-only">Search commission requests</span>
          <input
            type="search"
            className="ienyell-admin-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or request ID…"
          />
        </label>
        <label className="ienyell-admin-select-label">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}>
            <option value="all">All requests</option>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="ienyell-admin-filters">
          <label className="ienyell-admin-select-label">
            <span>Family</span>
            <select value={family} disabled={serviceFiltersDisabled} onChange={(event) => {
              setFamily(event.target.value);
              setPage(1);
            }}>
              <option value="all">All families</option>
              {(serviceOptions?.families || []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="ienyell-admin-select-label">
            <span>Category</span>
            <select value={category} disabled={serviceFiltersDisabled} onChange={(event) => {
              setCategory(event.target.value);
              setSubService('all');
              setPage(1);
            }}>
              <option value="all">All categories</option>
              {(serviceOptions?.categories || []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="ienyell-admin-select-label">
            <span>Sub-service</span>
            <select value={subService} disabled={serviceFiltersDisabled || category === 'all'} onChange={(event) => {
              setSubService(event.target.value);
              setPage(1);
            }}>
              <option value="all">All sub-services</option>
              {subServices.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="ienyell-admin-select-label">
            <span>From</span>
            <input className="ienyell-admin-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="ienyell-admin-select-label">
            <span>To</span>
            <input className="ienyell-admin-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          {invalidDateRange ? <p className="ienyell-admin-notice is-error" role="alert">"From" must be on or before "To".</p> : null}
          <button type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      </div>

      {serviceFiltersUnavailable ? <p className="ienyell-admin-notice">Service filters are unavailable.</p> : null}

      <div className="ienyell-admin-export">
        <label>
          <input type="checkbox" checked={includeName} onChange={(event) => setIncludeName(event.target.checked)} />
          <span>Include client name</span>
        </label>
        <button type="button" onClick={exportCsv} disabled={exporting || invalidDateRange}>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}

      {loading ? (
        <div className="ienyell-admin-empty">Loading requests…</div>
      ) : !requests.length ? (
        <div className="ienyell-admin-empty">No requests match this view yet.</div>
      ) : (
        <div className="ienyell-admin-request-layout">
          <div className="ienyell-admin-request-list" aria-label="Commission requests">
            {requests.map((request) => {
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
                  <span>{request.serviceFamily?.label || requestType(request)}</span>
                  <small>{formatDate(request.receivedAt || request.submittedAt)}</small>
                </button>
              );
            })}
          </div>

          {selectedRequest ? (
            <article className="ienyell-admin-request-detail">
              <div className="ienyell-admin-request-detail-top">
                <div>
                  <p className="ienyell-admin-eyebrow">{selectedRequest.serviceFamily?.label || requestType(selectedRequest)}</p>
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
