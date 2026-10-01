'use client';

import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useWizard } from '../context/WizardContext';
import { useCalculatorSettings } from '../context/CalculatorSettingsContext';
import { WIZARDS } from '../data/wizards';
import { getRuntimeWizard } from '../data/wizardFlows';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function NsfwShowcase() {
  const { openWizard } = useWizard();
  const { flowSettings } = useCalculatorSettings();
  const sectionRef = useRef(null);
  const leftImgRef = useRef(null);
  const rightImgRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const ctx = gsap.context(() => {
      const leftImg = leftImgRef.current;
      const rightImg = rightImgRef.current;
      const leftCol = gsap.utils.toArray('.nsfw-show__col--left', section)[0];
      const rightCol = gsap.utils.toArray('.nsfw-show__col--right', section)[0];
      const heading = gsap.utils.toArray('.nsfw-show__col--center h3', section)[0];
      const divider = gsap.utils.toArray('.nsfw-show__divider', section)[0];
      const paragraphs = gsap.utils.toArray('.nsfw-show__col--center p', section);
      const buttons = gsap.utils.toArray('.nsfw-show__btn', section);
      const animatedElements = [
        leftCol,
        rightCol,
        leftImg,
        rightImg,
        heading,
        divider,
        ...paragraphs,
        ...buttons,
      ].filter(Boolean);
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(animatedElements, { clearProps: 'all' });
        gsap.set(animatedElements, { opacity: 1, visibility: 'visible' });
        return;
      }

      gsap.fromTo(
        leftImg,
        { yPercent: 8, xPercent: -2, scale: 1.08 },
        {
          yPercent: -16,
          xPercent: 2,
          scale: 1.08,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        rightImg,
        { yPercent: 6, xPercent: 1.5, scale: 1.06 },
        {
          yPercent: -14,
          xPercent: -1.5,
          scale: 1.06,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true,
        },
      });

      tl.fromTo(
        leftCol,
        { x: -80, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.75, ease: 'power4.out' },
        0,
      )
        .fromTo(
          rightCol,
          { x: 80, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.75, ease: 'power4.out' },
          0.08,
        )
        .fromTo(
          heading,
          { y: 24, autoAlpha: 0, clipPath: 'inset(0 0 100% 0)' },
          {
            y: 0,
            autoAlpha: 1,
            clipPath: 'inset(0 0 0% 0)',
            duration: 0.55,
            ease: 'power3.out',
          },
          0.2,
        )
        .fromTo(
          divider,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.42, ease: 'power3.out' },
          0.46,
        )
        .fromTo(
          paragraphs,
          { y: 16, autoAlpha: 0 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.42,
            stagger: 0.1,
            ease: 'power2.out',
          },
          0.62,
        )
        .fromTo(
          buttons,
          { y: 12, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.36,
            stagger: 0.08,
            ease: 'power2.out',
          },
          '>',
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="nsfw-show" ref={sectionRef}>
      <div className="nsfw-show__col nsfw-show__col--left">
        <img
          ref={leftImgRef}
          src="/recursos/furry_placeholder.png"
          alt="Anthropomorphic character illustration"
          loading="lazy"
        />
      </div>

      <div className="nsfw-show__col nsfw-show__col--center" ref={textRef}>
        <h3>Mature &amp; Specialized Content</h3>
        <div className="nsfw-show__divider" aria-hidden="true" />
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
        <div className="nsfw-show__actions">
          <button
            type="button"
            className="nsfw-show__btn nsfw-show__btn--portfolio"
            onClick={() => {
              const item = document.querySelector('[data-nsfw-id="access"]');
              if (!item) return;
              item.scrollIntoView({ behavior: 'smooth', block: 'center' });
              const btn = item.querySelector('.nsfw-banner__question');
              if (btn && !item.classList.contains('nsfw-banner__item--open')) {
                btn.click();
              }
              item.classList.add('nsfw-banner__item--highlight');
              setTimeout(() => item.classList.remove('nsfw-banner__item--highlight'), 2000);
            }}
          >
            See the NSFW portfolio
          </button>
          <button
            type="button"
            className="nsfw-show__btn nsfw-show__btn--commission"
            onClick={() => {
              const wizard = getRuntimeWizard(WIZARDS.nsfw, flowSettings?.nsfw);
              if (wizard?.isActive !== false) openWizard(wizard);
            }}
          >
            Ask for a commission
          </button>
        </div>
      </div>

      <div className="nsfw-show__col nsfw-show__col--right">
        <img
          ref={rightImgRef}
          src="/recursos/horror_placeholder.png"
          alt="Dark fantasy illustration"
          loading="lazy"
        />
      </div>
    </section>
  );
}
