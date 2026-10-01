'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatBlogDate } from '../../lib/publishing';
import { placeholderAttrs } from '../../lib/placeholder';
import BlogIcon from './BlogIcon';
import BlogMenu from './BlogMenu';

/**
 * One comment in the thread.
 *
 * A comment anchored to a highlight quotes the fragment above its body, which is
 * how a reader scrolling the list can tell what it is answering. The quote uses
 * the same highlight colour the article will use once the annotation layer
 * renders inline marks.
 *
 * NOT PERSISTED. Liking and replying are gated behind a session like every other
 * control on this page, and nothing a reader does here is stored — there is no
 * comments endpoint yet.
 */
export default function BlogComment({ comment, onOpenHighlight }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (!comment) return null;

  const locked = !isLoading && !user;
  const author = comment.author || {};

  const act = (event) => {
    if (!locked) return;
    event.preventDefault();
    router.push('/users/login');
  };

  const control = (label) => ({
    type: 'button',
    onClick: act,
    'aria-disabled': locked || undefined,
    'aria-label': label,
    title: locked ? 'Sign in to use this' : undefined,
  });

  return (
    <article className="blog-comment">
      <header className="blog-comment-head">
        {author.avatarUrl ? (
          <img className="blog-comment-avatar" src={author.avatarUrl} alt="" loading="lazy" />
        ) : (
          // No avatar: an initial keeps the row rhythm instead of leaving a gap.
          <span className="blog-comment-avatar blog-comment-avatar--fallback" aria-hidden="true">
            {(author.name || '?').trim().charAt(0)}
          </span>
        )}

        {/* The reference stacks these: name and pronoun share a line, the date
            sits under them. Run together on one wrapping line the date reads as
            part of the name on a narrow column. */}
        <div className="blog-comment-who">
          <p className="blog-comment-identity">
            <span className="blog-comment-name">{author.name || 'Reader'}</span>
            {author.pronouns ? (
              <span className="blog-comment-pronouns">{author.pronouns}</span>
            ) : null}
          </p>
          {comment.publishedAt ? (
            <time className="blog-comment-date" dateTime={comment.publishedAt}>
              {formatBlogDate(comment.publishedAt)}
            </time>
          ) : null}
        </div>

        {/* Reporting needs a session like every other action here, so signed out
            the item is announced as disabled and sends the reader to log in.
            NOT PERSISTED: there is no moderation endpoint. */}
        <BlogMenu
          label={`More options for ${author.name || 'this comment'}`}
          className="blog-comment-more"
          items={[
            {
              id: 'report',
              label: 'Report this comment',
              danger: true,
              disabled: locked,
              onSelect: () => {
                if (locked) router.push('/users/login');
              },
            },
          ]}
        />
      </header>

      {comment.highlight ? (
        // Clickable when the surface can show the fragment's own panel; plain
        // quoted text when it cannot, rather than a control that leads nowhere.
        onOpenHighlight ? (
          <button
            type="button"
            className="blog-comment-highlight blog-comment-highlight--button"
            onClick={() => onOpenHighlight(comment.highlight)}
            aria-haspopup="dialog"
            aria-label="Read the reactions to this fragment"
          >
            <span>{comment.highlight}</span>
          </button>
        ) : (
          <blockquote className="blog-comment-highlight">
            <p>{comment.highlight}</p>
          </blockquote>
        )
      ) : null}
      {/* (Dynamic content: the article fragment this comment is anchored to) */}

      <p className="blog-comment-body">{comment.body}</p>

      <div className="blog-comment-actions">
        <button className="blog-comment-action" {...control(`Like this comment, ${comment.likes ?? 0} so far`)}>
          <BlogIcon name="favorite" size={24} />
          <span {...placeholderAttrs('comment.likes')}>{comment.likes ?? 0}</span>
        </button>

        <button className="blog-comment-action" {...control(`Read ${comment.replies ?? 0} replies`)}>
          <BlogIcon name="chat" size={24} />
          <span {...placeholderAttrs('comment.replies')}>{comment.replies ?? 0}</span>
        </button>

        <button className="blog-comment-reply" {...control(`Reply to ${author.name || 'this comment'}`)}>
          Reply
        </button>
      </div>
    </article>
  );
}
