import BlogPostAbout from './BlogPostAbout';
import BlogPostInterests from './BlogPostInterests';
import BlogPostIndex from './BlogPostIndex';

/**
 * The editorial rail: context, topics and the chapter index.
 *
 * On wide screens this is ONE sticky element, not three. Sticking each block
 * separately is what makes them collide — each pins at the same offset and the
 * one below slides under the one above — so they travel together as a single
 * panel, capped to the viewport and scrolling inside itself when the index is
 * long enough to outgrow it.
 *
 * Block order follows the reference: About this post → Add to your interest →
 * In this post.
 *
 * "This might interest you" is NOT here. It is what a reader wants after the
 * article, not beside it, so it lives in BlogPostRailEnd, below.
 */
export default function BlogPostRail({ post, outline }) {
  return (
    // The track is what the grid places and what bounds the pinning. A sticky
    // grid item is supposed to be confined to its own grid area, but in practice
    // it is not — measured here, the rail kept travelling past its row and over
    // the section below. Inside an ordinary block container the constraint is
    // reliable, so the track stretches to the article's height and the rail
    // sticks within it.
    <div className="blog-post-rail-track">
      <aside className="blog-post-rail" aria-label="About this post">
        <BlogPostAbout post={post} />
        <BlogPostInterests topics={post?.keywords || []} />
        <BlogPostIndex outline={outline} />
      </aside>
    </div>
  );
}
