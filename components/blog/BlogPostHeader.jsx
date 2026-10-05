'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { formatBlogDate } from '../../lib/publishing';
import {
  usePretextLayout,
  usePretextOverflowCheck,
} from '../../hooks/usePretextLayout';
import BlogPostActions from './BlogPostActions';

/**
 * Post header: title, lede, byline row and the action bar.
 *
 * Presentational — it receives `post` and renders it, it does not fetch.
 *
 * Pretext earns its place twice here:
 *   - the title is the largest type on the site, so a long one can run to five or
 *     six lines. Measuring the line count lets the tight variant kick in from the
 *     real wrap instead of from a character-count guess.
 *   - "Be my patreon" is a fixed label in a pill that must not wrap; the overflow
 *     check warns in development if it ever does.
 */

export default function BlogPostHeader({
  post,
  stats,
  onOpenComments,
  saved,
  onToggleSave,
  saveBusy,
  liked,
  onToggleLike,
  likeBusy,
  onShare,
  shareBusy,
  highlightsHidden,
  onToggleHighlights,
}) {
  const titleRef = useRef(null);
  const patreonRef = useRef(null);

  const title = post?.title || '';

  // Inter is what fontsReady() preloads by default, which is the font this header
  // paints with — no explicit specs needed. The serif body does need them; see
  // BlogPostBody.
  const { lineCount } = usePretextLayout(title, { ref: titleRef });
  usePretextOverflowCheck('Be my patreon', {
    ref: patreonRef,
    maxLines: 1,
    label: 'Be my patreon (post header)',
  });

  const isLongTitle = (lineCount || 0) > 3;
  const author = post?.author || {};
  const updatedAt = post?.updatedAt || post?.publishedAt;

  return (
    <header className="blog-post-header">
      <h1
        ref={titleRef}
        className={`blog-post-title${isLongTitle ? ' is-long' : ''}`}
      >
        {title}
      </h1>

      {post?.excerpt ? (
        <p className="blog-post-lede">{post.excerpt}</p>
      ) : null}
      {/* (Dynamic content: post.excerpt — the one-paragraph summary of the topic) */}

      <div className="blog-post-byline">
        {author.avatarUrl ? (
          <img className="blog-post-avatar" src={author.avatarUrl} alt="" loading="lazy" />
        ) : null}

        <p>
          <span className="blog-post-author">
            Written by {author.name || 'ienyell'}
          </span>
          {author.pronouns ? (
            <span className="blog-post-pronouns">{author.pronouns}</span>
          ) : null}
        </p>

        {/* A link, not a button: it navigates off-site. */}
        {author.patreonUrl?.startsWith('https://') && <Link
          ref={patreonRef}
          className="blog-post-patreon"
          href={author.patreonUrl}
        >
          Be my patreon
        </Link>}

        <p className="blog-post-byline-meta">
          {post?.readingTime ? <span>{post.readingTime} min read</span> : null}
          {updatedAt ? (
            <span>
              Last updated <time dateTime={updatedAt}>{formatBlogDate(updatedAt)}</time>
            </span>
          ) : null}
        </p>
      </div>

      {/* Every piece of state the bar shows is owned by the page, because this
          bar and the one below the article are the same bar twice. The header
          used to swallow these props, which left the bookmark up here inert and
          out of step with the tools panel. */}
      <BlogPostActions
        stats={stats || post?.stats}
        onOpenComments={onOpenComments}
        saved={saved}
        onToggleSave={onToggleSave}
        saveBusy={saveBusy}
        liked={liked}
        onToggleLike={onToggleLike}
        likeBusy={likeBusy}
        onShare={onShare}
        shareBusy={shareBusy}
        highlightsHidden={highlightsHidden}
        onToggleHighlights={onToggleHighlights}
      />
    </header>
  );
}
