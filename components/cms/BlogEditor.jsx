'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useCallback, useEffect, useRef, useState } from 'react';
import ResizableImage from './ResizableImage';
import ParagraphIdentity from './ParagraphIdentity';
import { authUpload } from '../../lib/authHelper';

const SLASH_ITEMS = [
  { label: 'Heading 1', desc: 'Large heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', desc: 'Medium heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', desc: 'Small heading', action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', desc: 'Unordered list', action: (editor) => editor.chain().focus().toggleBulletList().run() },
  { label: 'Ordered List', desc: 'Numbered list', action: (editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: 'Task List', desc: 'Checklist', action: (editor) => editor.chain().focus().toggleTaskList().run() },
  { label: 'Blockquote', desc: 'Quote block', action: (editor) => editor.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block', desc: 'Code snippet', action: (editor) => editor.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider', desc: 'Horizontal rule', action: (editor) => editor.chain().focus().setHorizontalRule().run() },
  { label: 'Image', desc: 'Upload image', action: 'image' },
  { label: 'YouTube', desc: 'Embed video', action: 'youtube' },
  { label: 'Table', desc: '3×3 table', action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
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

export default function BlogEditor({
  content,
  onChange,
  placeholder = 'Start writing or type / for commands…',
}) {
  const fileInputRef = useRef(null);
  const [slashMenu, setSlashMenu] = useState(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ParagraphIdentity,
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        dropcursor: { color: 'var(--accent)', width: 2 },
        link: false,
        underline: false,
      }),
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
    onUpdate({ editor: currentEditor }) {
      onChange?.(currentEditor.getHTML());
    },
  });

  const closeSlashMenu = useCallback(() => {
    setSlashMenu(null);
    setSlashFilter('');
    setSlashIndex(0);
  }, []);

  const executeSlashItem = useCallback((item) => {
    if (!editor || !slashMenu) return;

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

  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return undefined;

    const handleKeyDown = (event) => {
      if (slashMenu) {
        const filtered = SLASH_ITEMS.filter((item) => (
          item.label.toLowerCase().includes(slashFilter.toLowerCase())
          || item.desc.toLowerCase().includes(slashFilter.toLowerCase())
        ));

        if (event.key === 'ArrowDown' && filtered.length) {
          event.preventDefault();
          setSlashIndex((index) => (index + 1) % filtered.length);
          return;
        }
        if (event.key === 'ArrowUp' && filtered.length) {
          event.preventDefault();
          setSlashIndex((index) => (index - 1 + filtered.length) % filtered.length);
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

    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown);
    return () => editorElement.removeEventListener('keydown', handleKeyDown);
  }, [editor, slashMenu, slashFilter, slashIndex, closeSlashMenu, executeSlashItem]);

  useEffect(() => {
    if (!editor || !slashMenu) return undefined;

    const handleInput = () => {
      const { from } = editor.state.selection;
      const text = editor.state.doc.textBetween(slashMenu.from, from);
      if (text.startsWith('/')) {
        setSlashFilter(text.slice(1));
        setSlashIndex(0);
      } else {
        closeSlashMenu();
      }
    };

    editor.on('update', handleInput);
    return () => editor.off('update', handleInput);
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
    } catch (error) {
      console.error('Image upload failed:', error);
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
    ? SLASH_ITEMS.filter((item) => (
        item.label.toLowerCase().includes(slashFilter.toLowerCase())
        || item.desc.toLowerCase().includes(slashFilter.toLowerCase())
      ))
    : [];

  const chars = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="cms-editor-wrap">
      <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }} className="cms-bubble-menu">
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
        <button
          type="button"
          className={editor.isActive('link') ? 'active' : ''}
          onClick={handleLinkToggle}
        >
          🔗
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} className="cms-editor-content" />

      {slashMenu && filteredSlash.length > 0 && (
        <div className="cms-slash-menu">
          {filteredSlash.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={`cms-slash-item${index === slashIndex ? ' active' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                executeSlashItem(item);
              }}
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
