/**
 * Placeholder highlights for the UI phase.
 *
 * HIGHLIGHTS ARE NOT NOTES AND NOT COMMENTS. A highlight is a marked passage and
 * nothing else — it carries no text of its own. A note or a comment may be
 * anchored to the same passage, which is why they share the selector shape, but
 * a passage can be highlighted by someone who never wrote a word about it.
 *
 * `count` is how many readers have marked that passage. One shared highlight
 * with a counter, not one per reader: the article shows where readers converged,
 * not how many times.
 *
 * The selectors here are hand-written against the first mock post's body, and
 * they are deliberately written the way the engine will store them — quote,
 * context either side, and a position hint. The positions are approximate on
 * purpose: resolving must not depend on them, and a mock that only works when
 * they are exact would hide that.
 *
 * Edge cases seeded:
 *   - one of the reader's own (filled)
 *   - one marked by several readers, the most-agreed passage (filled)
 *   - one marked by one other reader (dotted underline)
 *   - one spanning a paragraph boundary
 *   - one whose quote is not in the article at all, which must orphan quietly
 */

export const BLOG_USE_PLACEHOLDER_HIGHLIGHTS = true;

export const BLOG_PLACEHOLDER_HIGHLIGHTS = [
  {
    id: 'h1',
    mine: true,
    count: 1,
    selector: {
      exact: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris',
      prefix: 'labore et dolore magna aliqua. ',
      suffix: ' nisi ut aliquip ex ea commodo',
      start: 120,
      end: 186,
    },
  },
  {
    id: 'h2',
    mine: false,
    // EDGE CASE: the passage readers converged on — the only one of someone
    // else's that gets painted rather than underlined
    count: 14,
    selector: {
      exact: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem',
      prefix: 'Lorem ipsum sectione prima ',
      suffix: ' accusantium doloremque laudantium',
      start: 470,
      end: 532,
    },
  },
  {
    id: 'h3',
    mine: false,
    count: 2,
    selector: {
      exact: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur',
      prefix: 'dicta sunt explicabo. ',
      suffix: ' aut odit aut fugit',
      start: 680,
      end: 734,
    },
  },
  {
    id: 'h4',
    mine: true,
    count: 3,
    // EDGE CASE: crosses a block boundary — the end of one paragraph into the
    // heading that follows it. The note that belongs to it anchors to the
    // paragraph it STARTED in, not the one it ends in.
    selector: {
      exact: 'anim id est laborum. Lorem ipsum sectione prima',
      prefix: 'officia deserunt mollit ',
      suffix: ' Sed ut perspiciatis',
      start: 424,
      end: 470,
    },
  },
  {
    id: 'h5',
    mine: false,
    count: 1,
    // EDGE CASE: the passage this was anchored to no longer exists. It must
    // orphan silently — still the reader's, simply not painted.
    selector: {
      exact: 'a sentence that was edited out of the article entirely',
      prefix: 'something that is ',
      suffix: ' and no longer present',
      start: 900,
      end: 954,
    },
  },
];

export function getPlaceholderHighlights() {
  return BLOG_PLACEHOLDER_HIGHLIGHTS.map((highlight) => ({ ...highlight }));
}
