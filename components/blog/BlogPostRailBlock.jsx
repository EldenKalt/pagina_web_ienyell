'use client';

import { useId, useState } from 'react';

/**
 * A block of the editorial rail, optionally collapsible on narrow screens.
 *
 * The collapsing is CSS-driven above the two-column breakpoint: there the body is
 * always shown and the toggle is removed from the page entirely, so a desktop
 * reader never sees a collapsed block flash before hydration and no assistive
 * technology is offered a control that does nothing. `isOpen` governs only the
 * narrow layout, where the rail sits between the reader and the article and every
 * block it contains is height the article does not get.
 *
 * Shared by the chapter index and the topics block, which need exactly the same
 * behaviour — hence one component rather than the same toggle written twice.
 */
export default function BlogPostRailBlock({
  title,
  titleId,
  className = '',
  collapsible = false,
  showLabel = 'Show',
  hideLabel = 'Hide',
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const bodyId = `rail-block-${useId()}`;

  const heading = (
    <h2 className="blog-post-rail-title" id={titleId}>
      {title}
    </h2>
  );

  if (!collapsible) {
    return (
      <section className={`blog-post-rail-block ${className}`.trim()}>
        {heading}
        {children}
      </section>
    );
  }

  return (
    <section className={`blog-post-rail-block ${className}`.trim()}>
      {heading}

      <button
        type="button"
        className="blog-post-rail-toggle"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? hideLabel : showLabel}
        <span className="blog-post-rail-caret" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>

      <div id={bodyId} className={`blog-post-rail-collapse${isOpen ? ' is-open' : ''}`}>
        {children}
      </div>
    </section>
  );
}
