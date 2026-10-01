import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import { getPostCategory } from '../../data/blogPlaceholderPosts';

/**
 * Grid card. Borderless and shadowless — the cover's generous radius and the
 * whitespace carry the structure — with a restrained category tag rather than a
 * coloured pill over the image.
 *
 * `headingLevel` keeps the heading order correct on both surfaces: h3 on the landing
 * (nested under section h2s), h2 on the archive.
 */
export default function BlogCard({ post, variant, headingLevel = 2 }) {
  if (!post) return null;

  const Heading = `h${headingLevel}`;
  const className = variant ? `blog-card blog-card--${variant}` : 'blog-card';

  return (
    <article className={className}>
      <div className="blog-card-cover">
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="blog-cover-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" />
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
        <span className="blog-tag blog-tag--overlay">{getPostCategory(post)}</span>
      </div>

      <div className="blog-card-body">
        <Heading>{post.title}</Heading>
        <p className="blog-card-meta">
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </p>
        <span className="blog-read-more">
          Read more
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <Link
        href={`/blog/${post.slug}`}
        className="blog-card-hit-area"
        aria-label={`Read ${post.title}`}
      />
    </article>
  );
}
