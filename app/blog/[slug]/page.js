'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { buildOutline } from '../../../lib/blogOutline';
import { slugifyCmsValue } from '../../../lib/publishing';
import { getApiBase } from '../../../lib/authHelper';
import BlogPostSequenceNav from '../../../components/blog/BlogPostSequenceNav';
import BlogPostActions from '../../../components/blog/BlogPostActions';
import BlogPostAuthor from '../../../components/blog/BlogPostAuthor';
import BlogPostComments from '../../../components/blog/BlogPostComments';
import BlogCommentsPanel from '../../../components/blog/BlogCommentsPanel';
import BlogHighlightPanel from '../../../components/blog/BlogHighlightPanel';
import BlogNotesPanel from '../../../components/blog/BlogNotesPanel';
import BlogPostHeader from '../../../components/blog/BlogPostHeader';
import BlogPostRail from '../../../components/blog/BlogPostRail';
import BlogPostRelated from '../../../components/blog/BlogPostRelated';
import BlogPostCourses from '../../../components/blog/BlogPostCourses';
import BlogPostTools from '../../../components/blog/BlogPostTools';
import BlogPostBody from '../../../components/blog/BlogPostBody';
import NewsletterForm from '../../../components/blog/NewsletterForm';
import {
  BLOG_USE_PLACEHOLDER_DATA,
  getPlaceholderPostBySlug,
} from '../../../data/blogPlaceholderPosts';
import { getPlaceholderCommentCount } from '../../../data/blogPlaceholderComments';
import { getPlaceholderCourses } from '../../../data/blogPlaceholderCourses';

function sanitizeHtml(html) {
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
  });
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The comments panel is opened from the action bar, which renders twice — above
  // and below the article — so the state has to sit above both of them.
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentTotal = getPlaceholderCommentCount();
  // The fragment whose reactions panel is open, or null. Opened today from a
  // comment's quoted fragment; the annotation layer will also open it from a
  // highlight painted in the article itself.
  const [highlightFragment, setHighlightFragment] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  // One bookmark shown in two places — the action bar and the tools panel — so
  // the state sits above both. Not persisted: there is no bookmarks endpoint.
  const [saved, setSaved] = useState(false);
  // Hiding the inline highlights is a reading preference the action bar offers
  // from its "..." menu. It sits here for the same reason `saved` does: the bar
  // renders twice and the two copies must not disagree. NOT WIRED — the
  // annotation layer that would read it has not been built.
  const [highlightsHidden, setHighlightsHidden] = useState(false);

  const relatedPosts = Array.isArray(post?.relatedPosts) ? post.relatedPosts : [];
  const previousPost = post?.previousPost || null;
  const nextPost = post?.nextPost || null;
  // Sanitised once per post: the body is injected, the outline is read from the
  // same string, and the chapter index links to the ids stamped from it. Both must
  // come from the SAME html or their positions drift apart.
  const safeHtml = useMemo(() => sanitizeHtml(post?.content), [post?.content]);
  const outline = useMemo(() => buildOutline(safeHtml), [safeHtml]);

  useEffect(() => {
    if (!slug) return undefined;

    // UI phase: read from the local placeholder posts. Remove this branch — and the
    // BLOG_USE_PLACEHOLDER_DATA import — when reconnecting to the live API.
    if (BLOG_USE_PLACEHOLDER_DATA) {
      const placeholder = getPlaceholderPostBySlug(slug);
      setPost(placeholder);
      setError(placeholder ? '' : 'This article is not available.');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadPost = async () => {
      try {
        setPost(null);
        setError('');
        setLoading(true);

        const apiBase = getApiBase();

        if (!apiBase) {
          throw new Error('NEXT_PUBLIC_API_URL is not configured.');
        }

        const response = await fetch(`${apiBase}/api/blog/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const requestError = new Error(
            response.status === 404
              ? 'This article is not available.'
              : 'Could not load the article.',
          );
          requestError.status = response.status;
          throw requestError;
        }

        const data = await response.json();
        setPost(data);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(
            loadError.status === 404
              ? 'This article is not available.'
              : loadError.message || 'Could not load the article.',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadPost();

    return () => controller.abort();
  }, [slug]);

  return (
    <main className="blog-post-page">
      <Link href="/blog" className="blog-back-link">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to blog
      </Link>

      {loading ? (
        <div className="blog-loading" role="status" aria-live="polite">
          <span className="blog-loading-spinner" />
          Loading article…
        </div>
      ) : null}

      {!loading && error ? <div className="blog-public-error" role="alert">{error}</div> : null}

      {!loading && post ? (
        <article className="blog-post-article">
          <div className="blog-post-detail-layout has-rail">
            <BlogPostHeader
              post={post}
              stats={{ ...post.stats, comments: commentTotal }}
              onOpenComments={() => setCommentsOpen(true)}
              saved={saved}
              onToggleSave={() => setSaved((v) => !v)}
              highlightsHidden={highlightsHidden}
              onToggleHighlights={() => setHighlightsHidden((v) => !v)}
            />

            <BlogPostRail post={post} outline={outline} />

            <div className="blog-post-main">
              {/* The cover opens the article itself, in the reading column —
                  not a full-width band above both columns. */}
              {post.coverUrl ? (
                <img className="blog-post-cover" src={post.coverUrl} alt={post.title} />
              ) : null}

              <BlogPostBody html={safeHtml} outline={outline} />

              {/* Chapter navigation replaces the older prev / back / next row:
                  the reference puts one control here, and two sets of previous
                  and next links on the same page would compete. */}
              <BlogPostSequenceNav
                sequence={post.sequence}
                previousPost={previousPost}
                nextPost={nextPost}
              />

              {/* The action bar repeats under the article, as in the reference —
                  a reader who has finished should not have to scroll back up to
                  react to it. */}
              <BlogPostActions
                stats={{ ...post.stats, comments: commentTotal }}
                onOpenComments={() => setCommentsOpen(true)}
                saved={saved}
                onToggleSave={() => setSaved((v) => !v)}
                highlightsHidden={highlightsHidden}
                onToggleHighlights={() => setHighlightsHidden((v) => !v)}
              />

              <BlogPostAuthor author={post.author} />

              <BlogPostComments
                slug={slug}
                total={commentTotal}
                onOpenHighlight={setHighlightFragment}
              />

              <div className="blog-post-newsletter">
                <h2>Get new articles by email</h2>
                <NewsletterForm variant="inline" />
              </div>
            </div>

            <BlogPostRelated recommendations={relatedPosts} />

            <BlogPostCourses courses={getPlaceholderCourses()} />

            <BlogCommentsPanel
              open={commentsOpen}
              onClose={() => setCommentsOpen(false)}
              slug={slug}
              total={commentTotal}
            />

            <BlogHighlightPanel
              open={Boolean(highlightFragment)}
              onClose={() => setHighlightFragment(null)}
              slug={slug}
              fragment={highlightFragment}
            />

            <BlogNotesPanel
              open={notesOpen}
              onClose={() => setNotesOpen(false)}
              slug={slug}
            />

            <BlogPostTools
              stats={{ ...post.stats, comments: commentTotal }}
              sequence={post.sequence}
              seriesHref={
                post.sequence?.seriesName
                  ? `/blog/series/${slugifyCmsValue(post.sequence.seriesName, 'series')}`
                  : null
              }
              saved={saved}
              onToggleSave={() => setSaved((v) => !v)}
              onAddNote={() => setNotesOpen(true)}
              onReadNotes={() => setNotesOpen(true)}
              onOpenComments={() => setCommentsOpen(true)}
            />
          </div>
        </article>
      ) : null}
    </main>
  );
}
