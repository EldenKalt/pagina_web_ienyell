'use client';

import { useEffect, useRef } from 'react';
import { getRuntimePricingConfig } from '../../../data/commissionPricing';
import { getFlowAddonDefaults } from '../../../data/wizardFlows';
import { useCalculatorSettings } from '../../../context/CalculatorSettingsContext';

function calculateConfigEstimate(config, selections, addons, answers) {
  if (!config) return null;
  return config.multiService
    ? config.calculate(selections, addons, answers?.[config.servicesStepId] ?? [])
    : config.calculate(selections, addons);
}

function optionMatchesDependency(option, dependencyId, selectedValue) {
  if (!selectedValue) return false;
  const rule = option.dependsOn ?? option[dependencyId] ?? option[`${dependencyId}Id`];
  if (rule === undefined) return true;
  if (Array.isArray(rule)) return rule.includes(selectedValue);
  return rule === selectedValue;
}

function DimensionGroup({ dimension, selections, onSelect, dependsOn }) {
  const options = (dimension.dependsOn && dimension.optionsByParent
    ? dimension.optionsByParent[dependsOn] ?? []
    : dimension.dependsOn
      ? (dimension.options ?? []).filter((option) => optionMatchesDependency(option, dimension.dependsOn, dependsOn))
      : dimension.options ?? []).filter((option) => option.isActive !== false);

  const isMulti = dimension.multi;
  const selected = selections[dimension.id];

  return (
    <div className="wiz-calculator-group">
      <h4>{dimension.label}</h4>
      <div className="wiz-calculator-options">
        {options.map((option) => {
          const isSelected = isMulti
            ? (Array.isArray(selected) && selected.includes(option.id))
            : selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`wiz-calculator-chip${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelect(dimension.id, option.id, isMulti)}
            >
              {option.thumbnail && <img src={option.thumbnail} alt="" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiServiceCalculator({ step, config, value, onChange, answers }) {
  const selections = value?.selections ?? {};
  const estimate = value?.estimate ?? null;
  const selectedServices = answers?.[config.servicesStepId] ?? [];
  const availableServices = selectedServices.filter((serviceId) => config.serviceConfigs[serviceId]?.isActive !== false);

  const save = (nextSelections) => {
    const result = config.calculate(nextSelections, {}, availableServices);
    onChange({ selections: nextSelections, addons: {}, estimate: result });
  };

  const selectOption = (dimensionId, optionId) => {
    save({ ...selections, [dimensionId]: optionId });
  };

  if (selectedServices.length === 0) {
    return (
      <div className="wiz-step">
        <h3 className="wiz-step-title">{step.title}</h3>
        <p className="wiz-step-description">No services selected. Go back and choose at least one.</p>
      </div>
    );
  }

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}

      {availableServices.map((serviceId) => {
        const svc = config.serviceConfigs[serviceId];
        if (!svc) return null;
        return (
          <div key={serviceId} className="wiz-calc-service">
            <div className="wiz-calc-service-header">
              <strong>{svc.label}</strong>
              {svc.subtitle && <span>{svc.subtitle}</span>}
            </div>
            {svc.dimensions.map((dim) => (
              <DimensionGroup key={dim.id} dimension={dim} selections={selections} onSelect={selectOption} dependsOn={selections[dim.dependsOn]} />
            ))}
          </div>
        );
      })}

      <div className="wiz-calculator-price">
        <span>Estimated range</span>
        <strong>{estimate ? `$${estimate.min} – $${estimate.max} USD` : 'Select your options'}</strong>
      </div>

      {estimate?.breakdown?.length > 1 && (
        <div className="wiz-calc-breakdown">
          {estimate.breakdown.map((item) => (
            <div key={item.serviceId} className="wiz-calc-breakdown-row">
              <span>{item.label}</span>
              <strong>${item.min} – ${item.max}</strong>
            </div>
          ))}
        </div>
      )}

      <p className="wiz-calc-disclaimer">This is an initial estimate, not a final quote. The actual price, availability, timeline, deliverables, revisions, and usage rights will be confirmed after a briefing.</p>
    </div>
  );
}

export default function CalculatorStep({ step, value, onChange, answers, allSteps = [] }) {
  const { settings, priceOptions } = useCalculatorSettings();
  const configSettings = settings?.[step.pricingConfigId] ?? {};
  const configSettingsKey = JSON.stringify(configSettings);
  const config = getRuntimePricingConfig(step.pricingConfigId, configSettings, priceOptions);
  const selections = value?.selections ?? {};
  const addons = value?.addons ?? {};
  const estimate = value?.estimate ?? null;

  const freshSelDefs = step.selectionDefaults ? step.selectionDefaults(answers) : {};
  const freshSelDefsKey = JSON.stringify(freshSelDefs);
  const staticAddonDefs = step.addonDefaults ? step.addonDefaults(answers) : {};
  const flowAddonDefs = getFlowAddonDefaults(allSteps, answers, config?.addons);
  const freshAddonDefs = { ...staticAddonDefs, ...flowAddonDefs };
  const lockedFlowAddonIds = new Set(Object.keys(flowAddonDefs));
  const freshAddonDefsKey = JSON.stringify(freshAddonDefs);

  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (defaultsApplied.current || value) return;
    if (!step.addonDefaults && !step.selectionDefaults && !Object.keys(flowAddonDefs).length) return;
    defaultsApplied.current = true;

    const hasAddons = Object.keys(freshAddonDefs).some((k) => freshAddonDefs[k]);
    const hasSels = Object.keys(freshSelDefs).some((k) => {
      const v = freshSelDefs[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });

    if (hasAddons || hasSels) {
      onChange({ selections: freshSelDefs, addons: freshAddonDefs, estimate: null });
    }
  }, []);

  useEffect(() => {
    if (!value) return;
    const selChanged = step.selectionDefaults && Object.entries(freshSelDefs).some(([k, v]) => selections[k] !== v);
    const addonChanged = Object.entries(freshAddonDefs).some(([k, v]) => addons[k] !== v);
    if (selChanged || addonChanged) {
      const mergedSel = { ...selections, ...freshSelDefs };
      const mergedAddons = { ...addons, ...freshAddonDefs };
      onChange({
        selections: mergedSel,
        addons: mergedAddons,
        estimate: calculateConfigEstimate(config, mergedSel, mergedAddons, answers),
      });
    }
  }, [freshSelDefsKey, freshAddonDefsKey]);

  const appliedSettingsKey = useRef(configSettingsKey);
  useEffect(() => {
    if (!value || appliedSettingsKey.current === configSettingsKey) return;
    appliedSettingsKey.current = configSettingsKey;
    onChange({
      selections,
      addons,
      estimate: calculateConfigEstimate(config, selections, addons, answers),
    });
  }, [configSettingsKey]);

  if (!config) {
    return <div className="wiz-step"><h3 className="wiz-step-title">{step.title}</h3><p className="wiz-step-description">This pricing calculator is not available yet.</p></div>;
  }

  if (!config.isActive) {
    return <div className="wiz-step"><h3 className="wiz-step-title">{step.title}</h3><p className="wiz-step-description">This calculator is not accepting new estimates at the moment. Please return and choose another service.</p></div>;
  }

  if (config.multiService) {
    return <MultiServiceCalculator step={step} config={config} value={value} onChange={onChange} answers={answers} />;
  }

  const save = (nextSelections, nextAddons) => {
    onChange({
      selections: nextSelections,
      addons: nextAddons,
      estimate: calculateConfigEstimate(config, nextSelections, nextAddons, answers),
    });
  };

  const selectOption = (dimensionId, optionId, isMulti) => {
    if (isMulti) {
      const current = Array.isArray(selections[dimensionId]) ? selections[dimensionId] : [];
      const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
      save({ ...selections, [dimensionId]: next }, addons);
    } else {
      save({ ...selections, [dimensionId]: optionId }, addons);
    }
  };

  const toggleAddon = (addonId) => {
    const addon = (config.addons ?? []).find((a) => a.id === addonId);
    const nextAddons = { ...addons };
    if (addon?.exclusive) {
      for (const other of config.addons) {
        if (other.exclusive === addon.exclusive && other.id !== addonId) nextAddons[other.id] = false;
      }
    }
    nextAddons[addonId] = !addons[addonId];
    save(selections, nextAddons);
  };

  const setAddonQty = (addonId, qty) => {
    save(selections, { ...addons, [addonId]: qty });
  };

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      {(config.dimensions ?? []).map((dimension) => (
        <DimensionGroup key={dimension.id} dimension={dimension} selections={selections} onSelect={selectOption} dependsOn={selections[dimension.dependsOn]} />
      ))}
      {(config.addons ?? []).length > 0 && (
        <div className="wiz-calculator-group">
          <h4>Add-ons</h4>
          <div className="wiz-calculator-addons">
            {config.addons.map((addon) => {
              const lockedByFlow = lockedFlowAddonIds.has(addon.id);
              if (addon.per) {
                const qty = Number(addons[addon.id]) || 0;
                return (
                  <div key={addon.id} className={`wiz-calculator-addon wiz-addon-qty${qty > 0 ? ' is-selected' : ''}`}>
                    <div className="wiz-addon-info">
                      <span className="wiz-addon-label">{addon.label}</span>
                      {addon.note && <span className="wiz-addon-note">{addon.note}</span>}
                    </div>
                    {lockedByFlow
                      ? <span className="wiz-addon-note">Included by an earlier choice</span>
                      : <div className="wiz-addon-stepper"><button type="button" onClick={() => setAddonQty(addon.id, Math.max(0, qty - 1))} aria-label="Remove one">&minus;</button><span>{qty}</span><button type="button" onClick={() => setAddonQty(addon.id, qty + 1)} aria-label="Add one">+</button></div>}
                  </div>
                );
              }
              const active = !!addons[addon.id];
              if (lockedByFlow) {
                return (
                  <div key={addon.id} className="wiz-calculator-addon is-selected" aria-label={`${addon.label}: included by an earlier choice`}>
                    <span className="wiz-form-checkbox is-checked" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span>
                    <div className="wiz-addon-info"><span>{addon.label}</span>{addon.note && <span className="wiz-addon-note">{addon.note}</span>}<span className="wiz-addon-note">Included by an earlier choice</span></div>
                  </div>
                );
              }
              return (
                <button key={addon.id} type="button" className={`wiz-calculator-addon${active ? ' is-selected' : ''}`} onClick={() => toggleAddon(addon.id)}>
                  <span className={`wiz-form-checkbox${active ? ' is-checked' : ''}`} aria-hidden="true">
                    {active && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
                  </span>
                  <div className="wiz-addon-info">
                    <span>{addon.label}</span>
                    {addon.note && <span className="wiz-addon-note">{addon.note}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="wiz-calculator-price"><span>Estimated price</span><strong>{estimate?.min != null ? `$${estimate.min} – $${estimate.max} USD` : estimate?.total != null ? `$${estimate.total} USD` : 'Select your options'}</strong></div>
    </div>
  );
}
