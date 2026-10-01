'use client';

import { useCalculatorSettings } from '../context/CalculatorSettingsContext';
import { useServiceCatalog } from '../context/ServiceCatalogContext';
import { useWizard } from '../context/WizardContext';
import { getServiceFamily } from '../data/serviceCatalog';
import { getRuntimeWizard } from '../data/wizardFlows';
import { getEntryPricingConfig } from '../data/wizardAvailability';
import { WIZARDS } from '../data/wizards';

function entryAnswers(wizard, entry) {
  if (!entry?.stepId || !entry?.optionId) return {};
  const step = wizard?.steps?.find((candidate) => candidate.id === entry.stepId);
  const option = step?.type === 'single-select'
    ? step.options?.find((candidate) => candidate.id === entry.optionId && candidate.isActive !== false)
    : null;
  return option ? { [step.id]: option.id } : {};
}

function isOfferAvailable(offer, flowSettings, calculatorSettings) {
  const wizard = getRuntimeWizard(WIZARDS[offer.wizardId], flowSettings?.[offer.wizardId]);
  if (!wizard || wizard.isActive === false) return false;
  const pricingConfigId = getEntryPricingConfig(offer.wizardId, offer.entry);
  if (pricingConfigId && calculatorSettings?.[pricingConfigId]?.isActive === false) return false;
  if (!offer.entry?.stepId) return true;
  return Object.keys(entryAnswers(wizard, offer.entry)).length > 0;
}

export default function ServiceOfferSelector({ familyId, variant = 'page', onBack }) {
  const { catalog } = useServiceCatalog();
  const { flowSettings, settings } = useCalculatorSettings();
  const { openWizard } = useWizard();
  const family = getServiceFamily(catalog, familyId);
  const offers = (family?.offers || []).filter((offer) => offer.isActive !== false && isOfferAvailable(offer, flowSettings, settings));

  function openOffer(offer) {
    const wizard = getRuntimeWizard(WIZARDS[offer.wizardId], flowSettings?.[offer.wizardId]);
    if (!wizard || wizard.isActive === false) return;
    openWizard(wizard, { initialAnswers: entryAnswers(wizard, offer.entry) });
  }

  if (!family || family.isActive === false || !offers.length) return null;

  if (variant === 'link') {
    return (
      <section className="srv-section" aria-labelledby={`service-offers-${family.id}`}>
        {onBack ? <button type="button" className="srv-back" onClick={onBack}>‹ All services</button> : null}
        <p className="srv-note">{family.title}</p>
        <h1 id={`service-offers-${family.id}`} className="srv-section-title">{family.ctaTitle || 'What are you looking for?'}</h1>
        {family.ctaDescription ? <p className="srv-note">{family.ctaDescription}</p> : null}
        <div className="srv-cards-list">
          {offers.map((offer) => (
            <button type="button" className="srv-card" key={offer.id} onClick={() => openOffer(offer)}>
              <span className="srv-card-icon" aria-hidden="true">✦</span>
              <span className="srv-card-text"><strong className="srv-card-name">{offer.label}</strong>{offer.description ? <span className="srv-card-desc">{offer.description}</span> : null}</span>
              <span className="srv-card-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="service-offer-selector" id="service-offers" aria-labelledby={`service-offers-${family.id}`}>
      <div className="service-offer-selector__intro">
        <p className="service-offer-selector__eyebrow">Commission request</p>
        <h2 id={`service-offers-${family.id}`}>{family.ctaTitle || 'What are you looking for?'}</h2>
        {family.ctaDescription ? <p>{family.ctaDescription}</p> : null}
      </div>
      <div className="service-offer-selector__choices">
        {offers.map((offer) => (
          <button type="button" className="service-offer-selector__choice" key={offer.id} onClick={() => openOffer(offer)}>
            <strong>{offer.label}</strong>
            {offer.description ? <span>{offer.description}</span> : null}
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}
