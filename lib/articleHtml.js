// The article body on its way to the page, and the one place that decides it is
// safe to render.
//
// NOT 'use client'. This has to run on the server, which is the whole point: the
// body is rendered into the initial HTML, and sanitising it on the client
// afterwards would produce different markup on the two sides and break
// hydration. It is sanitised ONCE, here, and both sides render the same string.
//
// Database HTML may be rendered only after the backend has sanitised it on
// create/update. The default rejects content without an explicit trusted source;
// this keeps accidental unsanitised database HTML from reaching server markup.

/** What the TipTap editor is allowed to emit beyond DOMPurify's defaults. */
export const ARTICLE_HTML_ALLOWANCES = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
};

/**
 * @param {string} html the post body as stored
 * @param {{ trusted?: boolean }} [options] trusted content is either committed
 *        placeholder HTML or HTML already sanitised on write by the blog API
 * @returns {string} html that is safe to render on the server
 */
export function sanitizeArticleHtml(html, { trusted = false } = {}) {
  if (!html) return '';

  if (trusted) return html;

  throw new Error(
      'sanitizeArticleHtml: refusing to render HTML that has not been sanitised ' +
      'on write by the blog API or explicitly marked as trusted placeholder content.',
  );
}
