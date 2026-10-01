import BlogFeaturedStack from './BlogFeaturedStack';

/**
 * Landing hero: full-bleed tinted band holding the page's only <h1>, the search
 * field, and the tilted stack of featured posts on the right.
 *
 * Title stays on Inter — the serif is reserved for the article body.
 */
export default function BlogHero({
  eyebrow = 'Blog',
  title = 'Stories & Articles',
  subtitle = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
  // (Future content: one sentence stating what the blog covers and who it is for)
  featuredPosts = [],
  children,
}) {
  return (
    <header className="blog-hero">
      <div className="blog-hero-inner">
        <div className="blog-hero-copy">
          <p className="blog-list-eyebrow">{eyebrow}</p>
          <h1 className="blog-hero-title">{title}</h1>
          <p className="blog-hero-subtitle">{subtitle}</p>
          {/* Search is injected by the page, which owns the query state. */}
          {children}
        </div>

        <BlogFeaturedStack posts={featuredPosts} />
      </div>
    </header>
  );
}
