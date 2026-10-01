'use client';

export default function BudgetCheckStep({ step, answers = {}, onYes, onNo }) {
  const calculatorValue = step.calculatorStepId ? answers[step.calculatorStepId] : Object.values(answers).find((value) => value?.estimate?.total != null || value?.estimate?.min != null);
  const estimate = calculatorValue?.estimate;
  const priceLabel = estimate?.min != null
    ? `$${estimate.min} – $${estimate.max} USD`
    : estimate?.total != null ? `$${estimate.total} USD` : '—';

  return (
    <div className="wiz-step wiz-budget-check">
      <div className="wiz-calculator-price"><span>{estimate?.min != null ? 'Estimated range' : 'Estimated price'}</span><strong>{priceLabel}</strong></div>
      <h3 className="wiz-step-title">{step.title ?? 'Do you have the budget for this?'}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      <button type="button" className="wiz-action-primary" onClick={onYes}>Yes, let&apos;s continue</button>
      <button type="button" className="wiz-action-secondary" onClick={onNo}>Not right now</button>
    </div>
  );
}
