# Página de Servicios + Wizard de Cotización con Branching — Prompts de implementación

> **Instrucciones**: Ejecuta cada prompt en orden. Cada uno construye sobre el anterior. No te saltes ninguno. Después de ejecutar cada prompt, verifica que el código compila sin errores con `npm run dev` antes de pasar al siguiente.

> **Contexto del proyecto**: Portafolio/sitio de comisiones para una ilustradora (Enyell). Next.js 16.3.4, React 19.2.8, App Router. CSS en `styles/globals.css` con variables `:root`. NO Tailwind. GSAP 3.15 disponible. Backend Express en port 3001. El wizard genérico ya existe (`context/WizardContext.jsx`, `components/wizard/WizardModal.jsx`, steps en `components/wizard/steps/`), pero es LINEAL — esta serie de prompts lo reemplaza por un motor de branching.

> **Flujo del usuario**:
> 1. Usuario llega a `/services` → ve 7 categorías de servicios + sección de portfolios
> 2. Toca una categoría (ej: "For authors") → se abre un popup/wizard contextualizado
> 3. Wizard paso 1: "What do you need?" → sub-servicios específicos de esa categoría
> 4. Wizard paso 2: "We need all this to start" → checklist de requisitos del cliente
> 5. Si falta algo CRÍTICO → pantalla de bloqueo: "Sorry I can't do it" → ofrece waitlist o "I want you to do it, please!"
> 6. Wizard paso 3: "Choice what do you want I do it" → selección de servicios específicos
> 7. Calculadora de presupuesto integrada → precio estimado
> 8. Verificación de presupuesto → ¿el cliente puede pagarlo?
> 9. Formulario de contacto → nombre, email, descripción, T&C
> 10. Completado → "Ready!" o "Now you're on the waitlist"

---

## PROMPT 1 de 8 — Página hub de servicios (`/services`)

```
Estoy trabajando en un proyecto Next.js 16.3.4 con React 19.2.8 y App Router. Necesito REESCRIBIR la página de servicios (`app/services/page.js`) para que sea un hub con categorías de servicios y links a portfolios, similar en estructura visual a la página de social media que ya existe.

### Stack y convenciones del proyecto:
- Next.js 16.3.4, React 19.2.8, App Router
- CSS en `styles/globals.css` usando variables de `:root`: --ink (#212529), --paper (#fff), --ink-2 (#343a40), --ink-soft (#495057), --text-muted (#555), --line (#dee2e6), --line-2 (#e9ecef), --surface (#f8f9fa), --accent (#fa5f07), --accent-dark (#e04e00), --accent-tint (#fff7f2)
- `'use client';` en todo componente que use hooks/interactividad
- Prefijo CSS para esta página: `.srv-`
- NO instalar librerías externas
- El patrón visual de cards oscuros con ícono ya existe en la social media page (clase `.soc-card`). Reusar el mismo patrón visual.

### Diseño según Figma (mobile-first):

La página tiene este layout de arriba a abajo:

1. **CTA principal**: Botón grande naranja centrado "REQUEST A COMMISSION" — este botón abre el wizard genérico 'work-with-you' que ya existe. Ancho completo dentro de un contenedor de max-width 600px.

2. **Link "‹ Return to start"** — vuelve atrás (router.back())

3. **Sección "Services"** — heading + lista de 7 cards:

   Cada card es un botón oscuro (fondo var(--ink)) con ícono a la izquierda, texto (título bold + descripción), y chevron a la derecha. **Al tocar un card, abre el wizard contextualizado para esa categoría** (lo implementaremos en prompts posteriores; por ahora, cada card guarda un `categoryId` y al clickearlo hace `console.log('open wizard:', categoryId)` como placeholder).

   **Las 7 categorías:**
   | id | título | descripción | ícono (SVG inline) |
   |---|---|---|---|
   | `authors` | For authors | Book covers, inside illustrations, branding, illustrate merch. | Ícono de libro abierto |
   | `personal` | For personal uses | Commissions, fanarts, portrait for weddings, gifts, pets, and more. | Ícono de persona/usuario |
   | `studios` | For studios | Visual keys, visual development, character development, illustration for merch, covers, banners, and more. | Ícono de edificio/estudio |
   | `fandoms` | For fandoms | Commissions: fanarts of your favorite characters, custom merch and more. | Ícono de corazón/estrella |
   | `brands` | For brands | Banners, logos, brand design, and more with Util, my business. | Ícono de megáfono/marca |
   | `uxui` | UX/UI | UI and UX design and web development to variety purposes. | Ícono de pantalla/layout |
   | `nsfw` | NSFW content* | Bloody and explicit content. Include anthropomorphic work if do you want. | Ícono de advertencia/llama |

   Debajo de la lista: nota "*Apply restrictions." en font-size 11px, color var(--text-muted), margin-left 16px.

4. **Sección "Portfolios"** — heading + lista de cards con links a portfolios externos:

   Mismos cards oscuros pero estos son links (`<a>` o `<Link>`). Cada uno tiene su propio color de fondo (inline style, igual que la social media page).

   | id | título | descripción | url | bg color | ícono |
   |---|---|---|---|---|---|
   | `behance` | Behance | Find my projects designed to brands, non-fiction books, products, and web. | https://behance.net/ienyell | #212529 | Behance logo SVG |
   | `artstation` | Artstation | Find my visual and artist projects to fiction, books, RPG, and more. Like concept art, spreadsheets, turn around, visual key, etc. | https://artstation.com/ienyell | #031633 | ArtStation logo SVG |
   | `reddit` | Reddit | My opinion about topics, NSFW topics related. | https://reddit.com/user/ienyell | #58151c | Reddit logo SVG |
   | `github` | GitHub | Find my web projects, components, examples about my work and more. | https://github.com/ienyell | #212529 | GitHub logo SVG |
   | `portfolio` | Personal Portfolio | Find my complete portfolio on my web and know more details about that works and my experience. | / | #212529 (internal link) | Portfolio ícono |

5. **Footer** — ya existe globalmente en el layout, no hacer nada.

### Estructura de datos:
Crea `data/serviceCategories.js` con dos exports:
```js
export const serviceCategories = [
  {
    id: 'authors',
    title: 'For authors',
    description: 'Book covers, inside illustrations, branding, illustrate merch.',
    icon: '...', // SVG path string
  },
  // ... 7 categorías
];

export const portfolioLinks = [
  {
    id: 'behance',
    title: 'Behance',
    description: 'Find my projects designed to brands, non-fiction books, products, and web.',
    url: 'https://behance.net/ienyell',
    bg: '#212529',
    icon: '/recursos/icon_social/Behance.svg', // reusar los íconos que ya existen en public/recursos/icon_social/
  },
  // ... 5 links
];
```

Para los íconos de las categorías de servicios, usa SVG inline (viewBox 0 0 24 24, stroke-based, 20x20px). Busca íconos minimalistas apropiados (estilo Lucide/Feather).

### CSS:
Reutiliza el patrón visual de `.soc-card` de la social media page pero con prefijo `.srv-`. Los cards de servicios son todos con background var(--ink) (oscuro uniforme). Los cards de portfolios usan inline style `background: link.bg` como hace la social media page.

Estilos principales con prefijo `.srv-`:
- `.srv-page`: width min(600px, 100%), margin 0 auto, padding 24px 20px 60px, display flex, flex-direction column, gap 32px
- `.srv-cta`: display block, width 100%, max-width 340px, margin 0 auto, text-align center, background var(--accent), color white, font-size 15px, font-weight 700, padding 16px, border-radius 12px, border none, cursor pointer, text-decoration none. Hover: background var(--accent-dark)
- `.srv-back`: mismos estilos que `.soc-back` de la social media page
- `.srv-section`: display flex, flex-direction column, gap 10px, align-items center
- `.srv-section-title`: font-size 22px, font-weight 700, color var(--ink), text-align center
- `.srv-card`: igual que `.soc-card` (dark card con ícono, texto, chevron) pero background var(--ink)
- `.srv-card-icon`, `.srv-card-text`, `.srv-card-name`, `.srv-card-desc`, `.srv-card-chevron`: mismos estilos que sus equivalentes `.soc-card-*`
- `.srv-note`: font-size 11px, color var(--text-muted), align-self flex-start, margin-left 16px
- Los portfolio cards reusan `.srv-card` con background inline

### Conversión a client component:
Como la página necesita `useRouter` y eventualmente `useWizard`, debe ser `'use client'`. Mueve metadata a `app/services/layout.js`:
```js
export const metadata = { title: 'enyell — Services' };
export default function ServicesLayout({ children }) { return children; }
```

### IMPORTANTE — NO usar el componente HeroServices:
El diseño del Figma NO tiene las dos cards grandes de hero (Portraits/Fiction). Elimina la importación de HeroServices. La página es una lista limpia de categorías, no un hero con imagen.

Devuélveme:
1. `data/serviceCategories.js` — completo con las 7 categorías y 5 portfolio links
2. `app/services/layout.js` — server component con metadata
3. `app/services/page.js` — reescrito completo como client component
4. Bloque CSS para `.srv-*` al final de `styles/globals.css`
```

---

## PROMPT 2 de 8 — Motor de wizard con branching (reescritura del engine)

```
Estoy trabajando en un proyecto Next.js 16.3.4 con React 19.2.8. Ya existe un sistema de wizard LINEAL (`context/WizardContext.jsx` + `components/wizard/WizardModal.jsx` + steps en `components/wizard/steps/`). Necesito REESCRIBIRLO para soportar un wizard con BRANCHING CONDICIONAL.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, App Router
- `'use client';` en todo componente client
- CSS en `styles/globals.css`, prefijo `.wiz-` (ya existe parcialmente — sobrescríbelo)
- Variables CSS: --ink (#212529), --paper (#fff), --accent (#fa5f07), --accent-dark (#e04e00), --accent-tint (#fff7f2), --surface (#f8f9fa), --line (#dee2e6), --line-2 (#e9ecef), --text-muted (#555), --ink-soft (#495057)
- NO librerías externas. Todo vanilla React.

### Concepto clave: Wizard con branching

El wizard actual avanza linealmente (paso 0 → 1 → 2 → ...). El nuevo wizard necesita un GRAFO de pasos donde cada paso define a qué paso ir después según las respuestas del usuario. Cada paso tiene un campo `next` que puede ser:
- Un string: `next: 'step-id'` → siempre va a ese paso
- Una función: `next: (answers) => 'step-id'` → evalúa las respuestas para decidir
- `null` o ausente: es un paso terminal (completion)

### Nuevo esquema de paso (step):
```js
{
  id: 'unique-step-id',           // identificador único
  type: 'single-select',          // tipo de step (ver abajo)
  title: 'Step title',
  description: 'Step description',
  // ... campos específicos del type
  next: 'next-step-id',           // O función (answers) => 'step-id'
}
```

### Tipos de paso a soportar:
1. **`info`** — YA EXISTE. Paso informativo, solo muestra texto/bullets. No requiere respuesta.
2. **`single-select`** — YA EXISTE. Usuario elige UNA opción.
3. **`multi-select`** — YA EXISTE. Usuario elige MÚLTIPLES opciones.
4. **`text-input`** — YA EXISTE. Usuario escribe texto.
5. **`summary`** — YA EXISTE. Resumen de respuestas.
6. **`checklist`** — NUEVO. Lista de requisitos que el cliente debe confirmar. Cada item puede ser `required: true` (crítico) o `required: false` (opcional). El botón "Next" determina si hay items requeridos sin marcar → si los hay, navega a un paso de bloqueo en vez del paso normal.
7. **`blocking`** — NUEVO. Pantalla de "Sorry, I can't do it". Muestra un mensaje explicativo y ofrece dos opciones: un CTA primario (ej: "I want you to do it, please!" o "Add me to the waitlist") y un link secundario ("Return to select the services"). Cada opción navega a un paso diferente o cierra el wizard.
8. **`contact-form`** — NUEVO. Formulario estructurado con campos: name, email, project description (textarea), checkboxes de T&C y newsletter. Más completo que text-input.
9. **`calculator`** — NUEVO. Paso que muestra la calculadora de precios DINÁMICA embebida. Lee `step.pricingConfigId` para obtener la config correcta de `PRICING_CONFIGS` en `data/commissionPricing.js`. Cada config define sus propias dimensiones, addons y función de cálculo — no es lo mismo un retrato que una bookcover o un dibujo NSFW. El resultado se guarda en answers.
10. **`budget-check`** — NUEVO. Pregunta "Can you afford this price?" con opciones Sí/No. Según la respuesta, va al formulario de contacto o a la waitlist.
11. **`completion`** — NUEVO tipo explícito. Pantalla final: ícono check, título, mensaje, botón "Return to select the services" que cierra el wizard. Puede ser "Ready!" (comisión enviada) o "Now you're on the waitlist" (registro en waitlist).

### Archivo a REESCRIBIR: `context/WizardContext.jsx`

**Nuevo estado (useReducer):**
```js
{
  isOpen: false,
  wizardConfig: null,        // el objeto completo del wizard (id, title, steps, etc.)
  currentStepId: null,       // id del paso actual (NO índice — ID de string)
  answers: {},               // { [stepId]: valor }
  history: [],               // array de stepIds visitados (para "Back")
  direction: 'forward',      // 'forward' | 'backward'
  outcome: null,             // 'completed' | 'waitlisted' | null
}
```

**Actions del reducer:**
- `OPEN_WIZARD` — recibe `{ config }` (el objeto completo del wizard). Setea isOpen true, wizardConfig, currentStepId al primer step (config.steps[0].id), answers vacío, history vacío.
- `CLOSE_WIZARD` — resetea todo.
- `NAVIGATE_TO` — recibe `{ stepId }`. Pushea currentStepId al history, setea el nuevo currentStepId, direction 'forward'.
- `GO_BACK` — pop del history, setea ese como currentStepId, direction 'backward'. Si history vacío, no hace nada.
- `SET_ANSWER` — recibe `{ stepId, value }`, guarda en answers.
- `SET_OUTCOME` — recibe `{ outcome }` ('completed' | 'waitlisted'), guarda.

**Hook `useWizard()` — retorna:**
- `isOpen`, `wizardConfig`, `currentStepId`, `answers`, `history`, `direction`, `outcome`
- `openWizard(config)` — dispatch OPEN_WIZARD. config es el objeto completo del wizard.
- `closeWizard()` — dispatch CLOSE_WIZARD
- `navigateTo(stepId)` — dispatch NAVIGATE_TO
- `goBack()` — dispatch GO_BACK
- `setAnswer(stepId, value)` — dispatch SET_ANSWER
- `setOutcome(outcome)` — dispatch SET_OUTCOME
- **Computados (useMemo):**
  - `currentStep` — busca el step actual en wizardConfig.steps por id. Es `wizardConfig.steps.find(s => s.id === currentStepId)` o null.
  - `canGoBack` — history.length > 0
  - `stepsMap` — un Map/objeto indexado por step.id para búsqueda rápida
  - `progress` — history.length / wizardConfig.steps.length (aproximado, ya que no es lineal)

**Función helper `resolveNext(step, answers)`:**
Exporta esta función auxiliar que resuelve el `next` de un paso:
```js
export function resolveNext(step, answers) {
  if (!step.next) return null;
  if (typeof step.next === 'function') return step.next(answers);
  return step.next;
}
```

**Reglas:**
- `useReducer` para el estado
- Envuelve funciones en `useCallback`
- Computados en `useMemo`
- Error si `useWizard()` se usa fuera del Provider
- `document.body.style.overflow` hidden/auto al abrir/cerrar
- El Provider ya está montado en `app/layout.js` (del wizard anterior)

### IMPORTANTE — NO borres el wizard viejo todavía. Reescribe `context/WizardContext.jsx` con la nueva API. Los archivos de steps viejos seguirán existiendo y los actualizaremos en el siguiente prompt.

Devuélveme:
1. `context/WizardContext.jsx` — reescrito completo con el nuevo motor de branching
```

---

## PROMPT 3 de 8 — WizardModal reescrito + nuevos tipos de paso

```
Continuando con el proyecto. El motor de wizard con branching ya está en `context/WizardContext.jsx` y expone: isOpen, wizardConfig, currentStepId, currentStep, answers, history, direction, outcome, canGoBack, openWizard(config), closeWizard(), navigateTo(stepId), goBack(), setAnswer(stepId, value), setOutcome(outcome), resolveNext(step, answers).

Ahora necesito REESCRIBIR el modal del wizard y crear los nuevos tipos de paso.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, `'use client';`
- CSS en `styles/globals.css`, prefijo `.wiz-` (sobrescribir el bloque existente completo)
- Variables CSS: --ink, --paper, --accent, --accent-dark, --accent-tint, --surface, --line, --line-2, --text-muted, --ink-soft
- CSS transitions/animations puras (no GSAP en el wizard)
- SVG inline para íconos

### Archivo a REESCRIBIR: `components/wizard/WizardModal.jsx`

**Estructura visual (igual que el Figma):**
```
overlay (.wiz-overlay) — fondo oscuro
  └─ popup (.wiz-popup) — card blanco, centrado
       ├─ "‹ Return" link (.wiz-return) — en la esquina superior izquierda.
       │   Comportamiento: si canGoBack → goBack(). Si no → closeWizard().
       ├─ contenido del paso (.wiz-content)
       │   └─ renderizado dinámico según currentStep.type
       └─ botón "Next" (.wiz-next-btn) — ancho completo, azul/naranja.
            Solo visible en pasos que lo necesitan (no en blocking, completion).
```

**Comportamiento del botón "Next":**
El botón "Next" NO siempre avanza. Su lógica depende del tipo de paso:
- Para `single-select`, `multi-select`, `text-input`, `info`: calcula el siguiente paso con `resolveNext(currentStep, answers)` y llama `navigateTo(nextStepId)`.
- Para `checklist`: verifica si hay items `required` sin marcar. Si los hay, navega al paso indicado en `currentStep.blockingStepId` en vez del `next` normal. Si todos los required están marcados, navega al `next` normal.
- Para `contact-form`: valida los campos requeridos, luego navega.
- Para `calculator`: guarda el resultado del cálculo en answers, luego navega.
- Para `blocking`, `completion`: NO muestra botón "Next". Estos pasos tienen sus propios botones internos.
- Para `budget-check`: NO muestra "Next" genérico. Tiene dos botones propios (Sí/No).

**"‹ Return" link:**
- Siempre visible arriba a la izquierda
- Si `canGoBack` (hay historial) → llama `goBack()`
- Si NO canGoBack (primer paso) → llama `closeWizard()`
- Texto: siempre "‹ Return"

**Animaciones:**
- Overlay: fade-in (opacity 0→1, 200ms)
- Popup: slide-up + fade (translateY(20px)→0, 250ms, ease-out)
- Transición entre pasos: si direction 'forward' → nuevo paso entra desde derecha (translateX(30px)→0). Si 'backward' → entra desde izquierda. Usar key={currentStepId} en el contenedor del paso + CSS animation.
- Escape cierra el wizard

### Componente StepRenderer (dentro de WizardModal.jsx, NO exportar):

Switch en `currentStep.type`:
- `'info'` → `<InfoStep step={currentStep} />`
- `'single-select'` → `<SingleSelectStep step={currentStep} value={answers[currentStep.id]} onChange={(v) => setAnswer(currentStep.id, v)} />`
- `'multi-select'` → `<MultiSelectStep step={currentStep} value={answers[currentStep.id] || []} onChange={(v) => setAnswer(currentStep.id, v)} />`
- `'text-input'` → `<TextInputStep step={currentStep} value={answers[currentStep.id] || ''} onChange={(v) => setAnswer(currentStep.id, v)} />`
- `'checklist'` → `<ChecklistStep step={currentStep} value={answers[currentStep.id] || {}} onChange={(v) => setAnswer(currentStep.id, v)} />`
- `'blocking'` → `<BlockingStep step={currentStep} onAction={(stepId) => navigateTo(stepId)} onClose={closeWizard} />`
- `'contact-form'` → `<ContactFormStep step={currentStep} value={answers[currentStep.id] || {}} onChange={(v) => setAnswer(currentStep.id, v)} />`
- `'calculator'` → `<CalculatorStep step={currentStep} value={answers[currentStep.id]} onChange={(v) => setAnswer(currentStep.id, v)} answers={answers} />`
- `'budget-check'` → `<BudgetCheckStep step={currentStep} answers={answers} onYes={() => navigateTo(step.yesStepId)} onNo={() => navigateTo(step.noStepId)} />`
- `'completion'` → `<CompletionStep step={currentStep} onClose={closeWizard} outcome={outcome} />`
- `'summary'` → `<SummaryStep step={currentStep} answers={answers} allSteps={wizardConfig.steps} />`

Todos los imports vienen de `./steps/`.

### Archivos de pasos a REESCRIBIR o CREAR en `components/wizard/steps/`:

#### Pasos existentes a MANTENER (solo ajustar imports/props si es necesario):
- `InfoStep.jsx` — mantener tal cual
- `SingleSelectStep.jsx` — mantener tal cual  
- `MultiSelectStep.jsx` — mantener tal cual
- `TextInputStep.jsx` — mantener tal cual
- `SummaryStep.jsx` — mantener, pero ahora recibe `answers` y `allSteps` como props directas (no `allAnswers`)

#### Nuevos pasos a CREAR:

**1. `ChecklistStep.jsx`**
El cliente marca qué cosas tiene listas. Cada item es un checkbox.

Props: `step`, `value` (objeto `{ [itemId]: boolean }`), `onChange`

Config del step:
```js
{
  id: 'requirements',
  type: 'checklist',
  title: 'We need all this to start',
  description: 'Mark every what you have.',
  items: [
    { id: 'content-complete', label: 'The content is complete.', detail: 'This includes edition and corrections necessary for this book.', required: true },
    { id: 'details', label: 'I have the details complete.', detail: 'Includes: additional information, name, register, legal.', required: true },
    { id: 'isbn', label: 'I have ISBN.', detail: "It's necessary for complete the pricing.", required: false },
    { id: 'story-resume', label: 'I have an idea and story resume.', detail: "It's necessary for a better development of the book.", required: true },
    { id: 'character-look', label: 'I know how my character/scenario looks.', detail: "It's necessary that you have a visual key or character design to improve and guarantee the quality.", required: true },
  ],
  next: 'service-selection',        // paso normal si todo OK
  blockingStepId: 'sorry-missing',  // paso si falta un required
}
```

Renderizado:
- Título + descripción
- Lista de checkboxes personalizados:
  - Cada item: display flex, gap 12px, padding 12px 0, border-bottom 1px solid var(--line-2), align-items flex-start
  - Checkbox custom: 20x20px, border 2px solid var(--line), border-radius 4px. Checked: background var(--accent), border-color var(--accent), checkmark blanco SVG
  - Label: font-size 14px, font-weight 600, color var(--ink)
  - Detail: font-size 12px, color var(--text-muted), line-height 1.4
- onChange se llama con el objeto completo `{ [itemId]: true/false }` cada vez que cambia un checkbox

**2. `BlockingStep.jsx`**
Pantalla de bloqueo cuando falta algo crítico.

Props: `step`, `onAction(stepId)`, `onClose()`

Config del step:
```js
{
  id: 'sorry-missing',
  type: 'blocking',
  title: "Sorry I can't do it if you don't have it.",
  description: "Not I can to develop the things that you need right now.",
  // Variante 1: ofrecer "yo te lo hago"
  primaryAction: { label: 'I want you to do it, please!', stepId: 'service-selection' },
  secondaryAction: { label: 'Return to select the services.', action: 'close' },
}
// Variante 2: ofrecer waitlist
{
  id: 'sorry-isbn',
  type: 'blocking',
  title: "Sorry I can't do it if you don't have the ISBN/the content complete.",
  description: "It's necessary to have these things complete to start this type of work, but meanwhile you have it I can add you to a waitlist for give to you a priority when do you need it!",
  primaryAction: { label: 'Please add me to the waitlist..', stepId: 'waitlist-form' },
  secondaryAction: { label: 'Return to select the services.', action: 'close' },
}
```

Renderizado:
- Título en font-size 18px, font-weight 700, color var(--ink)
- Descripción en font-size 14px, color var(--ink-soft), line-height 1.6
- Botón primario: ancho completo, background var(--accent), color white, padding 14px, border-radius 10px, font-size 14px, font-weight 600. Al clickear: `onAction(step.primaryAction.stepId)`
- Link secundario: text-align center, font-size 13px, color var(--text-muted), cursor pointer, margin-top 12px. Al clickear: si `action === 'close'` → `onClose()`, si tiene `stepId` → `onAction(step.secondaryAction.stepId)`
- NO muestra botón "Next" del footer del wizard

**3. `ContactFormStep.jsx`**
Formulario de contacto estructurado.

Props: `step`, `value` (objeto con los campos), `onChange`

Config del step:
```js
{
  id: 'contact',
  type: 'contact-form',
  title: 'Introduce your contact info',
  description: 'I will send you the quote with the approximate cost to your email.',
  fields: [
    { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
    { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
    { id: 'description', type: 'textarea', label: 'Describe the project.', placeholder: 'Please, be the most detailed possible...', required: false,
      hints: ['Type of book', 'Genre', 'Style of illustration (add example)', 'Quality of characters', 'If is an scene describe the plane', 'Delivery time limit'] },
    { id: 'references', type: 'file', label: 'Reference images', required: false,
      accept: 'image/*', maxFiles: 10, maxSizeMB: 5,
      placeholder: 'Drop images here or click to browse',
      hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
  ],
  checkboxes: [
    { id: 'terms', label: 'I accept the terms and conditions.', required: true },
    { id: 'newsletter', label: "I accept to receive information and emails. (I don't send spam, don't worry.)", required: false },
  ],
  next: 'review',
}
```

Renderizado:
- Título + descripción
- Para cada field: label, input/textarea con estilos .wiz-step-input (ya existen del wizard anterior)
- Si el field tiene `hints`: mostrar debajo del label como lista con bullet points en font-size 11px, color var(--text-muted), margin-bottom 4px. Texto "Include:" antes de la lista.
- Para textarea: min-height 120px, resize vertical
- Para `type: 'file'`:
  - Input `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>` oculto con `display: none`
  - Zona de drop visual: border 2px dashed var(--border), border-radius 10px, padding 24px, text-align center, cursor pointer, transition border-color 0.2s
  - Al hacer hover o drag-over: border-color var(--accent), background var(--accent-tint)
  - Texto placeholder en color var(--text-muted), font-size 13px
  - Hint debajo: font-size 11px, color var(--text-muted)
  - Validación client-side: rechazar archivos > `maxSizeMB` MB (mostrar toast/error inline "File too large. Max 5 MB."), rechazar tipos que no sean image/jpeg, image/png, image/webp (mostrar "Only JPG, PNG and WEBP files are allowed."), limitar a `maxFiles` archivos
  - Preview de archivos subidos: grid de thumbnails (60x60px, object-fit cover, border-radius 6px) con botón X para eliminar cada uno. Mostrar nombre del archivo truncado debajo (font-size 10px)
  - Los archivos se guardan como `File[]` en el value del field. NO se suben inmediatamente — se envían junto con el formulario al hacer submit (ver Prompt 6 para el endpoint multipart)
  - onChange guarda `{ name: '...', email: '...', references: [File, File, ...], terms: true, ... }`
- Checkboxes de T&C al final: checkbox custom (mismo estilo que ChecklistStep pero más pequeño, 16x16px)
- onChange se llama con el objeto completo en cada cambio

**4. `CalculatorStep.jsx`**
Calculadora de precios DINÁMICA embebida dentro del wizard. Se adapta según el tipo de servicio.

Props: `step`, `value`, `onChange`, `answers`

Este paso lee `step.pricingConfigId` para saber QUÉ configuración de pricing usar. Importa `PRICING_CONFIGS` de `data/commissionPricing.js` y obtiene la config correcta:

```js
import { PRICING_CONFIGS } from '@/data/commissionPricing';
const config = PRICING_CONFIGS[step.pricingConfigId];
```

Cada config tiene: `{ dimensions: [...], addons: [...], prices: {...}, calculate(selections) }`.
Cada dimensión es `{ id, label, options: [{ id, label, thumbnail? }], dependsOn? }`.
Si una dimensión tiene `dependsOn: 'style'`, sus opciones se filtran por la selección actual de esa dimensión (igual que FINISHES_BY_STYLE funciona hoy, pero genérico).

Renderizado:
- Título: `step.title` (ej: "Here's your estimate")
- Por cada dimensión en `config.dimensions`: una fila de chips (mismos estilos .wiz-step-option pero horizontales). El label de la dimensión como subtítulo.
- Si la dimensión tiene `dependsOn`, solo mostrar opciones que corresponden al valor seleccionado en esa dimensión padre.
- Addons de `config.addons`: checkboxes compactos (misma interfaz que los ADDONS actuales)
- Precio resultado: card destacado con background var(--accent-tint), precio grande
- onChange guarda `{ selections: { dim1: 'val', dim2: 'val', ... }, addons: {...}, estimate: { base, total } }`
- Usa `config.calculate(selections, addons)` para obtener el estimate

**5. `BudgetCheckStep.jsx`**
Pregunta si el cliente tiene el presupuesto.

Props: `step`, `answers`, `onYes()`, `onNo()`

Renderizado:
- Muestra el precio calculado (de answers del calculator step): "$XXX USD"
- Pregunta: "Do you have the budget for this?"
- Dos botones: "Yes, let's continue" → onYes(), "Not right now" → onNo()
- NO muestra botón "Next" del footer

**6. `CompletionStep.jsx`**
Pantalla final.

Props: `step`, `onClose()`, `outcome`

Config:
```js
{
  id: 'done',
  type: 'completion',
  title: 'Ready!',
  message: "I'll send to you a quote soon. Thanks for your time!",
  buttonLabel: 'Return to select the services.',
}
// Variante waitlist:
{
  id: 'waitlisted',
  type: 'completion',
  title: 'Now you are on the waitlist.',
  message: 'Check your email to get the id number to get the benefits in the future.',
  buttonLabel: 'Return to select the services.',
}
```

Renderizado:
- Ícono de check (SVG circular, background var(--accent-tint), color var(--accent))
- Título: font-size 20px, font-weight 700
- Mensaje: font-size 14px, color var(--text-muted)
- Botón: ancho completo, background var(--accent), color white. Al clickear: onClose()
- NO muestra botón "Next" del footer

### CSS:
REEMPLAZA todo el bloque de CSS del wizard (`.wiz-*`) en `styles/globals.css` con los nuevos estilos. Incluye:
- Estilos del modal/overlay (`.wiz-overlay`, `.wiz-popup`, `.wiz-return`, `.wiz-content`, `.wiz-next-btn`)
- Animaciones (fade-in, slide-up, step transitions)
- Estilos de TODOS los tipos de paso (`.wiz-step-*`)
- El popup en mobile: width 100%, height 100vh, border-radius 0 (full screen)
- El popup en desktop (>600px): max-width 480px, max-height 85vh, border-radius 16px

Devuélveme:
1. `components/wizard/WizardModal.jsx` — reescrito completo
2. `components/wizard/steps/ChecklistStep.jsx` — nuevo
3. `components/wizard/steps/BlockingStep.jsx` — nuevo
4. `components/wizard/steps/ContactFormStep.jsx` — nuevo
5. `components/wizard/steps/CalculatorStep.jsx` — nuevo
6. `components/wizard/steps/BudgetCheckStep.jsx` — nuevo
7. `components/wizard/steps/CompletionStep.jsx` — nuevo
8. Bloque CSS COMPLETO del wizard (reemplaza todo el `.wiz-*` existente en globals.css)
9. Modificaciones a SummaryStep.jsx si son necesarias para la nueva API
```

---

## PROMPT 3b — Sistema de pricing multi-configuración

```
Continuando con el proyecto. Actualmente `data/commissionPricing.js` solo tiene una matriz de precios para retratos (style × framing × finish). Pero la calculadora del wizard necesita mostrar DIFERENTES dimensiones y precios según el tipo de servicio. No es lo mismo las variantes de un retrato, que las de una bookcover, o un dibujo NSFW.

Necesito expandir `data/commissionPricing.js` para que exporte un objeto `PRICING_CONFIGS` con múltiples configuraciones de pricing. Cada config define sus propias dimensiones, opciones, precios y función de cálculo.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8
- CSS tokens en `:root` (--ink, --paper, --accent, etc.)
- NO instalar dependencias nuevas
- El archivo `data/commissionPricing.js` ya existe. MANTÉN las exports actuales (STYLES, FRAMINGS, FINISHES_BY_STYLE, BASE_PRICES, ADDONS, calculateEstimate) para que `CommissionCalculator.jsx` (la calculadora standalone) siga funcionando. AÑADE la nueva export `PRICING_CONFIGS` al final.

### Estructura de cada pricing config:

```js
// Cada config en PRICING_CONFIGS tiene esta forma:
{
  id: 'portraits',           // identificador único
  label: 'Portrait pricing', // nombre legible
  currency: 'USD',

  // Dimensiones: qué selecciona el usuario (equivale a style/framing/finish pero genérico)
  dimensions: [
    {
      id: 'style',
      label: 'Style',
      options: [
        { id: 'chibi', label: 'Chibi', thumbnail: '/recursos/style_chibi_thumb.webp' },
        { id: 'anime', label: 'Anime / Stylized', thumbnail: '/recursos/style_anime_thumb.webp' },
        // ...
      ],
    },
    {
      id: 'finish',
      label: 'Finish',
      dependsOn: 'style',  // <-- las opciones cambian según el style seleccionado
      optionsByParent: {
        chibi: [
          { id: 'sketch', label: 'Sketch / Lineart' },
          { id: 'flat', label: 'Flat color' },
          // ...
        ],
        anime: [ /* ... */ ],
      },
    },
    {
      id: 'framing',
      label: 'Framing',
      options: [
        { id: 'bust', label: 'Bust' },
        { id: 'half', label: 'Half body' },
        { id: 'full', label: 'Full body' },
      ],
    },
  ],

  // Addons: extras opcionales (misma interfaz que ADDONS actual)
  addons: [
    { id: 'extra_char', label: 'Extra character', pct: 50, on: 'base', per: true, note: 'Per extra character' },
    // ...
  ],

  // Precios base: prices[dim1][dim2][dim3] = USD
  // El orden de las keys corresponde al orden de dimensions
  prices: {
    chibi: { sketch: { bust: 40, half: 55, full: 75 }, /* ... */ },
    // ...
  },

  // Función de cálculo (misma lógica que calculateEstimate pero genérica)
  calculate(selections, addonSelections) {
    // selections = { style: 'anime', finish: 'render', framing: 'full' }
    // addonSelections = { extra_char: 2, commercial: true }
    // Retorna: { base, subtotal, total } o null si faltan selecciones
  },
}
```

### Configs a crear:

**1. `portraits`** — Retratos y arte personal
- Dimensiones: style (chibi, anime, semi, hiper) → finish (depende del style) → framing (bust, half, full)
- Addons: extra_char, bg_detail, bg_complex, non_human, panoramic, commercial, extra_rev
- Precios: REUTILIZA los mismos datos de BASE_PRICES actual
- Es la config por defecto. `calculate()` es equivalente a `calculateEstimate()` actual

**2. `editorial`** — Book covers e ilustración editorial (para autores)
- Dimensiones:
  - coverType: front cover only, front+back wrap, full wrap (front+back+spine)
  - complexity: simple (1-2 elements), medium (3-5 elements + bg), complex (full scene)
  - illustrationStyle: stylized/flat, semi-realistic, fully painted
- Addons: typography/lettering (+$50-100 flat), extra revision, commercial license, rush delivery (+30%)
- Precios base (ejemplo, ajusta para que sea coherente):
  - front only / simple / stylized: $200
  - front only / complex / fully painted: $600
  - full wrap / complex / fully painted: $1200
- El rango debe ir de ~$200 a ~$1500

**3. `studio`** — Assets para estudios (concept art, visual dev, character design)
- Dimensiones:
  - assetType: concept art, character design sheet, visual key, environment design
  - detailLevel: rough/exploratory, refined, production-ready
  - quantity: 1 piece, 3-pack (-10%), 5-pack (-15%), 10-pack (-20%)
- Addons: turnaround/rotation sheet (+40%), expression sheet (+25%), commercial license (+75%), rush (+30%)
- Precios base (ejemplo):
  - concept art / rough / 1 piece: $150
  - character design sheet / production-ready / 1 piece: $500
  - visual key / production-ready / 1 piece: $800
- El rango debe ir de ~$150 a ~$1000 por pieza (antes de descuento por pack)
- `calculate()` aplica el descuento del pack sobre el total

**4. `nsfw`** — Contenido NSFW
- Dimensiones: MISMAS que portraits (style → finish → framing)
- Diferencia en addons: NO incluye nsfw_soft ni nsfw_hard (ya está implícito), AÑADE:
  - complex_anatomy (+25%), explicit_scene (+20%), multiple_chars_nsfw (+60% per char)
- Precios base: portraits × 1.3 (30% markup sobre la matriz base de portraits)
- `calculate()` usa BASE_PRICES × 1.3 como base, luego aplica addons propios

**5. `merch`** — Merch y productos (para fandoms)
- Dimensiones:
  - productType: sticker design, print/poster, apparel graphic, pin/enamel design
  - complexity: simple (1 char, no bg), standard (1 char + simple bg), complex (scene/multiple chars)
- Addons: variations/colorways (+$30 each, per), commercial license (+75%), vectorization (+$50 flat)
- Precios base (ejemplo):
  - sticker / simple: $60
  - print / complex: $350
  - apparel / complex: $400
- El rango debe ir de ~$60 a ~$500

### IMPORTANTE:
- Las exports ACTUALES (STYLES, FRAMINGS, FINISHES_BY_STYLE, BASE_PRICES, ADDONS, calculateEstimate) NO se tocan — siguen existiendo para la calculadora standalone de CommissionCalculator.jsx.
- PRICING_CONFIGS se exporta como un objeto `{ portraits, editorial, studio, nsfw, merch }`.
- El CalculatorStep.jsx (del Prompt 3) lee `step.pricingConfigId` y busca en `PRICING_CONFIGS[step.pricingConfigId]`.
- Las categorías `brands` y `uxui` NO tienen calculadora — van directo de selección de servicios a contact-form.
- Los precios son ORIENTATIVOS. Lo importante es que la estructura sea correcta y los rangos sean coherentes.

Devuélveme:
1. `data/commissionPricing.js` — archivo COMPLETO (mantén las exports originales intactas al inicio, añade PRICING_CONFIGS después)
```

---

## PROMPT 4 de 8 — Configuraciones de wizard por categoría de servicio

```
Continuando con el proyecto. El motor de wizard con branching está listo en `context/WizardContext.jsx` y soporta estos tipos de paso: info, single-select, multi-select, text-input, summary, checklist, blocking, contact-form, calculator, budget-check, completion.

Ahora necesito crear las configuraciones de wizard para CADA categoría de servicio. Cada wizard es un grafo de pasos con branching.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8
- Las configuraciones van en `data/wizards/`
- Cada wizard es un objeto exportado con `{ id, title, steps: [...] }`
- Cada paso tiene un `next` que puede ser string o función `(answers) => stepId`
- El motor resuelve `next` para navegar. Los pasos `blocking`, `budget-check`, y `completion` manejan su propia navegación.

### Flujo general (aplicable a todas las categorías con variaciones):

```
[sub-services] → [requirements-checklist] → {missing required?}
                                                ├─ Yes → [blocking: sorry] → {waitlist or "do it for me"}
                                                │          ├─ waitlist → [waitlist-form] → [completion: waitlisted]
                                                │          └─ do it → [service-selection] (vuelve al flujo)
                                                └─ No → [service-selection] → [calculator] → [budget-check]
                                                                                                ├─ Yes → [contact-form] → [completion: done]
                                                                                                └─ No → [waitlist offer] → [waitlist-form] → [completion: waitlisted]
```

### Archivo: `data/wizards/authorsWizard.js`

Wizard para la categoría "For authors". Pasos:

**Paso 1 — Sub-servicios** (single-select)
```js
{
  id: 'author-service',
  type: 'single-select',
  title: 'What do you need?',
  description: 'Each service is different and it cost too. You\'ll need to have ready different things.',
  options: [
    { id: 'book-covers', label: 'Book covers', description: 'An illustrated book cover custom for your story.' },
    { id: 'interior-illustrations', label: 'Interior illustrations', description: 'Chapter header art, full page scenes, character portrait, line art/icon illustrations.' },
    { id: 'extras', label: 'Extras', description: 'Dust jacket, bookmarks, escapames.' },
    { id: 'worldbuilding', label: 'Worldbuilding', description: 'Character card, visual development, map illustration, endpoints, family tree, timeline or lore chart, house sigil design.' },
    { id: 'merch', label: 'Merch', description: 'Bookmark, sticker sheet, art print, enamel pin design, bookplate design.' },
    { id: 'marketing', label: 'Marketing', description: 'Branding, promotional banners, social media teaser graphics, post card, cover reveal graphic, poster.' },
  ],
  next: 'author-requirements',
}
```

**Paso 2 — Requisitos** (checklist)
```js
{
  id: 'author-requirements',
  type: 'checklist',
  title: 'We need all this to start',
  description: 'Mark everything you have.',
  items: [
    { id: 'content-complete', label: 'The content is complete.', detail: 'This includes edition and corrections necessary for this book.', required: true },
    { id: 'details-complete', label: 'I have the details complete.', detail: 'Includes: additional information, name, register, legal.', required: true },
    { id: 'has-isbn', label: 'I have ISBN.', detail: "It's necessary for completing the pricing.", required: false },
    { id: 'story-resume', label: 'I have an idea and story resume.', detail: "It's necessary for a better development of the book.", required: true },
    { id: 'character-look', label: 'I know how my character/scenario looks.', detail: "It's necessary that you have a visual key or character design to improve and guarantee the quality of the illustration.", required: true },
  ],
  next: 'author-specific-services',
  blockingStepId: 'author-sorry-missing',
}
```

**Paso 2b — Bloqueo por falta de requisitos** (blocking)
```js
{
  id: 'author-sorry-missing',
  type: 'blocking',
  title: "Sorry I can't do it if you don't have it.",
  description: "I can't develop the things that you need right now.",
  primaryAction: { label: 'I want you to do it, please!', stepId: 'author-specific-services' },
  secondaryAction: { label: 'Return to select the services.', action: 'close' },
}
```

**Paso 2c — Bloqueo por ISBN/contenido** (blocking, se activa si falta ISBN)
El checklist step necesita lógica más fina: si falta `content-complete` O `details-complete` → va a `author-sorry-missing`. Si esos están OK pero falta `has-isbn` → va a `author-sorry-isbn`.

Para esto, en vez de un solo `blockingStepId`, usa una función en `next`:
```js
// En el checklist step:
next: (answers) => {
  const checks = answers['author-requirements'] || {};
  if (!checks['content-complete'] || !checks['details-complete'] || !checks['story-resume'] || !checks['character-look']) {
    return 'author-sorry-missing';
  }
  if (!checks['has-isbn']) {
    return 'author-sorry-isbn';
  }
  return 'author-specific-services';
},
// Elimina blockingStepId, la lógica está toda en next
```

**Paso 2d — Bloqueo por ISBN** (blocking)
```js
{
  id: 'author-sorry-isbn',
  type: 'blocking',
  title: "Sorry I can't do it if you don't have the ISBN/the content complete.",
  description: "It's necessary to have these things complete to start this type of work, but meanwhile you have it I can add you to a waitlist to give you priority when you need it!",
  primaryAction: { label: 'Please add me to the waitlist..', stepId: 'waitlist-form' },
  secondaryAction: { label: 'Return to select the services.', action: 'close' },
}
```

**Paso 3 — Selección de servicios específicos** (multi-select)
```js
{
  id: 'author-specific-services',
  type: 'multi-select',
  title: 'Choice what do you want I do it.',
  description: 'Check every you need:',
  options: [
    { id: 'concept-art', label: 'Concept Art', description: 'Explores preliminary visual ideas, shaping atmospheres, characters, and settings before final design decisions.' },
    { id: 'visual-development', label: 'Visual development', description: "Visual development is the process of refining a story's visual identity through merch, palettes, and symbolic imagery." },
    { id: 'visual-key', label: 'Visual key', description: "A central visual motif that encapsulates the story's theme and atmosphere." },
    { id: 'character-design', label: 'Character Design', description: "Defines a character's visual identity, including appearance, style, and symbolic traits for narrative consistency." },
  ],
  min: 1,
  next: 'author-calculator',
}
```

**Paso 4 — Calculadora** (calculator)
```js
{
  id: 'author-calculator',
  type: 'calculator',
  pricingConfigId: 'editorial',
  title: "Here's your estimate",
  description: 'Configure your commission to see the price.',
  next: 'author-budget',
}
```

**Paso 5 — Verificación de presupuesto** (budget-check)
```js
{
  id: 'author-budget',
  type: 'budget-check',
  title: 'Can you afford this budget?',
  calculatorStepId: 'author-calculator',
  yesStepId: 'author-contact',
  noStepId: 'waitlist-offer',
}
```

**Paso 6 — Formulario de contacto** (contact-form)
```js
{
  id: 'author-contact',
  type: 'contact-form',
  title: 'Introduce your contact info',
  description: 'I will send you the quote with the approximate cost to your email.',
  fields: [
    { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
    { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
    { id: 'description', type: 'textarea', label: 'Describe the project.', placeholder: 'Please, be the most detailed possible...',
      hints: ['Type of book', 'Genre', 'Style of illustration (add example)', 'Quality of characters', 'If is a scene describe the plane', 'Delivery time limit'] },
    { id: 'references', type: 'file', label: 'Reference images', required: false,
      accept: 'image/*', maxFiles: 10, maxSizeMB: 5,
      placeholder: 'Drop images here or click to browse',
      hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
  ],
  checkboxes: [
    { id: 'terms', label: 'I accept the terms and conditions.', required: true },
  ],
  next: 'author-done',
}
```

**Paso 7 — Completado** (completion)
```js
{
  id: 'author-done',
  type: 'completion',
  title: 'Ready!',
  message: "I'll send to you a quote soon. Thanks for your time!",
  buttonLabel: 'Return to select the services.',
}
```

**Pasos compartidos (waitlist):**
```js
{
  id: 'waitlist-offer',
  type: 'blocking',
  title: "That's okay!",
  description: "I can add you to my waitlist so you get priority when you're ready.",
  primaryAction: { label: 'Please add me to the waitlist', stepId: 'waitlist-form' },
  secondaryAction: { label: 'Return to select the services.', action: 'close' },
},
{
  id: 'waitlist-form',
  type: 'contact-form',
  title: 'Introduce your email and your name',
  description: 'Check your email and keep the number I sent to you to maintain the benefits.',
  fields: [
    { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
    { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
  ],
  checkboxes: [
    { id: 'terms', label: 'I accept the terms and conditions.', required: true },
    { id: 'newsletter', label: "I accept to receive information and emails. (I don't send spam, don't worry.)", required: false },
  ],
  next: 'waitlisted',
},
{
  id: 'waitlisted',
  type: 'completion',
  title: 'Now you are on the waitlist.',
  message: 'Check your email to get the id number to get the benefits in the future.',
  buttonLabel: 'Return to select the services.',
}
```

### Ahora crea los wizards para LAS 7 CATEGORÍAS:

Usa el wizard de authors como plantilla. Cada categoría tiene:
- Sub-servicios diferentes (paso 1)
- Requisitos diferentes (paso 2)  
- Servicios específicos diferentes (paso 3)
- **Calculadora con `pricingConfigId` diferente** según la categoría (ver Prompt 3b para las configs)
- Budget-check, contacto y completado son iguales/similares
- Los pasos de waitlist son COMPARTIDOS entre todas

**Categorías, sub-servicios y `pricingConfigId`:**

1. **authors** — (ya definido arriba)
   - `pricingConfigId: 'editorial'`
   - Dimensiones: cover type × complexity × illustration style

2. **personal** — Para uso personal:
   - Comisiones de retratos, fanarts, regalos para bodas, mascotas, etc.
   - Requisitos: fotos de referencia, idea clara, presupuesto
   - Servicios: portrait, pet portrait, wedding illustration, gift illustration
   - `pricingConfigId: 'portraits'`
   - Dimensiones: style × framing × finish (la matriz actual de commissionPricing.js)

3. **studios** — Para estudios:
   - Visual keys, character development, concept art, merch illustration
   - Requisitos: brief del proyecto, guía de estilo (si existe), timeline
   - Es un formulario de contacto más formal (nombre del estudio, presupuesto aproximado, tipo de trabajo, área, fecha de entrega, urgencia, T&C)
   - `pricingConfigId: 'studio'`
   - Dimensiones: asset type × detail level × quantity
   - Nota: el studio wizard puede ir directo a contact-form sin calculadora si el scope es muy custom (decisión via `next` condicional)

4. **fandoms** — Para fandoms:
   - Fanarts de personajes favoritos, custom merch
   - Requisitos: fotos del personaje, referencias de estilo, idea clara, presupuesto
   - Servicios: fanart, custom merch, sticker design
   - `pricingConfigId: 'portraits'` (misma config que personal — son retratos de personajes)

5. **brands** — Para marcas:
   - Banners, logos, brand design
   - Requisitos: brief de marca, assets existentes (si hay)
   - Formulario de contacto empresarial
   - **SIN calculadora** — va directo de servicios a contact-form. El pricing de marca es "contact for quote"

6. **uxui** — UX/UI:
   - Diseño de interfaces, web development
   - Requisitos: brief del proyecto, wireframes (si hay), scope
   - Formulario de contacto técnico
   - **SIN calculadora** — va directo de servicios a contact-form. El pricing de UX/UI es por proyecto

7. **nsfw** — NSFW content:
   - Contenido bloody/explicit, anthropomorphic
   - Requisitos: descripción detallada, referencias, confirmación de edad
   - Disclaimer adicional sobre restricciones
   - `pricingConfigId: 'nsfw'`
   - Dimensiones: misma matriz de portraits PERO con modificadores NSFW ya incluidos en base y addons diferentes (sin addon "NSFW suggestive/explicit" porque ya está implícito, pero con addons específicos como "complex anatomy", "multiple characters NSFW")

### Archivos a crear:
- `data/wizards/authorsWizard.js`
- `data/wizards/personalWizard.js`
- `data/wizards/studiosWizard.js`
- `data/wizards/fandomsWizard.js`
- `data/wizards/brandsWizard.js`
- `data/wizards/uxuiWizard.js`
- `data/wizards/nsfwWizard.js`

### Actualizar el registro:
`data/wizards/index.js`:
```js
import { workWithYouWizard } from './workWithYou';
import { authorsWizard } from './authorsWizard';
import { personalWizard } from './personalWizard';
// ... etc

export const WIZARDS = {
  'work-with-you': workWithYouWizard,
  'authors': authorsWizard,
  'personal': personalWizard,
  'studios': studiosWizard,
  'fandoms': fandomsWizard,
  'brands': brandsWizard,
  'uxui': uxuiWizard,
  'nsfw': nsfwWizard,
};
```

### IMPORTANTE sobre pasos compartidos (waitlist):
Los pasos de waitlist (waitlist-offer, waitlist-form, waitlisted) son IGUALES en todos los wizards. Para no duplicar, crea un archivo `data/wizards/_sharedSteps.js` que exporte un array con estos 3 pasos. Cada wizard los importa y los incluye en su array de steps con spread:
```js
import { sharedWaitlistSteps } from './_sharedSteps';
export const authorsWizard = {
  id: 'authors',
  title: 'For authors',
  steps: [ ...authorSteps, ...sharedWaitlistSteps ],
};
```

Devuélveme:
1. `data/wizards/_sharedSteps.js` — pasos compartidos
2. Los 7 archivos de wizard (authorsWizard.js, personalWizard.js, etc.)
3. `data/wizards/index.js` — actualizado
4. Asegúrate de que cada wizard tiene IDs de paso ÚNICOS (prefijados con la categoría: `author-service`, `personal-service`, `studio-service`, etc.) EXCEPTO los pasos compartidos de waitlist.
```

---

## PROMPT 5 de 8 — Conexión de la página de servicios con los wizards

```
Continuando con el proyecto. Ya existen:
- Página de servicios `/services` con 7 cards de categorías (cada uno hace `console.log('open wizard:', categoryId)` como placeholder)
- Motor de wizard con branching en `context/WizardContext.jsx`
- WizardModal reescrito con todos los tipos de paso
- 7 configuraciones de wizard en `data/wizards/`
- Registro de wizards en `data/wizards/index.js`

Ahora necesito CONECTAR todo: los cards abren el wizard correcto.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, `'use client';`
- `useWizard()` expone `openWizard(config)` donde config es el objeto completo del wizard

### Modificaciones necesarias:

#### 1. `app/services/page.js`:
- Importar `useWizard` de `../../context/WizardContext`
- Importar `WIZARDS` de `../../data/wizards`
- Cada card de servicio: al clickear, llama `openWizard(WIZARDS[category.id])`
- El botón "REQUEST A COMMISSION" de arriba: abre `openWizard(WIZARDS['work-with-you'])` (el wizard genérico)

Reemplaza el `console.log` placeholder por la llamada real.

```jsx
// En el onClick de cada card de servicio:
onClick={() => openWizard(WIZARDS[category.id])}

// En el botón REQUEST A COMMISSION:
onClick={() => openWizard(WIZARDS['work-with-you'])}
```

#### 2. Verificar que `app/layout.js` tiene WizardProvider y WizardModal:
El layout ya debería tener esto del wizard anterior. Verifica que:
- `WizardProvider` envuelve todo
- `<WizardModal />` se renderiza como último hijo dentro del Provider

Si la API cambió (antes era `openWizard(wizardId, steps)`, ahora es `openWizard(config)`), actualiza TODOS los archivos que llaman `openWizard`:
- `app/services/page.js`
- `app/links/page.js` (si usa el wizard)
- Cualquier otro archivo que importe useWizard

#### 3. IntentionCard (si existe integración con wizard):
Si `components/linkinbio/IntentionCard.jsx` tiene integración con el wizard viejo, actualiza la llamada a la nueva API:
```js
// Antes: openWizard('work-with-you', WIZARDS['work-with-you'].steps)
// Después: openWizard(WIZARDS['work-with-you'])
```

#### 4. `data/linkInBioConfig.js`:
Si tiene un `wizardId` en algún botón, verifica que la conexión siga funcionando con la nueva API.

Devuélveme:
1. `app/services/page.js` — actualizado con la conexión al wizard
2. `app/links/page.js` — actualizado si necesita cambios de API
3. `components/linkinbio/IntentionCard.jsx` — actualizado si necesita cambios
4. `app/layout.js` — verificado/actualizado
5. Lista de TODOS los archivos que llamaban openWizard y cómo cambió la llamada
```

---

## PROMPT 6 de 8 — Backend: endpoints de comisiones y waitlist

```
Continuando con el proyecto. El frontend tiene wizards que recopilan datos del usuario y llegan a dos posibles finales: comisión enviada (completion) o registro en waitlist. Necesito los endpoints del backend para guardar ambos.

### Stack del backend:
- Express.js en `backend/`, port 3001
- Para este MVP: guardar en archivos JSON locales (sin DB todavía)
- El backend ya puede tener estructura parcial — lee el archivo principal del servidor primero

### Lee primero estos archivos para entender la estructura:
- `backend/server.js` o `backend/index.js` (el archivo principal)
- Cualquier carpeta `backend/routes/` o `backend/controllers/` si existe

### Endpoints necesarios:

#### POST `/api/commissions` — Nueva solicitud de comisión
Este endpoint recibe **multipart/form-data** (no JSON) porque incluye archivos de referencia.

Instala `multer` para manejar uploads:
```bash
cd backend && npm install multer
```

Campos de texto (enviados como campos del form):
- `data` — string JSON con el payload completo:
```json
{
  "category": "authors",
  "subService": "book-covers",
  "specificServices": ["concept-art", "visual-development"],
  "requirements": { "content-complete": true, "details-complete": true, "has-isbn": true },
  "calculator": { "selections": { "coverType": "front", "complexity": "medium", "illustrationStyle": "semi-realistic" }, "addons": {}, "estimate": { "base": 400, "total": 400 } },
  "contact": { "name": "John Doe", "email": "john@example.com", "description": "I need..." },
  "submittedAt": "2026-09-23T12:00:00.000Z"
}
```

Archivos (campo `references`):
- Hasta 10 archivos de imagen (JPG, PNG, WEBP)
- Máximo 5 MB por archivo
- Se guardan en `backend/uploads/commissions/{commissionId}/`

Configuración de multer:
```js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/tmp'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

Debe:
1. Parsear el campo `data` como JSON
2. Validar: email y name presentes, terms aceptados
3. Generar ID: `COM-XXXXXX` (6 chars alfanuméricos)
4. Si hay archivos: mover de `uploads/tmp/` a `uploads/commissions/{id}/`
5. Guardar en `backend/data/commissions.json` con status "pending" y `referenceFiles: [filenames]`
6. Responder: `{ success: true, id: "COM-A1B2C3", message: "Commission request received" }`
7. Crear las carpetas `backend/uploads/tmp` y `backend/uploads/commissions` si no existen (usar `fs.mkdirSync` con `recursive: true` al iniciar el servidor)

#### POST `/api/waitlist` — Registro en waitlist
Body esperado:
```json
{
  "category": "authors",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "terms": true,
  "newsletter": false,
  "reason": "missing-isbn",
  "registeredAt": "2026-09-23T12:00:00.000Z"
}
```

Debe:
1. Validar: email y name presentes, terms aceptados
2. Generar ID: `WL-XXXXXX`
3. Guardar en `backend/data/waitlist.json`
4. Responder: `{ success: true, id: "WL-A1B2C3", message: "Added to waitlist" }`

#### GET `/api/commissions` — Listar comisiones (para admin futuro)
#### GET `/api/waitlist` — Listar waitlist (para admin futuro)

### Middleware CORS:
Configurar para aceptar requests desde `http://localhost:3000`.

### Rate limiting:
Máximo 5 POST por IP por hora (Map en memoria).

### Seguridad:
- Sanitizar strings (trim, limitar longitud a 2000 chars)
- No guardar nada innecesario

Devuélveme:
1. Archivo(s) de rutas para comisiones y waitlist
2. Modificaciones al archivo principal del servidor si son necesarias
3. Comando de instalación de dependencias si hace falta
```

---

## PROMPT 7 de 8 — Integración wizard → backend + auto-submit + pulido

```
Continuando con el proyecto. Todo está implementado:
- Página de servicios con 7 categorías
- Motor de wizard con branching
- 7 configuraciones de wizard
- Tipos de paso: checklist, blocking, contact-form, calculator, budget-check, completion
- Backend con endpoints POST /api/commissions y POST /api/waitlist

Falta la pieza clave: cuando el wizard llega al paso `completion`, debe ENVIAR los datos al backend automáticamente.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, `'use client';`

### Tareas:

#### 1. Auto-submit en CompletionStep:
Cuando el wizard llega a un paso `completion`, el CompletionStep debe:

**Si el paso tiene `submitTo: 'commissions'`:**
1. Recopilar datos de answers: category (del wizardConfig.id), subService, specificServices, requirements, calculator, contact
2. Construir un `FormData`: campo `data` con el JSON del payload, y por cada archivo en `contact.references` añadir `formData.append('references', file)`
3. Hacer POST a `http://localhost:3001/api/commissions` con el FormData (NO poner Content-Type manualmente — fetch lo pone automáticamente con el boundary)
4. Mientras envía: mostrar "Sending..." con spinner
5. Si OK: mostrar el título y mensaje normales + ID recibido
6. Si error: mostrar mensaje de error con opción de reintentar

**Si el paso tiene `submitTo: 'waitlist'`:**
1. Recopilar: category, name, email, terms, newsletter, reason
2. POST a `http://localhost:3001/api/waitlist`
3. Misma UX de loading/success/error

Modifica las configs de completion en los wizards para incluir `submitTo`:
```js
// En cada wizard, el paso 'done':
{
  id: 'author-done',
  type: 'completion',
  submitTo: 'commissions', // NEW
  title: 'Ready!',
  // ...
}
// El paso 'waitlisted' (compartido):
{
  id: 'waitlisted',
  type: 'completion',
  submitTo: 'waitlist', // NEW
  title: 'Now you are on the waitlist.',
  // ...
}
```

#### 2. Mapping de answers a body del request:
El CompletionStep necesita un helper que mapee las answers del wizard al formato del backend. Crea una función `buildSubmission(wizardConfig, answers)`:

```js
function buildCommissionPayload(wizardConfig, answers) {
  const category = wizardConfig.id;
  const steps = wizardConfig.steps;
  
  const singleSelectStep = steps.find(s => s.type === 'single-select');
  const multiSelectStep = steps.find(s => s.type === 'multi-select');
  const checklistStep = steps.find(s => s.type === 'checklist');
  const calculatorStep = steps.find(s => s.type === 'calculator');
  const contactStep = steps.find(s => s.type === 'contact-form' && s.id !== 'waitlist-form');

  const contactData = contactStep ? { ...answers[contactStep.id] } : {};
  // Extraer archivos del contacto (son File[], no se pueden serializar a JSON)
  const referenceFiles = contactData.references || [];
  delete contactData.references;

  const payload = {
    category,
    subService: singleSelectStep ? answers[singleSelectStep.id] : null,
    specificServices: multiSelectStep ? answers[multiSelectStep.id] : [],
    requirements: checklistStep ? answers[checklistStep.id] : {},
    calculator: calculatorStep ? answers[calculatorStep.id] : null,
    contact: contactData,
    submittedAt: new Date().toISOString(),
  };

  // Construir FormData para envío multipart
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  referenceFiles.forEach(file => formData.append('references', file));

  return formData;
}

function buildWaitlistPayload(wizardConfig, answers) {
  const category = wizardConfig.id;
  const waitlistForm = answers['waitlist-form'] || {};
  return {
    category,
    name: waitlistForm.name || '',
    email: waitlistForm.email || '',
    terms: waitlistForm.terms || false,
    newsletter: waitlistForm.newsletter || false,
    reason: 'budget-or-requirements',
    registeredAt: new Date().toISOString(),
  };
}
```

#### 3. Metadata SEO:
Crea layouts con metadata para las subpáginas que existen:
- `app/services/portraits/layout.js` (si /services/portraits sigue existiendo)
- `app/services/fiction/layout.js` (si /services/fiction sigue existiendo)

Si estas subpáginas ya no son relevantes (el flujo ahora es wizard, no subpáginas), coméntalas pero no las borres todavía.

#### 4. Actualizar `app/layout.js`:
Verifica que la estructura del layout es correcta:
```jsx
<WizardProvider>
  <OffcanvasProvider>
    <Header />
    {children}
    <Footer />
    <ScrollToTop />
    <Offcanvas />
  </OffcanvasProvider>
  <WizardModal />
</WizardProvider>
```

#### 5. CSS responsive final:
Verifica que el wizard popup tiene:
- Mobile (<600px): full screen (width 100%, height 100vh o 100dvh, border-radius 0)
- Desktop (>600px): centered card (max-width 480px, max-height 85vh, border-radius 16px)
- El contenido del popup es scrollable (.wiz-content: overflow-y auto, flex 1)
- Todos los botones/inputs tienen min-height 44px para touch targets

Lista cualquier media query que falte.

Devuélveme:
1. `components/wizard/steps/CompletionStep.jsx` — actualizado con auto-submit
2. `data/wizards/_sharedSteps.js` — actualizado con `submitTo`
3. Cada wizard file que necesite `submitTo` en su paso de completion
4. `app/layout.js` — verificado
5. Layout files de metadata si son necesarios
6. Lista de ajustes CSS responsive pendientes
```

---

## Notas de ejecución

- **Orden estricto**: Prompt 1 → 2 → 3 → 3b → 4 → 5 → 6 → 7. Cada uno depende del anterior.
- **Verificación entre prompts**: Después de cada prompt, corre `npm run dev` y verifica que no haya errores. Si hay errores, arréglalo antes de seguir.
- **CSS**: Todo en `styles/globals.css`. No crear archivos CSS separados.
- **Prefijos CSS**: `.srv-` (services page), `.wiz-` (wizard — reemplazar bloque existente)
- **NO instalar dependencias en el frontend**: Todo vanilla React + GSAP ya instalado
- **Backend**: Puede necesitar `npm install cors` si no está
- **Archivos que se REESCRIBEN** (no crear nuevos, sobrescribir):
  - `context/WizardContext.jsx` — nuevo motor con branching
  - `components/wizard/WizardModal.jsx` — nuevo modal
  - `app/services/page.js` — nuevo hub de servicios
  - `data/wizards/index.js` — registro actualizado
- **Archivos NUEVOS**:
  - `data/serviceCategories.js`
  - `app/services/layout.js`
  - `components/wizard/steps/ChecklistStep.jsx`
  - `components/wizard/steps/BlockingStep.jsx`
  - `components/wizard/steps/ContactFormStep.jsx`
  - `components/wizard/steps/CalculatorStep.jsx`
  - `components/wizard/steps/BudgetCheckStep.jsx`
  - `components/wizard/steps/CompletionStep.jsx`
  - `data/wizards/_sharedSteps.js`
  - `data/wizards/authorsWizard.js` (y 6 más)
- **Archivos que se MANTIENEN sin cambios**:
  - `components/wizard/steps/InfoStep.jsx`
  - `components/wizard/steps/SingleSelectStep.jsx`
  - `components/wizard/steps/MultiSelectStep.jsx`
  - `components/wizard/steps/TextInputStep.jsx`
  - `components/CommissionCalculator.jsx` (la calculadora standalone sigue existiendo para /services/portraits y /services/fiction)
  - `components/CommissionRequestForm.jsx` (el formulario standalone sigue existiendo)
  - `data/commissionPricing.js` (se EXPANDE en Prompt 3b con PRICING_CONFIGS; las exports originales se mantienen para CommissionCalculator.jsx standalone)
