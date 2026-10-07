'use client';

// Root comments are paginated; replies load only when a reader opens a thread.
import { authFetch, getApiBase } from './authHelper';
import { BLOG_USE_PLACEHOLDER_COMMENTS, getPlaceholderComments, getPlaceholderCommentCount, getPlaceholderReplies } from '../data/blogPlaceholderComments';

export const COMMENTS_PER_BLOCK = 3;
export const COMMENT_LIMIT = 2500;
const postPath = (slug) => `/api/blog/${encodeURIComponent(slug)}`;

async function publicGet(path, signal) {
  const base = getApiBase();
  if (!base) throw new Error('The blog service is not configured.');
  const response = await fetch(`${base}${path}`, { cache: 'no-store', credentials: 'include', headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    const error = new Error('The comments could not be loaded.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function fetchComments(slug, { page = 1, limit = COMMENTS_PER_BLOCK, paragraphId, placement, signal } = {}) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) {
    const all = getPlaceholderComments();
    const totalPages = Math.ceil(all.length / limit);
    return { comments: all.slice((page - 1) * limit, page * limit), total: getPlaceholderCommentCount(), page, totalPages };
  }
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (paragraphId) params.set('paragraph', paragraphId);
  if (placement) params.set('placement', placement);
  return publicGet(`${postPath(slug)}/comments?${params}`, signal);
}

export async function fetchCommentLocations(slug, signal) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) return { paragraphs: [], previousCount: 0, generalCount: getPlaceholderCommentCount(), total: getPlaceholderCommentCount() };
  return publicGet(`${postPath(slug)}/comment-locations`, signal);
}

export async function fetchReplies(commentId, signal) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) return { replies: getPlaceholderReplies(commentId) };
  return publicGet(`/api/comments/${encodeURIComponent(commentId)}/replies`, signal);
}

export function createComment(slug, payload) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) throw new Error('Demo comments are read-only.');
  return authFetch(`${postPath(slug)}/comments`, { method: 'POST', body: JSON.stringify(payload) });
}

export function createReply(parentId, body) {
  if (BLOG_USE_PLACEHOLDER_COMMENTS) throw new Error('Demo comments are read-only.');
  return authFetch(`/api/comments/${encodeURIComponent(parentId)}/replies`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function fetchAdminThreads(postId, signal, page = 1) {
  return authFetch(`/api/blog/admin/${encodeURIComponent(postId)}/comment-threads?page=${page}`, { cache: 'no-store', signal });
}

export function reassignThreads(postId, threadIds, paragraphId) {
  return authFetch(`/api/blog/admin/${encodeURIComponent(postId)}/comment-threads/reassign`, {
    method: 'POST', body: JSON.stringify({ threadIds, paragraphId }),
  });
}

export function commentError(error) {
  if (error?.status === 401) return 'Your session expired. Sign in again; your text is still here.';
  if (error?.status >= 500) return 'The comment could not be saved right now. Please try again.';
  return error?.data?.error || error?.message || 'Could not connect. Please try again.';
}
