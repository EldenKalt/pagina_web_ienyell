'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function BentoZoomHero({ title, subtitle, images, centerIndex = 2, ctaHref = '#service-offers' }) {
  const sectionRef = useRef(null);
  const overlayRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const cells = section ? gsap.utils.toArray('.hero-bento__cell', section) : [];
    const centerCell = cells[centerIndex];

    if (!section || !centerCell || !cells.length) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const peripheralCells = cells.filter((_, index) => index !== centerIndex);
    const titleWords = gsap.utils.toArray('.hero-bento__title-word', section);
    const contentItems = [...titleWords, subtitleRef.current, ctaRef.current].filter(Boolean);

    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      const scaleToFillViewport = () => {
        return Math.max(
          window.innerWidth / centerCell.offsetWidth,
          window.innerHeight / centerCell.offsetHeight
        ) * 1.03;
      };

      gsap.set(centerCell, { zIndex: 3, transformOrigin: 'center center' });

      if (prefersReducedMotion) {
        gsap.set(contentItems, { autoAlpha: 1, clearProps: 'clipPath,transform' });
        return () => media.revert();
      }

      gsap.set(titleWords, { autoAlpha: 0, yPercent: 110 });
      gsap.set(subtitleRef.current, { autoAlpha: 0, y: 20 });
      gsap.set(ctaRef.current, { autoAlpha: 0, scale: 0.9 });

      media.add('(min-width: 768px)', () => {
        gsap.set(cells, { autoAlpha: 1 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 0,
            end: '+=380%',
            pin: true,
            pinType: 'fixed',
            pinReparent: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });

        timeline
          // Small pause so the visitor can take in the complete gallery first.
          .to({}, { duration: 0.18 })
          .addLabel('zoom')
          .to(peripheralCells, {
            scale: (index) => 2.4 + index * 0.12,
            xPercent: (index, element) => (
              element.offsetLeft + element.offsetWidth / 2 < element.parentElement.offsetWidth / 2
                ? -90
                : 90
            ),
            yPercent: (index, element) => (
              element.offsetTop + element.offsetHeight / 2 < element.parentElement.offsetHeight / 2
                ? -75
                : 75
            ),
            autoAlpha: 0,
            duration: 1,
            ease: 'none'
          }, 'zoom')
          .to(centerCell, {
            scale: scaleToFillViewport,
            borderRadius: 0,
            duration: 1,
            ease: 'none'
          }, 'zoom')
          .addLabel('reveal')
          .to(overlayRef.current, {
            autoAlpha: 0.5,
            duration: 0.22,
            ease: 'none'
          }, 'reveal')
          .to(titleWords, {
            autoAlpha: 1,
            yPercent: 0,
            duration: 0.28,
            stagger: 0.045,
            ease: 'none'
          }, 'reveal+=0.08')
          .to(subtitleRef.current, {
            autoAlpha: 1,
            y: 0,
            duration: 0.2,
            ease: 'none'
          }, '>')
          .to(ctaRef.current, {
            autoAlpha: 1,
            scale: 1,
            duration: 0.18,
            ease: 'none'
          }, '>')
          // Hold the completed hero behind the incoming curved curtain.
          .to({}, { duration: 1.05 });

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
        };
      });

      media.add('(max-width: 767px)', () => {
        gsap.fromTo(
          cells,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }
        );
        gsap.set(contentItems, { autoAlpha: 1, y: 0, yPercent: 0, scale: 1 });
      });

      return () => media.revert();
    }, section);

    return () => context.revert();
  }, [centerIndex, images.length]);

  const words = title.trim().split(/\s+/);

  return (
    <section className="hero-bento" ref={sectionRef}>
      <div className="hero-bento__grid">
        {images.map((image, index) => (
          <div
            className={`hero-bento__cell hero-bento__cell--${image.ratio || 'square'} ${index === centerIndex ? 'hero-bento__cell--center' : ''}`}
            data-position={index === centerIndex ? 'center' : 'peripheral'}
            key={image.src}
          >
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>

      <div className="hero-bento__overlay" ref={overlayRef} />

      <div className="hero-bento__content">
        <h1 className="hero-bento__title" ref={titleRef} aria-label={title}>
          {words.map((word, index) => (
            <span className="hero-bento__title-clip" aria-hidden="true" key={`${word}-${index}`}>
              <span className="hero-bento__title-word">{word}</span>
            </span>
          ))}
        </h1>
        <p className="hero-bento__subtitle" ref={subtitleRef}>{subtitle}</p>
        <a className="hero-bento__cta" href={ctaHref} ref={ctaRef}>
          Request Commission
        </a>
      </div>
    </section>
  );
}
