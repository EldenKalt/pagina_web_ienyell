import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import { getPostCategory } from '../../data/blogPlaceholderPosts';

/**
 * One post given the large lead treatment: big cover with its category over it,
 * title, byline and a "Read more" button.
 *
 * Extracted from BlogRecentSection, which had it inline and was the only place
 * it existed. The series hero needs exactly the same card for the post that
 * opens a series, and two copies of it would drift.
 *
 * `headingLevel` keeps the heading order right per surface: h3 under the
 * landing's section h2, h2 where the lead is the first thing after the page h1.
 */
export default function BlogLeadPost({ post, headingLevel = 3, ctaLabel = 'Read more' }) {
  if (!post) return null;

  const Heading = `h${headingLevel}`;

  return (
    <article className="blog-lead">
      {post.coverUrl ? (
        <div className="blog-lead-cover">
          <img src={post.coverUrl} alt="" />
          <span className="blog-tag blog-tag--overlay">{getPostCategory(post)}</span>
        </div>
      ) : null}

      <div className="blog-lead-body">
        <Heading className="blog-lead-title">{post.title}</Heading>
        <p className="blog-lead-meta">
          <span>{post.author?.name || 'ienyell'}</span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </p>
        <Link href={`/blog/${post.slug}`} className="blog-btn">
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
