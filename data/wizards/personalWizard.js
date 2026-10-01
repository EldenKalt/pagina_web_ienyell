import { sharedWaitlistSteps } from './_sharedSteps';

export const personalWizard = {
  id: 'personal', title: 'For personal uses',
  steps: [
    { id: 'personal-service', type: 'single-select', title: 'What do you need?', description: 'Choose the commission that best fits your idea.', options: [
      { id: 'portrait', label: 'Portrait', description: 'A custom portrait of you or your character.' },
      { id: 'pet', label: 'Pet portrait', description: 'An illustrated portrait of your companion.' },
      { id: 'wedding', label: 'Wedding illustration', description: 'A memorable illustration for your special day.' },
      { id: 'gift', label: 'Gift illustration', description: 'A personal, custom gift for someone special.' },
      { id: 'merch', label: 'Personal merch / print', description: 'Artwork prepared for a personal print, sticker or product.' },
    ], next: (answers) => answers['personal-service'] === 'merch' ? 'personal-req-merch' : 'personal-requirements' },
    { id: 'personal-req-merch', type: 'checklist', title: 'Prepare your personal merch request', description: 'Mark what you already know about the piece.', items: [
      { id: 'product', label: 'I know the product or print format.', detail: 'Sticker, art print, shirt, invitation or another personal item.', required: true },
      { id: 'references', label: 'I have subject and style references.', detail: 'Photos, character references or visual examples.', required: true },
      { id: 'use', label: 'This is for personal, non-commercial use.', detail: 'Commercial products need the Studio or Brand path.', required: true },
    ], blockingStepId: 'personal-sorry-missing', next: 'personal-calc-merch' },
    { id: 'personal-requirements', type: 'checklist', title: 'A few things to prepare', description: 'Mark everything you already have.', items: [
      { id: 'references', label: 'I have reference photos.', detail: 'Photos help me represent people, pets and outfits accurately.', required: true },
      { id: 'clear-idea', label: 'I have a clear idea.', detail: 'A short description of pose, mood and desired details.', required: true },
      { id: 'budget', label: 'I have a budget in mind.', detail: 'The calculator will help you confirm it.', required: true },
    ], blockingStepId: 'personal-sorry-missing', next: 'personal-specific-services' },
    { id: 'personal-sorry-missing', type: 'blocking', title: "Let's prepare the idea first.", description: 'I need those details to create a result you will love.', primaryAction: { label: 'I want help defining it!', stepId: 'personal-specific-services' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },
    { id: 'personal-specific-services', type: 'multi-select', title: 'Choose any extras', description: 'Select everything that applies to your commission.', options: [
      { id: 'background', label: 'Background', description: 'A setting or decorative environment.' },
      { id: 'print-ready', label: 'Print-ready file', description: 'Prepared for a personal print or gift.' },
    ], next: (answers) => answers['personal-service'] === 'pet' ? 'personal-calc-pet' : 'personal-calculator' },
    { id: 'personal-calculator', type: 'calculator', pricingConfigId: 'portraits', title: "Here's your estimate", description: 'Configure your commission to see the price. You can add extra humans or animals separately.', addonDefaults: (answers) => {
      const extras = answers['personal-specific-services'] || [];
      return { bg_detail: extras.includes('background') };
    }, next: 'personal-budget' },
    { id: 'personal-calc-pet', type: 'calculator', pricingConfigId: 'petPortraits', title: "Here's your estimate", description: 'Pet portraits include a premium for animal anatomy. You can add extra animals or humans.', addonDefaults: (answers) => {
      const extras = answers['personal-specific-services'] || [];
      return { bg_detail: extras.includes('background') };
    }, next: 'personal-budget' },
    { id: 'personal-calc-merch', type: 'calculator', pricingConfigId: 'merch', title: "Here's your estimate", description: 'This covers the master artwork. Printing and production are handled separately.', next: 'personal-budget-merch' },
    { id: 'personal-budget', type: 'budget-check', title: 'Can you afford this budget?', yesStepId: 'personal-contact', noStepId: 'waitlist-offer' },
    { id: 'personal-budget-merch', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'personal-calc-merch', yesStepId: 'personal-contact', noStepId: 'waitlist-offer' },
    { id: 'personal-contact', type: 'contact-form', title: 'Introduce your contact info', description: 'I will send your quote to your email.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe your idea.', placeholder: 'Tell me about the subject, mood, pose and details...', hints: ['Who or what should be illustrated (people, pets, both)', 'Desired pose, setting or mood', 'Important colors, outfits or accessories', 'Whether you need a background or specific format'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'personal-done' },
    { id: 'personal-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll send you a quote soon. Thanks for your time!", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
