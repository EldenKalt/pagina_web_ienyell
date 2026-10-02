import Link from 'next/link';
import BlogIcon from '../blog/BlogIcon';

/**
 * Products the reader wants later.
 *
 * Its own cards rather than the blog's: a wishlist entry carries a price and an
 * availability, which a post card has no place for, and reusing the post card
 * would have meant adding two fields to it that only this page uses.
 *
 * An unavailable item is still shown. Removing it silently would lose something
 * the reader chose to keep, and they are the ones who should decide to drop it;
 * it simply says so and does not link anywhere.
 *
 * PRIVATE. This section is never part of the public view — what someone wants to
 * buy is nobody else's business.
 */
export default function ProfileWishlist({ items = [] }) {
  if (!items.length) return null;

  return (
    <ul className="profile-wishlist">
      {items.map((item) => (
        <li key={item.id}>
          <article className={`profile-wish${item.available ? '' : ' is-unavailable'}`}>
            <div className="profile-wish-cover">
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" loading="lazy" />
              ) : (
                <div className="blog-cover-placeholder">
                  <BlogIcon name="cover" size={28} strokeWidth={1.5} />
                </div>
              )}
            </div>

            <div className="profile-wish-body">
              <h3 className="profile-wish-title">{item.title}</h3>
              {/* (Dynamic content: product.title) */}

              <p className="profile-wish-price">
                {item.price}
                {/* (Dynamic metadata: product.price) */}
                {item.available ? null : (
                  <span className="profile-wish-state"> · Not available right now</span>
                )}
              </p>
            </div>

            {item.available && item.href && item.href !== '#' ? (
              <Link className="blog-card-hit-area" href={item.href} aria-label={item.title} />
            ) : null}
            {/* No destination, no hit area — the product pages do not exist yet. */}
          </article>
        </li>
      ))}
    </ul>
  );
}
