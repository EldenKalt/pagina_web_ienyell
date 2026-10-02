/**
 * Placeholder data for /users/profile.
 *
 * WHAT THE PROFILE IS, because it shapes everything here: a profile closer to
 * Steam than to a social network. There is no private messaging and there are no
 * friends. Other people can see what someone has read, their comments and their
 * public notes, and nothing else. A reader may add their own social links; they
 * may not upload, post or publish anything.
 *
 * It is also TIERED. The reader tier is what this file covers. Buying a course,
 * requesting a service or ordering a product unlocks further panels — downloads,
 * shipping, invoicing — which do not exist yet and are not invented here.
 *
 * NONE OF THIS HAS A BACKEND. No endpoint, no table, no column. Notes and
 * comments are the exception: they reuse the blog's own placeholder files, so
 * what the profile shows is the same data the post page shows.
 *
 * NOT BUILT, deliberately, because they are agreed as later work: the reader's
 * courses, their exercise and task results, and the teacher's comments on them.
 */

export const PROFILE_USE_PLACEHOLDER = true;

/**
 * Points are earned for commenting, doing practices, sharing posts, following on
 * social and recommending the site, and redeem for benefits only account holders
 * get. The RULES ARE NOT DECIDED — no amounts, no catalogue — so the total and
 * the ledger below are illustrative, not a specification.
 */
export const PROFILE_PLACEHOLDER_POINTS = {
  total: 1240,
  // (Expected dynamic field: the reader's balance)
  recent: [
    { id: 'p1', label: 'Commented on a post', points: 15, at: '2026-09-28T10:00:00.000Z' },
    { id: 'p2', label: 'Shared a post', points: 10, at: '2026-09-26T16:30:00.000Z' },
    { id: 'p3', label: 'Completed a practice', points: 50, at: '2026-09-21T09:15:00.000Z' },
  ],
};

/** The reader's OWN links. Adding them is the only thing they publish about themselves. */
export const PROFILE_PLACEHOLDER_SOCIALS = [
  { id: 's1', label: 'Instagram', url: 'https://instagram.com/' },
  { id: 's2', label: 'Bluesky', url: 'https://bsky.app/' },
];

/**
 * Saved to read later. The "Keep" bookmark in the action bar and the tools panel
 * is what fills this; it has nowhere to go until this page exists.
 */
export const PROFILE_PLACEHOLDER_SAVED_IDS = [1, 4, 7];

/**
 * Products the reader wants in future. `model Product` exists in the schema, but
 * there is no wishlist table and no endpoint, so these are invented shapes —
 * enough to lay the section out, not a decision about the columns.
 */
export const PROFILE_PLACEHOLDER_WISHLIST = [
  {
    id: 'w1',
    title: 'Lorem ipsum dolor sit amet',
    // (Dynamic content: product.title)
    price: '€38',
    // (Dynamic metadata: product.price, formatted in the reader's currency)
    coverUrl: '/recursos/placeholder_gallery_3.svg',
    href: '#',
    // (Expected dynamic field: the product's own page, which does not exist yet)
    available: true,
  },
  {
    id: 'w2',
    title: 'Lorem ipsum consectetur adipiscing elit sed do eiusmod',
    // EDGE CASE: long title, exercises the card clamp
    price: '€120',
    coverUrl: '/recursos/placeholder_gallery_5.svg',
    href: '#',
    available: true,
  },
  {
    id: 'w3',
    title: 'Lorem ipsum tempor',
    price: '€24',
    coverUrl: null,
    // EDGE CASE: no image, exercises the cover fallback
    href: '#',
    available: false,
    // EDGE CASE: unavailable — the card says so rather than linking to nothing
  },
];

/**
 * Highlights shown on the profile. The same shape lib/annotations resolves, plus
 * the post each one belongs to, which the annotation record does not carry today
 * and the API will have to join.
 */
export const PROFILE_PLACEHOLDER_HIGHLIGHTS = [
  {
    id: 'ph1',
    postSlug: 'lorem-ipsum-dolor-sit-amet-consectetur',
    postTitle: 'Lorem ipsum dolor sit amet consectetur',
    exact: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris',
    createdAt: '2026-09-22T11:00:00.000Z',
  },
  {
    id: 'ph2',
    postSlug: 'lorem-ipsum-tempor-incididunt',
    postTitle: 'Lorem ipsum tempor incididunt',
    exact:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores',
    // EDGE CASE: long passage, exercises the quote clamp
    createdAt: '2026-09-19T08:40:00.000Z',
  },
];

export function getProfilePlaceholder() {
  return {
    points: { ...PROFILE_PLACEHOLDER_POINTS, recent: [...PROFILE_PLACEHOLDER_POINTS.recent] },
    socials: PROFILE_PLACEHOLDER_SOCIALS.map((s) => ({ ...s })),
    savedIds: [...PROFILE_PLACEHOLDER_SAVED_IDS],
    wishlist: PROFILE_PLACEHOLDER_WISHLIST.map((w) => ({ ...w })),
    highlights: PROFILE_PLACEHOLDER_HIGHLIGHTS.map((h) => ({ ...h })),
  };
}
