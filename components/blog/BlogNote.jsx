'use client';

import { formatBlogDate } from '../../lib/publishing';
import BlogIcon from './BlogIcon';

/**
 * One of the reader's own notes, as a card.
 *
 * A card rather than a hairline row — unlike comments, these are the reader's
 * own and the reference gives each one its own surface.
 *
 * The anchored fragment is quoted above the note in the highlight colour, the
 * same treatment a comment's quote gets, so the two read as the same kind of
 * reference to the article.
 */
export default function BlogNote({ note, onReport }) {
  if (!note) return null;

  const author = note.author || {};

  return (
    <article className="blog-note">
      <header className="blog-comment-head">
        {author.avatarUrl ? (
          <img className="blog-comment-avatar" src={author.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span className="blog-comment-avatar blog-comment-avatar--fallback" aria-hidden="true">
            {(author.name || '?').trim().charAt(0)}
          </span>
        )}

        <p className="blog-comment-who">
          <span className="blog-comment-name">{author.name || 'You'}</span>
          {author.pronouns ? (
            <span className="blog-comment-pronouns">{author.pronouns}</span>
          ) : null}
          {note.createdAt ? (
            <time className="blog-comment-date" dateTime={note.createdAt}>
              {formatBlogDate(note.createdAt)}
            </time>
          ) : null}
        </p>

        {/* The reference puts a report action behind this menu. */}
        <button
          type="button"
          className="blog-comment-more"
          onClick={onReport}
          aria-label="More options for this note"
          aria-haspopup="menu"
        >
          <BlogIcon name="more" size={20} />
        </button>
      </header>

      {note.anchor ? (
        <blockquote className="blog-comment-highlight">
          <p>{note.anchor}</p>
        </blockquote>
      ) : null}
      {/* (Dynamic content: the article fragment this note sits beside) */}

      <p className="blog-comment-body">{note.body}</p>

      {/* A published note also shows in the post's thread and on the profile, so
          its state is worth saying out loud rather than leaving to memory. */}
      <p className={`blog-note-state${note.isPublic ? ' is-public' : ''}`}>
        {note.isPublic ? 'Published — others can read this' : 'Private — only you can read this'}
      </p>
    </article>
  );
}
