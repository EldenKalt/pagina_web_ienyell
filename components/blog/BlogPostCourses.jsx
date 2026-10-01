import BlogPostRecommendations from './BlogPostRecommendations';

/**
 * "Know courses and content related with this topic" — the last block of the post.
 *
 * Built on the same card as the related posts, with the two differences the
 * reference shows: a type badge and a launch date. One card component rather than
 * a near-identical second one.
 *
 * ENTIRELY PLACEHOLDER. Courses are not a content type in this project — no
 * model, no route, no data — so the cards link nowhere and the CTA has nothing
 * to point at. See data/blogPlaceholderCourses.js.
 */
export default function BlogPostCourses({ courses = [] }) {
  if (!courses.length) return null;

  return (
    <section className="blog-post-related blog-post-courses" aria-labelledby="blog-courses-title">
      <BlogPostRecommendations
        posts={courses}
        variant="grid"
        title="Know courses and content related with this topic"
        headingId="blog-courses-title"
        cta={{ label: 'Know all the courses', href: null }}
      />
    </section>
  );
}
