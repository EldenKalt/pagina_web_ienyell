'use client';

import { authFetch } from './authHelper';

const path = (slug) => `/api/blog/${encodeURIComponent(slug)}/save`;

export const fetchSavedState = (slug, signal) => authFetch(path(slug), { cache: 'no-store', signal });
export const saveBlogPost = (slug) => authFetch(path(slug), { method: 'PUT' });
export const unsaveBlogPost = (slug) => authFetch(path(slug), { method: 'DELETE' });
export const fetchSavedPosts = (page = 1, signal) => authFetch(`/api/blog/saved?page=${page}`, { cache: 'no-store', signal });

export function savedError(error) {
  if (error?.status === 401) return 'Your session expired. Sign in again to save this article.';
  return error?.data?.error || 'Your reading list could not be updated. Please try again.';
}
