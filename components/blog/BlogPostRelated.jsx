import BlogPostRecommendations from './BlogPostRecommendations';

/**
 * "This might interest you", at the foot of the post and across the full width.
 *
 * It started in the rail, as in the reference, and could not stay there. The rail
 * is pinned for the length of the article, so anything else placed in that column
 * is guaranteed to slide underneath it — there is only room for one panel in a
 * column that never scrolls away. The foot of the page is also where the same
 * recommendations appear in the reference, as a grid.
 *
 * Same list, two formats: the wide grid here, the compact stack the rail variant
 * still supports if a narrow surface ever needs it.
 */
export default function BlogPostRelated({ recommendations = [] }) {
  if (!recommendations.length) return null;

  return (
    <section className="blog-post-related" aria-labelledby="blog-post-recs-title">
      <BlogPostRecommendations
        posts={recommendations}
        variant="grid"
        headingId="blog-post-recs-title"
        cta={{ label: 'Know all my post', href: '/blog/archive' }}
      />
    </section>
  );
}
