import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogPostView from '../../../components/blog/BlogPostView';
import { sanitizeArticleHtml } from '../../../lib/articleHtml';
import { fetchBlogApi } from '../../../lib/blogApi';

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
 * Article content is public and sanitized by the backend when stored.
 * Reader-specific features load separately inside BlogPostView.
 */

async function readPost(slug) {
  try {
    return await fetchBlogApi(`/api/blog/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
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

  const safeHtml = sanitizeArticleHtml(post.content, { trusted: true });

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
