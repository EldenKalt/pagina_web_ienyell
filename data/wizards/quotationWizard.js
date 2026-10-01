import { ADDONS, FRAMINGS, STYLES } from '../commissionPricing';

const STYLE_DETAILS = {
  chibi: { description: 'Cute, simplified, great for avatars and stickers', icon: '🌸' },
  anime: { description: 'Clean lines, vibrant colors, manga-inspired', icon: '⚡' },
  semi: { description: 'Blend of stylized and realistic rendering', icon: '🎨' },
  hiper: { description: 'Photorealistic detail and lighting', icon: '💎' },
};

const FRAMING_DETAILS = {
  bust: { description: 'Head and shoulders', icon: '👤' },
  half: { description: 'Waist up, includes hands', icon: '🧑' },
  full: { description: 'Complete figure head to toe', icon: '🧍' },
};

const ADDON_DESCRIPTIONS = {
  extra_char: 'Extra character (+50% per character)',
  nsfw_soft: 'NSFW suggestive (+30%)',
  nsfw_hard: 'NSFW explicit (+60%)',
  bg_detail: 'Detailed background (+20%)',
  bg_complex: 'Complex background / scene (+40%)',
  non_human: 'Complex non-human subject (+20%)',
  panoramic: 'Panoramic format (+15%)',
  commercial: 'Commercial license (+75%)',
  extra_rev: 'Extra revision round (+15%, min $30)',
};

export const quotationWizard = {
  id: 'quotation',
  title: 'Quotation Wizard',
  completionTitle: 'Your estimate is ready!',
  completionMessage: 'Based on your selections, here is your estimated price. Remember this is an approximation — the final price may vary based on specific requirements.',
  showEstimate: true,
  steps: [
    {
      id: 'quote-welcome',
      type: 'info',
      title: "Let's build your quote",
      description: "I'll walk you through a few choices to give you an accurate price estimate. You can always adjust later.",
      bullets: ['Takes about 1 minute', 'See prices update in real time', 'No commitment'],
    },
    {
      id: 'quote-style',
      type: 'single-select',
      title: 'What art style do you prefer?',
      description: 'Each style has different complexity levels and price ranges.',
      options: STYLES.map((style) => ({ id: style.id, label: style.label, ...STYLE_DETAILS[style.id] })),
    },
    {
      id: 'quote-finish',
      type: 'single-select',
      title: 'What level of finish?',
      description: 'Higher finish levels include more detail and polish.',
      options: [
        { id: 'sketch', label: 'Sketch / Lineart', description: 'Quick concept, clean lines', showWhen: { stepId: 'quote-style', values: ['chibi', 'anime', 'semi'] } },
        { id: 'flat', label: 'Flat color', description: 'Clean colors, no shading', showWhen: { stepId: 'quote-style', values: ['chibi', 'anime', 'semi'] } },
        { id: 'cell', label: 'Cell shade', description: 'Anime-style shading', showWhen: { stepId: 'quote-style', values: ['chibi', 'anime'] } },
        { id: 'render', label: 'Full render', description: 'Complete rendering with lighting', showWhen: { stepId: 'quote-style', values: ['chibi', 'anime'] } },
        { id: 'mid', label: 'Mid render', description: 'Partial rendering with some detail', showWhen: { stepId: 'quote-style', values: ['semi'] } },
        { id: 'render', label: 'Full painted render', description: 'Complete painted illustration', showWhen: { stepId: 'quote-style', values: ['semi'] } },
        { id: 'gray', label: 'Grayscale / Values', description: 'Black and white value study', showWhen: { stepId: 'quote-style', values: ['hiper'] } },
        { id: 'partial', label: 'Partial render', description: 'Selective rendering with focal points', showWhen: { stepId: 'quote-style', values: ['hiper'] } },
        { id: 'render', label: 'Full hyperrealistic render', description: 'Maximum detail photorealistic', showWhen: { stepId: 'quote-style', values: ['hiper'] } },
      ],
    },
    {
      id: 'quote-framing',
      type: 'single-select',
      title: 'How much of the character?',
      description: 'More body = more detail = higher price.',
      options: FRAMINGS.map((framing) => ({ id: framing.id, label: framing.label, ...FRAMING_DETAILS[framing.id] })),
    },
    {
      id: 'quote-addons',
      type: 'multi-select',
      title: 'Any extras?',
      description: 'All optional. Each adds a percentage to the price.',
      min: 0,
      options: ADDONS.map((addon) => ({ id: addon.id, label: addon.label, description: ADDON_DESCRIPTIONS[addon.id] })),
    },
    {
      id: 'quote-description',
      type: 'text-input',
      title: 'Describe your project (optional)',
      description: 'Help me understand your vision. You can also share reference images later.',
      placeholder: "I'd like a portrait of my OC. She has long red hair, pointed ears, wears a dark cloak...",
      inputType: 'textarea',
      required: false,
      maxLength: 1500,
    },
    {
      id: 'quote-name',
      type: 'text-input',
      title: 'What should I call you?',
      description: 'This lets me personalize your quote and follow-up.',
      placeholder: 'Your name',
      inputType: 'text',
      required: true,
      maxLength: 100,
    },
    {
      id: 'quote-email',
      type: 'text-input',
      title: 'Where should I send the quote?',
      description: "I'll email you the detailed estimate. No spam, ever.",
      placeholder: 'your@email.com',
      inputType: 'email',
      required: true,
    },
    {
      id: 'quote-review',
      type: 'summary',
      title: 'Your estimate',
      description: "Here's what your commission would cost.",
      showPrice: true,
      fields: [
        { stepId: 'quote-style', label: 'Style' },
        { stepId: 'quote-finish', label: 'Finish' },
        { stepId: 'quote-framing', label: 'Framing' },
        { stepId: 'quote-addons', label: 'Add-ons' },
        { stepId: 'quote-description', label: 'Description' },
        { stepId: 'quote-name', label: 'Name' },
        { stepId: 'quote-email', label: 'Email' },
      ],
    },
  ],
};
