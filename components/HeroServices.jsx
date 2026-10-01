'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useServiceCatalog } from '../context/ServiceCatalogContext';
import { useWizard } from '../context/WizardContext';
import { useCalculatorSettings } from '../context/CalculatorSettingsContext';
import { workWithYouWizard } from '../data/wizards/workWithYou';
import { getRuntimeWizard } from '../data/wizardFlows';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HeroServices() {
  const rootRef = useRef(null);
  const { catalog } = useServiceCatalog();
  const { openWizard } = useWizard();
  const { flowSettings } = useCalculatorSettings();
  const activeFamilies = (catalog?.families || []).filter((f) => f.isActive !== false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const eyebrow = root.querySelector('.svc-eyebrow');
      const titleWords = gsap.utils.toArray('.svc-title__word', root);
      const subtitle = root.querySelector('.svc-subtitle');
      const line = root.querySelector('.svc-accent-line');
      const cards = gsap.utils.toArray('.svc-card', root);
      const bottom = root.querySelector('.svc-bottom');

      if (prefersReducedMotion) {
        gsap.set([eyebrow, ...titleWords, subtitle, line, ...cards, bottom].filter(Boolean), {
          autoAlpha: 1,
          clearProps: 'all',
        });
        return;
      }

      gsap.set(eyebrow, { x: -30, autoAlpha: 0 });
      gsap.set(titleWords, { yPercent: 110, autoAlpha: 0 });
      gsap.set(subtitle, { y: 20, autoAlpha: 0 });
      gsap.set(line, { scaleX: 0, transformOrigin: 'left center' });

      gsap.timeline()
        .to(eyebrow, {
          x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out',
        }, 0)
        .to(titleWords, {
          yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out',
        }, 0.12)
        .to(subtitle, {
          y: 0, autoAlpha: 1, duration: 0.55, ease: 'power2.out',
        }, 0.45)
        .to(line, {
          scaleX: 1, duration: 0.7, ease: 'expo.out',
        }, 0.55);

      cards.forEach((card, i) => {
        gsap.set(card, { y: 50, autoAlpha: 0, scale: 0.97 });

        gsap.to(card, {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
          delay: (i % 2) * 0.1,
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            once: true,
          },
        });
      });

      if (bottom) {
        gsap.set(bottom, { y: 30, autoAlpha: 0 });
        gsap.to(bottom, {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: bottom, start: 'top 90%', once: true },
        });
      }
    }, root);

    return () => ctx.revert();
  }, [activeFamilies.length]);

  const titleText = 'What can I do for you?';
  const titleWords = titleText.split(/\s+/);

  return (
    <section className="svc-landing" ref={rootRef}>
      <div className="svc-intro">
        <span className="svc-eyebrow">Services</span>
        <h1 className="svc-title" aria-label={titleText}>
          {titleWords.map((word, i) => (
            <span className="svc-title__clip" aria-hidden="true" key={i}>
              <span className="svc-title__word">{word}</span>
            </span>
          ))}
        </h1>
        <p className="svc-subtitle">
          Every project is different. Choose your path and I&rsquo;ll guide you through the process.
        </p>
        <div className="svc-accent-line" aria-hidden="true" />
      </div>

      <div className="svc-grid">
        {activeFamilies.map((family) => (
          <Link href={`/services/${family.id}`} className="svc-card" key={family.id}>
            <div className="svc-card__media">
              {family.image
                ? <img src={family.image} alt="" loading="lazy" />
                : <span className="svc-card__placeholder" aria-hidden="true" />}
            </div>
            <div className="svc-card__gradient" aria-hidden="true" />
            <div className="svc-card__body">
              <span className="svc-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: family.icon }} />
              </span>
              <h2 className="svc-card__title">{family.title}</h2>
              <p className="svc-card__desc">{family.description}</p>
              <span className="svc-card__cta">
                See services
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 10h12M12 5l5 5-5 5" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="svc-bottom">
        <p className="svc-bottom__lead">Not sure where to start?</p>
        <p className="svc-bottom__sub">
          Tell me about your project and I&rsquo;ll match you with the right service.
        </p>
        <button
          type="button"
          className="svc-bottom__btn"
          onClick={() => {
            const wizard = getRuntimeWizard(workWithYouWizard, flowSettings?.['work-with-you']);
            if (wizard) openWizard(wizard);
          }}
        >
          Let&rsquo;s work together
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10h12M12 5l5 5-5 5" />
          </svg>
        </button>
      </div>
    </section>
  );
}
