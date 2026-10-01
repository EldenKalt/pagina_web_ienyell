'use client';

// Anchoring a range of the article to text that can survive the article being
// re-rendered, re-styled, or lightly edited.
//
// This is the engine under highlights, inline comments and notes. It is written
// to be content-agnostic on purpose: the same anchors have to work for blog
// posts, books and courses, so nothing here knows what a post is.
//
// THE MODEL is the W3C Web Annotation selector pair, which is what Hypothesis
// and Medium use:
//
//   TextQuoteSelector    { exact, prefix, suffix }  survives re-ordered markup
//   TextPositionSelector { start, end }             fast, disambiguates repeats
//
// Both are stored. Resolving tries the position first and verifies it against
// the quote; if they disagree — because the text above changed — it searches for
// the quote and uses the surrounding context to choose between repeats. If the
// quote is gone entirely the annotation is ORPHANED: it still exists and still
// belongs to its author, it simply is not painted. Orphans are never deleted
// silently.
//
// NO FUZZY MATCHING. Exact search plus a position hint is around two hundred
// lines and no dependency; approximate matching would need diff-match-patch and
// only pays off when the underlying text is edited heavily by other people.
// This content is the author's own and changes rarely. The seam is here if that
// stops being true: `findQuote` is the only function that would change.
//
// OFFSETS ARE OVER NORMALISED TEXT, not the DOM. Runs of whitespace collapse to
// a single space, so reformatting the HTML — which an editor does constantly —
// does not move every anchor in the document. The mapping back to real DOM
// positions is kept per character while the index lives, which is what lets a
// stored selector become a live Range again.

/** Characters of context kept on each side. Enough to separate repeats of a
 *  sentence without storing a meaningful slice of the article in every record. */
const CONTEXT = 32;

/** Blocks whose boundaries are real gaps in the text, so a word is not glued to
 *  the next heading when they are concatenated. */
const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'PRE', 'FIGCAPTION', 'DIV', 'TD', 'TH',
]);

/** Subtrees that are not part of the reading text and must not be anchorable. */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

/**
 * Walks every text node under `root` in document order and builds the normalised
 * article text alongside a per-character map back into the DOM.
 *
 * A TreeWalker rather than querySelectorAll over block elements: concatenating
 * block.textContent counts a <blockquote><p> twice and misses anything that is
 * not inside one of the listed tags. Walking text nodes counts every character
 * exactly once by construction, and is the only way to get the inverse mapping.
 *
 * @param {Element} root
 * @returns {{ text: string, nodes: Text[], offsets: Int32Array }}
 */
export function indexText(root) {
  const empty = { text: '', nodes: [], offsets: new Int32Array(0) };
  if (!root || typeof document === 'undefined') return empty;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent = node.parentElement;
      while (parent && parent !== root) {
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        // Painted highlights are our own wrappers; their text is article text.
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = '';
  const nodes = [];
  const offsets = [];
  // Tracks whether the last character emitted was a space, so a run of
  // whitespace spanning several text nodes still collapses to one.
  let pendingSpace = false;
  // Where the collapsed space is anchored in the DOM. It must be the FIRST
  // whitespace character of the run, not the word that follows it: attributing
  // it forward made the space and the next letter share one node offset, which
  // left the inverse mapping ambiguous and shifted anchors by one character.
  let spaceNode = null;
  let spaceOffset = 0;
  let lastBlock = null;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const block = closestBlock(node, root);
    // A block boundary is a word boundary even when the markup has no
    // whitespace between the tags.
    if (lastBlock && block !== lastBlock && text && !pendingSpace) {
      pendingSpace = true;
      spaceNode = node;
      spaceOffset = 0;
    }
    lastBlock = block;

    const raw = node.data;
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];

      if (char === ' ' || char === '\n' || char === '\t' || char === '\r' || char === '\f') {
        if (text && !pendingSpace) {
          pendingSpace = true;
          spaceNode = node;
          spaceOffset = i;
        }
        continue;
      }

      if (pendingSpace) {
        text += ' ';
        nodes.push(spaceNode);
        offsets.push(spaceOffset);
        pendingSpace = false;
      }

      text += char;
      nodes.push(node);
      offsets.push(i);
    }
  }

  return { text, nodes, offsets: Int32Array.from(offsets) };
}

/** The nearest ancestor that forms a text block, or root. */
function closestBlock(node, root) {
  let el = node.parentElement;
  while (el && el !== root) {
    if (BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return root;
}

/**
 * Where a DOM position falls in the normalised text.
 * Returns the index of the first mapped character at or after (node, offset).
 */
function normalisedIndex(node, offset, { nodes, offsets }) {
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i] === node && offsets[i] >= offset) return i;
  }
  return -1;
}

/**
 * Builds a storable selector from a live selection.
 *
 * @param {Range} range a non-collapsed range inside `root`
 * @param {Element} root the article element
 * @param {{ text: string, nodes: Text[], offsets: Int32Array }} [index] reuse a built index
 * @returns {{ exact: string, prefix: string, suffix: string, start: number, end: number } | null}
 */
export function selectorFromRange(range, root, index) {
  if (!range || range.collapsed || !root) return null;
  if (!root.contains(range.commonAncestorContainer)) return null;

  const idx = index || indexText(root);
  if (!idx.text) return null;

  const start = normalisedIndex(range.startContainer, range.startOffset, idx);
  // The end is exclusive, so it is the first mapped character at or after the
  // end position; when the range ends at the close of the last text node there
  // is none, and the end is the end of the text.
  const endRaw = normalisedIndex(range.endContainer, range.endOffset, idx);
  const end = endRaw === -1 ? idx.text.length : endRaw;

  if (start === -1 || end <= start) return null;

  const exact = idx.text.slice(start, end).trim();
  if (!exact) return null;

  // Re-derive the bounds from the trimmed quote, so a selection that swept up a
  // trailing space stores the same anchor as one that did not.
  const trimmedStart = start + idx.text.slice(start, end).indexOf(exact);

  return {
    exact,
    prefix: idx.text.slice(Math.max(0, trimmedStart - CONTEXT), trimmedStart),
    suffix: idx.text.slice(trimmedStart + exact.length, trimmedStart + exact.length + CONTEXT),
    start: trimmedStart,
    end: trimmedStart + exact.length,
  };
}

/**
 * Finds where a quote sits now, using the stored context to choose between
 * repeats and the stored position to break a remaining tie.
 *
 * This is the ONLY place that decides what "the same passage" means. Swapping in
 * approximate matching later means changing this function and nothing else.
 *
 * @returns {number} index of the match, or -1 when the quote is gone
 */
export function findQuote(text, selector) {
  const { exact, prefix = '', suffix = '', start } = selector;
  if (!exact) return -1;

  const matches = [];
  for (let at = text.indexOf(exact); at !== -1; at = text.indexOf(exact, at + 1)) {
    matches.push(at);
    if (matches.length > 500) break; // a quote this common carries no signal
  }
  if (!matches.length) return -1;
  if (matches.length === 1) return matches[0];

  // Score each candidate by how much of the remembered context it still has on
  // either side, then prefer the one nearest where it used to be.
  let best = -1;
  let bestScore = -Infinity;

  matches.forEach((at) => {
    const before = text.slice(Math.max(0, at - prefix.length), at);
    const after = text.slice(at + exact.length, at + exact.length + suffix.length);
    const score =
      commonSuffixLength(before, prefix) +
      commonPrefixLength(after, suffix) -
      // Distance is a tiebreaker, not a reason: scaled well below one character
      // of context so it can never outvote the text itself.
      (typeof start === 'number' ? Math.abs(at - start) / (text.length + 1) : 0);

    if (score > bestScore) {
      bestScore = score;
      best = at;
    }
  });

  return best;
}

function commonPrefixLength(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffixLength(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

/**
 * Turns a stored selector back into a live Range.
 *
 * @returns {Range | null} null means orphaned — the passage is no longer there
 */
export function resolveSelector(root, selector, index) {
  if (!root || !selector?.exact) return null;

  const idx = index || indexText(root);
  if (!idx.text) return null;

  const { exact, start, end } = selector;

  // The position is a hint, and it is only trusted when the text still agrees
  // with it. Everything above the anchor can change length.
  let at = -1;
  if (typeof start === 'number' && typeof end === 'number' && idx.text.slice(start, end) === exact) {
    at = start;
  } else {
    at = findQuote(idx.text, selector);
  }
  if (at === -1) return null;

  const last = at + exact.length - 1;
  if (at >= idx.nodes.length || last >= idx.nodes.length) return null;

  const range = document.createRange();
  range.setStart(idx.nodes[at], idx.offsets[at]);
  range.setEnd(idx.nodes[last], idx.offsets[last] + 1);
  return range;
}
