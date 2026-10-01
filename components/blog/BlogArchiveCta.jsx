import Link from 'next/link';

/**
 * Quiet closing block pointing at the full archive. Deliberately restrained — the
 * dark newsletter band above already carries the page's one loud moment.
 */
export default function BlogArchiveCta({
  title = 'Read the archive',
  body = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
  // (Future content: one line inviting the reader to browse every published article)
  ctaLabel = 'Browse all articles',
  ctaHref = '/blog/archive',
}) {
  return (
    <section className="blog-archive-cta">
      <div className="blog-archive-cta-copy">
        <h2>{title}</h2>
        <p>{body}</p>
      </div>

      <Link href={ctaHref} className="blog-archive-cta-link">
        {ctaLabel}
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
  );
}
