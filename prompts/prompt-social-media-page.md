# Página Social Media (/links/social) — Prompts de implementación

> **Instrucciones**: Ejecuta cada prompt en orden. Cada uno construye sobre el anterior. Verifica que compila sin errores antes de pasar al siguiente.
>
> **Referencia visual**: El diseño de Figma (frame `linkinbio_page_2.1`) muestra botones con fondo oscuro de color único por red social, texto blanco, ícono a la izquierda, y chevron (>) a la derecha. Las redes están agrupadas en secciones: "Social media", "Portfolios", "Shop".

---

## PROMPT 1 de 2 — Configuración de datos + página

```
Estoy trabajando en un proyecto Next.js 16 con React 19 y App Router. Necesito crear la página /links/social que muestra las redes sociales y canales del usuario organizados por categoría.

### Stack y convenciones del proyecto:
- Next.js 16.3.4, React 19.2.8, App Router
- Todos los componentes client llevan `'use client';` en la primera línea
- CSS en `styles/globals.css` usando variables CSS de `:root`:
  - --paper: #fff (fondo)
  - --ink: #212529 (texto principal)
  - --ink-2: #343a40 (oscuro secundario)
  - --ink-soft: #495057 (texto muted)
  - --text-muted: #555 (captions)
  - --line: #dee2e6 (bordes)
  - --line-2: #e9ecef (divisores sutiles)
  - --surface: #f8f9fa (fondo claro)
  - --accent: #fa5f07 (naranja marca)
  - --accent-dark: #e04e00 (naranja hover)
  - --accent-tint: #fff7f2 (naranja wash)
- Prefijo CSS para esta página: `.soc-`
- NO usar librerías externas, todo CSS vanilla
- Las imágenes de íconos de redes sociales están en `/public/recursos/icon_social/` con estos archivos disponibles:
  - _Instagram.svg, _Twitter.svg, _YouTube.svg, _TikTok.svg, _Facebook.svg, _Linkedin.svg, _Github.svg, _Wattpad.svg, Dribbble.svg, Behance.svg, _eCommerce.png
- El layout global (`app/layout.js`) ya envuelve todas las páginas con Header, Footer, ScrollToTop, Offcanvas y WizardProvider. NO los renderices en esta página.

### Referencia visual (diseño de Figma):
El diseño muestra botones con FONDO OSCURO DE COLOR ÚNICO por cada red social (NO cards blancos con bordes). Cada botón tiene:
- Fondo oscuro saturado (un color distinto por red social)
- Texto completamente blanco (nombre en bold, descripción debajo en regular)
- Ícono de la red social a la izquierda (blanco mediante CSS filter)
- Chevron (>) a la derecha en blanco
- Border-radius redondeado, drop-shadow sutil
- Agrupados por secciones con título centrado

### Contexto de navegación:
Esta página se accede desde el botón "I'm looking for your social media" en /links, que tiene href='/links/social'. El usuario espera encontrar todas las redes sociales organizadas de forma clara.

### A) Crear archivo de datos: `data/socialLinks.js`

Exporta un array de categorías, cada una con sus links. IMPORTANTE: cada link tiene un campo `bg` con el color de fondo oscuro específico de esa red social (extraídos del diseño de Figma).

```js
export const socialCategories = [
  {
    id: 'social-media',
    title: 'Social media',
    links: [
      {
        id: 'youtube',
        name: 'YouTube',
        url: 'https://youtube.com/@ienyell',
        icon: '/recursos/icon_social/_YouTube.svg',
        description: 'Tutorials, classes, entertainment, analysis, masterclasses, and more.',
        bg: '#58151c',
      },
      {
        id: 'twitch',
        name: 'Twitch',
        url: 'https://twitch.tv/ienyell',
        icon: '/recursos/icon_social/_TikTok.svg',
        description: 'Masterclasses, live tutorials, entertainment, live classes, courses, and more.',
        bg: '#160d27',
      },
      {
        id: 'patreon',
        name: 'Patreon',
        url: 'https://patreon.com/ienyell',
        icon: '/recursos/icon_social/_eCommerce.png',
        description: 'Be my patreon and get special rewards...',
        bg: '#331904',
      },
      {
        id: 'wattpad',
        name: 'Wattpad',
        url: 'https://wattpad.com/user/ienyell',
        icon: '/recursos/icon_social/_Wattpad.svg',
        description: 'Read my stories on early versions.',
        bg: '#032830',
      },
      {
        id: 'twitter',
        name: 'Twitter/X',
        url: 'https://twitter.com/ienyell',
        icon: '/recursos/icon_social/_Twitter.svg',
        description: 'Follow news and my opinion about the industry. Give me your opinion and I\'ll read it!',
        bg: '#212529',
      },
      {
        id: 'threads',
        name: 'Threads',
        url: 'https://threads.net/@ienyell',
        icon: '/recursos/icon_social/_Twitter.svg',
        description: 'Follow realtime stories, roleplay and more daily tips. Know more about my life.',
        bg: '#212529',
      },
      {
        id: 'instagram',
        name: 'Instagram',
        url: 'https://instagram.com/ienyell',
        icon: '/recursos/icon_social/_Instagram.svg',
        description: 'Find my art, tips, short tutorials, extracts to my lessons, and more.',
        bg: '#561435',
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        url: 'https://tiktok.com/@ienyell',
        icon: '/recursos/icon_social/_TikTok.svg',
        description: 'Tips, short tutorials, extracts to my lessons, short analysis and more.',
        bg: '#140330',
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        url: 'https://linkedin.com/in/ienyell',
        icon: '/recursos/icon_social/_Linkedin.svg',
        description: 'Find my professional information.',
        bg: '#052c65',
      },
    ],
  },
  {
    id: 'portfolios',
    title: 'Portfolios',
    links: [
      {
        id: 'behance',
        name: 'Behance',
        url: 'https://behance.net/ienyell',
        icon: '/recursos/icon_social/Behance.svg',
        description: 'Find my projects designed for brands, non-fiction books, products, and web.',
        bg: '#212529',
      },
      {
        id: 'artstation',
        name: 'ArtStation',
        url: 'https://artstation.com/ienyell',
        icon: '/recursos/icon_social/Dribbble.svg',
        description: 'Find my visual and artist projects for fiction, books, RPG, and more.',
        bg: '#031633',
      },
      {
        id: 'reddit',
        name: 'Reddit',
        url: 'https://reddit.com/user/ienyell',
        icon: '/recursos/icon_social/_Facebook.svg',
        description: 'My opinion about topics, NSFW topics related.',
        bg: '#58151c',
      },
      {
        id: 'github',
        name: 'GitHub',
        url: 'https://github.com/ienyell',
        icon: '/recursos/icon_social/_Github.svg',
        description: 'Find my web projects, components, examples about my work and more.',
        bg: '#212529',
      },
      {
        id: 'portfolio',
        name: 'Personal Portfolio',
        url: '/',
        icon: '/recursos/icon_social/_Linkedin.svg',
        description: 'Find my complete portfolio on my web and know more details about my work and experience.',
        bg: '#212529',
        internal: true,
      },
    ],
  },
  {
    id: 'shop',
    title: 'Shop',
    links: [
      {
        id: 'amazon',
        name: 'My favorites',
        url: 'https://amazon.com/shop/ienyell',
        icon: '/recursos/icon_social/_eCommerce.png',
        description: 'Find my recommendations about products.',
        bg: '#984c0c',
      },
      {
        id: 'store',
        name: 'My shop',
        url: '/links/store',
        icon: '/recursos/icon_social/_eCommerce.png',
        description: 'Find my products. Since my books, learning tools, exclusive designs and more.',
        bg: '#06281e',
        internal: true,
      },
    ],
  },
];
```

Notas sobre los datos:
- Todos los handles y URLs son placeholders que el usuario cambiará después
- Algunos íconos son placeholders (como Threads usando _Twitter.svg, ArtStation usando Dribbble.svg, Reddit usando _Facebook.svg). El usuario añadirá los SVGs correctos después. Lo importante es la estructura.
- El campo `internal: true` indica que el link es interno de la web (no abre en nueva pestaña)
- El campo `bg` es el color de fondo oscuro EXACTO para cada card (extraído del diseño de Figma)

### B) Crear la página: `app/links/social/page.js`

Esta es una página `'use client'` que renderiza las redes sociales organizadas por categoría.

**Estructura de la página:**

```jsx
<main className="soc-page">
  <button className="soc-back" onClick={() => router.back()}>
    ‹ Return to start
  </button>

  {socialCategories.map(category => (
    <section className="soc-category" key={category.id}>
      <h2 className="soc-category-title">{category.title}</h2>
      <div className="soc-links-list">
        {category.links.map(link => (
          <SocialCard key={link.id} link={link} />
        ))}
      </div>
    </section>
  ))}
</main>
```

**Componente SocialCard** (defínelo en el mismo archivo, NO lo exportes):

Cada card es un `<a>` (o `<Link>` de next/link si `link.internal` es true). El fondo se aplica como inline style usando `link.bg`. TODOS los cards tienen fondo oscuro con texto blanco.

```jsx
function SocialCard({ link }) {
  const Tag = link.internal ? Link : 'a';
  const externalProps = link.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' };

  return (
    <Tag href={link.url} className="soc-card" style={{ background: link.bg }} {...externalProps}>
      <span className="soc-card-icon">
        <img src={link.icon} alt="" width={24} height={24} />
      </span>
      <span className="soc-card-text">
        <strong className="soc-card-name">{link.name}</strong>
        <span className="soc-card-desc">{link.description}</span>
      </span>
      <span className="soc-card-chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </Tag>
  );
}
```

Notas:
- El ícono de flecha es un **chevron (>)**, NO una flecha diagonal
- Usa `useRouter` de `next/navigation` para el botón Back
- Importa `Link` de `next/link` para links internos
- Importa `socialCategories` de `../../../data/socialLinks`
- Usa `<img>` normal para los íconos (NO next/image), porque son SVGs pequeños estáticos
- El fondo se aplica como **inline style** (`style={{ background: link.bg }}`) porque cada card tiene un color diferente
- Los íconos se hacen blancos vía CSS filter (`.soc-card-icon img { filter: brightness(0) invert(1); }`)

Devuélveme:
1. `data/socialLinks.js` completo
2. `app/links/social/page.js` completo
```

---

## PROMPT 2 de 2 — CSS completo

```
Continuando con la página /links/social. Ya existen:
- `data/socialLinks.js` — configuración de redes sociales por categoría, cada link con campo `bg` (color de fondo oscuro)
- `app/links/social/page.js` — la página con SocialCard (cards oscuros con texto blanco)

Ahora necesito todo el CSS. Añádelo al FINAL de `styles/globals.css` bajo un comentario `/* ── Social Media Page ── */`.

### Variables CSS disponibles:
- --paper: #fff, --ink: #212529, --ink-2: #343a40, --ink-soft: #495057
- --text-muted: #555, --line: #dee2e6, --line-2: #e9ecef, --surface: #f8f9fa
- --accent: #fa5f07, --accent-dark: #e04e00, --accent-tint: #fff7f2

### Prefijo: `.soc-`

### Referencia visual:
Los cards son botones con FONDO OSCURO de color (no cards blancos). Cada card tiene:
- Fondo oscuro saturado (aplicado via inline style)
- Texto blanco
- Ícono blanco a la izquierda
- Chevron blanco a la derecha
- Border-radius redondeado (10px)
- Drop-shadow sutil
- Padding horizontal generoso (30px)
- Los títulos de sección están centrados

### Estilos requeridos:

**Página (.soc-page):**
- width: min(600px, 100%), margin: 0 auto, padding: 24px 20px 60px
- display: flex, flex-direction: column, gap: 32px

**Botón Back (.soc-back):**
- background: none, border: none, color: var(--ink-soft), font-size: 13px, font-weight: 400, cursor: pointer, padding: 0, margin: 0
- display: block, text-align: center, width: 100%
- Hover: color var(--accent)
- font-family: inherit

**Categoría (.soc-category):**
- display: flex, flex-direction: column, gap: 10px, align-items: center

**Título de categoría (.soc-category-title):**
- font-size: 22px, font-weight: 700, color: var(--ink), margin: 0 0 6px, text-align: center

**Lista de links (.soc-links-list):**
- display: flex, flex-direction: column, gap: 10px, width: 100%

**Card (.soc-card):**
- display: flex, align-items: center, gap: 14px
- padding: 14px 30px (padding generoso lateral como en el diseño)
- border-radius: 10px
- text-decoration: none, color: white
- box-shadow: 0 2px 2px rgba(0,0,0,0.25)
- transition: all 180ms ease
- cursor: pointer

**Card hover:**
- filter: brightness(1.15)
- transform: translateY(-1px)
- box-shadow: 0 4px 8px rgba(0,0,0,0.3)

**Card active (pressed):**
- filter: brightness(0.9)
- transform: translateY(0)

**Card icon (.soc-card-icon):**
- display: flex, align-items: center, justify-content: center
- width: 24px, height: 24px, min-width: 24px
- La imagen dentro: width 24px, height 24px, object-fit contain
- IMPORTANTE: hacer el ícono blanco con filter:
```css
.soc-card-icon img {
  filter: brightness(0) invert(1);
}
```

**Card text (.soc-card-text):**
- flex: 1, min-width: 0, display: flex, flex-direction: column, gap: 0
- color: white

**Card name (.soc-card-name):**
- font-size: 13px, font-weight: 700, color: white, line-height: 16px

**Card description (.soc-card-desc):**
- font-size: 12px, font-weight: 400, color: white, line-height: 1.4
- NO truncar el texto — mostrar completo como en el diseño

**Card chevron (.soc-card-chevron):**
- color: white, opacity: 0.7, display: flex, align-items: center
- transition: opacity 180ms ease

**Card chevron al hover:**
```css
.soc-card:hover .soc-card-chevron {
  opacity: 1;
}
```

**Responsive — Desktop (min-width: 768px):**
```css
@media (min-width: 768px) {
  .soc-page { width: min(900px, 100%); padding: 40px 32px 80px; }
  .soc-category-title { font-size: 26px; }
  .soc-links-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
}
```

**Responsive — Desktop grande (min-width: 1100px):**
```css
@media (min-width: 1100px) {
  .soc-page { width: min(1100px, 100%); }
  .soc-links-list { grid-template-columns: repeat(3, 1fr); }
}
```

Devuélveme SOLO el bloque CSS completo para copiar y pegar al final de globals.css. Todo junto, empezando con el comentario `/* ── Social Media Page ── */`.
```

---

## Notas de ejecución

- **Solo 2 prompts** porque esta página es simple: datos + componente + CSS.
- **Orden**: Prompt 1 → verificar compilación → Prompt 2.
- **Estilo visual**: Los cards tienen fondo OSCURO con color único por red social (como los intention buttons), NO cards blancos con bordes. Cada color viene del campo `bg` en los datos y se aplica como inline style.
- **Placeholders**: Todos los handles y URLs son de ejemplo. Algunos íconos son placeholders (Threads, ArtStation, Reddit) — el usuario añadirá los SVGs correctos después.
- **Los íconos SVG** ya existen en el proyecto en `/public/recursos/icon_social/`. NO crees íconos nuevos.
- **NO toques** ningún archivo existente excepto `styles/globals.css` (para añadir CSS al final).
- **NO instales** dependencias.
