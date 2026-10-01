import { BLOG_EDITORIAL_IMAGES } from '../../data/blogPlaceholderPosts';

/**
 * Full-bleed strip of imagery. Purely decorative, so the images carry empty alt text
 * and the track is hidden from assistive tech — the heading already says what it is.
 *
 * The track scrolls inside its own container on narrow screens; the page itself must
 * never scroll horizontally.
 */
export default function BlogFollowStrip({ title = 'Follow us on @enyell' }) {
  return (
    <section className="blog-follow" aria-labelledby="blog-follow-title">
      <h2 className="blog-follow-title" id="blog-follow-title">{title}</h2>

      <div className="blog-follow-track" aria-hidden="true">
        {BLOG_EDITORIAL_IMAGES.followStrip.map((src, index) => (
          <img key={`${src}-${index}`} src={src} alt="" loading="lazy" />
        ))}
      </div>
    </section>
  );
}
