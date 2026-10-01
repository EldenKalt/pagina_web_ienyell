import BlogPostRailBlock from './BlogPostRailBlock';

/**
 * Chapter index — the article's own headings, as navigation.
 *
 * h2 entries are the top level and h3 entries nest under them, each with the
 * first sentence of the text that follows, as in the reference.
 *
 * Collapsing on narrow screens is handled by BlogPostRailBlock.
 */
export default function BlogPostIndex({ outline = [], title }) {
  if (!outline.length) return null;

  // Rebuild the flat heading list into the two levels the index shows.
  const sections = [];
  outline.forEach((entry) => {
    if (entry.level === 2 || !sections.length) {
      sections.push({ ...entry, children: [] });
    } else {
      sections[sections.length - 1].children.push(entry);
    }
  });

  return (
    <BlogPostRailBlock
      title={title || 'In this post'}
      titleId="blog-post-index-title"
      className="blog-post-index"
      collapsible
      showLabel="Show contents"
      hideLabel="Hide contents"
    >
      <nav aria-labelledby="blog-post-index-title">
        <ol className="blog-post-index-list">
          {sections.map((section) => (
            <li key={section.id}>
              <a className="blog-post-index-link" href={`#${section.id}`}>
                {section.text}
              </a>

              {section.children.length ? (
                <ol className="blog-post-index-list blog-post-index-list--nested">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <a className="blog-post-index-link" href={`#${child.id}`}>
                        {child.text}
                      </a>
                      {child.excerpt ? (
                        <p className="blog-post-index-excerpt">{child.excerpt}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>
    </BlogPostRailBlock>
  );
}
