'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = 'http://localhost:3001/api';

export function buildCommissionSubmission(wizardConfig, answers) {
  const steps = wizardConfig.steps ?? [];
  const singleSelectStep = steps.find((step) => step.type === 'single-select');
  const multiSelectStep = steps.find((step) => step.type === 'multi-select');
  const checklistStep = steps.filter((s) => s.type === 'checklist').find((s) => answers[s.id] && Object.keys(answers[s.id]).length > 0)
    ?? steps.find((s) => s.type === 'checklist');
  const calculatorStep = steps.filter((s) => s.type === 'calculator').find((s) => answers[s.id]?.estimate != null)
    ?? steps.find((s) => s.type === 'calculator');
  const contactStep = steps.find((step) => step.type === 'contact-form' && step.id !== 'waitlist-form');
  const contactData = { ...(contactStep ? answers[contactStep.id] : {}) };
  const referenceFiles = Array.isArray(contactData.references) ? contactData.references : [];
  delete contactData.references;

  const payload = {
    category: wizardConfig.id,
    subService: singleSelectStep ? answers[singleSelectStep.id] : null,
    specificServices: multiSelectStep ? answers[multiSelectStep.id] ?? [] : [],
    requirements: checklistStep ? answers[checklistStep.id] ?? {} : {},
    calculator: calculatorStep ? answers[calculatorStep.id] ?? null : null,
    contact: contactData,
    submittedAt: new Date().toISOString(),
  };
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  referenceFiles.forEach((file) => {
    if (file instanceof File) formData.append('references', file);
  });
  return formData;
}

export function buildWaitlistPayload(wizardConfig, answers) {
  const waitlistForm = answers['waitlist-form'] ?? {};
  return {
    category: wizardConfig.id,
    name: waitlistForm.name ?? '',
    email: waitlistForm.email ?? '',
    terms: waitlistForm.terms === true,
    newsletter: waitlistForm.newsletter === true,
    reason: 'budget-or-requirements',
    registeredAt: new Date().toISOString(),
  };
}

function StatusIcon({ loading }) {
  return (
    <span className={`wiz-completion-icon${loading ? ' is-loading' : ''}`} aria-hidden="true">
      {loading
        ? <svg className="wiz-submit-spinner" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="8" strokeOpacity=".25" /><path d="M20 12a8 8 0 0 0-8-8" strokeLinecap="round" /></svg>
        : <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
    </span>
  );
}

export default function CompletionStep({ step, onClose, outcome, wizardConfig, answers }) {
  const [status, setStatus] = useState(step.submitTo ? 'idle' : 'success');
  const [submissionId, setSubmissionId] = useState('');
  const [error, setError] = useState('');
  const hasSubmitted = useRef(false);

  const submit = useCallback(async () => {
    if (!step.submitTo || hasSubmitted.current) return;
    hasSubmitted.current = true;
    setStatus('loading');
    setError('');
    try {
      const isCommission = step.submitTo === 'commissions';
      const response = await fetch(`${API_URL}/${isCommission ? 'commissions' : 'waitlist'}`, {
        method: 'POST',
        ...(isCommission
          ? { body: buildCommissionSubmission(wizardConfig, answers) }
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildWaitlistPayload(wizardConfig, answers)) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to send your request.');
      setSubmissionId(result.id ?? '');
      setStatus('success');
    } catch (submitError) {
      hasSubmitted.current = false;
      setError(submitError.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }, [answers, step.submitTo, wizardConfig]);

  useEffect(() => { submit(); }, [submit]);

  if (status === 'loading' || status === 'idle') {
    return <div className="wiz-step wiz-completion-step" aria-live="polite"><StatusIcon loading /><h3 className="wiz-step-title">Sending...</h3><p className="wiz-step-description">Please keep this window open while I save your request.</p></div>;
  }
  if (status === 'error') {
    return <div className="wiz-step wiz-completion-step" role="alert"><StatusIcon /><h3 className="wiz-step-title">Your request could not be sent.</h3><p className="wiz-step-description">{error}</p><button type="button" className="wiz-action-primary" onClick={submit}>Try again</button><button type="button" className="wiz-action-secondary" onClick={onClose}>Return to select the services.</button></div>;
  }

  const title = outcome === 'waitlisted' && step.waitlistTitle ? step.waitlistTitle : step.title;
  const message = outcome === 'waitlisted' && step.waitlistMessage ? step.waitlistMessage : step.message;
  return (
    <div className="wiz-step wiz-completion-step" aria-live="polite">
      <StatusIcon />
      <h3 className="wiz-step-title">{title}</h3>
      {message && <p className="wiz-step-description">{message}</p>}
      {submissionId && <p className="wiz-submission-id">Your reference ID: <strong>{submissionId}</strong></p>}
      <button type="button" className="wiz-action-primary" onClick={onClose}>{step.buttonLabel ?? 'Return to select the services.'}</button>
    </div>
  );
}
