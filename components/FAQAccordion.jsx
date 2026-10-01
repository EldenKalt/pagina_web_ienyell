'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DESKTOP_QUERY = '(min-width: 768px)';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function FAQAccordion({ items }) {
  const ref = useRef(null);
  const panelRef = useRef(null); // desktop: the single swapping answer panel
  const answerRefs = useRef([]); // mobile: one collapsible answer per item
  const iconRefs = useRef([]); // mobile: one chevron per item
  const tabRefs = useRef([]); // desktop: one tab button per item

  const [active, setActive] = useState(0); // desktop selected question
  const [open, setOpen] = useState(0); // mobile expanded question (-1 = none)
  const [isDesktop, setIsDesktop] = useState(false);
  const [reduced, setReduced] = useState(false);

  const prevOpen = useRef(open);
  const swapIn = useRef(false);

  // Track breakpoint + reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopMq = window.matchMedia(DESKTOP_QUERY);
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncDesktop = () => setIsDesktop(desktopMq.matches);
    const syncMotion = () => setReduced(motionMq.matches);

    syncDesktop();
    syncMotion();
    desktopMq.addEventListener('change', syncDesktop);
    motionMq.addEventListener('change', syncMotion);
    return () => {
      desktopMq.removeEventListener('change', syncDesktop);
      motionMq.removeEventListener('change', syncMotion);
    };
  }, []);

  // Section entrance
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

  /* ── Mobile accordion: animate the collapsible answer on open change ── */
  useIsoLayoutEffect(() => {
    const from = prevOpen.current;
    const to = open;
    prevOpen.current = open;

    if (isDesktop || reduced || from === to) return;

    if (from !== -1) collapseAnswer(from);
    if (to !== -1) expandAnswer(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDesktop, reduced]);

  const expandAnswer = (i) => {
    const el = answerRefs.current[i];
    if (el) {
      const full = el.scrollHeight; // `.faq__item--open` class already applied by React
      gsap.killTweensOf(el);
      gsap.fromTo(
        el,
        { height: 0, opacity: 0 },
        {
          height: full,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => gsap.set(el, { clearProps: 'height,opacity' }),
        }
      );
    }
    const icon = iconRefs.current[i];
    if (icon) {
      gsap.set(icon, { transition: 'none' });
      gsap.to(icon, { rotate: 180, duration: 0.4, ease: 'power2.out' });
    }
  };

  const collapseAnswer = (i) => {
    const el = answerRefs.current[i];
    if (el) {
      const full = el.scrollHeight;
      gsap.killTweensOf(el);
      gsap.fromTo(
        el,
        { height: full, opacity: 1 },
        {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => gsap.set(el, { clearProps: 'height,opacity' }),
        }
      );
    }
    const icon = iconRefs.current[i];
    if (icon) {
      gsap.set(icon, { transition: 'none' });
      gsap.to(icon, { rotate: 0, duration: 0.3, ease: 'power2.out' });
    }
  };

  const toggle = (i) => setOpen((cur) => (cur === i ? -1 : i));

  /* ── Desktop tabs: swap the answer panel on active change ── */
  const selectTab = (i) => {
    if (i === active) return;
    if (reduced || !panelRef.current) {
      setActive(i);
      return;
    }
    gsap.killTweensOf(panelRef.current);
    gsap.to(panelRef.current, {
      opacity: 0,
      y: -10,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        swapIn.current = true;
        setActive(i);
      },
    });
  };

  useIsoLayoutEffect(() => {
    if (!swapIn.current || !panelRef.current) return;
    swapIn.current = false;
    gsap.fromTo(
      panelRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
    );
  }, [active]);

  const onTabKeyDown = (e) => {
    const count = items.length;
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (active + 1) % count;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (active - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    if (next === null) return;
    e.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="faq" ref={ref}>
      <h2 className="faq__heading">Frequently Asked Questions</h2>

      {isDesktop ? (
        <div className="faq__grid">
          <div
            className="faq__tabs"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Frequently asked questions"
          >
            {items.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`faq-tab-${i}`}
                  className={`faq__tab${selected ? ' faq__tab--active' : ''}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls="faq-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(i)}
                  onKeyDown={onTabKeyDown}
                >
                  {item.q}
                </button>
              );
            })}
          </div>

          <div
            className="faq__panel"
            id="faq-panel"
            role="tabpanel"
            aria-labelledby={`faq-tab-${active}`}
            ref={panelRef}
          >
            <h3 className="faq__panel-q">{items[active]?.q}</h3>
            <p className="faq__panel-a">{items[active]?.a}</p>
          </div>
        </div>
      ) : (
        <div className="faq__list">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq__item${isOpen ? ' faq__item--open' : ''}`} key={i}>
                <button
                  className="faq__question"
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(i)}
                >
                  <span>{item.q}</span>
                  <svg
                    className="faq__icon"
                    ref={(el) => {
                      iconRefs.current[i] = el;
                    }}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div
                  className="faq__answer"
                  ref={(el) => {
                    answerRefs.current[i] = el;
                  }}
                  aria-hidden={!isOpen}
                >
                  <div className="faq__answer-inner">
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
