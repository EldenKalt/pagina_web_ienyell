'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { indexText, selectorFromRange } from '../../lib/annotations';
import BlogIcon from './BlogIcon';

/**
 * The toolbar that appears over a selected passage: highlight, comment, note,
 * copy, share.
 *
 * THE SELECTOR IS BUILT WHEN THE TOOLBAR OPENS, not when a button is pressed.
 * Pressing a button moves focus and the browser drops the selection, so by the
 * time a handler runs there is nothing left to anchor to. The passage is
 * captured once, up front, and every action works from that.
 *
 * Portalled and fixed, for the reason BlogMenu is: the article sits inside
 * `.page-transition`, which sets a transform and would otherwise be the
 * containing block for anything fixed within it.
 *
 * Opened on pointerup and keyup rather than on selectionchange. selectionchange
 * fires continuously while a drag is in progress, and a toolbar that chases the
 * cursor mid-selection is unusable; waiting for the gesture to finish is also
 * what keeps it from flickering on a double-click.
 *
 * On a phone the platform shows its own selection callout. This one sits ABOVE
 * the passage, which is where the native menu is least likely to be, and flips
 * below only when there is no room — the two can coexist without either being
 * unreachable.
 *
 * SIGNED OUT, the three actions that write something are announced as disabled
 * and send the reader to log in, like every other control on the post. Copy and
 * share are not gated: they do not touch an account.
 */

/** Space between the passage and the toolbar. */
const GAP = 10;

export default function BlogSelectionToolbar({
  rootRef,
  onHighlight,
  onComment,
  onNote,
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState(null); // { selector, text, top, left, flipped }
  const [copied, setCopied] = useState(false);
  const barRef = useRef(null);

  const locked = !isLoading && !user;

  const close = useCallback(() => {
    setState(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root || typeof window === 'undefined') return undefined;

    const capture = (event) => {
      // A press on the toolbar itself must not re-read the selection: the click
      // that activates a button would otherwise close the toolbar first.
      if (barRef.current?.contains(event.target)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        close();
        return;
      }

      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        close();
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        close();
        return;
      }

      // The index is built against the article as it is painted RIGHT NOW,
      // marks and all. lib/annotations walks text nodes, so the wrappers are
      // transparent to it and a passage selected across an existing highlight
      // anchors the same as one in clean text.
      const selector = selectorFromRange(range, root, indexText(root));
      if (!selector) {
        close();
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        close();
        return;
      }

      setCopied(false);
      setState({
        selector,
        text,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
      });
    };

    const onSelectionChange = () => {
      const selection = window.getSelection();
      // Only closes. Opening is left to the gesture handlers so the toolbar does
      // not follow the cursor while the reader is still dragging.
      if (!selection || selection.isCollapsed) close();
    };

    document.addEventListener('pointerup', capture);
    document.addEventListener('keyup', capture);
    document.addEventListener('selectionchange', onSelectionChange);
    // Fixed position cannot follow a scroll, and a toolbar left behind by the
    // passage it belongs to is worse than no toolbar.
    //
    // On window, not document: measured here, a capture listener on document
    // never fires for a page scroll — the page scrolled 200px and the listener
    // was not called once. Capture is kept so a scroll inside a nested
    // container, which does not bubble, is still caught.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerup', capture);
      document.removeEventListener('keyup', capture);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [rootRef, close]);

  // Escape dismisses without losing the selection, so a reader who opened it by
  // accident can carry on reading.
  useEffect(() => {
    if (!state) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [state, close]);

  if (!state) return null;

  const run = (action, gated) => () => {
    if (gated && locked) {
      router.push('/users/login');
      return;
    }
    action();
    close();
    window.getSelection()?.removeAllRanges();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.text);
      setCopied(true);
    } catch {
      // Denied or unavailable. The reader can still copy by hand, and a failed
      // write is not worth an error state on a toolbar this small.
      setCopied(false);
    }
  };

  const share = async () => {
    // A text fragment, so the link opens at the passage rather than the top of
    // the article. The browser scrolls to it natively; no annotation needs to
    // exist for the link to work.
    const url = `${window.location.origin}${window.location.pathname}#:~:text=${encodeURIComponent(
      state.text.slice(0, 300),
    )}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: state.text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Dismissing the share sheet throws. Nothing to report.
    }
  };

  const bar = (
    <div
      ref={barRef}
      className="blog-selection-bar"
      role="toolbar"
      aria-label="Actions for the selected passage"
      style={positionFor(state.rect, barRef.current)}
      // Keeps the selection alive while the reader moves onto the toolbar: a
      // mousedown elsewhere would collapse it before the click lands.
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className="blog-selection-action"
        onClick={run(() => onHighlight?.(state.selector, state.text), true)}
        aria-disabled={locked || undefined}
      >
        <BlogIcon name="highlight" size={20} />
        <span>Highlight</span>
      </button>

      <button
        type="button"
        className="blog-selection-action"
        onClick={run(() => onComment?.(state.selector, state.text), true)}
        aria-disabled={locked || undefined}
        aria-haspopup="dialog"
      >
        <BlogIcon name="chat" size={20} />
        <span>Comment</span>
      </button>

      <button
        type="button"
        className="blog-selection-action"
        onClick={run(() => onNote?.(state.selector, state.text), true)}
        aria-disabled={locked || undefined}
        aria-haspopup="dialog"
      >
        <BlogIcon name="note" size={20} />
        <span>Note</span>
      </button>

      <span className="blog-selection-divider" aria-hidden="true" />

      <button type="button" className="blog-selection-action" onClick={copy}>
        <BlogIcon name={copied ? 'check' : 'copy'} size={20} />
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <button type="button" className="blog-selection-action" onClick={share}>
        <BlogIcon name="share" size={20} />
        <span>Share</span>
      </button>

      {/* Announced once, not on every keystroke of state. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied to the clipboard' : ''}
      </span>
    </div>
  );

  return createPortal(bar, document.body);
}

/**
 * Above the passage, or below it when the top of the window is in the way.
 * Measured from the toolbar itself once it exists; the first frame is placed
 * from an estimate and corrected on the next render, which is why the element is
 * never hidden — a toolbar that blinks is worse than one that settles.
 */
function positionFor(rect, bar) {
  const width = bar?.offsetWidth || 320;
  const height = bar?.offsetHeight || 44;

  const above = rect.top - height - GAP;
  const flipped = above < 8;

  return {
    top: `${flipped ? rect.bottom + GAP : above}px`,
    left: `${Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      Math.max(8, window.innerWidth - width - 8),
    )}px`,
  };
}
