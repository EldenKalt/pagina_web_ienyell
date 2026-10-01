import Link from 'next/link';
import { slugifyCmsValue } from '../../lib/publishing';

/**
 * "About this post" — the first block of the editorial rail.
 *
 * It carries the context that does not belong in the header: what the post is for,
 * the series it belongs to, and its categories. The category chips reuse the
 * `.blog-tag` class the landing and archive already use, and link to the filtered
 * archive exactly like the chips there do.
 */
export default function BlogPostAbout({ post }) {
  const keywords = post?.keywords || [];
  const seriesName = post?.seriesName;

  return (
    <section className="blog-post-rail-block">
      <h2 className="blog-post-rail-title">About this post</h2>

      <p className="blog-post-rail-text">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi,
        aliquam in hendrerit urna.
      </p>
      {/* (Future content: one short paragraph framing what the reader gets from
          this post — expected dynamic field, a summary written for the rail) */}

      {seriesName ? (
        <p className="blog-post-rail-text">
          {/* The series name is where a reader looks for the series, so it is
              the link to it — not just a label with the real way in buried in
              the tools panel. */}
          This post is part of the series:{' '}
          <Link
            className="blog-post-rail-series"
            href={`/blog/series/${slugifyCmsValue(seriesName, 'series')}`}
          >
            {seriesName}
          </Link>
        </p>
      ) : null}
      {/* (Dynamic content: post.seriesName — the row disappears when a post
          belongs to no series) */}

      {keywords.length ? (
        <>
          <p className="blog-post-rail-label">Categories</p>
          <ul className="blog-post-rail-tags">
            {keywords.map((keyword) => (
              <li key={keyword}>
                <Link
                  className="blog-tag"
                  href={`/blog/archive?topic=${encodeURIComponent(keyword)}`}
                >
                  {keyword}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {/* (Dynamic metadata: post.keywords[]) */}
    </section>
  );
}
