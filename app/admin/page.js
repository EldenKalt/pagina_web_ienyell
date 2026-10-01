'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '../../context/AuthContext';
import { authFetch } from '../../lib/authHelper';

function listFromResponse(response, key) {
  return Array.isArray(response) ? response : (response?.[key] || []);
}

function countPublished(items) {
  return items.filter((item) => item.isPublished).length;
}

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function requestName(request) {
  return request?.contact?.name || request?.name || 'Unnamed request';
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({
    projects: [], posts: [], requests: [], waitlist: [],
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadIssue, setHasLoadIssue] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setHasLoadIssue(false);
    const responses = await Promise.allSettled([
      authFetch('/api/portfolio/projects?all=true'),
      authFetch('/api/blog/admin'),
      authFetch('/api/commissions'),
      authFetch('/api/waitlist'),
    ]);

    const [projects, posts, requests, waitlist] = responses.map((response, index) => {
      if (response.status !== 'fulfilled') return [];
      return listFromResponse(response.value, ['projects', 'posts', 'commissions', 'waitlist'][index]);
    });

    setOverview({ projects, posts, requests, waitlist });
    setHasLoadIssue(responses.some((response) => response.status === 'rejected'));
    setLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const metrics = useMemo(() => {
    const newRequests = overview.requests.filter((request) => String(request.status || 'pending').toLowerCase() === 'pending');
    return {
      totalProjects: overview.projects.length,
      publishedProjects: countPublished(overview.projects),
      totalPosts: overview.posts.length,
      publishedPosts: countPublished(overview.posts),
      newRequests,
    };
  }, [overview]);

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
          <strong>{loading ? '—' : metrics.newRequests.length}</strong>
          <small>{loading ? 'Loading requests…' : `${overview.requests.length} in the full archive`}</small>
        </Link>
        <Link href="/admin/waitlist" className="ienyell-admin-metric-card">
          <span>Waitlist</span>
          <strong>{loading ? '—' : overview.waitlist.length}</strong>
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
                  <span><strong>{requestName(request)}</strong><small>{request.service || request.category || request.wizard || 'Custom commission'}</small></span>
                  <time>{formatDate(request.receivedAt || request.submittedAt)}</time>
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
