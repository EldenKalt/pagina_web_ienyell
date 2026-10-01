import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import { getPostCategory } from '../../data/blogPlaceholderPosts';

/**
 * Compact list row: text left, square thumbnail right, separated from its siblings
 * by a hairline. Replaces bordered cards in list contexts.
 *
 * Titles and excerpts are line-clamped, which is what keeps the list rhythm even
 * when a post has a very long title.
 *
 * `headingLevel` keeps the heading order correct per surface: h3 on the landing
 * (nested under section h2s), h2 on the archive.
 */
export default function BlogPostRow({
  post,
  headingLevel = 3,
  showExcerpt = false,
  categoryLabel,
}) {
  if (!post) return null;

  const Heading = `h${headingLevel}`;
  // Inside a filtered archive, show the facet being filtered on rather than the
  // post's primary category — otherwise a "Character Design" listing shows rows
  // tagged "Process", which reads like the filter is broken.
  const category = categoryLabel || getPostCategory(post);

  return (
    <article className="blog-row">
      <div className="blog-row-body">
        <p className="blog-row-meta">
          <span className="blog-tag">{category}</span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </p>

        <Heading className="blog-row-title">{post.title}</Heading>

        {showExcerpt ? (
          <p className="blog-row-excerpt">
            {post.excerpt || 'Read the full article for all the details.'}
          </p>
        ) : null}

        <span className="blog-read-more">
          Read more
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* No cover: the row simply runs full width rather than showing an empty box. */}
      {post.coverUrl ? (
        <div className="blog-row-thumb">
          <img src={post.coverUrl} alt="" loading="lazy" />
        </div>
      ) : null}

      <Link
        href={`/blog/${post.slug}`}
        className="blog-card-hit-area"
        aria-label={`Read ${post.title}`}
      />
    </article>
  );
}
