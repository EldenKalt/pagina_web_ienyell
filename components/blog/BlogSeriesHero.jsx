'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBlogSignIn } from './BlogSignInPrompt';
import { useAuth } from '../../context/AuthContext';
import SidePanel from '../SidePanel';
import NewsletterForm from './NewsletterForm';
import BlogLeadPost from './BlogLeadPost';
import BlogGridSection from './BlogGridSection';
import BlogSeriesVoices from './BlogSeriesVoices';
import BlogIcon from './BlogIcon';

/**
 * The series hero: everything a reader needs to decide whether this series is
 * for them, before the chapter list below it.
 *
 * There is no Figma frame for this page, so every piece here is an existing
 * component of the blog's design system rather than a new invention — the
 * landing's featured post, its grid section, its newsletter form, the archive's
 * tag chips. The only new parts are the ones with nothing to reuse: the
 * series facts list and the testimonials.
 *
 * The newsletter opens in a SidePanel rather than sitting inline. A subscription
 * form is a decision, not something to scroll past, and the hero already asks a
 * lot of one screen.
 *
 * Following the series is NOT PERSISTED — there is no notifications endpoint.
 */
export default function BlogSeriesHero({ series }) {
  const { user, isLoading } = useAuth();
  const requestSignIn = useBlogSignIn();
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  if (!series) return null;

  const locked = !isLoading && !user;

  const toggleFollow = () => {
    if (locked) {
      requestSignIn();
      return;
    }
    setFollowing((value) => !value);
  };

  return (
    <div className="blog-series-hero">
      <header className="blog-archive-heading">
        <p className="blog-list-eyebrow">Blog · Series</p>
        <h1 className="blog-archive-title">{series.name}</h1>
      </header>

      {series.introPost ? (
        <section className="blog-series-intro" aria-labelledby="blog-series-intro-title">
          <p className="section-label" id="blog-series-intro-title">Start here</p>
          <BlogLeadPost post={series.introPost} headingLevel={2} ctaLabel="Read the opening post" />
        </section>
      ) : null}

      <div className="blog-series-facts">
        {series.summary ? (
          <p className="blog-series-summary">{series.summary}</p>
        ) : null}
        {/* (Dynamic content: series.summary) */}

        <dl className="blog-series-meta">
          {series.category ? (
            <div>
              <dt>Category</dt>
              <dd>
                <Link
                  className="blog-tag"
                  href={`/blog/archive?topic=${encodeURIComponent(series.category)}`}
                >
                  {series.category}
                </Link>
              </dd>
            </div>
          ) : null}
          {series.goal ? (
            <div>
              <dt>What it is for</dt>
              <dd>{series.goal}</dd>
            </div>
          ) : null}
          {series.audience ? (
            <div>
              <dt>Who it is for</dt>
              <dd>{series.audience}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {series.featuredPosts?.length ? (
        <BlogGridSection
          id="blog-series-featured"
          title="Highlights from the series"
          posts={series.featuredPosts}
          viewAllHref={null}
        />
      ) : null}

      <BlogSeriesVoices comments={series.featuredComments || []} />

      <div className="blog-series-actions">
        <button
          type="button"
          className="blog-btn blog-series-subscribe"
          onClick={() => setNewsletterOpen(true)}
          aria-haspopup="dialog"
        >
          Subscribe to the newsletter
        </button>

        <button
          type="button"
          className={`blog-post-interest${following ? ' is-followed' : ''}`}
          onClick={toggleFollow}
          aria-pressed={locked ? undefined : following}
        >
          {following ? 'Following this series' : 'Notify me of new posts'}
          <span className="blog-post-interest-icon" aria-hidden="true">
            <BlogIcon name={following ? 'check' : 'add'} size={20} />
          </span>
        </button>
      </div>

      <SidePanel
        open={newsletterOpen}
        onClose={() => setNewsletterOpen(false)}
        titleId="blog-series-newsletter-title"
        title="Get new articles by email"
        description="You'll get an email when a new post in this series goes live. Unsubscribe anytime."
      >
        <NewsletterForm variant="inline" />
      </SidePanel>
    </div>
  );
}
