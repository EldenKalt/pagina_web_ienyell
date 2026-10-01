'use client';

import { ADDONS, calculateEstimate } from '../../../data/commissionPricing';

function resolveOptionLabel(value, sourceStep) {
  return sourceStep?.options?.find((option) => option.id === value)?.label ?? value;
}

function formatValue(value, field, sourceStep) {
  if (value === undefined || value === null || value === '') return '—';

  const resolvedValue = Array.isArray(value)
    ? value.map((item) => resolveOptionLabel(item, sourceStep))
    : resolveOptionLabel(value, sourceStep);

  if (field.format === 'currency' && !Array.isArray(resolvedValue)) {
    return String(resolvedValue).startsWith('$') ? resolvedValue : `$${resolvedValue}`;
  }

  return resolvedValue;
}

export default function SummaryStep({ step, answers = {}, allSteps = [] }) {
  const finish = {
    render_semi: 'render',
    render_hiper: 'render',
  }[answers['quote-finish']] ?? answers['quote-finish'];
  const addons = (answers['quote-addons'] ?? []).reduce((selection, addonId) => {
    const addon = ADDONS.find((item) => item.id === addonId);
    selection[addonId] = addon?.per ? 1 : true;
    return selection;
  }, {});
  const estimate = step.showPrice
    ? calculateEstimate({
      style: answers['quote-style'],
      finish,
      framing: answers['quote-framing'],
      addons,
    })
    : null;

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      {step.showPrice && (
        <div className="wiz-step-price-card">
          <span>Estimated price</span>
          <strong>{estimate ? `$${estimate.total} USD` : '—'}</strong>
          <p>This is an estimate. Final pricing may vary based on your specific requirements.</p>
        </div>
      )}
      <dl className="wiz-step-summary-list">
        {(step.fields ?? []).map((field) => {
          const sourceStep = allSteps.find((item) => item.id === field.stepId);
          const formattedValue = formatValue(answers[field.stepId], field, sourceStep);

          return (
            <div key={field.stepId} className="wiz-step-summary-row">
              <dt>{field.label}</dt>
              <dd className={formattedValue === '—' ? 'is-empty' : undefined}>
                {Array.isArray(formattedValue)
                  ? formattedValue.map((item) => <span className="wiz-step-summary-chip" key={item}>{item}</span>)
                  : formattedValue}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
