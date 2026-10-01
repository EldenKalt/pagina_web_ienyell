'use client';

// Thin integration layer over @chenglou/pretext.
//
// Pretext measures multiline text with its own line-breaking engine + canvas
// widths, so we get height/lineCount/natural width without touching
// getBoundingClientRect / offsetHeight (no layout reflow).
//
// Browser-only: it needs Canvas 2D text measurement, so nothing here may run
// during SSR. Every export below either no-ops or resolves lazily on the
// client. Import it from components marked 'use client'.
//
// Two rules the library cares about, handled here so callers don't have to:
//   1. The canvas font string must match the CSS that actually paints the text.
//      We read it off the element with getComputedStyle instead of keeping a
//      hand-maintained table in sync with styles/globals.css.
//   2. Inter arrives async from Google Fonts. Measuring before it loads gives
//      fallback-font widths, so callers await fontsReady() first.

import {
  prepare,
  prepareWithSegments,
  layout,
  measureLineStats,
  measureNaturalWidth,
  clearCache as clearPretextCache,
  setLocale,
} from '@chenglou/pretext';

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/** Fonts the site paints text with. Kept as a named family on purpose:
 *  `system-ui` / `-apple-system` are documented as unsafe for layout()
 *  accuracy on macOS. */
export const TEXT_FONT_FAMILY = 'Inter';

/* ------------------------------------------------------------------ *
 * Font readiness
 * ------------------------------------------------------------------ */

let fontsReadyPromise = null;

/**
 * Resolves once the webfont used for measuring is actually available, so
 * canvas widths come from Inter and not from the fallback stack.
 * Safe to await many times; the work happens once.
 *
 * @param {string[]} [specs] canvas font shorthands to force-load, e.g. ['400 17px Inter']
 * @returns {Promise<void>}
 */
export function fontsReady(specs) {
  if (!isBrowser) return Promise.resolve();
  if (fontsReadyPromise) return fontsReadyPromise;

  fontsReadyPromise = (async () => {
    if (!document.fonts) return;
    const wanted = specs && specs.length
      ? specs
      : [`400 17px ${TEXT_FONT_FAMILY}`, `600 17px ${TEXT_FONT_FAMILY}`, `700 17px ${TEXT_FONT_FAMILY}`];
    try {
      await Promise.all(wanted.map((spec) => document.fonts.load(spec)));
      await document.fonts.ready;
    } catch {
      // A font that never loads shouldn't wedge measurement — fall through and
      // measure with whatever the browser resolved.
    }
  })();

  return fontsReadyPromise;
}

/* ------------------------------------------------------------------ *
 * Reading the paint style off the DOM
 * ------------------------------------------------------------------ */

/**
 * @typedef {Object} TextStyle
 * @property {string} font          canvas font shorthand, e.g. '400 17px Inter'
 * @property {number} lineHeight    resolved line height in px
 * @property {number} letterSpacing resolved letter spacing in px
 */

/**
 * Reads the computed text style of an element and converts it into the shape
 * Pretext wants. One getComputedStyle read per call — cache the result and
 * reuse it; don't call this per list item on every render.
 *
 * Font sizes are resolved to px by getComputedStyle, which also handles the
 * rem/em case the library warns about.
 *
 * @param {Element | null | undefined} el
 * @returns {TextStyle | null} null when there's no element or no browser
 */
export function readTextStyle(el) {
  if (!isBrowser || !el) return null;

  const cs = window.getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  if (!Number.isFinite(fontSize) || fontSize <= 0) return null;

  const weight = cs.fontWeight || '400';
  const style = cs.fontStyle && cs.fontStyle !== 'normal' ? `${cs.fontStyle} ` : '';
  const family = quoteFamilyList(cs.fontFamily);

  // `normal` line-height has no numeric equivalent we can trust, so fall back
  // to the browsers' rough 1.2 factor and let the caller override.
  let lineHeight = parseFloat(cs.lineHeight);
  if (!Number.isFinite(lineHeight)) lineHeight = Math.round(fontSize * 1.2 * 100) / 100;

  let letterSpacing = parseFloat(cs.letterSpacing);
  if (!Number.isFinite(letterSpacing)) letterSpacing = 0;

  return {
    font: `${style}${weight} ${fontSize}px ${family}`,
    lineHeight,
    letterSpacing,
  };
}

/** getComputedStyle returns families unquoted when they don't need quotes, but
 *  canvas needs quotes around names with spaces. Normalize both ways. */
function quoteFamilyList(fontFamily) {
  return String(fontFamily || TEXT_FONT_FAMILY)
    .split(',')
    .map((raw) => {
      const name = raw.trim().replace(/^['"]|['"]$/g, '');
      if (!name) return null;
      return /[^\w-]/.test(name) ? `"${name}"` : name;
    })
    .filter(Boolean)
    .join(', ');
}

/** Stable key for a style + options pair, used to cache prepared handles. */
function styleKey(style, options) {
  return [
    style.font,
    style.letterSpacing,
    options.whiteSpace || 'normal',
    options.wordBreak || 'normal',
  ].join('|');
}

/* ------------------------------------------------------------------ *
 * Prepared-handle cache
 * ------------------------------------------------------------------ */

// prepare() is the expensive pass (normalize, segment, measure). layout() is
// cheap arithmetic. So we cache handles per text+style and only ever re-run
// layout() when the width changes.
const preparedCache = new Map();
const preparedWithSegmentsCache = new Map();
const MAX_CACHED = 600;

function fromCache(cache, key, build) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const value = build();
  // Crude bound: drop the oldest insertion once we grow past the cap.
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

function pretextOptions(style, options) {
  const opts = {};
  if (options.whiteSpace) opts.whiteSpace = options.whiteSpace;
  if (options.wordBreak) opts.wordBreak = options.wordBreak;
  if (style.letterSpacing) opts.letterSpacing = style.letterSpacing;
  return opts;
}

/**
 * Cached prepare(). Use for plain height/lineCount measurement.
 * @param {string} text
 * @param {TextStyle} style
 * @param {{ whiteSpace?: 'normal' | 'pre-wrap', wordBreak?: 'normal' | 'keep-all' }} [options]
 */
export function getPrepared(text, style, options = {}) {
  if (!isBrowser || !style) return null;
  const key = `${styleKey(style, options)}|${text}`;
  return fromCache(preparedCache, key, () => prepare(text, style.font, pretextOptions(style, options)));
}

/**
 * Cached prepareWithSegments(). Use when you need line ranges, shrinkwrap
 * widths, or per-line layout rather than just a height.
 */
export function getPreparedWithSegments(text, style, options = {}) {
  if (!isBrowser || !style) return null;
  const key = `${styleKey(style, options)}|${text}`;
  return fromCache(preparedWithSegmentsCache, key, () =>
    prepareWithSegments(text, style.font, pretextOptions(style, options))
  );
}

/* ------------------------------------------------------------------ *
 * Measurement helpers
 * ------------------------------------------------------------------ */

/**
 * Height + line count for text at a given width, without touching layout.
 *
 * Pretext returns `{ lineCount: 0, height: 0 }` for empty text, while a browser
 * still reserves one line box — `minLines` (default 1) restores that.
 *
 * @param {string} text
 * @param {TextStyle} style
 * @param {number} maxWidth px
 * @param {{ whiteSpace?: string, wordBreak?: string, lineHeight?: number, minLines?: number }} [options]
 * @returns {{ height: number, lineCount: number } | null}
 */
export function measureText(text, style, maxWidth, options = {}) {
  if (!isBrowser || !style) return null;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;

  const lineHeight = options.lineHeight ?? style.lineHeight;
  const prepared = getPrepared(text ?? '', style, options);
  if (!prepared) return null;

  const { lineCount } = layout(prepared, maxWidth, lineHeight);
  const minLines = options.minLines ?? 1;
  const effectiveLines = Math.max(minLines, lineCount);

  return { lineCount: effectiveLines, height: effectiveLines * lineHeight };
}

/**
 * True when the text does not fit in `maxLines` at this width — the
 * overflow check to run at development time instead of eyeballing a button.
 */
export function overflowsLines(text, style, maxWidth, maxLines, options = {}) {
  const measured = measureText(text, style, maxWidth, options);
  return measured ? measured.lineCount > maxLines : false;
}

/**
 * Widest wrapped line at `maxWidth` — the tightest container that still fits
 * the same wrap. Use it to shrinkwrap a bubble or card to its text.
 */
export function measureShrinkWrapWidth(text, style, maxWidth, options = {}) {
  if (!isBrowser || !style) return null;
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return null;
  const prepared = getPreparedWithSegments(text ?? '', style, options);
  if (!prepared) return null;
  const { lineCount, maxLineWidth } = measureLineStats(prepared, maxWidth);
  return { lineCount, width: maxLineWidth };
}

/** Width the text would take with no wrapping (CSS max-content). */
export function measureUnwrappedWidth(text, style, options = {}) {
  if (!isBrowser || !style) return null;
  const prepared = getPreparedWithSegments(text ?? '', style, options);
  return prepared ? measureNaturalWidth(prepared) : null;
}

/**
 * Picks the narrowest width in [minWidth, maxWidth] that still wraps to the
 * same number of lines as `maxWidth` does — balanced-looking text without
 * ragged trailing words. Runs on cached segment data, no DOM.
 */
export function balanceWidth(text, style, maxWidth, options = {}) {
  const at = measureShrinkWrapWidth(text, style, maxWidth, options);
  if (!at) return null;
  if (at.lineCount <= 1) return { width: at.width, lineCount: at.lineCount };

  const minWidth = options.minWidth ?? 0;
  let low = Math.max(minWidth, 1);
  let high = maxWidth;
  let best = at.width;

  // Binary search the smallest width holding lineCount steady.
  while (high - low > 1) {
    const mid = (low + high) / 2;
    const probe = measureShrinkWrapWidth(text, style, mid, options);
    if (probe && probe.lineCount <= at.lineCount) {
      best = probe.width;
      high = mid;
    } else {
      low = mid;
    }
  }

  return { width: Math.min(best, maxWidth), lineCount: at.lineCount };
}

/* ------------------------------------------------------------------ *
 * Locale + cache control
 * ------------------------------------------------------------------ */

/**
 * Pretext defaults to `<html lang>` for line-breaking rules. Call this only
 * when you need to override it (e.g. inside a worker, which has no document),
 * since it clears the shared cache.
 */
export function setPretextLocale(locale) {
  if (!isBrowser) return;
  setLocale(locale);
  preparedCache.clear();
  preparedWithSegmentsCache.clear();
}

/** Drops our handle caches and Pretext's internal ones. */
export function clearCache() {
  preparedCache.clear();
  preparedWithSegmentsCache.clear();
  if (isBrowser) clearPretextCache();
}
