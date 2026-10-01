'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApiBase } from '../../../lib/authHelper';
import BlogPostGrid from '../../../components/blog/BlogPostGrid';
import BlogPagination from '../../../components/blog/BlogPagination';
import BlogSearch from '../../../components/blog/BlogSearch';
import BlogTopicNav from '../../../components/blog/BlogTopicNav';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { searchPosts, toPosts, filterByTopic } from '../../../lib/blogSearch';
import {
  BLOG_USE_PLACEHOLDER_DATA,
  getPlaceholderPosts,
  getPlaceholderTopics,
} from '../../../data/blogPlaceholderPosts';

const POSTS_PER_PAGE = 6;

function BlogArchiveContent() {
  const searchParams = useSearchParams();
  // The URL is the source of truth for the topic: a reader arrives here by clicking a
  // category chip, so the filter has to survive a share or a reload. Clearing and
  // switching are plain links back to this route, which keeps URL and UI in sync.
  const topic = searchParams.get('topic') || '';

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const debouncedQuery = useDebouncedValue(query, 250);
  const isSearching = Boolean(debouncedQuery.trim());
  const topics = getPlaceholderTopics();

  // Either narrowing invalidates the current page — page 3 of the unfiltered list is
  // meaningless once the list is filtered.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, topic]);

  useEffect(() => {
    let cancelled = false;

    // UI phase: read from the local placeholder posts. Remove this branch — and the
    // BLOG_USE_PLACEHOLDER_DATA import — when reconnecting to the live API.
    if (BLOG_USE_PLACEHOLDER_DATA) {
      setError('');
      setLoading(false);

      // Topic narrows first, then the search runs inside that subset, so the two
      // filters compose instead of overriding each other.
      const scoped = filterByTopic(getPlaceholderPosts(), topic);

      const apply = (list) => {
        if (cancelled) return;
        const pages = Math.max(1, Math.ceil(list.length / POSTS_PER_PAGE));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * POSTS_PER_PAGE;

        setPosts(list.slice(start, start + POSTS_PER_PAGE));
        setTotalPages(pages);
        setTotalResults(list.length);
      };

      if (isSearching) {
        searchPosts(scoped, debouncedQuery).then((found) => apply(toPosts(found)));
      } else {
        apply(scoped);
      }

      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();

    const loadPosts = async () => {
      try {
        setLoading(true);
        setError('');

        const apiBase = getApiBase();

        if (!apiBase) {
          throw new Error('NEXT_PUBLIC_API_URL is not configured.');
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: String(POSTS_PER_PAGE),
        });
        if (isSearching) params.set('search', debouncedQuery.trim());
        if (topic) params.set('topic', topic);

        const response = await fetch(`${apiBase}/api/blog?${params}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('The articles could not be loaded.');
        }

        const data = await response.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setTotalPages(Number(data.totalPages || 1));
        setTotalResults(Number(data.total || 0));
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
  }, [page, debouncedQuery, isSearching, topic]);

  const emptyMessage = isSearching
    ? `No results for "${debouncedQuery.trim()}"${topic ? ` in ${topic}` : ''}`
    : topic
      ? `No articles in ${topic} yet.`
      : 'No articles published yet.';

  return (
    <main className="blog-list-page">
      <header className="blog-archive-heading">
        <p className="blog-list-eyebrow">{topic ? 'Blog · Category' : 'Blog'}</p>
        <h1 className="blog-archive-title">{topic || 'Archive'}</h1>
        <p className="blog-archive-subtitle">
          {topic
            ? `Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.`
            : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.'}
          {/* (Future content: one line describing the category, or the full index) */}
        </p>

        <BlogSearch
          value={query}
          onChange={setQuery}
          resultCount={isSearching ? totalResults : null}
          variant="wide"
          placeholder={topic ? `Search in ${topic}…` : 'Search articles…'}
        />
      </header>

      <BlogTopicNav
        topics={topics}
        activeTopic={topic}
        variant="compact"
        showAll
      />

      {topic && !loading && !error ? (
        <p className="blog-filter-summary" aria-live="polite">
          {totalResults} {totalResults === 1 ? 'article' : 'articles'} in{' '}
          <strong>{topic}</strong>
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
