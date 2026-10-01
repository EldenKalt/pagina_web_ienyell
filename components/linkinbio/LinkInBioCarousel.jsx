'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

function SlidePlaceholder({ type }) {
  const icon = type === 'novel'
    ? <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>
    : type === 'project'
      ? <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="m21 15-5-5L5 21" /></>
      : <rect x="3" y="3" width="18" height="18" rx="2" />;

  return <div className="lib-slide-placeholder" aria-label="Image placeholder"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">{icon}</svg></div>;
}

function SlideImage({ src, alt, type }) {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => setHasError(!src), [src]);

  return hasError
    ? <SlidePlaceholder type={type} />
    : <Image src={src} alt={alt} width={340} height={200} className="lib-slide-img" onError={() => setHasError(true)} />;
}

function displayDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function LinkInBioCarousel({ slides }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const pauseTimerRef = useRef(null);

  useEffect(() => {
    if (currentIndex >= slides.length) setCurrentIndex(0);
  }, [currentIndex, slides.length]);

  useEffect(() => {
    if (isPaused || isDocumentHidden || slides.length <= 1) return undefined;
    const timer = setInterval(() => setCurrentIndex((previous) => (previous + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [isPaused, isDocumentHidden, slides.length, currentIndex]);

  useEffect(() => {
    const syncVisibility = () => setIsDocumentHidden(document.hidden);
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  useEffect(() => () => clearTimeout(pauseTimerRef.current), []);

  const pauseAutoPlay = useCallback(() => {
    setIsPaused(true);
    clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setIsPaused(false), 10000);
  }, []);

  const goTo = useCallback((index) => setCurrentIndex(index), []);
  const goNext = useCallback(() => setCurrentIndex((previous) => (previous + 1) % slides.length), [slides.length]);
  const goPrev = useCallback(() => setCurrentIndex((previous) => (previous - 1 + slides.length) % slides.length), [slides.length]);

  const renderSlide = (slide) => {
    if (slide.type === 'video') {
      return <div className="lib-slide lib-slide-video"><h3 className="lib-slide-label">{slide.label}</h3><div className="lib-slide-media"><iframe src={slide.videoUrl} title={slide.label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="lib-slide-iframe" /></div>{slide.videoTitle && <p className="lib-slide-title">{slide.videoTitle}</p>}{slide.videoDescription && <p className="lib-slide-detail">{slide.videoDescription}</p>}{slide.videoDuration && <p className="lib-slide-duration">Duration: {slide.videoDuration}</p>}{slide.videoDate && <p className="lib-slide-date">{displayDate(slide.videoDate)}</p>}<Link href={slide.cta.url} className="lib-slide-cta" target="_blank" rel="noopener noreferrer">{slide.cta.text}</Link></div>;
    }
    if (slide.type === 'project') {
      return <div className="lib-slide lib-slide-project"><h3 className="lib-slide-label">{slide.label}</h3><div className="lib-slide-media"><SlideImage src={slide.imageUrl} alt={slide.title} type="project" /></div><div className="lib-slide-title-row"><p className="lib-slide-title">{slide.title}</p>{slide.tags?.length > 0 && <div className="lib-slide-tags">{slide.tags.map(tag => <span key={tag} className="lib-slide-tag">{tag}</span>)}</div>}</div>{slide.description && <p className="lib-slide-detail">{slide.description}</p>}{slide.client && <p className="lib-slide-detail"><strong>Client:</strong> {slide.client}</p>}<p className="lib-slide-date">{displayDate(slide.date)}</p><Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link></div>;
    }
    if (slide.type === 'novel') {
      return <div className="lib-slide lib-slide-novel"><h3 className="lib-slide-label">{slide.label}</h3><div className="lib-slide-media"><SlideImage src={slide.coverUrl} alt={slide.bookName} type="novel" /></div><p className="lib-slide-title">{slide.bookName}</p><p className="lib-slide-detail">{slide.bookSinopsis}</p><p className="lib-slide-detail">{slide.bookGenre}</p><p className="lib-slide-detail">{slide.bookSaga}</p>{slide.bookWarning && <p className="lib-slide-detail lib-slide-warning">{slide.bookWarning}</p>}<p className="lib-slide-date">{displayDate(slide.nextDate)}</p><Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link></div>;
    }
    if (slide.type === 'product') {
      return <div className="lib-slide lib-slide-product"><h3 className="lib-slide-label">{slide.label}</h3><div className="lib-slide-media"><SlideImage src={slide.imageUrl} alt={slide.productName} type="product" /></div><p className="lib-slide-title">{slide.productName}</p>{slide.productDescription && <p className="lib-slide-detail">{slide.productDescription}</p>}<p className="lib-slide-price">{slide.productPrice}</p><Link href={slide.cta.url} className="lib-slide-cta">{slide.cta.text}</Link></div>;
    }
    return null;
  };

  if (!slides.length) return null;

  return (
    <div className="lib-carousel" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      {slides.length > 1 && <button type="button" className="lib-carousel-arrow lib-carousel-arrow-left" onClick={() => { goPrev(); pauseAutoPlay(); }} aria-label="Previous slide"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg></button>}
      <div className="lib-carousel-track-wrapper"><div className="lib-carousel-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>{slides.map((slide) => <div key={slide.id} className="lib-carousel-slide">{renderSlide(slide)}</div>)}</div></div>
      {slides.length > 1 && <button type="button" className="lib-carousel-arrow lib-carousel-arrow-right" onClick={() => { goNext(); pauseAutoPlay(); }} aria-label="Next slide"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg></button>}
      {slides.length > 1 && <div className="lib-carousel-dots">{slides.map((slide, index) => <button type="button" key={slide.id} className={`lib-carousel-dot${index === currentIndex ? ' active' : ''}`} onClick={() => { goTo(index); pauseAutoPlay(); }} aria-label={`Go to slide ${index + 1}`} aria-current={index === currentIndex} />)}</div>}
    </div>
  );
}
