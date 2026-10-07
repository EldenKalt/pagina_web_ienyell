'use client';

import { authFetch } from './authHelper';

export const getOwnProfile = (signal) => authFetch('/api/users/me/profile', { cache: 'no-store', signal });
export const updateOwnProfile = (payload) => authFetch('/api/users/me/profile', { method: 'PATCH', body: JSON.stringify(payload) });
export const profilePage = (path, page = 1, signal) => authFetch(`${path}${path.includes('?') ? '&' : '?'}page=${page}`, { cache: 'no-store', signal });
export const searchWishlistProducts = (query, signal) => authFetch(`/api/users/me/wishlist/search?q=${encodeURIComponent(query)}`, { cache: 'no-store', signal });
export const addWishlistProduct = (id) => authFetch(`/api/users/me/wishlist/${id}`, { method: 'PUT' });
export const removeWishlistProduct = (id) => authFetch(`/api/users/me/wishlist/${id}`, { method: 'DELETE' });

export function profileError(error) {
  if (error?.status === 401) return 'Your session expired. Sign in again.';
  return error?.data?.error || 'The profile could not be loaded. Please try again.';
}
