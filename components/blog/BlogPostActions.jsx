'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { placeholderAttrs } from '../../lib/placeholder';
import BlogIcon from './BlogIcon';

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

  return (
    <div className="blog-post-actions">
      <div className="blog-post-actions-group">
        <button className="blog-post-action" {...control(`Like this post, ${likes} so far`)}>
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

        <button className="blog-post-action" {...control(`Share this post, shared ${shares} times`)}>
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
          className="blog-post-action blog-post-action--icon"
          {...control('Listen to this post')}
        >
          <BlogIcon name="play" />
        </button>

        <button
          className="blog-post-action blog-post-action--icon"
          {...control('More options')}
        >
          <BlogIcon name="more" />
        </button>
      </div>
    </div>
  );
}
