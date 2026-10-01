'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import BlogIcon from './BlogIcon';

/**
 * The "…" menu, shared by the post action bar and the comment header.
 *
 * There is no node for this in the reference: `more_horiz` appears as a bare
 * 24x24 instance with nothing attached, in the action bar and in the comment
 * header alike. The contents come from the brief — hide highlights and send
 * feedback on a post, report a comment — and the appearance follows the blog's
 * own tokens.
 *
 * The popup is PORTALLED and positioned fixed, which is not the obvious choice
 * and is worth the explanation. Anchoring it absolutely inside the trigger's own
 * container is simpler, and it worked for the comment menu, but the post action
 * bar scrolls sideways on a phone: an absolute popup inside it is clipped at the
 * bar's edge, and on a 375px screen the "..." has usually scrolled out of sight
 * altogether. The comments off-canvas is a scroller too. Rather than keep a list
 * of which surfaces happen to clip, the popup leaves the flow entirely.
 *
 * The portal target is document.body, not the nearest wrapper: `.page-transition`
 * sets `transform`, which makes it the containing block for anything fixed inside
 * it — the same trap the floating tools panel fell into.
 *
 * Because it is fixed, it cannot travel with a container that scrolls, so any
 * scroll closes it. That is what a menu is expected to do anyway.
 *
 * Items may be:
 *   { type: 'checkbox' } a state the menu reports with aria-checked
 *   { type: 'link' }     a destination, rendered as an anchor
 *   default              an action button
 *
 * An item marked `disabled` is announced as such but still fires `onSelect`, so
 * the caller can send a signed-out reader to log in — the same rule every other
 * control on the post follows.
 */

const GAP = 6;
const MIN_WIDTH = 220;

export default function BlogMenu({
  label,
  items = [],
  className = '',
  iconSize = 24,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const menuId = `blog-menu-${useId()}`;

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    setPosition(null);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Placed before the first paint, so it never shows in the wrong spot and jumps.
  useEffect(() => {
    if (!open) return undefined;

    const place = () => {
      const trigger = triggerRef.current;
      const list = listRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const height = list?.offsetHeight || 0;
      const width = list?.offsetWidth || MIN_WIDTH;

      // Up when there is no room below but there is above — the action bar at
      // the foot of the article, or the last comment in a long thread.
      const flip = rect.bottom + height + GAP > window.innerHeight && rect.top - height - GAP > 0;

      setPosition({
        top: flip ? rect.top - height - GAP : rect.bottom + GAP,
        // Right-aligned to the trigger, then pulled back inside the viewport:
        // on a phone the trigger sits close enough to the edge that a
        // right-aligned popup would otherwise hang off it.
        left: Math.min(
          Math.max(8, rect.right - width),
          Math.max(8, window.innerWidth - width - 8),
        ),
      });
    };

    place();

    const onPointerDown = (event) => {
      if (listRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
      setPosition(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    // Capture, so a scrolling container is caught and not just the window.
    const onScroll = () => {
      setOpen(false);
      setPosition(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  // Focus waits for the position, and so for the menu to become visible: the
  // first render is `visibility: hidden` while it is measured, and a hidden
  // element cannot take focus — the call would simply be dropped.
  useEffect(() => {
    if (!open || !position) return;
    listRef.current?.querySelector('[role^="menuitem"]')?.focus({ preventScroll: true });
    // Only on the first placement, or a reposition would steal focus back from
    // whichever item the reader has arrowed to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, Boolean(position)]);

  // Arrow keys walk the menu; Tab leaves it, which also closes it.
  const onListKeyDown = (event) => {
    const entries = [...(listRef.current?.querySelectorAll('[role^="menuitem"]') || [])];
    if (!entries.length) return;
    const index = entries.indexOf(document.activeElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      entries[(index + step + entries.length) % entries.length].focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      entries[0].focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      entries[entries.length - 1].focus();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      setPosition(null);
    }
  };

  const run = (item) => {
    item.onSelect?.();
    close();
  };

  const list = (
    <div
      id={menuId}
      role="menu"
      aria-label={label}
      ref={listRef}
      className="blog-menu-list"
      // Hidden until measured, so the first frame is never in the wrong place.
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : { top: 0, left: 0, visibility: 'hidden' }
      }
      onKeyDown={onListKeyDown}
    >
      {items.map((item) =>
        item.type === 'link' ? (
          <Link
            key={item.id}
            role="menuitem"
            className={`blog-menu-item${item.accent ? ' blog-menu-item--accent' : ''}`}
            href={item.href}
            onClick={() => close(false)}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            role={item.type === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={item.type === 'checkbox' ? Boolean(item.checked) : undefined}
            aria-disabled={item.disabled || undefined}
            className={[
              'blog-menu-item',
              item.danger ? 'blog-menu-item--danger' : '',
              item.accent ? 'blog-menu-item--accent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => run(item)}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`blog-menu-trigger ${className}`.trim()}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <BlogIcon name="more" size={iconSize} />
      </button>

      {open && typeof document !== 'undefined' ? createPortal(list, document.body) : null}
    </>
  );
}
