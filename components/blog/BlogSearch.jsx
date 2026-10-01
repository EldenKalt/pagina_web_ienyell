'use client';

/**
 * Search input. Captures only — it does not search. The page owns the query state
 * and calls lib/blogSearch, so swapping the search strategy never touches this file.
 *
 * Visual pattern follows .pf-search in app/work/page.js (inline magnifier icon).
 */
export default function BlogSearch({
  value,
  onChange,
  resultCount = null,
  placeholder = 'Search articles…',
  id = 'blog-search',
  variant,
}) {
  const className = variant ? `blog-search blog-search--${variant}` : 'blog-search';

  return (
    <div className={className} role="search">
      <label className="sr-only" htmlFor={id}>
        Search articles
      </label>

      <div className="blog-search-field">
        <svg
          className="blog-search-icon"
          viewBox="0 0 20 20"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        <input
          id={id}
          type="search"
          className="blog-search-input"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />

        {value ? (
          <button
            type="button"
            className="blog-search-clear"
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Announced to screen readers as results change. */}
      <p className="blog-search-status" aria-live="polite">
        {value && resultCount !== null
          ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
          : ''}
      </p>
    </div>
  );
}
