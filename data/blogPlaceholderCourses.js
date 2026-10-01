/**
 * Placeholder courses for the post template's "related courses" block.
 *
 * COURSES DO NOT EXIST IN THIS PROJECT. There is no model, no route, no data and
 * no admin surface for them — the header's "Learn" link is itself a placeholder
 * (`href="#"`). Everything here is invented so the block can be laid out and
 * reviewed; none of it describes a decided content type.
 *
 * Unlike the related posts, which come from real mock posts and link to real
 * pages, these link nowhere. `href: null` is deliberate: the card renders, and
 * what it would point at is an open question.
 *
 * When courses become real, the fields that matter are the ones used here:
 *   title, excerpt, coverUrl, keywords[], launchedAt, updatedAt, stats, href
 */

export const BLOG_USE_PLACEHOLDER_COURSES = true;

export const BLOG_PLACEHOLDER_COURSES = [
  {
    id: 'c1',
    title: 'Lorem ipsum dolor sit amet consectetur',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.',
    coverUrl: '/recursos/placeholder_gallery_1.svg',
    keywords: ['Illustration', 'Process'],
    launchedAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
    badge: 'Course',
    href: null,
    stats: { likes: 1840, comments: 96, shares: 54 },
  },
  {
    id: 'c2',
    title: 'Lorem ipsum adipiscing elit sed do eiusmod tempor incididunt ut labore',
    // EDGE CASE: long title, exercises the card clamp
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    coverUrl: '/recursos/placeholder_gallery_2.svg',
    keywords: ['Character Design'],
    launchedAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    badge: 'Course',
    href: null,
    stats: { likes: 420, comments: 11, shares: 7 },
  },
  {
    id: 'c3',
    title: 'Lorem ipsum tempor incididunt',
    excerpt: null,
    // EDGE CASE: no description
    coverUrl: '/recursos/placeholder_gallery_4.svg',
    keywords: ['Productivity', 'Tools'],
    launchedAt: '2026-01-08T10:00:00.000Z',
    updatedAt: null,
    // EDGE CASE: never updated — only a launch date
    badge: 'Course',
    href: null,
    stats: { likes: 97, comments: 3, shares: 1 },
  },
  {
    id: 'c4',
    title: 'Lorem ipsum ut labore et dolore',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    coverUrl: null,
    // EDGE CASE: no cover — the card must not leave an empty box
    keywords: ['Fiction'],
    launchedAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    badge: 'Course',
    href: null,
    stats: { likes: 2310, comments: 142, shares: 88 },
  },
];

export function getPlaceholderCourses() {
  return BLOG_PLACEHOLDER_COURSES;
}
