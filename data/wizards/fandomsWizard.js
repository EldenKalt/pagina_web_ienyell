import { sharedWaitlistSteps } from './_sharedSteps';

export const fandomsWizard = {
  id: 'fandoms', title: 'For fandoms',
  steps: [
    // ── Step 1: Service type ──
    { id: 'fandom-service', type: 'single-select', title: 'What do you need?', description: 'Tell me what you want to create for your fandom.', options: [
      { id: 'fanart', label: 'Fanart', description: 'A custom take on your favorite character.' },
      { id: 'custom-merch', label: 'Custom merch', description: 'Stickers, prints, bookmarks and more with your fandom art.' },
    ], next: (answers) => ({
      'fanart': 'fandom-req-fanart',
      'custom-merch': 'fandom-req-merch',
    })[answers['fandom-service']] ?? 'fandom-req-fanart' },

    // ═══════════════════════════════════════════
    // FANART path
    // ═══════════════════════════════════════════
    { id: 'fandom-req-fanart', type: 'checklist', title: 'A few things to prepare', description: 'Mark everything you have ready.', items: [
      { id: 'character-refs', label: 'I have character references.', detail: 'Official images or useful visual examples.', required: true },
      { id: 'style-refs', label: 'I have style references.', detail: 'Examples of the mood or result you prefer.', required: true },
      { id: 'clear-idea', label: 'I have a clear idea.', detail: 'A short explanation of your commission.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help confirm it.', required: true },
    ], blockingStepId: 'fandom-sorry-fanart', next: 'fandom-calc-fanart' },

    { id: 'fandom-sorry-fanart', type: 'blocking', title: "Let's prepare your references first.", description: 'I need enough direction to make the fanart feel right.', primaryAction: { label: 'I want help defining it!', stepId: 'fandom-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'fandom-calc-fanart', type: 'calculator', pricingConfigId: 'fanart',
      title: "Here's your estimate",
      description: 'Fanart is for personal use only — commercial licensing is not available for derivative works.',
      next: 'fandom-budget-fanart' },

    { id: 'fandom-budget-fanart', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'fandom-calc-fanart', yesStepId: 'fandom-contact', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // CUSTOM MERCH path
    // ═══════════════════════════════════════════
    { id: 'fandom-req-merch', type: 'checklist', title: 'Prepare your merch request', description: 'Mark what you have ready.', items: [
      { id: 'character-refs', label: 'I have character or design references.', detail: 'Official images, screenshots or visual examples.', required: true },
      { id: 'product-idea', label: 'I know what product I want.', detail: 'Stickers, prints, bookmarks, phone cases, etc.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help confirm it.', required: true },
    ], blockingStepId: 'fandom-sorry-merch', next: 'fandom-calc-merch' },

    { id: 'fandom-sorry-merch', type: 'blocking', title: 'I need a concept to start the merch.', description: 'A clear product idea and character references are necessary to create your fandom merch.', primaryAction: { label: 'I want help defining it!', stepId: 'fandom-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'fandom-calc-merch', type: 'calculator', pricingConfigId: 'merch',
      title: "Here's your estimate",
      description: 'Select the product type and complexity. This covers the master artwork only — production and printing are separate.',
      next: 'fandom-budget-merch' },

    { id: 'fandom-budget-merch', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'fandom-calc-merch', yesStepId: 'fandom-contact', noStepId: 'waitlist-offer' },

    // ── Contact and completion ──
    { id: 'fandom-contact', type: 'contact-form', title: 'Introduce your contact info', description: 'I will send your quote to your email.', fields: [
      { id: 'name', type: 'text', label: 'Name', required: true },
      { id: 'email', type: 'email', label: 'Email', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the commission.', placeholder: 'Character, fandom, pose, mood and must-have details...' },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'fandom-done' },
    { id: 'fandom-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll send you a quote soon. Thanks for your time!", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
