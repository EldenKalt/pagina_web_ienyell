# Blog Public Pages — Migration Prompts

Estos prompts migran las páginas públicas del blog desde Util (React + React Router + axios) hacia ienyell (Next.js App Router + fetch nativo). El backend ya existe en `backend/src/routes/blog.js` y `backend/src/controllers/blogController.js` — no hay que tocar el backend.

**Ejecutar en orden: Prompt 1 → Prompt 2 → Prompt 3.**

---

## Prompt 1 — Blog Listing Page (`app/blog/page.js`)

Crea el archivo `app/blog/page.js` con la página de listado del blog. Esta página muestra un grid paginado de artículos con skeleton loading.

### Requisitos técnicos exactos:

1. **Estructura del archivo**:
   - Directiva `'use client'` al inicio.
   - Imports: `{ useEffect, useState }` de `react`, `Link` de `next/link`, `useRouter` de `next/navigation`.
   - NO importar `useSearchParams` (no se necesita) — NO hace falta wrapper `Suspense`.

2. **Función `formatDate(value)`**:
   ```js
   function formatDate(value) {
     return value
       ? new Date(value).toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric',
         })
       : '';
   }
   ```

3. **Componente `BlogSkeleton`** — skeleton de carga para las cards:
   ```jsx
   function BlogSkeleton() {
     return (
       <div className="blog-card blog-skeleton" aria-hidden="true">
         <div className="blog-skeleton-cover" />
         <div className="blog-skeleton-line short" />
         <div className="blog-skeleton-line title" />
         <div className="blog-skeleton-line" />
         <div className="blog-skeleton-line" />
       </div>
     );
   }
   ```

4. **Componente principal `BlogListPage`** (export default):
   - **State**: `posts` (array), `page` (number, inicia en 1), `totalPages` (number, inicia en 1), `loading` (boolean), `error` (string).
   - **useEffect** con `AbortController`:
     - Construir URL base: `const apiBase = String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');`
     - Si `!apiBase`, throw error `'NEXT_PUBLIC_API_URL is not configured.'`
     - Fetch: `fetch(\`${apiBase}/api/blog?page=${page}&limit=6\`, { signal: controller.signal, headers: { Accept: 'application/json' } })`
     - Parsear response: `setPosts(Array.isArray(data.posts) ? data.posts : [])`, `setTotalPages(Number(data.totalPages || 1))`
     - Catch: si NO es `AbortError`, setError.
     - Finally: `if (!controller.signal.aborted) setLoading(false);`
     - Cleanup: `return () => controller.abort();`
     - **Dependencia del effect**: `[page]`

5. **Render — estructura JSX exacta**:
   ```jsx
   <main className="blog-list-page">
     <header className="blog-list-heading">
       <p className="blog-list-eyebrow">Blog</p>
       <h1 className="blog-list-title">Latest Articles</h1>
       <span className="blog-list-subtitle">
         Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.
       </span>
     </header>

     {error ? <div className="blog-public-error" role="alert">{error}</div> : null}

     <div className="blog-grid">
       {loading
         ? Array.from({ length: 6 }, (_, i) => <BlogSkeleton key={i} />)
         : posts.map((post) => (
             <article key={post.id} className="blog-card">
               <div className="blog-card-cover">
                 {post.coverUrl ? (
                   <img src={post.coverUrl} alt={post.title} loading="lazy" />
                 ) : (
                   <div className="blog-cover-placeholder" aria-hidden="true">
                     <svg viewBox="0 0 24 24" width="32" height="32">
                       <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                       <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                       <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" />
                       <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5" />
                     </svg>
                   </div>
                 )}
               </div>
               <div className="blog-card-body">
                 <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                 <h2>{post.title}</h2>
                 <p>{post.excerpt || 'Read the full article for all the details.'}</p>
                 <span className="blog-read-more">
                   Read more
                   <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                     <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                   </svg>
                 </span>
               </div>
               <Link
                 href={`/blog/${post.slug}`}
                 className="blog-card-hit-area"
                 aria-label={`Read ${post.title}`}
               />
             </article>
           ))}
     </div>

     {!loading && !posts.length && !error ? (
       <div className="blog-empty">No articles published yet.</div>
     ) : null}

     {!loading && (page > 1 || page < totalPages) ? (
       <div className="blog-pagination">
         <button
           type="button"
           className="blog-pagination-btn"
           disabled={page <= 1}
           onClick={() => setPage((p) => p - 1)}
         >
           Previous
         </button>
         <span>Page {page} of {totalPages}</span>
         <button
           type="button"
           className="blog-pagination-btn"
           disabled={page >= totalPages}
           onClick={() => setPage((p) => p + 1)}
         >
           Next
         </button>
       </div>
     ) : null}
   </main>
   ```

6. **Patrones a seguir** (replicar lo que ya funciona en `app/work/page.js`):
   - AbortController en useEffect con cleanup.
   - Construir apiBase de la misma forma que el portfolio.
   - NO usar axios — solo `fetch` nativo.
   - NO usar componentes DIcon — usar SVGs inline.
   - NO agregar PublicHeader ni PublicFooter — ienyell tiene su propio layout.
   - Textos de UI en inglés. Subtítulos y descripciones placeholder en lorem ipsum.

---

## Prompt 2 — Blog Post Detail Page (`app/blog/[slug]/page.js`)

Crea el archivo `app/blog/[slug]/page.js` con la página de detalle de un artículo del blog.

### Requisitos técnicos exactos:

1. **Estructura del archivo**:
   - Directiva `'use client'` al inicio.
   - Imports: `{ useEffect, useState }` de `react`, `Link` de `next/link`, `{ useParams }` de `next/navigation`, `DOMPurify` de `'dompurify'` (ya instalado).

2. **Función `formatDate(value)`** — misma que en la listing page:
   ```js
   function formatDate(value) {
     return value
       ? new Date(value).toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric',
         })
       : '';
   }
   ```

3. **Función `sanitizeHtml(html)`** — misma que en `app/work/[slug]/page.js`:
   ```js
   function sanitizeHtml(html) {
     if (typeof window === 'undefined') return '';
     return DOMPurify.sanitize(html, {
       ADD_TAGS: ['iframe'],
       ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
     });
   }
   ```

4. **Componente `BlogPostNavButton`** — botón de navegación prev/next:
   ```jsx
   function BlogPostNavButton({ href, direction = 'right', label, title }) {
     const arrowStyle = direction === 'left'
       ? { transform: 'rotate(180deg)' }
       : direction === 'up'
         ? { transform: 'rotate(-90deg)' }
         : undefined;

     return (
       <Link
         href={href}
         className={`blog-post-nav-link ${direction === 'left' ? 'is-previous-link' : direction === 'up' ? 'is-return-link' : 'is-next-link'}`}
       >
         <span className="blog-post-nav-copy">
           <span className="blog-post-nav-label">{label}</span>
           {title ? <span className="blog-post-nav-title">: {title}</span> : null}
         </span>
         <span className="blog-post-nav-icon" aria-hidden="true">
           <span className="blog-post-nav-icon-inner" style={arrowStyle}>
             <svg viewBox="0 0 16 16" width="15" height="15">
               <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
           </span>
         </span>
       </Link>
     );
   }
   ```

5. **Componente `BlogSidebarCard`** — card de post relacionado en el sidebar:
   ```jsx
   function BlogSidebarCard({ href, eyebrow, title, body }) {
     return (
       <Link href={href} className="blog-post-sidebar-card">
         {eyebrow ? <span className="blog-post-sidebar-card-eyebrow">{eyebrow}</span> : null}
         <strong className="blog-post-sidebar-card-title">{title}</strong>
         {body ? <p className="blog-post-sidebar-card-body">{body}</p> : null}
         <span className="blog-post-sidebar-card-arrow" aria-hidden="true">
           <span className="blog-post-sidebar-card-arrow-inner">
             <svg viewBox="0 0 16 16" width="14" height="14">
               <path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
           </span>
         </span>
       </Link>
     );
   }
   ```

6. **Componente principal `BlogPostPage`** (export default):
   - **Obtener slug**: `const { slug } = useParams();`
   - **State**: `post` (object | null), `loading` (boolean), `error` (string).
   - **Variables derivadas del post** (fuera del render, con null-checks):
     ```js
     const relatedPosts = Array.isArray(post?.relatedPosts) ? post.relatedPosts : [];
     const previousPost = post?.previousPost || null;
     const nextPost = post?.nextPost || null;
     const hasSidebar = Boolean(previousPost || nextPost || relatedPosts.length);
     ```
     **IMPORTANTE**: NO incluir `relatedProducts` ni `relatedServices` — ienyell no tiene tienda/productos. Solo posts relacionados.

   - **useEffect** con AbortController:
     - Resetear state: `setPost(null); setError(''); setLoading(true);`
     - Construir apiBase igual que el listing.
     - Fetch: `fetch(\`${apiBase}/api/blog/${slug}\`, { signal, headers: { Accept: 'application/json' } })`
     - En el catch: si status 404 → `'This article is not available.'`, otro error → `'Could not load the article.'`
     - **Dependencia**: `[slug]`

7. **Render — estructura JSX exacta**:
   ```jsx
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
         <div className={`blog-post-detail-layout${hasSidebar ? ' has-sidebar' : ''}`}>
           <header className="blog-post-header">
             <h1>{post.title}</h1>
             <p>{formatDate(post.publishedAt)} · {post.author?.name || 'ienyell'}</p>
           </header>

           {post.coverUrl ? (
             <img className="blog-post-cover" src={post.coverUrl} alt={post.title} />
           ) : null}

           <div className="blog-post-main">
             <div
               className="blog-content"
               dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
             />

             {(previousPost || nextPost) ? (
               <div className="blog-post-nav blog-post-nav-inline">
                 {previousPost ? (
                   <BlogPostNavButton
                     href={`/blog/${previousPost.slug}`}
                     direction="left"
                     label="Previous"
                     title={previousPost.title}
                   />
                 ) : null}
                 <BlogPostNavButton
                   href="/blog"
                   direction="up"
                   label="Back to blog"
                 />
                 {nextPost ? (
                   <BlogPostNavButton
                     href={`/blog/${nextPost.slug}`}
                     direction="right"
                     label="Next"
                     title={nextPost.title}
                   />
                 ) : null}
               </div>
             ) : null}
           </div>

           {hasSidebar ? (
             <aside className="blog-post-sidebar">
               {relatedPosts.length ? (
                 <section className="blog-post-sidebar-section">
                   <p className="blog-post-sidebar-label">Related Posts</p>
                   <div className="blog-post-sidebar-stack">
                     {relatedPosts.map((rp) => (
                       <BlogSidebarCard
                         key={rp.id}
                         href={`/blog/${rp.slug}`}
                         eyebrow={rp.publishedAt ? formatDate(rp.publishedAt) : 'Blog'}
                         title={rp.title}
                         body={rp.excerpt || 'Read the full article for all the details.'}
                       />
                     ))}
                   </div>
                 </section>
               ) : null}
             </aside>
           ) : null}
         </div>
       </article>
     ) : null}
   </main>
   ```

8. **Patrones a seguir** (replicar lo que funciona en `app/work/[slug]/page.js`):
   - `DOMPurify` importado y usado con `sanitizeHtml()` igual que en el portfolio detail.
   - AbortController para fetch con cleanup.
   - NO incluir nada de productos/servicios/tienda — solo related posts.
   - NO usar `formatCurrency` — no aplica.
   - NO agregar PublicHeader/PublicFooter.
   - Textos de UI en inglés.

---

## Prompt 3 — CSS del Blog (agregar a `styles/globals.css`)

Agrega TODOS los estilos del blog al final de `styles/globals.css`, después de los estilos existentes del portfolio (`.pf-*`). Usar SOLO las CSS variables de ienyell definidas en `:root` — nunca hardcodear colores.

### Mapeo de variables (Util → ienyell):
| Util | ienyell | Propósito |
|------|---------|-----------|
| `var(--util-white)` | `var(--paper)` | Fondo de cards/página |
| `var(--util-black)` | `var(--ink)` | Texto principal, títulos |
| `var(--util-blue)` | `var(--accent)` | Color de acento (links, eyebrow, labels) |
| `var(--util-blue-700)` | `var(--accent-dark)` | Acento hover/pressed |
| `var(--util-yellow)` | `var(--accent)` | Underline de "Read more" |
| `var(--fg-main)` | `var(--ink)` | Texto body |
| `var(--fg-muted)` | `var(--ink-soft)` | Texto secundario, excerpts |
| `var(--fg-subtle)` | `var(--text-muted)` | Texto terciario, fechas |
| `var(--border)` | `var(--line)` | Bordes de cards |
| `var(--util-gray-50)` | `var(--surface)` | Fondos sutiles |
| `var(--util-gray-100)` | `var(--surface)` | Placeholder de cover |
| `var(--util-gray-200)` | `var(--line-2)` | Skeleton loading |
| `var(--util-error)` | `#dc3545` | Error (definir como `--blog-error: #dc3545` local) |
| `var(--font-display)` | `'Inter', sans-serif` (font-weight: 800) | Títulos grandes |
| `var(--font-body)` | `inherit` (ya es Inter en body) | Texto body |
| `color-mix(in srgb, var(--util-blue) X%, ...)` | `color-mix(in srgb, var(--accent) X%, ...)` | Tints de acento |

### Estilos a crear — LISTA COMPLETA (todos con prefijo `.blog-`):

```css
/* ── Blog — error ── */
.blog-public-error {
  padding: 12px 14px;
  border: 1px solid #dc3545;
  border-radius: 6px;
  background: #fff5f5;
  color: #dc3545;
  font-weight: 600;
  font-size: 13px;
  line-height: 1.4;
}

/* ── Blog — listing page ── */
.blog-list-page {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 64px 0 80px;
}
.blog-list-heading {
  max-width: 760px;
  margin-bottom: 42px;
}
.blog-list-eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.blog-list-title {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.blog-list-subtitle {
  color: var(--ink-soft);
  font-size: 18px;
  line-height: 1.55;
}

/* ── Blog — card grid ── */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.blog-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
}
.blog-card:not(.blog-skeleton) {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms ease,
    border-color 220ms ease;
}
.blog-card:not(.blog-skeleton):hover,
.blog-card:not(.blog-skeleton):focus-within {
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
}

/* Cover image */
.blog-card-cover {
  position: relative;
  z-index: 2;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--surface);
  pointer-events: none;
}
.blog-card-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.blog-card:not(.blog-skeleton):hover .blog-card-cover img,
.blog-card:not(.blog-skeleton):focus-within .blog-card-cover img {
  transform: scale(1.035);
}
.blog-cover-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--surface);
}

/* Card body */
.blog-card-body {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 10px;
  padding: 20px;
  pointer-events: none;
}
.blog-card-body time {
  color: var(--text-muted);
  font-size: 12px;
}
.blog-card-body h2 {
  margin: 0;
  color: var(--ink);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.blog-card-body p {
  min-height: 40px;
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.6;
}

/* Read more link */
.blog-read-more,
.blog-back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
}
.blog-read-more {
  position: relative;
  padding-bottom: 5px;
  transition: color 180ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.blog-read-more::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.blog-read-more svg {
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.blog-card:not(.blog-skeleton):hover .blog-read-more,
.blog-card:not(.blog-skeleton):focus-within .blog-read-more {
  color: var(--accent-dark);
  transform: translateY(-1px);
}
.blog-card:not(.blog-skeleton):hover .blog-read-more::after,
.blog-card:not(.blog-skeleton):focus-within .blog-read-more::after {
  transform: scaleX(1);
}
.blog-card:not(.blog-skeleton):hover .blog-read-more svg,
.blog-card:not(.blog-skeleton):focus-within .blog-read-more svg {
  transform: translateX(3px);
}

/* Hit area (full-card clickable overlay) */
.blog-card-hit-area {
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  color: transparent;
  text-decoration: none;
}
.blog-card-hit-area:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 55%, transparent);
  outline-offset: -5px;
}

/* Pagination */
.blog-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 36px;
}
.blog-pagination span {
  color: var(--ink-soft);
  font-size: 13px;
}
.blog-pagination-btn {
  padding: 8px 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
}
.blog-pagination-btn:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.blog-pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Empty state */
.blog-empty {
  padding: 48px 20px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink-soft);
  text-align: center;
}

/* ── Blog — skeleton loading ── */
.blog-skeleton {
  padding-bottom: 20px;
}
.blog-skeleton-cover {
  aspect-ratio: 16 / 9;
  background: var(--line-2);
  animation: blog-pulse 1.2s ease-in-out infinite;
}
.blog-skeleton-line {
  height: 12px;
  margin: 14px 20px 0;
  border-radius: 4px;
  background: var(--line-2);
  animation: blog-pulse 1.2s ease-in-out infinite;
}
.blog-skeleton-line.short { width: 30%; }
.blog-skeleton-line.title { width: 70%; height: 25px; }
@keyframes blog-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ── Blog — single post page ── */
.blog-post-page {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 48px 0 80px;
}
.blog-back-link {
  transition: color 180ms ease;
}
.blog-back-link:hover {
  color: var(--accent-dark);
}

/* Loading spinner */
.blog-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--ink-soft);
  font-size: 14px;
}
.blog-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: blog-spin 0.7s linear infinite;
}
@keyframes blog-spin {
  to { transform: rotate(360deg); }
}

/* Article layout */
.blog-post-article {
  display: grid;
  gap: 0;
}
.blog-post-header {
  width: min(720px, 100%);
  margin: 32px auto;
}
.blog-post-header h1 {
  margin: 0 0 16px;
  color: var(--ink);
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.blog-post-header p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
}
.blog-post-cover {
  width: min(720px, 100%);
  max-height: 520px;
  display: block;
  margin: 0 auto 44px;
  border-radius: 12px;
  object-fit: cover;
  outline: 1px solid rgba(0, 0, 0, 0.08);
  outline-offset: -1px;
}

/* Detail layout (with sidebar) */
.blog-post-detail-layout {
  width: min(720px, 100%);
  margin: 0 auto;
}
.blog-post-detail-layout.has-sidebar {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 720px) minmax(280px, 332px);
  gap: clamp(28px, 3.6vw, 44px);
  align-items: start;
  justify-content: center;
}
.blog-post-detail-layout.has-sidebar > .blog-post-header,
.blog-post-detail-layout.has-sidebar > .blog-post-cover {
  grid-column: 1 / -1;
  width: 100%;
  max-width: none;
  margin-left: 0;
  margin-right: 0;
}
.blog-post-detail-layout.has-sidebar > .blog-post-header {
  margin-top: 32px;
  margin-bottom: 24px;
}
.blog-post-detail-layout.has-sidebar > .blog-post-cover {
  margin-top: 0;
  margin-bottom: 44px;
}
.blog-post-main {
  min-width: 0;
}

/* Sidebar */
.blog-post-sidebar {
  position: sticky;
  top: 28px;
  align-self: start;
  display: grid;
  gap: 20px;
}
.blog-post-sidebar-section {
  display: grid;
  gap: 10px;
}
.blog-post-sidebar-label {
  margin: 0;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
  text-wrap: balance;
}
.blog-post-sidebar-stack {
  display: grid;
  gap: 10px;
}
.blog-post-sidebar-card {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 16px 16px 16px 18px;
  border-radius: 18px;
  background: var(--paper);
  color: var(--ink);
  text-decoration: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06),
    0 1px 2px -1px rgba(0, 0, 0, 0.06),
    0 2px 4px 0 rgba(0, 0, 0, 0.04);
  transition: transform 180ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 180ms cubic-bezier(0.2, 0, 0, 1),
    background-color 180ms cubic-bezier(0.2, 0, 0, 1);
  will-change: transform;
}
.blog-post-sidebar-card:hover,
.blog-post-sidebar-card:focus-visible {
  background: color-mix(in srgb, var(--accent) 3%, var(--paper));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent),
    0 12px 28px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.blog-post-sidebar-card:focus-visible { outline: none; }
.blog-post-sidebar-card:active { transform: scale(0.96); }
.blog-post-sidebar-card-eyebrow {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
}
.blog-post-sidebar-card-title {
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.22;
  text-wrap: balance;
}
.blog-post-sidebar-card-body {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}
.blog-post-sidebar-card-arrow {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  justify-self: end;
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
  color: var(--accent);
  transition: transform 220ms cubic-bezier(0.2, 0, 0, 1),
    background-color 220ms cubic-bezier(0.2, 0, 0, 1);
}
.blog-post-sidebar-card-arrow-inner {
  display: grid;
  place-items: center;
  transition: transform 220ms cubic-bezier(0.2, 0, 0, 1);
}
.blog-post-sidebar-card:hover .blog-post-sidebar-card-arrow,
.blog-post-sidebar-card:focus-visible .blog-post-sidebar-card-arrow {
  background: color-mix(in srgb, var(--accent) 12%, var(--paper));
}
.blog-post-sidebar-card:hover .blog-post-sidebar-card-arrow-inner,
.blog-post-sidebar-card:focus-visible .blog-post-sidebar-card-arrow-inner {
  transform: translateX(2px);
}

/* ── Blog — prev/next navigation ── */
.blog-post-nav {
  display: grid;
  gap: 10px;
  margin-top: 40px;
}
.blog-post-nav-inline {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: nowrap;
  width: 100%;
}
.blog-post-nav-inline:not(:has(.is-previous-link)):has(.is-next-link) {
  justify-content: flex-end;
}
.blog-post-nav-inline .blog-post-nav-link {
  flex: 0 1 auto;
  min-width: 0;
}
.blog-post-nav-inline .blog-post-nav-link.is-previous-link,
.blog-post-nav-inline .blog-post-nav-link.is-next-link {
  width: fit-content;
  max-width: min(100%, 420px);
}
.blog-post-nav-inline .blog-post-nav-link.is-return-link {
  min-width: 210px;
  flex: 0 0 auto;
}
.blog-post-nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 14px 14px 14px 16px;
  border-radius: 16px;
  background: var(--paper);
  color: var(--accent);
  text-decoration: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06),
    0 1px 2px -1px rgba(0, 0, 0, 0.06),
    0 2px 4px 0 rgba(0, 0, 0, 0.04);
  transition: transform 180ms cubic-bezier(0.2, 0, 0, 1),
    box-shadow 180ms cubic-bezier(0.2, 0, 0, 1),
    color 180ms cubic-bezier(0.2, 0, 0, 1),
    background-color 180ms cubic-bezier(0.2, 0, 0, 1);
  will-change: transform;
}
.blog-post-nav-link:hover,
.blog-post-nav-link:focus-visible {
  color: var(--accent-dark);
  background: color-mix(in srgb, var(--accent) 3%, var(--paper));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent),
    0 10px 24px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.blog-post-nav-link:focus-visible { outline: none; }
.blog-post-nav-link:active { transform: scale(0.96); }
.blog-post-nav-copy {
  min-width: 0;
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-wrap: pretty;
}
.blog-post-nav-label,
.blog-post-nav-title {
  color: inherit;
}
.blog-post-nav-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
  color: currentColor;
  transition: transform 220ms cubic-bezier(0.2, 0, 0, 1),
    background-color 220ms cubic-bezier(0.2, 0, 0, 1);
}
.blog-post-nav-icon-inner {
  display: grid;
  place-items: center;
  transition: transform 220ms cubic-bezier(0.2, 0, 0, 1);
}
.blog-post-nav-link:hover .blog-post-nav-icon,
.blog-post-nav-link:focus-visible .blog-post-nav-icon {
  background: color-mix(in srgb, var(--accent) 12%, var(--paper));
}
.blog-post-nav-link:hover .blog-post-nav-icon-inner,
.blog-post-nav-link:focus-visible .blog-post-nav-icon-inner {
  transform: translateX(2px);
}

/* ── Blog — rich content (rendered HTML from CMS) ── */
.blog-content {
  width: min(720px, 100%);
  margin: 0;
  color: var(--ink);
  font-size: 17px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.blog-content h2 {
  margin: 38px 0 14px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.15;
}
.blog-content h3 {
  margin: 30px 0 12px;
  font-size: 21px;
  font-weight: 700;
}
.blog-content p { margin: 0 0 18px; }
.blog-content ul,
.blog-content ol { padding-left: 26px; }
.blog-content blockquote {
  margin: 26px 0;
  padding: 4px 0 4px 18px;
  border-left: 4px solid var(--accent);
  color: var(--ink-soft);
}
.blog-content a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.blog-content a:hover {
  color: var(--accent-dark);
}
.blog-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 18px 0;
}
.blog-content pre {
  padding: 16px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--paper);
  font-size: 14px;
  overflow-x: auto;
}
.blog-content code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  font-size: 0.9em;
}
.blog-content pre code {
  padding: 0;
  background: transparent;
}

/* ── Blog — responsive ── */
@media (max-width: 767px) {
  .blog-grid {
    grid-template-columns: 1fr;
  }
  .blog-list-page,
  .blog-post-page {
    width: min(100% - 32px, 720px);
    padding-top: 40px;
  }
  .blog-pagination {
    gap: 10px;
    justify-content: space-between;
  }
  .blog-post-detail-layout.has-sidebar {
    width: min(720px, 100%);
    grid-template-columns: 1fr;
  }
  .blog-post-sidebar {
    position: static;
    top: auto;
    margin-top: 42px;
  }
  .blog-post-nav-inline {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .blog-post-nav-inline .blog-post-nav-link,
  .blog-post-nav-inline .blog-post-nav-link.is-return-link {
    width: auto;
    min-width: 0;
  }
  .blog-post-nav-inline .blog-post-nav-link {
    padding-left: 12px;
    padding-right: 12px;
  }
  .blog-post-nav-inline .blog-post-nav-copy {
    display: inline-flex;
    align-items: center;
    gap: 0;
    justify-content: center;
    text-align: center;
  }
  .blog-post-nav-inline .blog-post-nav-title {
    display: none;
  }
}

@media (max-width: 480px) {
  .blog-pagination { flex-wrap: wrap; }
  .blog-card-body h2 { font-size: 18px; }
}
```

### Reglas OBLIGATORIAS:
1. **NO hardcodear ningún color** — todo debe usar `var(--token)` o `color-mix(in srgb, var(--token) X%, ...)`.
2. **Usar `--paper` como fondo** (no `#fff` ni `white`).
3. **Usar `--ink` para texto principal** (no `#000` ni `black`).
4. **Usar `--accent` para enlaces y acentos** (no hardcodear naranja).
5. **Mantener las mismas animaciones/transiciones** que en Util (cubic-bezier curves, durations).
6. **Responsive**: breakpoint principal en `767px`, secundario en `480px`.
7. **El sidebar debe ser `position: sticky`** en desktop y `position: static` en mobile.
8. **Skeleton loading** debe usar `--line-2` para el color de fondo.
9. **Las excepciones a tokens** (error red `#dc3545`, sombras con `rgba()`) son aceptables porque no son colores temáticos.

---

## Resumen de archivos a crear/modificar:

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `app/blog/page.js` | **Crear** — listing page |
| 2 | `app/blog/[slug]/page.js` | **Crear** — detail page |
| 3 | `styles/globals.css` | **Agregar al final** — todos los `.blog-*` styles |

**No tocar el backend** — las rutas `GET /api/blog` y `GET /api/blog/:slug` ya existen y funcionan.

**Verificación**: después de ejecutar los 3 prompts, abrir `http://localhost:3000/blog` con el backend corriendo en puerto 4000.
