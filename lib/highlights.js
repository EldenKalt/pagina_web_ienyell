'use client';

// Painting resolved annotations onto the article.
//
// Split from lib/annotations.js on purpose: that module decides WHERE a passage
// is and knows nothing about the DOM beyond reading it; this one decides what
// the reader sees and is the only place that writes to the article. Books and
// courses will share the anchoring and may well paint differently.
//
// WHY <mark> AND NOT THE CSS CUSTOM HIGHLIGHT API. The Highlight API is cleaner —
// no DOM mutation, no wrappers, no re-entrancy problem. It also paints something
// you cannot click, and here a highlight has to be clickable: tapping one opens
// the conversation about that passage. Wrapping is the cost of that.
//
// THREE STATES, from the brief:
//   yours                      filled
//   the most-highlighted passage   filled
//   anyone else's              dotted underline
// The reasoning behind the third: if every passage anyone ever marked were
// painted, a well-read article would be a wall of colour. The dotted underline
// says "someone was here" without competing with the text, and the one passage
// readers converged on is the one worth painting.
//
// OVERLAPS ARE MERGED, NOT STACKED. Two readers marking the same sentence is one
// highlight with a count of two, not two overlapping marks — nested <mark>s would
// compound the background and make popular passages darker than the text. The
// text is cut at every boundary and each resulting run is painted once.

/** The attribute every wrapper carries, and the hook for unpainting. */
const MARK_ATTR = 'data-annotation';

/**
 * Cuts the article into runs over which the set of covering highlights does not
 * change, so each run can be painted exactly once.
 *
 * @param {Array<{ id: string|number, start: number, end: number, mine?: boolean, count?: number }>} resolved
 * @returns {Array<{ start: number, end: number, ids: Array, mine: boolean, count: number, top: boolean }>}
 */
export function segmentHighlights(resolved) {
  const live = (resolved || []).filter((h) => h && h.end > h.start);
  if (!live.length) return [];

  // The most-agreed-upon passage in the article: the one state that is decided
  // across highlights rather than per highlight.
  const peak = live.reduce((max, h) => Math.max(max, h.count || 1), 0);

  const bounds = new Set();
  live.forEach((h) => {
    bounds.add(h.start);
    bounds.add(h.end);
  });

  const edges = [...bounds].sort((a, b) => a - b);
  const segments = [];

  for (let i = 0; i < edges.length - 1; i += 1) {
    const start = edges[i];
    const end = edges[i + 1];
    const covering = live.filter((h) => h.start <= start && h.end >= end);
    if (!covering.length) continue; // a gap between two separate highlights

    // A run is "mine" if any of my highlights covers it: my own marking of a
    // passage is not diluted by other people also marking it.
    const mine = covering.some((h) => h.mine);
    const count = covering.reduce((sum, h) => sum + (h.count || 1), 0);

    segments.push({
      start,
      end,
      ids: covering.map((h) => h.id),
      mine,
      count,
      top: !mine && peak > 1 && covering.some((h) => (h.count || 1) === peak),
    });
  }

  return segments;
}

/**
 * Wraps each segment in <mark>, working from the end of the article backwards.
 *
 * ORDER MATTERS. Wrapping splits text nodes, which moves every offset after the
 * split — so the index this was resolved against goes stale the moment the first
 * mark is inserted. Painting from the end means every offset still to be used is
 * before the edit and therefore untouched. Rebuilding the index between segments
 * would work too, and would be O(n) per segment on an article that can be long.
 *
 * @param {Element} root
 * @param {{ nodes: Text[], offsets: Int32Array }} index built BEFORE any painting
 * @param {ReturnType<typeof segmentHighlights>} segments
 * @returns {number} how many segments were painted
 */
export function paintHighlights(root, index, segments) {
  if (!root || !index?.nodes?.length || !segments?.length) return 0;

  let painted = 0;

  [...segments]
    .sort((a, b) => b.start - a.start)
    .forEach((segment) => {
      // One segment can still cross text nodes — a highlight may span
      // paragraphs — so it becomes one wrapper per node it touches.
      // Whitespace-only runs are dropped. A highlight that crosses a block
      // boundary passes through the whitespace between the tags, and wrapping
      // that produced a mark containing nothing but a newline: invisible, but a
      // real element in the tree and a real stop for anything walking it.
      const pieces = piecesFor(index, segment.start, segment.end).filter(
        (piece) => piece.node.data.slice(piece.from, piece.to).trim(),
      );

      // Within the segment, later pieces first, for the same reason. The count
      // belongs to the segment, not to each of its pieces, so only the last
      // piece carries it — otherwise a highlight spanning three blocks shows
      // the same number three times.
      pieces.reverse().forEach((piece, i) => {
        const mark = wrap(piece);
        if (!mark) return;

        const isLastPiece = i === 0;
        mark.setAttribute(MARK_ATTR, String(segment.ids[0]));
        mark.className = [
          'blog-highlight',
          segment.mine ? 'is-mine' : '',
          segment.top ? 'is-top' : '',
        ]
          .filter(Boolean)
          .join(' ');
        if (segment.count > 1 && isLastPiece) {
          mark.setAttribute('data-count', String(segment.count));
        }
        // Announced rather than silent: a highlight carries meaning, and a
        // reader who cannot see the colour still needs to know it is there and
        // that it can be opened.
        mark.setAttribute('role', 'button');
        mark.setAttribute('tabindex', '0');
        mark.setAttribute(
          'aria-label',
          segment.count > 1
            ? `Highlighted passage, ${segment.count} readers. Open the conversation`
            : 'Highlighted passage. Open the conversation',
        );
        painted += 1;
      });
    });

  return painted;
}

/** The (node, from, to) runs a normalised interval covers. */
function piecesFor(index, start, end) {
  const { nodes, offsets } = index;
  const pieces = [];
  let current = null;

  for (let i = start; i < end && i < nodes.length; i += 1) {
    const node = nodes[i];
    const offset = offsets[i];

    // A collapsed space and the character after it can sit in different nodes,
    // and a space emitted for a block boundary is attributed to whitespace that
    // is not painted — contiguity is checked, not assumed.
    if (current && current.node === node && offset === current.to) {
      current.to = offset + 1;
      continue;
    }
    current = { node, from: offset, to: offset + 1 };
    pieces.push(current);
  }

  return pieces;
}

/** Splits the text node down to the run and replaces it with a <mark>. */
function wrap(piece) {
  const { node, from, to } = piece;
  if (!node.parentNode || to <= from) return null;

  // Split off the tail first: splitting the head would move `to`.
  if (to < node.data.length) node.splitText(to);
  const target = from > 0 ? node.splitText(from) : node;

  const mark = document.createElement('mark');
  target.parentNode.insertBefore(mark, target);
  mark.appendChild(target);
  return mark;
}

/**
 * Removes every wrapper and puts the text back as it was.
 *
 * normalize() is the point: unwrapping leaves the article in fragments, and a
 * fragmented text node would make the next index disagree with this one about
 * where a character lives.
 */
export function clearHighlights(root) {
  if (!root) return 0;

  const marks = [...root.querySelectorAll(`mark[${MARK_ATTR}]`)];
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });

  root.normalize();
  return marks.length;
}

/** The annotation id a click landed on, or null. */
export function annotationIdFromEvent(event) {
  const mark = event.target?.closest?.(`mark[${MARK_ATTR}]`);
  return mark ? mark.getAttribute(MARK_ATTR) : null;
}
