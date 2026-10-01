'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

const FALLBACK_IMAGE = '/recursos/placeholder_process_1.jpg';

export default function StackedCards({ steps, images }) {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const numberRef = useRef(null);
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const cardOrderRef = useRef([]);
  const activeStepRef = useRef(0);
  const stepsRef = useRef(steps);

  stepsRef.current = steps;
  cardsRef.current = [];

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current.filter(Boolean);
    const mobileItems = section
      ? gsap.utils.toArray('.stacked__mobile-item', section)
      : [];
    const stepCount = stepsRef.current.length;

    if (!section || !cards.length || !stepCount) return undefined;

    const textNodes = [numberRef.current, titleRef.current, bodyRef.current].filter(Boolean);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add('(min-width: 960px)', () => {
        const baseOrder = cards.map((_, index) => index);
        const slotStyles = cards.map((_, index) => ({
          x: index * 5,
          y: index * -4,
          rotation: (index % 2 === 0 ? -1 : 1) * gsap.utils.random(1.2, 4, 0.1)
        }));

        const setTextContent = (stepIndex) => {
          const step = stepsRef.current[stepIndex] || stepsRef.current[0];
          if (!step) return;

          if (numberRef.current) numberRef.current.textContent = step.num;
          if (titleRef.current) titleRef.current.textContent = step.title;
          if (bodyRef.current) bodyRef.current.textContent = step.body;
        };

        const updateText = (stepIndex) => {
          if (prefersReducedMotion || !textNodes.length) {
            setTextContent(stepIndex);
            return;
          }

          gsap.killTweensOf(textNodes);
          gsap.timeline()
            .to(textNodes, {
              autoAlpha: 0,
              y: -14,
              duration: 0.16,
              stagger: 0.025,
              ease: 'power1.in'
            })
            .add(() => setTextContent(stepIndex))
            .fromTo(
              textNodes,
              { autoAlpha: 0, y: 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.24,
                stagger: 0.035,
                ease: 'power2.out'
              }
            );
        };

        const orderForStep = (stepIndex) => {
          const offset = stepIndex % baseOrder.length;
          return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
        };

        const applyStack = (order, immediate = false, skippedCardIndex = null) => {
          order.forEach((cardIndex, stackPosition) => {
            const card = cards[cardIndex];
            if (!card || cardIndex === skippedCardIndex) return;

            const properties = {
              ...slotStyles[stackPosition],
              zIndex: cards.length - stackPosition,
              scale: 1,
              autoAlpha: 1
            };

            if (immediate || prefersReducedMotion) {
              gsap.set(card, properties);
            } else {
              gsap.to(card, {
                ...properties,
                duration: 0.34,
                ease: 'power2.inOut',
                overwrite: 'auto'
              });
            }
          });
        };

        const moveAroundStack = (cardIndex, nextOrder, direction) => {
          const card = cards[cardIndex];
          const targetPosition = nextOrder.indexOf(cardIndex);
          const target = slotStyles[targetPosition];
          const distance = Math.max(105, cards[0].offsetWidth * 0.42) * direction;
          const startX = Number(gsap.getProperty(card, 'x')) || 0;
          const startY = Number(gsap.getProperty(card, 'y')) || 0;

          applyStack(nextOrder, false, cardIndex);

          gsap.timeline()
            .to(card, {
              motionPath: {
                path: [
                  { x: startX, y: startY },
                  { x: distance * 0.72, y: -38 },
                  { x: distance, y: 8 }
                ],
                curviness: 1.35
              },
              rotation: direction * 11,
              scale: 0.98,
              duration: 0.28,
              ease: 'power2.in'
            })
            .set(card, { zIndex: cards.length - targetPosition })
            .to(card, {
              motionPath: {
                path: [
                  { x: distance, y: 8 },
                  { x: distance * 0.45, y: 34 },
                  { x: target.x, y: target.y }
                ],
                curviness: 1.25
              },
              rotation: target.rotation,
              scale: 1,
              autoAlpha: 1,
              duration: 0.3,
              ease: 'power2.out'
            });
        };

        const moveToStep = (nextStep) => {
          const previousStep = activeStepRef.current;
          if (nextStep === previousStep) return;

          gsap.killTweensOf(cards);

          const currentOrder = cardOrderRef.current;
          const nextOrder = orderForStep(nextStep);

          if (prefersReducedMotion) {
            applyStack(nextOrder, true);
          } else if (nextStep > previousStep) {
            moveAroundStack(currentOrder[0], nextOrder, 1);
          } else {
            moveAroundStack(nextOrder[0], nextOrder, -1);
          }

          cardOrderRef.current = nextOrder;
          activeStepRef.current = nextStep;
          updateText(nextStep);
        };

        cardOrderRef.current = orderForStep(0);
        activeStepRef.current = 0;
        applyStack(cardOrderRef.current, true);
        setTextContent(0);

        if (prefersReducedMotion) return undefined;

        const transitionCount = Math.max(stepCount - 1, 1);
        const edgeHold = 0.1;
        const transitionSpacing = transitionCount > 1
          ? (1 - edgeHold * 2) / (transitionCount - 1)
          : 0;

        const scrollTrigger = ScrollTrigger.create({
          trigger: section,
          start: 'top 64px',
          end: `+=${transitionCount * 90}%`,
          pin: true,
          pinType: 'fixed',
          pinReparent: true,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            let nextStep = 0;

            for (let stepIndex = 1; stepIndex < stepCount; stepIndex += 1) {
              const threshold = transitionCount === 1
                ? 0.5
                : edgeHold + (stepIndex - 1) * transitionSpacing;

              if (self.progress >= threshold) nextStep = stepIndex;
            }

            moveToStep(nextStep);
          }
        });

        return () => {
          scrollTrigger.kill();
          gsap.killTweensOf([...cards, ...textNodes]);
        };
      });

      media.add('(max-width: 959px)', () => {
        gsap.set(mobileItems, { clearProps: 'all' });

        if (prefersReducedMotion || !mobileItems.length) return undefined;

        const reveal = gsap.fromTo(
          mobileItems,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 78%',
              once: true
            }
          }
        );

        return () => {
          reveal.scrollTrigger?.kill();
          reveal.kill();
        };
      });

      return () => media.revert();
    }, section);

    return () => context.revert();
  }, [steps.length, images.length]);

  const initialStep = steps[0] || {};

  return (
    <section className="stacked" ref={sectionRef}>
      <div className="stacked__inner">
        <div className="stacked__cards">
          {images.map((image, index) => (
            <div
              className="stacked__card"
              data-card-index={index}
              key={image || index}
              ref={(element) => {
                cardsRef.current[index] = element;
              }}
            >
              <img
                src={image || FALLBACK_IMAGE}
                alt={`Process step ${index + 1}`}
              />
            </div>
          ))}
        </div>
        <div className="stacked__text">
          <span className="stacked__num" ref={numberRef}>{initialStep.num}</span>
          <h3 className="stacked__title" ref={titleRef}>{initialStep.title}</h3>
          <p className="stacked__body" ref={bodyRef}>{initialStep.body}</p>
        </div>
      </div>

      <div className="stacked__mobile-list">
        {steps.map((step, index) => (
          <article className="stacked__mobile-item" key={`${step.num}-${step.title}`}>
            <div className="stacked__mobile-card">
              <img
                src={images[index] || FALLBACK_IMAGE}
                alt={`Process step ${index + 1}`}
              />
            </div>
            <div className="stacked__mobile-text">
              <span className="stacked__num">{step.num}</span>
              <h3 className="stacked__title">{step.title}</h3>
              <p className="stacked__body">{step.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
