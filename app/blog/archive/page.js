'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchBlogApi } from '../../../lib/blogApi';
import BlogPostGrid from '../../../components/blog/BlogPostGrid';
import BlogPagination from '../../../components/blog/BlogPagination';
import BlogSearch from '../../../components/blog/BlogSearch';
import BlogTopicNav from '../../../components/blog/BlogTopicNav';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { searchPosts, toPosts } from '../../../lib/blogSearch';
import { slugifyCmsValue } from '../../../lib/publishing';

const POSTS_PER_PAGE = 6;

function BlogArchiveContent() {
  const searchParams = useSearchParams();
  // The URL is the source of truth for the topic: a reader arrives here by clicking a
  // category chip, so the filter has to survive a share or a reload. Clearing and
  // switching are plain links back to this route, which keeps URL and UI in sync.
  const topic = searchParams.get('topic') || '';
  // A series narrows the archive the same way a category does, and for the same
  // reason it lives in the URL: a reader arrives here from the series itself and
  // the filter has to survive a share or a reload.
  //
  // It does NOT replace /blog/series/[slug]. That page is the series' front
  // door — its opening post, what it is for, who it is for, the voices. This is
  // the plain list, with search inside it and pagination, and it links back to
  // that page rather than pretending to be it.
  const series = searchParams.get('series') || '';

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const debouncedQuery = useDebouncedValue(query, 250);
  const isSearching = Boolean(debouncedQuery.trim());
  const [topics, setTopics] = useState([]);

  // Either narrowing invalidates the current page — page 3 of the unfiltered list is
  // meaningless once the list is filtered.
  useEffect(() => {
    const controller = new AbortController();
    fetchBlogApi('/api/blog/topics', { signal: controller.signal })
      .then((data) => setTopics(Array.isArray(data.topics) ? data.topics : []))
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError('The topics could not be loaded.');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, topic, series]);

  useEffect(() => {
    const controller = new AbortController();

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams({
          page: String(page),
          limit: String(POSTS_PER_PAGE),
        });
        if (isSearching) params.set('search', debouncedQuery.trim());
        if (topic) params.set('topic', topic);
        if (series) params.set('series', series);

        const data = await fetchBlogApi(`/api/blog?${params}`, {
          signal: controller.signal,
        });
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setTotalPages(Number(data.totalPages || 1));
        setTotalResults(Number(data.total || 0));
        setPage((current) => Math.min(current, Number(data.totalPages || 1)));
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'The articles could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadPosts();

    return () => controller.abort();
  }, [page, debouncedQuery, isSearching, topic, series]);

  // What the reader is looking at, named once and reused by the heading, the
  // search placeholder, the summary and the empty state — four places that were
  // drifting apart already with two filters and would not survive three.
  const scopeLabel = series || topic || '';
  const scopeIn = [series, topic].filter(Boolean).join(' · ');

  const emptyMessage = isSearching
    ? `No results for "${debouncedQuery.trim()}"${scopeIn ? ` in ${scopeIn}` : ''}`
    : scopeIn
      ? `No articles in ${scopeIn} yet.`
      : 'No articles published yet.';

  return (
    <main className="blog-list-page">
      <header className="blog-archive-heading">
        <p className="blog-list-eyebrow">
          {series ? 'Blog · Series' : topic ? 'Blog · Category' : 'Blog'}
        </p>
        <h1 className="blog-archive-title">{scopeLabel || 'Archive'}</h1>
        <p className="blog-archive-subtitle">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.
          {/* (Future content: one line describing the series, the category, or
              the archive as a whole) */}
        </p>

        {/* The richer view of a series is its own page; this list does not try to
            stand in for it. */}
        {series ? (
          <p className="blog-archive-series-link">
            <Link href={`/blog/series/${slugifyCmsValue(series, 'series')}`}>
              Go to the series page
            </Link>
          </p>
        ) : null}

        <BlogSearch
          value={query}
          onChange={setQuery}
          resultCount={isSearching ? totalResults : null}
          variant="wide"
          placeholder={scopeLabel ? `Search in ${scopeLabel}…` : 'Search articles…'}
        />
      </header>

      <BlogTopicNav
        topics={topics}
        activeTopic={topic}
        variant="compact"
        showAll
        // Keeps the series when switching or clearing the category: "All" means
        // all categories, not all of the blog.
        preserve={{ series }}
      />

      {scopeIn && !loading && !error ? (
        <p className="blog-filter-summary" aria-live="polite">
          {totalResults} {totalResults === 1 ? 'article' : 'articles'} in{' '}
          <strong>{scopeIn}</strong>
        </p>
      ) : null}

      {error ? <div className="blog-public-error" role="alert">{error}</div> : null}

      {error && !loading ? null : (
        <BlogPostGrid
          posts={posts}
          loading={loading}
          skeletonCount={POSTS_PER_PAGE}
          layout="rows"
          headingLevel={2}
          showExcerpt
          categoryLabel={topic || undefined}
          emptyMessage={emptyMessage}
        />
      )}

      {!loading ? (
        <BlogPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : null}
    </main>
  );
}

/**
 * useSearchParams() opts the tree into client-side rendering, so it must sit inside a
 * Suspense boundary — the same pattern app/work/page.js uses for its `?category=`.
 */
export default function BlogArchivePage() {
  return (
    <Suspense fallback={<main className="blog-list-page" />}>
      <BlogArchiveContent />
    </Suspense>
  );
}
