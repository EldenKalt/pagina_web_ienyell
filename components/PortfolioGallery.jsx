'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function PortfolioGallery({ images, ctaHref, ctaLabel = 'See the complete portfolio' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = gsap.matchMedia();
    const ctx = gsap.context(() => {
      media.add(
        {
          desktop: '(min-width: 768px)',
          mobile: '(max-width: 767px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          const section = ref.current;
          const heading = section.querySelector('.pgal__heading');
          const items = gsap.utils.toArray('.pgal__item', section);

          if (conditions.reduceMotion) {
            gsap.set([heading, ...items], {
              clearProps: 'all',
              opacity: 1,
            });
            return;
          }

          if (conditions.desktop) {
            gsap.to(section, {
              backgroundColor: '#ffffff',
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'top 15%',
                scrub: true,
                invalidateOnRefresh: true,
              },
            });

            gsap.fromTo(
              heading,
              { opacity: 0, x: -70 },
              {
                opacity: 1,
                x: 0,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: heading,
                  start: 'top 88%',
                  once: true,
                },
              },
            );

            items.forEach((item) => {
              gsap.fromTo(
                item,
                { opacity: 0, y: 30, scale: 0.95 },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.75,
                  ease: 'power3.out',
                  clearProps: 'transform',
                  scrollTrigger: {
                    trigger: item,
                    start: 'top 90%',
                    once: true,
                  },
                },
              );
            });

            return;
          }

          gsap.fromTo(
            heading,
            { opacity: 0, x: -35 },
            {
              opacity: 1,
              x: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: heading,
                start: 'top 92%',
                once: true,
              },
            },
          );

          gsap.fromTo(
            items,
            { opacity: 0, y: 24, scale: 0.97 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.55,
              ease: 'power2.out',
              stagger: 0.08,
              clearProps: 'transform',
              scrollTrigger: {
                trigger: section.querySelector('.pgal__grid'),
                start: 'top 92%',
                once: true,
              },
            },
          );
        },
      );
    }, ref);

    return () => {
      media.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section className="pgal" ref={ref}>
      <div className="pgal__inner">
        <h2 className="pgal__heading">Gallery</h2>
        <div className="pgal__grid">
          {images.map((img, i) => (
            <div className={`pgal__item pgal__item--${img.ratio || 'square'}`} key={i}>
              <img src={img.src} alt={img.alt} loading="lazy" />
            </div>
          ))}
        </div>
        {ctaHref && (
          <div className="pgal__cta">
            <a href={ctaHref} className="pgal__cta-link">
              {ctaLabel}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
