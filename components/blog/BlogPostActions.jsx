'use client';

import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import BlogIcon from './BlogIcon';
import BlogMenu from './BlogMenu';

/**
 * The action bar that sits under the post byline: reactions, comments and share on
 * the left, save / listen / more on the right.
 *
 * The page owns shared saved and liked state so both action bars and the tools
 * panel agree. Signed-out personal actions open the sign-in choice.
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
  saveBusy = false,
  liked = false,
  onToggleLike,
  likeBusy = false,
  onShare,
  shareBusy = false,
  highlightsHidden = false,
  onToggleHighlights,
}) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();

  const signedIn = Boolean(user);
  const locked = !isLoading && !signedIn;

  const likes = formatCount(stats?.likes);
  const comments = formatCount(stats?.comments);
  const shares = formatCount(stats?.shares);

  const handle = (event) => {
    if (!locked) return;
    event.preventDefault();
    requestSignIn();
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
        <button type="button" className={`blog-post-action${liked ? ' is-active' : ''}`}
          disabled={isLoading || likeBusy} aria-pressed={locked ? undefined : liked}
          aria-label={`${liked ? 'Unlike' : 'Like'} this post, ${likes} so far`}
          onClick={() => locked ? requestSignIn('like this post') : onToggleLike?.()}>
          <BlogIcon name="favorite" />
          <span className="blog-post-action-count">{likes}</span>
        </button>

        {/* Reading the thread needs no session, so this one is never locked: it
            opens the comments panel for anyone. */}
        {onOpenComments && <button
          type="button"
          className="blog-post-action"
          onClick={onOpenComments}
          aria-label={`Read ${comments} ${commentsLabel}`}
          aria-haspopup="dialog"
        >
          <BlogIcon name="chat" />
          <span className="blog-post-action-count">{comments}</span>
        </button>}

        <button type="button" className="blog-post-action" disabled={shareBusy}
          onClick={onShare} aria-label={`Share this post, shared ${shares} times`}>
          <BlogIcon name="share" />
          <span className="blog-post-action-count">{shares}</span>
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
              requestSignIn();
              return;
            }
            onToggleSave?.();
          }}
          disabled={isLoading || saveBusy}
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
