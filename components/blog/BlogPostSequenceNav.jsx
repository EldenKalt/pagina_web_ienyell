import Link from 'next/link';

/**
 * Sequence navigation: previous post, position in the sequence, next post.
 *
 * The sequence is a series when the post belongs to one and the archive order
 * when it does not — decided in the data layer, not here, so this component
 * renders whichever it is given.
 *
 * Nothing here says "chapter". The word belongs to the literary side of the site
 * — books have real chapters — and using it for blog posts too would make the
 * two mean different things in different places. A post inside a series is
 * announced as "on this series" instead.
 *
 * The list control beside the counter goes to the archive. The reference shows a
 * menu icon there without saying what it opens; sending a reader to the index of
 * everything is the reading of it that does not invent UI. Filtering it by series
 * needs the series to be a real field first.
 */
export default function BlogPostSequenceNav({ sequence, previousPost, nextPost }) {
  if (!sequence && !previousPost && !nextPost) return null;

  const isSeries = sequence?.scope === 'series';

  return (
    <nav className="blog-post-seq-nav" aria-label="Post navigation">
      {previousPost ? (
        <Link className="blog-post-seq-btn" href={`/blog/${previousPost.slug}`}>
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 8H2M7 3L2 8l5 5" />
          </svg>
          <span>Previous post</span>
          <span className="sr-only">: {previousPost.title}</span>
        </Link>
      ) : (
        <span className="blog-post-seq-btn is-empty" aria-hidden="true" />
      )}

      {sequence ? (
        <Link
          className="blog-post-seq-count"
          href="/blog/archive"
          aria-label={
            isSeries
              ? `Post ${sequence.position} of ${sequence.total} on this series. See all posts`
              : `Post ${sequence.position} of ${sequence.total}. See all posts`
          }
        >
          <span aria-hidden="true">
            {sequence.position}/{sequence.total}
          </span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </Link>
      ) : null}

      {nextPost ? (
        <Link className="blog-post-seq-btn blog-post-seq-btn--next" href={`/blog/${nextPost.slug}`}>
          <span>Next post</span>
          <span className="sr-only">: {nextPost.title}</span>
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 8h13M9 3l5 5-5 5" />
          </svg>
        </Link>
      ) : (
        <span className="blog-post-seq-btn is-empty" aria-hidden="true" />
      )}
    </nav>
  );
}
