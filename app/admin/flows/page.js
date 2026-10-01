'use client';

import { useEffect, useMemo, useState } from 'react';

import { getGlobalPriceOptions } from '../../../data/commissionPricing';
import { WIZARDS } from '../../../data/wizards';
import { getFlowCalculatorTargets, getFlowEditorSteps } from '../../../data/wizardFlows';
import { authFetch } from '../../../lib/authHelper';

const WIZARD_IDS = Object.keys(WIZARDS);

function copy(value) {
  return JSON.parse(JSON.stringify(value || {}));
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

function updateStep(settings, stepId, updater) {
  const next = copy(settings);
  next.steps ||= {};
  next.steps[stepId] ||= {};
  updater(next.steps[stepId]);
  return next;
}

function updateOption(settings, stepId, optionId, updater) {
  return updateStep(settings, stepId, (step) => {
    step.options ||= {};
    step.options[optionId] ||= {};
    updater(step.options[optionId]);
  });
}

function updateItem(settings, stepId, itemId, updater) {
  return updateStep(settings, stepId, (step) => {
    step.items ||= {};
    step.items[itemId] ||= {};
    updater(step.items[itemId]);
  });
}

function addedOption(settings, stepId) {
  const next = copy(settings);
  next.steps ||= {};
  next.steps[stepId] ||= {};
  next.steps[stepId].addedOptions ||= [];
  const suffix = `${Date.now().toString(36)}-${next.steps[stepId].addedOptions.length + 1}`;
  next.steps[stepId].addedOptions.push({ id: `flow-${suffix}`, label: 'New option', description: '', isActive: true });
  return next;
}

function updateAddedOption(settings, stepId, optionId, updater) {
  const next = copy(settings);
  const options = next.steps?.[stepId]?.addedOptions || [];
  const option = options.find((item) => item.id === optionId);
  if (option) updater(option);
  return next;
}

function PriceLink({ value, onChange, options }) {
  return (
    <label className="ienyell-calculator-field">
      <span>Price variable</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">No price effect</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function RouteLink({ value, onChange, targets }) {
  return (
    <label className="ienyell-calculator-field">
      <span>After this choice</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Keep reviewed route</option>
        {targets.map((target) => <option key={target.id} value={target.id}>{target.label || target.id}</option>)}
      </select>
    </label>
  );
}

function ChoiceFields({ option, override, onChange, priceOptions, routeTargets, canRoute }) {
  const state = { ...option, ...override };
  return (
    <div className="ienyell-flow-option-fields">
      <label className="ienyell-calculator-field">
        <span>Choice</span>
        <input value={state.label || ''} onChange={(event) => onChange((current) => { current.label = event.target.value; })} />
      </label>
      <label className="ienyell-calculator-field">
        <span>Supporting text</span>
        <input value={state.description || ''} placeholder="Optional" onChange={(event) => onChange((current) => { current.description = event.target.value; })} />
      </label>
      {priceOptions ? <PriceLink value={state.priceOptionId} options={priceOptions} onChange={(value) => onChange((current) => { current.priceOptionId = value; })} /> : null}
      {canRoute ? <RouteLink value={state.nextStepId} targets={routeTargets} onChange={(value) => onChange((current) => { current.nextStepId = value; })} /> : null}
      <Switch label={state.isActive === false ? 'Hidden' : 'Visible'} checked={state.isActive !== false} onChange={(value) => onChange((current) => { current.isActive = value; })} />
    </div>
  );
}

function ExistingQuestionEditor({ step, settings, onChange, priceOptions, routeTargets }) {
  const override = settings.steps?.[step.id] || {};
  const selectable = Array.isArray(step.options);
  const isChecklist = Array.isArray(step.items);
  const items = selectable ? step.options : step.items;
  const added = selectable ? (override.addedOptions || []) : [];

  return (
    <article className="ienyell-flow-question-card">
      <header>
        <div>
          <p className="ienyell-admin-eyebrow">{step.type.replace('-', ' ')}</p>
          <h2>{step.title}</h2>
        </div>
        <span className="ienyell-flow-id">{step.id}</span>
      </header>
      <div className="ienyell-flow-question-copy">
        <label className="ienyell-calculator-field"><span>Question</span><input value={override.title ?? step.title ?? ''} onChange={(event) => onChange((current) => updateStep(current, step.id, (next) => { next.title = event.target.value; }))} /></label>
        <label className="ienyell-calculator-field"><span>Description</span><input value={override.description ?? step.description ?? ''} placeholder="Optional" onChange={(event) => onChange((current) => updateStep(current, step.id, (next) => { next.description = event.target.value; }))} /></label>
      </div>
      <div className="ienyell-flow-option-list">
        {items.map((option) => {
          const itemOverride = isChecklist ? (override.items?.[option.id] || {}) : (override.options?.[option.id] || {});
          const update = (updater) => onChange((current) => (isChecklist
            ? updateItem(current, step.id, option.id, updater)
            : updateOption(current, step.id, option.id, updater)));
          if (isChecklist) {
            const state = { ...option, ...itemOverride };
            return (
              <div className="ienyell-flow-option-fields" key={option.id}>
                <label className="ienyell-calculator-field"><span>Checklist item</span><input value={state.label || ''} onChange={(event) => update((current) => { current.label = event.target.value; })} /></label>
                <label className="ienyell-calculator-field"><span>Supporting text</span><input value={state.detail || ''} placeholder="Optional" onChange={(event) => update((current) => { current.detail = event.target.value; })} /></label>
                <Switch label={state.isActive === false ? 'Hidden' : 'Visible'} checked={state.isActive !== false} onChange={(value) => update((current) => { current.isActive = value; })} />
              </div>
            );
          }
          return <ChoiceFields key={option.id} option={option} override={itemOverride} onChange={update} priceOptions={priceOptions} routeTargets={routeTargets} canRoute={step.type === 'single-select'} />;
        })}
        {added.map((option) => <ChoiceFields key={option.id} option={option} override={{}} onChange={(updater) => onChange((current) => updateAddedOption(current, step.id, option.id, updater))} priceOptions={priceOptions} routeTargets={routeTargets} canRoute={step.type === 'single-select'} />)}
      </div>
      {selectable ? <button type="button" className="ienyell-flow-add" onClick={() => onChange((current) => addedOption(current, step.id))}>Add choice</button> : null}
    </article>
  );
}

function createExtraQuestion(targetId) {
  const suffix = Date.now().toString(36);
  return {
    id: `flow-question-${suffix}`,
    title: 'New pre-estimate question',
    description: '',
    type: 'single-select',
    beforeStepId: targetId,
    isActive: true,
    options: [{ id: `option-${suffix}`, label: 'New choice', description: '', isActive: true }],
  };
}

function ExtraQuestionEditor({ question, targets, priceOptions, onChange }) {
  const update = (updater) => onChange((current) => {
    current.extraQuestions ||= [];
    const target = current.extraQuestions.find((item) => item.id === question.id);
    if (target) updater(target);
  });
  return (
    <article className="ienyell-flow-question-card is-custom">
      <header>
        <div><p className="ienyell-admin-eyebrow">New screen</p><h2>{question.title}</h2></div>
        <Switch label={question.isActive === false ? 'Hidden' : 'Visible'} checked={question.isActive !== false} onChange={(value) => update((current) => { current.isActive = value; })} />
      </header>
      <div className="ienyell-flow-question-copy">
        <label className="ienyell-calculator-field"><span>Question</span><input value={question.title} onChange={(event) => update((current) => { current.title = event.target.value; })} /></label>
        <label className="ienyell-calculator-field"><span>Description</span><input value={question.description || ''} placeholder="Optional" onChange={(event) => update((current) => { current.description = event.target.value; })} /></label>
        <label className="ienyell-calculator-field"><span>Show immediately before</span><select value={question.beforeStepId} onChange={(event) => update((current) => { current.beforeStepId = event.target.value; })}>{targets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>
        <label className="ienyell-calculator-field"><span>Answer type</span><select value={question.type} onChange={(event) => update((current) => { current.type = event.target.value; })}><option value="single-select">Choose one</option><option value="multi-select">Choose several</option></select></label>
      </div>
      <div className="ienyell-flow-option-list">
        {(question.options || []).map((option) => <ChoiceFields key={option.id} option={option} override={{}} onChange={(updater) => update((current) => updater(current.options.find((item) => item.id === option.id)))} priceOptions={priceOptions} routeTargets={targets} canRoute={question.type === 'single-select'} />)}
      </div>
      <button type="button" className="ienyell-flow-add" onClick={() => update((current) => { const suffix = `${Date.now().toString(36)}-${current.options.length + 1}`; current.options.push({ id: `option-${suffix}`, label: 'New choice', description: '', isActive: true }); })}>Add choice</button>
    </article>
  );
}

export default function FlowSettingsAdminPage() {
  const [allSettings, setAllSettings] = useState({});
  const [customOptions, setCustomOptions] = useState([]);
  const [selectedWizardId, setSelectedWizardId] = useState(WIZARD_IDS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const wizard = WIZARDS[selectedWizardId];
  const settings = allSettings[selectedWizardId] || {};
  const editableSteps = useMemo(() => getFlowEditorSteps(wizard), [wizard]);
  const calculatorTargets = useMemo(() => getFlowCalculatorTargets(wizard), [wizard]);
  const routeTargets = wizard?.steps?.map((step) => ({ id: step.id, label: step.title || step.id })) || [];
  const priceOptions = useMemo(() => getGlobalPriceOptions(customOptions), [customOptions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [flowsResponse, optionsResponse] = await Promise.all([
          authFetch('/api/wizard-flows/admin'),
          authFetch('/api/calculator-options/admin'),
        ]);
        if (!cancelled) {
          setAllSettings(flowsResponse?.settings || {});
          setCustomOptions(Array.isArray(optionsResponse?.options) ? optionsResponse.options : []);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'Flow settings could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function change(updater) {
    setMessage('');
    setAllSettings((current) => ({ ...current, [selectedWizardId]: updater(current[selectedWizardId] || {}) }));
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await authFetch(`/api/wizard-flows/${encodeURIComponent(selectedWizardId)}`, { method: 'PUT', body: JSON.stringify({ settings }) });
      setAllSettings((current) => ({ ...current, [selectedWizardId]: response?.record?.settings || {} }));
      setMessage('Flow saved. New visitors will see it immediately.');
    } catch (requestError) {
      setError(requestError?.data?.error || 'The flow could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ienyell-admin-page ienyell-flow-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Commission flow</p>
          <h1>Shape the path before the estimate.</h1>
          <p>Edit the questions visitors see, their choices and their safe destinations. Any choice can preselect a global price variable that you have enabled for the destination calculator.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" onClick={save} disabled={loading || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </header>
      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      {message ? <p className="ienyell-admin-notice" role="status">{message}</p> : null}
      <div className="ienyell-calculator-intro">
        <label className="ienyell-admin-select-label"><span>Service path</span><select value={selectedWizardId} disabled={loading} onChange={(event) => { setSelectedWizardId(event.target.value); setMessage(''); }}>{WIZARD_IDS.map((id) => <option key={id} value={id}>{WIZARDS[id].title}</option>)}</select></label>
        <Switch label="Accept new requests" checked={settings.isActive ?? true} onChange={(value) => change((current) => ({ ...copy(current), isActive: value }))} />
      </div>
      {loading ? <div className="ienyell-admin-empty">Loading flow settings…</div> : <div className="ienyell-flow-workspace">
        <p className="ienyell-flow-guide">A price variable is only applied if it is enabled in the matching calculator on the <strong>Calculators</strong> page. Routes only point to screens that already exist in this service path.</p>
        <section className="ienyell-flow-question-list">
          {editableSteps.map((step) => <ExistingQuestionEditor key={step.id} step={step} settings={settings} onChange={change} priceOptions={step.type === 'checklist' ? null : priceOptions} routeTargets={routeTargets} />)}
        </section>
        <section className="ienyell-flow-custom-section">
          <div className="ienyell-calculator-editor-heading"><div><p className="ienyell-admin-eyebrow">Custom questions</p><h2>Add a screen before a calculator</h2></div><p>Use these for a new service/category choice, preferences or an upsell. They can select a price variable; their formula remains in the calculator library.</p></div>
          {(settings.extraQuestions || []).map((question) => <ExtraQuestionEditor key={question.id} question={question} targets={calculatorTargets} priceOptions={priceOptions} onChange={change} />)}
          <button type="button" className="ienyell-flow-add is-primary" disabled={!calculatorTargets.length} onClick={() => change((current) => ({ ...copy(current), extraQuestions: [...(current.extraQuestions || []), createExtraQuestion(calculatorTargets[0]?.id)] }))}>Add pre-estimate question</button>
        </section>
      </div>}
    </section>
  );
}
