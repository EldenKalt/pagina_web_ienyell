'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const SOFTWARE_ICONS = {
  figma: {
    viewBox: '0 0 24 24',
    paths: [
      'M8 3h4v6H8a3 3 0 0 1 0-6ZM12 3h4a3 3 0 1 1 0 6h-4ZM8 9h4v6H8a3 3 0 1 1 0-6ZM12 9h4a3 3 0 1 1-4 2.83ZM8 15h4v3a3 3 0 1 1-4-3Z',
    ],
  },
  photoshop: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 4h16v16H4z',
      'M8 16V8h3a2.5 2.5 0 0 1 0 5H8M14.5 15.5c.8.7 3 .8 3-.5 0-1.7-3-1-3-3 0-1.4 2.1-1.5 3-.8',
    ],
  },
  illustrator: {
    viewBox: '0 0 24 24',
    paths: [
      'M4 4h16v16H4z',
      'm7.5 16 2.7-8h1.6l2.7 8M9 13h4M16.5 10v6M16.5 7.5h.01',
    ],
  },
  'clip-studio': {
    viewBox: '0 0 24 24',
    paths: [
      'M18.5 8.2A7.5 7.5 0 1 0 19 15',
      'M16.5 6.5 20 8l-1.5 3.5M8 15.5c1.5-4.5 4.8-6.8 8.5-7.3',
    ],
  },
  procreate: {
    viewBox: '0 0 24 24',
    paths: [
      'M5 19c4.5-8.5 8-12.5 14-14-1.5 6-5.5 9.5-14 14Z',
      'M8 16c2.5-.3 4.5.3 6 2M11 12l5-5',
    ],
  },
  blender: {
    viewBox: '0 0 24 24',
    paths: [
      'm4 10 6-1-3-3M10 9l3-5 1.5 4.5',
      'M9 13.5c0-3 3-5 6-5s5 1.8 5 4.5-2.2 5-5.5 5S9 16.5 9 13.5Z',
      'M12.5 13.5c0-1.2 1-2 2.3-2 1.4 0 2.4.8 2.4 2s-1 2-2.4 2c-1.3 0-2.3-.8-2.3-2Z',
    ],
  },
  krita: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 4a8 8 0 1 0 8 8c0-1.2-.8-2-2-2h-2',
      'M8 14c3-5 5-7 9-10M7 17c1-3 3-4 5-3 1 2 0 4-3 5',
    ],
  },
  sai: {
    viewBox: '0 0 24 24',
    paths: [
      'm12 4 5 5-7 10-5 1 1-5 6-11Z',
      'm6 15 4 4M12 4l2.5 7.5L10 19M8 17l4-4',
    ],
  },
};

const SOFTWARE_ALIASES = {
  ps: 'photoshop',
  'adobe-photoshop': 'photoshop',
  ai: 'illustrator',
  'adobe-illustrator': 'illustrator',
  clipstudio: 'clip-studio',
  'clip-studio-paint': 'clip-studio',
  csp: 'clip-studio',
  paintsai: 'sai',
  'paint-tool-sai': 'sai',
};

function formatPortfolioBudget(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const first = raw[0];
  const hasCurrencySymbol = ['₡', '$', '€'].includes(first);
  const currency = hasCurrencySymbol ? first : '₡';
  const amount = hasCurrencySymbol ? raw.slice(1) : raw;
  const digits = amount.replace(/\D/g, '');
  if (!digits) return raw;
  return `${currency}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

function normalizeAspectRatio(value) {
  const match = String(value || '').match(
    /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/,
  );

  if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) {
    return '4 / 3';
  }

  return `${Number(match[1])} / ${Number(match[2])}`;
}

function findSoftwareIcon(software) {
  const candidates = [software?.id, software?.icon, software?.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase().replace(/\s+/g, '-'));

  for (const candidate of candidates) {
    const directKey = SOFTWARE_ALIASES[candidate] || candidate;
    if (SOFTWARE_ICONS[directKey]) return SOFTWARE_ICONS[directKey];

    const partialKey = Object.keys(SOFTWARE_ICONS).find((key) => candidate.includes(key));
    if (partialKey) return SOFTWARE_ICONS[partialKey];
  }

  return null;
}

function SoftwareIcon({ software }) {
  const icon = findSoftwareIcon(software);

  if (!icon) {
    const fallback = String(software?.name || software?.abbr || 'SW')
      .trim()
      .slice(0, 2)
      .toUpperCase();
    return <span>{fallback || 'SW'}</span>;
  }

  return (
    <svg viewBox={icon.viewBox} aria-hidden="true">
      {icon.paths.map((path) => <path d={path} key={path} />)}
    </svg>
  );
}

function CategoryIcon({ path }) {
  if (!path) return null;

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function CoverFallback() {
  return (
    <div className="pf-cover-fallback" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M4 5h16v14H4zM7 15l3-3 2.5 2.5L15 12l3 3.5M8 9h.01" />
      </svg>
    </div>
  );
}

export default function PortfolioProjectPage() {
  const params = useParams();
  const router = useRouter();
  const viewRef = useRef(null);
  const [project, setProject] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  useEffect(() => {
    if (!slug) return undefined;

    const controller = new AbortController();

    const loadProject = async () => {
      try {
        setLoading(true);
        const apiBaseUrl = String(process.env.NEXT_PUBLIC_API_URL || '')
          .trim()
          .replace(/\/+$/, '');

        if (!apiBaseUrl) {
          throw new Error('NEXT_PUBLIC_API_URL is not configured.');
        }

        const [projectResponse, categoriesResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/portfolio/projects/${encodeURIComponent(slug)}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
          fetch(`${apiBaseUrl}/api/portfolio/categories`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
        ]);

        if (!projectResponse.ok || !categoriesResponse.ok) {
          throw new Error('The project could not be loaded.');
        }

        const [projectPayload, categoriesPayload] = await Promise.all([
          projectResponse.json(),
          categoriesResponse.json(),
        ]);

        setProject(projectPayload.project || null);
        setCategories(
          Array.isArray(categoriesPayload.categories)
            ? categoriesPayload.categories
            : [],
        );
        setError('');
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'The project could not be loaded.');
          setProject(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProject();

    return () => controller.abort();
  }, [slug]);

  const category = useMemo(() => {
    const categorySlug = Array.isArray(project?.categories)
      ? project.categories[0]
      : '';
    return categories.find((item) => item.slug === categorySlug) || (
      categorySlug ? { slug: categorySlug, label: categorySlug, icon: '' } : null
    );
  }, [categories, project]);

  const sanitizedContent = useMemo(() => {
    if (!project?.content || typeof window === 'undefined') return '';
    return DOMPurify.sanitize(String(project.content));
  }, [project?.content]);

  const formattedBudget = formatPortfolioBudget(project?.budget);
  const projectRatio = normalizeAspectRatio(project?.aspectRatio);
  const software = Array.isArray(project?.software) ? project.software : [];
  const technologies = Array.isArray(project?.technologies) ? project.technologies : [];
  const results = Array.isArray(project?.results) ? project.results : [];

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (!view || loading || error || !project) return undefined;

    const ctx = gsap.context(() => {
      const sidebarElements = gsap.utils.toArray(
        '.pf-sidebar-category, .pf-sidebar-title, .pf-sidebar-meta, .pf-sidebar-divider, .pf-sidebar-section, .pf-sidebar-live',
        view,
      );
      const cover = view.querySelector('.pf-browser, .pf-cover');
      const contentBlocks = gsap.utils.toArray('.pf-content > *', view);
      const animatedElements = [view, ...sidebarElements, cover, ...contentBlocks]
        .filter(Boolean);
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(animatedElements, {
          clearProps: 'all',
          opacity: 1,
          visibility: 'visible',
        });
        return;
      }

      const entranceTimeline = gsap.timeline();

      entranceTimeline.fromTo(view, {
        autoAlpha: 0,
      }, {
        autoAlpha: 1,
        duration: 0.45,
        ease: 'power2.out',
      });

      entranceTimeline.fromTo(sidebarElements, {
        y: 16,
        autoAlpha: 0,
      }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      }, 0.08);

      if (cover) {
        entranceTimeline.fromTo(cover, {
          scale: 1.04,
          autoAlpha: 0,
        }, {
          scale: 1,
          autoAlpha: 1,
          duration: 0.65,
          ease: 'power3.out',
          clearProps: 'transform',
        }, 0.12);
      }

      contentBlocks.forEach((block) => {
        gsap.fromTo(block, {
          y: 20,
          autoAlpha: 0,
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: block,
            start: 'top 88%',
            once: true,
          },
        });
      });
    }, view);

    return () => ctx.revert();
  }, [error, loading, project]);

  const openCategory = () => {
    if (!category?.slug) {
      router.push('/work');
      return;
    }
    router.push(`/work?category=${encodeURIComponent(category.slug)}`);
  };

  if (loading) {
    return (
      <main className="pf-project-page pf-project-page--state">
        <div className="pf-project-loading" role="status" aria-live="polite">
          <span className="pf-project-spinner" aria-hidden="true" />
          <span>Loading project…</span>
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="pf-project-page pf-project-page--state">
        <div className="pf-project-error" role="alert">
          <strong>Unable to load this project.</strong>
          <span>{error || 'Project not found.'}</span>
          <button type="button" onClick={() => router.push('/work')}>
            Back to gallery
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pf-project-page" ref={viewRef}>
      <div className="pf-project-shell">
        <div className="pf-project-topbar">
          <nav className="pf-project-breadcrumb" aria-label="Project breadcrumb">
            <button type="button" onClick={() => router.push('/work')}>Portfolio</button>
            {category && (
              <>
                <span aria-hidden="true">›</span>
                <button type="button" onClick={openCategory}>{category.label}</button>
              </>
            )}
            <span aria-hidden="true">›</span>
            <span>{project.title}</span>
          </nav>

          <button
            type="button"
            className="pf-project-back"
            onClick={() => router.push('/work')}
          >
            <span aria-hidden="true">←</span>
            Back to gallery
          </button>
        </div>

        <div className="pf-project-layout">
          <aside className="pf-sidebar">
            {category && (
              <button type="button" className="pf-sidebar-category" onClick={openCategory}>
                <CategoryIcon path={category.icon} />
                <span>{category.label}</span>
              </button>
            )}

            <h1 className="pf-sidebar-title">{project.title}</h1>

            {(project.client || project.date) && (
              <div className="pf-sidebar-meta">
                {project.client && <span><b aria-hidden="true">◈</b>{project.client}</span>}
                {project.date && <span><b aria-hidden="true">◷</b>{project.date}</span>}
              </div>
            )}

            <div className="pf-sidebar-divider" />

            {project.summary && (
              <section className="pf-sidebar-section">
                <h2>Description</h2>
                <p>{project.summary}</p>
              </section>
            )}

            {project.approach && (
              <section className="pf-sidebar-section">
                <h2>Approach</h2>
                <p>{project.approach}</p>
              </section>
            )}

            {software.length > 0 && (
              <section className="pf-sidebar-section">
                <h2>Software used</h2>
                <div className="pf-sidebar-chips">
                  {software.map((item, index) => (
                    <span className="pf-sidebar-software" key={item.id || `${item.name}-${index}`}>
                      <span className="pf-sidebar-software-icon">
                        <SoftwareIcon software={item} />
                      </span>
                      <span>{item.name || item.abbr}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {technologies.length > 0 && (
              <section className="pf-sidebar-section">
                <h2>Technologies</h2>
                <div className="pf-sidebar-chips">
                  {technologies.map((item, index) => (
                    <span className="pf-sidebar-technology" key={item.id || `${item.name}-${index}`}>
                      {item.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {formattedBudget && (
              <section className="pf-sidebar-section">
                <h2>Budget</h2>
                <p className="pf-sidebar-budget">{formattedBudget}</p>
              </section>
            )}

            {results.length > 0 && (
              <section className="pf-sidebar-section">
                <h2>Results</h2>
                <ul className="pf-sidebar-results">
                  {results.map((result, index) => (
                    <li key={`${result.value}-${result.label}-${index}`}>
                      <strong>{result.value}</strong>
                      <span>{result.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {project.liveUrl && (
              <a
                className="pf-sidebar-live"
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                View live site <span aria-hidden="true">→</span>
              </a>
            )}
          </aside>

          <div className="pf-project-main">
            {project.showBrowserFrame && project.coverUrl ? (
              <div className="pf-browser">
                <div className="pf-browser-bar" aria-hidden="true">
                  <span className="pf-browser-dots"><i /><i /><i /></span>
                  <span className="pf-browser-url">{project.liveUrl || project.title}</span>
                </div>
                <div className="pf-browser-viewport" style={{ aspectRatio: projectRatio }}>
                  <img src={project.coverUrl} alt={project.title} />
                </div>
              </div>
            ) : (
              <div className="pf-cover" style={{ aspectRatio: projectRatio }}>
                {project.coverUrl ? (
                  <img src={project.coverUrl} alt={project.title} />
                ) : (
                  <CoverFallback />
                )}
              </div>
            )}

            {sanitizedContent && (
              <article
                className="pf-content"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
