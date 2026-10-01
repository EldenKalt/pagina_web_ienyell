import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import { placeholderAttrs } from '../../lib/placeholder';
import BlogIcon from './BlogIcon';

/**
 * "This might interest you" — the post's related reading.
 *
 * One data source, two formats. The reference shows the same recommendations as a
 * narrow stack in the rail and as a wide grid at the foot of the page, so this is
 * a single component with a `variant`; the grid arrives with the page footer
 * section and needs only its own class, not another component.
 *
 * The counts are the same placeholder stats the action bar shows and are not
 * persisted — see BlogPostActions.
 */

function Card({ post, variant }) {
  const stats = post.stats || {};

  return (
    <article className="blog-rec-card">
      {post.coverUrl ? (
        <div className="blog-rec-thumb">
          <img src={post.coverUrl} alt="" loading="lazy" />
        </div>
      ) : null}

      <div className="blog-rec-body">
        <p className="blog-rec-meta">
          {post.updatedAt ? (
            <>
              Last update:{' '}
              <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time>
            </>
          ) : null}
          {post.launchedAt ? (
            <>
              {post.updatedAt ? ' · ' : null}
              Launch date:{' '}
              <time dateTime={post.launchedAt}>{formatBlogDate(post.launchedAt)}</time>
            </>
          ) : null}
        </p>

        <h3 className="blog-rec-title">
          {post.title}
          {/* The reference marks a card that is not a post with its type. */}
          {post.badge ? <span className="blog-rec-badge">{post.badge}</span> : null}
        </h3>

        {post.excerpt ? <p className="blog-rec-excerpt">{post.excerpt}</p> : null}

        {post.keywords?.length ? (
          <ul className="blog-rec-tags">
            {post.keywords.slice(0, variant === 'grid' ? 3 : 2).map((keyword) => (
              <li key={keyword}>
                <span className="blog-tag">{keyword}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Counts, not controls: the interactive versions live on the post itself.
            Marked up as plain text with a visible label for assistive tech. */}
        <ul className="blog-rec-stats">
          <li>
            <BlogIcon name="favorite" size={16} />
            <span {...placeholderAttrs('post.stats.likes')}>{stats.likes ?? 0}</span>
            <span className="sr-only">likes</span>
          </li>
          <li>
            <BlogIcon name="chat" size={16} />
            <span {...placeholderAttrs('post.stats.comments')}>{stats.comments ?? 0}</span>
            <span className="sr-only">comments</span>
          </li>
          <li>
            <BlogIcon name="share" size={16} />
            <span {...placeholderAttrs('post.stats.shares')}>{stats.shares ?? 0}</span>
            <span className="sr-only">shares</span>
          </li>
        </ul>
      </div>

      {/* `href` wins when the item is not a post — a course lives elsewhere. */}
      <Link
        href={post.href || `/blog/${post.slug}`}
        className="blog-card-hit-area"
        aria-label={`${post.badge ? 'Open' : 'Read'} ${post.title}`}
      />
    </article>
  );
}

export default function BlogPostRecommendations({
  posts = [],
  variant = 'rail',
  title = 'This might interest you',
  headingId,
  cta,
}) {
  if (!posts.length) return null;

  return (
    <section
      className={`blog-post-rail-block blog-recs blog-recs--${variant}`}
      aria-labelledby={headingId}
    >
      <h2 className="blog-post-rail-title" id={headingId}>
        {title}
      </h2>

      <div className="blog-recs-list">
        {posts.map((post) => (
          <Card key={post.id} post={post} variant={variant} />
        ))}
      </div>

      {cta ? (
        <div className="blog-comments-foot">
          {cta.href ? (
            <Link className="blog-comments-all" href={cta.href}>
              {cta.label}
            </Link>
          ) : (
            // No destination exists yet, so it is announced as disabled rather
            // than rendered as a link that goes nowhere.
            <span className="blog-comments-all" role="link" aria-disabled="true">
              {cta.label}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
