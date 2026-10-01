'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function HeroHome() {
  const rootRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const heading = rootRef.current?.querySelector('.hero-text-overlay h1');
      if (!heading) return;

      const title = heading.textContent.trim();
      const words = title.split(/\s+/).map((word) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.style.display = 'inline-block';
        return span;
      });

      heading.replaceChildren(...words.flatMap((word, index) => (
        index === 0 ? [word] : [document.createTextNode(' '), word]
      )));

      const image = rootRef.current.querySelector('.hero-image-container img');
      const description = rootRef.current.querySelector('.hero-text-overlay p');
      const leftLabel = rootRef.current.querySelector('.side-label-left');
      const rightLabel = rootRef.current.querySelector('.side-label:not(.side-label-left)');

      gsap.set(image, { clipPath: 'inset(0 0 100% 0)', scale: 1.08 });
      gsap.set(words, { opacity: 0, y: 30 });
      gsap.set(description, { opacity: 0, y: 20 });
      gsap.set(leftLabel, { opacity: 0, x: -40 });
      gsap.set(rightLabel, { opacity: 0, x: 40 });

      gsap.timeline()
        .to(image, {
          clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.2, ease: 'expo.out',
        }, 0)
        .to(words, {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08,
        }, 0.4)
        .to(description, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
        }, 0.7)
        .to([leftLabel, rightLabel], {
          opacity: 1, x: 0, duration: 0.7, ease: 'expo.out', stagger: 0.1,
        }, 0.78);
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero-section" ref={rootRef}>
      <Link href="#portfolio" className="side-label side-label-left" aria-label="Portfolio">
        <span>PORTFOLIO</span>
      </Link>
      <div className="hero-image-container">
        <picture>
          <source media="(max-width: 768px)" srcSet="/recursos/hero_mb.png" />
          <img src="/recursos/hero_desktop.png" alt="Enyell illustration" />
        </picture>
        <div className="hero-text-overlay">
          <h1>Lorem Ipsum</h1>
          <p>Lorem ipsum dolor sit amet consectetur adipiscing elit Ut et massa mi. Aliquam in hendrerit urna.</p>
        </div>
      </div>
      <Link href="/services" className="side-label" aria-label="Work with me">
        <span>WORK WITH ME</span>
      </Link>
    </section>
  );
}
