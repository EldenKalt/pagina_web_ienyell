import NewsletterForm from './NewsletterForm';
import BlogFeaturedStack from './BlogFeaturedStack';

/**
 * Dark newsletter band on the landing. Wraps NewsletterForm, which holds all the
 * logic and states; this component is layout and tone only.
 */
export default function NewsletterBand({
  title = 'Join the community — get updates and tips',
  body = 'Sign up for article updates from Enyell. Confirm your email to join the list.',
  posts = [],
}) {
  return (
    <section className="newsletter-band" aria-labelledby="newsletter-band-title">
      <div className="newsletter-band-copy">
        <h2 id="newsletter-band-title">{title}</h2>
        <p>{body}</p>
        <NewsletterForm variant="band" />
      </div>

      <BlogFeaturedStack posts={posts} variant="band" />
    </section>
  );
}
