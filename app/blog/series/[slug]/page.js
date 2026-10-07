'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import BlogPostGrid from '../../../../components/blog/BlogPostGrid';
import BlogSeriesHero from '../../../../components/blog/BlogSeriesHero';
import { fetchBlogApi } from '../../../../lib/blogApi';
import { getFeaturedComments } from '../../../../data/blogPlaceholderComments';

/**
 * A series index: a hero that argues for the series, then its posts in reading
 * order.
 *
 * There is no Figma frame for this page, so it invents as little as possible —
 * the hero is built from the landing's own components and the list below is the
 * archive's, with one difference: order. The archive runs newest first; a series
 * runs oldest first, because chapter 1 is read before chapter 6, and that is the
 * order the sequence navigation at the foot of each post walks.
 *
 * Client-rendered with useParams, the same pattern app/blog/[slug]/page.js uses.
 */
export default function BlogSeriesPage() {
  const { slug } = useParams();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    fetchBlogApi(`/api/blog/series/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(({ series: found }) => setSeries({ ...found, featuredComments: getFeaturedComments(3) }))
      .catch((loadError) => {
        if (loadError.name === 'AbortError') return;
        if (loadError.status !== 404) setError(true);
        setSeries(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <main className="blog-list-page">
        <div className="blog-loading" role="status" aria-live="polite">
          <span className="blog-loading-spinner" />
          Loading series…
        </div>
      </main>
    );
  }

  if (!series) {
    return (
      <main className="blog-list-page">
        <header className="blog-archive-heading">
          <p className="blog-list-eyebrow">Blog · Series</p>
          <h1 className="blog-archive-title">Series</h1>
        </header>
        <div className="blog-empty">
          {error ? 'The series could not be loaded. Please try again later.' : 'This series is not available.'}
        </div>
        <p className="blog-series-back">
          <Link href="/blog/archive">Browse the whole archive</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="blog-list-page blog-series-page">
      <BlogSeriesHero series={series} />

      <section className="blog-series-chapters" aria-labelledby="blog-series-chapters-title">
        <div className="blog-section-head">
          <h2 id="blog-series-chapters-title">Every post in this series</h2>
        </div>

        <p className="blog-filter-summary">
          {series.posts.length} {series.posts.length === 1 ? 'post' : 'posts'}, in
          reading order
          {/* This page is the series' front door and lists it in reading order.
              A reader who wants to search inside the series, or page through it,
              wants the archive scoped to it. */}
          {series.posts.length > 1 ? (
            <>
              {' · '}
              <Link href={`/blog/archive?series=${encodeURIComponent(series.name)}`}>
                Search within this series
              </Link>
            </>
          ) : null}
        </p>

        <BlogPostGrid
          posts={series.posts}
          layout="rows"
          headingLevel={3}
          showExcerpt
          categoryLabel={series.category}
          emptyMessage="No posts in this series yet."
        />
      </section>

      <p className="blog-series-back">
        <Link href="/blog/archive">Browse the whole archive</Link>
      </p>
    </main>
  );
}
