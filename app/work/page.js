'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const ALL_ICON_PATH = 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';

function normalizeAspectRatio(value) {
  const match = String(value || '').match(
    /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
  );

  if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) {
    return '4 / 3';
  }

  return `${Number(match[1])} / ${Number(match[2])}`;
}

function CategoryIcon({ path }) {
  return (
    <svg className="pf-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path || ALL_ICON_PATH} />
    </svg>
  );
}

function ImageFallback() {
  return (
    <div className="pf-card__fallback" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M4 5h16v14H4zM7 15l3-3 2.5 2.5L15 12l3 3.5M8 9h.01" />
      </svg>
    </div>
  );
}

function WorkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadPortfolio = async () => {
      try {
        const apiBaseUrl = String(process.env.NEXT_PUBLIC_API_URL || '')
          .trim()
          .replace(/\/+$/, '');

        if (!apiBaseUrl) {
          throw new Error('NEXT_PUBLIC_API_URL is not configured.');
        }

        const [categoriesResponse, projectsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/portfolio/categories`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
          fetch(`${apiBaseUrl}/api/portfolio/projects`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
        ]);

        if (!categoriesResponse.ok || !projectsResponse.ok) {
          throw new Error('The portfolio could not be loaded.');
        }

        const [categoriesPayload, projectsPayload] = await Promise.all([
          categoriesResponse.json(),
          projectsResponse.json(),
        ]);

        setCategories(
          Array.isArray(categoriesPayload.categories)
            ? categoriesPayload.categories
            : [],
        );
        setProjects(
          Array.isArray(projectsPayload.projects) ? projectsPayload.projects : [],
        );
        setError('');
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'The portfolio could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadPortfolio();

    return () => controller.abort();
  }, []);

  const categoryLabels = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.label])),
    [categories],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map();

    categories.forEach((category) => {
      counts.set(
        category.slug,
        projects.filter((project) => (
          Array.isArray(project.categories)
          && project.categories.includes(category.slug)
        )).length,
      );
    });

    return counts;
  }, [categories, projects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesCategory = !activeCategory || (
        Array.isArray(project.categories)
        && project.categories.includes(activeCategory)
      );
      const searchableText = [project.title, project.client, project.summary]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, projects, searchQuery]);

  const activeCategoryLabel = activeCategory
    ? categoryLabels.get(activeCategory) || activeCategory
    : '';

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || loading || error) return undefined;

    const ctx = gsap.context(() => {
      const eyebrow = section.querySelector('.pf-eyebrow, .pf-breadcrumb');
      const title = section.querySelector('.pf-title');
      const lead = section.querySelector('.pf-lead');
      const filters = section.querySelector('.pf-filters');
      const introElements = [eyebrow, title, lead, filters].filter(Boolean);
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (prefersReducedMotion) {
        gsap.set([section, ...introElements], {
          clearProps: 'all',
          opacity: 1,
          visibility: 'visible',
        });
        return;
      }

      gsap.fromTo(section, {
        backgroundColor: 'var(--surface)',
      }, {
        backgroundColor: 'var(--paper)',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'top 15%',
          scrub: true,
        },
      });

      const introTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          once: true,
        },
      });

      if (eyebrow) {
        introTimeline.fromTo(eyebrow, {
          clipPath: 'inset(0 100% 0 0)',
          autoAlpha: 0,
        }, {
          clipPath: 'inset(0 0% 0 0)',
          autoAlpha: 1,
          duration: 0.6,
          ease: 'power3.out',
        }, 0);
      }

      if (title) {
        introTimeline.fromTo(title, {
          y: 40,
          autoAlpha: 0,
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.8,
          ease: 'power4.out',
        }, 0.12);
      }

      if (lead) {
        introTimeline.fromTo(lead, {
          y: 20,
          autoAlpha: 0,
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, 0.24);
      }

      if (filters) {
        introTimeline.fromTo(filters, {
          y: 15,
          autoAlpha: 0,
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, 1.04);
      }
    }, section);

    return () => ctx.revert();
  }, [error, loading]);

  const cardsAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || loading || error || !filteredProjects.length) return undefined;

    if (cardsAnimatedRef.current) {
      gsap.set(gsap.utils.toArray('.pf-card', grid), {
        clearProps: 'all',
        opacity: 1,
        visibility: 'visible',
      });
      return undefined;
    }

    cardsAnimatedRef.current = true;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.pf-card', grid);
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(cards, {
          clearProps: 'all',
          opacity: 1,
          visibility: 'visible',
        });
        return;
      }

      cards.forEach((card) => {
        gsap.fromTo(card, {
          y: 30,
          autoAlpha: 0,
          scale: 0.95,
        }, {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.75,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            once: true,
          },
        });
      });
    }, grid);

    return () => ctx.revert();
  }, [error, filteredProjects, loading]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('');
  };

  const openProject = (slug) => {
    if (!slug) return;
    router.push(`/work/${encodeURIComponent(slug)}`);
  };

  if (loading) {
    return (
      <main className="pf-page pf-page--state">
        <div className="pf-loading" role="status" aria-live="polite">
          <span className="pf-loading__spinner" aria-hidden="true" />
          <span>Loading selected work…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pf-page pf-page--state">
        <div className="pf-error" role="alert">
          <strong>Unable to load the portfolio.</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="pf-page" ref={sectionRef}>
      <div className="pf-shell">
        <header className="pf-intro">
          {activeCategory ? (
            <nav className="pf-breadcrumb" aria-label="Portfolio filter breadcrumb">
              <button type="button" onClick={() => setActiveCategory('')}>
                Portfolio
              </button>
              <span aria-hidden="true">›</span>
              <span>{activeCategoryLabel}</span>
            </nav>
          ) : (
            <p className="pf-eyebrow">Portfolio</p>
          )}

          <h1 className="pf-title">Selected Work</h1>
          <p className="pf-lead">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            vitae sem at urna posuere facilisis, donde cada proyecto explora una
            historia, un personaje y una voz visual diferente.
          </p>
        </header>

        <section className="pf-filters" aria-label="Portfolio filters">
          <div className="pf-search">
            <svg className="pf-search__icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <label className="sr-only" htmlFor="portfolio-search">
              Search projects
            </label>
            <input
              id="portfolio-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects"
            />
          </div>

          <div className="pf-chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`pf-chip${activeCategory === '' ? ' pf-chip--active' : ''}`}
              aria-pressed={activeCategory === ''}
              onClick={() => setActiveCategory('')}
            >
              <CategoryIcon path={ALL_ICON_PATH} />
              <span>All</span>
              <span className="pf-chip__count">{projects.length}</span>
            </button>

            {categories.map((category) => (
              <button
                type="button"
                className={`pf-chip${activeCategory === category.slug ? ' pf-chip--active' : ''}`}
                aria-pressed={activeCategory === category.slug}
                onClick={() => setActiveCategory(category.slug)}
                key={category.id || category.slug}
              >
                <CategoryIcon path={category.icon} />
                <span>{category.label}</span>
                <span className="pf-chip__count">
                  {categoryCounts.get(category.slug) || 0}
                </span>
              </button>
            ))}
          </div>
        </section>

        {filteredProjects.length > 0 ? (
          <section className="pf-grid" ref={gridRef} aria-label="Portfolio projects">
            {filteredProjects.map((project) => {
              const firstCategory = Array.isArray(project.categories)
                ? project.categories[0]
                : '';
              const categoryLabel = categoryLabels.get(firstCategory)
                || firstCategory
                || 'Uncategorized';

              return (
                <article
                  className="pf-card"
                  role="link"
                  tabIndex={0}
                  onClick={() => openProject(project.slug)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openProject(project.slug);
                    }
                  }}
                  key={project.id || project.slug}
                >
                  <div
                    className="pf-card__media"
                    style={{ aspectRatio: normalizeAspectRatio(project.aspectRatio) }}
                  >
                    {project.coverUrl ? (
                      <img
                        src={project.coverUrl}
                        alt={project.title || 'Portfolio project'}
                        loading="lazy"
                      />
                    ) : (
                      <ImageFallback />
                    )}
                  </div>
                  <div className="pf-card__body">
                    <h2>{project.title}</h2>
                    <p>{categoryLabel}</p>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="pf-empty" aria-live="polite">
            <p>No projects found with these filters.</p>
            <button type="button" onClick={clearFilters}>Clear filters</button>
          </section>
        )}
      </div>
    </main>
  );
}

export default function WorkPage() {
  return (
    <Suspense
      fallback={(
        <main className="pf-page pf-page--state">
          <div className="pf-loading" role="status" aria-live="polite">
            <span className="pf-loading__spinner" aria-hidden="true" />
            <span>Loading selected work…</span>
          </div>
        </main>
      )}
    >
      <WorkPageContent />
    </Suspense>
  );
}
