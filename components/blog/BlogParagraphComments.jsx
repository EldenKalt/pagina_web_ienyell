'use client';

import { useCallback, useEffect, useState } from 'react';
import BlogIcon from './BlogIcon';

export default function BlogParagraphComments({ contentRef, locations = [], onOpen }) {
  const [placed, setPlaced] = useState([]);
  const measure = useCallback(() => {
    const root = contentRef.current;
    if (!root) return;
    const shellTop = root.parentElement.getBoundingClientRect().top;
    const counts = new Map(locations.map((item) => [item.paragraphId, item.count]));
    setPlaced([...root.querySelectorAll('p[data-paragraph-id]')].map((paragraph) => ({
      id: paragraph.getAttribute('data-paragraph-id'),
      count: counts.get(paragraph.getAttribute('data-paragraph-id')) || 0,
      top: Math.round(paragraph.getBoundingClientRect().top - shellTop),
    })).filter((item) => item.count > 0));
  }, [contentRef, locations]);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [contentRef, measure]);
  if (!placed.length) return null;
  return <div className="blog-paragraph-comments" aria-label="Conversations by paragraph">
    {placed.map(({ id, count, top }) => <button key={id} type="button" style={{ top }}
      className="blog-paragraph-comment-button" onClick={() => onOpen(id)}
      aria-label={`Read ${count} comments on this paragraph`} aria-haspopup="dialog">
      <BlogIcon name="chat" size={15} /><span>{count}</span>
    </button>)}
  </div>;
}
