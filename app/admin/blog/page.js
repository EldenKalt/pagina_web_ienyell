'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { authFetch } from '../../../lib/authHelper';
import {
  formatPublicationDateTime,
  getPublicationState,
} from '../../../lib/publishing';

export default function BlogAdminPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setError('');

      try {
        const data = await authFetch('/api/blog/admin?view=summary');
        if (!cancelled) {
          setPosts(Array.isArray(data?.posts) ? data.posts : []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError?.data?.error
              || requestError?.message
              || 'Unable to load blog posts.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTogglePublish(post) {
    setWorkingId(post.id);
    setError('');

    try {
      const updatedPost = await authFetch(`/api/blog/${post.id}/publish`, {
        method: 'PATCH',
      });
      setPosts((currentPosts) => currentPosts.map((entry) => (
        entry.id === post.id
          ? {
              ...entry,
              ...updatedPost,
              isPublished: !post.isPublished,
            }
          : entry
      )));
    } catch (requestError) {
      setError(
        requestError?.data?.error
          || requestError?.message
          || 'Unable to update this post.',
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function handleDelete(post) {
    if (!window.confirm(`Delete "${post.title}"?`)) return;

    setWorkingId(post.id);
    setError('');

    try {
      await authFetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      setPosts((currentPosts) => currentPosts.filter((entry) => entry.id !== post.id));
    } catch (requestError) {
      setError(
        requestError?.data?.error
          || requestError?.message
          || 'Unable to delete this post.',
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="cms-admin-page">
      <header className="cms-admin-header">
        <h1>Blog</h1>
        <Link href="/admin/blog/new" className="cms-btn cms-btn-primary">
          + New Post
        </Link>
      </header>

      {error && (
        <div className="blog-public-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="blog-loading" role="status">
          <span className="blog-loading-spinner" /> Loading…
        </div>
      ) : (
        <div className="cms-admin-table-wrap">
          <table className="cms-admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const state = getPublicationState(post);
                const busy = workingId === post.id;

                return (
                  <tr key={post.id}>
                    <td>
                      <strong>{post.title}</strong>
                      <span className="cms-admin-card-slug">/{post.slug}</span>
                    </td>
                    <td>
                      <span className={`cms-admin-badge cms-badge-${state}`}>
                        {state === 'published'
                          ? 'Published'
                          : state === 'scheduled'
                            ? 'Scheduled'
                            : 'Draft'}
                      </span>
                      {state === 'scheduled' && (
                        <span className="cms-admin-card-scheduled">
                          {formatPublicationDateTime(post.publishedAt)}
                        </span>
                      )}
                    </td>
                    <td>
                      {post.publishedAt
                        ? formatPublicationDateTime(post.publishedAt)
                        : '—'}
                    </td>
                    <td className="cms-admin-actions-cell">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        className="cms-btn cms-btn-sm"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="cms-btn cms-btn-sm"
                        onClick={() => handleTogglePublish(post)}
                        disabled={busy}
                      >
                        {post.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        className="cms-btn cms-btn-sm cms-btn-danger"
                        onClick={() => handleDelete(post)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !posts.length && !error && (
        <div className="blog-empty">No posts yet.</div>
      )}
    </main>
  );
}
