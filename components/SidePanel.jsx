'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scrollLock';

/**
 * A side panel overlay: takes a title, children and an `onClose`, and behaves the
 * way a modal dialog is supposed to.
 *
 * This is NOT components/Offcanvas.jsx, which is the site's nav menu and cannot
 * serve here: it takes no props or children, is a circular reveal anchored to the
 * hamburger's coordinates, and covers the whole viewport.
 *
 * What it does that the project's existing overlays do not:
 *   - traps Tab inside the panel while it is open
 *   - returns focus to whatever opened it on close
 *   - closes on Escape and on a click outside
 *   - locks body scroll through a reference count, so two overlays cannot unlock
 *     the page underneath each other (see lib/scrollLock.js)
 *   - renders through a portal, so the sticky rail and header cannot trap it in a
 *     stacking context
 *
 * The overlay sits above the nav menu's z-index ladder (999/1001) at 1100, which
 * is also above the wizard's 1000.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function SidePanel({ open, onClose, title, description, titleId = 'side-panel-title', children }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Portals need a document, so nothing renders until after hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  const focusables = useCallback(
    () => (panelRef.current ? [...panelRef.current.querySelectorAll(FOCUSABLE)] : []),
    [],
  );

  // Remember who opened it, move focus in, and put focus back on close.
  useEffect(() => {
    if (!open) return undefined;

    openerRef.current = document.activeElement;
    lockBodyScroll();

    const first = focusables()[0] || panelRef.current;
    first?.focus();

    return () => {
      unlockBodyScroll();
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [open, focusables]);

  // Escape closes; Tab cycles inside.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose, focusables]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="side-panel-overlay"
      // mousedown, not click: a drag that starts inside the panel and ends on the
      // backdrop should not be read as a click outside.
      onMouseDown={onClose}
    >
      <div
        className="side-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="side-panel-head">
          <div className="side-panel-heading">
            <h2 className="side-panel-title" id={titleId}>
              {title}
            </h2>
            {description ? <p className="side-panel-description">{description}</p> : null}
          </div>

          <button type="button" className="side-panel-close" onClick={onClose} aria-label="Close panel">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="side-panel-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
