'use client';

import { useEffect, useRef } from 'react';

export default function FadeIn({ children, className = '', tag: Tag = 'div', threshold = 0.15, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`fade-up ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
