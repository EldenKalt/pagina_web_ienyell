'use client';

import { useEffect, useState } from 'react';
import { resolveNext, useWizard } from '../../context/WizardContext';
import { useCalculatorSettings } from '../../context/CalculatorSettingsContext';
import InfoStep from './steps/InfoStep';
import SingleSelectStep from './steps/SingleSelectStep';
import MultiSelectStep from './steps/MultiSelectStep';
import TextInputStep from './steps/TextInputStep';
import SummaryStep from './steps/SummaryStep';
import ChecklistStep from './steps/ChecklistStep';
import BlockingStep from './steps/BlockingStep';
import ContactFormStep from './steps/ContactFormStep';
import CalculatorStep from './steps/CalculatorStep';
import BudgetCheckStep from './steps/BudgetCheckStep';
import CompletionStep from './steps/CompletionStep';
import { CALCULATOR_OPTION_VISIBILITY } from '../../data/wizardAvailability';

function getVisibleStep(step, wizardId, settings) {
  const optionMap = CALCULATOR_OPTION_VISIBILITY[wizardId]?.[step.id];
  if (!optionMap || !Array.isArray(step.options)) return step;
  return {
    ...step,
    options: step.options.filter((option) => settings?.[optionMap[option.id]]?.isActive !== false),
  };
}

function StepRenderer({ step, answers, allSteps, wizardConfig, setAnswer, navigateTo, closeWizard, outcome, settings }) {
  const visibleStep = getVisibleStep(step, wizardConfig?.id, settings);
  const value = answers[visibleStep.id];

  switch (visibleStep.type) {
    case 'info':
      return <InfoStep step={visibleStep} />;
    case 'single-select':
      return <SingleSelectStep step={visibleStep} value={value} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} allAnswers={answers} />;
    case 'multi-select':
      return <MultiSelectStep step={visibleStep} value={value ?? []} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} />;
    case 'text-input':
      return <TextInputStep step={visibleStep} value={value ?? ''} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} />;
    case 'checklist':
      return <ChecklistStep step={visibleStep} value={value ?? {}} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} />;
    case 'blocking':
      return <BlockingStep step={visibleStep} onAction={navigateTo} onClose={closeWizard} />;
    case 'contact-form':
      return <ContactFormStep step={visibleStep} value={value ?? {}} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} />;
    case 'calculator':
      return <CalculatorStep step={visibleStep} value={value} onChange={(nextValue) => setAnswer(visibleStep.id, nextValue)} answers={answers} allSteps={allSteps} />;
    case 'budget-check':
      return <BudgetCheckStep step={visibleStep} answers={answers} onYes={() => navigateTo(visibleStep.yesStepId)} onNo={() => navigateTo(visibleStep.noStepId)} />;
    case 'completion':
      return <CompletionStep step={visibleStep} onClose={closeWizard} outcome={outcome} wizardConfig={wizardConfig} answers={answers} />;
    case 'summary':
      return <SummaryStep step={visibleStep} answers={answers} allSteps={allSteps} />;
    default:
      return <p className="wiz-step-description">Unknown wizard step: {step.type}</p>;
  }
}

function isContactFormComplete(step, value = {}) {
  const fieldsComplete = (step.fields ?? []).every((field) => {
    if (!field.required) return true;
    const fieldValue = value[field.id];
    return Array.isArray(fieldValue) ? fieldValue.length > 0 : Boolean(String(fieldValue ?? '').trim());
  });
  const checkboxesComplete = (step.checkboxes ?? []).every((checkbox) => !checkbox.required || value[checkbox.id]);
  return fieldsComplete && checkboxesComplete;
}

function canUseNext(step, answer) {
  if (step.type === 'info' || step.type === 'summary') return true;
  if (step.type === 'single-select') return Boolean(answer);
  if (step.type === 'multi-select') return (answer?.length ?? 0) >= (step.min ?? 0);
  if (step.type === 'text-input') return !step.required || Boolean(String(answer ?? '').trim());
  return true;
}

export default function WizardModal() {
  const {
    isOpen,
    wizardConfig,
    currentStepId,
    currentStep,
    answers,
    direction,
    outcome,
    canGoBack,
    closeWizard,
    navigateTo,
    goBack,
    setAnswer,
  } = useWizard();
  const { settings } = useCalculatorSettings();
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    setValidationMessage('');
  }, [currentStepId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeWizard();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeWizard]);

  if (!isOpen || !currentStep) return null;

  const steps = wizardConfig?.steps ?? [];

  const moveToNext = () => {
    const nextStepId = resolveNext(currentStep, answers, steps);
    if (nextStepId) navigateTo(nextStepId);
  };

  const handleNext = () => {
    const answer = answers[currentStep.id];

    if (currentStep.type === 'checklist') {
      const missingRequired = (currentStep.items ?? []).some((item) => item.required && !answer?.[item.id]);
      if (missingRequired && currentStep.blockingStepId) {
        navigateTo(currentStep.blockingStepId);
        return;
      }
    }

    if (currentStep.type === 'contact-form' && !isContactFormComplete(currentStep, answer)) {
      setValidationMessage('Please complete every required field and accept the required terms.');
      return;
    }

    if (currentStep.type === 'calculator' && !answer?.estimate) {
      setValidationMessage('Select the available options to calculate an estimate.');
      return;
    }

    if (!canUseNext(currentStep, answer)) {
      setValidationMessage('Please complete this step before continuing.');
      return;
    }

    moveToNext();
  };

  const noGenericNext = ['blocking', 'completion', 'budget-check'];
  const hasNext = Boolean(resolveNext(currentStep, answers, steps));
  const showNext = !noGenericNext.includes(currentStep.type) && hasNext;

  return (
    <div className="wiz-overlay" role="presentation" onMouseDown={closeWizard}>
      <section className="wiz-popup" role="dialog" aria-modal="true" aria-labelledby="wiz-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="wiz-return" onClick={canGoBack ? goBack : closeWizard}>‹ Return</button>
        <div className="wiz-content" key={currentStepId} data-direction={direction}>
          <StepRenderer
            step={currentStep}
            answers={answers}
            allSteps={wizardConfig.steps}
            wizardConfig={wizardConfig}
            setAnswer={setAnswer}
            navigateTo={navigateTo}
            closeWizard={closeWizard}
            outcome={outcome}
            settings={settings}
          />
          {validationMessage && <p className="wiz-validation-message" role="alert">{validationMessage}</p>}
        </div>
        {showNext && <button type="button" className="wiz-next-btn" onClick={handleNext}>Next</button>}
      </section>
    </div>
  );
}
