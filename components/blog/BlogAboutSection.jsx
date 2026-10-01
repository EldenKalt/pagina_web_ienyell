import Link from 'next/link';
import { BLOG_EDITORIAL_IMAGES } from '../../data/blogPlaceholderPosts';

/**
 * "About us" block: one large image on the left, copy and two smaller images on the
 * right. Links through to /about, which already exists as a full page.
 */
export default function BlogAboutSection({
  title = 'About us and why we write for you',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  // (Future content: short paragraph on who writes the blog and what it covers)
  ctaLabel = 'Read more',
  ctaHref = '/about',
}) {
  return (
    <section className="blog-about" aria-labelledby="blog-about-title">
      <div className="blog-about-main">
        <img src={BLOG_EDITORIAL_IMAGES.aboutMain} alt="" loading="lazy" />
      </div>

      <div className="blog-about-copy">
        <h2 id="blog-about-title">{title}</h2>

        <div className="blog-about-thumbs" aria-hidden="true">
          {BLOG_EDITORIAL_IMAGES.aboutSecondary.map((src) => (
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>

        <p>{body}</p>

        <Link href={ctaHref} className="blog-btn">
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
