import Link from 'next/link';
import { placeholderAttrs } from '../../lib/placeholder';

/**
 * Author card at the foot of the article: who wrote this, and every way to keep
 * following them.
 *
 * Structure follows the node: the avatar and a single column beside it carrying
 * name, counts, bio, links and socials, with "Be my patreon" pushed to the far
 * right of the whole block — not inline with the name.
 *
 * The patreon pill is the same `.blog-post-patreon` the header uses; it is the
 * same component in the design.
 *
 * Reuses the social SVGs the site footer already ships. The footer paints them
 * white for its dark background; here they sit on paper, so `brightness(0)`
 * forces them back to black.
 *
 * The reader and follower counts are invented placeholders and are marked as
 * such — see lib/placeholder.js.
 */

/** 12.4k rather than 12400, matching the counts in the action bar. */
function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
}

export default function BlogPostAuthor({ author }) {
  if (!author) return null;

  const socials = author.socials || [];

  return (
    <section className="blog-author" aria-labelledby="blog-author-title">
      <div className="blog-author-main">
        {author.avatarUrl ? (
          <img className="blog-author-avatar" src={author.avatarUrl} alt="" loading="lazy" />
        ) : null}

        <div className="blog-author-column">
          <h2 className="blog-author-name" id="blog-author-title">
            Written by {author.name || 'ienyell'}
          </h2>

          <p className="blog-author-stats">
            <span {...placeholderAttrs('author.readers')}>{formatCount(author.readers)}</span>
            {' readers'}
            <span aria-hidden="true"> • </span>
            <span {...placeholderAttrs('author.followers')}>{formatCount(author.followers)}</span>
            {' followers'}
          </p>

          {author.bio ? <p className="blog-author-bio">{author.bio}</p> : null}
          {/* (Dynamic content: author.bio — two or three lines in the author's voice) */}

          <nav className="blog-author-links" aria-label="More from the author">
            <Link href="/about">Follow me</Link>
            <Link href="/services">Work with me</Link>
            <Link href="/links">Let&rsquo;s talk!</Link>
          </nav>

          {socials.length ? (
            <ul className="blog-author-socials">
              {socials.map((social) => (
                <li key={social.name}>
                  <a href={social.url || '#'} aria-label={social.name}>
                    <img src={social.icon} alt="" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {/* (Dynamic metadata: author.socials[] — real handles replace the mock URLs) */}
        </div>
      </div>

      <Link className="blog-post-patreon" href={author.patreonUrl || '#'}>
        Be my patreon
      </Link>
    </section>
  );
}
