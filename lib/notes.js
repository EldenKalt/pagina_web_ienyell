'use client';

// UI-phase seam for reader notes, matching the shape of lib/comments.js.
//
// NOTES ARE A SEPARATE OBJECT FROM COMMENTS — different endpoint, different
// ownership, different visibility rules. See data/blogPlaceholderNotes.js for
// where each one surfaces. They are deliberately not folded into the comments
// module even though a published note renders like a comment.
//
// BACKEND CONTRACT, when it exists:
//   GET    /api/blog/:slug/notes         -> 200 { notes: [...] }   own notes only
//   POST   /api/blog/:slug/notes         -> 201 { note }           { body, anchor, isPublic }
//   PATCH  /api/notes/:id                -> 200 { note }           { body, isPublic }
//   DELETE /api/notes/:id                -> 200 { deleted: true }
//   Every one of them is authenticated and scoped to the signed-in reader: a
//   note is private until `isPublic` says otherwise, and listing someone else's
//   is a profile request, not this one.

import { getApiBase } from './authHelper';
import {
  BLOG_USE_PLACEHOLDER_NOTES,
  getPlaceholderNotes,
} from '../data/blogPlaceholderNotes';

/**
 * The signed-in reader's notes on one post.
 * @returns {Promise<{ notes: Array }>}
 */
export async function fetchNotes(slug) {
  if (BLOG_USE_PLACEHOLDER_NOTES) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { notes: getPlaceholderNotes() };
  }

  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const response = await fetch(`${apiBase}/api/blog/${encodeURIComponent(slug)}/notes`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Your notes could not be loaded.');

  const data = await response.json();
  return { notes: Array.isArray(data.notes) ? data.notes : [] };
}
