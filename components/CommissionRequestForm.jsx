'use client';

import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STYLES, FRAMINGS, FINISHES_BY_STYLE, calculateEstimate } from '../data/commissionPricing';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const STEP_LABELS = ['Type', 'Details', 'Contact', 'Review'];

function buildInitialForm({ initialStyle, initialFinish, initialFraming, initialAddons } = {}) {
  return { style: initialStyle ?? 'anime', finish: initialFinish ?? 'flat', framing: initialFraming ?? 'bust', addons: initialAddons ?? {}, description: '', references: '', deadline: '', budget: '', email: '', name: '' };
}

export default function CommissionRequestForm({ initialStyle, initialFinish, initialFraming, initialAddons }) {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const indicatorRefs = useRef([]);
  const initialValues = { initialStyle, initialFinish, initialFraming, initialAddons };
  const [step, setStep] = useState(0);
  const [displayStep, setDisplayStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(() => buildInitialForm(initialValues));
  const dirRef = useRef(1);
  const reducedRef = useRef(false);
  const skipPanelIn = useRef(true);
  const skipPulse = useRef(true);

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const finishes = FINISHES_BY_STYLE[form.style] || [];
  const estimate = useMemo(() => calculateEstimate({ style: form.style, finish: form.finish, framing: form.framing, addons: form.addons }), [form.style, form.finish, form.framing, form.addons]);
  const canAdvance = () => (step === 0 ? form.style && form.finish && form.framing : step === 1 ? form.description.trim().length > 10 : step === 2 ? form.email.includes('@') && form.name.trim() : true);

  const goToStep = (target) => {
    if (transitioning || target === step || target < 0 || target > 3) return;
    dirRef.current = target > step ? 1 : -1;
    setStep(target);
  };

  const handleStyleChange = (style) => {
    const nextFinishes = FINISHES_BY_STYLE[style] || [];
    setForm((previous) => ({ ...previous, style, finish: nextFinishes.some((item) => item.id === previous.finish) ? previous.finish : nextFinishes[0]?.id || '' }));
  };

  useEffect(() => {
    const handler = (event) => {
      const { style, finish, framing, addons } = event.detail;
      setForm((previous) => ({ ...previous, style, finish, framing, addons }));
      setSubmitted(false);
      setSubmitError(null);
    };
    window.addEventListener('commission-prefill', handler);
    return () => window.removeEventListener('commission-prefill', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedRef.current = mediaQuery.matches; };
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      gsap.set(ref.current, { opacity: 0, y: 30 });
      ScrollTrigger.create({ trigger: ref.current, start: 'top 80%', once: true, onEnter: () => gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }) });
    }, ref);
    return () => context.revert();
  }, []);

  useIsoLayoutEffect(() => {
    if (displayStep === step) return;
    const panel = panelRef.current;
    setTransitioning(true);
    if (reducedRef.current || !panel) {
      setDisplayStep(step);
      return;
    }
    gsap.killTweensOf(panel);
    gsap.to(panel, { opacity: 0, x: dirRef.current * -30, duration: 0.3, ease: 'power2.in', onComplete: () => setDisplayStep(step) });
  }, [step, displayStep]);

  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (skipPanelIn.current) {
      skipPanelIn.current = false;
      return;
    }
    if (reducedRef.current) {
      gsap.set(panel, { opacity: 1, x: 0 });
      setTransitioning(false);
      return;
    }
    gsap.killTweensOf(panel);
    gsap.fromTo(panel, { opacity: 0, x: dirRef.current * 30 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', onComplete: () => setTransitioning(false) });
  }, [displayStep]);

  useIsoLayoutEffect(() => {
    if (skipPulse.current) {
      skipPulse.current = false;
      return;
    }
    if (reducedRef.current || !indicatorRefs.current[step]) return;
    gsap.fromTo(indicatorRefs.current[step], { scale: 1 }, { scale: 1.1, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 });
  }, [step]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('http://localhost:3001/api/commissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, estimate: estimate?.total, submittedAt: new Date().toISOString() }) });
      if (!response.ok) throw new Error('Failed to submit');
      await response.json();
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again or contact me directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(buildInitialForm(initialValues));
    setStep(0);
    setDisplayStep(0);
    setSubmitted(false);
    setSubmitError(null);
    skipPanelIn.current = true;
    skipPulse.current = true;
  };

  const renderStep = (currentStep) => {
    if (currentStep === 0) return <>
      <label className="cform__label">Style</label><div className="cform__chips">{STYLES.map((item) => <button key={item.id} className={`calc__chip${form.style === item.id ? ' calc__chip--active' : ''}`} onClick={() => handleStyleChange(item.id)} type="button">{item.label}</button>)}</div>
      <label className="cform__label">Finish</label><div className="cform__chips">{finishes.map((item) => <button key={item.id} className={`calc__chip${form.finish === item.id ? ' calc__chip--active' : ''}`} onClick={() => set('finish', item.id)} type="button">{item.label}</button>)}</div>
      <label className="cform__label">Framing</label><div className="cform__chips">{FRAMINGS.map((item) => <button key={item.id} className={`calc__chip${form.framing === item.id ? ' calc__chip--active' : ''}`} onClick={() => set('framing', item.id)} type="button">{item.label}</button>)}</div>
    </>;
    if (currentStep === 1) return <>
      <label className="cform__label" htmlFor="cform-desc">Describe your character or project</label><textarea id="cform-desc" className="cform__textarea" rows={5} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Tell me about your idea, character, mood, and must-have details..." />
      <label className="cform__label" htmlFor="cform-refs">Visual references (URLs or descriptions)</label><textarea id="cform-refs" className="cform__textarea" rows={3} value={form.references} onChange={(event) => set('references', event.target.value)} placeholder="Share reference links, color palettes, or visual notes..." />
    </>;
    if (currentStep === 2) return <>
      <label className="cform__label" htmlFor="cform-name">Name</label><input id="cform-name" className="cform__input" type="text" value={form.name} onChange={(event) => set('name', event.target.value)} />
      <label className="cform__label" htmlFor="cform-email">Email</label><input id="cform-email" className="cform__input" type="email" value={form.email} onChange={(event) => set('email', event.target.value)} />
      <label className="cform__label" htmlFor="cform-deadline">Desired delivery date (optional)</label><input id="cform-deadline" className="cform__input" type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} />
      <label className="cform__label" htmlFor="cform-budget">Approximate budget USD (optional)</label><input id="cform-budget" className="cform__input" type="number" min="0" value={form.budget} onChange={(event) => set('budget', event.target.value)} />
    </>;
    return <>
      <div className="cform__estimate-card"><span>Estimated price</span><strong>{estimate ? `$${estimate.total} USD` : '—'}</strong><p>Final price confirmed after reviewing details</p></div>
      <h3>Request Summary</h3><dl className="cform__review"><dt>Style</dt><dd>{STYLES.find((item) => item.id === form.style)?.label}</dd><dt>Finish</dt><dd>{finishes.find((item) => item.id === form.finish)?.label}</dd><dt>Framing</dt><dd>{FRAMINGS.find((item) => item.id === form.framing)?.label}</dd><dt>Description</dt><dd>{form.description}</dd>{form.references && <><dt>References</dt><dd>{form.references}</dd></>}<dt>Name</dt><dd>{form.name}</dd><dt>Email</dt><dd>{form.email}</dd>{form.deadline && <><dt>Deadline</dt><dd>{form.deadline}</dd></>}{form.budget && <><dt>Budget</dt><dd>${form.budget} USD</dd></>}</dl>
    </>;
  };

  if (submitted) return <section className="cform" id="commission-form" ref={ref}><div className="cform__inner cform__confirmation"><span className="cform__confirmation-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span><h2>Request sent!</h2><p>I've received your commission request and will get back to you within 48 hours at {form.email}.</p><button type="button" className="cform__btn cform__btn--submit" onClick={resetForm}>Submit another</button></div></section>;

  return <section className="cform" id="commission-form" ref={ref}><div className="cform__inner"><h2 className="cform__heading">Request Commission</h2><div className="cform__progress">{STEP_LABELS.map((label, index) => <div key={label} ref={(element) => { indicatorRefs.current[index] = element; }} className={`cform__step-indicator${index <= step ? ' cform__step-indicator--active' : ''}`}><span className="cform__step-num">{index + 1}</span><span className="cform__step-label">{label}</span></div>)}</div><div className="cform__body"><div className={`cform__panel${displayStep === 3 ? ' cform__panel--review' : ''}`} ref={panelRef}>{renderStep(displayStep)}</div></div><div className="cform__actions">{step > 0 && <button className="cform__btn cform__btn--back" type="button" disabled={transitioning || submitting} onClick={() => goToStep(step - 1)}>Back</button>}{step < 3 ? <button className="cform__btn cform__btn--next" type="button" disabled={transitioning || !canAdvance()} onClick={() => goToStep(step + 1)}>Next</button> : <button className="cform__btn cform__btn--submit" type="button" disabled={transitioning || submitting} onClick={handleSubmit}>{submitting ? <><svg className="cform__spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeOpacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>Sending...</> : 'Submit Request'}</button>}</div>{submitError && <p className="cform__error" role="alert">{submitError}</p>}</div></section>;
}
