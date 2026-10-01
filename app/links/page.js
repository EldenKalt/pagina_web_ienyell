'use client';

import LinkInBioCarousel from '../../components/linkinbio/LinkInBioCarousel';
import IntentionCard from '../../components/linkinbio/IntentionCard';
import { carouselSlides, intentionButtons } from '../../data/linkInBioConfig';
import { useWizard } from '../../context/WizardContext';
import { useCalculatorSettings } from '../../context/CalculatorSettingsContext';
import { WIZARDS } from '../../data/wizards';
import { getRuntimeWizard } from '../../data/wizardFlows';
import { useLinkButtonVisibility } from '../../context/LinkButtonVisibilityContext';

export default function LinkInBioPage() {
  const { openWizard } = useWizard();
  const { flowSettings } = useCalculatorSettings();
  const { settings: linkButtonSettings } = useLinkButtonVisibility();
  const activeSlides = carouselSlides.filter((slide) => slide.active);
  const activeButtons = intentionButtons
    .filter((button) => button.active !== false && linkButtonSettings?.buttons?.[button.id] !== false)
    .sort((a, b) => a.order - b.order);

  const openIntentionWizard = (wizardId) => {
    const wizard = WIZARDS[wizardId];
    if (!wizard) return;
    const runtimeWizard = getRuntimeWizard(wizard, flowSettings?.[wizardId]);
    if (runtimeWizard?.isActive !== false) openWizard(runtimeWizard);
  };

  return (
    <main className="lib-page">
      {activeSlides.length > 0 && <section className="lib-carousel-section" aria-label="Featured content"><LinkInBioCarousel slides={activeSlides} /></section>}
      <section className="lib-intentions-section"><h2 className="lib-intentions-title">What do you want?</h2><div className="lib-intentions-list">{activeButtons.map((button) => <IntentionCard key={button.id} iconKey={button.iconKey} title={button.title} subtitle={button.subtitle} href={button.wizardId ? undefined : button.href} color={button.color} wizardId={button.wizardId} onClick={button.wizardId ? () => openIntentionWizard(button.wizardId) : undefined} />)}</div></section>
    </main>
  );
}
