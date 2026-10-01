import BlogPostGrid from './BlogPostGrid';

/**
 * The recent-posts grid on the landing. Uses the shared .section-header pattern
 * (heading + rule) already used elsewhere in the project.
 */
export default function BlogLatestPosts({ posts = [], title = 'Recent Posts' }) {
  if (!posts.length) return null;

  return (
    <section className="blog-latest" aria-labelledby="blog-latest-title">
      <div className="section-header">
        <h2 id="blog-latest-title">{title}</h2>
        <span className="line" aria-hidden="true" />
      </div>

      <BlogPostGrid posts={posts} columns={3} headingLevel={3} />
    </section>
  );
}
