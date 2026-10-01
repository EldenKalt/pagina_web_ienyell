import { sharedWaitlistSteps } from './_sharedSteps';

export const studiosWizard = {
  id: 'studios', title: 'For studios',
  steps: [
    // ── Step 1: Service type ──
    { id: 'studio-service', type: 'single-select', title: 'What does your studio need?', description: 'Choose the service that best matches your scope.', options: [
      { id: 'concept-art', label: 'Concept art', description: 'Early visual exploration for a project.' },
      { id: 'character-development', label: 'Character development', description: 'Character sheets and visual language.' },
      { id: 'visual-key', label: 'Visual key', description: 'A defining image for the project direction.' },
      { id: 'environment', label: 'Environment design', description: 'Locations, props and atmosphere.' },
      { id: 'merch-illustration', label: 'Merch illustration', description: 'Artwork for product and campaign use.' },
      { id: 'custom-scope', label: 'Custom scope', description: 'A broader or non-standard production need.' },
    ], next: 'studio-requirements' },

    // ── Step 2: Requirements ──
    { id: 'studio-requirements', type: 'checklist', title: 'Project preparation', description: 'Mark the material your team has ready.', items: [
      { id: 'brief', label: 'We have a project brief.', detail: 'Goals, audience and required deliverables are documented.', required: true },
      { id: 'style-guide', label: 'We have a style guide, if available.', detail: 'Existing visual rules help maintain consistency.', required: false },
      { id: 'timeline', label: 'We have a delivery timeline.', detail: 'Include milestones and final deadline.', required: true },
    ], blockingStepId: 'studio-sorry-missing', next: (answers) => {
      const svc = answers['studio-service'];
      const extrasMap = {
        'concept-art': 'studio-extras-concept',
        'character-development': 'studio-extras-character',
        'visual-key': 'studio-extras-visual-key',
        'environment': 'studio-extras-environment',
        'merch-illustration': 'studio-extras-merch',
        'custom-scope': 'studio-contact',
      };
      return extrasMap[svc] || 'studio-contact';
    } },
    { id: 'studio-sorry-missing', type: 'blocking', title: 'I need a clearer production scope.', description: 'A brief and timeline are essential to estimate studio work accurately.', primaryAction: { label: 'I want help defining it!', stepId: 'studio-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    // ── Step 3: Extras per service ──

    // Concept art extras
    { id: 'studio-extras-concept', type: 'multi-select', title: 'Concept art details', description: 'What are you exploring?', min: 1, options: [
      { id: 'characters', label: 'Characters', description: 'Character looks, silhouettes and poses.' },
      { id: 'environments', label: 'Environments / landscapes', description: 'Locations, architecture and atmosphere.' },
      { id: 'props', label: 'Props and objects', description: 'Items, weapons, vehicles or key objects.' },
      { id: 'atmosphere', label: 'Atmosphere and mood', description: 'Color keys, lighting and tonal explorations.' },
    ], next: 'studio-calc-concept' },

    // Character development extras
    { id: 'studio-extras-character', type: 'multi-select', title: 'Character development details', description: 'What do you need for this character?', min: 1, options: [
      { id: 'basic-design', label: 'Basic character design', description: 'Front view with main outfit and features.' },
      { id: 'turnaround', label: 'Turnaround / rotation', description: 'Multiple angles for production consistency.' },
      { id: 'expressions', label: 'Expression sheet', description: 'Key emotions and facial variations.' },
      { id: 'outfits', label: 'Alternate outfits', description: 'Additional costume or wardrobe variations.' },
    ], next: 'studio-calc-character' },

    // Visual key extras
    { id: 'studio-extras-visual-key', type: 'multi-select', title: 'Visual key details', description: 'What should the key image capture?', min: 1, options: [
      { id: 'motif', label: 'Simple motif or element', description: 'A symbolic or iconic representation.' },
      { id: 'character-focus', label: 'Character + atmosphere', description: 'A character in context with mood and tone.' },
      { id: 'full-scene', label: 'Full scene', description: 'A complete narrative composition.' },
    ], next: 'studio-calc-visual-key' },

    // Environment extras
    { id: 'studio-extras-environment', type: 'multi-select', title: 'Environment details', description: 'What kind of environment?', min: 1, options: [
      { id: 'interior', label: 'Interior', description: 'Rooms, interiors and closed spaces.' },
      { id: 'exterior', label: 'Exterior / landscape', description: 'Open-air locations and scenery.' },
      { id: 'urban', label: 'Urban / architectural', description: 'Buildings, streets and cityscapes.' },
      { id: 'fantasy', label: 'Fantasy or sci-fi', description: 'Imagined worlds and non-realistic settings.' },
    ], next: 'studio-calc-environment' },

    // Merch extras
    { id: 'studio-extras-merch', type: 'multi-select', title: 'Merch details', description: 'What product is the art for?', min: 1, options: [
      { id: 'sticker', label: 'Sticker design', description: 'A compact design ready for stickers.' },
      { id: 'print', label: 'Art print / poster', description: 'Artwork for wall prints or posters.' },
      { id: 'clothing', label: 'T-shirt / clothing', description: 'Illustration for apparel.' },
      { id: 'packaging', label: 'Packaging or product', description: 'Artwork for a physical product.' },
    ], next: 'studio-calc-merch' },

    // ── Step 4: Calculators per service ──

    { id: 'studio-calc-concept', type: 'calculator', pricingConfigId: 'studioConceptArt',
      title: "Here's your estimate",
      description: 'Concept art is priced per exploration. Scope, detail level and quantity affect the range.',
      selectionDefaults: (answers) => {
        const extras = answers['studio-extras-concept'] || [];
        return { scopeCount: extras.length || 1 };
      },
      next: 'studio-budget-concept' },

    { id: 'studio-calc-character', type: 'calculator', pricingConfigId: 'studioCharacter',
      title: "Here's your estimate",
      description: 'Character development includes the base design. Turnaround and expressions are optional add-ons.',
      addonDefaults: (answers) => {
        const extras = answers['studio-extras-character'] || [];
        return {
          turnaround: extras.includes('turnaround'),
          expressions: extras.includes('expressions'),
        };
      },
      next: 'studio-budget-character' },

    { id: 'studio-calc-visual-key', type: 'calculator', pricingConfigId: 'studioVisualKey',
      title: "Here's your estimate",
      description: 'Visual key pricing depends on scope, detail level and quantity.',
      selectionDefaults: (answers) => {
        const extras = answers['studio-extras-visual-key'] || [];
        return { scopeCount: extras.length || 1 };
      },
      next: 'studio-budget-visual-key' },

    { id: 'studio-calc-environment', type: 'calculator', pricingConfigId: 'studioEnvironment',
      title: "Here's your estimate",
      description: 'Environment design is priced by scope, detail level and quantity.',
      selectionDefaults: (answers) => {
        const extras = answers['studio-extras-environment'] || [];
        return { scopeCount: extras.length || 1 };
      },
      next: 'studio-budget-environment' },

    { id: 'studio-calc-merch', type: 'calculator', pricingConfigId: 'merch',
      title: "Here's your estimate",
      description: 'Merch pricing depends on the product type and complexity of the artwork.',
      next: 'studio-budget-merch' },

    // ── Step 5: Budget checks (one per calculator, all route to same contact) ──
    { id: 'studio-budget-concept', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'studio-calc-concept', yesStepId: 'studio-contact', noStepId: 'waitlist-offer' },
    { id: 'studio-budget-character', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'studio-calc-character', yesStepId: 'studio-contact', noStepId: 'waitlist-offer' },
    { id: 'studio-budget-visual-key', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'studio-calc-visual-key', yesStepId: 'studio-contact', noStepId: 'waitlist-offer' },
    { id: 'studio-budget-environment', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'studio-calc-environment', yesStepId: 'studio-contact', noStepId: 'waitlist-offer' },
    { id: 'studio-budget-merch', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'studio-calc-merch', yesStepId: 'studio-contact', noStepId: 'waitlist-offer' },

    // ── Step 6: Contact ──
    { id: 'studio-contact', type: 'contact-form', title: 'Studio contact information', description: 'Share your production details and I will prepare a tailored quote.', fields: [
      { id: 'studioName', type: 'text', label: 'Studio or company name', required: true },
      { id: 'name', type: 'text', label: 'Contact name', required: true },
      { id: 'email', type: 'email', label: 'Work email', required: true },
      { id: 'budget', type: 'text', label: 'Approximate budget', placeholder: 'USD range', required: true },
      { id: 'workType', type: 'text', label: 'Type of work / area', required: true },
      { id: 'deadline', type: 'text', label: 'Delivery date and urgency', required: true },
      { id: 'description', type: 'textarea', label: 'Project scope', placeholder: 'Goals, deliverables, audience, timeline and technical requirements...' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'studio-done' },
    { id: 'studio-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll review your studio brief and send a quote soon.", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
