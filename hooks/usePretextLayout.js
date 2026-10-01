'use client';

// React bindings for the Pretext layer in lib/pretext.js.
//
// The shape is always the same: attach a ref to the element that paints the
// text, and the hook reports the height/lineCount that text will take — read
// from Pretext's own line breaker, not from the DOM.
//
// All hooks are SSR-safe: on the server and on the first client render they
// report `ready: false` with null measurements, then fill in after mount and
// after the webfont resolves. Render real text as normal markup and use these
// numbers for layout decisions (virtualization, reserved space, shrinkwrap,
// overflow checks) — never as a substitute for the text itself.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  balanceWidth,
  fontsReady,
  measureShrinkWrapWidth,
  measureText,
  measureUnwrappedWidth,
  overflowsLines,
  readTextStyle,
} from '../lib/pretext';

/** True once the measuring webfont has resolved. Until then, treat widths as provisional. */
export function useFontsReady(specs) {
  const [ready, setReady] = useState(false);
  const key = specs ? specs.join('|') : '';

  useEffect(() => {
    let active = true;
    fontsReady(specs).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ready;
}

/**
 * Content-box width of an element, tracked with ResizeObserver.
 * Returns null until measured.
 * @param {import('react').RefObject<Element>} ref
 */
export function useElementWidth(ref) {
  const [width, setWidth] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const read = () => {
      const cs = window.getComputedStyle(el);
      const padding = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
      const next = el.clientWidth - (Number.isFinite(padding) ? padding : 0);
      setWidth((prev) => (prev !== null && Math.abs(prev - next) < 0.5 ? prev : next));
    };

    read();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const box = entry && entry.contentBoxSize && entry.contentBoxSize[0];
      if (box) {
        const next = box.inlineSize;
        setWidth((prev) => (prev !== null && Math.abs(prev - next) < 0.5 ? prev : next));
      } else {
        read();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/**
 * Computed text style (canvas font shorthand + line height + letter spacing)
 * of an element. Re-read once the webfont resolves, since the family the
 * browser reports can change under us.
 * @param {import('react').RefObject<Element>} ref
 */
export function useTextStyle(ref) {
  const [style, setStyle] = useState(null);
  const fontsAreReady = useFontsReady();

  useEffect(() => {
    const next = readTextStyle(ref.current);
    if (!next) return;
    setStyle((prev) =>
      prev &&
      prev.font === next.font &&
      prev.lineHeight === next.lineHeight &&
      prev.letterSpacing === next.letterSpacing
        ? prev
        : next
    );
  }, [ref, fontsAreReady]);

  return style;
}

/**
 * Height and line count `text` will occupy inside the referenced element.
 *
 * @example
 * const ref = useRef(null);
 * const { height, lineCount, ready } = usePretextLayout(synopsis, { ref });
 * // reserve `height` px for the paragraph before it paints, or decide how
 * // many cards fit in a viewport without measuring any of them.
 *
 * @param {string} text
 * @param {{
 *   ref: import('react').RefObject<Element>,
 *   width?: number,
 *   lineHeight?: number,
 *   whiteSpace?: 'normal' | 'pre-wrap',
 *   wordBreak?: 'normal' | 'keep-all',
 *   minLines?: number,
 * }} options
 * @returns {{ height: number | null, lineCount: number | null, width: number | null, style: object | null, ready: boolean }}
 */
export function usePretextLayout(text, options) {
  const { ref, width: fixedWidth, lineHeight, whiteSpace, wordBreak, minLines } = options || {};

  const style = useTextStyle(ref);
  const observedWidth = useElementWidth(ref);
  const width = fixedWidth ?? observedWidth;

  const measured = useMemo(() => {
    if (!style || width === null) return null;
    return measureText(text ?? '', style, width, { lineHeight, whiteSpace, wordBreak, minLines });
  }, [text, style, width, lineHeight, whiteSpace, wordBreak, minLines]);

  return {
    height: measured ? measured.height : null,
    lineCount: measured ? measured.lineCount : null,
    width,
    style,
    ready: measured !== null,
  };
}

/**
 * Narrowest width that keeps the same wrap — for bubbles, chips and cards that
 * should hug their text instead of filling the column.
 *
 * `balanced: true` binary-searches for an even rag; the default just returns
 * the widest wrapped line.
 */
export function usePretextShrinkWrap(text, options) {
  const { ref, width: fixedWidth, balanced = false, minWidth, whiteSpace, wordBreak } = options || {};

  const style = useTextStyle(ref);
  const observedWidth = useElementWidth(ref);
  const maxWidth = fixedWidth ?? observedWidth;

  const measured = useMemo(() => {
    if (!style || maxWidth === null) return null;
    const opts = { whiteSpace, wordBreak, minWidth };
    return balanced
      ? balanceWidth(text ?? '', style, maxWidth, opts)
      : measureShrinkWrapWidth(text ?? '', style, maxWidth, opts);
  }, [text, style, maxWidth, balanced, minWidth, whiteSpace, wordBreak]);

  return {
    width: measured ? measured.width : null,
    lineCount: measured ? measured.lineCount : null,
    maxWidth,
    ready: measured !== null,
  };
}

/**
 * Warns during development when a label wraps past `maxLines` — the intended
 * use is buttons, nav items, badges and other functional labels whose Spanish
 * copy must not overflow.
 *
 * Returns the boolean too, so a component can also react to it.
 */
export function usePretextOverflowCheck(text, options) {
  const { ref, maxLines = 1, width: fixedWidth, label, whiteSpace, wordBreak } = options || {};

  const style = useTextStyle(ref);
  const observedWidth = useElementWidth(ref);
  const width = fixedWidth ?? observedWidth;

  const overflows = useMemo(() => {
    if (!style || width === null) return false;
    return overflowsLines(text ?? '', style, width, maxLines, { whiteSpace, wordBreak });
  }, [text, style, width, maxLines, whiteSpace, wordBreak]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !overflows) return;
    console.warn(
      `[pretext] "${label || text}" wraps past ${maxLines} line(s) at ${Math.round(width)}px. ` +
        'Shorten the copy or widen the element.'
    );
  }, [overflows, label, text, maxLines, width]);

  return overflows;
}

/**
 * Imperative escape hatch: a stable measure() you can call in an event handler
 * or loop, without the hook re-render cycle. Style is read from `ref` once it
 * is available.
 */
export function usePretextMeasurer(ref) {
  const style = useTextStyle(ref);
  const styleRef = useRef(style);
  styleRef.current = style;

  const measure = useCallback((text, width, opts) => {
    if (!styleRef.current) return null;
    return measureText(text ?? '', styleRef.current, width, opts || {});
  }, []);

  const unwrappedWidth = useCallback((text, opts) => {
    if (!styleRef.current) return null;
    return measureUnwrappedWidth(text ?? '', styleRef.current, opts || {});
  }, []);

  return { measure, unwrappedWidth, style, ready: style !== null };
}
