# Portfolio CMS — Migration Prompts

Estos prompts migran el CMS (panel de administración) del portfolio desde Util (React + Vite) hacia ienyell (Next.js App Router). El backend ya tiene todas las rutas CRUD de portfolio y uploads — no hay que tocar el backend.

**Ejecutar en orden estricto: 1 → 2 → 3 → 4 → 5 → 6 → 7.**

---

## Prompt 1 — Dependencias + Utilidades compartidas

### Paso A — Instalar Tiptap y dependencias del editor

Ejecuta este comando en la raíz del proyecto (NO en `backend/`):

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-character-count @tiptap/extension-typography @tiptap/extension-image @tiptap/extension-youtube @tiptap/extension-highlight @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/pm
```

### Paso B — Crear `lib/authHelper.js`

Crea el archivo `lib/authHelper.js` con utilidades de autenticación para fetch nativo (NO axios):

```js
'use client';

export function getAuthHeaders() {
  return {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
}

export function getAuthUploadHeaders() {
  return {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
}

export function getApiBase() {
  return String(process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
}

export async function authFetch(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const auth = getAuthHeaders();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: auth.credentials,
    headers: {
      ...auth.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch (_) { /* ignore */ }
    throw error;
  }

  return response.json();
}

export async function authUpload(path, file) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error('NEXT_PUBLIC_API_URL is not configured.');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
}
```

### Paso C — Crear `lib/publishing.js`

Crea el archivo `lib/publishing.js` con utilidades de publicación compartidas entre portfolio y blog:

```js
export function slugifyCmsValue(value, fallback = 'untitled', maxLength = 80) {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
  return slug || fallback;
}

export function hasMeaningfulHtmlContent(content) {
  return String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, '')
    .length > 0;
}

export function toDateTimeLocalValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function getPublicationState(entry) {
  if (!entry) return 'draft';
  if (entry.isPublished) return 'published';
  if (entry.publishedAt && new Date(entry.publishedAt) > new Date()) return 'scheduled';
  return 'draft';
}

export function formatPublicationDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `lib/authHelper.js` | Auth fetch wrapper con credentials |
| `lib/publishing.js` | Slugify, publication state, date utils |

---

## Prompt 2 — Tiptap Editor (BlogEditor + ResizableImage)

### Paso A — Crear `components/cms/ResizableImage.jsx`

Crea `components/cms/ResizableImage.jsx` — extensión custom de Tiptap para imágenes redimensionables:

```jsx
'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useCallback, useRef, useState } from 'react';

function ResizableImageView({ node, updateAttributes, selected }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [liveWidth, setLiveWidth] = useState(null);

  const width = node.attrs.width || '100%';
  const align = node.attrs.align || 'center';

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current?.closest('.tiptap');
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    setDragging(true);

    const onPointerMove = (moveEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newWidth = Math.max(10, Math.min(100, Math.round(((moveEvent.clientX - rect.left) / containerWidth) * 100)));
      setLiveWidth(`${newWidth}%`);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      setDragging(false);
      if (liveWidth) {
        updateAttributes({ width: liveWidth });
        setLiveWidth(null);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [liveWidth, updateAttributes]);

  const presets = ['25%', '50%', '75%', '100%'];
  const alignOptions = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`cms-resizable-image${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ display: 'flex', justifyContent: justifyMap[align] || 'center' }}
    >
      <div style={{ width: liveWidth || width, position: 'relative' }}>
        <img src={node.attrs.src} alt={node.attrs.alt || ''} draggable={false} style={{ width: '100%', display: 'block', borderRadius: '6px' }} />
        {selected && (
          <div className="cms-image-controls">
            <div className="cms-image-presets">
              {presets.map((p) => (
                <button key={p} type="button" className={width === p ? 'active' : ''} onClick={() => updateAttributes({ width: p })}>{p}</button>
              ))}
            </div>
            <div className="cms-image-align">
              {alignOptions.map((opt) => (
                <button key={opt.value} type="button" className={align === opt.value ? 'active' : ''} onClick={() => updateAttributes({ align: opt.value })}>{opt.label}</button>
              ))}
            </div>
          </div>
        )}
        <div className="cms-image-handle" onPointerDown={onPointerDown} />
        {dragging && <div className="cms-image-width-indicator">{liveWidth}</div>}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: '100%' },
      align: { default: 'center' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
```

### Paso B — Crear `components/cms/BlogEditor.jsx`

Crea `components/cms/BlogEditor.jsx` — el editor WYSIWYG compartido basado en Tiptap:

```jsx
'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Youtube from '@tiptap/extension-youtube';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useCallback, useEffect, useRef, useState } from 'react';
import ResizableImage from './ResizableImage';
import { authUpload } from '../../lib/authHelper';

const SLASH_ITEMS = [
  { label: 'Heading 1', desc: 'Large heading', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', desc: 'Medium heading', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', desc: 'Small heading', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', desc: 'Unordered list', action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Ordered List', desc: 'Numbered list', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Task List', desc: 'Checklist', action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Blockquote', desc: 'Quote block', action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block', desc: 'Code snippet', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider', desc: 'Horizontal rule', action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: 'Image', desc: 'Upload image', action: 'image' },
  { label: 'YouTube', desc: 'Embed video', action: 'youtube' },
  { label: 'Table', desc: '3×3 table', action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

const BUBBLE_ITEMS = [
  { label: 'B', cmd: 'toggleBold', active: 'bold', style: { fontWeight: 700 } },
  { label: 'I', cmd: 'toggleItalic', active: 'italic', style: { fontStyle: 'italic' } },
  { label: 'U', cmd: 'toggleUnderline', active: 'underline', style: { textDecoration: 'underline' } },
  { label: 'S', cmd: 'toggleStrike', active: 'strike', style: { textDecoration: 'line-through' } },
  { label: '✦', cmd: 'toggleHighlight', active: 'highlight' },
  { label: '<>', cmd: 'toggleCode', active: 'code', style: { fontFamily: 'monospace', fontSize: '12px' } },
  { label: 'H2', cmd: 'toggleHeading', args: { level: 2 }, active: 'heading', activeArgs: { level: 2 } },
  { label: 'H3', cmd: 'toggleHeading', args: { level: 3 }, active: 'heading', activeArgs: { level: 3 } },
];

export default function BlogEditor({ content, onChange, placeholder = 'Start writing or type / for commands…' }) {
  const fileInputRef = useRef(null);
  const [slashMenu, setSlashMenu] = useState(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, dropcursor: { color: 'var(--accent)', width: 2 } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Typography,
      ResizableImage,
      Youtube.configure({ width: 640, height: 360 }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: content || '',
    onUpdate({ editor: ed }) {
      onChange?.(ed.getHTML());
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  // Slash command detection
  useEffect(() => {
    if (!editor) return undefined;

    const handleKeyDown = (event) => {
      if (slashMenu) {
        const filtered = SLASH_ITEMS.filter((item) =>
          item.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
          item.desc.toLowerCase().includes(slashFilter.toLowerCase())
        );

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSlashIndex((i) => (i + 1) % filtered.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSlashIndex((i) => (i - 1 + filtered.length) % filtered.length);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (filtered[slashIndex]) executeSlashItem(filtered[slashIndex]);
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlashMenu();
          return;
        }
      }

      if (event.key === '/') {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
        if (!textBefore || textBefore === '\n' || from === 1) {
          setTimeout(() => {
            setSlashMenu({ from });
            setSlashFilter('');
            setSlashIndex(0);
          }, 10);
        }
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener('keydown', handleKeyDown);
    return () => editorEl.removeEventListener('keydown', handleKeyDown);
  }, [editor, slashMenu, slashFilter, slashIndex]);

  // Track slash filter text
  useEffect(() => {
    if (!editor || !slashMenu) return undefined;

    const handleInput = () => {
      const { from } = editor.state.selection;
      const text = editor.state.doc.textBetween(slashMenu.from, from);
      if (text.startsWith('/')) {
        setSlashFilter(text.slice(1));
      } else {
        closeSlashMenu();
      }
    };

    editor.on('update', handleInput);
    return () => editor.off('update', handleInput);
  }, [editor, slashMenu]);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu(null);
    setSlashFilter('');
    setSlashIndex(0);
  }, []);

  const executeSlashItem = useCallback((item) => {
    if (!editor || !slashMenu) return;

    // Delete the slash command text
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: slashMenu.from, to: from }).run();
    closeSlashMenu();

    if (item.action === 'image') {
      fileInputRef.current?.click();
    } else if (item.action === 'youtube') {
      const url = window.prompt('YouTube URL:');
      if (url) editor.commands.setYoutubeVideo({ src: url });
    } else if (typeof item.action === 'function') {
      item.action(editor);
    }
  }, [editor, slashMenu, closeSlashMenu]);

  const handleImageUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    event.target.value = '';

    try {
      const result = await authUpload('/api/uploads', file);
      if (result.url) {
        editor.chain().focus().insertContent({
          type: 'resizableImage',
          attrs: { src: result.url },
        }).run();
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  }, [editor]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('URL:');
      if (url) editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const filteredSlash = slashMenu
    ? SLASH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
        item.desc.toLowerCase().includes(slashFilter.toLowerCase())
      )
    : [];

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="cms-editor-wrap">
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }} className="cms-bubble-menu">
        {BUBBLE_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            className={editor.isActive(item.active, item.activeArgs) ? 'active' : ''}
            style={item.style}
            onClick={() => {
              if (item.args) {
                editor.chain().focus()[item.cmd](item.args).run();
              } else {
                editor.chain().focus()[item.cmd]().run();
              }
            }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className={editor.isActive('link') ? 'active' : ''} onClick={handleLinkToggle}>
          🔗
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} className="cms-editor-content" />

      {slashMenu && filteredSlash.length > 0 && (
        <div className="cms-slash-menu">
          {filteredSlash.map((item, i) => (
            <button
              key={item.label}
              type="button"
              className={`cms-slash-item${i === slashIndex ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); executeSlashItem(item); }}
            >
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageUpload}
      />

      <div className="cms-editor-footer">
        <span>{chars} characters</span>
        <span>{words} words</span>
        <span>~{readingTime} min read</span>
      </div>
    </div>
  );
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `components/cms/ResizableImage.jsx` | Extensión Tiptap de imágenes redimensionables |
| `components/cms/BlogEditor.jsx` | Editor WYSIWYG con Tiptap, slash commands, bubble menu |

### Notas importantes:
- **NO** importar `next/link` como `Link` aquí — Tiptap usa su propia extensión `Link`.
- El upload de imágenes usa `authUpload` de `lib/authHelper.js` (creado en Prompt 1).
- El slash menu se posiciona con CSS (no usa coordenadas del cursor — simplificación vs Util).

---

## Prompt 3 — Componentes CMS compartidos

Crea estos 3 componentes reutilizables en `components/cms/`:

### A — `components/cms/CmsCoverUpload.jsx`

Upload de imagen de portada con preview:

```jsx
'use client';

import { useCallback, useRef, useState } from 'react';

export default function CmsCoverUpload({ coverUrl, onChange, uploadFile, emptyLabel = 'Upload cover image', uploadingLabel = 'Uploading…' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (result?.url) onChange(result.url);
    } catch (err) {
      console.error('Cover upload failed:', err);
    } finally {
      setUploading(false);
    }
  }, [onChange, uploadFile]);

  return (
    <div className="cms-cover-upload">
      {coverUrl ? (
        <div className="cms-cover-preview">
          <img src={coverUrl} alt="Cover" />
          <div className="cms-cover-actions">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Change
            </button>
            <button type="button" onClick={() => onChange('')} className="cms-cover-remove">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="cms-cover-empty" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? uploadingLabel : emptyLabel}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}
```

### B — `components/cms/CmsSidebarSection.jsx`

Sección colapsable del sidebar:

```jsx
'use client';

import { useState } from 'react';

export default function CmsSidebarSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="cms-sidebar-section">
      <button type="button" className="cms-sidebar-section-toggle" onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <svg viewBox="0 0 16 16" width="14" height="14" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="cms-sidebar-section-body">{children}</div> : null}
    </section>
  );
}
```

### C — `components/cms/CmsPairEditor.jsx`

Editor de pares clave-valor (para resultados del portfolio):

```jsx
'use client';

export default function CmsPairEditor({ items = [], onChange, keys = ['value', 'label'], placeholders = ['Value', 'Label'] }) {
  const update = (index, key, value) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const add = () => onChange([...items, Object.fromEntries(keys.map((k) => [k, '']))]);

  const remove = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="cms-pair-editor">
      {items.map((item, index) => (
        <div key={index} className="cms-pair-row">
          {keys.map((key, ki) => (
            <input
              key={key}
              type="text"
              value={item[key] || ''}
              placeholder={placeholders[ki] || key}
              onChange={(e) => update(index, key, e.target.value)}
              className="cms-input"
            />
          ))}
          <button type="button" className="cms-pair-remove" onClick={() => remove(index)} aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="cms-btn-add" onClick={add}>
        + Add
      </button>
    </div>
  );
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `components/cms/CmsCoverUpload.jsx` | Upload de cover image con preview |
| `components/cms/CmsSidebarSection.jsx` | Sección colapsable |
| `components/cms/CmsPairEditor.jsx` | Editor de pares clave-valor |

---

## Prompt 4 — Componentes y datos específicos del portfolio

### A — `data/portfolioSoftwareCatalog.js`

Catálogo de software y tecnologías para ilustración. Crea `data/portfolioSoftwareCatalog.js`:

```js
export const PORTFOLIO_SOFTWARE_OPTIONS = [
  { id: 'clip-studio', name: 'Clip Studio Paint', abbr: 'CSP' },
  { id: 'photoshop', name: 'Adobe Photoshop', abbr: 'PS' },
  { id: 'procreate', name: 'Procreate', abbr: 'Procreate' },
  { id: 'sai', name: 'Paint Tool SAI', abbr: 'SAI' },
  { id: 'krita', name: 'Krita', abbr: 'Krita' },
  { id: 'medibang', name: 'MediBang Paint', abbr: 'MediBang' },
  { id: 'illustrator', name: 'Adobe Illustrator', abbr: 'AI' },
  { id: 'firealpaca', name: 'FireAlpaca', abbr: 'FA' },
  { id: 'ibispaint', name: 'ibisPaint', abbr: 'ibis' },
  { id: 'blender', name: 'Blender', abbr: 'Blender' },
  { id: 'zbrush', name: 'ZBrush', abbr: 'ZB' },
  { id: 'after-effects', name: 'After Effects', abbr: 'AE' },
  { id: 'live2d', name: 'Live2D Cubism', abbr: 'L2D' },
  { id: 'spine', name: 'Spine', abbr: 'Spine' },
  { id: 'aseprite', name: 'Aseprite', abbr: 'Aseprite' },
];

export const PORTFOLIO_TECHNOLOGY_OPTIONS = [
  { id: 'digital', name: 'Digital Art', kind: 'medium' },
  { id: 'traditional', name: 'Traditional Art', kind: 'medium' },
  { id: 'watercolor', name: 'Watercolor', kind: 'medium' },
  { id: 'ink', name: 'Ink', kind: 'medium' },
  { id: 'pencil', name: 'Pencil / Graphite', kind: 'medium' },
  { id: 'oil', name: 'Oil Paint', kind: 'medium' },
  { id: 'acrylic', name: 'Acrylic', kind: 'medium' },
  { id: 'pastel', name: 'Pastel', kind: 'medium' },
  { id: 'charcoal', name: 'Charcoal', kind: 'medium' },
  { id: 'mixed-media', name: 'Mixed Media', kind: 'medium' },
  { id: 'vector', name: 'Vector', kind: 'technique' },
  { id: 'pixel-art', name: 'Pixel Art', kind: 'technique' },
  { id: 'cel-shading', name: 'Cel Shading', kind: 'technique' },
  { id: 'painterly', name: 'Painterly', kind: 'technique' },
  { id: 'lineart', name: 'Line Art', kind: 'technique' },
  { id: 'flat-color', name: 'Flat Color', kind: 'technique' },
  { id: 'semi-realism', name: 'Semi-Realism', kind: 'technique' },
  { id: 'anime', name: 'Anime / Manga', kind: 'style' },
  { id: 'chibi', name: 'Chibi', kind: 'style' },
  { id: 'cartoon', name: 'Cartoon', kind: 'style' },
  { id: 'realism', name: 'Realism', kind: 'style' },
];

export function normalizePortfolioSoftwareEntry(raw) {
  if (!raw) return null;
  const match = PORTFOLIO_SOFTWARE_OPTIONS.find((o) => o.id === (raw.id || raw));
  if (match) return { ...match };
  if (typeof raw === 'object' && raw.name) return { id: raw.id || raw.name, name: raw.name, abbr: raw.abbr || raw.name };
  return null;
}

export function normalizePortfolioTechnologyEntry(raw) {
  if (!raw) return null;
  const match = PORTFOLIO_TECHNOLOGY_OPTIONS.find((o) => o.id === (raw.id || raw));
  if (match) return { ...match };
  if (typeof raw === 'object' && raw.name) return { id: raw.id || raw.name, name: raw.name, kind: raw.kind || 'other' };
  return null;
}
```

### B — `components/cms/PortfolioCategoryChips.jsx`

Chips toggle para categorías del portfolio:

```jsx
'use client';

export default function PortfolioCategoryChips({ categories = [], value = [], onChange }) {
  const toggle = (slug) => {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  };

  return (
    <div className="cms-category-chips">
      {categories.map((cat) => (
        <button
          key={cat.slug}
          type="button"
          className={`cms-category-chip${value.includes(cat.slug) ? ' active' : ''}`}
          onClick={() => toggle(cat.slug)}
        >
          {cat.label}
        </button>
      ))}
      {!categories.length && <span className="cms-no-data">No categories available</span>}
    </div>
  );
}
```

### C — `components/cms/PortfolioBudgetInput.jsx`

Input de presupuesto con selector de moneda:

```jsx
'use client';

import { useEffect, useState } from 'react';

const CURRENCIES = [
  { symbol: '₡', code: 'CRC', label: 'Colones' },
  { symbol: '$', code: 'USD', label: 'Dollars' },
  { symbol: '€', code: 'EUR', label: 'Euros' },
];

function parseBudget(raw) {
  if (!raw) return { currency: '$', amount: '' };
  const str = String(raw).trim();
  for (const c of CURRENCIES) {
    if (str.startsWith(c.symbol) || str.startsWith(c.code)) {
      return { currency: c.symbol, amount: str.replace(c.symbol, '').replace(c.code, '').replace(/\s/g, '').trim() };
    }
  }
  return { currency: '$', amount: str.replace(/[^0-9]/g, '') };
}

function formatAmount(value) {
  const num = String(value).replace(/[^0-9]/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function PortfolioBudgetInput({ value, onChange }) {
  const parsed = parseBudget(value);
  const [currency, setCurrency] = useState(parsed.currency);
  const [amount, setAmount] = useState(parsed.amount);

  useEffect(() => {
    const p = parseBudget(value);
    setCurrency(p.currency);
    setAmount(p.amount);
  }, [value]);

  const emit = (cur, amt) => {
    const clean = String(amt).replace(/[^0-9]/g, '');
    onChange(clean ? `${cur}${clean}` : '');
  };

  return (
    <div className="cms-budget-input">
      <select value={currency} onChange={(e) => { setCurrency(e.target.value); emit(e.target.value, amount); }} className="cms-input cms-budget-currency">
        {CURRENCIES.map((c) => (
          <option key={c.symbol} value={c.symbol}>{c.symbol} {c.label}</option>
        ))}
      </select>
      <input
        type="text"
        inputMode="numeric"
        value={formatAmount(amount)}
        onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setAmount(raw); emit(currency, raw); }}
        placeholder="0"
        className="cms-input cms-budget-amount"
      />
    </div>
  );
}
```

### D — `components/cms/SoftwarePicker.jsx`

Selector de software utilizado:

```jsx
'use client';

import { useState } from 'react';
import { PORTFOLIO_SOFTWARE_OPTIONS, normalizePortfolioSoftwareEntry } from '../../data/portfolioSoftwareCatalog';

export default function SoftwarePicker({ value = [], onChange }) {
  const [selected, setSelected] = useState('');
  const usedIds = new Set(value.map((v) => v.id));
  const available = PORTFOLIO_SOFTWARE_OPTIONS.filter((o) => !usedIds.has(o.id));

  const add = () => {
    if (!selected) return;
    const entry = normalizePortfolioSoftwareEntry(selected);
    if (entry) {
      onChange([...value, entry]);
      setSelected('');
    }
  };

  const remove = (id) => onChange(value.filter((v) => v.id !== id));

  return (
    <div className="cms-picker">
      <div className="cms-picker-add">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="cms-input">
          <option value="">Select software…</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button type="button" className="cms-btn-add" onClick={add} disabled={!selected}>Add</button>
      </div>
      <div className="cms-picker-list">
        {value.map((item) => (
          <div key={item.id} className="cms-picker-item">
            <span className="cms-picker-abbr">{item.abbr}</span>
            <span>{item.name}</span>
            <button type="button" className="cms-pair-remove" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### E — `components/cms/TechnologyPicker.jsx`

Selector de técnicas/medios (misma estructura que SoftwarePicker):

```jsx
'use client';

import { useState } from 'react';
import { PORTFOLIO_TECHNOLOGY_OPTIONS, normalizePortfolioTechnologyEntry } from '../../data/portfolioSoftwareCatalog';

export default function TechnologyPicker({ value = [], onChange }) {
  const [selected, setSelected] = useState('');
  const usedIds = new Set(value.map((v) => v.id));
  const available = PORTFOLIO_TECHNOLOGY_OPTIONS.filter((o) => !usedIds.has(o.id));

  const add = () => {
    if (!selected) return;
    const entry = normalizePortfolioTechnologyEntry(selected);
    if (entry) {
      onChange([...value, entry]);
      setSelected('');
    }
  };

  const remove = (id) => onChange(value.filter((v) => v.id !== id));

  return (
    <div className="cms-picker">
      <div className="cms-picker-add">
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="cms-input">
          <option value="">Select technique/medium…</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>{o.name} ({o.kind})</option>
          ))}
        </select>
        <button type="button" className="cms-btn-add" onClick={add} disabled={!selected}>Add</button>
      </div>
      <div className="cms-picker-list">
        {value.map((item) => (
          <div key={item.id} className="cms-picker-item">
            <span className="cms-picker-kind">{item.kind}</span>
            <span>{item.name}</span>
            <button type="button" className="cms-pair-remove" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `data/portfolioSoftwareCatalog.js` | Catálogo de software + técnicas de ilustración |
| `components/cms/PortfolioCategoryChips.jsx` | Chips toggle de categorías |
| `components/cms/PortfolioBudgetInput.jsx` | Input de presupuesto con moneda |
| `components/cms/SoftwarePicker.jsx` | Selector de software |
| `components/cms/TechnologyPicker.jsx` | Selector de técnicas/medios |

---

## Prompt 5 — Portfolio Admin List (`app/admin/portfolio/page.js`)

Crea el archivo `app/admin/portfolio/page.js` — la lista de proyectos del portfolio en el panel de administración.

### Requisitos técnicos exactos:

1. **Directiva**: `'use client'`
2. **Imports**: `{ useEffect, useState }` de `react`, `Link` de `next/link`, `{ useRouter }` de `next/navigation`
3. **Imports internos**: `{ authFetch }` de `../../../lib/authHelper`, `{ getPublicationState, formatPublicationDateTime }` de `../../../lib/publishing`

4. **Componente principal** `PortfolioAdminPage` (export default):
   - **State**: `projects` (array), `categories` (array), `loading` (boolean), `error` (string), `search` (string)
   - **useEffect** al montar: fetch paralelo de `authFetch('/api/portfolio/categories')` y `authFetch('/api/portfolio/projects?all=true')`.
   - **Filtro local**: filtrar projects por `title`, `slug`, `client` con `search`.
   - **Delete handler**: `window.confirm('Delete this project?')` → `authFetch(\`/api/portfolio/projects/${id}\`, { method: 'DELETE' })` → recargar.
   - **Toggle publish**: `authFetch(\`/api/portfolio/projects/${id}\`, { method: 'PATCH', body: JSON.stringify({ isPublished: !project.isPublished }) })` → recargar.

5. **Render**:
   ```jsx
   <main className="cms-admin-page">
     <header className="cms-admin-header">
       <h1>Portfolio</h1>
       <Link href="/admin/portfolio/new" className="cms-btn cms-btn-primary">+ New Project</Link>
     </header>

     <div className="cms-admin-search">
       <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects…" className="cms-input" />
     </div>

     {error && <div className="blog-public-error" role="alert">{error}</div>}

     <div className="cms-admin-grid">
       {filteredProjects.map((project) => {
         const state = getPublicationState(project);
         const categoryMap = new Map(categories.map((c) => [c.slug, c.label]));
         const categoryLabels = (project.categories || []).map((s) => categoryMap.get(s) || s).join(', ');

         return (
           <article key={project.id} className="cms-admin-card">
             <div className="cms-admin-card-cover">
               {project.coverUrl ? <img src={project.coverUrl} alt={project.title} /> : <div className="cms-admin-card-placeholder">No cover</div>}
             </div>
             <div className="cms-admin-card-body">
               <h2>{project.title}</h2>
               <p className="cms-admin-card-meta">{categoryLabels || 'Uncategorized'}</p>
               <p className="cms-admin-card-slug">/{project.slug}</p>
               <span className={`cms-admin-badge cms-badge-${state}`}>
                 {state === 'published' ? 'Published' : state === 'scheduled' ? 'Scheduled' : 'Draft'}
               </span>
               {state === 'scheduled' && <p className="cms-admin-card-scheduled">{formatPublicationDateTime(project.publishedAt)}</p>}
             </div>
             <div className="cms-admin-card-actions">
               <button type="button" className="cms-btn cms-btn-sm" onClick={() => handleTogglePublish(project)}>
                 {project.isPublished ? 'Unpublish' : 'Publish'}
               </button>
               <Link href={`/admin/portfolio/${project.id}/edit`} className="cms-btn cms-btn-sm">Edit</Link>
               <button type="button" className="cms-btn cms-btn-sm cms-btn-danger" onClick={() => handleDelete(project.id)}>Delete</button>
             </div>
           </article>
         );
       })}
     </div>

     {!loading && !filteredProjects.length && <div className="blog-empty">No projects found.</div>}
   </main>
   ```

---

## Prompt 6 — Portfolio Editor (`app/admin/portfolio/[id]/edit/page.js` + `/new`)

### Paso A — Crear `app/admin/portfolio/new/page.js`

Simplemente re-exporta el editor:

```jsx
'use client';

import PortfolioEditorPage from '../[id]/edit/page';

export default function NewPortfolioPage() {
  return <PortfolioEditorPage />;
}
```

### Paso B — Crear `app/admin/portfolio/[id]/edit/page.js`

Este es el editor principal del portfolio. Es el componente más complejo.

#### Requisitos técnicos exactos:

1. **Imports**:
   - `{ useCallback, useEffect, useRef, useState }` de `react`
   - `Link` de `next/link`
   - `{ useParams, useRouter }` de `next/navigation`
   - `{ authFetch, authUpload }` de `../../../../../lib/authHelper`
   - `{ slugifyCmsValue, toDateTimeLocalValue, fromDateTimeLocalValue, getPublicationState }` de `../../../../../lib/publishing`
   - `BlogEditor` de `../../../../../components/cms/BlogEditor`
   - `CmsCoverUpload` de `../../../../../components/cms/CmsCoverUpload`
   - `CmsSidebarSection` de `../../../../../components/cms/CmsSidebarSection`
   - `CmsPairEditor` de `../../../../../components/cms/CmsPairEditor`
   - `PortfolioCategoryChips` de `../../../../../components/cms/PortfolioCategoryChips`
   - `PortfolioBudgetInput` de `../../../../../components/cms/PortfolioBudgetInput`
   - `SoftwarePicker` de `../../../../../components/cms/SoftwarePicker`
   - `TechnologyPicker` de `../../../../../components/cms/TechnologyPicker`

2. **EMPTY_FORM** (state inicial del formulario):
   ```js
   const EMPTY_FORM = {
     title: '', slug: '', client: '', date: '', summary: '', approach: '', budget: '',
     aspectRatio: '4/3', liveUrl: '', showBrowserFrame: false, coverUrl: '',
     categories: [], software: [], technologies: [], results: [], content: '',
     isPublished: false, publishedAt: null,
   };
   ```

3. **State**:
   - `form` (object, inicia con `EMPTY_FORM`)
   - `projectId` (number | null) — el ID real del proyecto en la base de datos
   - `categories` (array de categorías disponibles)
   - `loading` (boolean)
   - `saveStatus` ('idle' | 'saving' | 'saved' | 'error')
   - `sidebarOpen` (boolean, default true)

4. **useParams**: `const params = useParams();` — `params.id` es el ID para editar, undefined para nuevo.

5. **Load data** (useEffect en mount):
   - Fetch categorías: `authFetch('/api/portfolio/categories')`
   - Si `params.id` existe: fetch `authFetch('/api/portfolio/projects?all=true')`, buscar el proyecto con `id === Number(params.id)`, luego `authFetch(\`/api/portfolio/projects/${project.slug}\`)` para el detalle completo. Llenar `form` con los datos. Normalizar `software` y `technologies` con las funciones normalize del catálogo.
   - Si NO hay `params.id`: mantener EMPTY_FORM (modo crear).

6. **`updateField(key, value)`**: Actualiza un campo del form y programa auto-save.

7. **Auto-save con debounce** (2 segundos):
   - `saveTimerRef` para el timeout.
   - `savePromiseRef` para encadenar saves y evitar solapamiento.
   - `persistDraft()`:
     - Si no hay `title` ni `summary`, no guardar.
     - Si es nuevo (no `projectId`): `authFetch('/api/portfolio/projects', { method: 'POST', body })` → guardar el ID retornado en `projectId` → hacer `router.replace(\`/admin/portfolio/${newId}/edit\`)`.
     - Si existe: `authFetch(\`/api/portfolio/projects/${projectId}\`, { method: 'PATCH', body })`.
     - El body es el form completo con `content` wrapeado como objeto si viene de Tiptap.
   - `scheduleSave()`: `clearTimeout(saveTimerRef)` → `setTimeout(persistDraft, 2000)`.

8. **Publish/Schedule/Clear**:
   - `handlePublish()`: save draft, then toggle `isPublished`.
   - `handleSchedulePublish(datetimeValue)`: validate future, save with `isPublished: false, publishedAt: ISO string`.
   - `handleClearSchedule()`: save with `isPublished: false, publishedAt: null`.

9. **Cover upload**: usar `authUpload('/api/uploads', file)` como `uploadFile` prop de `CmsCoverUpload`.

10. **Render — estructura**:
    ```jsx
    <main className="cms-editor-page">
      <div className="cms-editor-topbar">
        <Link href="/admin/portfolio" className="cms-back-button">
          ← Portfolio
        </Link>
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
            placeholder="Project title"
            className="cms-title-input"
          />
          <BlogEditor
            content={form.content}
            onChange={(html) => updateField('content', html)}
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

            <CmsSidebarSection title="Description">
              <textarea value={form.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder="Summary (required)" className="cms-input cms-textarea" rows={3} />
              <textarea value={form.approach} onChange={(e) => updateField('approach', e.target.value)} placeholder="Approach" className="cms-input cms-textarea" rows={3} />
            </CmsSidebarSection>

            <CmsSidebarSection title="Details">
              <input type="text" value={form.client} onChange={(e) => updateField('client', e.target.value)} placeholder="Client" className="cms-input" />
              <input type="text" value={form.date} onChange={(e) => updateField('date', e.target.value)} placeholder="Date (e.g. Mar 2026)" className="cms-input" />
              <PortfolioBudgetInput value={form.budget} onChange={(v) => updateField('budget', v)} />
              <input type="text" value={form.liveUrl} onChange={(e) => updateField('liveUrl', e.target.value)} placeholder="Live URL" className="cms-input" />
              <div className="cms-field-row">
                <input type="text" value={form.aspectRatio} onChange={(e) => updateField('aspectRatio', e.target.value)} placeholder="4/3" className="cms-input" style={{ maxWidth: 120 }} />
                <label className="cms-checkbox-label">
                  <input type="checkbox" checked={form.showBrowserFrame} onChange={(e) => updateField('showBrowserFrame', e.target.checked)} />
                  Browser frame
                </label>
              </div>
            </CmsSidebarSection>

            <CmsSidebarSection title="Categories">
              <PortfolioCategoryChips categories={categories} value={form.categories} onChange={(v) => updateField('categories', v)} />
            </CmsSidebarSection>

            <CmsSidebarSection title="Software" defaultOpen={false}>
              <SoftwarePicker value={form.software} onChange={(v) => updateField('software', v)} />
            </CmsSidebarSection>

            <CmsSidebarSection title="Techniques / Media" defaultOpen={false}>
              <TechnologyPicker value={form.technologies} onChange={(v) => updateField('technologies', v)} />
            </CmsSidebarSection>

            <CmsSidebarSection title="Results" defaultOpen={false}>
              <CmsPairEditor items={form.results} onChange={(v) => updateField('results', v)} keys={['value', 'label']} placeholders={['Value (e.g. 95%)', 'Label (e.g. Client satisfaction)']} />
            </CmsSidebarSection>

            <CmsSidebarSection title="SEO / URL" defaultOpen={false}>
              <div className="cms-slug-preview">
                <span>URL Preview</span>
                <code>/work/{form.slug || slugifyCmsValue(form.title)}</code>
              </div>
              <input type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} placeholder="Custom slug" className="cms-input" />
            </CmsSidebarSection>

            <CmsSidebarSection title="Publication" defaultOpen={false}>
              {/* Mostrar state badge, botón publish/unpublish, datetime-local para schedule */}
              <div className="cms-publish-section">
                <span className={`cms-admin-badge cms-badge-${getPublicationState(form)}`}>
                  {getPublicationState(form) === 'published' ? 'Published' : getPublicationState(form) === 'scheduled' ? 'Scheduled' : 'Draft'}
                </span>
                <button type="button" className="cms-btn" onClick={handlePublish}>
                  {form.isPublished ? 'Unpublish' : 'Publish Now'}
                </button>
                <input type="datetime-local" value={toDateTimeLocalValue(form.publishedAt)} onChange={(e) => handleSchedulePublish(e.target.value)} className="cms-input" />
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

### Archivos a crear:
| Archivo | Contenido |
|---------|-----------|
| `app/admin/portfolio/new/page.js` | Re-export del editor |
| `app/admin/portfolio/[id]/edit/page.js` | Editor completo del portfolio |

---

## Prompt 7 — CSS del CMS (agregar a `styles/globals.css`)

Agrega TODOS los estilos del CMS al final de `styles/globals.css`, después de los estilos del blog. Usar las mismas CSS variables de ienyell.

### Estilos a crear — LISTA COMPLETA (prefijos `.cms-`):

```css
/* ══════════════════════════════════════════════════
   CMS — Admin & Editor Styles
   ══════════════════════════════════════════════════ */

/* ── Admin page (list view) ── */
.cms-admin-page {
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 48px 0 80px;
}
.cms-admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.cms-admin-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--ink);
}
.cms-admin-search {
  margin-bottom: 24px;
}
.cms-admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.cms-admin-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: var(--paper);
  transition: box-shadow 200ms ease;
}
.cms-admin-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.cms-admin-card-cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--surface);
}
.cms-admin-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cms-admin-card-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 13px;
}
.cms-admin-card-body {
  padding: 16px;
  display: grid;
  gap: 6px;
}
.cms-admin-card-body h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}
.cms-admin-card-meta {
  font-size: 12px;
  color: var(--ink-soft);
  margin: 0;
}
.cms-admin-card-slug {
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
  margin: 0;
}
.cms-admin-card-scheduled {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}
.cms-admin-card-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
}

/* ── Badges ── */
.cms-admin-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cms-badge-published { background: #e9fbef; color: #166534; }
.cms-badge-scheduled { background: #eff6ff; color: #1e40af; }
.cms-badge-draft { background: var(--surface); color: var(--text-muted); }

/* ── Buttons ── */
.cms-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
}
.cms-btn:hover {
  background: var(--surface);
  border-color: var(--ink-soft);
}
.cms-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.cms-btn-primary:hover {
  background: var(--accent-dark);
  border-color: var(--accent-dark);
}
.cms-btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}
.cms-btn-danger {
  color: #dc3545;
  border-color: #dc3545;
}
.cms-btn-danger:hover {
  background: #dc3545;
  color: var(--paper);
}
.cms-btn-add {
  padding: 5px 12px;
  border: 1px dashed var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
}
.cms-btn-add:hover {
  background: var(--accent-tint);
  border-color: var(--accent);
}
.cms-btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Inputs ── */
.cms-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper);
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  transition: border-color 150ms ease;
}
.cms-input:focus {
  outline: none;
  border-color: var(--accent);
}
.cms-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}
.cms-title-input {
  width: 100%;
  padding: 12px 0;
  border: none;
  border-bottom: 2px solid var(--line);
  background: transparent;
  color: var(--ink);
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: inherit;
}
.cms-title-input:focus {
  outline: none;
  border-bottom-color: var(--accent);
}
.cms-title-input::placeholder {
  color: var(--line);
}

/* ── Editor layout ── */
.cms-editor-page {
  width: min(1400px, calc(100% - 32px));
  margin: 0 auto;
  padding: 16px 0 80px;
}
.cms-editor-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--paper) 96%, transparent);
  backdrop-filter: blur(8px);
  margin-bottom: 16px;
}
.cms-back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.cms-back-button:hover { color: var(--accent-dark); }
.cms-save-status {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}
.cms-save-status.is-saved { color: #16a34a; }
.cms-save-status.is-error { color: #dc3545; }

.cms-editor-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}
.cms-editor-main {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.cms-editor-sidebar {
  position: sticky;
  top: 80px;
  display: grid;
  gap: 8px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 4px;
}

/* ── Sidebar sections ── */
.cms-sidebar-section {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.cms-sidebar-section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border: none;
  background: var(--surface);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}
.cms-sidebar-section-toggle:hover {
  background: var(--line-2);
}
.cms-sidebar-section-body {
  padding: 14px;
  display: grid;
  gap: 10px;
}

/* ── Cover upload ── */
.cms-cover-upload { width: 100%; }
.cms-cover-preview {
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--line);
  position: relative;
}
.cms-cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cms-cover-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
}
.cms-cover-actions button {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cms-cover-actions button:hover { background: rgba(0, 0, 0, 0.8); }
.cms-cover-remove { background: rgba(220, 53, 69, 0.8) !important; }
.cms-cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  border: 2px dashed var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 180ms ease, color 180ms ease;
}
.cms-cover-empty:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Category chips ── */
.cms-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cms-category-chip {
  padding: 5px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}
.cms-category-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.cms-category-chip:hover:not(.active) {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Picker (software/technology) ── */
.cms-picker { display: grid; gap: 8px; }
.cms-picker-add { display: flex; gap: 6px; }
.cms-picker-add select { flex: 1; }
.cms-picker-list { display: grid; gap: 4px; }
.cms-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--line-2);
  border-radius: 6px;
  font-size: 13px;
}
.cms-picker-abbr {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent-tint);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
}
.cms-picker-kind {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

/* ── Pair editor (key-value) ── */
.cms-pair-editor { display: grid; gap: 6px; }
.cms-pair-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.cms-pair-row .cms-input { flex: 1; }
.cms-pair-remove {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  transition: color 150ms ease, border-color 150ms ease;
}
.cms-pair-remove:hover {
  color: #dc3545;
  border-color: #dc3545;
}

/* ── Budget input ── */
.cms-budget-input {
  display: flex;
  gap: 6px;
}
.cms-budget-currency { max-width: 120px; }
.cms-budget-amount { flex: 1; }

/* ── Slug preview ── */
.cms-slug-preview {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  display: grid;
  gap: 4px;
}
.cms-slug-preview span {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}
.cms-slug-preview code {
  font-size: 12px;
  color: var(--accent);
  overflow-wrap: anywhere;
}

/* ── Publish section ── */
.cms-publish-section {
  display: grid;
  gap: 8px;
}

/* ── Field row ── */
.cms-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cms-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
  white-space: nowrap;
  cursor: pointer;
}
.cms-no-data {
  font-size: 12px;
  color: var(--text-muted);
}

/* ── Tiptap editor ── */
.cms-editor-wrap {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.cms-editor-content {
  min-height: 400px;
  padding: 20px;
}
.cms-editor-content .tiptap {
  outline: none;
  min-height: 360px;
  color: var(--ink);
  font-size: 16px;
  line-height: 1.7;
}
.cms-editor-content .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
}
.cms-editor-content .tiptap h1 { font-size: 32px; font-weight: 800; margin: 24px 0 12px; }
.cms-editor-content .tiptap h2 { font-size: 24px; font-weight: 700; margin: 20px 0 10px; }
.cms-editor-content .tiptap h3 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
.cms-editor-content .tiptap p { margin: 0 0 12px; }
.cms-editor-content .tiptap ul,
.cms-editor-content .tiptap ol { padding-left: 24px; margin: 0 0 12px; }
.cms-editor-content .tiptap blockquote {
  margin: 16px 0;
  padding-left: 16px;
  border-left: 3px solid var(--accent);
  color: var(--ink-soft);
}
.cms-editor-content .tiptap a { color: var(--accent); text-decoration: underline; }
.cms-editor-content .tiptap code { padding: 2px 6px; border-radius: 4px; background: var(--surface); font-size: 0.9em; }
.cms-editor-content .tiptap pre { padding: 14px; border-radius: 6px; background: var(--ink); color: var(--paper); font-size: 14px; overflow-x: auto; }
.cms-editor-content .tiptap pre code { padding: 0; background: transparent; color: inherit; }
.cms-editor-content .tiptap img { max-width: 100%; border-radius: 6px; }
.cms-editor-content .tiptap table { border-collapse: collapse; width: 100%; margin: 16px 0; }
.cms-editor-content .tiptap th,
.cms-editor-content .tiptap td { border: 1px solid var(--line); padding: 8px 12px; text-align: left; }
.cms-editor-content .tiptap th { background: var(--surface); font-weight: 600; }
.cms-editor-content .tiptap mark { background: #fef08a; padding: 1px 2px; border-radius: 2px; }
.cms-editor-content .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.cms-editor-content .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
.cms-editor-content .tiptap ul[data-type="taskList"] input { margin-top: 5px; }

/* ── Bubble menu ── */
.cms-bubble-menu {
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}
.cms-bubble-menu button {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.cms-bubble-menu button.active {
  background: var(--accent);
  color: var(--paper);
}
.cms-bubble-menu button:hover:not(.active) {
  background: var(--surface);
}

/* ── Slash menu ── */
.cms-slash-menu {
  position: absolute;
  z-index: 30;
  max-height: 280px;
  overflow-y: auto;
  margin-top: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
  min-width: 220px;
}
.cms-slash-item {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 100ms ease;
}
.cms-slash-item:hover,
.cms-slash-item.active {
  background: var(--accent-tint);
}
.cms-slash-item strong {
  font-size: 13px;
  color: var(--ink);
}
.cms-slash-item span {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Editor footer ── */
.cms-editor-footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.cms-editor-footer span {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Resizable image controls ── */
.cms-resizable-image { margin: 12px 0; }
.cms-resizable-image.is-selected > div { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.cms-image-controls {
  position: absolute;
  bottom: -36px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--paper);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  white-space: nowrap;
}
.cms-image-presets,
.cms-image-align { display: flex; gap: 2px; }
.cms-image-presets button,
.cms-image-align button {
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cms-image-presets button.active,
.cms-image-align button.active {
  background: var(--accent);
  color: var(--paper);
}
.cms-image-handle {
  position: absolute;
  top: 0;
  right: -6px;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
}
.cms-image-width-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

/* ── CMS responsive ── */
@media (max-width: 900px) {
  .cms-editor-layout {
    grid-template-columns: 1fr;
  }
  .cms-editor-sidebar {
    position: static;
    top: auto;
    max-height: none;
  }
}

@media (max-width: 767px) {
  .cms-admin-page {
    width: min(100% - 32px, 720px);
    padding-top: 32px;
  }
  .cms-admin-grid {
    grid-template-columns: 1fr;
  }
  .cms-editor-page {
    width: min(100% - 16px, 720px);
  }
}
```

### Reglas:
1. Usar tokens de ienyell (`--paper`, `--ink`, `--accent`, etc.) — mismo principio que blog/portfolio.
2. Los únicos colores hardcodeados permitidos: badges de estado (`#e9fbef`, `#166534`, `#eff6ff`, `#1e40af`), error (`#dc3545`), y sombras (`rgba`).
3. El sidebar del editor debe ser `sticky` en desktop, `static` en mobile.
4. El layout del editor cambia a una sola columna en `≤ 900px`.

---

## Resumen de TODOS los archivos a crear/modificar:

| # | Prompt | Archivo | Acción |
|---|--------|---------|--------|
| 1 | P1 | `package.json` | **Modificar** — npm install tiptap |
| 2 | P1 | `lib/authHelper.js` | **Crear** |
| 3 | P1 | `lib/publishing.js` | **Crear** |
| 4 | P2 | `components/cms/ResizableImage.jsx` | **Crear** |
| 5 | P2 | `components/cms/BlogEditor.jsx` | **Crear** |
| 6 | P3 | `components/cms/CmsCoverUpload.jsx` | **Crear** |
| 7 | P3 | `components/cms/CmsSidebarSection.jsx` | **Crear** |
| 8 | P3 | `components/cms/CmsPairEditor.jsx` | **Crear** |
| 9 | P4 | `data/portfolioSoftwareCatalog.js` | **Crear** |
| 10 | P4 | `components/cms/PortfolioCategoryChips.jsx` | **Crear** |
| 11 | P4 | `components/cms/PortfolioBudgetInput.jsx` | **Crear** |
| 12 | P4 | `components/cms/SoftwarePicker.jsx` | **Crear** |
| 13 | P4 | `components/cms/TechnologyPicker.jsx` | **Crear** |
| 14 | P5 | `app/admin/portfolio/page.js` | **Crear** |
| 15 | P6 | `app/admin/portfolio/new/page.js` | **Crear** |
| 16 | P6 | `app/admin/portfolio/[id]/edit/page.js` | **Crear** |
| 17 | P7 | `styles/globals.css` | **Agregar al final** |

**No tocar el backend** — ya tiene todo: rutas de portfolio CRUD, uploads, auth middleware.

**Verificación**: después de ejecutar los 7 prompts, abrir `http://localhost:3000/admin/portfolio` con el backend en puerto 4000.
