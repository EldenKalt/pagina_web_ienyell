# Wizard System — Prompts de implementación

> **Instrucciones**: Ejecuta cada prompt en orden. Cada uno construye sobre el anterior. No te saltes ninguno. Después de ejecutar cada prompt, verifica que el código compila sin errores antes de pasar al siguiente.

---

## PROMPT 1 de 4 — WizardContext (estado global del wizard)

```
Estoy trabajando en un proyecto Next.js 16 con React 19 y App Router. Necesito crear un sistema de wizard (asistente de pasos) genérico y reutilizable. En este primer prompt vamos a crear SOLO el contexto/estado global.

### Stack y convenciones del proyecto:
- Next.js 16.3.4, React 19.2.8, App Router
- Todos los componentes client llevan `'use client';` en la primera línea
- CSS en `styles/globals.css` usando variables CSS de `:root` (--ink, --paper, --accent, --surface, --line, --text-muted, --ink-soft, --accent-dark, --accent-tint)
- NO usar librerías externas — todo vanilla React (useState, useContext, useCallback, useReducer)
- El proyecto ya tiene un patrón de Context similar: `components/OffcanvasContext.jsx` que usa createContext + Provider + custom hook

### Archivo a crear: `context/WizardContext.jsx`

Este contexto debe manejar el estado completo de cualquier wizard en la app. Crea el archivo con esta lógica:

**Estado del wizard (useReducer):**
```js
{
  isOpen: false,           // si el modal está visible
  wizardId: null,          // string identificador del wizard activo (ej: 'work-with-you')
  steps: [],               // array de objetos step desde la config
  currentStepIndex: 0,     // índice del paso actual
  answers: {},             // objeto { [stepId]: valor } con las respuestas del usuario
  direction: 'forward',    // 'forward' | 'backward' para animación de transición
  isComplete: false,       // true cuando el wizard terminó todos los pasos
}
```

**Actions del reducer:**
- `OPEN_WIZARD` — recibe `{ wizardId, steps }`, resetea todo el estado, pone isOpen en true
- `CLOSE_WIZARD` — resetea todo al estado inicial
- `NEXT_STEP` — avanza currentStepIndex +1, pone direction 'forward'. Si era el último paso, pone isComplete en true en vez de avanzar
- `PREV_STEP` — retrocede currentStepIndex -1 (mínimo 0), pone direction 'backward'
- `GO_TO_STEP` — recibe `{ index }`, navega directamente a ese paso, calcula direction comparando con currentStepIndex
- `SET_ANSWER` — recibe `{ stepId, value }`, guarda en answers[stepId] el valor
- `RESET_WIZARD` — vuelve al paso 0, limpia answers, mantiene el wizard abierto con los mismos steps

**Provider y hooks a exportar:**
- `WizardProvider` — componente que envuelve children con el contexto
- `useWizard()` — hook que retorna el state + funciones de conveniencia:
  - `openWizard(wizardId, steps)` — dispatch OPEN_WIZARD
  - `closeWizard()` — dispatch CLOSE_WIZARD
  - `nextStep()` — dispatch NEXT_STEP
  - `prevStep()` — dispatch PREV_STEP
  - `goToStep(index)` — dispatch GO_TO_STEP
  - `setAnswer(stepId, value)` — dispatch SET_ANSWER
  - `resetWizard()` — dispatch RESET_WIZARD
  - `currentStep` — atajo a `state.steps[state.currentStepIndex]` (o null si no hay)
  - `progress` — número entre 0 y 1 representando el progreso (currentStepIndex / steps.length)
  - `canGoBack` — boolean, true si currentStepIndex > 0
  - `canGoNext` — boolean, true si el paso actual tiene respuesta en answers O si el paso es de tipo 'info' (no requiere respuesta)
  - `isLastStep` — boolean, true si currentStepIndex === steps.length - 1

**Reglas:**
- Usa `useReducer` para el estado, NO useState
- Envuelve TODAS las funciones del hook en `useCallback`
- Los valores computados (currentStep, progress, canGoBack, etc.) calcúlalos con `useMemo`
- Lanza error si `useWizard()` se usa fuera del Provider
- El Provider debe llamar `document.body.style.overflow = 'hidden'` cuando isOpen es true y restaurarlo cuando es false (igual que hace OffcanvasContext.jsx)
- NO crees ningún componente visual, solo el contexto y el hook

Devuélveme SOLO el archivo `context/WizardContext.jsx` completo.
```

---

## PROMPT 2 de 4 — WizardModal (componente visual del modal)

```
Continuando con el sistema de wizard. Ya existe `context/WizardContext.jsx` con el Provider, useReducer y el hook `useWizard()` que expone: isOpen, currentStep, currentStepIndex, steps, answers, direction, isComplete, progress, canGoBack, canGoNext, isLastStep, openWizard(), closeWizard(), nextStep(), prevStep(), goToStep(), setAnswer(), resetWizard().

Ahora necesito el componente modal que contiene visualmente el wizard.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, App Router
- `'use client';` en la primera línea de todo componente client
- CSS en `styles/globals.css` con variables: --ink (#212529), --paper (#fff), --ink-2 (#343a40), --ink-soft (#495057), --text-muted (#555), --line (#dee2e6), --surface (#f8f9fa), --accent (#fa5f07), --accent-dark (#e04e00), --accent-tint (#fff7f2)
- Prefijo CSS para todo el wizard: `.wiz-`
- NO usar librerías externas, todo CSS vanilla
- El proyecto usa GSAP (gsap 3.15) pero para este componente NO lo uses, usa CSS transitions/animations puras

### Archivo a crear: `components/wizard/WizardModal.jsx`

Este componente se renderiza UNA vez en el layout global (app/layout.js) y se muestra/oculta según `isOpen` del contexto. NO se instancia por cada wizard.

**Estructura del modal:**

```
overlay (.wiz-overlay) — fondo oscuro semitransparente, cierra el wizard al hacer click
  └─ contenedor (.wiz-container) — el card del wizard
       ├─ header (.wiz-header)
       │    ├─ título del wizard (viene de la config, lo lee del primer step o de un campo title en el wizard config)
       │    └─ botón cerrar (X) con SVG inline
       ├─ barra de progreso (.wiz-progress)
       │    └─ barra de relleno (.wiz-progress-fill) — ancho dinámico según `progress`
       ├─ contenido (.wiz-body)
       │    └─ aquí se renderiza el paso actual (WizardStepRenderer)
       └─ footer (.wiz-footer)
            ├─ botón "Back" (oculto si !canGoBack)
            ├─ indicador de paso "Step 2 of 5"
            └─ botón "Next" o "Finish" (si isLastStep)
```

**Comportamiento:**
- El overlay aparece con fade-in (opacity 0→1 en 200ms)
- El contenedor aparece con slide-up + fade (translateY(20px)→0 + opacity en 250ms, ease-out)
- Al cerrar, animación inversa (200ms) y luego `closeWizard()`
- Presionar Escape cierra el wizard
- Click en el overlay (fuera del contenedor) cierra el wizard
- Click en el contenedor NO cierra (stopPropagation)
- El contenido del paso (.wiz-body) tiene transición al cambiar de paso: si direction es 'forward', el paso nuevo entra desde la derecha (translateX(30px)→0); si 'backward', entra desde la izquierda (translateX(-30px)→0). Usa una key en el div del body que cambie con currentStepIndex para forzar el re-render con animación CSS

**Componente WizardStepRenderer** (defínelo en el mismo archivo, NO lo exportes):
- Recibe `step` (el objeto del paso actual) y renderiza según `step.type`:
  - `'info'` → renderiza `WizardStepInfo`
  - `'single-select'` → renderiza `WizardStepSingleSelect`
  - `'multi-select'` → renderiza `WizardStepMultiSelect`
  - `'text-input'` → renderiza `WizardStepTextInput`
  - `'summary'` → renderiza `WizardStepSummary`
  - Default → `<p>Unknown step type: {step.type}</p>`
- Importa los componentes de paso desde `./steps/` (los crearemos en el siguiente prompt)
- Pasa a cada componente: `step` (la config del paso), `value` (la respuesta actual de answers[step.id]), y `onChange` (función que llama setAnswer(step.id, nuevoValor))

**Cuando isComplete es true:**
- En vez del paso actual, muestra una pantalla de confirmación dentro de .wiz-body:
  - Ícono de check (SVG circular con checkmark)
  - Título: "All set!" (o el campo `completionTitle` del wizard config si existe)
  - Mensaje: "We'll get back to you soon." (o `completionMessage` si existe)
  - Botón "Close" que ejecuta closeWizard()
- El footer se oculta en este estado

### CSS a añadir al FINAL de `styles/globals.css`:

```css
/* ── Wizard Modal ── */
```

Estilos requeridos:

- `.wiz-overlay`: position fixed, inset 0, z-index 9999, background rgba(0,0,0,0.55), display flex, align-items center, justify-content center, padding 20px. Animación fade-in con @keyframes wiz-fade-in.
- `.wiz-container`: background var(--paper), border-radius 16px, width min(480px, 100%), max-height 85vh, overflow hidden, display flex, flex-direction column, box-shadow 0 20px 60px rgba(0,0,0,0.3). Animación slide-up con @keyframes wiz-slide-up.
- `.wiz-header`: display flex, justify-content space-between, align-items center, padding 20px 24px 0, gap 12px.
- `.wiz-header h2`: font-size 18px, font-weight 700, color var(--ink), margin 0.
- `.wiz-close`: botón sin background/border, 32x32px, border-radius 8px, color var(--ink-soft), cursor pointer, display grid place-items center, transition background 150ms. Hover: background var(--surface).
- `.wiz-progress`: height 3px, background var(--line-2), border-radius 3px, margin 16px 24px 0, overflow hidden.
- `.wiz-progress-fill`: height 100%, background var(--accent), border-radius 3px, transition width 300ms ease.
- `.wiz-body`: padding 24px, overflow-y auto, flex 1.
- `.wiz-body` animación de transición: usa @keyframes wiz-step-in-right (de translateX(30px) opacity 0 → translateX(0) opacity 1) y wiz-step-in-left (lo inverso). El div contenedor del paso lleva animation: wiz-step-in-right 250ms ease forwards (o left según direction). Esto se controla con un atributo data-direction en el div.
- `.wiz-footer`: display flex, justify-content space-between, align-items center, padding 16px 24px 20px, border-top 1px solid var(--line-2).
- `.wiz-btn`: padding 10px 24px, border-radius 10px, font-size 14px, font-weight 600, cursor pointer, border none, transition all 150ms.
- `.wiz-btn-back`: background transparent, color var(--ink-soft). Hover: background var(--surface).
- `.wiz-btn-next`: background var(--ink), color var(--paper). Hover: background var(--ink-2). Cuando isLastStep: background var(--accent), hover background var(--accent-dark).
- `.wiz-btn-next:disabled`: opacity 0.4, cursor not-allowed.
- `.wiz-step-indicator`: font-size 12px, color var(--text-muted).
- `.wiz-complete`: display flex, flex-direction column, align-items center, text-align center, padding 40px 20px, gap 16px.
- `.wiz-complete-icon`: 64x64px, border-radius 50%, background var(--accent-tint), color var(--accent), display grid, place-items center.
- `.wiz-complete h3`: font-size 20px, color var(--ink).
- `.wiz-complete p`: font-size 14px, color var(--text-muted).
- `.wiz-complete .wiz-btn-next`: margin-top 8px.
- Animación de cierre: añade clase `.wiz-closing` al overlay que revierte las animaciones (300ms). Cuando termina la animación, ejecuta closeWizard().

**NO crees los componentes de paso todavía** (WizardStepInfo, etc.), solo impórtalos. Los crearemos en el prompt 3.

Devuélveme:
1. El archivo `components/wizard/WizardModal.jsx` completo
2. El bloque CSS completo para añadir al final de `styles/globals.css` (todo junto, listo para copiar y pegar)
```

---

## PROMPT 3 de 4 — Componentes de paso (step types)

```
Continuando con el sistema de wizard. Ya existen:
- `context/WizardContext.jsx` — Provider con useReducer, hook useWizard()
- `components/wizard/WizardModal.jsx` — el modal que renderiza pasos según su type

Ahora necesito los 5 tipos de paso. Cada paso recibe estas props:
- `step` — objeto de configuración del paso (tiene id, type, title, description, y campos específicos según el type)
- `value` — la respuesta actual del usuario para este paso (puede ser undefined si no ha respondido)
- `onChange(newValue)` — función para guardar la respuesta

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, `'use client';` en cada archivo
- CSS en `styles/globals.css`, prefijo `.wiz-step-`
- Variables CSS: --ink, --paper, --accent, --accent-dark, --accent-tint, --surface, --line, --line-2, --text-muted, --ink-soft
- NO librerías externas. SVG inline cuando se necesiten íconos.

### Archivos a crear en `components/wizard/steps/`:

#### 1. `InfoStep.jsx`
Paso informativo que no requiere respuesta del usuario. Solo muestra contenido.

**Config del step esperada:**
```js
{
  id: 'welcome',
  type: 'info',
  title: 'Welcome!',
  description: 'Let me help you find the right service.',
  image: '/path/to/image.webp',  // opcional
  bullets: ['Point 1', 'Point 2'], // opcional, lista de puntos
}
```

**Renderizado:**
- Si hay `image`: mostrarla arriba con border-radius 12px, width 100%, max-height 200px, object-fit cover
- Título del paso: h3, font-size 20px, font-weight 700, color var(--ink)
- Descripción: p, font-size 14px, color var(--ink-soft), line-height 1.6
- Si hay `bullets`: lista con viñetas personalizadas (círculos de color --accent), cada bullet en font-size 14px
- Este paso NO llama onChange — el usuario simplemente presiona "Next"

#### 2. `SingleSelectStep.jsx`
El usuario elige UNA opción de una lista.

**Config del step esperada:**
```js
{
  id: 'service-type',
  type: 'single-select',
  title: 'What type of service?',
  description: 'Choose one option.',
  options: [
    { id: 'portraits', label: 'Portraits', description: 'Custom character portraits', icon: '🎨' },
    { id: 'branding', label: 'Brand Design', description: 'Logos, identity systems', icon: '✏️' },
  ]
}
```

**Renderizado:**
- Título y descripción iguales al InfoStep
- Lista de opciones como cards clickeables (.wiz-step-option):
  - Cada card: padding 14px 16px, border 2px solid var(--line), border-radius 12px, display flex, align-items center, gap 12px, cursor pointer, transition all 150ms
  - Icono (el emoji o un span): font-size 24px
  - Texto: label en font-weight 600 font-size 14px color var(--ink), description debajo en font-size 12px color var(--text-muted)
  - Hover: border-color var(--accent-tint), background var(--accent-tint)
  - Seleccionado (cuando value === option.id): border-color var(--accent), background var(--accent-tint). Un checkmark SVG aparece a la derecha.
- Al clickear una opción: llama onChange(option.id)
- Gap entre opciones: 8px

#### 3. `MultiSelectStep.jsx`
El usuario puede elegir MÚLTIPLES opciones (checkboxes).

**Config del step esperada:**
```js
{
  id: 'extras',
  type: 'multi-select',
  title: 'Any extras?',
  description: 'Select all that apply.',
  options: [
    { id: 'rush', label: 'Rush delivery', description: '+50% fee' },
    { id: 'source', label: 'Source files', description: 'PSD/AI files included' },
  ],
  min: 0,  // mínimo de selecciones (0 = opcional)
  max: 3,  // máximo de selecciones (opcional)
}
```

**Renderizado:**
- Igual que SingleSelectStep visualmente, PERO:
  - value es un ARRAY de ids (ej: ['rush', 'source'])
  - Al clickear una opción que ya está seleccionada, la quita del array
  - Al clickear una no seleccionada, la añade (respetando max si existe)
  - Usa checkbox custom en vez de checkmark: cuadrado 18x18px con border-radius 4px, border 2px solid var(--line). Cuando checked: background var(--accent), border-color var(--accent), checkmark blanco SVG dentro
  - onChange recibe el array completo cada vez

#### 4. `TextInputStep.jsx`
El usuario escribe texto libre o un número.

**Config del step esperada:**
```js
{
  id: 'description',
  type: 'text-input',
  title: 'Describe your project',
  description: 'Give me a brief overview.',
  placeholder: 'I need a character portrait for...',
  inputType: 'textarea',  // 'text' | 'textarea' | 'email' | 'number'
  required: true,
  maxLength: 500,  // opcional
  min: 0,          // solo para number
  max: 10000,      // solo para number
}
```

**Renderizado:**
- Título y descripción
- Si inputType es 'textarea': elemento textarea, min-height 120px, resize vertical
- Si es 'text', 'email', o 'number': elemento input con el type correspondiente
- Estilos compartidos del input (.wiz-step-input): width 100%, padding 12px 16px, border 2px solid var(--line), border-radius 10px, font-size 14px, font-family inherit, color var(--ink), background var(--paper), transition border-color 150ms. Focus: border-color var(--accent), outline none. Placeholder color var(--text-muted).
- Si hay maxLength: mostrar contador "23/500" debajo del input, alineado a la derecha, font-size 12px, color var(--text-muted)
- onChange se ejecuta en cada keystroke con el valor actual

#### 5. `SummaryStep.jsx`
Muestra un resumen de todas las respuestas antes de confirmar.

**Config del step esperada:**
```js
{
  id: 'summary',
  type: 'summary',
  title: 'Review your request',
  description: 'Make sure everything looks right.',
  fields: [
    { stepId: 'service-type', label: 'Service' },
    { stepId: 'description', label: 'Description' },
    { stepId: 'extras', label: 'Extras' },
    { stepId: 'budget', label: 'Budget', format: 'currency' },
  ]
}
```

**Renderizado:**
- Título y descripción
- Lista de campos (.wiz-step-summary-list):
  - Cada campo: display flex, justify-content space-between, padding 12px 0, border-bottom 1px solid var(--line-2)
  - Label: font-size 13px, color var(--text-muted), font-weight 500
  - Value: font-size 14px, color var(--ink), font-weight 600, text-align right, max-width 60%
  - Si el valor es un array (multi-select): mostrar como chips/pills separados por comas
  - Si format es 'currency': prefijar con "$"
  - Si no hay respuesta para ese stepId: mostrar "—" en color var(--text-muted)
- Este paso necesita acceso a TODAS las respuestas (answers), no solo a su propio value. Recibe `allAnswers` como prop adicional, y también `allSteps` para poder resolver labels de opciones de single-select/multi-select (buscar la opción por id y mostrar su label en vez del id raw)

**IMPORTANTE para SummaryStep:** El WizardStepRenderer en WizardModal.jsx debe pasar props adicionales a SummaryStep: `allAnswers={answers}` y `allSteps={steps}`.

### CSS a añadir al final de `styles/globals.css` (después del bloque del wizard modal):

Todos los estilos de los steps, con prefijo `.wiz-step-`. Ponlos todos juntos bajo un comentario `/* ── Wizard Steps ── */`.

Devuélveme:
1. Los 5 archivos de componentes completos
2. El bloque CSS completo para los steps
3. La línea exacta que hay que modificar en WizardModal.jsx para que SummaryStep reciba allAnswers y allSteps (muéstramelo como un diff: línea actual → línea nueva)
```

---

## PROMPT 4 de 4 — Integración en el layout + primer wizard de prueba

```
Continuando con el sistema de wizard. Ya existen todos los componentes:
- `context/WizardContext.jsx` — WizardProvider + useWizard()
- `components/wizard/WizardModal.jsx` — modal con animaciones y step renderer
- `components/wizard/steps/InfoStep.jsx` — paso informativo
- `components/wizard/steps/SingleSelectStep.jsx` — selección única
- `components/wizard/steps/MultiSelectStep.jsx` — selección múltiple
- `components/wizard/steps/TextInputStep.jsx` — entrada de texto
- `components/wizard/steps/SummaryStep.jsx` — resumen final

Ahora necesito: (A) integrar el wizard en el layout global, (B) crear una configuración de wizard de ejemplo, y (C) conectar un botón existente para abrir el wizard.

### Stack y convenciones:
- Next.js 16.3.4, React 19.2.8, App Router
- `'use client';` en componentes client
- El layout global está en `app/layout.js` y ya tiene un OffcanvasProvider que envuelve todo

### A) Modificar `app/layout.js`

El layout actual es:
```jsx
import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import Offcanvas from '../components/Offcanvas';
import { OffcanvasProvider } from '../components/OffcanvasContext';

export const metadata = {
  title: 'enyell — Creative Universe',
  description: 'Illustrator and creative artist portfolio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <OffcanvasProvider>
          <Header />
          {children}
          <Footer />
          <ScrollToTop />
          <Offcanvas />
        </OffcanvasProvider>
      </body>
    </html>
  );
}
```

Modifícalo para:
1. Importar `WizardProvider` desde `../context/WizardContext`
2. Importar `WizardModal` desde `../components/wizard/WizardModal`
3. Envolver todo el contenido de `<body>` con `<WizardProvider>` (FUERA del OffcanvasProvider, para que el wizard esté por encima de todo)
4. Renderizar `<WizardModal />` como último hijo dentro del WizardProvider (después del OffcanvasProvider), para que esté por encima del offcanvas en z-index

### B) Crear config del wizard "work-with-you": `data/wizards/workWithYou.js`

Este es el wizard que se abre cuando el usuario presiona "I want to work with you" en la página /links. Crea la configuración con este esquema:

```js
export const workWithYouWizard = {
  id: 'work-with-you',
  title: 'Let\'s work together',
  completionTitle: 'Request sent!',
  completionMessage: 'I\'ll review your project details and get back to you within 48 hours.',
  steps: [ ... ]
};
```

**Pasos del wizard (7 pasos):**

1. **Info de bienvenida** (type: 'info')
   - id: 'welcome'
   - title: "Let's find the perfect service for you"
   - description: "I'll ask you a few quick questions to understand your project and give you an accurate estimate."
   - bullets: ['Takes about 2 minutes', 'No commitment required', 'Get an instant estimate']

2. **Tipo de servicio** (type: 'single-select')
   - id: 'service-type'
   - title: "What type of work do you need?"
   - description: "Choose the category that best fits your project."
   - options:
     - { id: 'illustration', label: 'Illustration', description: 'Character art, scenes, concepts', icon: '🎨' }
     - { id: 'design', label: 'Design', description: 'Brand identity, UI/UX, editorial', icon: '✏️' }
     - { id: 'cover-art', label: 'Cover Art', description: 'Book covers, album art, posters', icon: '📕' }
     - { id: 'other', label: 'Something else', description: 'Tell me about your unique project', icon: '✨' }

3. **Nivel de detalle** (type: 'single-select')
   - id: 'detail-level'
   - title: "How detailed should it be?"
   - description: "This helps me estimate the time and cost."
   - options:
     - { id: 'sketch', label: 'Sketch', description: 'Quick concept, minimal rendering', icon: '📝' }
     - { id: 'standard', label: 'Standard', description: 'Clean lineart with flat colors', icon: '🖼️' }
     - { id: 'detailed', label: 'Detailed', description: 'Full rendering with lighting and effects', icon: '🌟' }
     - { id: 'premium', label: 'Premium', description: 'Maximum detail, multiple revisions included', icon: '💎' }

4. **Extras** (type: 'multi-select')
   - id: 'extras'
   - title: "Need any extras?"
   - description: "Select all that apply. All are optional."
   - min: 0
   - options:
     - { id: 'rush', label: 'Rush delivery', description: 'Ready in half the usual time (+50%)' }
     - { id: 'source', label: 'Source files', description: 'Get the PSD/AI working files' }
     - { id: 'revisions', label: 'Extra revisions', description: '3 additional revision rounds' }
     - { id: 'commercial', label: 'Commercial license', description: 'Use the art for commercial purposes' }

5. **Descripción del proyecto** (type: 'text-input')
   - id: 'description'
   - title: "Tell me about your project"
   - description: "The more detail you share, the better I can help."
   - placeholder: "I need a character portrait for my fantasy novel. The character is..."
   - inputType: 'textarea'
   - required: true
   - maxLength: 1000

6. **Presupuesto** (type: 'single-select')
   - id: 'budget'
   - title: "What's your budget range?"
   - description: "Don't worry — we can always adjust later."
   - options:
     - { id: 'under-100', label: 'Under $100', description: 'Simple pieces, quick turnaround' }
     - { id: '100-300', label: '$100 – $300', description: 'Standard commissions' }
     - { id: '300-500', label: '$300 – $500', description: 'Detailed or commercial work' }
     - { id: '500-plus', label: '$500+', description: 'Premium, multi-piece, or large projects' }

7. **Resumen** (type: 'summary')
   - id: 'review'
   - title: "Review your request"
   - description: "Make sure everything looks right before sending."
   - fields:
     - { stepId: 'service-type', label: 'Service type' }
     - { stepId: 'detail-level', label: 'Detail level' }
     - { stepId: 'extras', label: 'Extras' }
     - { stepId: 'description', label: 'Project description' }
     - { stepId: 'budget', label: 'Budget' }

### C) Modificar la página /links para abrir el wizard

El archivo `app/links/page.js` actual es:
```jsx
'use client';

import LinkInBioCarousel from '../../components/linkinbio/LinkInBioCarousel';
import IntentionCard from '../../components/linkinbio/IntentionCard';
import { carouselSlides, intentionButtons } from '../../data/linkInBioConfig';

export default function LinkInBioPage() {
  const activeSlides = carouselSlides.filter((slide) => slide.active);
  const activeButtons = intentionButtons.filter((button) => button.active).sort((a, b) => a.order - b.order);

  return (
    <main className="lib-page">
      {activeSlides.length > 0 && <section className="lib-carousel-section" aria-label="Featured content"><LinkInBioCarousel slides={activeSlides} /></section>}
      <section className="lib-intentions-section"><h2 className="lib-intentions-title">What do you want?</h2><div className="lib-intentions-list">{activeButtons.map((button) => <IntentionCard key={button.id} iconKey={button.iconKey} title={button.title} subtitle={button.subtitle} href={button.href} color={button.color} />)}</div></section>
    </main>
  );
}
```

Y el IntentionCard (`components/linkinbio/IntentionCard.jsx`) actual es:
```jsx
'use client';

import Link from 'next/link';
import { INTENTION_ICONS } from '../../data/linkInBioConfig';

export default function IntentionCard({ iconKey, title, subtitle, href, color = 'slate' }) {
  const icon = INTENTION_ICONS[iconKey];

  return (
    <Link href={href} className={`lib-intention-card lib-ic-${color}`}>
      <span className="lib-intention-icon">
        {icon && (
          <svg viewBox={icon.viewBox} width="20" height="20" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.paths }} />
        )}
      </span>
      <div className="lib-intention-text">
        <strong className="lib-intention-title">{title}</strong>
        <span className="lib-intention-subtitle">{subtitle}</span>
      </div>
      <span className="lib-intention-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </span>
    </Link>
  );
}
```

Modifica lo necesario para que:

1. **IntentionCard** acepte una prop opcional `wizardId` (string). Cuando `wizardId` está presente, el card NO es un `<Link>` sino un `<button>` que abre el wizard correspondiente. Cuando NO tiene wizardId, sigue siendo un Link como ahora. El botón debe tener exactamente las mismas clases CSS que el Link para verse idéntico.

2. **IntentionCard** cuando tiene wizardId: importa useWizard, importa la configuración del wizard dinámicamente. Para esto, crea un helper/mapa simple en `data/wizards/index.js` que exporta un objeto:
```js
import { workWithYouWizard } from './workWithYou';
export const WIZARDS = {
  'work-with-you': workWithYouWizard,
};
```
IntentionCard importa WIZARDS y cuando el usuario clickea, llama `openWizard(wizardId, WIZARDS[wizardId].steps)` pasando también el title/completionTitle/completionMessage como parte del primer step o como metadata.

ESPERA — mejor enfoque: en vez de que IntentionCard importe los wizards, haz que la página /links pase un `onClick` handler al IntentionCard cuando el botón tiene wizard. Así IntentionCard se mantiene genérico:

- En `data/linkInBioConfig.js`, añade un campo `wizardId: 'work-with-you'` al botón con id 'work-with-you'
- En `app/links/page.js`, importa useWizard y WIZARDS. Al mapear los intentionButtons, si el button tiene wizardId, pasa un `onClick` en vez de `href`
- IntentionCard acepta `onClick` opcional. Si onClick existe, renderiza como `<button>` con ese onClick. Si no, renderiza como `<Link>`.

3. **linkInBioConfig.js**: Añade `wizardId: 'work-with-you'` al botón con id 'work-with-you'. NO cambies nada más.

Devuélveme:
1. `app/layout.js` modificado — completo
2. `data/wizards/workWithYou.js` — completo
3. `data/wizards/index.js` — completo
4. `app/links/page.js` modificado — completo
5. `components/linkinbio/IntentionCard.jsx` modificado — completo
6. La línea exacta a añadir en `data/linkInBioConfig.js` (indicando después de qué línea va)
```

---

## Notas de ejecución

- **Orden estricto**: Prompt 1 → 2 → 3 → 4. Cada uno depende del anterior.
- **Verificación entre prompts**: Después de cada prompt, corre `npm run dev` y verifica que no haya errores de compilación. Si hay errores, arréglalo antes de seguir.
- **CSS**: Todo va en `styles/globals.css` al final. No crees archivos CSS separados.
- **Prefijos**: Contexto y config no llevan prefijo. Componentes del wizard: `.wiz-`. Steps: `.wiz-step-`.
- **NO instalar dependencias**: Todo se construye con React vanilla.
