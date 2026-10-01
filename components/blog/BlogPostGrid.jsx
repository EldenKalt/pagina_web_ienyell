import BlogCard from './BlogCard';
import BlogCardSkeleton from './BlogCardSkeleton';
import BlogPostRow from './BlogPostRow';

/**
 * Renders a set of posts either as a card grid or as a hairline-separated list of
 * rows, plus the loading and empty states.
 *
 * `columns` picks the grid width without touching the base .blog-grid rule:
 * 2 (default) or 3.
 */
export default function BlogPostGrid({
  posts = [],
  loading = false,
  skeletonCount = 6,
  columns = 2,
  layout = 'grid',
  headingLevel = 2,
  showExcerpt = false,
  categoryLabel,
  emptyMessage = 'No articles published yet.',
}) {
  const gridClass = columns === 3 ? 'blog-grid blog-grid--three' : 'blog-grid';

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!posts.length) {
    return <div className="blog-empty">{emptyMessage}</div>;
  }

  if (layout === 'rows') {
    return (
      <div className="blog-rows">
        {posts.map((post) => (
          <BlogPostRow
            key={post.id}
            post={post}
            headingLevel={headingLevel}
            showExcerpt={showExcerpt}
            categoryLabel={categoryLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} headingLevel={headingLevel} />
      ))}
    </div>
  );
}
