'use client';

import { useEffect, useMemo } from 'react';

export default function SingleSelectStep({ step, value, onChange, allAnswers = {} }) {
  const visibleOptions = useMemo(() => (
    (step.options ?? []).filter((option) => (
      !option.showWhen || option.showWhen.values.includes(allAnswers[option.showWhen.stepId])
    ))
  ), [step.options, allAnswers]);

  useEffect(() => {
    if (value !== undefined && !visibleOptions.some((option) => option.id === value)) {
      onChange(undefined);
    }
  }, [value, visibleOptions, onChange]);

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      <div className="wiz-step-options" role="radiogroup" aria-label={step.title}>
        {visibleOptions.map((option) => {
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`wiz-step-option${isSelected ? ' is-selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.id)}
            >
              {option.icon && <span className="wiz-step-option-icon" aria-hidden="true">{option.icon}</span>}
              <span className="wiz-step-option-copy"><strong>{option.label}</strong>{option.description && <span>{option.description}</span>}</span>
              {isSelected && <span className="wiz-step-option-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
