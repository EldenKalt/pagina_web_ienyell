/**
 * Placeholder comments for the UI phase.
 *
 * There is no comments table, endpoint or model yet — see the annotation
 * architecture note. This file exists so the section's layout, states and
 * keyboard path can be reviewed against content of realistic shape, and it is
 * the seam that gets replaced by the real API, not a proposed schema.
 *
 * `highlight` is the fragment of the article a comment is anchored to. The
 * reference shows it quoted above the comment body, and it is what will connect
 * this list to the inline annotation system: a comment made on a highlight shows
 * up here as well as in its own panel.
 *
 * `isFeatured` is set from the admin: the owner marks a comment as worth showing,
 * and the series hero pulls the most relevant ones as testimonials. It is a
 * curation flag, not a popularity score — a quiet comment can be featured and a
 * much-liked one left alone.
 *
 * Lengths and shapes are varied on purpose, and three edge cases are seeded:
 *   - one comment anchored to a highlight, one not
 *   - one with no replies at all
 *   - one very long body, to exercise the wrap
 */

export const BLOG_USE_PLACEHOLDER_COMMENTS = false;

const READER_AVATAR = '/recursos/profile_picture.webp';

export const BLOG_PLACEHOLDER_COMMENTS = [
  {
    id: 1,
    author: { name: 'Lorem Ipsum', pronouns: 'she/her', avatarUrl: READER_AVATAR },
    // (Dynamic metadata: comment.author.name / .pronouns / .avatarUrl)
    publishedAt: '2026-09-20T09:12:00.000Z',
    highlight:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi. Aliquam in hendrerit urna.',
    // (Dynamic content: the article fragment this comment is anchored to)
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    // (Dynamic content: comment.body)
    likes: 24,
    replies: 3,
    isFeatured: true,
  },
  {
    id: 2,
    author: { name: 'Dolor Sit', pronouns: 'they/them', avatarUrl: READER_AVATAR },
    publishedAt: '2026-09-19T17:40:00.000Z',
    highlight: null,
    // EDGE CASE: no highlight — the comment is on the post as a whole
    body: 'Lorem ipsum dolor sit.',
    // EDGE CASE: very short body
    likes: 2,
    replies: 0,
    // EDGE CASE: no replies
  },
  {
    id: 3,
    author: { name: 'Consectetur Adipiscing Elit', pronouns: 'he/him', avatarUrl: null },
    // EDGE CASE: long display name, and no avatar
    publishedAt: '2026-09-18T11:05:00.000Z',
    highlight: null,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi, aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis tellus, nullam quis imperdiet augue vestibulum auctor ornare leo, non suscipit magna interdum eu.',
    // EDGE CASE: long body, exercises the wrap and the row rhythm
    likes: 131,
    replies: 12,
  },
  {
    id: 4,
    author: { name: 'Sed Eiusmod', pronouns: 'she/her', avatarUrl: READER_AVATAR },
    publishedAt: '2026-09-17T14:22:00.000Z',
    highlight: 'Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi, aliquam in hendrerit urna.',
    likes: 48,
    replies: 5,
    isFeatured: true,
  },
  {
    id: 5,
    author: { name: 'Tempor Incididunt', pronouns: 'he/him', avatarUrl: READER_AVATAR },
    publishedAt: '2026-09-16T08:03:00.000Z',
    highlight: null,
    body: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
    likes: 7,
    replies: 1,
  },
  {
    id: 6,
    author: { name: 'Magna Aliqua', pronouns: 'they/them', avatarUrl: null },
    publishedAt: '2026-09-15T19:47:00.000Z',
    highlight: null,
    body: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    likes: 63,
    replies: 8,
    isFeatured: true,
  },
  {
    id: 7,
    author: { name: 'Veniam Quis', pronouns: 'she/her', avatarUrl: READER_AVATAR },
    publishedAt: '2026-09-14T10:15:00.000Z',
    highlight: 'Maecenas vitae mattis tellus. Nullam quis imperdiet augue.',
    body: 'Nostrud exercitation ullamco laboris.',
    likes: 15,
    replies: 0,
  },
  {
    id: 8,
    author: { name: 'Excepteur Sint', pronouns: 'he/him', avatarUrl: READER_AVATAR },
    publishedAt: '2026-09-13T16:30:00.000Z',
    highlight: null,
    body: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    likes: 31,
    replies: 2,
  },
  {
    id: 9,
    author: { name: 'Occaecat Cupidatat Non Proident Sunt', pronouns: 'they/them', avatarUrl: null },
    publishedAt: '2026-09-12T07:58:00.000Z',
    highlight: null,
    body: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem.',
    likes: 4,
    replies: 0,
  },
];

/** Emulates the count the API would return for the whole thread, replies included. */
export function getPlaceholderCommentCount() {
  return BLOG_PLACEHOLDER_COMMENTS.reduce(
    (total, comment) => total + 1 + (comment.replies || 0),
    0,
  );
}

/**
 * Comments the owner has featured, most liked first.
 *
 * Emulates `GET /api/blog/comments/featured?series=&limit=`. Sorting by likes
 * among already-curated comments is what "most relevant" means here: the owner
 * chooses the pool, readers order it.
 */
export function getFeaturedComments(limit = 3) {
  return BLOG_PLACEHOLDER_COMMENTS
    .filter((comment) => comment.isFeatured)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, limit);
}

/** Newest first, the order a comment list is normally read in. */
/**
 * Replies, keyed by the comment they answer.
 *
 * ONE LEVEL, DELIBERATELY. A reply to a reply still belongs to the top-level
 * comment: the reading column is 680px and every further level of indentation
 * eats into it, so a thread that nests without limit ends up a column of single
 * words. The person being answered is named in the reply instead, which is what
 * carries the structure that the indentation would have.
 *
 * Seeded against the counts already on the comments above, so the "3 replies" a
 * comment advertises is the number that actually arrives.
 *
 * Edge cases: a reply that answers another reply (flattened, with `toName`), a
 * long one, and a comment whose count is larger than the replies seeded here —
 * the UI must not promise more than it can show.
 */
export const BLOG_PLACEHOLDER_REPLIES = {
  1: [
    {
      id: 101,
      parentId: 1,
      author: { name: 'Consectetur Adipiscing', pronouns: 'he/him', avatarUrl: READER_AVATAR },
      publishedAt: '2026-09-20T10:05:00.000Z',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
      likes: 4,
    },
    {
      id: 102,
      parentId: 1,
      toName: 'Consectetur Adipiscing',
      // EDGE CASE: answers another reply. Flattened to the same level, with the
      // name carrying what the indentation would have.
      author: { name: 'Lorem Ipsum', pronouns: 'she/her', avatarUrl: READER_AVATAR },
      publishedAt: '2026-09-20T11:20:00.000Z',
      body: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
      // EDGE CASE: long reply
      likes: 11,
    },
    {
      id: 103,
      parentId: 1,
      author: { name: 'Tempor Incididunt', pronouns: 'they/them', avatarUrl: READER_AVATAR },
      publishedAt: '2026-09-21T08:00:00.000Z',
      body: 'Sed do eiusmod.',
      likes: 0,
    },
  ],
  3: [
    {
      id: 301,
      parentId: 3,
      author: { name: 'Magna Aliqua', pronouns: 'she/her', avatarUrl: READER_AVATAR },
      publishedAt: '2026-09-18T12:00:00.000Z',
      body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      likes: 2,
    },
  ],
  // EDGE CASE: comment 3 advertises 12 replies and only one is seeded. What the
  // thread shows is what it has, not what the counter claims.
};

/** The replies to one comment, newest last — a thread reads in order. */
export function getPlaceholderReplies(commentId) {
  return (BLOG_PLACEHOLDER_REPLIES[commentId] || []).map((reply) => ({ ...reply }));
}

export function getPlaceholderComments() {
  return [...BLOG_PLACEHOLDER_COMMENTS].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
}
