'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import BlogIcon from './BlogIcon';

/**
 * The reading tools: a floating panel beside the article on wide screens, a fixed
 * bar at the foot of the screen on narrow ones — where a thumb reaches.
 *
 * "Keep" is the same action as the bookmark in the action bar, not a second one,
 * so both read and write the same state: saving in one shows as saved in the
 * other. Its state and the reaction counters come from the blog API.
 *
 * "Go to main" leads to the post's series. A post that belongs to no series has
 * no main to return to, so the control is left out rather than pointed somewhere
 * arbitrary.
 *
 * "Add Note" opens the notes panel with its composer. Once the annotation layer
 * exists it will act on the current selection instead; the panel is where the
 * note ends up either way.
 *
 * The four controls are the reference's `add_interest_button` — the same pill
 * the rail's interest chips use — so they reuse `.blog-post-interest` rather
 * than getting a second, nearly identical style.
 *
 * Rendered through a portal because `.page-transition` sets `transform` and
 * `will-change`, which makes it the containing block for any fixed descendant —
 * the bar would anchor to the article's full height instead of the viewport and
 * end up thousands of pixels below the fold.
 */

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
}

export default function BlogPostTools({
  stats,
  sequence,
  seriesHref,
  saved = false,
  onToggleSave,
  saveBusy = false,
  liked = false,
  onToggleLike,
  likeBusy = false,
  onShare,
  shareBusy = false,
  onAddNote,
  onReadNotes,
  onOpenComments,
}) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const locked = !isLoading && !user;
  const hasSeries = sequence?.scope === 'series' && Boolean(seriesHref);

  const guard = (action) => (event) => {
    if (locked) {
      event.preventDefault();
      requestSignIn();
      return;
    }
    action?.();
  };

  if (!mounted) return null;

  return createPortal(
    <aside className="blog-tools" aria-label="Reading tools">
      <p className="blog-tools-title">Tools</p>

      <ul className="blog-tools-list">
        {onAddNote && <li>
          <button type="button" className="blog-post-interest" onClick={guard(onAddNote)} aria-haspopup="dialog">
            Add Note
            <span className="blog-post-interest-icon" aria-hidden="true">
              <BlogIcon name="add" size={20} />
            </span>
          </button>
        </li>}
        {onReadNotes && <li>
          {/* The only one of the four without a `+` in the reference: it opens
              what is already there rather than adding anything. */}
          <button type="button" className="blog-post-interest" onClick={guard(onReadNotes)} aria-haspopup="dialog">
            Read my notes
          </button>
        </li>}
        <li>
          <button
            type="button"
            className={`blog-post-interest${saved ? ' is-followed' : ''}`}
            onClick={guard(onToggleSave)}
            disabled={isLoading || saveBusy}
            aria-pressed={locked ? undefined : saved}
          >
            {saved ? 'Kept' : 'Keep'}
            <span className="blog-post-interest-icon" aria-hidden="true">
              {/* The reference draws a `+` at rest; a toggle has to show its on
                  state, and the interest chips in the rail already swap to a
                  check for exactly this. */}
              <BlogIcon name={saved ? 'check' : 'add'} size={20} />
            </span>
          </button>
        </li>
        {hasSeries ? (
          <li>
            <Link className="blog-post-interest" href={seriesHref}>
              Go to main
              <span className="blog-post-interest-icon" aria-hidden="true">
                <BlogIcon name="add" size={20} />
              </span>
            </Link>
          </li>
        ) : null}
      </ul>

      <ul className="blog-tools-stats">
        <li>
          <button type="button" className={`blog-tools-stat${liked ? ' is-active' : ''}`}
            disabled={isLoading || likeBusy} aria-pressed={locked ? undefined : liked}
            onClick={guard(onToggleLike)} aria-label={`${liked ? 'Unlike' : 'Like'} this post, ${formatCount(stats?.likes)} so far`}>
            <BlogIcon name="favorite" size={22} />
            <span>{formatCount(stats?.likes)}</span>
          </button>
        </li>
        {onOpenComments && <li>
          {/* Reading the thread needs no account, so this one is never guarded. */}
          <button type="button" className="blog-tools-stat" onClick={onOpenComments} aria-haspopup="dialog" aria-label={`Read ${formatCount(stats?.comments)} comments`}>
            <BlogIcon name="chat" size={22} />
            <span>{formatCount(stats?.comments)}</span>
          </button>
        </li>}
        <li>
          <button type="button" className="blog-tools-stat" onClick={onShare} disabled={shareBusy}
            aria-label={`Share this post, shared ${formatCount(stats?.shares)} times`}>
            <BlogIcon name="share" size={22} />
            <span>{formatCount(stats?.shares)}</span>
          </button>
        </li>
      </ul>
    </aside>,
    document.body,
  );
}
