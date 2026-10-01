'use client';

export default function TextInputStep({ step, value, onChange }) {
  const inputType = step.inputType ?? 'text';
  const inputProps = {
    className: 'wiz-step-input',
    value: value ?? '',
    placeholder: step.placeholder ?? '',
    required: step.required,
    maxLength: step.maxLength,
    onChange: (event) => onChange(event.target.value),
  };

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      {inputType === 'textarea'
        ? <textarea {...inputProps} aria-label={step.title} />
        : <input {...inputProps} type={inputType} min={inputType === 'number' ? step.min : undefined} max={inputType === 'number' ? step.max : undefined} aria-label={step.title} />}
      {step.maxLength && <p className="wiz-step-character-count">{String(value ?? '').length}/{step.maxLength}</p>}
    </div>
  );
}
