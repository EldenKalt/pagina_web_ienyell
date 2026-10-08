'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../lib/authHelper';

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadIssue, setHasLoadIssue] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setHasLoadIssue(false);
    try {
      const response = await authFetch('/api/admin/summary');
      setOverview(response);
    } catch {
      setOverview(null);
      setHasLoadIssue(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const metrics = useMemo(() => ({
    totalProjects: overview?.portfolio?.total ?? 0,
    publishedProjects: overview?.portfolio?.published ?? 0,
    totalPosts: overview?.blog?.total ?? 0,
    publishedPosts: overview?.blog?.published ?? 0,
    pendingRequests: overview?.commissions?.pending ?? 0,
    totalRequests: overview?.commissions?.total ?? 0,
    totalWaitlist: overview?.waitlist?.total ?? 0,
    newRequests: overview?.commissions?.latestPending ?? [],
  }), [overview]);

  return (
    <section className="ienyell-admin-page ienyell-admin-overview">
      <header className="ienyell-admin-page-heading ienyell-admin-overview-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Studio overview</p>
          <h1>Hello{user?.name ? `, ${user.name}` : ''}.</h1>
          <p>Here is the small, useful picture of what your creative space needs today.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" onClick={loadOverview} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {hasLoadIssue ? (
        <p className="ienyell-admin-notice" role="status">
          Some information is unavailable right now. The remaining sections are still ready to use.
        </p>
      ) : null}

      <div className="ienyell-admin-metrics">
        <Link href="/admin/portfolio" className="ienyell-admin-metric-card">
          <span>Portfolio</span>
          <strong>{loading ? '—' : metrics.totalProjects}</strong>
          <small>{loading ? 'Loading work…' : `${metrics.publishedProjects} visible on the site`}</small>
        </Link>
        <Link href="/admin/blog" className="ienyell-admin-metric-card">
          <span>Journal</span>
          <strong>{loading ? '—' : metrics.totalPosts}</strong>
          <small>{loading ? 'Loading stories…' : `${metrics.publishedPosts} published pieces`}</small>
        </Link>
        <Link href="/admin/commissions" className="ienyell-admin-metric-card is-accent">
          <span>Commission requests</span>
          <strong>{loading ? '—' : metrics.pendingRequests}</strong>
          <small>{loading ? 'Loading requests…' : `${metrics.totalRequests} in the full archive`}</small>
        </Link>
        <Link href="/admin/waitlist" className="ienyell-admin-metric-card">
          <span>Waitlist</span>
          <strong>{loading ? '—' : metrics.totalWaitlist}</strong>
          <small>People to keep in mind</small>
        </Link>
      </div>

      <div className="ienyell-admin-overview-grid">
        <section className="ienyell-admin-panel">
          <div className="ienyell-admin-panel-heading">
            <div><p className="ienyell-admin-eyebrow">Your next replies</p><h2>New requests</h2></div>
            <Link href="/admin/commissions">Open desk</Link>
          </div>
          {loading ? <p className="ienyell-admin-panel-empty">Loading requests…</p> : metrics.newRequests.length ? (
            <div className="ienyell-admin-recent-list">
              {metrics.newRequests.slice(0, 4).map((request) => (
                <Link href="/admin/commissions" key={request.id} className="ienyell-admin-recent-item">
                  <span><strong>{request?.name || 'Unnamed request'}</strong><small>{request?.type || 'Custom commission'}</small></span>
                  <time>{formatDate(request?.receivedAt)}</time>
                </Link>
              ))}
            </div>
          ) : <p className="ienyell-admin-panel-empty">No new requests right now. Your desk is clear.</p>}
        </section>

        <section className="ienyell-admin-panel ienyell-admin-panel-note">
          <p className="ienyell-admin-eyebrow">Quick path</p>
          <h2>Make the next piece easy to find.</h2>
          <p>Start a portfolio entry while the process is fresh, or save a note for the journal before it disappears.</p>
          <div className="ienyell-admin-panel-actions">
            <Link href="/admin/portfolio/new">New portfolio piece</Link>
            <Link href="/admin/blog/new">Write a journal post</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
