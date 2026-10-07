import BlogHomeSections from '../../components/blog/BlogHomeSections';
import { fetchBlogApi } from '../../lib/blogApi';

/**
 * Blog landing. Stays a server component — the posts are resolved here and handed to
 * a client child that owns only the search state, so the page still prerenders.
 *
 * The public blog API is read at request time so new and scheduled posts appear
 * as soon as the backend publishes them.
 */
export default async function BlogHomePage() {
  let posts = [];
  let topics = [];
  let loadError = '';

  try {
    const [postPage, topicData] = await Promise.all([
      fetchBlogApi('/api/blog?page=1&limit=24'),
      fetchBlogApi('/api/blog/topics'),
    ]);
    posts = postPage.posts;
    topics = topicData.topics;
  } catch {
    loadError = 'The articles could not be loaded. Please try again later.';
  }

  return <BlogHomeSections posts={posts} topics={topics} loadError={loadError} />;
}
