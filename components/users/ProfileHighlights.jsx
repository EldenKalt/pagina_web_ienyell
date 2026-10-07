import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';

/**
 * Passages the reader has marked, across every post.
 *
 * Each one links back to its article with a text fragment, so following it lands
 * on the passage rather than at the top of the post. That works without any
 * annotation existing on the receiving end — the browser finds the text itself —
 * which matters because it means these links survive even for a highlight whose
 * anchor has since been orphaned.
 *
 * The quote is set in the article's own serif with the highlight colour behind
 * it, the same treatment a quoted fragment gets on a comment and in the note
 * composer, so the three read as the same kind of reference to the article.
 */
export default function ProfileHighlights({ highlights = [] }) {
  if (!highlights.length) return null;

  return (
    <ul className="profile-highlights">
      {highlights.map((highlight) => (
        <li key={highlight.id}>
          <article className="profile-highlight">
            <blockquote className="profile-highlight-quote">
              <p>{highlight.exact}</p>
            </blockquote>
            {/* (Dynamic content: the passage the reader marked) */}

            <p className="profile-highlight-meta">
              {highlight.postSlug ? <Link
                href={`/blog/${highlight.postSlug}#:~:text=${encodeURIComponent(highlight.exact.slice(0, 300))}`}
              >{highlight.postTitle}</Link> : <span>{highlight.postTitle}</span>}
              {highlight.createdAt ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={highlight.createdAt}>
                    {formatBlogDate(highlight.createdAt)}
                  </time>
                </>
              ) : null}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
