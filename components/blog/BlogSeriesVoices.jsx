import { formatBlogDate } from '../../lib/publishing';

/**
 * Featured comments, shown as testimonials at the foot of the series hero.
 *
 * These are comments the owner has marked from the admin — a curation flag, not
 * a popularity score. They are quoted rather than rendered as thread rows: here
 * they are evidence that the series is worth reading, not a conversation to join.
 * That is why there is no like, no reply and no menu on them; the thread on each
 * post is where those belong.
 */
export default function BlogSeriesVoices({ comments = [] }) {
  if (!comments.length) return null;

  return (
    <section className="blog-series-voices" aria-labelledby="blog-series-voices-title">
      <h2 className="section-label" id="blog-series-voices-title">
        What readers said
      </h2>

      <ul className="blog-series-voices-list">
        {comments.map((comment) => {
          const author = comment.author || {};

          return (
            <li key={comment.id}>
              <figure className="blog-voice">
                <blockquote className="blog-voice-quote">
                  <p>{comment.body}</p>
                </blockquote>

                <figcaption className="blog-voice-by">
                  {author.avatarUrl ? (
                    <img className="blog-comment-avatar" src={author.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="blog-comment-avatar blog-comment-avatar--fallback" aria-hidden="true">
                      {(author.name || '?').trim().charAt(0)}
                    </span>
                  )}
                  <span className="blog-voice-who">
                    <span className="blog-comment-name">{author.name || 'Reader'}</span>
                    {comment.publishedAt ? (
                      <time className="blog-comment-date" dateTime={comment.publishedAt}>
                        {formatBlogDate(comment.publishedAt)}
                      </time>
                    ) : null}
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      {/* (Dynamic content: comments flagged as featured from the admin) */}
    </section>
  );
}
