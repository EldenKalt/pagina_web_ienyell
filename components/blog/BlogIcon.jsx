/**
 * The six icons the post action bar needs, in one place.
 *
 * The project draws icons as hand-written inline SVG at each use site. That stays
 * true everywhere else; these six are centralised only because the same paths are
 * repeated across the action bar, the floating tools panel and the comment
 * off-canvas, and six copies of each would drift.
 *
 * House style is kept: 24x24 viewBox, `fill="none"`, `stroke="currentColor"`,
 * round caps and joins, decorative by default. Colour comes from CSS.
 */

const PATHS = {
  // favorite_border
  favorite: (
    <path d="M12 20.3 4.6 13a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l.6.6.6-.6a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z" />
  ),
  // chat_bubble_outline
  chat: <path d="M21 12a8 8 0 0 1-8 8H4.5a.5.5 0 0 1-.35-.85L6 17.2A8 8 0 1 1 21 12Z" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3" />
    </>
  ),
  // bookmark_add
  bookmark: (
    <>
      <path d="M17 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l6-3.4Z" />
      <path d="M19 4v6M22 7h-6" />
    </>
  ),
  // play_circle
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.2 8.6 15.4 12l-5.2 3.4Z" />
    </>
  ),
  // add
  add: <path d="M12 5v14M5 12h14" />,
  // check, for the toggled state of a button whose resting icon is `add`
  check: <path d="M4.5 12.5l5 5 10-11" />,
  // more_horiz
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function BlogIcon({ name, size = 24, strokeWidth = 1.6 }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
