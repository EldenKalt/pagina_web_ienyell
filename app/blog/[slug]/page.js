import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogPostView from '../../../components/blog/BlogPostView';
import { sanitizeArticleHtml } from '../../../lib/articleHtml';
import {
  BLOG_USE_PLACEHOLDER_DATA,
  getPlaceholderPostBySlug,
} from '../../../data/blogPlaceholderPosts';

/**
 * The post page, as a server component.
 *
 * It used to be a client component that fetched the post in an effect, which
 * meant the article was never in the HTML the server sent: a reader saw a
 * spinner, and a crawler saw nothing at all. The post is resolved here now and
 * the body is sanitised once, on the server, so it ships in the initial
 * response. Everything a reader can touch lives in BlogPostView, which is still
 * a client component — it simply receives its data rather than going for it.
 *
 * SANITISING ONCE IS NOT AN OPTIMISATION, it is a correctness requirement.
 * Sanitising again on the client would produce a second version of the markup
 * and React would tear the two apart as a hydration mismatch. See
 * lib/articleHtml.js, which also holds the contract for the day the content
 * stops being the author's own.
 *
 * TODO, with the same shape as app/blog/page.js: replace getPlaceholderPostBySlug
 * with the live read (GET /api/blog/:slug) and drop the BLOG_USE_PLACEHOLDER_DATA
 * branch. The fetch moves here, which means the session cookie has to be
 * forwarded for anything reader-specific; the article itself is public.
 */

async function readPost(slug) {
  if (BLOG_USE_PLACEHOLDER_DATA) return getPlaceholderPostBySlug(slug) || null;

  // Deliberately unimplemented rather than half-implemented: a server fetch
  // needs its own cache policy and cookie forwarding, and guessing at those
  // would be worse than the explicit failure.
  throw new Error(
    'The post page has no live read yet. Wire GET /api/blog/:slug here, or keep ' +
      'BLOG_USE_PLACEHOLDER_DATA on.',
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await readPost(slug);

  if (!post) return { title: 'Article not found' };

  // The excerpt is written as a card summary, which is the same job a meta
  // description does, so it is reused rather than invented.
  const description = post.excerpt || undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${slug}`,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: post.author?.name ? [post.author.name] : undefined,
      tags: post.keywords || undefined,
      images: post.coverUrl ? [{ url: post.coverUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: post.coverUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await readPost(slug);

  // A missing post is a 404, not an error message inside a page that otherwise
  // looks fine. The old client version could only render its own message.
  if (!post) notFound();

  const safeHtml = sanitizeArticleHtml(post.content);

  return (
    <main className="blog-post-page">
      <Link href="/blog" className="blog-back-link">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="M10 3L5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to blog
      </Link>

      <BlogPostView post={post} safeHtml={safeHtml} slug={slug} />
    </main>
  );
}
