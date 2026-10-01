'use client';

import Link from 'next/link';
import { useRef, useCallback, useEffect, useState, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, Flip);
}

const BOOKS = [
  { id: '1', title: 'Lorem Ipsum Vol. I', phase: 'Writing', progress: 60, cover: '/recursos/book_placeholder.png' },
  { id: '2', title: 'Dolor Sit Amet', phase: 'Illustration', progress: 40, cover: '/recursos/book_placeholder.png' },
  { id: '3', title: 'Consectetur Elit', phase: 'Layout', progress: 75, cover: '/recursos/book_placeholder.png' },
  { id: '4', title: 'Sed Do Eiusmod', phase: 'Writing', progress: 30, cover: '/recursos/book_placeholder.png' },
  { id: '5', title: 'Tempor Incididunt', phase: 'Concept', progress: 15, cover: '/recursos/book_placeholder.png' },
];

export default function AboutPage() {
  const rootRef = useRef(null);
  const [order, setOrder] = useState(() => BOOKS.map(b => ({ ...b, _inst: b.id + '-0' })));
  const [leaving, setLeaving] = useState(null);
  const flipStateRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const trackRef = useRef(null);
  const directionRef = useRef(1);
  const instanceRef = useRef(1);
  const leavingPosRef = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // ============ INTRO (autoplay, above the fold) ============
      gsap.set('.my-history .section-label', { opacity: 0, x: -60 });
      gsap.set('.my-history h2', { opacity: 0, x: -60 });
      gsap.set('.my-history .bio', { opacity: 0, x: -60 });
      gsap.set('.my-history .signature', { opacity: 0, x: -60 });
      gsap.set('.profile-picture img', { opacity: 0, x: 60, scale: 1.03 });

      const introTl = gsap.timeline();
      introTl
        .to('.my-history .section-label', { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, 0)
        .to('.my-history h2', { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' }, 0.1)
        .to('.my-history .bio', { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12 }, 0.25)
        .to('.my-history .signature', { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, '-=0.2')
        .to('.profile-picture img', { opacity: 1, x: 0, scale: 1, duration: 1.1, ease: 'expo.out' }, 0.08);

      // ============ IMPACT BAND (scroll-linked) ============
      gsap.to('.impact-band-track', {
        xPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.impact-band',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      // ============ ACHIEVES ============
      gsap.set('.achieves-section .section-header', { opacity: 0, y: 20 });
      gsap.set('.achieves-section .achieve-col li', { opacity: 0, y: 16 });

      ScrollTrigger.create({
        trigger: '.achieves-section',
        start: 'top 80%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline();
          tl.to('.achieves-section .section-header', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
            .to('.achieves-section .achieve-col:nth-child(1) li', {
              opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06,
            }, '-=0.3')
            .to('.achieves-section .achieve-col:nth-child(2) li', {
              opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06,
            }, '-=0.35');
        },
      });

      // ============ SKILLS ============
      gsap.set('.skills-section .skill-group', { opacity: 0, y: 24 });
      gsap.set('.skill-bar-fill', { scaleX: 0 });

      ScrollTrigger.create({
        trigger: '.skills-section',
        start: 'top 75%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline();
          tl.to('.skills-section .skill-group', {
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.12,
          });

          gsap.utils.toArray('.skills-section .skill-group').forEach((group, gi) => {
            const bars = group.querySelectorAll('.skill-bar-fill');
            bars.forEach((bar, bi) => {
              const target = parseFloat(bar.style.getPropertyValue('--bar-w')) || 1;
              tl.to(bar, {
                scaleX: target,
                duration: 0.9,
                ease: 'power3.out',
              }, gi * 0.12 + bi * 0.07 + 0.3);
            });
          });
        },
      });

      // ============ FROM THE SKETCHBOOK ============
      gsap.set('.sketchbook-section .section-header', { opacity: 0, y: 20 });
      gsap.set('.sketchbook-section .sketchbook-item', { opacity: 0, y: 30, scale: 0.96 });
      gsap.set('.sketchbook-section .sketchbook-cta > *', { opacity: 0, y: 16 });

      ScrollTrigger.create({
        trigger: '.sketchbook-section',
        start: 'top 78%',
        once: true,
        onEnter: () => {
          const tl = gsap.timeline();
          tl.to('.sketchbook-section .section-header', {
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          })
          .to('.sketchbook-section .sketchbook-item', {
            opacity: 1, y: 0, scale: 1,
            duration: 0.7, ease: 'power3.out', stagger: 0.09,
          }, '-=0.3')
          .to('.sketchbook-section .sketchbook-cta > *', {
            opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1,
          }, '-=0.2');
        },
      });

      // ============ PROJECTS ============
      gsap.set('.projects-section .section-header', { opacity: 0, y: 20 });
      gsap.set('.projects-section .project-item .project-number', { opacity: 0, y: 24 });
      gsap.set('.projects-section .project-item .project-info', { opacity: 0, y: 24 });
      gsap.set('.projects-section .project-item .project-status', { opacity: 0, y: 24 });

      ScrollTrigger.create({
        trigger: '.projects-section',
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to('.projects-section .section-header', {
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
          });

          gsap.utils.toArray('.projects-section .project-item').forEach((item, i) => {
            const num = item.querySelector('.project-number');
            const info = item.querySelector('.project-info');
            const status = item.querySelector('.project-status');
            const base = 0.25 + i * 0.1;

            gsap.to(num, {
              opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: base,
            });
            gsap.to([info, status], {
              opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: base + 0.08,
            });
          });
        },
      });

      // ============ PROJECTS: cursor-following image on hover ============
      gsap.set('.project-hover-img', { xPercent: -50, yPercent: -50 });
      gsap.utils.toArray('.project-item').forEach((el) => {
        const image = el.querySelector('.project-hover-img');
        if (!image) return;
        const setX = gsap.quickTo(image, 'x', { duration: 0.4, ease: 'power3' });
        const setY = gsap.quickTo(image, 'y', { duration: 0.4, ease: 'power3' });
        let isFirst;
        const align = (e) => {
          if (isFirst) {
            setX(e.clientX, e.clientX);
            setY(e.clientY, e.clientY);
            isFirst = false;
          } else {
            setX(e.clientX);
            setY(e.clientY);
          }
        };
        const startFollow = () => document.addEventListener('mousemove', align);
        const stopFollow = () => document.removeEventListener('mousemove', align);
        const fade = gsap.to(image, {
          autoAlpha: 1, ease: 'none', paused: true, duration: 0.15,
          onReverseComplete: stopFollow,
        });
        el.addEventListener('mouseenter', (e) => {
          isFirst = true;
          fade.play();
          startFollow();
          align(e);
        });
        el.addEventListener('mouseleave', () => fade.reverse());
      });

      // ============ CTA BANNER ============
      gsap.set('.cta-banner .cta-banner-text', { opacity: 0, y: 30 });
      gsap.set('.cta-banner .cta-btn', { opacity: 0, y: 30 });

      ScrollTrigger.create({
        trigger: '.cta-banner',
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to('.cta-banner .cta-banner-text', {
            opacity: 1, y: 0, duration: 0.7, ease: 'expo.out',
          });
          gsap.to('.cta-banner .cta-btn', {
            opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', delay: 0.15,
          });
        },
      });

      // ============ DOWNLOAD CARDS ============
      gsap.set('.download-section .dl-card', { opacity: 0, y: 16 });
      ScrollTrigger.create({
        trigger: '.download-section',
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to('.download-section .dl-card', {
            opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.12,
          });
        },
      });

      // ============ MEDIA-QUERY DEPENDENT ============
      const mm = gsap.matchMedia();

      // Desktop: parallax on profile + pinned manifesto
      mm.add('(min-width: 768px) and (pointer: fine)', () => {
        // Profile parallax (max 24px)
        gsap.to('.profile-picture img', {
          y: -24,
          ease: 'none',
          scrollTrigger: {
            trigger: '.intro-section',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        });

        // Manifesto pin & scrub
        gsap.set('.manifesto-kicker', { opacity: 0, y: 24 });
        gsap.set('.manifesto-headline', { opacity: 0, y: 24 });
        gsap.set('.manifesto-list li', { opacity: 0, y: 30, color: '#495057' });
        gsap.set('.manifesto-list li .manifesto-index', { color: '#495057' });

        const manifTl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: '.manifesto-wrapper',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        });

        // Entrance of kicker + headline (0 → 0.15 of timeline)
        manifTl
          .to('.manifesto-kicker', { opacity: 1, y: 0, duration: 0.15 }, 0)
          .to('.manifesto-headline', { opacity: 1, y: 0, duration: 0.15 }, 0);

        const items = gsap.utils.toArray('.manifesto-list li');
        const segStart = 0.15;
        const segLen = 0.28;

        items.forEach((item, i) => {
          const idx = item.querySelector('.manifesto-index');
          const start = segStart + i * segLen;

          // Reveal item + turn active
          manifTl
            .to(item, { opacity: 1, y: 0, duration: segLen * 0.5 }, start)
            .to(item, { color: '#212529', duration: segLen * 0.5 }, start)
            .to(idx, { color: '#fa5f07', duration: segLen * 0.5 }, start);

          // Deactivate previous
          if (i > 0) {
            const prev = items[i - 1];
            const prevIdx = prev.querySelector('.manifesto-index');
            manifTl
              .to(prev, { color: '#495057', duration: segLen * 0.5 }, start)
              .to(prevIdx, { color: '#495057', duration: segLen * 0.5 }, start);
          }
        });
      });

      // Mobile/tablet (no pointer:fine): static manifesto with simple fade per item
      mm.add('(max-width: 767.98px), (max-width: 1200px) and (not (pointer: fine))', () => {
        gsap.set('.manifesto-kicker', { opacity: 0, y: 20 });
        gsap.set('.manifesto-headline', { opacity: 0, y: 20 });
        gsap.set('.manifesto-list li', { opacity: 0, y: 20 });

        ScrollTrigger.create({
          trigger: '.manifesto-section',
          start: 'top 80%',
          once: true,
          onEnter: () => {
            const tl = gsap.timeline();
            tl.to('.manifesto-kicker', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
              .to('.manifesto-headline', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.35')
              .to('.manifesto-list li', {
                opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1,
              }, '-=0.3');
          },
        });
      });

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const isDesktopCarousel = () => window.innerWidth > 1200;

  const rotate = useCallback((forward) => {
    if (isAnimatingRef.current) return;
    const track = trackRef.current;
    if (!track) return;
    isAnimatingRef.current = true;
    directionRef.current = forward ? 1 : -1;

    if (isDesktopCarousel()) {
      flipStateRef.current = Flip.getState('.book-card');
      track.style.height = track.offsetHeight + 'px';
      track.classList.add('is-flipping');
      const cards = track.querySelectorAll('.book-card');
      const leavingIdx = forward ? 0 : cards.length - 1;
      const trackRect = track.getBoundingClientRect();
      const cardRect = cards[leavingIdx].getBoundingClientRect();
      leavingPosRef.current = {
        left: cardRect.left - trackRect.left,
        top: cardRect.top - trackRect.top,
        width: cardRect.width,
      };
    }

    const c = instanceRef.current++;
    setOrder(prev => {
      if (forward) {
        const [first, ...rest] = prev;
        if (isDesktopCarousel()) setLeaving(first);
        return [...rest, { ...first, _inst: first.id + '-' + c }];
      }
      const last = prev[prev.length - 1];
      if (isDesktopCarousel()) setLeaving(last);
      return [{ ...last, _inst: last.id + '-' + c }, ...prev.slice(0, -1)];
    });

    if (!isDesktopCarousel()) {
      setTimeout(() => { isAnimatingRef.current = false; }, 100);
    }
  }, []);

  useLayoutEffect(() => {
    if (!flipStateRef.current || !leaving) return;
    const state = flipStateRef.current;
    const track = trackRef.current;
    flipStateRef.current = null;
    const forward = directionRef.current === 1;
    const release = () => {
      isAnimatingRef.current = false;
      setLeaving(null);
      if (track) {
        track.style.height = '';
        track.classList.remove('is-flipping');
      }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { release(); return; }
    const leavingEl = track.querySelector('.book-card--leaving');
    Flip.from(state, {
      targets: '.book-card:not(.book-card--leaving)',
      duration: 0.6,
      ease: 'power3.inOut',
      onEnter: (els) => {
        gsap.fromTo(els,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.inOut',
            transformOrigin: forward ? 'bottom right' : 'bottom left' }
        );
      },
      onComplete: release,
    });
    if (leavingEl) {
      gsap.fromTo(leavingEl,
        { scale: 1, opacity: 1 },
        { scale: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut',
          transformOrigin: forward ? 'bottom left' : 'bottom right' }
      );
    }
  }, [order, leaving]);

  useEffect(() => {
    const section = trackRef.current?.closest('.books-spotlight');
    if (!section) return;
    function onKeyDown(e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); rotate(true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); rotate(false); }
    }
    section.addEventListener('keydown', onKeyDown);
    return () => section.removeEventListener('keydown', onKeyDown);
  }, [rotate]);

  return (
    <div className="page-layout" ref={rootRef}>
      <Link href="#portfolio" className="side-label side-label-left" aria-label="Portfolio">
        <span>PORTFOLIO</span>
      </Link>

      <main className="main-content">

        {/* Intro: My History + Profile Picture */}
        <section className="intro-section">
          <div className="my-history">
            <span className="section-label">About Me</span>
            <h2>Lorem ipsum dolor sit amet, consectetur adipiscing elit</h2>
            <p className="bio">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p className="bio">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            <p className="bio">Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
            <p className="signature">— Enyell</p>
          </div>
          <div className="profile-picture">
            <img
              src="/recursos/profile_picture.webp"
              alt="Enyell Moya"
            />
          </div>
        </section>

        {/* Impact Band */}
        <section className="impact-band" aria-hidden="true">
          <div className="impact-band-track">
            <span className="impact-band-text">ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i>ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i>ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i></span>
            <span className="impact-band-text" aria-hidden="true">ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i>ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i>ARTIST<i>—</i>DESIGNER<i>—</i>BUILDER<i>—</i>WRITER<i>—</i></span>
          </div>
        </section>

        {/* Manifesto */}
        <div className="manifesto-wrapper">
          <section className="manifesto-section">
            <p className="manifesto-kicker">HOW I WORK</p>
            <h2 className="manifesto-headline">I don&apos;t decorate. I build.</h2>
            <ul className="manifesto-list">
              <li><span className="manifesto-index">01</span> Creative direction with criteria</li>
              <li><span className="manifesto-index">02</span> Pixel-perfect execution</li>
              <li><span className="manifesto-index">03</span> Systems that scale</li>
            </ul>
          </section>
        </div>

        {/* Achieves */}
        <section className="achieves-section">
          <div className="section-header">
            <h2>Achieves</h2>
            <div className="line" />
          </div>
          <div className="achieves-grid">
            <div className="achieve-col">
              <h3>Personal Projects</h3>
              <ul className="achieve-list">
                <li>
                  <span className="achieve-year">2024</span>
                  <span className="achieve-title">Lorem Ipsum Project Alpha</span>
                  <span className="achieve-desc">Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</span>
                </li>
                <li>
                  <span className="achieve-year">2023</span>
                  <span className="achieve-title">Dolor Sit Amet Initiative</span>
                  <span className="achieve-desc">Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip.</span>
                </li>
                <li>
                  <span className="achieve-year">2022</span>
                  <span className="achieve-title">Sed Do Eiusmod Collection</span>
                  <span className="achieve-desc">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat.</span>
                </li>
                <li>
                  <span className="achieve-year">2021</span>
                  <span className="achieve-title">Tempor Incididunt Series</span>
                  <span className="achieve-desc">Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt.</span>
                </li>
              </ul>
            </div>
            <div className="achieve-col">
              <h3>Awards &amp; Competitions</h3>
              <ul className="achieve-list">
                <li>
                  <span className="achieve-year">2024</span>
                  <span className="achieve-title">Lorem Ipsum Award — First Place</span>
                  <span className="achieve-desc">Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.</span>
                </li>
                <li>
                  <span className="achieve-year">2023</span>
                  <span className="achieve-title">Consectetur International Contest</span>
                  <span className="achieve-desc">Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</span>
                </li>
                <li>
                  <span className="achieve-year">2023</span>
                  <span className="achieve-title">Adipiscing Elit Finalist</span>
                  <span className="achieve-desc">Neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur.</span>
                </li>
                <li>
                  <span className="achieve-year">2022</span>
                  <span className="achieve-title">Magna Aliqua Recognition</span>
                  <span className="achieve-desc">Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="skills-section">
          <div className="section-header">
            <h2>Skills</h2>
            <div className="line" />
          </div>
          <div className="skills-grid">
            <div className="skill-group">
              <h3>Software</h3>
              <div className="skill-list">
                {[
                  ['Adobe Photoshop', 95],
                  ['Adobe Illustrator', 90],
                  ['Procreate', 92],
                  ['Clip Studio Paint', 88],
                  ['Figma', 85],
                  ['Blender', 70],
                ].map(([name, level]) => (
                  <div className="skill-item" key={name}>
                    <div className="skill-header"><span className="skill-name">{name}</span><span className="skill-level">{level}%</span></div>
                    <div className="skill-bar"><div className="skill-bar-fill" style={{ '--bar-w': level / 100 }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="skill-group">
              <h3>Hard Skills</h3>
              <div className="skill-list">
                {[
                  ['Digital Illustration', 95],
                  ['Character Design', 92],
                  ['Portrait Art', 90],
                  ['Storyboarding', 85],
                  ['UI/UX Design', 80],
                  ['Typography', 78],
                ].map(([name, level]) => (
                  <div className="skill-item" key={name}>
                    <div className="skill-header"><span className="skill-name">{name}</span><span className="skill-level">{level}%</span></div>
                    <div className="skill-bar"><div className="skill-bar-fill" style={{ '--bar-w': level / 100 }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="skill-group">
              <h3>Soft Skills</h3>
              <div className="skill-list">
                {[
                  ['Creative Direction', 93],
                  ['Communication', 90],
                  ['Project Management', 85],
                  ['Client Relations', 88],
                  ['Problem Solving', 92],
                  ['Adaptability', 90],
                ].map(([name, level]) => (
                  <div className="skill-item" key={name}>
                    <div className="skill-header"><span className="skill-name">{name}</span><span className="skill-level">{level}%</span></div>
                    <div className="skill-bar"><div className="skill-bar-fill" style={{ '--bar-w': level / 100 }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* From the Sketchbook — curated illustration grid */}
        <section className="sketchbook-section">
          <div className="section-header">
            <h2>From the Sketchbook</h2>
            <div className="line" />
          </div>

          <div className="sketchbook-grid">
            {[
              { area: 'a', src: '/recursos/sketchbook/01.png', alt: 'Illustration one' },
              { area: 'b', src: '/recursos/sketchbook/02.png', alt: 'Illustration two' },
              { area: 'c', src: '/recursos/sketchbook/03.png', alt: 'Illustration three' },
              { area: 'd', src: '/recursos/sketchbook/04.png', alt: 'Illustration four' },
              { area: 'e', src: '/recursos/sketchbook/05.png', alt: 'Illustration five' },
            ].map((item) => (
              <figure
                key={item.area}
                className="sketchbook-item"
                style={{ gridArea: item.area }}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="sketchbook-img"
                />
              </figure>
            ))}
          </div>

          <div className="sketchbook-cta">
            <Link href="/services" className="cta-btn sketchbook-cta-btn">
              About my skills of drawing
            </Link>
            <Link href="#portfolio" className="sketchbook-link">
              See all illustration work
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                   strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/>
                   <polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </section>

        {/* Download Cards */}
        <section className="download-section">
          <a className="dl-card dl-card--primary" href="/files/enyell-cv.pdf" download>
            <span className="dl-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </span>
            <span className="dl-card-body">
              <span className="dl-card-title">Currículum</span>
              <span className="dl-card-meta">PDF · 1 page · Updated Sep 2026</span>
            </span>
            <span className="dl-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
            </span>
          </a>
          <a className="dl-card dl-card--secondary" href="/files/enyell-portfolio.pdf" download>
            <span className="dl-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </span>
            <span className="dl-card-body">
              <span className="dl-card-title">Portfolio</span>
              <span className="dl-card-meta">PDF · 12 pages · Selected cases</span>
            </span>
            <span className="dl-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
            </span>
          </a>
        </section>

        {/* Projects */}
        <section className="projects-section">
          <div className="section-header">
            <h2>Projects</h2>
            <div className="line" />
          </div>
          <div className="projects-list">
            {[
              { num: '01', title: 'Lorem Ipsum: Dolor Sit Amet', desc: 'Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', status: 'active', label: 'In progress' },
              { num: '02', title: 'Sed Ut Perspiciatis', desc: 'Unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.', status: 'active', label: 'In progress' },
              { num: '03', title: 'Nemo Enim Ipsam', desc: 'Voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni dolores.', status: 'completed', label: 'Completed' },
              { num: '04', title: 'Quis Autem Vel', desc: 'Eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.', status: 'active', label: 'In progress' },
            ].map((p) => (
              <div className="project-item" key={p.num}>
                <img className="project-hover-img" src="/recursos/hero_characters_figma.png" alt="" aria-hidden="true" />
                <span className="project-number">{p.num}</span>
                <div className="project-info">
                  <span className="project-title">{p.title}</span>
                  <span className="project-desc">{p.desc}</span>
                </div>
                <span className={`project-status ${p.status}`}>{p.label}</span>
              </div>
            ))}
          </div>

          {/* Book Spotlight */}
          <section className="books-spotlight">
            <div className="books-spotlight-header">
              <h3>Books in progress</h3>
              <div className="carousel-controls">
                <button type="button" className="carousel-btn" aria-label="Previous book" onClick={() => rotate(false)}>
                  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button type="button" className="carousel-btn" aria-label="Next book" onClick={() => rotate(true)}>
                  <svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg>
                </button>
              </div>
            </div>
            <div className="books-track" ref={trackRef} style={{ position: 'relative' }}>
              {order.map((book) => (
                <article className="book-card" data-flip-id={book._inst} key={book._inst} tabIndex={0}>
                  <div className="book-cover">
                    <img src={book.cover} alt={book.title} />
                    <span className={`book-badge${book.phase === 'Editing' || book.progress >= 80 ? ' book-badge--done' : ''}`}>
                      {book.phase}
                    </span>
                  </div>
                  <span className="book-title">{book.title}</span>
                  <div className="book-progress" style={{ '--p': book.progress / 100 }}>
                    <div className="book-progress-fill" />
                  </div>
                </article>
              ))}
              {leaving && (
                <article
                  className="book-card book-card--leaving"
                  key={'leaving-' + leaving._inst}
                  style={{
                    position: 'absolute',
                    left: leavingPosRef.current?.left,
                    top: leavingPosRef.current?.top,
                    width: leavingPosRef.current?.width,
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <div className="book-cover">
                    <img src={leaving.cover} alt={leaving.title} />
                    <span className={`book-badge${leaving.phase === 'Editing' || leaving.progress >= 80 ? ' book-badge--done' : ''}`}>
                      {leaving.phase}
                    </span>
                  </div>
                  <span className="book-title">{leaving.title}</span>
                  <div className="book-progress" style={{ '--p': leaving.progress / 100 }}>
                    <div className="book-progress-fill" />
                  </div>
                </article>
              )}
            </div>
          </section>
        </section>

        {/* CTA Banner */}
        <section className="cta-banner">
          <div className="cta-banner-text">
            <h2>Lorem ipsum dolor sit amet?</h2>
            <p>Consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.</p>
          </div>
          <Link href="/services" className="cta-btn">Work With Me</Link>
        </section>

      </main>

      <Link href="/services" className="side-label" aria-label="Work with me">
        <span>WORK WITH ME</span>
      </Link>
    </div>
  );
}
