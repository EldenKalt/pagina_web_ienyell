'use client';

import { useCalculatorSettings } from '../context/CalculatorSettingsContext';
import { useWizard } from '../context/WizardContext';
import { WIZARDS } from '../data/wizards';
import { getRuntimeWizard } from '../data/wizardFlows';

export default function CommissionFlowCta({ wizardId, title = 'Ready to start your commission?', description = 'Answer a few focused questions to receive an estimate and send the complete request in one place.' }) {
  const { openWizard } = useWizard();
  const { flowSettings } = useCalculatorSettings();

  function openCommissionFlow() {
    const wizard = getRuntimeWizard(WIZARDS[wizardId], flowSettings?.[wizardId]);
    if (wizard?.isActive !== false) openWizard(wizard);
  }

  return (
    <section className="commission-flow-cta" aria-labelledby={`commission-flow-${wizardId}`}>
      <div>
        <p className="commission-flow-cta__eyebrow">Commission request</p>
        <h2 id={`commission-flow-${wizardId}`}>{title}</h2>
        <p>{description}</p>
      </div>
      <button type="button" className="commission-flow-cta__button" onClick={openCommissionFlow}>Start your request</button>
    </section>
  );
}
