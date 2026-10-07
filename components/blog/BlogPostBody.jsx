'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fontsReady, measureText, readTextStyle } from '../../lib/pretext';
import { applyOutlineIds } from '../../lib/blogOutline';
import { indexText, resolveSelector } from '../../lib/annotations';
import BlogSelectionToolbar from './BlogSelectionToolbar';
import BlogMarginNotes from './BlogMarginNotes';
import BlogParagraphComments from './BlogParagraphComments';
import {
  segmentHighlights,
  paintHighlights,
  clearHighlights,
  annotationIdFromEvent,
} from '../../lib/highlights';

/**
 * The article body, and the one place that measures it.
 *
 * Two things happen here, and they are the same walk:
 *
 * 1. A block index over `.blog-content` — for every block element, its text and
 *    its tag, used for the typography warnings below.
 *
 *    Its offsets are NOT what the annotation layer anchors against. They come
 *    from concatenating block textContent, which counts a <blockquote><p> twice
 *    and misses anything outside the tag list; lib/annotations walks text nodes
 *    instead, which counts every character once and gives the inverse mapping a
 *    stored selector needs to become a Range again.
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

export default function BlogPostBody({
  html,
  outline = [],
  highlights = [],
  highlightsHidden = false,
  onOpenHighlight,
  onHighlight,
  onComment,
  onNote,
  notes = [],
  onOpenNotes,
  commentLocations = [],
  onOpenParagraphComments,
}) {
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

    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const target = root.querySelector(`#${CSS.escape(id)}`);
    // Not there YET is not the same as not there. The ids are stamped from the
    // outline, and the outline is now built after mount — it has to be, or the
    // rail index would differ between the server render and the first client
    // one. So this effect can run before a single id exists, and claiming the
    // jump at that point meant it never happened at all. The claim is made only
    // once the target has actually been found; the effect re-runs when the
    // outline arrives.
    if (!target) return;

    jumpedRef.current = true;

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
  }, [serifReady, outline]);

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

  // Painting the annotations.
  //
  // Gated on the serif for the same reason the deep-link jump is: resolving is
  // over text, not pixels, so the font does not change WHERE a passage is — but
  // repainting while the article is still reflowing means doing the work twice.
  //
  // Everything is resolved against ONE index built before a single mark is
  // inserted. Wrapping splits text nodes, so an index read after the first mark
  // disagrees with itself; lib/highlights paints from the end of the article
  // backwards so that never arises.
  //
  // The article is cleared first on every run. Repainting over existing marks
  // would nest them, and nested marks compound the background until a popular
  // passage is darker than the text around it.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !serifReady) return undefined;

    clearHighlights(root);
    if (highlightsHidden || !highlights.length) return undefined;

    const index = indexText(root);
    const resolved = highlights
      .map((highlight) => {
        const range = resolveSelector(root, highlight.selector, index);
        // Orphaned: the passage is gone. The annotation still belongs to its
        // author and still exists — it simply has nowhere to be drawn.
        if (!range) return null;
        const start = index.nodes.findIndex(
          (node, i) => node === range.startContainer && index.offsets[i] === range.startOffset,
        );
        if (start === -1) return null;
        return {
          id: highlight.id,
          mine: Boolean(highlight.mine),
          count: highlight.count || 1,
          start,
          end: start + highlight.selector.exact.length,
        };
      })
      .filter(Boolean);

    paintHighlights(root, index, segmentHighlights(resolved));

    return () => clearHighlights(root);
  }, [html, serifReady, highlights, highlightsHidden]);

  const markup = useMemo(() => ({ __html: html }), [html]);

  // Delegated, not one listener per mark: the marks are created outside React
  // and there can be a lot of them. Enter and Space match the button role they
  // carry, so a highlight is reachable without a pointer.
  const openFromEvent = (event) => {
    const id = annotationIdFromEvent(event);
    if (!id || !onOpenHighlight) return;
    const mark = event.target.closest('mark[data-annotation]');
    onOpenHighlight(id, mark?.textContent || '');
  };

  return (
    <>
    {/* The shell exists only to be the containing block for the margin layer,
        which sits in the gutter beside the article. .blog-post-main is a plain
        block with no gap semantics, so wrapping the article in it changes
        nothing about the column. */}
    <div className="blog-content-shell">
    <div
      ref={contentRef}
      className="blog-content"
      data-pretext-ready={serifReady ? 'true' : 'false'}
      onClick={openFromEvent}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (!annotationIdFromEvent(event)) return;
        event.preventDefault();
        openFromEvent(event);
      }}
      dangerouslySetInnerHTML={markup}
    />

    <BlogMarginNotes contentRef={contentRef} notes={notes} onOpenAll={onOpenNotes} />
    {onOpenParagraphComments && <BlogParagraphComments contentRef={contentRef} locations={commentLocations} onOpen={onOpenParagraphComments} />}
    </div>

    {/* Rendered here rather than by the page so the article element stays
        private to this component: the toolbar needs the ref to scope the
        selection to the body, and the page only needs to say what the actions
        do. */}
    <BlogSelectionToolbar
      rootRef={contentRef}
      onHighlight={onHighlight}
      onComment={onComment}
      onNote={onNote}
    />
    </>
  );
}
