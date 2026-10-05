'use client';
// Every endpoint returns only the authenticated reader's highlights.
import { authFetch } from './authHelper';
import { BLOG_USE_PLACEHOLDER_HIGHLIGHTS, getPlaceholderHighlights } from '../data/blogPlaceholderHighlights';
const url = (slug) => `/api/blog/${encodeURIComponent(slug)}/highlights`;
const checkDemo = () => { if (BLOG_USE_PLACEHOLDER_HIGHLIGHTS) throw new Error('Demo highlights are read-only.'); };
export function fetchHighlights(slug, signal) {
  if (BLOG_USE_PLACEHOLDER_HIGHLIGHTS) return Promise.resolve({ highlights: getPlaceholderHighlights().filter((highlight) => highlight.mine) });
  return authFetch(url(slug), { cache: 'no-store', signal });
}
export function createHighlight(slug, selector) {
  checkDemo();
  return authFetch(url(slug), { method: 'POST', body: JSON.stringify({ selector }) });
}
export function deleteHighlight(slug, id) {
  checkDemo();
  return authFetch(`${url(slug)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
