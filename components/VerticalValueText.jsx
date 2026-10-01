'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function VerticalValueText({ lines }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const section = ref.current;
    if (!section) return undefined;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('.vvt__line', section);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion || !items.length) {
        gsap.set(items, { clearProps: 'all' });
        return;
      }

      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const expandedHeights = items.map((item) => item.scrollHeight);
        const expandedMargins = items.map((item) => parseFloat(getComputedStyle(item).marginBottom));

        gsap.set(items, {
          autoAlpha: 0,
          height: 0,
          marginBottom: 0,
          overflow: 'hidden',
          y: 60,
          clipPath: 'inset(100% 0 0 0)'
        });

        const revealDuration = 0.8 / items.length;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 64px',
            end: '+=220%',
            pin: true,
            pinType: 'fixed',
            pinReparent: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });

        items.forEach((item, index) => {
          const segmentStart = index * revealDuration;

          if (index > 0) {
            timeline.to(items[index - 1], {
              y: -20,
              opacity: 0.4,
              duration: revealDuration,
              ease: 'none'
            }, segmentStart);
          }

          timeline.to(item, {
            autoAlpha: 1,
            height: () => expandedHeights[index],
            marginBottom: expandedMargins[index],
            y: 0,
            clipPath: 'inset(0% 0 0 0)',
            duration: revealDuration,
            ease: 'none'
          }, segmentStart);
        });

        timeline.to({}, { duration: 0.2 }, 0.8);

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
        };
      });

      mm.add('(max-width: 767px)', () => {
        gsap.set(items, { autoAlpha: 0, y: 24 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            toggleActions: 'play none none none',
          }
        });

        tl.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.15,
          ease: 'power2.out',
        });

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    }, ref);

    return () => ctx.revert();
  }, [lines.length]);

  return (
    <section className="vvt" ref={ref}>
      <div className="vvt__inner">
        {lines.map((line, i) => (
          <p className="vvt__line" key={i}>{line}</p>
        ))}
      </div>
    </section>
  );
}
