'use client';

import { authFetch, getApiBase } from './authHelper';

const postPath = (slug) => `/api/blog/${encodeURIComponent(slug)}`;

export async function fetchPostReactions(slug, signal) {
  const base = getApiBase();
  if (!base) throw new Error('The blog service is not configured.');
  const response = await fetch(`${base}${postPath(slug)}/reactions`, {
    credentials: 'include', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Reactions could not be loaded.');
  return response.json();
}

export const setPostLike = (slug, liked) => authFetch(`${postPath(slug)}/like`, { method: liked ? 'PUT' : 'DELETE' });
export const setCommentLike = (id, liked) => authFetch(`/api/comments/${encodeURIComponent(id)}/like`, { method: liked ? 'PUT' : 'DELETE' });
export const recordPostShare = (slug) => authFetch(`${postPath(slug)}/share`, { method: 'POST' });

export function reactionError(error) {
  if (error?.status === 401) return 'Your session expired. Sign in to react.';
  return error?.data?.error || 'Your reaction could not be saved. Please try again.';
}
