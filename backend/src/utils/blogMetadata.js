const { JSDOM } = require('jsdom');

const BLOG_AUTHOR_SELECT = { id: true, name: true, handle: true, pronouns: true,
  bio: true, patreonUrl: true, socialLinks: true };

// An estimate of prose reading, at 200 words per minute; videos are not timed.
function estimateReadingTime(html) {
  if (typeof html !== 'string' || !html.trim()) return null;
  const fragment = JSDOM.fragment(html);
  fragment.querySelectorAll('script, style, template, iframe, [hidden]').forEach((node) => node.remove());
  fragment.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, hr, td, th, blockquote, pre')
    .forEach((node) => node.after(fragment.ownerDocument.createTextNode(' ')));
  const words = (fragment.textContent || '').trim().split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word));
  return words.length ? Math.max(1, Math.ceil(words.length / 200)) : null;
}

function safePublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

function publicAuthor(author) {
  if (!author) return null;
  return { id: author.id, name: author.name, handle: author.handle || null,
    pronouns: author.pronouns || null, bio: author.bio || null,
    patreonUrl: safePublicUrl(author.patreonUrl),
    socials: (Array.isArray(author.socialLinks) ? author.socialLinks : [])
      .filter((link) => typeof link?.label === 'string' && safePublicUrl(link.url))
      .map((link) => ({ name: link.label, url: safePublicUrl(link.url) })) };
}

// List responses can calculate metadata without exposing the article body.
function postMetadata({ content, author, ...post }) {
  return { ...post, readingTime: estimateReadingTime(content),
    ...(author ? { author: publicAuthor(author) } : {}),
    ...(post.series ? { seriesName: post.series.name, seriesSlug: post.series.slug } : {}) };
}

module.exports = { BLOG_AUTHOR_SELECT, estimateReadingTime, publicAuthor, postMetadata };
