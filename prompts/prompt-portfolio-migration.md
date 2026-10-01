# Portfolio System Migration — Prompts for ienyell

> El backend (Prisma schema, controller, rutas) ya está migrado desde Util.
> Solo falta crear las páginas frontend en Next.js App Router.
> Estos prompts están diseñados para ejecutarse EN ORDEN.

---

## PROMPT 1 — Página de galería del portfolio (`/work`)

### Contexto del proyecto

Estoy migrando un sistema de portfolio de una app React+Vite (Util) a un proyecto Next.js App Router (ienyell). El backend ya existe en `backend/src/controllers/portfolioController.js` con Prisma, y expone:

- `GET /api/portfolio/categories` → `{ categories: [{ id, slug, label, icon, order }] }`
- `GET /api/portfolio/projects` → `{ projects: [{ id, slug, title, client, date, summary, coverUrl, categories, aspectRatio, ... }] }`
- `GET /api/portfolio/projects/:slug` → `{ project: { ...all fields... } }`

El backend corre en un puerto separado (Express). El frontend Next.js se comunica con él vía fetch.

### Tarea

Crea la página `app/work/page.js` con una vista de galería tipo masonry. Debe ser un componente `'use client'` que:

1. **Fetch de datos**: Al montar, hace `fetch` a las dos rutas del backend (`/api/portfolio/categories` y `/api/portfolio/projects`). Usa `Promise.all`. El base URL del backend debe leerse de `process.env.NEXT_PUBLIC_API_URL` (ej: `http://localhost:4000`). Muestra un estado de carga mientras esperan.

2. **Layout de la galería** — replica este diseño:
   - **Eyebrow**: texto "PORTFOLIO" en uppercase, tracking ancho, color `var(--accent)`, `font-size: 13px`, `font-weight: 700`, `letter-spacing: 0.14em`.
   - **Título principal**: "Selected Work" en uppercase, font bold, `font-size: clamp(32px, 5.5vw, 56px)`, `line-height: 1.05`, `color: var(--ink)`, `max-width: 18ch`. Usa la fuente `font-family: inherit` (Inter del proyecto).
   - **Lead paragraph**: texto placeholder lorem ipsum, `font-weight: 300`, `font-size: clamp(15px, 1.6vw, 18px)`, `line-height: 1.55`, `color: var(--ink-soft)`, `max-width: 60ch`.
   - **Barra de filtros**: un input de búsqueda tipo pill (border-radius: 999px, icono de lupa a la izquierda con `position: absolute`) + una fila de chips de categoría.
   - **Chips de categoría**: cada uno es un `<button>` con `border-radius: 999px`, `padding: 9px 16px 9px 12px`, `font-size: 13px`, `font-weight: 600`. El chip activo usa `background: var(--accent)`, `color: white`, `border: 1.5px solid var(--accent)`. Los inactivos usan `background: var(--paper)`, `color: var(--ink)`, `border: 1.5px solid var(--line)`. Cada chip muestra un icono SVG (el campo `icon` de la categoría es un SVG path `d` attribute) + el `label` + un contador de proyectos en esa categoría (con `opacity: 0.55`). El primer chip siempre es "All" con el conteo total.
   - **Grid masonry**: usa CSS `columns: clamp(240px, 30vw, 360px)` con `column-gap: clamp(16px, 2.2vw, 28px)`. Cada card es `break-inside: avoid; display: inline-block; width: 100%`.
   - **Card**: border-radius `12px`, `overflow: hidden`, fondo `var(--surface)`, sombra `0 1px 3px rgba(0,0,0,0.06)`. Contiene un wrapper de imagen con `aspect-ratio` dinámico (viene del proyecto, default `4/3`), y un body con título (`font-weight: 600`, `font-size: clamp(14px, 1.6vw, 16px)`, `color: var(--ink)`) y categoría (`font-size: 12.5px`, uppercase, `letter-spacing: 0.04em`, `color: var(--text-muted)`). Si no hay `coverUrl`, mostrar un fallback gris con un icono de imagen. Cada card es clickeable y navega a `/work/[slug]`.
   - **Estado vacío**: cuando los filtros no dan resultados, caja con `border: 1px dashed var(--line)`, border-radius `12px`, texto centrado "No projects found with these filters." + botón "Clear filters" (pill, borde `var(--accent)`, color `var(--accent)`, fondo transparente).

3. **Filtrado**: el input de búsqueda filtra por `title`, `client`, y `summary` (case insensitive substring). Los chips filtran por categoría (`project.categories.includes(activeCategory)`). Ambos filtros se combinan.

4. **Breadcrumb**: cuando hay una categoría activa, muestra un breadcrumb arriba del título: "Portfolio › [Category Label]". "Portfolio" es clickeable y limpia el filtro.

5. **Animaciones GSAP**: Entrada de la sección con fade + translateY. Cards con `stagger` escalonado. Usa `ScrollTrigger` con `once: true`. Respeta `prefers-reduced-motion`.

6. **Navegación**: usa `next/navigation` → `useRouter().push('/work/' + slug)` para ir al detalle. El link del breadcrumb limpia el estado, no navega.

### Tokens CSS de ienyell (NO inventar otros)

```
--paper: #fff
--ink: #212529
--ink-2: #343a40
--ink-soft: #495057
--text-muted: #555
--line: #dee2e6
--line-2: #e9ecef
--surface: #f8f9fa
--accent: #fa5f07
--accent-dark: #e04e00
--accent-tint: #fff7f2
```

### Archivo de estilos

Escribe todos los estilos CSS con prefijo `.pf-` en `styles/globals.css`, al final del archivo. No crees archivos CSS separados. Usa las variables CSS listadas arriba, no hardcodees colores.

### Estructura de archivos a crear/editar

- **CREAR**: `app/work/page.js` — la página galería
- **EDITAR**: `styles/globals.css` — agregar los estilos `.pf-*` al final

### NO hacer

- No crear un componente separado para la galería, todo va en page.js
- No usar CSS modules ni styled-components
- No usar `Image` de Next.js (las imágenes vienen de URLs externas del backend)
- No tocar el componente existente `components/PortfolioGallery.jsx` (ese es un mini-gallery para las subpáginas de servicio, es diferente)
- No instalar paquetes nuevos (gsap ya está instalado)

---

## PROMPT 2 — Página de detalle del proyecto (`/work/[slug]`)

### Contexto

Continuando la migración del portfolio. La página galería `/work` ya existe (Prompt 1). Ahora necesito la vista de detalle de un proyecto individual.

El backend expone `GET /api/portfolio/projects/:slug` que retorna:

```js
{
  project: {
    id, slug, title, client, date, summary, approach,
    budget,           // string like "₡500000" or "$200"
    aspectRatio,      // string like "4/3", "16/9"
    liveUrl,          // string URL or null
    showBrowserFrame, // boolean
    coverUrl,         // string URL or null
    categories,       // string[] of category slugs
    software,         // array of { id, icon, name, abbr }
    technologies,     // array of { id, name, kind }
    results,          // array of { value, label }
    content,          // HTML string (rich text from CMS)
    isPublished, publishedAt, order
  }
}
```

Las categorías se obtienen de `GET /api/portfolio/categories` (misma respuesta que Prompt 1).

### Tarea

Crea `app/work/[slug]/page.js` como componente `'use client'` que:

1. **Fetch**: Lee el `slug` del param de la URL con `useParams()`. Hace fetch al backend para obtener el proyecto + categorías. Muestra loading state.

2. **Top bar**: Breadcrumb ("Portfolio › [Category] › [Title]") + botón "Back to gallery" con icono de flecha ← y borde pill. "Portfolio" navega a `/work`, "[Category]" navega a `/work` con la categoría preseleccionada (usar query param `?category=slug` o simplemente navegar — decide tú).

3. **Layout de dos columnas** con `display: flex; flex-wrap: wrap; gap: clamp(32px, 5vw, 64px)`:

   **Columna izquierda (sidebar sticky)**:
   - `flex: 1 1 300px`, `min-width: 260px`, `position: sticky`, `top: 28px`, `align-self: flex-start`.
   - Chip de categoría (si existe): pill con fondo `var(--accent-tint)`, borde `1px solid rgba(250,95,7,0.2)`, color `var(--accent)`, icono SVG + label. Clickeable → navega al portfolio filtrado.
   - **Título del proyecto**: uppercase, bold, `font-size: clamp(26px, 3.6vw, 38px)`, `line-height: 1.08`, `color: var(--ink)`.
   - **Meta**: cliente (con icono ◈) y fecha (con icono ◷), fuente 14px.
   - **Divider**: línea `1px solid var(--line-2)`.
   - **Sección "Description"**: heading en uppercase `12px`, `font-weight: 700`, `letter-spacing: 0.12em`, `color: var(--accent)` + párrafo de cuerpo `14.5px`, `font-weight: 300`, `color: var(--ink-soft)`.
   - **Sección "Approach"**: mismo estilo de heading + body (solo si project.approach existe).
   - **Sección "Software used"**: fila de chips, cada uno con icono + nombre. Chip: `background: var(--surface)`, `border: 1px solid var(--line-2)`, `border-radius: 999px`, `padding: 6px 12px 6px 6px`. El icono va en un cuadrado `24px` con `border-radius: 7px`, fondo blanco, borde `var(--line-2)`. Para el icono: si el `software.id` o `software.icon` coincide con un nombre conocido (figma, photoshop, illustrator, blender, clip-studio, procreate, etc.), usa un SVG inline hardcodeado. Si no, muestra las primeras 2 letras del nombre como fallback.
   - **Sección "Technologies"**: chips simples sin icono, mismo estilo pero con `font-weight: 600`.
   - **Sección "Budget"**: monto formateado (la función `formatPortfolioBudget` parsea el string, extrae símbolo de moneda, y agrega separadores de miles con espacio). Font `22px`, bold.
   - **Sección "Results"**: lista vertical, cada resultado tiene el `value` en `font-weight: 700`, `18px`, `color: var(--accent)` y el `label` al lado en `13.5px`, `color: var(--ink-soft)`.
   - **Link "View live site →"**: solo si `project.liveUrl` existe. `color: var(--accent)`, `font-weight: 600`, `font-size: 13.5px`.

   **Columna derecha (main content)**:
   - `flex: 999 1 480px`, `min-width: min(100%, 480px)`.
   - **Cover**: Si `showBrowserFrame && coverUrl` → browser frame mockup: barra con 3 dots grises (`9px`, `border-radius: 999px`, `background: var(--line)`) + url bar pill + viewport con la imagen. Si solo `coverUrl` → imagen con `border-radius: 16px`. Aspect ratio dinámico.
   - **Content**: renderizar el HTML del campo `content` con `dangerouslySetInnerHTML`. Sanitizar con DOMPurify (`npm install dompurify` si no está). Estilos del contenido: `max-width: 70ch`, fuente 15-17px weight 300, headings en `color: var(--ink)` weight 300, links en `var(--accent)`, blockquotes con borde izquierdo `var(--accent)` y fondo `var(--accent-tint)`, imágenes con `border-radius: 12px; max-width: 100%`.

4. **Responsive**: En `max-width: 980px`, el sidebar deja de ser sticky (`position: static`). Las columnas se apilan naturalmente por flex-wrap.

5. **Animación GSAP**: fade-in de toda la vista al cargar (`opacity: 0 → 1`, `duration: 0.45s`).

### Función formatPortfolioBudget (copiar exacta)

```js
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
```

### Iconos de software conocidos (map mínimo para ilustración)

Crea un objeto `SOFTWARE_ICONS` con SVG paths para al menos: `figma`, `photoshop`, `illustrator`, `clip-studio`, `procreate`, `blender`, `krita`, `sai`. Usa paths de simple-icons o dibuja iconos minimalistas. Cada entry es `{ viewBox, paths }` donde paths es un array de strings de `d` attribute. Si el software no está en el map, renderizar un `<span>` con las primeras 2 letras.

### Tokens CSS — mismos que Prompt 1

### Archivos a crear/editar

- **CREAR**: `app/work/[slug]/page.js`
- **EDITAR**: `styles/globals.css` — agregar estilos `.pf-project-*`, `.pf-sidebar-*`, `.pf-browser-*`, `.pf-cover-*`, `.pf-content *` al final
- **INSTALAR** (si no existe): `dompurify`

### NO hacer

- No usar `Image` de Next.js
- No crear archivos de componentes separados para cada sección del sidebar
- No hardcodear colores — siempre usar variables CSS

---

## PROMPT 3 — Link del CTA existente en PortfolioGallery al nuevo /work

### Contexto

El componente `components/PortfolioGallery.jsx` ya existe y se usa dentro de las subpáginas de servicio (`app/services/fiction/page.js`, `app/services/portraits/page.js`). Tiene un prop `ctaHref` que actualmente apunta a `/work?category=fiction`.

### Tarea

1. En `app/services/fiction/page.js`, verifica que el `<PortfolioGallery>` tiene `ctaHref="/work?category=fiction"`. Si ya lo tiene, no cambiar.

2. En `app/services/portraits/page.js`, verifica que tiene `ctaHref="/work?category=portraits"`.

3. En la nueva página `app/work/page.js` (creada en Prompt 1): al montar, lee `searchParams` de la URL. Si hay un `?category=slug`, inicializa `activeCategory` con ese valor en lugar de string vacío. Esto permite que los CTAs de las subpáginas de servicio lleven directamente al portfolio filtrado.

   Usa `useSearchParams()` de `next/navigation`:
   ```js
   const searchParams = useSearchParams();
   const initialCategory = searchParams.get('category') || '';
   const [activeCategory, setActiveCategory] = useState(initialCategory);
   ```

### NO hacer

- No modificar la lógica interna de `PortfolioGallery.jsx`
- No cambiar los estilos `.pgal-*`

---

## PROMPT 4 — Seed de categorías de portfolio para ilustración

### Contexto

El backend tiene los modelos `PortfolioCategory` y `PortfolioProject` en Prisma. Necesito crear un seed script para poblar categorías relevantes para un portfolio de ilustración (no de diseño web como Util).

### Tarea

Crea un archivo `backend/prisma/seed-portfolio.js` que use Prisma Client para insertar las siguientes categorías (upsert por slug para que sea idempotente):

```js
const CATEGORIES = [
  { slug: 'portraits', label: 'Portraits & Characters', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z', order: 1 },
  { slug: 'fiction', label: 'Fiction & Fantasy', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', order: 2 },
  { slug: 'fanart', label: 'Fan Art', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', order: 3 },
  { slug: 'nsfw', label: 'NSFW / Mature', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z', order: 4 },
  { slug: 'furry', label: 'Anthro / Furry', icon: 'M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.39-1 1.73V7h1c1.1 0 2 .9 2 2v1h4v2h-4v1c0 1.1-.9 2-2 2h-1v3.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V15h-1c-1.1 0-2-.9-2-2v-1H4V10h4V9c0-1.1.9-2 2-2h1V5.73C10.4 5.39 10 4.74 10 4c0-1.1.9-2 2-2z', order: 5 },
  { slug: 'concept-art', label: 'Concept Art', icon: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z', order: 6 },
  { slug: 'horror', label: 'Horror & Gore', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', order: 7 },
  { slug: 'sketches', label: 'Sketches & WIPs', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', order: 8 },
];
```

El script debe:
- Importar `PrismaClient` de `@prisma/client`
- Hacer `upsert` por cada categoría (where: { slug }, update: { label, icon, order }, create: { slug, label, icon, order })
- Logear cuántas categorías se crearon/actualizaron
- Llamar `prisma.$disconnect()` al final

Agrega un script en `package.json` del backend: `"seed:portfolio": "node prisma/seed-portfolio.js"`.

### NO hacer

- No borrar datos existentes
- No crear proyectos de ejemplo (solo categorías)
- No modificar el schema de Prisma

---

## PROMPT 5 — Animaciones GSAP para el portfolio

### Contexto

Las páginas `/work` (galería) y `/work/[slug]` (detalle) ya existen. Ahora quiero añadir animaciones elegantes con GSAP + ScrollTrigger.

### Tarea — Galería (`/work`)

Dentro del `useEffect` de la página:

1. **Sección entera**: background transition de `var(--surface)` a `var(--paper)` con scrub entre `top bottom` y `top 15%`.

2. **Eyebrow + Título + Lead**: entrada secuencial con `stagger: 0.12`:
   - Eyebrow: `clipPath: 'inset(0 100% 0 0)' → 'inset(0 0% 0 0)'`, `duration: 0.6`, `ease: 'power3.out'`.
   - Título: `y: 40, opacity: 0 → y: 0, opacity: 1`, `duration: 0.8`, `ease: 'power4.out'`.
   - Lead: `y: 20, opacity: 0 → y: 0, opacity: 1`, `duration: 0.5`.

3. **Barra de filtros**: `y: 15, opacity: 0 → y: 0, opacity: 1`, aparece después del lead con `delay: 0.3`.

4. **Cards**: Cada card se anima individualmente con su propio `ScrollTrigger` (`trigger: card, start: 'top 90%', once: true`): `y: 30, opacity: 0, scale: 0.95 → y: 0, opacity: 1, scale: 1`, `duration: 0.75`, `ease: 'power3.out'`, `clearProps: 'transform'`.

5. **Hover en cards**: No GSAP — CSS `transition: transform 0.3s, box-shadow 0.3s`. Al hacer hover: `transform: translateY(-4px)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.1)`.

### Tarea — Detalle (`/work/[slug]`)

1. **Fade-in general**: toda la vista `opacity: 0 → 1`, `duration: 0.45`, `ease: 'power2.out'`.

2. **Sidebar sections**: `stagger: 0.08`, cada sección `y: 16, opacity: 0 → y: 0, opacity: 1`, `duration: 0.4`.

3. **Cover image**: `scale: 1.04, opacity: 0 → scale: 1, opacity: 1`, `duration: 0.65`, `ease: 'power3.out'`.

4. **Content blocks**: entrada progresiva con ScrollTrigger individual por bloque (`trigger: block, start: 'top 88%', once: true`).

### Todas las animaciones deben

- Respetar `prefers-reduced-motion: reduce` — si se detecta, hacer `gsap.set(elements, { clearProps: 'all', opacity: 1, visibility: 'visible' })` y return early.
- Usar `gsap.context()` con el ref del section para cleanup en el return del useEffect.
- Registrar `ScrollTrigger` solo una vez: `gsap.registerPlugin(ScrollTrigger)` fuera del componente, protegido con `typeof window !== 'undefined'`.

---

## Orden de ejecución

1. **Prompt 4** primero (seed de categorías) — así cuando pruebes las páginas ya hay data.
2. **Prompt 1** (galería /work).
3. **Prompt 2** (detalle /work/[slug]).
4. **Prompt 3** (conectar CTAs existentes).
5. **Prompt 5** (pulir animaciones GSAP).

Después de cada prompt, levanta el dev server (`npm run dev`) y el backend, y verifica visualmente que todo funciona antes de pasar al siguiente.
