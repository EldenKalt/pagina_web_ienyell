'use client';

// GET/POST /api/blog/:slug/notes, PATCH/DELETE /api/notes/:id are owner-only.
// Public notes have their own paginated collection; they are never comments.
// Create accepts { body, anchor: fullSelector|null, isPublic } and an
// Idempotency-Key header. Responses retain anchor as a display quote,
// selector for resolution, and paragraphId for small editorial corrections.
import { authFetch } from './authHelper';
import { BLOG_USE_PLACEHOLDER_NOTES, getPlaceholderNotes } from '../data/blogPlaceholderNotes';
export const NOTE_LIMIT = 2500;
export const NOTES_DEMO = BLOG_USE_PLACEHOLDER_NOTES;
const pathFor = (slug) => `/api/blog/${encodeURIComponent(slug)}`;
const demoWrite = () => { if (NOTES_DEMO) throw new Error('Demo notes are read-only.'); };
export function fetchNotes(slug, signal) {
  if (NOTES_DEMO) return Promise.resolve({ notes: getPlaceholderNotes() });
  return authFetch(`${pathFor(slug)}/notes`, { cache: 'no-store', signal });
}
export function fetchPublicNotes(slug, page = 1, signal) {
  if (NOTES_DEMO) {
    const notes = getPlaceholderNotes().filter((note) => note.isPublic);
    return Promise.resolve({ notes, total: notes.length, page: 1, totalPages: notes.length ? 1 : 0 });
  }
  return authFetch(`${pathFor(slug)}/public-notes?page=${page}&limit=6`, { cache: 'no-store', signal });
}
export function createNote(slug, payload, requestKey) {
  demoWrite();
  return authFetch(`${pathFor(slug)}/notes`, { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify(payload) });
}
export function updateNote(id, payload) {
  demoWrite();
  return authFetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function deleteNote(id) {
  demoWrite();
  return authFetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export function annotationError(error) {
  if (error?.status === 401) return 'Your session expired. Please sign in again; your draft is still here.';
  if (error?.status >= 500) return 'This could not be saved right now. Please try again.';
  return error?.data?.error || (error?.status ? 'This action is unavailable.' : 'Could not connect. Please try again.');
}
