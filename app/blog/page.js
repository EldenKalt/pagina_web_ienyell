import BlogHomeSections from '../../components/blog/BlogHomeSections';
import {
  getPlaceholderPosts,
  getPlaceholderTopics,
} from '../../data/blogPlaceholderPosts';

/**
 * Blog landing. Stays a server component — the posts are resolved here and handed to
 * a client child that owns only the search state, so the page still prerenders.
 *
 * TODO: replace these two calls with the live API read (GET /api/blog) and drop the
 * BLOG_USE_PLACEHOLDER_DATA flag in data/blogPlaceholderPosts.js.
 */
export default function BlogHomePage() {
  const posts = getPlaceholderPosts();
  const topics = getPlaceholderTopics();

  return <BlogHomeSections posts={posts} topics={topics} />;
}
