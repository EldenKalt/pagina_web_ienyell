'use client';

import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DESKTOP_QUERY = '(min-width: 960px)';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function TestimonialsCarousel({ items }) {
  const ref = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const cardRefs = useRef([]);

  const [current, setCurrent] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);

  const reducedRef = useRef(false);
  const layoutStateRef = useRef({ current: 0, isDesktop: false, mounted: false });
  const touchRef = useRef({ x: 0, active: false });

  const go = (dir) => {
    setCurrent((prev) => {
      const next = prev + dir;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  };

  /* ── Breakpoint + reduced-motion tracking ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopMq = window.matchMedia(DESKTOP_QUERY);
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncDesktop = () => setIsDesktop(desktopMq.matches);
    const syncMotion = () => {
      reducedRef.current = motionMq.matches;
    };

    syncDesktop();
    syncMotion();
    desktopMq.addEventListener('change', syncDesktop);
    motionMq.addEventListener('change', syncMotion);
    return () => {
      desktopMq.removeEventListener('change', syncDesktop);
      motionMq.removeEventListener('change', syncMotion);
    };
  }, []);

  /* ── Section entrance (generic fade) ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.set(ref.current, { opacity: 0, y: 30 });
      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
        },
      });
    }, ref);

    return () => ctx.revert();
  }, []);

  /* ── Position the track + style each card for the active index ── */
  const applyLayout = (animate) => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    const doAnim = animate && !reducedRef.current;
    const move = (target, vars) =>
      doAnim ? gsap.to(target, { duration: 0.5, ease: 'power2.out', ...vars }) : gsap.set(target, vars);

    if (isDesktop) {
      const centerCard = cardRefs.current[current];
      if (!centerCard) return;

      const x =
        viewport.clientWidth / 2 - (centerCard.offsetLeft + centerCard.offsetWidth / 2);
      move(track, { x, xPercent: 0 });

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const dist = Math.abs(i - current);
        move(el, {
          scale: dist === 0 ? 1.05 : 0.9,
          opacity: dist === 0 ? 1 : dist === 1 ? 0.7 : 0.35,
        });
      });
    } else {
      move(track, { xPercent: current * -100, x: 0 });
      cardRefs.current.forEach((el) => {
        if (el) gsap.set(el, { clearProps: 'scale,opacity' });
      });
    }
  };

  useIsoLayoutEffect(() => {
    const prev = layoutStateRef.current;
    const animate =
      prev.mounted && prev.isDesktop === isDesktop && prev.current !== current;
    layoutStateRef.current = { current, isDesktop, mounted: true };
    applyLayout(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isDesktop]);

  /* ── Re-center on resize (desktop offset is pixel-based) ── */
  useEffect(() => {
    if (typeof window === 'undefined' || !isDesktop) return;
    const onResize = () => applyLayout(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, current]);

  /* ── Touch swipe (mobile only) ── */
  const onTouchStart = (e) => {
    if (isDesktop) return;
    touchRef.current = { x: e.touches[0].clientX, active: true };
  };
  const onTouchEnd = (e) => {
    if (isDesktop || !touchRef.current.active) return;
    touchRef.current.active = false;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <section className="tcar" ref={ref}>
      <h2 className="tcar__heading">Client Testimonials</h2>
      <div
        className={`tcar__viewport${isDesktop ? ' tcar__viewport--triple' : ''}`}
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="tcar__track" ref={trackRef}>
          {items.map((t, i) => (
            <blockquote
              className="tcar__card"
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              aria-hidden={!isDesktop && i !== current}
            >
              <p className="tcar__quote">&ldquo;{t.text}&rdquo;</p>
              <footer className="tcar__footer">
                <cite className="tcar__name">{t.name}</cite>
                <span className="tcar__service">{t.service}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
      <div className="tcar__nav">
        <button
          className="tcar__arrow tcar__arrow--prev"
          type="button"
          aria-label="Previous"
          onClick={() => go(-1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="tcar__dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`tcar__dot${i === current ? ' tcar__dot--active' : ''}`}
              aria-label={`Testimonial ${i + 1}`}
              aria-current={i === current}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <button
          className="tcar__arrow tcar__arrow--next"
          type="button"
          aria-label="Next"
          onClick={() => go(1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
