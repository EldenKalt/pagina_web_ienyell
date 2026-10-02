'use client';

// UI-phase seam for the comment thread.
//
// The inline section loads comments a block at a time, so it needs a paginated,
// asynchronous source from the start — not an array it can slice. Building it
// against this module means reconnecting to the API is a change of branch here
// and nothing at all in the components.
//
// BACKEND CONTRACT, when it exists:
//   GET /api/blog/:slug/comments?page=&limit=
//     200 { comments: [...], total, page, totalPages }
//   GET /api/comments/:id/replies
//     200 { replies: [...] }
//   Replies are fetched per comment and ON DEMAND, not folded into the list
//   above: a thread can carry a dozen of them and nobody reading the page wants
//   all of them for every comment before the first one is visible. The comment
//   carries its `replies` COUNT so the control can be labelled without the
//   request.
//   Pagination follows the convention already used by GET /api/blog: `page` and
//   `limit` query params, and a `{ items, total, page, totalPages }` envelope.
//   `total` counts replies too, which is what the header shows; `comments.length`
//   is the top-level rows on this page.
//
// Each comment carries an optional `highlight`: the article fragment it is
// anchored to. That is the field that will connect this thread to the inline
// annotation system — the same comment appears here, in its highlight's panel,
// and in the reader's profile.

import { getApiBase } from './authHelper';
import {
  BLOG_USE_PLACEHOLDER_COMMENTS,
  getPlaceholderComments,
  getPlaceholderCommentCount,
  getPlaceholderReplies,
} from '../data/blogPlaceholderComments';

export const COMMENTS_PER_BLOCK = 3;

/**
 * @param {string} slug
 * @param {{ page?: number, limit?: number }} [options]
 * @returns {Promise<{ comments: Array, total: number, page: number, totalPages: number }>}
 */
export async function fetchComments(slug, { page = 1, limit = COMMENTS_PER_BLOCK } = {}) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) {
    const all = getPlaceholderComments();
    const totalPages = Math.max(1, Math.ceil(all.length / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * limit;

    // A real request is not instant, and a loading state that never shows is a
    // loading state nobody has looked at.
    await new Promise((resolve) => setTimeout(resolve, 450));

    return {
      comments: all.slice(start, start + limit),
      total: getPlaceholderCommentCount(),
      page: safePage,
      totalPages,
    };
  }

  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await fetch(
    `${apiBase}/api/blog/${encodeURIComponent(slug)}/comments?${params}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!response.ok) throw new Error('The comments could not be loaded.');

  const data = await response.json();
  return {
    comments: Array.isArray(data.comments) ? data.comments : [],
    total: Number(data.total || 0),
    page: Number(data.page || page),
    totalPages: Number(data.totalPages || 1),
  };
}

/**
 * The replies to one comment.
 *
 * ONE LEVEL. A reply that answers another reply still belongs to the top-level
 * comment and carries `toName` instead of another level of indentation — see
 * data/blogPlaceholderComments.js for why.
 *
 * @returns {Promise<{ replies: Array }>}
 */
export async function fetchReplies(commentId) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { replies: getPlaceholderReplies(commentId) };
  }

  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const response = await fetch(
    `${apiBase}/api/comments/${encodeURIComponent(commentId)}/replies`,
    { headers: { Accept: 'application/json' } },
  );

  if (!response.ok) throw new Error('The replies could not be loaded.');

  const data = await response.json();
  return { replies: Array.isArray(data.replies) ? data.replies : [] };
}
