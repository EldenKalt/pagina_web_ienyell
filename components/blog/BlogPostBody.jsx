'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fontsReady, measureText, readTextStyle } from '../../lib/pretext';
import { applyOutlineIds } from '../../lib/blogOutline';

/**
 * The article body, and the one place that measures it.
 *
 * Two things happen here, and they are the same walk:
 *
 * 1. A block index over `.blog-content` — for every block element, its text and
 *    the [start, end) offsets of that text inside the article's normalised text.
 *    That index is exactly what a W3C TextPositionSelector needs, so the
 *    annotation layer will read it instead of re-walking the DOM.
 *
 * 2. Pretext measurement of each block at its real painted width, without
 *    touching offsetHeight. Used today for development-time typography warnings.
 *
 * MEASURING THE SERIF. lib/pretext's fontsReady() preloads Inter, which is not
 * what this element paints with — the article body is the only place on the site
 * that uses --font-serif. Measuring before Source Serif 4 is available would use
 * the Georgia fallback's widths and every line count would be wrong, so the specs
 * are passed explicitly below.
 *
 * WHAT THIS DOES NOT DO: it cannot pre-empt the font-swap reflow. Knowing the
 * serif's metrics requires loading the serif, and loading it is what triggers the
 * swap — so there is no moment where the height is known and the swap has not
 * happened yet. Reserving space for it would need a metrics-compatible fallback
 * (size-adjust / ascent-override on an @font-face), not measurement.
 */

const SERIF_SPECS = [
  '400 20px "Source Serif 4"',
  '600 20px "Source Serif 4"',
  'italic 400 20px "Source Serif 4"',
];

/** Blocks that hold running text. Figures, code and media are indexed but not measured. */
const TEXT_BLOCKS = new Set(['P', 'H2', 'H3', 'H4', 'LI', 'BLOCKQUOTE']);

/**
 * Walks the rendered article and returns one entry per block element, carrying the
 * offsets of its text within the whole article.
 */
export function buildBlockIndex(root) {
  if (!root) return [];

  const blocks = [];
  let offset = 0;

  root.querySelectorAll('p, h2, h3, h4, li, blockquote, pre').forEach((el) => {
    // A list item's text is also inside its <ul>; querying the leaves only, as
    // above, keeps every character counted exactly once.
    const text = el.textContent || '';
    blocks.push({
      el,
      tag: el.tagName,
      text,
      start: offset,
      end: offset + text.length,
    });
    offset += text.length;
  });

  return blocks;
}

export default function BlogPostBody({ html, outline = [] }) {
  const contentRef = useRef(null);
  const blocksRef = useRef([]);
  const jumpedRef = useRef(false);
  const [serifReady, setSerifReady] = useState(false);

  useEffect(() => {
    let active = true;
    fontsReady(SERIF_SPECS).then(() => {
      if (active) setSerifReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // The chapter index links to these ids, so they are stamped as soon as the
  // article is in the DOM — not gated on the font, which the index does not need.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !outline.length) return;

    applyOutlineIds(root, outline);
  }, [html, outline]);

  // The browser resolves the URL fragment while the article is still empty — the
  // body is injected on the client — so a link shared as /blog/a-post#section-2
  // lands at the top of the page. Once the targets exist, run the jump the
  // browser could not.
  //
  // Gated on the font, not just on the ids: jumping before the serif swaps in
  // lands roughly 70px short, because every paragraph above the target changes
  // height underneath the scroll position. Instant, not smooth — a deep link
  // should arrive, not travel.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !serifReady || jumpedRef.current) return;

    jumpedRef.current = true;

    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const target = root.querySelector(`#${CSS.escape(id)}`);
    if (!target) return;

    // A single jump is not enough. Everything above the target keeps changing
    // height for a while after the ids exist — the serif reflows the paragraphs,
    // the cover and any inline figure decode, the avatar settles — and each of
    // those moves the target out from under the scroll position. Waiting for one
    // specific signal does not work either: on a client-side navigation the font
    // promise is already resolved and `load` never fires again.
    //
    // So re-run the jump on a short timer until it stops moving, and stop
    // immediately if the reader scrolls. Landing a few pixels off is better than
    // yanking someone who has started reading.
    // Seeded with the position BEFORE the first jump, not after it: a reader who
    // scrolls during the wait for the font would otherwise be yanked by that
    // first jump, because there would be nothing yet to compare against.
    let expected = Math.round(window.scrollY);
    let attempts = 0;
    let timer;

    const jump = () => {
      if (Math.abs(window.scrollY - expected) > 4) return; // the reader took over

      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      expected = Math.round(window.scrollY);

      // Run the whole budget rather than stopping at the first frame that did
      // not move: an image decoding late can shift the article after two
      // identical readings, and a jump that is already correct is a no-op.
      if ((attempts += 1) < 20) timer = setTimeout(jump, 100);
    };

    const frame = requestAnimationFrame(() => requestAnimationFrame(jump));

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [serifReady]);

  // Re-runs when the article changes or once the serif resolves, because the
  // block index is only meaningful against the font the text is painted in.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !serifReady) return;

    blocksRef.current = buildBlockIndex(root);

    if (process.env.NODE_ENV === 'production') return;

    const width = root.clientWidth;
    if (!width) return;

    blocksRef.current.forEach((block) => {
      if (!TEXT_BLOCKS.has(block.tag)) return;

      const style = readTextStyle(block.el);
      const measured = style && measureText(block.text, style, width);
      if (!measured || measured.lineCount < 2) return;

      // A last line holding one short word reads as a widow. Worth knowing about
      // in the article body, where the measure is fixed and the copy is ours.
      const words = block.text.trim().split(/\s+/);
      const last = words[words.length - 1];
      if (words.length > 12 && last && last.length <= 4) {
        const tail = block.text.trim().slice(-40);
        // eslint-disable-next-line no-console
        console.warn(
          `[pretext] <${block.tag.toLowerCase()}> may end on a widow ("${last}") ` +
            `across ${measured.lineCount} lines at ${Math.round(width)}px — …${tail}`,
        );
      }
    });
  }, [html, serifReady]);

  const markup = useMemo(() => ({ __html: html }), [html]);

  return (
    <div
      ref={contentRef}
      className="blog-content"
      data-pretext-ready={serifReady ? 'true' : 'false'}
      dangerouslySetInnerHTML={markup}
    />
  );
}
