'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatBlogDate } from '../../lib/publishing';
import { indexText, resolveSelector } from '../../lib/annotations';
import BlogIcon from './BlogIcon';

/**
 * The reader's notes, marked in the margin beside the passage each one is about.
 *
 * A MARKER, NOT A CARD, and that is a measurement rather than a preference. The
 * article column is fixed at its reading measure and the page container caps at
 * 1180px, so the space left beside the article is 11px at 1100, 78px at 1280 and
 * 62px at 1920 — the grid's column-gap grows with the viewport and eats the
 * surplus, so a wider screen does not give a wider margin. A readable note card
 * needs upwards of 220px. Nothing of the sort fits at any width without changing
 * the article's measure, which is the one thing a reading page should not trade.
 *
 * So the margin carries a marker, and the note itself opens in a popover beside
 * it. Below 1200px the margin is too narrow even for that and the markers are
 * not rendered; the notes are not lost — they are listed in "Read my notes",
 * which is where they have always been reachable from.
 *
 * POSITIONS ARE MEASURED, NOT STORED. A note is placed by resolving its anchor
 * against the article as it is rendered, which means a note follows its passage
 * when the text reflows, when the font swaps, or when the article is edited
 * above it. A note whose passage is gone keeps no margin position at all —
 * orphaned, the same rule the annotations follow.
 */
export default function BlogMarginNotes({ contentRef, notes = [], onOpenAll }) {
  const [placed, setPlaced] = useState([]);
  const [open, setOpen] = useState(null);
  const [popover, setPopover] = useState(null);
  const layerRef = useRef(null);
  const popRef = useRef(null);

  const measure = useCallback(() => {
    const root = contentRef?.current;
    if (!root) return;

    const anchored = notes.filter((note) => note.anchor);
    if (!anchored.length) {
      setPlaced([]);
      return;
    }

    const index = indexText(root);
    const rootTop = root.getBoundingClientRect().top;

    const next = anchored
      .map((note) => {
        // The quote alone, with no stored context: see the note in
        // data/blogPlaceholderNotes about what the API should send instead.
        const paragraph = note.paragraphId
          ? [...root.querySelectorAll('p[data-paragraph-id]')].find((element) => element.getAttribute('data-paragraph-id') === note.paragraphId)
          : null;
        const range = !note.paragraphId ? resolveSelector(root, note.selector || { exact: note.anchor.trim() }, index) : null;
        if (!paragraph && !range) return null;

        // The note belongs to the block its passage STARTS in. A highlight may
        // run from one paragraph into the next; the note still has one home, and
        // it is where the reader began reading it.
        const block = paragraph || blockOf(range.startContainer, root);
        if (!block) return null;

        return {
          note,
          top: Math.round(block.getBoundingClientRect().top - rootTop),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.top - b.top);

    // Two notes on the same block would sit on top of each other. Nudged down
    // just enough to stack, which also reads as "more than one here".
    const MIN_GAP = 34;
    next.forEach((entry, i) => {
      if (i === 0) return;
      const previous = next[i - 1];
      if (entry.top - previous.top < MIN_GAP) entry.top = previous.top + MIN_GAP;
    });

    setPlaced(next);
  }, [contentRef, notes]);

  useEffect(() => {
    const root = contentRef?.current;
    if (!root) return undefined;

    measure();

    // The article changes height under the markers for a while after it mounts —
    // the serif swaps, images decode — and it changes again on every resize. A
    // marker that does not follow its paragraph is worse than no marker.
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [contentRef, measure]);

  // The popover is fixed, so it cannot follow a scroll.
  useEffect(() => {
    if (open === null) return undefined;
    const close = () => {
      setOpen(null);
      setPopover(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    const onPointerDown = (event) => {
      if (popRef.current?.contains(event.target)) return;
      if (layerRef.current?.contains(event.target)) return;
      close();
    };
    // window, not document: a capture listener on document is never called for
    // a page scroll.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (!placed.length) return null;

  const toggle = (id, event) => {
    if (open === id) {
      setOpen(null);
      setPopover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setOpen(id);
    setPopover({ top: rect.top, right: rect.right, left: rect.left });
  };

  const current = placed.find((entry) => entry.note.id === open);

  return (
    <>
      <div className="blog-margin-notes" ref={layerRef} aria-label="Your notes on this post">
        {placed.map(({ note, top }) => (
          <button
            key={note.id}
            type="button"
            className={`blog-margin-note${open === note.id ? ' is-open' : ''}${
              note.isPublic ? ' is-public' : ''
            }`}
            style={{ top: `${top}px` }}
            onClick={(event) => toggle(note.id, event)}
            aria-expanded={open === note.id}
            aria-label={`Your note on this passage${note.isPublic ? ', published' : ', private'}`}
          >
            <BlogIcon name="note" size={16} />
          </button>
        ))}
      </div>

      {current && popover
        ? createPortal(
            <div
              ref={popRef}
              className="blog-margin-popover"
              role="dialog"
              aria-label="Your note"
              style={positionFor(popover, popRef.current)}
            >
              <p className="blog-margin-popover-meta">
                {current.note.createdAt ? (
                  <time dateTime={current.note.createdAt}>
                    {formatBlogDate(current.note.createdAt)}
                  </time>
                ) : null}
                <span className={current.note.isPublic ? 'is-public' : undefined}>
                  {current.note.isPublic ? 'Published' : 'Private'}
                </span>
              </p>

              <p className="blog-margin-popover-body">{current.note.body}</p>
              {/* (Dynamic content: note.body — what the reader wrote for themselves) */}

              <button
                type="button"
                className="blog-margin-popover-all"
                onClick={() => {
                  setOpen(null);
                  setPopover(null);
                  onOpenAll?.();
                }}
              >
                Read all my notes
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** The block element a text node belongs to. */
function blockOf(node, root) {
  let el = node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== root) {
    const display = window.getComputedStyle(el).display;
    if (display !== 'inline' && display !== 'contents') return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * To the right of the marker when it fits, and to its left when it does not.
 *
 * It usually does not. The marker sits in the gutter, which is near the right
 * edge by definition, so at 1440 there are around 170px between it and the edge
 * and the popover needs 280. Clamping to the edge instead of flipping is what
 * put it back on top of its own marker, 98px to the LEFT of where it was asked
 * to go. On the left it overlaps the end of the article, which is the usual
 * trade for margin annotations and is why it dismisses on the next click.
 */
function positionFor(point, el) {
  const width = el?.offsetWidth || 280;
  const height = el?.offsetHeight || 140;
  const gap = 8;

  const toTheRight = point.right + gap;
  const fitsRight = toTheRight + width + gap <= window.innerWidth;
  const left = fitsRight ? toTheRight : point.left - width - gap;

  return {
    top: `${Math.min(Math.max(8, point.top - 8), Math.max(8, window.innerHeight - height - 8))}px`,
    left: `${Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - gap))}px`,
  };
}
