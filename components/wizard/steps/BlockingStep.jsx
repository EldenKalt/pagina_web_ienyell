'use client';

export default function BlockingStep({ step, onAction, onClose }) {
  const handleAction = (action) => {
    if (action?.action === 'close' || !action?.stepId) {
      onClose();
      return;
    }
    onAction(action.stepId);
  };

  return (
    <div className="wiz-step wiz-blocking-step">
      <span className="wiz-blocking-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg></span>
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      {step.primaryAction && <button type="button" className="wiz-action-primary" onClick={() => handleAction(step.primaryAction)}>{step.primaryAction.label}</button>}
      {step.secondaryAction && <button type="button" className="wiz-action-secondary" onClick={() => handleAction(step.secondaryAction)}>{step.secondaryAction.label}</button>}
    </div>
  );
}
