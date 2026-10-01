# Blog CMS — Migration Prompts

Estos prompts migran el CMS del blog (panel admin para crear/editar posts) desde Util hacia ienyell. El backend ya tiene todas las rutas: `GET /admin`, `POST /`, `PUT /:id`, `PATCH /:id/publish`, `DELETE /:id`. Los componentes compartidos (BlogEditor, CmsCoverUpload, CmsSidebarSection) ya están migrados del portfolio CMS.

**Ejecutar en orden: 1 → 2 → 3 → 4.**

---

## Prompt 1 — Componentes específicos del blog

### A — Crear `components/cms/CmsKeywordsInput.jsx`

Componente de input de keywords/tags para SEO del blog. Crea `components/cms/CmsKeywordsInput.jsx`:

```jsx
'use client';

import { useState } from 'react';

export default function CmsKeywordsInput({ keywords = [], onChange }) {
  const [input, setInput] = useState('');

  const addKeyword = () => {
    const word = input.trim().toLowerCase();
    if (!word || keywords.includes(word)) {
      setInput('');
      return;
    }
    onChange([...keywords, word]);
    setInput('');
  };

  const removeKeyword = (index) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="cms-keywords-input">
      <div className="cms-keywords-tags">
        {keywords.map((kw, i) => (
          <span key={kw} className="cms-keyword-tag">
            {kw}
            <button type="button" onClick={() => removeKeyword(i)} aria-label={`Remove ${kw}`}>×</button>
          </span>
        ))}
      </div>
      <div className="cms-keywords-add">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
          placeholder="Add keyword…"
          className="cms-input"
        />
        <button type="button" className="cms-btn-add" onClick={addKeyword} disabled={!input.trim()}>+</button>
      </div>
    </div>
  );
}
```

### B — Crear `components/cms/CmsRelatedSelector.jsx`

Selector de items relacionados con checkboxes. Crea `components/cms/CmsRelatedSelector.jsx`:

```jsx
'use client';

export default function CmsRelatedSelector({ label = 'items', selectedIds = [], onChange, items = [] }) {
  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  if (!items.length) {
    return <p className="cms-no-data">No {label} available</p>;
  }

  return (
    <div className="cms-related-selector">
      {items.map((item) => (
        <label key={item.id} className="cms-related-item">
          <input
            type="checkbox"
            checked={selectedIds.includes(item.id)}
            onChange={() => toggle(item.id)}
          />
          <span>{item.title || item.name}</span>
        </label>
      ))}
    </div>
  );
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `components/cms/CmsKeywordsInput.jsx` | Input de keywords/tags con Enter-to-add |
| `components/cms/CmsRelatedSelector.jsx` | Checkbox selector de items relacionados |

---

## Prompt 2 — Blog Admin List (`app/admin/blog/page.js`)

Crea el archivo `app/admin/blog/page.js` — la lista de posts del blog en el panel admin.

### Requisitos técnicos exactos:

1. **Directiva**: `'use client'`
2. **Imports**:
   - `{ useEffect, useState }` de `react`
   - `Link` de `next/link`
   - `{ authFetch }` de `../../../lib/authHelper`
   - `{ getPublicationState, formatPublicationDateTime }` de `../../../lib/publishing`

3. **Componente principal** `BlogAdminPage` (export default):

4. **State**: `posts` (array), `loading` (boolean), `error` (string), `workingId` (number | null, para deshabilitar botones mientras se procesa una acción)

5. **useEffect** al montar: `authFetch('/api/blog/admin')` → `setPosts(data.posts)`. Usar `let cancelled = false` para cleanup.

6. **handleTogglePublish(post)**:
   - Set `workingId` al `post.id`
   - `authFetch(\`/api/blog/${post.id}/publish\`, { method: 'PATCH' })`
   - Actualizar el post en el state local (toggle `isPublished`) sin re-fetch completo
   - Clear `workingId`

7. **handleDelete(post)**:
   - `window.confirm(\`Delete "${post.title}"?\`)`
   - `authFetch(\`/api/blog/${post.id}\`, { method: 'DELETE' })`
   - Filtrar el post del state local
   
8. **Render**:
   ```jsx
   <main className="cms-admin-page">
     <header className="cms-admin-header">
       <h1>Blog</h1>
       <Link href="/admin/blog/new" className="cms-btn cms-btn-primary">+ New Post</Link>
     </header>

     {error && <div className="blog-public-error" role="alert">{error}</div>}

     {loading ? (
       <div className="blog-loading" role="status"><span className="blog-loading-spinner" /> Loading…</div>
     ) : (
       <div className="cms-admin-table-wrap">
         <table className="cms-admin-table">
           <thead>
             <tr>
               <th>Title</th>
               <th>Status</th>
               <th>Date</th>
               <th>Actions</th>
             </tr>
           </thead>
           <tbody>
             {posts.map((post) => {
               const state = getPublicationState(post);
               const busy = workingId === post.id;
               return (
                 <tr key={post.id}>
                   <td>
                     <strong>{post.title}</strong>
                     <span className="cms-admin-card-slug">/{post.slug}</span>
                   </td>
                   <td>
                     <span className={`cms-admin-badge cms-badge-${state}`}>
                       {state === 'published' ? 'Published' : state === 'scheduled' ? 'Scheduled' : 'Draft'}
                     </span>
                     {state === 'scheduled' && (
                       <span className="cms-admin-card-scheduled">{formatPublicationDateTime(post.publishedAt)}</span>
                     )}
                   </td>
                   <td>{post.publishedAt ? formatPublicationDateTime(post.publishedAt) : '—'}</td>
                   <td className="cms-admin-actions-cell">
                     <Link href={`/admin/blog/${post.id}/edit`} className="cms-btn cms-btn-sm">Edit</Link>
                     <button type="button" className="cms-btn cms-btn-sm" onClick={() => handleTogglePublish(post)} disabled={busy}>
                       {post.isPublished ? 'Unpublish' : 'Publish'}
                     </button>
                     <button type="button" className="cms-btn cms-btn-sm cms-btn-danger" onClick={() => handleDelete(post)} disabled={busy}>
                       Delete
                     </button>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
     )}

     {!loading && !posts.length && !error && <div className="blog-empty">No posts yet.</div>}
   </main>
   ```

### Nota: El blog usa una **tabla** en vez de una grid de cards (es más compacto para posts de texto). El portfolio usa cards porque tiene imágenes de portada prominentes.

---

## Prompt 3 — Blog Editor (`app/admin/blog/[id]/edit/page.js` + `/new`)

### Paso A — Crear `app/admin/blog/new/page.js`

Re-exporta el editor:

```jsx
'use client';

import BlogEditorPage from '../[id]/edit/page';

export default function NewBlogPostPage() {
  return <BlogEditorPage />;
}
```

### Paso B — Crear `app/admin/blog/[id]/edit/page.js`

El editor de blog. Similar al portfolio pero con **menos campos** (sin client, budget, software, technologies, results, categories, aspectRatio, showBrowserFrame, liveUrl).

#### Requisitos técnicos exactos:

1. **Imports**:
   - `{ useCallback, useEffect, useRef, useState }` de `react`
   - `Link` de `next/link`
   - `{ useParams, useRouter }` de `next/navigation`
   - `{ authFetch, authUpload }` de `../../../../../lib/authHelper`
   - `{ slugifyCmsValue, toDateTimeLocalValue, fromDateTimeLocalValue, getPublicationState, hasMeaningfulHtmlContent }` de `../../../../../lib/publishing`
   - `BlogEditor` de `../../../../../components/cms/BlogEditor`
   - `CmsCoverUpload` de `../../../../../components/cms/CmsCoverUpload`
   - `CmsSidebarSection` de `../../../../../components/cms/CmsSidebarSection`
   - `CmsKeywordsInput` de `../../../../../components/cms/CmsKeywordsInput`
   - `CmsRelatedSelector` de `../../../../../components/cms/CmsRelatedSelector`

2. **EMPTY_FORM** (modelo de datos del blog):
   ```js
   const EMPTY_FORM = {
     title: '',
     excerpt: '',
     coverUrl: '',
     content: '',
     slug: '',
     isPublished: false,
     publishedAt: null,
     keywords: [],
     relatedPostIds: [],
   };
   ```
   **Nota**: NO incluir `relatedProductIds` — ienyell no tiene productos.

3. **State**:
   - `form` (object, inicia con `EMPTY_FORM`)
   - `postId` (number | null) — el ID real del post en la BD
   - `allPosts` (array — todos los posts disponibles para "related posts")
   - `loading` (boolean)
   - `saveStatus` ('idle' | 'saving' | 'saved' | 'error')
   - `sidebarOpen` (boolean, default true)
   - Refs: `saveTimerRef`, `formRef`, `postIdRef`, `savePromiseRef`

4. **useParams**: `params.id` es el ID para editar, undefined para nuevo.

5. **Load data** (useEffect on mount):
   - Fetch todos los posts admin: `authFetch('/api/blog/admin')` → guardar en `allPosts` (para el selector de related posts)
   - Si `params.id` existe: buscar el post en `allPosts` con `id === Number(params.id)`, luego `authFetch(\`/api/blog/${post.slug}\`)` para el contenido completo. Llenar `form` con los datos.
   - Si NO hay `params.id`: mantener EMPTY_FORM.

6. **`updateField(key, value)`**: Actualiza un campo del form, sincroniza `formRef`, y programa auto-save.

7. **Auto-save con debounce** (2 segundos) — misma lógica que portfolio:
   - `persistDraft(overrides)`:
     - Validación: necesita `title` Y `hasMeaningfulHtmlContent(content)` (a diferencia del portfolio que usa summary).
     - Si es nuevo: `authFetch('/api/blog', { method: 'POST', body })` → guardar ID → `router.replace(\`/admin/blog/${newId}/edit\`)`.
     - Si existe: `authFetch(\`/api/blog/${postId}\`, { method: 'PUT', body })`.
     - Payload: `{ title, slug, content, excerpt, coverUrl, keywords, relatedPostIds, isPublished, publishedAt }`.
   - `scheduleSave()`: `clearTimeout` → `setTimeout(persistDraft, 2000)`.

8. **Publish/Schedule/Clear** — misma lógica que portfolio:
   - `handlePublish()`: persist draft, luego toggle publish. Para publish: `authFetch(\`/api/blog/${postId}/publish\`, { method: 'PATCH' })`.
   - `handleSchedulePublish(datetimeValue)`: validar futuro, save con `publishedAt` ISO.
   - `handleClearSchedule()`: save con `publishedAt: null`.

9. **Cover upload**: `authUpload('/api/uploads', file)`.

10. **Render — estructura**:
    ```jsx
    <main className="cms-editor-page">
      <div className="cms-editor-topbar">
        <Link href="/admin/blog" className="cms-back-button">← Blog</Link>
        <span className={`cms-save-status ${saveStatus === 'saved' ? 'is-saved' : saveStatus === 'error' ? 'is-error' : ''}`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error saving' : ''}
        </span>
        <button type="button" className="cms-btn cms-btn-sm" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        </button>
      </div>

      <div className="cms-editor-layout">
        <div className="cms-editor-main">
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Post title"
            className="cms-title-input"
          />
          <BlogEditor
            content={form.content}
            onChange={(html) => updateField('content', html)}
            placeholder="Start writing your post…"
          />
        </div>

        {sidebarOpen && (
          <aside className="cms-editor-sidebar">
            <CmsSidebarSection title="Cover image">
              <CmsCoverUpload
                coverUrl={form.coverUrl}
                onChange={(url) => updateField('coverUrl', url)}
                uploadFile={(file) => authUpload('/api/uploads', file)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="SEO">
              <div className="cms-slug-preview">
                <span>URL Preview</span>
                <code>/blog/{form.slug || slugifyCmsValue(form.title)}</code>
              </div>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="Custom slug"
                className="cms-input"
              />
              <textarea
                value={form.excerpt}
                onChange={(e) => updateField('excerpt', e.target.value)}
                placeholder="Excerpt / meta description (max 200 chars)"
                className="cms-input cms-textarea"
                rows={3}
                maxLength={200}
              />
              <CmsKeywordsInput
                keywords={form.keywords}
                onChange={(v) => updateField('keywords', v)}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Related Posts" defaultOpen={false}>
              <CmsRelatedSelector
                label="posts"
                selectedIds={form.relatedPostIds}
                onChange={(v) => updateField('relatedPostIds', v)}
                items={allPosts.filter((p) => p.id !== postId).map((p) => ({ id: p.id, title: p.title }))}
              />
            </CmsSidebarSection>

            <CmsSidebarSection title="Publication" defaultOpen={false}>
              <div className="cms-publish-section">
                <span className={`cms-admin-badge cms-badge-${getPublicationState(form)}`}>
                  {getPublicationState(form) === 'published' ? 'Published' : getPublicationState(form) === 'scheduled' ? 'Scheduled' : 'Draft'}
                </span>
                <button type="button" className="cms-btn" onClick={handlePublish}>
                  {form.isPublished ? 'Unpublish' : 'Publish Now'}
                </button>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalValue(form.publishedAt)}
                  onChange={(e) => handleSchedulePublish(e.target.value)}
                  className="cms-input"
                />
                {form.publishedAt && !form.isPublished && (
                  <button type="button" className="cms-btn cms-btn-sm" onClick={handleClearSchedule}>Clear schedule</button>
                )}
              </div>
            </CmsSidebarSection>
          </aside>
        )}
      </div>
    </main>
    ```

### Diferencias clave con el editor de portfolio:
- **Menos sidebar sections**: solo Cover, SEO, Related Posts, Publication (vs portfolio que tiene Cover, Description, Details, Categories, Software, Techniques, Results, SEO, Publication)
- **Validación de save diferente**: blog requiere `title + hasMeaningfulHtmlContent(content)`, portfolio requiere `title + summary`
- **SEO más completo**: blog tiene excerpt + keywords (el portfolio solo tiene slug)
- **Publish toggle**: blog usa endpoint dedicado `PATCH /:id/publish`, portfolio usa `PATCH` genérico con `isPublished` en body
- **Related items**: blog tiene related posts selector, portfolio no tiene

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `app/admin/blog/new/page.js` | Re-export del editor |
| `app/admin/blog/[id]/edit/page.js` | Editor completo del blog |

---

## Prompt 4 — CSS adicional del blog CMS (agregar a `styles/globals.css`)

Agrega estos estilos **al final** de `styles/globals.css`, después de los estilos `.cms-` existentes. Estos son estilos específicos que NO estaban en el Prompt 7 del portfolio CMS:

```css
/* ══════════════════════════════════════════════════
   CMS — Blog-specific additions
   ══════════════════════════════════════════════════ */

/* ── Admin table (blog list uses a table instead of cards) ── */
.cms-admin-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
}
.cms-admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.cms-admin-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.cms-admin-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line-2);
  vertical-align: middle;
}
.cms-admin-table tr:last-child td {
  border-bottom: none;
}
.cms-admin-table tr:hover td {
  background: color-mix(in srgb, var(--surface) 50%, transparent);
}
.cms-admin-table td strong {
  display: block;
  font-weight: 600;
  color: var(--ink);
}
.cms-admin-actions-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ── Keywords input (blog SEO) ── */
.cms-keywords-input {
  display: grid;
  gap: 8px;
}
.cms-keywords-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cms-keyword-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--accent-tint);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}
.cms-keyword-tag button {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.6;
  transition: opacity 150ms ease;
}
.cms-keyword-tag button:hover {
  opacity: 1;
}
.cms-keywords-add {
  display: flex;
  gap: 6px;
}
.cms-keywords-add .cms-input {
  flex: 1;
}

/* ── Related items selector (blog) ── */
.cms-related-selector {
  display: grid;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.cms-related-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--ink-soft);
  cursor: pointer;
  transition: background 100ms ease;
}
.cms-related-item:hover {
  background: var(--surface);
}
.cms-related-item input[type="checkbox"] {
  accent-color: var(--accent);
}

/* ── Table responsive ── */
@media (max-width: 767px) {
  .cms-admin-table {
    font-size: 13px;
  }
  .cms-admin-table th,
  .cms-admin-table td {
    padding: 10px 12px;
  }
  .cms-admin-actions-cell {
    flex-direction: column;
  }
}
```

### Reglas:
1. Usar los mismos tokens CSS de ienyell (`--line`, `--surface`, `--ink`, `--accent`, etc.)
2. No duplicar estilos que ya existen (`.cms-btn`, `.cms-admin-badge`, `.cms-slug-preview`, etc. — ya están del portfolio)
3. Solo agregar lo que es NUEVO: tabla admin, keywords, related selector

---

## Resumen de TODOS los archivos a crear/modificar:

| # | Prompt | Archivo | Acción |
|---|--------|---------|--------|
| 1 | P1 | `components/cms/CmsKeywordsInput.jsx` | **Crear** |
| 2 | P1 | `components/cms/CmsRelatedSelector.jsx` | **Crear** |
| 3 | P2 | `app/admin/blog/page.js` | **Crear** |
| 4 | P3 | `app/admin/blog/new/page.js` | **Crear** |
| 5 | P3 | `app/admin/blog/[id]/edit/page.js` | **Crear** |
| 6 | P4 | `styles/globals.css` | **Agregar al final** |

**Solo 6 archivos** — mucho más ligero que el portfolio CMS porque reutiliza todos los componentes compartidos (BlogEditor, CmsCoverUpload, CmsSidebarSection, ResizableImage) y la mayoría del CSS.

**No tocar el backend** — ya tiene todo: rutas blog CRUD + toggle publish + admin list.

**Verificación**: después de ejecutar los 4 prompts, abrir `http://localhost:3000/admin/blog` con el backend en puerto 4000.
