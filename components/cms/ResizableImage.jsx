'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useCallback, useRef, useState } from 'react';

function ResizableImageView({ node, updateAttributes, selected }) {
  const containerRef = useRef(null);
  const liveWidthRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [liveWidth, setLiveWidth] = useState(null);

  const width = node.attrs.width || '100%';
  const align = node.attrs.align || 'center';

  const onPointerDown = useCallback((event) => {
    event.preventDefault();
    const container = containerRef.current?.closest('.tiptap');
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    setDragging(true);

    const onPointerMove = (moveEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newWidth = Math.max(
        10,
        Math.min(
          100,
          Math.round(((moveEvent.clientX - rect.left) / containerWidth) * 100),
        ),
      );
      const nextWidth = `${newWidth}%`;
      liveWidthRef.current = nextWidth;
      setLiveWidth(nextWidth);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      setDragging(false);
      if (liveWidthRef.current) {
        updateAttributes({ width: liveWidthRef.current });
        liveWidthRef.current = null;
        setLiveWidth(null);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [updateAttributes]);

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
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          draggable={false}
          style={{ width: '100%', display: 'block', borderRadius: '6px' }}
        />
        {selected && (
          <div className="cms-image-controls">
            <div className="cms-image-presets">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={width === preset ? 'active' : ''}
                  onClick={() => updateAttributes({ width: preset })}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="cms-image-align">
              {alignOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={align === option.value ? 'active' : ''}
                  onClick={() => updateAttributes({ align: option.value })}
                >
                  {option.label}
                </button>
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
