/** Loading placeholder for a BlogCard. Moved verbatim from app/blog/page.js. */
export default function BlogCardSkeleton() {
  return (
    <div className="blog-card blog-skeleton" aria-hidden="true">
      <div className="blog-skeleton-cover" />
      <div className="blog-skeleton-line short" />
      <div className="blog-skeleton-line title" />
      <div className="blog-skeleton-line" />
      <div className="blog-skeleton-line" />
    </div>
  );
}
