// The article body on its way to the page, and the one place that decides it is
// safe to render.
//
// NOT 'use client'. This has to run on the server, which is the whole point: the
// body is rendered into the initial HTML, and sanitising it on the client
// afterwards would produce different markup on the two sides and break
// hydration. It is sanitised ONCE, here, and both sides render the same string.
//
// ── THE SANITISER IS NOT WIRED, AND THAT IS DELIBERATE ──────────────────────
//
// While BLOG_USE_PLACEHOLDER_DATA is on, the body comes from
// data/blogPlaceholderPosts.js: it is the author's own content, committed to
// this repository, and it is trusted. Nothing needs to clean it.
//
// The moment that flag goes off, the body arrives from the API — written through
// the admin editor and, as things stand, STORED WITHOUT SANITISING on the
// server. Rendering that into a server-rendered page unexamined is a stored XSS
// hole, so this function REFUSES rather than passing it through, and the page
// fails loudly instead of quietly serving whatever the database holds.
//
// Two ways to clear that refusal, in order of preference:
//
//   1. Sanitise on write, in the backend, when a post is saved. The read path
//      then needs nothing at all, and existing rows get cleaned once by a
//      migration. This is the real fix and it also closes the hole for every
//      other consumer of that column.
//
//   2. Sanitise here, which needs a DOM on the server — `isomorphic-dompurify`
//      or jsdom. It works, but it runs a full HTML parser on every render of
//      every post for something that should happen once per save.
//
// Either way the change is this one function, and the allowlist below is the one
// the client used while sanitising on read, kept so nothing about what the
// editor is allowed to emit changes silently with it.

import { BLOG_USE_PLACEHOLDER_DATA } from '../data/blogPlaceholderPosts';

/** What the TipTap editor is allowed to emit beyond DOMPurify's defaults. */
export const ARTICLE_HTML_ALLOWANCES = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
};

/**
 * @param {string} html the post body as stored
 * @param {{ trusted?: boolean }} [options] trusted content skips the sanitiser;
 *        only the committed placeholder content qualifies today
 * @returns {string} html that is safe to render on the server
 */
export function sanitizeArticleHtml(html, { trusted = BLOG_USE_PLACEHOLDER_DATA } = {}) {
  if (!html) return '';

  if (trusted) return html;

  throw new Error(
    'sanitizeArticleHtml: the article body is server-rendered and no server-side ' +
      'sanitiser is configured. Content from the API must be sanitised before it ' +
      'reaches the page — see the header of lib/articleHtml.js for the two ways ' +
      'to do that. Refusing to render unsanitised HTML.',
  );
}
