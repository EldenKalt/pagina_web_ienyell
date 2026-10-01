'use client';

import { useEffect, useState } from 'react';

const SCROLL_THRESHOLD = 400;

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    let frameId;

    const updateVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      frameId = window.requestAnimationFrame(updateVisibility);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`scroll-to-top${isVisible ? ' is-visible' : ''}`}
      aria-label="Scroll to top"
      onClick={scrollToTop}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}
