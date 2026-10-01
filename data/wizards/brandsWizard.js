import { sharedWaitlistSteps } from './_sharedSteps';

export const brandsWizard = {
  id: 'brands', title: 'For brands',
  steps: [
    // ── Step 1: Service type ──
    { id: 'brand-service', type: 'single-select', title: 'What does your brand need?', description: 'Choose the kind of creative support you are looking for.', options: [
      { id: 'branding', label: 'Brand design', description: 'A complete identity and visual system.' },
      { id: 'logo', label: 'Logo', description: 'A distinctive mark for your brand.' },
      { id: 'banners', label: 'Banners and campaigns', description: 'Visual assets for launches and communication.' },
      { id: 'merch', label: 'Merchandise system', description: 'A coherent visual line for branded products.' },
    ], next: (answers) => ({
      'branding': 'brand-req-branding',
      'logo': 'brand-req-logo',
      'banners': 'brand-req-banners',
      'merch': 'brand-req-merch',
    })[answers['brand-service']] ?? 'brand-req-branding' },

    // ═══════════════════════════════════════════
    // BRANDING path
    // ═══════════════════════════════════════════
    { id: 'brand-req-branding', type: 'checklist', title: 'Brand preparation', description: 'Mark the information you have ready.', items: [
      { id: 'brief', label: 'I have a brand brief.', detail: 'Goals, audience, positioning and competitors.', required: true },
      { id: 'existing-assets', label: 'I have existing assets, if any.', detail: 'Logos, colors, copy or prior guidelines.', required: false },
      { id: 'timeline', label: 'I have a timeline in mind.', detail: 'Include milestones and launch date.', required: true },
    ], blockingStepId: 'brand-sorry-branding', next: 'brand-deliverables-branding' },

    { id: 'brand-sorry-branding', type: 'blocking', title: 'I need a brand brief to begin.', description: 'The brief gives the identity work the direction it needs.', primaryAction: { label: 'I want help defining it!', stepId: 'brand-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'brand-deliverables-branding', type: 'multi-select', title: 'What does your brand need?', description: 'Select all the deliverables you expect.', min: 1, options: [
      { id: 'identity', label: 'Visual identity', description: 'Logo, color palette and typography direction.' },
      { id: 'guidelines', label: 'Brand guidelines', description: 'A system your team can follow consistently.' },
      { id: 'stationery', label: 'Stationery and templates', description: 'Business cards, letterheads, presentations.' },
      { id: 'social', label: 'Social media kit', description: 'Profile images, covers and post templates.' },
    ], next: 'brand-contact' },

    // ═══════════════════════════════════════════
    // LOGO path
    // ═══════════════════════════════════════════
    { id: 'brand-req-logo', type: 'checklist', title: 'Logo preparation', description: 'Mark what you have ready.', items: [
      { id: 'name', label: 'I have the brand or product name.', detail: 'The final name the logo will represent.', required: true },
      { id: 'brief', label: 'I have a brief or concept.', detail: 'What the logo should communicate.', required: true },
      { id: 'existing-logo', label: 'I have an existing logo, if redesigning.', detail: 'Share it so the direction is clear.', required: false },
    ], blockingStepId: 'brand-sorry-logo', next: 'brand-deliverables-logo' },

    { id: 'brand-sorry-logo', type: 'blocking', title: 'I need a name and concept to start.', description: 'The brand name and a brief concept are essential for logo design.', primaryAction: { label: 'I want help defining it!', stepId: 'brand-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'brand-deliverables-logo', type: 'multi-select', title: 'What do you need?', description: 'Select all the logo deliverables you expect.', min: 1, options: [
      { id: 'logomark', label: 'Logomark (symbol)', description: 'An icon or symbol that represents the brand.' },
      { id: 'wordmark', label: 'Wordmark (text logo)', description: 'The brand name styled as a logo.' },
      { id: 'variations', label: 'Logo variations', description: 'Horizontal, vertical, monochrome, reversed.' },
      { id: 'usage', label: 'Usage guidelines', description: 'Clear spacing, size and placement rules.' },
    ], next: 'brand-contact' },

    // ═══════════════════════════════════════════
    // BANNERS path
    // ═══════════════════════════════════════════
    { id: 'brand-req-banners', type: 'checklist', title: 'Campaign preparation', description: 'Mark the information you have ready.', items: [
      { id: 'campaign-brief', label: 'I have a campaign brief.', detail: 'Objective, audience, channels and key message.', required: true },
      { id: 'brand-assets', label: 'I have brand assets to use.', detail: 'Logo, colors, fonts and imagery.', required: true },
      { id: 'sizes', label: 'I know the sizes and formats I need.', detail: 'Social, web, print or specific platforms.', required: false },
    ], blockingStepId: 'brand-sorry-banners', next: 'brand-deliverables-banners' },

    { id: 'brand-sorry-banners', type: 'blocking', title: 'I need a campaign brief and brand assets.', description: 'The brief and existing brand materials are necessary to create cohesive campaign assets.', primaryAction: { label: 'I want help defining it!', stepId: 'brand-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'brand-deliverables-banners', type: 'multi-select', title: 'What assets do you need?', description: 'Select all the formats and channels.', min: 1, options: [
      { id: 'social', label: 'Social media banners', description: 'Instagram, Facebook, Twitter/X, LinkedIn.' },
      { id: 'web', label: 'Web banners', description: 'Hero images, ads and landing page assets.' },
      { id: 'email', label: 'Email headers', description: 'Newsletter and campaign email assets.' },
      { id: 'print', label: 'Print materials', description: 'Flyers, posters and physical formats.' },
    ], next: 'brand-contact' },

    { id: 'brand-req-merch', type: 'checklist', title: 'Merchandise preparation', description: 'Mark what your brand already has ready.', items: [
      { id: 'brand-system', label: 'We have a brand identity or clear direction.', detail: 'Logo, colors, typography or an approved visual route.', required: true },
      { id: 'products', label: 'We know which products we need.', detail: 'Apparel, packaging, stickers, print products or a wider collection.', required: true },
      { id: 'production', label: 'We know the production requirements, if available.', detail: 'Sizes, printing method, colors and provider templates.', required: false },
    ], blockingStepId: 'brand-sorry-branding', next: 'brand-deliverables-merch' },

    { id: 'brand-deliverables-merch', type: 'multi-select', title: 'What should the system include?', description: 'Select all the branded merchandise assets you expect.', min: 1, options: [
      { id: 'master-art', label: 'Master artwork', description: 'Core visual artwork for the collection.' },
      { id: 'product-adaptations', label: 'Product adaptations', description: 'Layouts adapted to each format or product.' },
      { id: 'packaging', label: 'Packaging graphics', description: 'Labels, wraps, boxes or inserts.' },
      { id: 'campaign', label: 'Launch campaign assets', description: 'Images for announcing and promoting the collection.' },
    ], next: 'brand-contact' },

    // ── Contact and completion ──
    { id: 'brand-contact', type: 'contact-form', title: 'Business contact information', description: 'Brand projects are quoted according to scope.', fields: [
      { id: 'company', type: 'text', label: 'Company name', required: true },
      { id: 'name', type: 'text', label: 'Contact name', required: true },
      { id: 'email', type: 'email', label: 'Work email', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the project.', placeholder: 'Goals, audience, deliverables, timeline and existing assets...' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'brand-done' },
    { id: 'brand-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll review your brief and send a tailored quote soon.", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
