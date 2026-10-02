'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { placeholderAttrs } from '../../lib/placeholder';
import BlogIcon from './BlogIcon';
import BlogMenu from './BlogMenu';

/**
 * The action bar that sits under the post byline: reactions, comments and share on
 * the left, save / listen / more on the right.
 *
 * NOT PERSISTED. There is no reactions, bookmarks or comments endpoint yet, so the
 * counts are whatever the caller passes and nothing a reader does here is stored.
 * The bar exists so the layout, the states and the keyboard path can be reviewed;
 * wire it to the API when the annotation backend lands.
 *
 * Signed out, every control is announced as disabled and sends the reader to the
 * login page instead of pretending to work. While the session is still resolving
 * nothing is marked either way, so the bar never flashes a state it has to undo.
 */

/** 19.4k rather than 19412 — the design shows compact counts. */
function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
}

export default function BlogPostActions({
  stats,
  commentsLabel = 'comments',
  onOpenComments,
  saved = false,
  onToggleSave,
  highlightsHidden = false,
  onToggleHighlights,
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const signedIn = Boolean(user);
  const locked = !isLoading && !signedIn;

  const likes = formatCount(stats?.likes);
  const comments = formatCount(stats?.comments);
  const shares = formatCount(stats?.shares);

  const handle = (event) => {
    if (!locked) return;
    event.preventDefault();
    router.push('/users/login');
  };

  // Shared props for every control, so the locked path cannot drift between them.
  const control = (label) => ({
    type: 'button',
    onClick: handle,
    'aria-disabled': locked || undefined,
    'aria-label': label,
    title: locked ? 'Sign in to use this' : undefined,
  });

  // A control with nothing behind it reads as a bug — the account button in the
  // header taught that the hard way. These three have no endpoint at all, so
  // they say so instead of silently doing nothing: still visible, so the layout
  // can be judged whole, but announced as unavailable and inert to the pointer.
  const notWired = (label, why) => ({
    type: 'button',
    onClick: (event) => event.preventDefault(),
    'aria-disabled': true,
    'aria-label': `${label} — not available yet`,
    title: why,
    className: 'is-unwired',
  });

  return (
    <div className="blog-post-actions">
      <div className="blog-post-actions-group">
        <button
          {...notWired(`Like this post, ${likes} so far`, 'Reactions are not stored yet')}
          className="blog-post-action is-unwired"
        >
          <BlogIcon name="favorite" />
          <span className="blog-post-action-count" {...placeholderAttrs('post.stats.likes')}>{likes}</span>
        </button>

        {/* Reading the thread needs no session, so this one is never locked: it
            opens the comments panel for anyone. */}
        <button
          type="button"
          className="blog-post-action"
          onClick={onOpenComments}
          aria-label={`Read ${comments} ${commentsLabel}`}
          aria-haspopup="dialog"
        >
          <BlogIcon name="chat" />
          <span className="blog-post-action-count" {...placeholderAttrs('post.stats.comments')}>{comments}</span>
        </button>

        <button
          {...notWired(`Share this post, shared ${shares} times`, 'Sharing is not wired up yet')}
          className="blog-post-action is-unwired"
        >
          <BlogIcon name="share" />
          <span className="blog-post-action-count" {...placeholderAttrs('post.stats.shares')}>{shares}</span>
        </button>
      </div>

      <div className="blog-post-actions-group blog-post-actions-group--end">
        {/* The same action as "Keep" in the tools panel, sharing its state: this
            is one bookmark shown in two places, not two bookmarks. */}
        <button
          className={`blog-post-action blog-post-action--icon${saved ? ' is-active' : ''}`}
          {...control(saved ? 'Saved for later' : 'Save for later')}
          onClick={(event) => {
            if (locked) {
              event.preventDefault();
              router.push('/users/login');
              return;
            }
            onToggleSave?.();
          }}
          aria-pressed={locked ? undefined : saved}
        >
          <BlogIcon name="bookmark" />
        </button>

        {/* The design notes this button changes with the content: it plays the
            article's narration, or the transcription when there is one. */}
        <button
          {...notWired('Listen to this post', 'There is no narration for this post yet')}
          className="blog-post-action blog-post-action--icon is-unwired"
        >
          <BlogIcon name="play" />
        </button>

        {/* Hiding the highlights is a reading preference, not an account action,
            so it is open to everyone. It is lifted to the page because this bar
            is rendered twice and both copies must report the same state.
            NOT WIRED: the annotation layer that reads it does not exist yet. */}
        <BlogMenu
          label="More options for this post"
          className="blog-post-action blog-post-action--icon"
          items={[
            {
              id: 'highlights',
              type: 'checkbox',
              label: highlightsHidden ? 'Show highlights' : 'Hide highlights',
              checked: highlightsHidden,
              onSelect: onToggleHighlights,
            },
            {
              id: 'feedback',
              type: 'link',
              accent: true,
              label: 'Give me feedback',
              // (Expected destination: the author's contact surface. There is no
              // feedback form in the project, so this points at the links hub the
              // author card already sends readers to.)
              href: '/links',
            },
          ]}
        />
      </div>
    </div>
  );
}
