import Link from 'next/link';

/**
 * Topic chips, derived from each post's `keywords[]` — a field that already exists on
 * model BlogPost but had no public surface until now.
 *
 * Chips are links, not buttons: they navigate to the archive filtered by that topic.
 *
 * Two configurations of the same component:
 *   - landing  — centred, with its own section heading (the default)
 *   - compact  — left-aligned, no heading, with an "All" chip and an active state,
 *                so a reader inside a filtered archive can switch or clear the filter
 *                without going back to the landing
 *
 * `preserve` carries the narrowings that are NOT this nav's business. The archive
 * can be scoped to a series as well as a category, and a chip that rebuilt the
 * URL from scratch would silently drop the series — including "All", which is
 * meant to clear the category and nothing else.
 */
export default function BlogTopicNav({
  topics = [],
  title = 'Blog Categories',
  activeTopic = '',
  variant,
  showAll = false,
  basePath = '/blog/archive',
  allLabel = 'All',
  preserve,
}) {
  if (!topics.length) return null;

  const isCompact = variant === 'compact';
  const className = isCompact ? 'blog-topics blog-topics--compact' : 'blog-topics';

  const kept = new URLSearchParams(
    Object.entries(preserve || {}).filter(([, value]) => value),
  ).toString();

  const hrefFor = (topic) => {
    const params = new URLSearchParams(kept);
    if (topic) params.set('topic', topic);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <section className={className} aria-labelledby={isCompact ? undefined : 'blog-topics-title'}>
      {isCompact ? null : (
        <h2 className="blog-topics-title" id="blog-topics-title">{title}</h2>
      )}

      <nav aria-label="Blog topics">
        <ul className="blog-topics-list">
          {showAll ? (
            <li>
              <Link
                className={`blog-topic-chip${activeTopic ? '' : ' is-active'}`}
                href={hrefFor('')}
                aria-current={activeTopic ? undefined : 'page'}
              >
                {allLabel}
              </Link>
            </li>
          ) : null}

          {topics.map((topic) => {
            const isActive = topic === activeTopic;

            return (
              <li key={topic}>
                <Link
                  className={`blog-topic-chip${isActive ? ' is-active' : ''}`}
                  href={hrefFor(topic)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {topic}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
