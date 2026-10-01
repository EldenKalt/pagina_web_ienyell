'use client';

// Chapter index for a post: the article's own heading structure, read out of the
// body HTML the CMS emits.
//
// Browser-only, because it parses HTML with DOMParser. On the server it returns an
// empty outline and the rail block simply does not render — the index is
// navigation for a document the reader already has, so there is nothing lost by
// it arriving on hydration.
//
// DOMParser, not a regular expression: the body comes from a rich-text editor, so
// headings can carry nested markup (<h2>Lorem <em>ipsum</em></h2>) and attributes.
// Parsing is also safe here — an inert document is created, scripts never run, and
// the result is only ever read as text.
//
// The ids are assigned by position, not only by slug, so two headings with the
// same text can never collide.

import { slugifyCmsValue } from './publishing';

const HEADINGS = 'h2, h3';

/** First sentence of the text that follows a heading, for the deeper index levels. */
function firstSentenceAfter(heading) {
  let node = heading.nextElementSibling;

  // Skip anything that is not running text — an image or a code block between a
  // heading and its first paragraph is common in CMS output.
  while (node && node.tagName !== 'P') {
    if (node.matches(HEADINGS)) return '';
    node = node.nextElementSibling;
  }
  if (!node) return '';

  const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';

  const match = text.match(/^[^.!?]+[.!?]/);
  const sentence = (match ? match[0] : text).trim();

  return sentence.length > 120 ? `${sentence.slice(0, 117).trimEnd()}…` : sentence;
}

/**
 * @param {string} html the sanitised article body
 * @returns {Array<{ id: string, level: number, text: string, excerpt: string }>}
 */
export function buildOutline(html) {
  if (typeof window === 'undefined' || !html) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings = [...doc.body.querySelectorAll(HEADINGS)];

  return headings.map((heading, index) => {
    const text = (heading.textContent || '').trim().replace(/\s+/g, ' ');

    return {
      id: `section-${index + 1}-${slugifyCmsValue(text, 'section', 40)}`,
      level: Number(heading.tagName.slice(1)),
      text,
      // Every level carries an extract: the reference nests
      // {extract_first_sentence} directly under H2 as well as under H3, as a
      // sibling of the deeper heading rather than only beneath it.
      excerpt: firstSentenceAfter(heading),
    };
  });
}

/**
 * Stamps the outline's ids onto the rendered article, matching by position so the
 * index links and the document agree even when two headings share their text.
 *
 * Must run against the SAME html `buildOutline` was given, or the positions drift.
 */
export function applyOutlineIds(root, outline) {
  if (!root || !outline.length) return;

  const headings = root.querySelectorAll(HEADINGS);
  headings.forEach((heading, index) => {
    const entry = outline[index];
    if (entry) heading.id = entry.id;
  });
}
