'use client';

export default function MultiSelectStep({ step, value, onChange }) {
  const selectedValues = Array.isArray(value) ? value : [];

  const toggleOption = (optionId) => {
    const isSelected = selectedValues.includes(optionId);
    if (isSelected) {
      onChange(selectedValues.filter((id) => id !== optionId));
      return;
    }
    if (step.max && selectedValues.length >= step.max) return;
    onChange([...selectedValues, optionId]);
  };

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      <div className="wiz-step-options" role="group" aria-label={step.title}>
        {(step.options ?? []).map((option) => {
          const isSelected = selectedValues.includes(option.id);

          return (
            <button key={option.id} type="button" className={`wiz-step-option${isSelected ? ' is-selected' : ''}`} aria-pressed={isSelected} onClick={() => toggleOption(option.id)}>
              {option.icon && <span className="wiz-step-option-icon" aria-hidden="true">{option.icon}</span>}
              <span className="wiz-step-option-copy"><strong>{option.label}</strong>{option.description && <span>{option.description}</span>}</span>
              <span className={`wiz-step-checkbox${isSelected ? ' is-checked' : ''}`} aria-hidden="true">{isSelected && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
