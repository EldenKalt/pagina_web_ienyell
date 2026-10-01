'use client';

import { useEffect, useMemo, useState } from 'react';

import { getGlobalPriceOptions, getPricingConfigEditorModel, PRICING_CONFIGS } from '../../../data/commissionPricing';
import { authFetch } from '../../../lib/authHelper';

const CONFIG_IDS = Object.keys(PRICING_CONFIGS);

function copySettings(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function sectionSettings(settings, sectionId) {
  return sectionId === 'root' ? settings : (settings.services?.[sectionId] || {});
}

function updateSection(settings, sectionId, updater) {
  const next = copySettings(settings);
  if (sectionId === 'root') {
    updater(next);
    return next;
  }
  next.services ||= {};
  next.services[sectionId] ||= {};
  updater(next.services[sectionId]);
  return next;
}

function updateNestedOption(settings, sectionId, dimensionId, optionId, field, value) {
  return updateSection(settings, sectionId, (scope) => {
    scope.dimensions ||= {};
    scope.dimensions[dimensionId] ||= {};
    scope.dimensions[dimensionId].options ||= {};
    scope.dimensions[dimensionId].options[optionId] ||= {};
    scope.dimensions[dimensionId].options[optionId][field] = value;
  });
}

function updateDimension(settings, sectionId, dimensionId, value) {
  return updateSection(settings, sectionId, (scope) => {
    scope.dimensions ||= {};
    scope.dimensions[dimensionId] ||= {};
    scope.dimensions[dimensionId].label = value;
  });
}

function updateAddon(settings, sectionId, addonId, field, value) {
  return updateSection(settings, sectionId, (scope) => {
    scope.addons ||= {};
    scope.addons[addonId] ||= {};
    scope.addons[addonId][field] = value;
  });
}

function updatePrice(settings, sectionId, path, value) {
  return updateSection(settings, sectionId, (scope) => {
    scope.prices ||= {};
    scope.prices[path] = value;
  });
}

function cleanNumber(value) {
  if (value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function setOptionAssignment(settings, optionId, isBuiltInForConfig, assigned) {
  const next = copySettings(settings);
  if (isBuiltInForConfig) {
    next.addons ||= {};
    next.addons[optionId] ||= {};
    next.addons[optionId].isActive = assigned;
    return next;
  }
  const assignedAddons = new Set(next.assignedAddons || []);
  if (assigned) assignedAddons.add(optionId);
  else assignedAddons.delete(optionId);
  next.assignedAddons = [...assignedAddons];
  return next;
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

function DimensionEditor({ section, scope, onChange }) {
  if (!section.dimensions.length) return null;
  return (
    <section className="ienyell-calculator-editor-section">
      <div className="ienyell-calculator-editor-heading">
        <div><p className="ienyell-admin-eyebrow">Choices</p><h3>Options shown to visitors</h3></div>
        <p>Turn an option off to hide it. Its formula stays intact and can be enabled again later.</p>
      </div>
      {section.dimensions.map((dimension) => {
        const dimensionOverride = scope.dimensions?.[dimension.id] || {};
        return (
          <div className="ienyell-calculator-dimension" key={dimension.id}>
            <label className="ienyell-calculator-field ienyell-calculator-dimension-label">
              <span>Question label</span>
              <input
                value={dimensionOverride.label ?? dimension.label}
                onChange={(event) => onChange((settings) => updateDimension(settings, section.id, dimension.id, event.target.value))}
              />
            </label>
            <div className="ienyell-calculator-option-list">
              {dimension.options.map((option) => {
                const override = dimensionOverride.options?.[option.id] || {};
                return (
                  <div className="ienyell-calculator-option" key={option.id}>
                    <label className="ienyell-calculator-field">
                      <span>Option</span>
                      <input
                        value={override.label ?? option.label}
                        onChange={(event) => onChange((settings) => updateNestedOption(settings, section.id, dimension.id, option.id, 'label', event.target.value))}
                      />
                    </label>
                    <Switch
                      label="Visible"
                      checked={override.isActive ?? true}
                      onChange={(checked) => onChange((settings) => updateNestedOption(settings, section.id, dimension.id, option.id, 'isActive', checked))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function AddonEditor({ section, scope, onChange }) {
  if (!section.addons.length) return null;
  return (
    <section className="ienyell-calculator-editor-section">
      <div className="ienyell-calculator-editor-heading">
        <div><p className="ienyell-admin-eyebrow">Extras</p><h3>Optional price adjustments</h3></div>
        <p>The calculation method is locked; you can update its amount, label and visibility safely.</p>
      </div>
      <div className="ienyell-calculator-addon-list">
        {section.addons.map((addon) => {
          const override = scope.addons?.[addon.id] || {};
          return (
            <article className="ienyell-calculator-addon-card" key={addon.id}>
              <div className="ienyell-calculator-addon-top">
                <label className="ienyell-calculator-field">
                  <span>Extra label</span>
                  <input value={override.label ?? addon.label} onChange={(event) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'label', event.target.value))} />
                </label>
                <Switch label="Visible" checked={override.isActive ?? true} onChange={(checked) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'isActive', checked))} />
              </div>
              <label className="ienyell-calculator-field">
                <span>Visitor note</span>
                <input value={override.note ?? addon.note ?? ''} placeholder="Optional explanation" onChange={(event) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'note', event.target.value))} />
              </label>
              <div className="ienyell-calculator-value-grid">
                {addon.amount != null ? <label className="ienyell-calculator-field"><span>Fixed amount (USD)</span><input type="number" min="0" step="1" value={override.amount ?? addon.amount} onChange={(event) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'amount', cleanNumber(event.target.value)))} /></label> : null}
                {addon.pct != null ? <label className="ienyell-calculator-field"><span>Percentage</span><input type="number" min="0" step="1" value={override.pct ?? addon.pct} onChange={(event) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'pct', cleanNumber(event.target.value)))} /></label> : null}
                {addon.min != null ? <label className="ienyell-calculator-field"><span>Minimum (USD)</span><input type="number" min="0" step="1" value={override.min ?? addon.min} onChange={(event) => onChange((settings) => updateAddon(settings, section.id, addon.id, 'min', cleanNumber(event.target.value)))} /></label> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PriceEditor({ section, scope, onChange }) {
  if (!section.prices.length) return null;
  return (
    <section className="ienyell-calculator-editor-section">
      <div className="ienyell-calculator-editor-heading">
        <div><p className="ienyell-admin-eyebrow">Base pricing</p><h3>Price matrix</h3></div>
        <p>Each value is a known combination from the existing calculator. Prices are in USD.</p>
      </div>
      <div className="ienyell-calculator-price-grid">
        {section.prices.map((price) => (
          <label className="ienyell-calculator-field" key={price.path}>
            <span>{price.label}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={scope.prices?.[price.path] ?? price.value}
              onChange={(event) => onChange((settings) => updatePrice(settings, section.id, price.path, cleanNumber(event.target.value)))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function PriceOptionLibrary({ options, currentAddons, settings, onChange, onCreate, isCreating, customOption, setCustomOption }) {
  const currentAddonIds = new Set((currentAddons || []).map((addon) => addon.id));
  const assigned = new Set(settings.assignedAddons || []);
  return (
    <section className="ienyell-calculator-library">
      <div className="ienyell-calculator-editor-heading">
        <div><p className="ienyell-admin-eyebrow">Global library</p><h2>Variables available everywhere</h2></div>
        <p>Activate any existing price variable for this calculator. A variable keeps its default effect, and you can adjust it below after assigning it.</p>
      </div>
      <div className="ienyell-calculator-library-list">
        {options.map((option) => {
          const builtInForConfig = currentAddonIds.has(option.id);
          const optionSettings = settings.addons?.[option.id] || {};
          const checked = builtInForConfig ? optionSettings.isActive !== false : assigned.has(option.id);
          const effect = option.amount != null ? `+$${option.amount}${option.per ? ' per unit' : ''}` : `+${option.pct}%${option.per ? ' per unit' : ''}`;
          return (
            <div className="ienyell-calculator-library-item" key={option.id}>
              <div>
                <strong>{option.label}</strong>
                <span>{effect} · {option.on === 'total' ? 'total' : 'base price'}{option.source === 'custom' ? ' · custom' : ''}</span>
                {option.note ? <small>{option.note}</small> : null}
              </div>
              <Switch label={checked ? 'Enabled' : 'Disabled'} checked={checked} onChange={(value) => onChange((current) => setOptionAssignment(current, option.id, builtInForConfig, value))} />
            </div>
          );
        })}
      </div>
      <form className="ienyell-calculator-new-option" onSubmit={onCreate}>
        <div><p className="ienyell-admin-eyebrow">New global variable</p><h3>Create an extra for any service</h3></div>
        <label className="ienyell-calculator-field"><span>Label</span><input required value={customOption.label} placeholder="e.g. Intimate scene" onChange={(event) => setCustomOption((current) => ({ ...current, label: event.target.value }))} /></label>
        <label className="ienyell-calculator-field"><span>Effect</span><select value={customOption.pricingMode} onChange={(event) => setCustomOption((current) => ({ ...current, pricingMode: event.target.value }))}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
        <label className="ienyell-calculator-field"><span>{customOption.pricingMode === 'FIXED' ? 'Amount (USD)' : 'Percentage'}</span><input required type="number" min="0" step="1" value={customOption.value} onChange={(event) => setCustomOption((current) => ({ ...current, value: event.target.value }))} /></label>
        <label className="ienyell-calculator-field"><span>Applied to</span><select value={customOption.applyTo} onChange={(event) => setCustomOption((current) => ({ ...current, applyTo: event.target.value }))}><option value="base">Base price</option><option value="total">Subtotal</option></select></label>
        <Switch label="Quantity control" checked={customOption.isPer} onChange={(isPer) => setCustomOption((current) => ({ ...current, isPer }))} />
        <button type="submit" className="ienyell-calculator-create" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create variable'}</button>
      </form>
    </section>
  );
}

export default function CalculatorSettingsAdminPage() {
  const [allSettings, setAllSettings] = useState({});
  const [customOptions, setCustomOptions] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(CONFIG_IDS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creatingOption, setCreatingOption] = useState(false);
  const [customOption, setCustomOption] = useState({ label: '', pricingMode: 'PERCENTAGE', value: '', applyTo: 'base', isPer: false });

  const settings = allSettings[selectedConfigId] || {};
  const priceOptions = useMemo(() => getGlobalPriceOptions(customOptions), [customOptions]);
  const model = useMemo(() => getPricingConfigEditorModel(selectedConfigId, settings, customOptions), [selectedConfigId, settings, customOptions]);
  const currentConfig = PRICING_CONFIGS[selectedConfigId];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [settingsResponse, optionsResponse] = await Promise.all([
          authFetch('/api/calculator-configs/admin'),
          authFetch('/api/calculator-options/admin'),
        ]);
        if (!cancelled) {
          setAllSettings(settingsResponse?.settings || {});
          setCustomOptions(Array.isArray(optionsResponse?.options) ? optionsResponse.options : []);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.data?.error || 'Calculator settings could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function changeSettings(updater) {
    setMessage('');
    setAllSettings((current) => ({
      ...current,
      [selectedConfigId]: updater(current[selectedConfigId] || {}),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await authFetch(`/api/calculator-configs/${encodeURIComponent(selectedConfigId)}`, {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      const saved = response?.record?.settings || {};
      setAllSettings((current) => ({ ...current, [selectedConfigId]: saved }));
      setMessage('Changes saved. New visitors will use these settings immediately.');
    } catch (requestError) {
      setError(requestError?.data?.error || 'Changes could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function createPriceOption(event) {
    event.preventDefault();
    setCreatingOption(true);
    setError('');
    setMessage('');
    try {
      const response = await authFetch('/api/calculator-options', {
        method: 'POST',
        body: JSON.stringify({ ...customOption, value: cleanNumber(customOption.value) }),
      });
      if (response?.option) setCustomOptions((current) => [...current, response.option]);
      setCustomOption({ label: '', pricingMode: 'PERCENTAGE', value: '', applyTo: 'base', isPer: false });
      setMessage('Global variable created. Enable it in any calculator from this library.');
    } catch (requestError) {
      setError(requestError?.data?.error || 'The variable could not be created.');
    } finally {
      setCreatingOption(false);
    }
  }

  if (!model) return null;

  return (
    <section className="ienyell-admin-page ienyell-calculator-page">
      <header className="ienyell-admin-page-heading">
        <div>
          <p className="ienyell-admin-eyebrow">Commission calculator</p>
          <h1>Keep every estimate intentional.</h1>
          <p>Edit the prices, choices and extras already used by each calculator. The flow and pricing rules stay protected, so a content change cannot break a customer path.</p>
        </div>
        <button type="button" className="ienyell-admin-refresh" onClick={save} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      {error ? <p className="ienyell-admin-notice is-error" role="alert">{error}</p> : null}
      {message ? <p className="ienyell-admin-notice" role="status">{message}</p> : null}

      <div className="ienyell-calculator-intro">
        <label className="ienyell-admin-select-label">
          <span>Calculator</span>
          <select value={selectedConfigId} onChange={(event) => { setSelectedConfigId(event.target.value); setMessage(''); }} disabled={loading}>
            {CONFIG_IDS.map((configId) => <option key={configId} value={configId}>{PRICING_CONFIGS[configId].label}</option>)}
          </select>
        </label>
        <Switch
          label="Accept new estimates"
          checked={settings.isActive ?? true}
          onChange={(isActive) => changeSettings((current) => ({ ...copySettings(current), isActive }))}
        />
      </div>

      {loading ? <div className="ienyell-admin-empty">Loading calculator settings…</div> : (
        <div className="ienyell-calculator-workspace">
          {currentConfig?.multiService ? (
            <p className="ienyell-admin-notice">Global extras will be available for the individual author services when their dedicated flow editor is added. The current multi-service calculator keeps its own combined quote.</p>
          ) : <PriceOptionLibrary options={priceOptions} currentAddons={currentConfig?.addons} settings={settings} onChange={changeSettings} onCreate={createPriceOption} isCreating={creatingOption} customOption={customOption} setCustomOption={setCustomOption} />}
          {model.sections.map((section) => {
            const scope = sectionSettings(settings, section.id);
            const updateScope = (updater) => changeSettings((current) => updater(current));
            return (
              <article className="ienyell-calculator-section-card" key={section.id}>
                {model.sections.length > 1 ? <header><p className="ienyell-admin-eyebrow">Service</p><h2>{section.label}</h2></header> : null}
                <DimensionEditor section={section} scope={scope} onChange={updateScope} />
                <AddonEditor section={section} scope={scope} onChange={updateScope} />
                <PriceEditor section={section} scope={scope} onChange={updateScope} />
                {!section.dimensions.length && !section.addons.length && !section.prices.length ? <p className="ienyell-calculator-empty">This service has no editable price matrix yet.</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
