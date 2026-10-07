import Link from 'next/link';

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
 * Reader and follower counters stay absent until a real measurement exists.
 */

export default function BlogPostAuthor({ author }) {
  if (!author) return null;

  const socials = (author.socials || []).filter((social) => social.url?.startsWith('https://'));

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

          {author.bio ? <p className="blog-author-bio">{author.bio}</p> : null}
          {/* (Dynamic content: author.bio — two or three lines in the author's voice) */}

          <nav className="blog-author-links" aria-label="More from the author">
            <Link href={author.handle ? `/users/${author.handle}` : '/about'}>About the author</Link>
            <Link href="/services">Work with me</Link>
            <Link href="/links">Let&rsquo;s talk!</Link>
          </nav>

          {socials.length ? (
            <ul className="blog-author-socials">
              {socials.map((social, index) => (
                <li key={`${social.url}-${index}`}>
                  <a href={social.url} aria-label={social.name} className={social.icon ? undefined : 'blog-author-social-text'}>
                    {social.icon ? <img src={social.icon} alt="" loading="lazy" /> : social.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {/* (Dynamic metadata: author.socials[] — real handles replace the mock URLs) */}
        </div>
      </div>

      {author.patreonUrl?.startsWith('https://') && <Link className="blog-post-patreon" href={author.patreonUrl}>
        Be my patreon
      </Link>}
    </section>
  );
}
