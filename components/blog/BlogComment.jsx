'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import { formatBlogDate } from '../../lib/publishing';
import { placeholderAttrs } from '../../lib/placeholder';
import { fetchReplies } from '../../lib/comments';
import { reactionError, setCommentLike } from '../../lib/reactions';
import BlogIcon from './BlogIcon';
import BlogCommentComposer from './BlogCommentComposer';

/**
 * One comment in the thread.
 *
 * A comment anchored to a highlight quotes the fragment above its body, which is
 * how a reader scrolling the list can tell what it is answering.
 */
export default function BlogComment({ comment, onOpenHighlight, onCreated, isReply = false, reactable = true }) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [replies, setReplies] = useState(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [composing, setComposing] = useState(false);
  const [likes, setLikes] = useState(comment?.likes || 0);
  const [liked, setLiked] = useState(Boolean(comment?.liked));
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeError, setLikeError] = useState('');
  const readerRef = useRef({ userId: user?.id, commentId: comment?.id });
  readerRef.current = { userId: user?.id, commentId: comment?.id };
  useEffect(() => { setLikes(comment?.likes || 0); setLiked(Boolean(comment?.liked)); setLikeError(''); }, [comment?.id, comment?.likes, comment?.liked, user?.id]);

  const toggleLike = async () => {
    if (!reactable) return;
    if (locked) { requestSignIn('like this comment'); return; }
    if (likeBusy) return;
    const identity = { userId: user?.id, commentId: comment.id };
    setLikeBusy(true); setLikeError('');
    try {
      const result = await setCommentLike(comment.id, !liked);
      if (readerRef.current.userId === identity.userId && readerRef.current.commentId === identity.commentId) {
        setLikes(result.likes); setLiked(result.liked);
      }
    } catch (error) {
      if (readerRef.current.userId === identity.userId && readerRef.current.commentId === identity.commentId) {
        setLikeError(reactionError(error));
        if (error.status === 401) requestSignIn('like this comment');
      }
    }
    finally { setLikeBusy(false); }
  };

  const openThread = useCallback(async () => {
    // aria-disabled is advisory and does not stop a click, so the guard has to
    // be here as well: a comment with no replies announced "No replies yet" and
    // then opened an empty thread anyway.
    if (!comment?.replies || !reactable) return;
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
  }, [comment?.id, reactable, replies]);

  if (!comment) return null;

  const locked = !isLoading && !user;
  const author = comment.author || {};

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

      </header>

      {comment.highlight ? (
        // Clickable when the surface can show the fragment's own panel; plain
        // quoted text when it cannot, rather than a control that leads nowhere.
        onOpenHighlight && comment.paragraphStatus === 'current' ? (
          <button
            type="button"
            className="blog-comment-highlight blog-comment-highlight--button"
            onClick={() => onOpenHighlight(comment)}
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
      {!isReply && (comment.paragraphStatus === 'previous-version' || comment.paragraphStatus === 'unassigned') && <details className="blog-note-previous-version">
        <summary>{comment.paragraphStatus === 'unassigned' ? 'Conversation without a current paragraph' : 'This conversation refers to an earlier version'}</summary>
        <p>{comment.paragraphSnapshot || comment.highlight || 'The original paragraph is no longer in this article.'}</p>
      </details>}

      <div className="blog-comment-actions">
        <button
          type="button"
          className={`blog-comment-action${liked ? ' is-active' : ''}${reactable ? '' : ' is-unwired'}`}
          onClick={toggleLike}
          disabled={!reactable || isLoading || likeBusy}
          aria-disabled={!reactable || undefined}
          aria-pressed={locked ? undefined : liked}
          aria-label={reactable ? `${liked ? 'Unlike' : 'Like'} this comment, ${likes} so far` : 'Reactions are unavailable in this profile preview'}
        >
          <BlogIcon name="favorite" size={24} />
          <span>{likes}</span>
        </button>

        {/* Reading a thread needs no session, like reading the post does not.
            A reply carries no thread of its own — one level, by design. */}
        <button
          type="button"
          className="blog-comment-action"
          disabled={!reactable || isReply || !comment.replies}
          onClick={isReply ? undefined : openThread}
          aria-expanded={isReply ? undefined : Boolean(replies)}
          aria-disabled={isReply || !comment.replies || !reactable ? true : undefined}
          aria-label={
            comment.replies
              ? `${replies ? 'Hide' : 'Read'} ${comment.replies} replies`
              : 'No replies yet'
          }
        >
          <BlogIcon name="chat" size={24} />
          <span {...(!reactable ? placeholderAttrs('comment.replies') : {})}>{comment.replies ?? 0}</span>
        </button>

        <button
          className="blog-comment-reply"
          type="button"
          disabled={!reactable}
          aria-disabled={locked || !reactable || undefined}
          aria-expanded={composing}
          aria-label={`Reply to ${author.name || 'this comment'}`}
          title={locked ? 'Sign in to use this' : undefined}
          onClick={() => {
            if (!reactable) return;
            if (locked) {
              requestSignIn();
              return;
            }
            setComposing((value) => !value);
          }}
        >
          Reply
        </button>
      </div>

      {likeError && <p className="blog-public-error" role="alert">{likeError}</p>}

      {composing ? (
        <div className="blog-comment-composer-inline">
          {/* The same composer the thread and the off-canvas use. */}
          <BlogCommentComposer
            parentId={comment.id}
            onCreated={(created) => {
              if (!isReply) setReplies((current) => current ? [...current, created] : [created]);
              setComposing(false);
              onCreated?.(created);
            }}
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
            replies.map((reply) => <BlogComment key={reply.id} comment={reply} isReply reactable={reactable} onCreated={(created) => {
              setReplies((current) => [...current, created]);
              onCreated?.(created);
            }} />)
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
