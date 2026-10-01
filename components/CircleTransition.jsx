'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CircleTransition({ heading, body, points = [] }) {
  const sectionRef = useRef(null);
  const curtainRef = useRef(null);
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const curtain = curtainRef.current;
    const content = contentRef.current;

    if (!section || !curtain || !content) return undefined;

    const headingElement = content.querySelector('h2');
    const bodyElement = content.querySelector('p');
    const pointElements = gsap.utils.toArray('.circle-tr__point', content);
    const contentElements = [headingElement, bodyElement, ...pointElements].filter(Boolean);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const context = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(curtain, {
          autoAlpha: 1,
          yPercent: 0,
          borderRadius: '0px 0px 0 0'
        });
        gsap.set(contentElements, { autoAlpha: 1, x: 0, y: 0 });
        return;
      }

      const media = gsap.matchMedia();

      media.add('(min-width: 768px)', () => {
        const curveR = Math.min(Math.max(window.innerWidth * 0.5, 200), 500);
        gsap.set(curtain, {
          autoAlpha: 1,
          yPercent: 85,
          borderRadius: `${curveR}px ${curveR}px 0 0`
        });
        gsap.set(headingElement, { autoAlpha: 0, y: 30 });
        gsap.set(bodyElement, { autoAlpha: 0, y: 20 });
        gsap.set(pointElements, { autoAlpha: 0, x: -20 });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 64px',
            end: '+=180%',
            pin: true,
            pinType: 'fixed',
            pinReparent: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });

        timeline
          .to(curtain, {
            yPercent: 0,
            borderRadius: '0px 0px 0 0',
            duration: 0.5,
            ease: 'none'
          }, 0)
          .to(headingElement, {
            autoAlpha: 1,
            y: 0,
            duration: 0.1,
            ease: 'none'
          }, 0.5)
          .to(bodyElement, {
            autoAlpha: 1,
            y: 0,
            duration: 0.1,
            ease: 'none'
          }, 0.6)
          .to(pointElements, {
            autoAlpha: 1,
            x: 0,
            duration: 0.067,
            stagger: 0.067,
            ease: 'none'
          }, 0.7)
          .to({}, { duration: 0.1 }, 0.9);

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
        };
      });

      media.add('(max-width: 767px)', () => {
        gsap.set(curtain, {
          autoAlpha: 1,
          yPercent: 0,
          '--circle-curve-depth': '0px'
        });
        gsap.set(headingElement, { autoAlpha: 0, y: 20 });
        gsap.set(bodyElement, { autoAlpha: 0, y: 14 });
        gsap.set(pointElements, { autoAlpha: 0, x: -14 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 20%',
            scrub: false,
            toggleActions: 'play none none none',
          }
        });

        tl.to(headingElement, {
          autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out'
        })
        .to(bodyElement, {
          autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out'
        }, '-=0.2')
        .to(pointElements, {
          autoAlpha: 1, x: 0,
          duration: 0.4, stagger: 0.12, ease: 'power2.out'
        }, '-=0.15');

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => media.revert();
    }, section);

    return () => context.revert();
  }, [points.length]);

  return (
    <section className="circle-tr" ref={sectionRef}>
      <div className="circle-tr__curtain" ref={curtainRef}>
        <div className="circle-tr__content" ref={contentRef}>
          <h2>{heading}</h2>
          <p>{body}</p>
          {points.length > 0 && (
            <ul className="circle-tr__points">
              {points.map((point, index) => (
                <li className="circle-tr__point" key={`${point}-${index}`}>
                  <span className="circle-tr__point-icon" aria-hidden="true">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
