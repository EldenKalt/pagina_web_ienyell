import Link from 'next/link';
import BlogPostRow from './BlogPostRow';
import BlogLeadPost from './BlogLeadPost';
import { formatBlogDate } from '../../lib/publishing';
import { getPostCategory } from '../../data/blogPlaceholderPosts';

/**
 * "Recent Blogs": one large lead post on the left, three compact rows on the right.
 * Two columns from 960px, stacked below with the lead first.
 */
export default function BlogRecentSection({ posts = [], title = 'Recent Blogs' }) {
  const [lead, ...rest] = posts;
  const rows = rest.slice(0, 3);
  if (!lead) return null;

  return (
    <section className="blog-recent" aria-labelledby="blog-recent-title">
      <div className="section-header">
        <h2 id="blog-recent-title">{title}</h2>
        <span className="line" aria-hidden="true" />
      </div>

      <div className="blog-recent-layout">
        <BlogLeadPost post={lead} headingLevel={3} />

        <div className="blog-recent-rows">
          {rows.map((post) => (
            <BlogPostRow key={post.id} post={post} headingLevel={3} />
          ))}
        </div>
      </div>
    </section>
  );
}
