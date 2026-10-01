'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { authFetch } from '../../../lib/authHelper';
import {
  formatPublicationDateTime,
  getPublicationState,
} from '../../../lib/publishing';

export default function PortfolioAdminPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      setLoading(true);
      setError('');

      try {
        const [categoryData, projectData] = await Promise.all([
          authFetch('/api/portfolio/categories'),
          authFetch('/api/portfolio/projects?all=true'),
        ]);

        if (!cancelled) {
          setCategories(Array.isArray(categoryData?.categories) ? categoryData.categories : []);
          setProjects(Array.isArray(projectData?.projects) ? projectData.projects : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.data?.error || err?.message || 'Unable to load portfolio projects.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadProjects() {
    const projectData = await authFetch('/api/portfolio/projects?all=true');
    setProjects(Array.isArray(projectData?.projects) ? projectData.projects : []);
    router.refresh();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this project?')) return;

    setError('');
    try {
      await authFetch(`/api/portfolio/projects/${id}`, { method: 'DELETE' });
      await reloadProjects();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Unable to delete this project.');
    }
  }

  async function handleTogglePublish(project) {
    setError('');
    try {
      await authFetch(`/api/portfolio/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !project.isPublished }),
      });
      await reloadProjects();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Unable to update this project.');
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    if (!normalizedSearch) return true;
    return [project.title, project.slug, project.client].some((value) =>
      String(value || '').toLowerCase().includes(normalizedSearch),
    );
  });
  const categoryMap = new Map(categories.map((category) => [category.slug, category.label]));

  return (
    <main className="cms-admin-page">
      <header className="cms-admin-header">
        <h1>Portfolio</h1>
        <Link href="/admin/portfolio/new" className="cms-btn cms-btn-primary">
          + New Project
        </Link>
      </header>

      <div className="cms-admin-search">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects…"
          className="cms-input"
        />
      </div>

      {error && (
        <div className="blog-public-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="blog-empty">Loading projects…</div>
      ) : (
        <div className="cms-admin-grid">
          {filteredProjects.map((project) => {
            const state = getPublicationState(project);
            const categoryLabels = (project.categories || [])
              .map((slug) => categoryMap.get(slug) || slug)
              .join(', ');

            return (
              <article key={project.id} className="cms-admin-card">
                <div className="cms-admin-card-cover">
                  {project.coverUrl ? (
                    <img src={project.coverUrl} alt={project.title} />
                  ) : (
                    <div className="cms-admin-card-placeholder">No cover</div>
                  )}
                </div>
                <div className="cms-admin-card-body">
                  <h2>{project.title}</h2>
                  <p className="cms-admin-card-meta">{categoryLabels || 'Uncategorized'}</p>
                  <p className="cms-admin-card-slug">/{project.slug}</p>
                  <span className={`cms-admin-badge cms-badge-${state}`}>
                    {state === 'published'
                      ? 'Published'
                      : state === 'scheduled'
                        ? 'Scheduled'
                        : 'Draft'}
                  </span>
                  {state === 'scheduled' && (
                    <p className="cms-admin-card-scheduled">
                      {formatPublicationDateTime(project.publishedAt)}
                    </p>
                  )}
                </div>
                <div className="cms-admin-card-actions">
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm"
                    onClick={() => handleTogglePublish(project)}
                  >
                    {project.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <Link href={`/admin/portfolio/${project.id}/edit`} className="cms-btn cms-btn-sm">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm cms-btn-danger"
                    onClick={() => handleDelete(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !filteredProjects.length && (
        <div className="blog-empty">No projects found.</div>
      )}
    </main>
  );
}
