# Link in Bio — Página Principal (`/links`)

Este prompt crea la página pública de Link in Bio para ienyell. Es una página que funciona como hub de navegación por intención del usuario. Tiene dos zonas: un carrusel automático que destaca contenido (último video, último proyecto, novela activa, producto más vendido) y una sección de botones de intención ("¿Qué buscas?") que dirigen al usuario según su necesidad.

**Este es un proyecto Next.js App Router.** Directiva `'use client'` en todo componente con estado o efectos. Los CSS usan tokens de `:root` definidos en `styles/globals.css` (`--paper`, `--ink`, `--ink-2`, `--ink-soft`, `--text-muted`, `--line`, `--surface`, `--accent`, `--accent-dark`, `--accent-tint`). Todos los estilos van con prefijo `.lib-` (link-in-bio). La fuente es Inter.

**IMPORTANTE — Header, Footer y menú:**
- El `app/layout.js` ya incluye `<Header />`, `<Footer />`, `<ScrollToTop />` y `<Offcanvas />` automáticamente en TODAS las páginas. **NO crear** header, footer, ni menú hamburguesa en esta página. Solo crear el contenido interno (`children` del layout).
- El Header existente ya tiene el logo enyell, navegación y el trigger del Offcanvas (menú lateral). Todo eso ya funciona.
- El Footer existente ya tiene los íconos de redes sociales y el copyright.

**Ejecutar en orden: 1 → 2 → 3 → 4.**

---

## Prompt 1 — Archivo de datos del Link in Bio

Crea `data/linkInBioConfig.js` — la configuración estática del carrusel y los botones de intención.

### Estructura exacta:

```js
/**
 * Configuración del Link in Bio.
 * Cada slide del carrusel y cada botón de intención se define aquí.
 * En el futuro esto vendrá del admin/API; por ahora es estático.
 */

// ── Slides del carrusel ──
// Cada slide tiene: id, type, active (boolean para mostrar/ocultar)
// y campos específicos según el type.

export const carouselSlides = [
  {
    id: 'last-video',
    type: 'video',
    active: true,
    label: 'Last video',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // placeholder — cambiar por URL real
    thumbnailUrl: '', // opcional: si vacío, muestra el embed directamente
    cta: { text: 'Subscribe to my channel', url: 'https://youtube.com/@ienyell' },
  },
  {
    id: 'last-project',
    type: 'project',
    active: true,
    label: 'Last project',
    title: 'Project Name',
    date: '2026-09-01',
    imageUrl: '', // dejar vacío para mostrar placeholder gris
    cta: { text: 'Explore my projects', url: '/work' },
  },
  {
    id: 'active-novel',
    type: 'novel',
    active: true,
    label: 'Active novel',
    bookName: 'Book Name',
    bookSinopsis: 'A short synopsis of the current novel...',
    bookGenre: 'Fantasy',
    bookSaga: 'Saga Name',
    bookWarning: 'Content warning if applicable',
    nextDate: '2026-10-15',
    coverUrl: '', // dejar vacío para mostrar placeholder gris
    cta: { text: 'Start to read', url: '#' },
  },
  {
    id: 'best-seller',
    type: 'product',
    active: true,
    label: 'Best Seller',
    productName: 'Product Name',
    productPrice: '$25.00',
    imageUrl: '', // dejar vacío para mostrar placeholder gris
    cta: { text: 'See information', url: '#' },
  },
];

// ── Botones de intención ──
// Cada botón tiene: id, icon (nombre de ícono SVG inline), title, subtitle,
// href (destino), active (boolean para mostrar/ocultar desde admin), order.
//
// ICONOS: Cada botón usa un ícono SVG inline definido más abajo en INTENTION_ICONS.
// Los íconos son conceptuales (no logos de plataformas).

export const intentionButtons = [
  {
    id: 'social-media',
    iconKey: 'play',
    title: "I'm looking for your social media.",
    subtitle: "Find my content's channels, portfolios, and shop.",
    href: '/links/social',
    active: true,
    order: 0,
    variant: 'featured', // card con fondo accent (naranja)
  },
  {
    id: 'work-with-you',
    iconKey: 'briefcase',
    title: 'I want to work with you.',
    subtitle: 'Commissions, services, and freelance work.',
    href: '/links/work',
    active: true,
    order: 1,
    variant: 'default',
  },
  {
    id: 'learn-from-you',
    iconKey: 'graduation',
    title: 'I want to learn from you.',
    subtitle: 'Tutorials, courses, and educational content.',
    href: '/links/learn',
    active: true,
    order: 2,
    variant: 'default',
  },
  {
    id: 'support-your-work',
    iconKey: 'heart',
    title: 'I want to support your work.',
    subtitle: 'Donations, subscriptions, and memberships.',
    href: '/links/support',
    active: true,
    order: 3,
    variant: 'default',
  },
  {
    id: 'read-stories',
    iconKey: 'book',
    title: 'I want to read your stories.',
    subtitle: 'Novels, short stories, and ongoing series.',
    href: '/links/stories',
    active: true,
    order: 4,
    variant: 'default',
  },
  {
    id: 'know-universe',
    iconKey: 'globe',
    title: 'I want to know the universe',
    subtitle: 'Read a resume of my fictional universe and know how every story is connected.',
    href: '/links/universe',
    active: true,
    order: 5,
    variant: 'highlight', // card con fondo más claro (--surface)
  },
  {
    id: 'store',
    iconKey: 'cart',
    title: "I'm looking for your store.",
    subtitle: 'Prints, merchandise, and digital products.',
    href: '/links/store',
    active: true,
    order: 6,
    variant: 'default',
  },
  {
    id: 'know-you',
    iconKey: 'person',
    title: 'I want to know you',
    subtitle: 'About me, my journey, and my creative process.',
    href: '/about',
    active: true,
    order: 7,
    variant: 'default',
  },
  {
    id: 'stay-in-touch',
    iconKey: 'chat',
    title: 'I want to stay in touch with you.',
    subtitle: 'Contact forms, email, and direct messages.',
    href: '/links/contact',
    active: true,
    order: 8,
    variant: 'default',
  },
];

// ── Íconos SVG inline para los botones de intención ──
// Cada ícono es un path SVG dentro de un viewBox 24x24.
// Se renderizan como <svg> inline dentro del componente IntentionCard.

export const INTENTION_ICONS = {
  play: {
    viewBox: '0 0 24 24',
    paths: '<path d="M5 3l14 9-14 9V3z" fill="currentColor"/>',
  },
  briefcase: {
    viewBox: '0 0 24 24',
    paths: '<rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  },
  graduation: {
    viewBox: '0 0 24 24',
    paths: '<path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="currentColor"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="currentColor"/>',
  },
  heart: {
    viewBox: '0 0 24 24',
    paths: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor"/>',
  },
  book: {
    viewBox: '0 0 24 24',
    paths: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  globe: {
    viewBox: '0 0 24 24',
    paths: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  },
  cart: {
    viewBox: '0 0 24 24',
    paths: '<circle cx="9" cy="21" r="1" fill="currentColor"/><circle cx="20" cy="21" r="1" fill="currentColor"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  person: {
    viewBox: '0 0 24 24',
    paths: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  },
  chat: {
    viewBox: '0 0 24 24',
    paths: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="currentColor"/>',
  },
};
```

### Archivo a crear:
| Archivo | Contenido |
|---------|-----------|
| `data/linkInBioConfig.js` | Configuración de carrusel, botones de intención, íconos SVG |

### Notas:
- Las URLs de redes sociales y contenido son **placeholders** — el usuario las cambiará después.
- Las imágenes de los slides están vacías (`''`). El componente mostrará un placeholder gris con ícono cuando la URL está vacía o la imagen no carga.
- El campo `variant` en los botones controla el estilo visual: `featured` = fondo naranja (--accent), `highlight` = fondo claro (--surface), `default` = fondo oscuro (--ink).
- **NO** hay `socialFooterIcons` aquí — el Footer existente ya tiene las redes sociales.

---

## Prompt 2 — Componente de Carrusel (`LinkInBioCarousel`)

Crea `components/linkinbio/LinkInBioCarousel.jsx` — el carrusel automático que rota entre los slides activos.

### Requisitos técnicos exactos:

1. **Directiva**: `'use client'`
2. **Imports**:
   - `{ useState, useEffect, useCallback, useRef }` de `react`
   - `Image` de `next/image`
   - `Link` de `next/link`

3. **Props**: `slides` (array de slides filtrados, solo los que tienen `active: true`)

4. **Estado**:
   - `currentIndex` (number, inicia en 0)
   - `isPaused` (boolean, inicia en false) — pausa la rotación si el usuario interactúa

5. **Auto-rotación**:
   - Intervalo de **5 segundos** entre slides
   - Se pausa cuando `isPaused` es `true` o cuando el componente no está visible (usar `document.hidden`)
   - Reinicia el timer cuando el usuario navega manualmente (flechas o indicadores)
   ```js
   useEffect(() => {
     if (isPaused || slides.length <= 1) return;
     const timer = setInterval(() => {
       setCurrentIndex(prev => (prev + 1) % slides.length);
     }, 5000);
     return () => clearInterval(timer);
   }, [isPaused, slides.length, currentIndex]);
   ```

6. **Navegación manual**:
   - Flechas `<` y `>` a los lados del carrusel (solo si hay más de 1 slide)
   - `goTo(index)` — navega al slide específico
   - `goNext()` / `goPrev()` — navega al siguiente/anterior con wrap-around
   - Al navegar manualmente, pausar auto-rotación por 10 segundos:
     ```js
     const pauseTimerRef = useRef(null);
     const pauseAutoPlay = useCallback(() => {
       setIsPaused(true);
       clearTimeout(pauseTimerRef.current);
       pauseTimerRef.current = setTimeout(() => setIsPaused(false), 10000);
     }, []);
     ```

7. **Indicadores**: dots debajo del carrusel, uno por slide, el activo resaltado con `--accent`

8. **Transición**: CSS `transform: translateX(...)` con `transition: transform 500ms ease`

9. **Renderizado por tipo de slide** — función `renderSlide(slide)` que retorna JSX según `slide.type`:

   **type === 'video'**:
   ```jsx
   <div className="lib-slide lib-slide-video">
     <h3 className="lib-slide-label">{slide.label}</h3>
     <div className="lib-slide-media">
       <iframe
         src={slide.videoUrl}
         title={slide.label}
         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
         allowFullScreen
         className="lib-slide-iframe"
       />
     </div>
     <Link href={slide.cta.url} className="lib-slide-cta" target="_blank" rel="noopener noreferrer">
       {slide.cta.text}
     </Link>
   </div>
   ```

   **type === 'project'**:
   ```jsx
   <div className="lib-slide lib-slide-project">
     <h3 className="lib-slide-label">{slide.label}</h3>
     <div className="lib-slide-media">
       {slide.imageUrl ? (
         <Image src={slide.imageUrl} alt={slide.title} width={600} height={340} className="lib-slide-img" />
       ) : (
         <div className="lib-slide-placeholder">
           <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="var(--text-muted)"/><path d="M21 15l-5-5L5 21"/></svg>
         </div>
       )}
     </div>
     <p className="lib-slide-title">{slide.title}</p>
     <p className="lib-slide-date">{new Date(slide.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
     <Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link>
   </div>
   ```

   **type === 'novel'**:
   ```jsx
   <div className="lib-slide lib-slide-novel">
     <h3 className="lib-slide-label">{slide.label}</h3>
     <div className="lib-slide-media lib-slide-novel-cover">
       {slide.coverUrl ? (
         <Image src={slide.coverUrl} alt={slide.bookName} width={600} height={340} className="lib-slide-img" />
       ) : (
         <div className="lib-slide-placeholder">
           <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
         </div>
       )}
     </div>
     <div className="lib-slide-novel-meta">
       <p className="lib-slide-title">{slide.bookName}</p>
       <p className="lib-slide-detail">{slide.bookSinopsis}</p>
       <p className="lib-slide-detail"><strong>Genre:</strong> {slide.bookGenre}</p>
       <p className="lib-slide-detail"><strong>Saga:</strong> {slide.bookSaga}</p>
       {slide.bookWarning && <p className="lib-slide-detail lib-slide-warning">{slide.bookWarning}</p>}
       <p className="lib-slide-date"><strong>Next:</strong> {new Date(slide.nextDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
     </div>
     <Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link>
   </div>
   ```

   **type === 'product'**:
   ```jsx
   <div className="lib-slide lib-slide-product">
     <h3 className="lib-slide-label">{slide.label}</h3>
     <div className="lib-slide-media">
       {slide.imageUrl ? (
         <Image src={slide.imageUrl} alt={slide.productName} width={600} height={340} className="lib-slide-img" />
       ) : (
         <div className="lib-slide-placeholder">
           <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
         </div>
       )}
     </div>
     <div className="lib-slide-product-info">
       <p className="lib-slide-title">{slide.productName}</p>
       <p className="lib-slide-price">{slide.productPrice}</p>
     </div>
     <Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link>
   </div>
   ```

10. **Render principal**:
    ```jsx
    <div className="lib-carousel" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      {slides.length > 1 && (
        <button className="lib-carousel-arrow lib-carousel-arrow-left" onClick={() => { goPrev(); pauseAutoPlay(); }} aria-label="Previous slide">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}

      <div className="lib-carousel-track-wrapper">
        <div className="lib-carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {slides.map((slide) => (
            <div key={slide.id} className="lib-carousel-slide">
              {renderSlide(slide)}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <button className="lib-carousel-arrow lib-carousel-arrow-right" onClick={() => { goNext(); pauseAutoPlay(); }} aria-label="Next slide">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {slides.length > 1 && (
        <div className="lib-carousel-dots">
          {slides.map((_, i) => (
            <button key={i} className={`lib-carousel-dot ${i === currentIndex ? 'active' : ''}`} onClick={() => { goTo(i); pauseAutoPlay(); }} aria-label={`Go to slide ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
    ```

### Archivo a crear:
| Archivo | Contenido |
|---------|-----------|
| `components/linkinbio/LinkInBioCarousel.jsx` | Carrusel auto-rotativo con 4 tipos de slide |

---

## Prompt 3 — Página `/links` y componente `IntentionCard`

### Paso A — Crear `components/linkinbio/IntentionCard.jsx`

Card individual de cada botón de intención.

1. **Directiva**: `'use client'`
2. **Imports**:
   - `Link` de `next/link`
   - `{ INTENTION_ICONS }` de `../../data/linkInBioConfig`

3. **Props**: `{ iconKey, title, subtitle, href, variant = 'default' }`

4. **Lógica del ícono**:
   ```js
   const icon = INTENTION_ICONS[iconKey];
   ```

5. **Clases CSS por variant**:
   - `default` → `.lib-intention-card .lib-intention-default` (fondo `--ink`, texto blanco)
   - `featured` → `.lib-intention-card .lib-intention-featured` (fondo `--accent`, texto blanco)
   - `highlight` → `.lib-intention-card .lib-intention-highlight` (fondo `--surface`, texto `--ink`)

6. **Render**:
   ```jsx
   <Link href={href} className={`lib-intention-card lib-intention-${variant}`}>
     <span className="lib-intention-icon">
       {icon && (
         <svg viewBox={icon.viewBox} width="20" height="20" dangerouslySetInnerHTML={{ __html: icon.paths }} />
       )}
     </span>
     <div className="lib-intention-text">
       <strong className="lib-intention-title">{title}</strong>
       <span className="lib-intention-subtitle">{subtitle}</span>
     </div>
     <span className="lib-intention-arrow">
       <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
     </span>
   </Link>
   ```

**Nota sobre `dangerouslySetInnerHTML`**: los paths SVG vienen de `INTENTION_ICONS` que es un archivo local controlado, no contenido de usuario. Es seguro.

### Paso B — Crear `app/links/page.js`

La página principal del Link in Bio. **NO incluye header, footer ni menú** — esos ya vienen del `layout.js` global.

1. **Directiva**: `'use client'`
2. **Imports**:
   - `LinkInBioCarousel` de `../../components/linkinbio/LinkInBioCarousel`
   - `IntentionCard` de `../../components/linkinbio/IntentionCard`
   - `Link` de `next/link`
   - `{ carouselSlides, intentionButtons }` de `../../data/linkInBioConfig`

3. **Lógica**:
   ```js
   const activeSlides = carouselSlides.filter(s => s.active);
   const activeButtons = intentionButtons
     .filter(b => b.active)
     .sort((a, b) => a.order - b.order);
   ```

4. **Render** — solo el contenido, sin header ni footer:
   ```jsx
   <main className="lib-page">
     {/* ── CTA principal ── */}
     <div className="lib-main-cta-wrap">
       <Link href="/services" className="lib-main-cta">
         REQUEST A COMMISSION
       </Link>
     </div>

     {/* ── Carrusel ── */}
     {activeSlides.length > 0 && (
       <section className="lib-carousel-section">
         <LinkInBioCarousel slides={activeSlides} />
       </section>
     )}

     {/* ── Botones de intención ── */}
     <section className="lib-intentions-section">
       <h2 className="lib-intentions-title">What do you want?</h2>
       <div className="lib-intentions-list">
         {activeButtons.map(btn => (
           <IntentionCard
             key={btn.id}
             iconKey={btn.iconKey}
             title={btn.title}
             subtitle={btn.subtitle}
             href={btn.href}
             variant={btn.variant}
           />
         ))}
       </div>
     </section>
   </main>
   ```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `components/linkinbio/IntentionCard.jsx` | Card de intención con ícono SVG, título, subtítulo, flecha |
| `app/links/page.js` | Página del Link in Bio (solo contenido, sin header/footer) |

---

## Prompt 4 — CSS del Link in Bio (agregar a `styles/globals.css`)

Agrega estos estilos **al final** de `styles/globals.css`. Todos con prefijo `.lib-` (link-in-bio).

```css
/* ══════════════════════════════════════════════════
   Link in Bio — Public Page
   ══════════════════════════════════════════════════ */

/* ── Page container ── */
.lib-page {
  width: min(600px, 100%);
  margin: 0 auto;
  padding: 24px 20px 60px;
}

/* ── Main CTA ── */
.lib-main-cta-wrap {
  margin-bottom: 32px;
}
.lib-main-cta {
  display: block;
  text-align: center;
  padding: 14px 24px;
  background: transparent;
  color: var(--accent);
  border: 2px solid var(--accent);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background 200ms ease, color 200ms ease;
}
.lib-main-cta:hover {
  background: var(--accent);
  color: var(--paper);
}

/* ── Carousel ── */
.lib-carousel-section {
  margin-bottom: 40px;
}
.lib-carousel {
  position: relative;
}
.lib-carousel-track-wrapper {
  overflow: hidden;
  border-radius: 8px;
}
.lib-carousel-track {
  display: flex;
  transition: transform 500ms ease;
}
.lib-carousel-slide {
  min-width: 100%;
  flex-shrink: 0;
}

/* ── Carousel arrows ── */
.lib-carousel-arrow {
  position: absolute;
  top: 45%;
  transform: translateY(-50%);
  z-index: 2;
  background: none;
  border: none;
  color: var(--ink);
  padding: 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 200ms ease;
}
.lib-carousel-arrow:hover { opacity: 1; }
.lib-carousel-arrow-left { left: -36px; }
.lib-carousel-arrow-right { right: -36px; }

/* ── Carousel dots ── */
.lib-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 0;
}
.lib-carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: var(--line);
  cursor: pointer;
  padding: 0;
  transition: background 200ms ease, transform 200ms ease;
}
.lib-carousel-dot.active {
  background: var(--accent);
  transform: scale(1.25);
}

/* ── Slide common ── */
.lib-slide {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lib-slide-label {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.lib-slide-media {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}
.lib-slide-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
.lib-slide-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lib-slide-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--text-muted);
}
.lib-slide-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.lib-slide-date {
  font-size: 13px;
  color: var(--text-muted);
}
.lib-slide-detail {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.4;
}
.lib-slide-warning {
  color: var(--accent-dark);
  font-style: italic;
}
.lib-slide-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
}
.lib-slide-cta {
  display: inline-block;
  padding: 10px 20px;
  background: var(--ink);
  color: var(--paper);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  transition: background 200ms ease;
  align-self: flex-start;
}
.lib-slide-cta:hover {
  background: var(--ink-2);
}

/* ── Slide: product info row ── */
.lib-slide-product-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ── Slide: novel metadata ── */
.lib-slide-novel-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Intentions section ── */
.lib-intentions-section {
  padding-top: 8px;
}
.lib-intentions-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
  margin-bottom: 20px;
}
.lib-intentions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Intention card ── */
.lib-intention-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.lib-intention-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.lib-intention-card:active {
  transform: scale(0.98);
}

/* ── Intention card variants ── */

/* Default: fondo oscuro, texto blanco */
.lib-intention-default {
  background: var(--ink);
  color: var(--paper);
}
.lib-intention-default .lib-intention-icon {
  background: rgba(255, 255, 255, 0.1);
  color: var(--paper);
}
.lib-intention-default .lib-intention-subtitle {
  color: rgba(255, 255, 255, 0.6);
}
.lib-intention-default .lib-intention-arrow {
  color: rgba(255, 255, 255, 0.4);
}

/* Featured: fondo naranja, texto blanco */
.lib-intention-featured {
  background: var(--accent);
  color: var(--paper);
}
.lib-intention-featured .lib-intention-icon {
  background: rgba(255, 255, 255, 0.2);
  color: var(--paper);
}
.lib-intention-featured .lib-intention-subtitle {
  color: rgba(255, 255, 255, 0.75);
}
.lib-intention-featured .lib-intention-arrow {
  color: rgba(255, 255, 255, 0.5);
}

/* Highlight: fondo claro, texto oscuro */
.lib-intention-highlight {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
}
.lib-intention-highlight .lib-intention-icon {
  background: var(--accent-tint);
  color: var(--accent);
}
.lib-intention-highlight .lib-intention-subtitle {
  color: var(--text-muted);
}
.lib-intention-highlight .lib-intention-arrow {
  color: var(--text-muted);
}

/* ── Intention card inner elements ── */
.lib-intention-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.lib-intention-icon svg {
  width: 18px;
  height: 18px;
}
.lib-intention-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lib-intention-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}
.lib-intention-subtitle {
  font-size: 12px;
  line-height: 1.4;
}
.lib-intention-arrow {
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

/* ── Desktop: dos columnas para botones de intención ── */
@media (min-width: 768px) {
  .lib-page {
    width: min(900px, calc(100% - 48px));
    padding: 40px 24px 80px;
  }
  .lib-main-cta-wrap {
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 48px;
  }
  .lib-carousel-section {
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 56px;
  }
  .lib-intentions-title {
    font-size: 26px;
    margin-bottom: 28px;
  }
  .lib-intentions-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .lib-intention-card {
    padding: 20px;
  }
  .lib-intention-title {
    font-size: 15px;
  }
  .lib-intention-subtitle {
    font-size: 13px;
  }
}

/* ── Large desktop: tres columnas ── */
@media (min-width: 1100px) {
  .lib-page {
    width: min(1100px, calc(100% - 64px));
  }
  .lib-intentions-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ── Mobile: flechas del carrusel dentro del contenedor ── */
@media (max-width: 500px) {
  .lib-carousel-arrow-left { left: 4px; }
  .lib-carousel-arrow-right { right: 4px; }
  .lib-carousel-arrow {
    background: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    padding: 0;
  }
}
```

### Archivo a modificar:
| Archivo | Cambio |
|---------|--------|
| `styles/globals.css` | **Agregar al final** — estilos del Link in Bio (~280 líneas) |

---

## Resumen de TODOS los archivos:

| # | Prompt | Archivo | Acción |
|---|--------|---------|--------|
| 1 | P1 | `data/linkInBioConfig.js` | **Crear** |
| 2 | P2 | `components/linkinbio/LinkInBioCarousel.jsx` | **Crear** |
| 3 | P3-A | `components/linkinbio/IntentionCard.jsx` | **Crear** |
| 4 | P3-B | `app/links/page.js` | **Crear** |
| 5 | P4 | `styles/globals.css` | **Agregar al final** |

## Lo que NO se toca:

- **`components/Header.jsx`** — ya existe, ya tiene logo + Offcanvas trigger (menú)
- **`components/Footer.jsx`** — ya existe, ya tiene redes sociales + copyright
- **`app/layout.js`** — ya incluye Header, Footer, Offcanvas en todas las páginas

## Después de ejecutar estos prompts:

Abrir `http://localhost:3000/links` y deberías ver:
1. **Header del sitio** (el que ya existe, con logo y menú hamburguesa funcional)
2. Botón naranja "REQUEST A COMMISSION"
3. Carrusel auto-rotativo con 4 slides (video, proyecto, novela, producto)
4. Sección "What do you want?" con 9 botones de intención
5. **Footer del sitio** (el que ya existe, con redes sociales y copyright)

**En desktop (≥768px)**: los botones se muestran en 2 columnas. En ≥1100px: 3 columnas. El carrusel y CTA se centran con max-width.

**En mobile (<500px)**: las flechas del carrusel se muestran sobre la imagen con fondo semitransparente.

## Íconos de intención — dónde reemplazarlos:

Los íconos de los botones están en `data/linkInBioConfig.js` dentro de `INTENTION_ICONS`. Son SVG paths inline dentro de un viewBox 24x24. Si querés reemplazar alguno por un ícono propio:

1. Abrir el SVG del ícono que querés usar
2. Copiar el contenido dentro del `<svg>` (los `<path>`, `<circle>`, `<rect>`, etc.)
3. Pegarlo en el campo `paths` del ícono correspondiente en `INTENTION_ICONS`
4. Ajustar el `viewBox` si es diferente a `0 0 24 24`
