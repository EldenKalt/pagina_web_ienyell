'use client';

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const ITEMS = [
  {
    id: 'what-is',
    question: 'What do I consider NSFW?',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
  },
  {
    id: 'limits',
    question: "What I don't do",
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  {
    id: 'furry',
    question: 'Anthropomorphic / Furry content',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.',
  },
  {
    id: 'access',
    question: 'Request access to the NSFW portfolio',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
    cta: { label: 'Request access', href: '#nsfw-request' },
  },
  {
    id: 'divisions',
    question: 'Content divisions',
    answer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    tags: ['Erotic', 'Gore / Body horror', 'Controversial'],
  },
];

export default function NsfwBanner() {
  const ref = useRef(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, []);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section className="nsfw-banner" ref={ref}>
      <div className="nsfw-banner__inner">
        <div className="nsfw-banner__header">
          <span className="nsfw-banner__badge">18+</span>
          <div>
            <h3 className="nsfw-banner__title">NSFW Commissions</h3>
            <p className="nsfw-banner__subtitle">
              Mature content available under specific guidelines.
            </p>
          </div>
        </div>

        <div className="nsfw-banner__items">
          {ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                className={`nsfw-banner__item${isOpen ? ' nsfw-banner__item--open' : ''}`}
                key={item.id}
                data-nsfw-id={item.id}
              >
                <button
                  type="button"
                  className="nsfw-banner__question"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <svg
                    className="nsfw-banner__chevron"
                    width="16"
                    height="16"
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
                  className="nsfw-banner__answer"
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                  {item.tags && (
                    <div className="nsfw-banner__tags">
                      {item.tags.map((tag) => (
                        <span className="nsfw-banner__tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.cta && (
                    <a href={item.cta.href} className="nsfw-banner__cta">
                      {item.cta.label}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
