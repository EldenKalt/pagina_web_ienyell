import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import { getPostCategory } from '../../data/blogPlaceholderPosts';

/**
 * Overlapping, tilted stack of post cards — the hero motif from the reference.
 * The tilt is a static CSS transform, not animation.
 *
 * These are real links, not decoration: each card is reachable and labelled. Hidden
 * below 960px via CSS, where stacking them would cost height without adding meaning.
 */
export default function BlogFeaturedStack({ posts = [], variant }) {
  const cards = posts.slice(0, 3);
  if (!cards.length) return null;

  const className = variant
    ? `blog-stack blog-stack--${variant}`
    : 'blog-stack';

  return (
    <div className={className}>
      {cards.map((post, index) => (
        <article className={`blog-stack-card blog-stack-card--${index + 1}`} key={post.id}>
          {post.coverUrl ? (
            <img className="blog-stack-cover" src={post.coverUrl} alt="" loading="lazy" />
          ) : (
            <div className="blog-stack-cover blog-stack-cover--empty" aria-hidden="true" />
          )}

          <div className="blog-stack-body">
            <span className="blog-tag">{getPostCategory(post)}</span>
            <h3 className="blog-stack-title">{post.title}</h3>
            <p className="blog-stack-meta">
              <span>{formatBlogDate(post.publishedAt)}</span>
              {post.readingTime ? <span>{post.readingTime} min read</span> : null}
            </p>
          </div>

          <Link
            href={`/blog/${post.slug}`}
            className="blog-card-hit-area"
            aria-label={`Read ${post.title}`}
          />
        </article>
      ))}
    </div>
  );
}
