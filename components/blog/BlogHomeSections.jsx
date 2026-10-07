'use client';

import { useEffect, useState } from 'react';
import BlogHero from './BlogHero';
import BlogSearch from './BlogSearch';
import BlogRecentSection from './BlogRecentSection';
import BlogTopicNav from './BlogTopicNav';
import BlogGridSection from './BlogGridSection';
import NewsletterBand from './NewsletterBand';
import BlogAboutSection from './BlogAboutSection';
import BlogFollowStrip from './BlogFollowStrip';
import BlogArchiveCta from './BlogArchiveCta';
import BlogPostGrid from './BlogPostGrid';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { searchPosts, toPosts } from '../../lib/blogSearch';

/**
 * Owns the landing's search state. The page above stays a server component and hands
 * the posts down as props, so /blog still prerenders.
 *
 * With an active query the curated sections give way to a single result list; the
 * hero stays put so the search field never moves under the user.
 */
export default function BlogHomeSections({ posts = [], topics = [], loadError = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debouncedQuery = useDebouncedValue(query, 250);
  const isSearching = Boolean(query.trim());

  useEffect(() => {
    let cancelled = false;

    if (!debouncedQuery.trim()) {
      setResults([]);
      return undefined;
    }

    // searchPosts is async so a future semantic strategy — a network call — can drop
    // in without changing anything here.
    searchPosts(posts, debouncedQuery).then((found) => {
      if (!cancelled) setResults(toPosts(found));
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, posts]);

  // Non-overlapping slices: Recent takes 4, then each grid takes 6, which is why the
  // mock holds 16 posts. The hero and band stacks deliberately re-show highlights.
  const recentPosts = posts.slice(0, 4);
  const featuredPosts = posts.slice(4, 10);
  const popularPosts = posts.slice(10, 16);
  const heroPosts = posts.slice(0, 3);
  const bandPosts = posts.slice(4, 7);

  return (
    <main className="blog-home">
      {loadError ? <p className="blog-public-error" role="alert">{loadError}</p> : null}
      <BlogHero featuredPosts={heroPosts}>
        <BlogSearch
          value={query}
          onChange={setQuery}
          resultCount={isSearching ? results.length : null}
        />
      </BlogHero>

      {isSearching ? (
        <section className="blog-results" aria-label="Search results">
          {results.length ? (
            <BlogPostGrid posts={results} layout="rows" headingLevel={2} showExcerpt />
          ) : (
            <div className="blog-empty">
              <p>No results for &ldquo;{query.trim()}&rdquo;</p>
              <button type="button" className="blog-btn" onClick={() => setQuery('')}>
                Clear search
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <BlogRecentSection posts={recentPosts} />
          <BlogTopicNav topics={topics} />
          <BlogGridSection id="blog-featured" title="Featured Blogs" posts={featuredPosts} />
          <NewsletterBand posts={bandPosts} />
          <BlogGridSection id="blog-popular" title="Popular Blogs" posts={popularPosts} />
          <BlogAboutSection />
          <BlogFollowStrip />
          <BlogArchiveCta />
        </>
      )}
    </main>
  );
}
