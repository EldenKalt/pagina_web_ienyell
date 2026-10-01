'use client';

export default function ChecklistStep({ step, value = {}, onChange }) {
  const toggleItem = (itemId) => {
    onChange({ ...value, [itemId]: !value[itemId] });
  };

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      <div className="wiz-checklist">
        {(step.items ?? []).map((item) => {
          const checked = Boolean(value[item.id]);
          return (
            <button key={item.id} type="button" className="wiz-checklist-item" onClick={() => toggleItem(item.id)} aria-pressed={checked}>
              <span className={`wiz-checklist-box${checked ? ' is-checked' : ''}`} aria-hidden="true">{checked && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}</span>
              <span className="wiz-checklist-copy"><strong>{item.label}{item.required && <span className="wiz-required"> *</span>}</strong>{item.detail && <span>{item.detail}</span>}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
