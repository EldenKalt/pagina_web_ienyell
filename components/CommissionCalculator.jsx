'use client';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  STYLES, FRAMINGS, FINISHES_BY_STYLE, ADDONS, BASE_PRICES, calculateEstimate,
} from '../data/commissionPricing';
import { useWizard } from '../context/WizardContext';
import { useCalculatorSettings } from '../context/CalculatorSettingsContext';
import { WIZARDS } from '../data/wizards';
import { getRuntimeWizard } from '../data/wizardFlows';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function CommissionCalculator() {
  const { openWizard } = useWizard();
  const { flowSettings } = useCalculatorSettings();
  const ref = useRef(null);
  const cardRef = useRef(null);
  const priceElRef = useRef(null);
  const priceValRef = useRef(null);

  const [style, setStyle] = useState('anime');
  const [finish, setFinish] = useState('flat');
  const [framing, setFraming] = useState('bust');
  const [addons, setAddons] = useState({});

  const finishes = FINISHES_BY_STYLE[style] || [];

  const handleStyleChange = (id) => {
    setStyle(id);
    const nextFinishes = FINISHES_BY_STYLE[id] || [];
    if (!nextFinishes.find(f => f.id === finish)) {
      setFinish(nextFinishes[0]?.id || '');
    }
  };

  const toggleAddon = (id, exclusive) => {
    setAddons((prev) => {
      const next = { ...prev };
      if (exclusive) {
        for (const a of ADDONS) {
          if (a.exclusive === exclusive && a.id !== id) delete next[a.id];
        }
      }
      if (next[id]) {
        delete next[id];
      } else {
        const addon = ADDONS.find(a => a.id === id);
        next[id] = addon?.per ? 1 : true;
      }
      return next;
    });
  };

  const setAddonQty = (id, qty) => {
    setAddons((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: qty };
    });
  };

  const estimate = useMemo(
    () => calculateEstimate({ style, finish, framing, addons }),
    [style, finish, framing, addons],
  );

  const finishRange = (finishId) => {
    const prices = Object.values(BASE_PRICES[style]?.[finishId] ?? {});
    if (!prices.length) return null;
    return `$${Math.min(...prices)}–$${Math.max(...prices)}`;
  };

  const framingPrice = (framingId) => BASE_PRICES[style]?.[finish]?.[framingId] ?? null;

  const activeAddonBreakdown = useMemo(() => {
    if (!estimate) return [];

    return ADDONS.flatMap((addon) => {
      const selected = addons[addon.id];
      if (!selected) return [];

      const quantity = addon.per ? Number(selected) || 0 : 1;
      if (quantity <= 0) return [];

      const amount = addon.on === 'total'
        ? estimate.subtotal * (addon.pct / 100)
        : Math.max(estimate.base * (addon.pct / 100), addon.min ?? 0) * quantity;

      return [{ ...addon, amount: Math.round(amount), quantity }];
    });
  }, [addons, estimate]);

  /* ── Reduced-motion tracking ── */
  const reducedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedRef.current = mq.matches; };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* ── Section entrance + floating result card ── */
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

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { y: -2 },
          { y: 2, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 },
        );
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  /* ── Animated counter + bounce when the estimate changes ── */
  const prevTotalRef = useRef(estimate?.total ?? null);
  const firstEstimateRef = useRef(true);

  useIsoLayoutEffect(() => {
    const nextTotal = estimate?.total ?? null;
    const prevTotal = prevTotalRef.current;
    prevTotalRef.current = nextTotal;

    if (firstEstimateRef.current) {
      firstEstimateRef.current = false;
      return;
    }
    if (reducedRef.current) return;
    if (typeof nextTotal !== 'number' || typeof prevTotal !== 'number' || nextTotal === prevTotal) {
      return;
    }

    const valEl = priceValRef.current;
    if (valEl) {
      const proxy = { v: prevTotal };
      valEl.textContent = String(prevTotal);
      gsap.killTweensOf(proxy);
      gsap.to(proxy, {
        v: nextTotal,
        duration: 0.4,
        ease: 'power1.out',
        snap: { v: 1 },
        onUpdate: () => { valEl.textContent = String(Math.round(proxy.v)); },
        onComplete: () => { valEl.textContent = String(nextTotal); },
      });
    }

    if (priceElRef.current) {
      gsap.fromTo(
        priceElRef.current,
        { scale: 1 },
        { scale: 1.1, duration: 0.15, ease: 'power2.out', yoyo: true, repeat: 1 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate]);

  /* ── Micro scale feedback on chip press ── */
  const pop = (el) => {
    if (!el || reducedRef.current) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { scale: 0.95 },
      {
        scale: 1,
        duration: 0.2,
        ease: 'back.out(2.5)',
        onStart: () => { el.style.transition = 'none'; },
        onComplete: () => {
          el.style.transition = '';
          gsap.set(el, { clearProps: 'scale' });
        },
      },
    );
  };

  const requestCommission = (event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('commission-prefill', {
      detail: { style, finish, framing, addons },
    }));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('commission-form')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const openQuickQuote = () => {
    const personalWiz = WIZARDS.personal;
    if (!personalWiz) return;
    const runtimeWizard = getRuntimeWizard(personalWiz, flowSettings?.personal);
    if (runtimeWizard?.isActive !== false) openWizard(runtimeWizard);
  };

  return (
    <section className="calc" ref={ref}>
      <div className="calc__inner">
        <div className="calc__header">
          <h2>Commission Calculator</h2>
          <p>Build your commission step by step. Choose your style, finish, and framing to see the estimated price.</p>
        </div>

        <div className="calc__grid">
          <div className="calc__controls">
            <fieldset className="calc__group">
              <legend>Style</legend>
              <div className="calc__styles">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`calc__style-card${style === s.id ? ' calc__style-card--active' : ''}`}
                    onClick={(e) => { handleStyleChange(s.id); pop(e.currentTarget); }}
                  >
                    <img src={s.thumbnail} alt="" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="calc__group">
              <legend>Finish</legend>
              <div className="calc__options">
                {finishes.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`calc__chip${finish === f.id ? ' calc__chip--active' : ''}`}
                    onClick={(e) => { setFinish(f.id); pop(e.currentTarget); }}
                  >
                    {f.label}
                    {finishRange(f.id) && <span className="calc__chip-price">({finishRange(f.id)})</span>}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="calc__group">
              <legend>Framing</legend>
              <div className="calc__options">
                {FRAMINGS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`calc__chip${framing === f.id ? ' calc__chip--active' : ''}`}
                    onClick={(e) => { setFraming(f.id); pop(e.currentTarget); }}
                  >
                    {f.label}
                    {framingPrice(f.id) !== null && <span className="calc__chip-price">(${framingPrice(f.id)})</span>}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="calc__group">
              <legend>Add-ons</legend>
              <div className="calc__addons">
                {ADDONS.map((a) => {
                  const active = !!addons[a.id];
                  return (
                    <div className="calc__addon-row" key={a.id}>
                      <button
                        type="button"
                        className={`calc__chip calc__chip--addon${active ? ' calc__chip--active' : ''}`}
                        onClick={(e) => { toggleAddon(a.id, a.exclusive); pop(e.currentTarget); }}
                      >
                        {a.label}
                        <span className="calc__chip-pct">+{a.pct}%</span>
                        <span className="calc__tooltip">{a.note ?? `${a.label} adds ${a.pct}% to your estimate`}</span>
                      </button>
                      {active && a.per && (
                        <div className="calc__qty">
                          <button
                            className="calc__qty-btn"
                            type="button"
                            aria-label="Less"
                            onClick={() => setAddonQty(a.id, (Number(addons[a.id]) || 1) - 1)}
                          >
                            &minus;
                          </button>
                          <span className="calc__qty-val">{addons[a.id]}</span>
                          <button
                            className="calc__qty-btn"
                            type="button"
                            aria-label="More"
                            onClick={() => setAddonQty(a.id, (Number(addons[a.id]) || 1) + 1)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="calc__result">
            <div className="calc__result-card" ref={cardRef}>
              <p className="calc__result-label">Estimate</p>
              <p className="calc__result-price" ref={priceElRef}>
                {estimate ? (
                  <>
                    $<span className="calc__result-amount" ref={priceValRef}>{estimate.total}</span>
                    <span className="calc__result-usd"> USD</span>
                  </>
                ) : (
                  '--'
                )}
              </p>
              {estimate && (
                <div className="calc__breakdown">
                  <div><span>Base price</span><strong>${estimate.base}</strong></div>
                  {activeAddonBreakdown.map((addon) => (
                    <div key={addon.id}><span>{addon.label}{addon.per && addon.quantity > 1 ? ` ×${addon.quantity}` : ''}</span><strong>+${addon.amount}</strong></div>
                  ))}
                  <div className="calc__breakdown-total"><span>Total</span><strong>${estimate.total}</strong></div>
                </div>
              )}
              <p className="calc__result-note">
                Prices are estimates. Final price may vary based on complexity. Contact me for an exact quote.
              </p>
              <a href="#commission-form" className="calc__result-cta" onClick={requestCommission}>
                Request This Commission
              </a>
              <button type="button" className="calc__result-wizard-cta" onClick={openQuickQuote}>
                Quick quote via wizard
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
