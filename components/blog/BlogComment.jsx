'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { formatBlogDate } from '../../lib/publishing';
import { placeholderAttrs } from '../../lib/placeholder';
import { fetchReplies } from '../../lib/comments';
import BlogIcon from './BlogIcon';
import BlogMenu from './BlogMenu';
import BlogCommentComposer from './BlogCommentComposer';

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
export default function BlogComment({ comment, onOpenHighlight, isReply = false }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [replies, setReplies] = useState(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [composing, setComposing] = useState(false);

  const openThread = useCallback(async () => {
    // aria-disabled is advisory and does not stop a click, so the guard has to
    // be here as well: a comment with no replies announced "No replies yet" and
    // then opened an empty thread anyway.
    if (!comment?.replies) return;
    if (replies) {
      setReplies(null);
      return;
    }
    setLoadingReplies(true);
    setReplyError('');
    try {
      const data = await fetchReplies(comment.id);
      setReplies(data.replies);
    } catch (error) {
      setReplyError(error.message || 'The replies could not be loaded.');
    } finally {
      setLoadingReplies(false);
    }
  }, [comment?.id, replies]);

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
    <article className={`blog-comment${isReply ? ' blog-comment--reply' : ''}`}>
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

      {/* A reply to another reply is flattened to this same level, so the name
          of the person being answered is what carries the structure that the
          indentation would have. */}
      {comment.toName ? (
        <p className="blog-comment-to">
          Replying to <strong>{comment.toName}</strong>
        </p>
      ) : null}

      <p className="blog-comment-body">{comment.body}</p>

      <div className="blog-comment-actions">
        {/* Nothing stores a reaction yet, so it says so rather than appearing to
            work. See BlogPostActions. */}
        <button
          type="button"
          className="blog-comment-action is-unwired"
          onClick={(event) => event.preventDefault()}
          aria-disabled="true"
          title="Reactions are not stored yet"
          aria-label={`Like this comment, ${comment.likes ?? 0} so far — not available yet`}
        >
          <BlogIcon name="favorite" size={24} />
          <span {...placeholderAttrs('comment.likes')}>{comment.likes ?? 0}</span>
        </button>

        {/* Reading a thread needs no session, like reading the post does not.
            A reply carries no thread of its own — one level, by design. */}
        <button
          type="button"
          className="blog-comment-action"
          onClick={isReply ? undefined : openThread}
          aria-expanded={isReply ? undefined : Boolean(replies)}
          aria-disabled={isReply || !comment.replies ? true : undefined}
          aria-label={
            comment.replies
              ? `${replies ? 'Hide' : 'Read'} ${comment.replies} replies`
              : 'No replies yet'
          }
        >
          <BlogIcon name="chat" size={24} />
          <span {...placeholderAttrs('comment.replies')}>{comment.replies ?? 0}</span>
        </button>

        <button
          className="blog-comment-reply"
          type="button"
          aria-disabled={locked || undefined}
          aria-expanded={composing}
          aria-label={`Reply to ${author.name || 'this comment'}`}
          title={locked ? 'Sign in to use this' : undefined}
          onClick={() => {
            if (locked) {
              router.push('/users/login');
              return;
            }
            setComposing((value) => !value);
          }}
        >
          Reply
        </button>
      </div>

      {composing ? (
        <div className="blog-comment-composer-inline">
          {/* The same composer the thread and the off-canvas use. NOT
              PERSISTED — there is no endpoint for a reply any more than for a
              comment. */}
          <BlogCommentComposer
            placeholder={`Reply to ${author.name || 'this comment'}…`}
          />
        </div>
      ) : null}

      {replyError ? (
        <p className="blog-public-error" role="alert">
          {replyError}
        </p>
      ) : null}

      {loadingReplies ? (
        <p className="blog-comment-thread-loading" role="status" aria-live="polite">
          Loading replies…
        </p>
      ) : null}

      {replies ? (
        <div className="blog-comment-thread">
          {replies.length ? (
            replies.map((reply) => <BlogComment key={reply.id} comment={reply} isReply />)
          ) : (
            // The count can be larger than what the thread actually holds. What
            // is shown is what there is, not what the counter claimed.
            <p className="blog-comment-thread-empty">No replies to show yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
