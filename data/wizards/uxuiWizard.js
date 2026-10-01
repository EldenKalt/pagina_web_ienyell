import { sharedWaitlistSteps } from './_sharedSteps';

export const uxuiWizard = {
  id: 'uxui', title: 'UX/UI',
  steps: [
    // ── Step 1: Service type ──
    { id: 'uxui-service', type: 'single-select', title: 'What do you need?', description: 'Choose the product design service that fits your project.', options: [
      { id: 'ui', label: 'UI design', description: 'Interfaces and visual systems.' },
      { id: 'ux', label: 'UX design', description: 'Research, flows and product structure.' },
      { id: 'web', label: 'Web development', description: 'A responsive website or web app.' },
      { id: 'commerce', label: 'Online store / merch shop', description: 'A digital storefront for products or merchandise.' },
    ], next: (answers) => ({
      'ui': 'uxui-req-ui',
      'ux': 'uxui-req-ux',
      'web': 'uxui-req-web',
      'commerce': 'uxui-req-web',
    })[answers['uxui-service']] ?? 'uxui-req-ui' },

    // ═══════════════════════════════════════════
    // UI DESIGN path
    // ═══════════════════════════════════════════
    { id: 'uxui-req-ui', type: 'checklist', title: 'UI project preparation', description: 'Mark the information you have ready.', items: [
      { id: 'brief', label: 'I have a project brief.', detail: 'Goals, audience and product context.', required: true },
      { id: 'design-refs', label: 'I have design references.', detail: 'Examples of interfaces or styles you like.', required: false },
      { id: 'scope', label: 'I know the expected scope.', detail: 'Number of screens, platforms and components.', required: true },
    ], blockingStepId: 'uxui-sorry-ui', next: 'uxui-deliverables-ui' },

    { id: 'uxui-sorry-ui', type: 'blocking', title: 'I need a clearer project scope.', description: 'A brief and expected scope are necessary to estimate interface design work.', primaryAction: { label: 'I want help defining it!', stepId: 'uxui-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'uxui-deliverables-ui', type: 'multi-select', title: 'What do you need?', description: 'Select all the UI deliverables you expect.', min: 1, options: [
      { id: 'screens', label: 'Interface screens', description: 'High-fidelity responsive designs.' },
      { id: 'design-system', label: 'Design system', description: 'Reusable components and visual tokens.' },
      { id: 'prototypes', label: 'Interactive prototypes', description: 'Clickable flows for testing or handoff.' },
      { id: 'icons', label: 'Icon set', description: 'Custom icons for the product.' },
    ], next: 'uxui-contact' },

    // ═══════════════════════════════════════════
    // UX DESIGN path
    // ═══════════════════════════════════════════
    { id: 'uxui-req-ux', type: 'checklist', title: 'UX project preparation', description: 'Mark the information you have ready.', items: [
      { id: 'brief', label: 'I have a project brief.', detail: 'Goals, audience and product context.', required: true },
      { id: 'wireframes', label: 'I have wireframes or sketches, if available.', detail: 'Existing flows or rough layouts are useful.', required: false },
      { id: 'research-goals', label: 'I have research goals.', detail: 'What do you want to learn about your users?', required: true },
    ], blockingStepId: 'uxui-sorry-ux', next: 'uxui-deliverables-ux' },

    { id: 'uxui-sorry-ux', type: 'blocking', title: 'I need a clearer project scope.', description: 'A brief and research goals are necessary to define UX work.', primaryAction: { label: 'I want help defining it!', stepId: 'uxui-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'uxui-deliverables-ux', type: 'multi-select', title: 'What do you need?', description: 'Select all the UX deliverables you expect.', min: 1, options: [
      { id: 'research', label: 'User research', description: 'Interviews, surveys and insights report.' },
      { id: 'wireframes', label: 'Wireframes', description: 'Structure and flow before visual design.' },
      { id: 'user-flows', label: 'User flows', description: 'Task diagrams and navigation maps.' },
      { id: 'testing', label: 'Usability testing', description: 'Test sessions with real users.' },
    ], next: 'uxui-contact' },

    // ═══════════════════════════════════════════
    // WEB DEVELOPMENT path
    // ═══════════════════════════════════════════
    { id: 'uxui-req-web', type: 'checklist', title: 'Web project preparation', description: 'Mark the information you have ready.', items: [
      { id: 'brief', label: 'I have a project brief.', detail: 'Goals, audience and content to publish.', required: true },
      { id: 'content', label: 'I have the content ready.', detail: 'Text, images and structure for the site.', required: true },
      { id: 'scope', label: 'I know the expected scope.', detail: 'Number of pages, features and integrations.', required: true },
    ], blockingStepId: 'uxui-sorry-web', next: 'uxui-deliverables-web' },

    { id: 'uxui-sorry-web', type: 'blocking', title: 'I need a clearer project scope.', description: 'A brief, content and expected scope are necessary to estimate web development.', primaryAction: { label: 'I want help defining it!', stepId: 'uxui-contact' }, secondaryAction: { label: 'Return to select the services.', action: 'close' } },

    { id: 'uxui-deliverables-web', type: 'multi-select', title: 'What do you need?', description: 'Select all the web deliverables you expect.', min: 1, options: [
      { id: 'responsive', label: 'Responsive website', description: 'A fully responsive site for all devices.' },
      { id: 'cms', label: 'CMS integration', description: 'Content management so you can update it yourself.' },
      { id: 'seo', label: 'SEO optimization', description: 'Search engine optimization and performance.' },
      { id: 'analytics', label: 'Analytics setup', description: 'Tracking and reporting tools.' },
    ], next: 'uxui-contact' },

    // ── Contact and completion ──
    { id: 'uxui-contact', type: 'contact-form', title: 'Technical contact information', description: 'UX/UI and web projects are quoted according to scope.', fields: [
      { id: 'name', type: 'text', label: 'Contact name', required: true },
      { id: 'email', type: 'email', label: 'Email', required: true },
      { id: 'projectType', type: 'text', label: 'Project type', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the product.', placeholder: 'Goals, users, platforms, pages, timeline and technical context...' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'uxui-done' },
    { id: 'uxui-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll review your project and send a tailored quote soon.", buttonLabel: 'Return to select the services.' },
    ...sharedWaitlistSteps,
  ],
};
