import { sharedWaitlistSteps } from './_sharedSteps';

export const authorsWizard = {
  id: 'authors', title: 'For authors',
  steps: [
    // ── Service selection — routes to per-service checklist ──
    { id: 'author-service', type: 'single-select', title: 'What do you need?', description: "Each service is different and it costs differently. You'll need to have different things ready.", options: [
      { id: 'book-covers', label: 'Book covers', description: 'An illustrated book cover custom for your story.' },
      { id: 'interior-illustrations', label: 'Interior illustrations', description: 'Chapter headers, full-page scenes, portraits, line art or icons.' },
      { id: 'extras', label: 'Extras', description: 'Dust jackets, bookmarks and escapames.' },
      { id: 'worldbuilding', label: 'Worldbuilding', description: 'Character cards, visual development, maps, timelines and lore charts.' },
      { id: 'merch', label: 'Merch', description: 'Bookmarks, sticker sheets, art prints and enamel pins.' },
      { id: 'marketing', label: 'Marketing', description: 'Branding, banners, teasers, postcards and reveal graphics.' },
    ], next: (answers) => ({
      'book-covers': 'author-req-covers',
      'interior-illustrations': 'author-req-interior',
      'extras': 'author-req-extras',
      'worldbuilding': 'author-req-worldbuilding',
      'merch': 'author-req-merch',
      'marketing': 'author-req-marketing',
    })[answers['author-service']] ?? 'author-req-covers' },

    // ═══════════════════════════════════════════
    // BOOK COVERS path
    // ═══════════════════════════════════════════
    { id: 'author-req-covers', type: 'checklist', title: 'We need all this to start', description: 'A book cover requires specific preparation. Mark everything you have.', items: [
      { id: 'content-complete', label: 'The content is complete.', detail: 'This includes editing and corrections necessary for this book.', required: true },
      { id: 'details-complete', label: 'I have the details complete.', detail: 'Includes additional information, name, register and legal data.', required: true },
      { id: 'has-isbn', label: 'I have ISBN.', detail: 'It is necessary for completing the pricing.', required: true },
      { id: 'story-resume', label: 'I have an idea and story resume.', detail: 'It is necessary for better development of the book.', required: true },
      { id: 'character-look', label: 'I know how my character/scenario looks.', detail: 'A visual key or character design helps guarantee the illustration quality.', required: true },
    ], next: (answers) => {
      const checks = answers['author-req-covers'] ?? {};
      if (!checks['content-complete'] || !checks['details-complete'] || !checks['has-isbn']) return 'author-sorry-hard';
      if (!checks['story-resume'] || !checks['character-look']) return 'author-sorry-soft';
      return 'author-calculator';
    } },

    { id: 'author-sorry-hard', type: 'blocking',
      title: "Sorry, I can't start without the ISBN and the content complete.",
      description: 'These are things only you can provide, but I can add you to a waitlist and give you priority when you have them ready!',
      primaryAction: { label: 'Please add me to the waitlist.', stepId: 'waitlist-form' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    { id: 'author-sorry-soft', type: 'blocking',
      title: "Sorry, I can't illustrate without a story resume or character reference.",
      description: "But I can create those for you! The service changes to concept art, visual development, or character design.",
      primaryAction: { label: 'I want you to do it, please!', stepId: 'author-design-services' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    { id: 'author-design-services', type: 'multi-select', title: 'Choose what you want me to do.', description: 'Since you need the visual foundation first, check everything you need:', min: 1, options: [
      { id: 'concept-art', label: 'Concept Art', description: 'Explores visual ideas for atmospheres, characters and settings.' },
      { id: 'visual-development', label: 'Visual development', description: 'Refines the story visual identity through palettes and symbolic imagery.' },
      { id: 'visual-key', label: 'Visual key', description: 'A central motif that captures the story theme and atmosphere.' },
      { id: 'character-design', label: 'Character Design', description: 'Defines visual identity for narrative consistency.' },
    ], next: 'author-design-calculator' },

    { id: 'author-design-calculator', type: 'calculator', pricingConfigId: 'authorDesign', title: "Here's your estimate", description: 'Configure each service to see the estimated range. The book cover would be a separate commission once these are ready.', next: 'author-design-budget' },
    { id: 'author-design-budget', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-design-calculator', yesStepId: 'contact-design', noStepId: 'waitlist-offer' },

    { id: 'author-calculator', type: 'calculator', pricingConfigId: 'editorial', title: "Here's your estimate", description: 'Configure your book cover to see the price.', next: 'author-budget' },
    { id: 'author-budget', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-calculator', yesStepId: 'contact-covers', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // INTERIOR ILLUSTRATIONS path
    // ═══════════════════════════════════════════
    { id: 'author-req-interior', type: 'checklist', title: "Let's prepare your illustrations", description: 'Interior art needs different preparation than a cover. Mark what you have.', items: [
      { id: 'int-idea', label: 'I know what scenes or elements to illustrate.', detail: 'Chapter headers, spot illustrations, portraits, full scenes, etc.', required: true },
      { id: 'int-refs', label: 'I have reference images or style examples.', detail: 'Visual examples help me match the style and mood of your book.', required: true },
      { id: 'int-content', label: 'The text content is at least partially written.', detail: 'I need context to illustrate the right moments and characters.', required: true },
    ], blockingStepId: 'author-sorry-interior', next: 'author-calc-interior' },

    { id: 'author-sorry-interior', type: 'blocking',
      title: "I can't start interior illustrations yet.",
      description: "I need to know what scenes or elements to illustrate, have style references, and the text content needs to be at least partially written. Without these, I can't give you an accurate estimate.",
      primaryAction: { label: 'Request a briefing.', stepId: 'contact-interior' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    { id: 'author-calc-interior', type: 'calculator', pricingConfigId: 'interiorIllustrations', title: "Here's your estimate", description: 'This is the price per individual illustration. For sets of 7 or more, request a briefing for package pricing.', next: 'author-budget-interior' },
    { id: 'author-budget-interior', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-calc-interior', yesStepId: 'contact-interior', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // EXTRAS path (dust jackets, bookmarks, escapames)
    // ═══════════════════════════════════════════
    { id: 'author-req-extras', type: 'checklist', title: 'What do you have ready?', description: 'Extras depend on your existing book design.', items: [
      { id: 'ext-cover', label: 'I have the book cover design ready or in progress.', detail: 'Extras should match your cover art and visual identity.', required: true },
      { id: 'ext-format', label: 'I know the format and dimensions.', detail: 'Product specifications from your printer or platform.', required: true },
      { id: 'ext-refs', label: 'I have reference images or examples.', detail: 'Show me what kind of result you are looking for.', required: false },
    ], blockingStepId: 'author-sorry-extras', next: 'contact-extras' },

    { id: 'author-sorry-extras', type: 'blocking',
      title: 'The cover design needs to come first.',
      description: 'Extras like dust jackets and bookmarks should match your book cover art. I can help you design the cover first, or set up a briefing.',
      primaryAction: { label: 'Start with a book cover instead.', stepId: 'author-req-covers' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    // ═══════════════════════════════════════════
    // WORLDBUILDING path
    // ═══════════════════════════════════════════
    { id: 'author-req-worldbuilding', type: 'checklist', title: 'Tell me about your world', description: 'Worldbuilding art needs solid source material.', items: [
      { id: 'wb-details', label: 'I have world or story details documented.', detail: 'Lore, characters, locations, history or key events.', required: true },
      { id: 'wb-refs', label: 'I have reference images or visual examples.', detail: 'Mood boards, similar works, or inspiration images.', required: true },
      { id: 'wb-scope', label: 'I know what I need.', detail: 'Character cards, maps, timelines, sigils, infographics, etc.', required: true },
    ], blockingStepId: 'author-sorry-worldbuilding', next: 'author-calc-worldbuilding' },

    { id: 'author-sorry-worldbuilding', type: 'blocking',
      title: 'I need more direction for worldbuilding.',
      description: "Worldbuilding art requires documented details and a clear scope. Let's set up a briefing to explore your world together.",
      primaryAction: { label: 'Request a briefing.', stepId: 'contact-worldbuilding' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    { id: 'author-calc-worldbuilding', type: 'calculator', pricingConfigId: 'worldbuilding', title: "Here's your estimate", description: 'Select the type of worldbuilding asset and detail level. For large packages (visual bibles, full world systems), request a briefing for custom pricing.', next: 'author-budget-worldbuilding' },
    { id: 'author-budget-worldbuilding', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-calc-worldbuilding', yesStepId: 'contact-worldbuilding', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // MERCH path
    // ═══════════════════════════════════════════
    { id: 'author-req-merch', type: 'checklist', title: 'Prepare your merch request', description: 'Mark what you have ready.', items: [
      { id: 'merch-art', label: 'I have art, branding or a clear concept.', detail: 'Existing cover art, logo, or a visual idea to base the merch on.', required: true },
      { id: 'merch-product', label: 'I know what product I want.', detail: 'Bookmarks, stickers, prints, pins, etc.', required: true },
      { id: 'merch-use', label: 'I know how it will be used.', detail: 'Personal, author events, online sales, etc.', required: false },
    ], blockingStepId: 'author-sorry-merch', next: 'author-calc-merch' },

    { id: 'author-sorry-merch', type: 'blocking',
      title: 'I need a starting point for the merch design.',
      description: "Merch art works best when it connects to your book's identity. Let's figure out the concept together in a briefing.",
      primaryAction: { label: 'Request a briefing.', stepId: 'contact-merch' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    { id: 'author-calc-merch', type: 'calculator', pricingConfigId: 'merch', title: "Here's your estimate", description: 'This covers the master artwork only. Production, printing and packaging are separate and depend on your provider.', next: 'author-budget-merch' },
    { id: 'author-budget-merch', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-calc-merch', yesStepId: 'contact-merch', noStepId: 'waitlist-offer' },

    // ═══════════════════════════════════════════
    // MARKETING path (briefing-only, no calculator)
    // ═══════════════════════════════════════════
    { id: 'author-req-marketing', type: 'checklist', title: 'Marketing preparation', description: 'Marketing assets depend on your existing brand. Mark what you have.', items: [
      { id: 'mkt-branding', label: 'I have branding assets.', detail: 'Logo, colors, fonts, or a style guide.', required: true },
      { id: 'mkt-copy', label: 'I have the text or copy ready.', detail: 'Titles, taglines, descriptions for the campaign pieces.', required: true },
      { id: 'mkt-format', label: 'I know the platforms and formats.', detail: 'Social media banners, print postcards, email headers, etc.', required: false },
    ], blockingStepId: 'author-sorry-marketing', next: 'author-calc-marketing' },

    { id: 'author-calc-marketing', type: 'calculator', pricingConfigId: 'marketing', title: "Here's your estimate", description: 'Select the type of marketing asset and illustration level. For full campaigns with multiple pieces, request a briefing.', next: 'author-budget-marketing' },
    { id: 'author-budget-marketing', type: 'budget-check', title: 'Can you afford this budget?', calculatorStepId: 'author-calc-marketing', yesStepId: 'contact-marketing', noStepId: 'waitlist-offer' },

    { id: 'author-sorry-marketing', type: 'blocking',
      title: 'Branding and copy need to come first.',
      description: "Marketing materials depend on your brand identity and final copy. I can help with branding too — let's start with a briefing.",
      primaryAction: { label: 'Request a briefing.', stepId: 'contact-marketing' },
      secondaryAction: { label: 'Return to select the services.', action: 'close' },
    },

    // ═══════════════════════════════════════════
    // Per-service contact forms
    // ═══════════════════════════════════════════
    { id: 'contact-covers', type: 'contact-form', title: 'Tell me about your book cover', description: 'Describe the cover you envision so I can prepare an accurate quote.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the book cover.', placeholder: 'Tell me everything about your ideal cover...', hints: ['Type of book (novel, poetry, non-fiction)', 'Genre', 'Style of illustration you want (add example)', 'Characters involved and their look', 'Scene or composition idea', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-design', type: 'contact-form', title: 'Tell me about your visual needs', description: 'These services build the visual foundation for your book. Describe what you need.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe what you need.', placeholder: 'Tell me about your project...', hints: ['Story genre and setting', 'Characters to design or explore', 'Mood and atmosphere references', 'How these will be used (cover, marketing, internal)', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-interior', type: 'contact-form', title: 'Tell me about your illustrations', description: 'Interior illustrations bring your text to life. Describe what you envision.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the illustrations.', placeholder: 'Tell me about the illustrations you need...', hints: ['How many illustrations', 'Type (chapter headers, spot, full-page, scenes)', 'Color or black and white', 'Key scenes or elements to illustrate', 'Book format and page dimensions', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-extras', type: 'contact-form', title: 'Tell me about your extras', description: 'Extras complement your book design. Describe what you need.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the extras.', placeholder: 'Tell me what extras you need...', hints: ['What extras (dust jacket, bookmark, escapame)', 'Dimensions and format', 'How it connects to your existing cover', 'Printer or platform specifications', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-worldbuilding', type: 'contact-form', title: 'Tell me about your world', description: 'Worldbuilding art requires deep understanding of your lore. Share everything you can.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe your world.', placeholder: 'Tell me about your world and what you need visualized...', hints: ['Genre and type of work (novel, RPG, game, comic)', 'World setting, key lore and key events', 'What assets you need (character cards, maps, timelines, lore charts, sigils, creature sheets)', 'Style of illustration (stylized, semi-realistic, painted)', 'How many pieces and which are priority', 'How these will be used (book interior, game asset, reference bible)', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-merch', type: 'contact-form', title: 'Tell me about your merch', description: 'Merch design starts from your existing art or concept. Share the details.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the merch.', placeholder: 'Tell me about the merch you want...', hints: ['Product type (stickers, bookmarks, prints, t-shirts, mugs, pins, phone cases)', 'Material and printing method if known (vinyl, holographic, DTG, sublimation)', 'Dimensions and format specifications', 'Existing art or concept to base it on', 'Usage (personal, author events, online sales, wholesale)', 'Whether you need print-ready files or just the artwork', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'contact-marketing', type: 'contact-form', title: 'Tell me about your campaign', description: 'Marketing materials need clear direction. Describe your campaign goals.', fields: [
      { id: 'name', type: 'text', label: 'Name', placeholder: 'My name is...', required: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'example@email.com', required: true },
      { id: 'description', type: 'textarea', label: 'Describe the campaign.', placeholder: 'Tell me about your marketing needs...', hints: ['Platforms and formats (Instagram banner, Twitter header, email header, print postcard)', 'Exact sizes if known (1080x1080, 1200x628, etc.)', 'Campaign goals (book launch, promotion, announcement, reveal)', 'How many pieces and which platforms are priority', 'Existing branding assets (logo, colors, fonts)', 'Copy and text ready for the pieces', 'Whether you need adaptations for multiple platforms', 'Delivery time limit'] },
      { id: 'references', type: 'file', label: 'Reference images', maxFiles: 10, maxSizeMB: 5, placeholder: 'Drop images here or click to browse', hint: 'Max 5 MB per file. JPG, PNG, WEBP only.' },
    ], checkboxes: [{ id: 'terms', label: 'I accept the terms and conditions.', required: true }], next: 'author-done' },

    { id: 'author-done', type: 'completion', submitTo: 'commissions', title: 'Ready!', message: "I'll send you a quote soon. Thanks for your time!", buttonLabel: 'Return to select the services.' },

    ...sharedWaitlistSteps,
  ],
};
