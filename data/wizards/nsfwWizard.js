import { sharedWaitlistSteps } from './_sharedSteps';

export const nsfwWizard = {
  id: 'nsfw', title: 'NSFW content',
  steps: [
    // ── Step 1: Service type ──
    { id: 'nsfw-service', type: 'single-select', title: 'What do you need?', description: 'Choose the kind of NSFW commission you are looking for.', options: [
      { id: 'character', label: 'Character illustration', description: 'An explicit or suggestive character piece.' },
      { id: 'scene', label: 'Scene illustration', description: 'A full NSFW scene with setting and action.' },
      { id: 'anthro', label: 'Anthropomorphic work', description: 'Custom anthro or creature-focused artwork.' },
    ], next: (answers) => ({
      'character': 'nsfw-req-character',
      'scene': 'nsfw-req-scene',
      'anthro': 'nsfw-req-anthro',
    })[answers['nsfw-service']] ?? 'nsfw-req-character' },

    // ═══════════════════════════════════════════
    // CHARACTER path
    // ═══════════════════════════════════════════
    { id: 'nsfw-req-character', type: 'checklist', title: 'Requirements and restrictions', description: 'Confirm all the following before continuing.', items: [
      { id: 'age', label: 'I confirm I am 18 years old or older.', detail: 'NSFW commissions are for adults only.', required: true },
      { id: 'description', label: 'I have a detailed description.', detail: 'Include pose, mood and important details.', required: true },
      { id: 'references', label: 'I have character references.', detail: 'References help define the character and visual direction.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help confirm it.', required: true },
    ], blockingStepId: 'nsfw-sorry-character', next: 'nsfw-calc-character' },

    { id: 'nsfw-sorry-character', type: 'blocking', title: 'I need those details before starting.', description: 'Age confirmation, clear description and references are required for NSFW content.', primaryAction: { label: 'I want help defining it!', stepId: 'nsfw-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'nsfw-calc-character', type: 'calculator', pricingConfigId: 'nsfw',
      title: "Here's your estimate",
      description: 'Choose the style, finish and framing. NSFW markup is included in base prices.',
      next: 'nsfw-budget-character' },

    { id: 'nsfw-budget-character', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'nsfw-calc-character', yesStepId: 'nsfw-contact', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // SCENE path
    // ═══════════════════════════════════════════
    { id: 'nsfw-req-scene', type: 'checklist', title: 'Requirements and restrictions', description: 'Confirm all the following before continuing.', items: [
      { id: 'age', label: 'I confirm I am 18 years old or older.', detail: 'NSFW commissions are for adults only.', required: true },
      { id: 'description', label: 'I have a detailed scene description.', detail: 'Include characters, setting, action and boundaries.', required: true },
      { id: 'references', label: 'I have reference images.', detail: 'References help define characters and the visual direction.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help confirm it.', required: true },
    ], blockingStepId: 'nsfw-sorry-scene', next: 'nsfw-calc-scene' },

    { id: 'nsfw-sorry-scene', type: 'blocking', title: 'I need those details before starting.', description: 'Age confirmation, scene boundaries and references are required for NSFW content.', primaryAction: { label: 'I want help defining it!', stepId: 'nsfw-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'nsfw-calc-scene', type: 'calculator', pricingConfigId: 'nsfw',
      title: "Here's your estimate",
      description: 'Scene pricing includes explicit scene and detailed setting. Choose your style and framing.',
      addonDefaults: () => ({ explicit_scene: true }),
      next: 'nsfw-budget-scene' },

    { id: 'nsfw-budget-scene', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'nsfw-calc-scene', yesStepId: 'nsfw-contact', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // ANTHRO path
    // ═══════════════════════════════════════════
    { id: 'nsfw-req-anthro', type: 'checklist', title: 'Requirements and restrictions', description: 'Confirm all the following before continuing.', items: [
      { id: 'age', label: 'I confirm I am 18 years old or older.', detail: 'NSFW commissions are for adults only.', required: true },
      { id: 'description', label: 'I have a detailed description.', detail: 'Include species, anatomy details and boundaries.', required: true },
      { id: 'references', label: 'I have reference images or species description.', detail: 'Anthro work requires clear visual direction.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help confirm it.', required: true },
    ], blockingStepId: 'nsfw-sorry-anthro', next: 'nsfw-calc-anthro' },

    { id: 'nsfw-sorry-anthro', type: 'blocking', title: 'I need those details before starting.', description: 'Age confirmation, anatomy references and clear description are required for anthro NSFW content.', primaryAction: { label: 'I want help defining it!', stepId: 'nsfw-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'nsfw-calc-anthro', type: 'calculator', pricingConfigId: 'nsfw',
      title: "Here's your estimate",
      description: 'Anthro pricing includes complex anatomy. Choose your style and framing.',
      addonDefaults: () => ({ complex_anatomy: true }),
      next: 'nsfw-budget-anthro' },

    { id: 'nsfw-budget-anthro', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'nsfw-calc-anthro', yesStepId: 'nsfw-contact', noStepId: 'waitlist-offer' },

    // ── Contact and completion ──
    { id: 'nsfw-contact', type: 'contact-form', title: 'Introduce your contact info', description: 'I will send your quote discreetly to your email.', fields: [
      { id: 'name', type: 'text', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'Email', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the commission.', placeholder: 'Characters, limits, scene, pose and required details...', required: true },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'nsfw-done' },
    { id: 'nsfw-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll review your request and send a quote soon.", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
