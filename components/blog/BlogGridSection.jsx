import Link from 'next/link';
import BlogPostGrid from './BlogPostGrid';

/**
 * Section header with an optional "View All →" link, above a card grid.
 * Used twice on the landing (Featured / Popular) with different post sets.
 */
export default function BlogGridSection({
  id,
  title,
  posts = [],
  viewAllHref = '/blog/archive',
  viewAllLabel = 'View All',
}) {
  if (!posts.length) return null;

  const headingId = `${id}-title`;

  return (
    <section className="blog-grid-section" aria-labelledby={headingId}>
      <div className="blog-section-head">
        <h2 id={headingId}>{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className="blog-view-all">
            {viewAllLabel}
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}
      </div>

      <BlogPostGrid posts={posts} columns={3} headingLevel={3} />
    </section>
  );
}
