/**
 * Placeholder reader notes for the UI phase.
 *
 * NOTES ARE NOT COMMENTS. They are a separate object with a separate lifecycle,
 * even though a published one is rendered like a comment. Where each one shows:
 *
 *                        | note (private) | note (published) | comment
 *   post's public thread |       no       |       yes        |   yes
 *   author's profile     |      yes       |       yes        |   yes
 *   margin of its block  |      yes       |       yes        |   no
 *   highlight's panel    |       no       |       no         |   yes
 *
 * The highlight-panel row is the one that keeps them apart: the panel for a
 * highlighted fragment shows conversation about it, and a note is the reader's
 * own reading, not a reply to anyone. The profile carries both — it is the
 * reader's own page and everything of theirs belongs on it. A note published into the thread is a contribution, not
 * a change of type — it stays a note everywhere else.
 *
 * `anchor` is the article fragment a note sits beside, stored as the quote
 * itself. A note without one belongs to the post as a whole and has no margin
 * position.
 *
 * The anchors below are real passages of the first mock post, because a note is
 * placed in the margin by RESOLVING its anchor against the rendered article —
 * see lib/annotations. Anchors invented out of thin air resolve to nothing and
 * the note silently loses its margin position, which is exactly what the earlier
 * placeholders did.
 *
 * BACKEND NOTE: the quote alone is enough while the passages are long and
 * distinctive. The API should send the same {exact, prefix, suffix} an
 * annotation carries, or a note anchored to a sentence that repeats will land on
 * the first occurrence rather than the right one.
 *
 * Edge cases seeded: a private note, a published one, one with no anchor, and one
 * long enough to exercise the card.
 */

export const BLOG_USE_PLACEHOLDER_NOTES = true;

const READER = { name: 'enyell', pronouns: 'she/her', avatarUrl: '/recursos/profile_picture.webp' };

export const BLOG_PLACEHOLDER_NOTES = [
  {
    id: 1,
    author: READER,
    createdAt: '2026-09-21T08:30:00.000Z',
    anchor:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    // (Dynamic content: the article fragment this note sits beside)
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    // (Dynamic content: note.body — what the reader wrote for themselves)
    isPublic: false,
    // EDGE CASE: private — visible only to its author
  },
  {
    id: 2,
    author: READER,
    createdAt: '2026-09-20T19:05:00.000Z',
    anchor:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
    body: 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    isPublic: true,
    // EDGE CASE: published — also appears in the post's thread and on the profile
  },
  {
    id: 3,
    author: READER,
    createdAt: '2026-09-19T12:44:00.000Z',
    anchor: null,
    // EDGE CASE: no anchor — a note about the post as a whole, with no margin position
    body: 'Lorem ipsum dolor sit.',
    isPublic: false,
  },
];

/** Newest first, the order a reader revisits their own notes in. */
export function getPlaceholderNotes() {
  return [...BLOG_PLACEHOLDER_NOTES].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}
