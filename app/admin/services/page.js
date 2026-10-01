'use client';

import { useEffect, useState } from 'react';

import { createDefaultServiceCatalog } from '../../../data/serviceCatalog';
import { WIZARDS } from '../../../data/wizards';
import { authFetch } from '../../../lib/authHelper';

const WIZARD_OPTIONS = Object.entries(WIZARDS).map(([id, wizard]) => ({ id, title: wizard.title }));

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeId(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function entryOptions(wizardId) {
  const wizard = WIZARDS[wizardId];
  const step = wizard?.steps?.find((candidate) => candidate.type === 'single-select' && Array.isArray(candidate.options));
  if (!step) return [];
  return step.options.map((option) => ({ value: `${step.id}|${option.id}`, label: option.label }));
}

function entryValue(entry) {
  return entry?.stepId && entry?.optionId ? `${entry.stepId}|${entry.optionId}` : '';
}

function parseEntry(value) {
  const [stepId, optionId] = String(value || '').split('|');
  return stepId && optionId ? { stepId, optionId } : undefined;
}

function draftFamily() {
  const suffix = Date.now().toString(36);
  return {
    id: `service-${suffix}`,
    title: 'New service family',
    description: '',
    image: '',
    ctaTitle: 'So, what are you looking for?',
    ctaDescription: '',
    isActive: false,
    offers: [],
  };
}

function draftOffer() {
  const suffix = Date.now().toString(36);
  return { id: `offer-${suffix}`, label: 'New service option', description: '', wizardId: 'authors', isActive: true };
}

function Switch({ checked, onChange, label }) {
  return (
    <label className="ienyell-calculator-switch">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export default function ServiceCatalogAdminPage() {
  const [catalog, setCatalog] = useState(() => createDefaultServiceCatalog());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const payload = await authFetch('/api/service-catalog/admin');
        if (!cancelled && Array.isArray(payload?.catalog?.families)) setCatalog(payload.catalog);
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'The service catalog could not be loaded. Reviewed defaults are shown below.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function changeFamily(index, updater) {
    setMessage('');
    setCatalog((current) => {
      const next = copy(current);
      updater(next.families[index]);
      return next;
    });
  }

  function changeOffer(familyIndex, offerIndex, updater) {
    changeFamily(familyIndex, (family) => updater(family.offers[offerIndex]));
  }

  function moveFamily(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= catalog.families.length) return;
    setCatalog((current) => {
      const next = copy(current);
      [next.families[index], next.families[target]] = [next.families[target], next.families[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = await authFetch('/api/service-catalog', { method: 'PUT', body: JSON.stringify({ catalog }) });
      setCatalog(payload.catalog);
      setMessage('Service catalog saved. Public pages and Link-in-Bio now use this version.');
    } catch (requestError) {
      setError(requestError?.data?.error || 'The service catalog could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ienyell-admin-page ienyell-service-catalog-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Public service catalog</p>
          <h1>Decide what visitors can ask for.</h1>
          <p>Families appear on the desktop services page and Link-in-Bio. Each option may open only one reviewed flow and may preselect one of that flow’s existing routes.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" disabled={loading || saving} onClick={save}>{saving ? 'Saving…' : 'Save catalog'}</button>
      </header>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      {message ? <p className="ienyell-admin-notice" role="status">{message}</p> : null}

      <div className="ienyell-flow-guide">The catalog never edits formulas. Pricing and available variables remain controlled by <strong>Calculators</strong>; questions and safe routing remain controlled by <strong>Flows</strong>.</div>

      <div className="ienyell-service-family-list">
        {catalog.families.map((family, familyIndex) => (
          <article className="ienyell-service-family-card" key={family.id}>
            <header>
              <div>
                <p className="ienyell-admin-eyebrow">Service family {familyIndex + 1}</p>
                <h2>{family.title || family.id}</h2>
              </div>
              <div className="ienyell-service-family-actions">
                <button type="button" onClick={() => moveFamily(familyIndex, -1)} disabled={familyIndex === 0}>Move up</button>
                <button type="button" onClick={() => moveFamily(familyIndex, 1)} disabled={familyIndex === catalog.families.length - 1}>Move down</button>
                <Switch label={family.isActive === false ? 'Hidden' : 'Visible'} checked={family.isActive !== false} onChange={(value) => changeFamily(familyIndex, (current) => { current.isActive = value; })} />
              </div>
            </header>

            <div className="ienyell-service-family-fields">
              <label className="ienyell-calculator-field"><span>Name</span><input value={family.title || ''} onChange={(event) => changeFamily(familyIndex, (current) => { current.title = event.target.value; })} /></label>
              <label className="ienyell-calculator-field"><span>Route ID</span><input value={family.id || ''} onChange={(event) => changeFamily(familyIndex, (current) => { current.id = safeId(event.target.value); })} /><small>/services/{family.id || 'service-id'}</small></label>
              <label className="ienyell-calculator-field is-wide"><span>Description</span><textarea value={family.description || ''} onChange={(event) => changeFamily(familyIndex, (current) => { current.description = event.target.value; })} /></label>
              <label className="ienyell-calculator-field is-wide"><span>Local image path</span><input value={family.image || ''} placeholder="/recursos/example.png" onChange={(event) => changeFamily(familyIndex, (current) => { current.image = event.target.value; })} /></label>
              <label className="ienyell-calculator-field"><span>CTA question</span><input value={family.ctaTitle || ''} onChange={(event) => changeFamily(familyIndex, (current) => { current.ctaTitle = event.target.value; })} /></label>
              <label className="ienyell-calculator-field"><span>CTA supporting text</span><input value={family.ctaDescription || ''} onChange={(event) => changeFamily(familyIndex, (current) => { current.ctaDescription = event.target.value; })} /></label>
            </div>

            <section className="ienyell-service-offer-editor">
              <div className="ienyell-calculator-editor-heading"><div><p className="ienyell-admin-eyebrow">Entry options</p><h3>Which request paths appear here?</h3></div></div>
              {family.offers.map((offer, offerIndex) => {
                const choices = entryOptions(offer.wizardId);
                return (
                  <div className="ienyell-service-offer-row" key={offer.id}>
                    <label className="ienyell-calculator-field"><span>Button text</span><input value={offer.label || ''} onChange={(event) => changeOffer(familyIndex, offerIndex, (current) => { current.label = event.target.value; })} /></label>
                    <label className="ienyell-calculator-field"><span>Supporting text</span><input value={offer.description || ''} onChange={(event) => changeOffer(familyIndex, offerIndex, (current) => { current.description = event.target.value; })} /></label>
                    <label className="ienyell-calculator-field"><span>Reviewed flow</span><select value={offer.wizardId} onChange={(event) => changeOffer(familyIndex, offerIndex, (current) => { current.wizardId = event.target.value; delete current.entry; })}>{WIZARD_OPTIONS.map((wizard) => <option value={wizard.id} key={wizard.id}>{wizard.title}</option>)}</select></label>
                    <label className="ienyell-calculator-field"><span>Preselect a route</span><select value={entryValue(offer.entry)} onChange={(event) => changeOffer(familyIndex, offerIndex, (current) => { current.entry = parseEntry(event.target.value); })}><option value="">Ask in the flow</option>{choices.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</select></label>
                    <div className="ienyell-service-offer-actions">
                      <Switch label={offer.isActive === false ? 'Hidden' : 'Visible'} checked={offer.isActive !== false} onChange={(value) => changeOffer(familyIndex, offerIndex, (current) => { current.isActive = value; })} />
                      <button type="button" onClick={() => changeFamily(familyIndex, (current) => { current.offers.splice(offerIndex, 1); })}>Remove draft</button>
                    </div>
                  </div>
                );
              })}
              <button type="button" className="ienyell-flow-add" onClick={() => changeFamily(familyIndex, (current) => { current.offers.push(draftOffer()); })}>Add request option</button>
            </section>

            <button type="button" className="ienyell-service-remove-family" onClick={() => setCatalog((current) => ({ ...copy(current), families: current.families.filter((_, index) => index !== familyIndex) }))}>Remove this draft family</button>
          </article>
        ))}
      </div>

      <button type="button" className="ienyell-flow-add is-primary" onClick={() => setCatalog((current) => ({ ...copy(current), families: [...current.families, draftFamily()] }))}>Add service family</button>
    </section>
  );
}
