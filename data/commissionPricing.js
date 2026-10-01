export const STYLES = [
  { id: 'chibi', label: 'Chibi', thumbnail: '/recursos/style_chibi_thumb.webp' },
  { id: 'anime', label: 'Anime / Stylized', thumbnail: '/recursos/style_anime_thumb.webp' },
  { id: 'semi', label: 'Semi-realism', thumbnail: '/recursos/style_semi_thumb.webp' },
  { id: 'hiper', label: 'Hyperrealism', thumbnail: '/recursos/style_hiper_thumb.webp' },
];

export const FRAMINGS = [
  { id: 'bust', label: 'Bust' },
  { id: 'half', label: 'Half body' },
  { id: 'full', label: 'Full body' },
];

export const FINISHES_BY_STYLE = {
  chibi: [
    { id: 'sketch', label: 'Sketch / Lineart' },
    { id: 'flat', label: 'Flat color' },
    { id: 'cell', label: 'Cell shade' },
    { id: 'render', label: 'Full render' },
  ],
  anime: [
    { id: 'sketch', label: 'Sketch / Lineart' },
    { id: 'flat', label: 'Flat color' },
    { id: 'cell', label: 'Cell shade' },
    { id: 'render', label: 'Full render' },
  ],
  semi: [
    { id: 'sketch', label: 'Sketch / Lineart' },
    { id: 'flat', label: 'Flat color' },
    { id: 'mid', label: 'Mid render' },
    { id: 'render', label: 'Full painted render' },
  ],
  hiper: [
    { id: 'gray', label: 'Grayscale / Values' },
    { id: 'partial', label: 'Partial render' },
    { id: 'render', label: 'Full hyperrealistic render' },
  ],
};

// BASE_PRICES[style][finish][framing] = USD
export const BASE_PRICES = {
  chibi: {
    sketch: { bust: 40, half: 55, full: 75 },
    flat:   { bust: 65, half: 90, full: 120 },
    cell:   { bust: 95, half: 130, full: 170 },
    render: { bust: 130, half: 180, full: 240 },
  },
  anime: {
    sketch: { bust: 70, half: 100, full: 140 },
    flat:   { bust: 120, half: 175, full: 230 },
    cell:   { bust: 175, half: 250, full: 320 },
    render: { bust: 240, half: 360, full: 480 },
  },
  semi: {
    sketch: { bust: 90, half: 130, full: 180 },
    flat:   { bust: 160, half: 230, full: 300 },
    mid:    { bust: 230, half: 330, full: 430 },
    render: { bust: 320, half: 480, full: 650 },
  },
  hiper: {
    gray:    { bust: 150, half: 210, full: 290 },
    partial: { bust: 280, half: 400, full: 520 },
    render:  { bust: 450, half: 680, full: 950 },
  },
};

export const ADDONS = [
  { id: 'extra_char', label: 'Extra character', pct: 50, on: 'base', per: true, note: 'Base price is for 1 character' },
  { id: 'nsfw_soft', label: 'NSFW suggestive', pct: 30, on: 'base', exclusive: 'nsfw' },
  { id: 'nsfw_hard', label: 'NSFW explicit', pct: 60, on: 'base', exclusive: 'nsfw' },
  { id: 'bg_detail', label: 'Detailed background', pct: 20, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'bg_complex', label: 'Complex background / scene', pct: 40, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'non_human', label: 'Complex non-human subject', pct: 20, on: 'base' },
  { id: 'panoramic', label: 'Panoramic format', pct: 15, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'extra_rev', label: 'Extra revision', pct: 15, on: 'base', per: true, min: 30, note: 'Per additional round (min. $30)' },
];

export function calculateEstimate({ style, finish, framing, addons = {} }) {
  const finishes = FINISHES_BY_STYLE[style];
  if (!finishes) return null;

  const finishEntry = finishes.find(f => f.id === finish);
  if (!finishEntry) return null;

  const prices = BASE_PRICES[style]?.[finish];
  if (!prices) return null;

  const base = prices[framing];
  if (base == null) return null;

  let subtotal = base;

  for (const addon of ADDONS) {
    const val = addons[addon.id];
    if (!val) continue;

    if (addon.on === 'total') continue;

    const qty = addon.per ? Number(val) || 0 : 1;
    if (qty <= 0) continue;

    let amount = base * (addon.pct / 100) * qty;
    if (addon.min) amount = Math.max(amount, addon.min * qty);
    subtotal += amount;
  }

  let total = subtotal;
  for (const addon of ADDONS) {
    if (addon.on !== 'total') continue;
    if (!addons[addon.id]) continue;
    total += subtotal * (addon.pct / 100);
  }

  return { base, subtotal, total: Math.round(total) };
}

function calculateConfiguredPrice(base, addonSelections, addons) {
  if (base == null) return null;
  let subtotal = base;

  for (const addon of addons) {
    const selection = addonSelections[addon.id];
    if (!selection || addon.on === 'total') continue;
    const quantity = addon.per ? Number(selection) || 0 : 1;
    if (quantity <= 0) continue;
    const amount = addon.amount != null
      ? addon.amount * quantity
      : Math.max(base * ((addon.pct ?? 0) / 100), addon.min ?? 0) * quantity;
    subtotal += amount;
  }

  let total = subtotal;
  for (const addon of addons) {
    const selection = addonSelections[addon.id];
    if (!selection || addon.on !== 'total') continue;
    const quantity = addon.per ? Number(selection) || 0 : 1;
    total += addon.amount != null
      ? addon.amount * quantity
      : subtotal * ((addon.pct ?? 0) / 100) * quantity;
  }

  return { base: Math.round(base), subtotal: Math.round(subtotal), min: Math.round(total * 0.85), max: Math.round(total * 1.15) };
}

const PORTRAIT_ADDONS = [
  { id: 'extra_human', label: 'Extra human character', pct: 50, on: 'base', per: true, note: 'Base price is for 1 character' },
  { id: 'extra_animal', label: 'Extra animal character', pct: 70, on: 'base', per: true, note: 'Animals require more detail' },
  { id: 'bg_detail', label: 'Detailed background', pct: 20, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'bg_complex', label: 'Complex background / scene', pct: 40, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'panoramic', label: 'Panoramic format', pct: 15, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'extra_rev', label: 'Extra revision', pct: 15, on: 'base', per: true, min: 30, note: 'Per additional round (min. $30)' },
];
const PET_BASE_PRICES = Object.fromEntries(Object.entries(BASE_PRICES).map(([style, finishes]) => [
  style,
  Object.fromEntries(Object.entries(finishes).map(([finish, framings]) => [
    finish,
    Object.fromEntries(Object.entries(framings).map(([framing, price]) => [framing, Math.round(price * 1.2)])),
  ])),
]));
const NSFW_BASE_PRICES = Object.fromEntries(Object.entries(BASE_PRICES).map(([style, finishes]) => [
  style,
  Object.fromEntries(Object.entries(finishes).map(([finish, framings]) => [
    finish,
    Object.fromEntries(Object.entries(framings).map(([framing, price]) => [framing, Math.round(price * 1.3)])),
  ])),
]));
const NSFW_ADDONS = [
  { id: 'complex_anatomy', label: 'Complex anatomy', pct: 25, on: 'base' },
  { id: 'explicit_scene', label: 'Explicit scene', pct: 20, on: 'base' },
  { id: 'multiple_chars_nsfw', label: 'Additional NSFW character', pct: 60, on: 'base', per: true, note: 'Base price is for 1 character' },
  { id: 'bg_detail', label: 'Detailed background', pct: 20, on: 'base', note: 'Base price has no background' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
];

const EDITORIAL_ADDONS = [
  { id: 'typography', label: 'Typography / lettering', amount: 75, on: 'base' },
  { id: 'extra_revision', label: 'Extra revision', pct: 15, min: 30, on: 'base', per: true },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];
const STUDIO_ADDONS = [
  { id: 'turnaround', label: 'Turnaround / rotation sheet', pct: 40, on: 'base' },
  { id: 'expressions', label: 'Expression sheet', pct: 25, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];
const STUDIO_GENERAL_ADDONS = [
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];
const STUDIO_CHARACTER_ADDONS = [
  { id: 'turnaround', label: 'Turnaround / rotation sheet', pct: 40, on: 'base' },
  { id: 'expressions', label: 'Expression sheet', pct: 25, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];
const FANART_ADDONS = [
  { id: 'extra_human', label: 'Extra character', pct: 50, on: 'base', per: true, note: 'Base price is for 1 character' },
  { id: 'bg_detail', label: 'Detailed background', pct: 20, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'bg_complex', label: 'Complex background / scene', pct: 40, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'panoramic', label: 'Panoramic format', pct: 15, on: 'base' },
  { id: 'extra_rev', label: 'Extra revision', pct: 15, on: 'base', per: true, min: 30, note: 'Per additional round (min. $30)' },
];
const MERCH_ADDONS = [
  { id: 'variations', label: 'Variations / colorways', amount: 30, on: 'base', per: true },
  { id: 'print_ready', label: 'Print-ready file preparation', amount: 40, on: 'base' },
  { id: 'vectorization', label: 'Vectorization', amount: 50, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];

const EDITORIAL_PRICES = {
  'front-cover': {
    simple: { stylized: 200, semi: 280, painted: 360 },
    medium: { stylized: 300, semi: 450, painted: 600 },
    complex: { stylized: 380, semi: 520, painted: 700 },
  },
  'front-back-wrap': {
    simple: { stylized: 320, semi: 420, painted: 520 },
    medium: { stylized: 420, semi: 600, painted: 800 },
    complex: { stylized: 550, semi: 750, painted: 1000 },
  },
  'full-wrap': {
    simple: { stylized: 450, semi: 600, painted: 750 },
    medium: { stylized: 600, semi: 850, painted: 1100 },
    complex: { stylized: 750, semi: 1150, painted: 1500 },
  },
};
const STUDIO_BASES = {
  'concept-art': { rough: 150, refined: 280, production: 450 },
  'character-sheet': { rough: 220, refined: 360, production: 500 },
  'visual-key': { rough: 300, refined: 520, production: 800 },
  environment: { rough: 250, refined: 450, production: 700 },
};
const STUDIO_QUANTITIES = { one: { label: '1 piece', count: 1, discount: 0 }, three: { label: '3-pack (-10%)', count: 3, discount: .1 }, five: { label: '5-pack (-15%)', count: 5, discount: .15 }, ten: { label: '10-pack (-20%)', count: 10, discount: .2 } };
const STUDIO_PRICES = Object.fromEntries(Object.entries(STUDIO_BASES).map(([asset, levels]) => [asset, Object.fromEntries(Object.entries(levels).map(([level, price]) => [level, Object.fromEntries(Object.entries(STUDIO_QUANTITIES).map(([quantity, details]) => [quantity, price * details.count]))]))]));
const INTERIOR_PRICES = {
  'chapter-header': {
    chibi: { sketch: 30, flat: 50, cell: 70, render: 100 },
    anime: { sketch: 50, flat: 80, cell: 120, render: 170 },
    semi:  { sketch: 60, flat: 100, mid: 150, render: 220 },
    hiper: { gray: 90, partial: 180, render: 300 },
  },
  'spot-illustration': {
    chibi: { sketch: 40, flat: 65, cell: 95, render: 130 },
    anime: { sketch: 70, flat: 120, cell: 175, render: 240 },
    semi:  { sketch: 90, flat: 160, mid: 230, render: 320 },
    hiper: { gray: 150, partial: 280, render: 450 },
  },
  'half-page': {
    chibi: { sketch: 55, flat: 90, cell: 130, render: 180 },
    anime: { sketch: 100, flat: 175, cell: 250, render: 360 },
    semi:  { sketch: 130, flat: 230, mid: 330, render: 480 },
    hiper: { gray: 210, partial: 400, render: 680 },
  },
  'full-page': {
    chibi: { sketch: 75, flat: 120, cell: 170, render: 240 },
    anime: { sketch: 140, flat: 230, cell: 320, render: 480 },
    semi:  { sketch: 180, flat: 300, mid: 430, render: 650 },
    hiper: { gray: 290, partial: 520, render: 950 },
  },
  'full-scene': {
    chibi: { sketch: 100, flat: 160, cell: 220, render: 310 },
    anime: { sketch: 180, flat: 300, cell: 420, render: 620 },
    semi:  { sketch: 230, flat: 390, mid: 560, render: 850 },
    hiper: { gray: 380, partial: 680, render: 1250 },
  },
};
const INTERIOR_ADDONS = [
  { id: 'extra_char', label: 'Extra character', pct: 50, on: 'base', per: true, note: 'Base price is for 1 character' },
  { id: 'bg_detail', label: 'Detailed background', pct: 20, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'bg_complex', label: 'Complex background / scene', pct: 40, on: 'base', exclusive: 'bg', note: 'Base price has no background' },
  { id: 'extra_rev', label: 'Extra revision', pct: 15, on: 'base', per: true, min: 30, note: 'Per additional round (min. $30)' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];

const MERCH_PRICES = {
  sticker: { simple: 50, standard: 80, detailed: 120, complex: 160 },
  bookmark: { simple: 45, standard: 75, detailed: 120, complex: 170 },
  print: { simple: 100, standard: 180, detailed: 280, complex: 400 },
  clothing: { simple: 120, standard: 220, detailed: 350, complex: 500 },
  mug: { simple: 80, standard: 140, detailed: 220, complex: 320 },
  enamel: { simple: 80, standard: 150, detailed: 250, complex: 380 },
  'phone-case': { simple: 90, standard: 160, detailed: 260, complex: 380 },
};

const WORLDBUILDING_PRICES = {
  'character-card': { sketch: 80, refined: 180, production: 320 },
  'concept-art': { sketch: 150, refined: 280, production: 450 },
  'character-sheet': { sketch: 220, refined: 360, production: 550 },
  'visual-key': { sketch: 300, refined: 520, production: 800 },
  'environment': { sketch: 250, refined: 450, production: 700 },
  'map': { sketch: 300, refined: 600, production: 1100 },
  'timeline': { sketch: 150, refined: 320, production: 550 },
  'lore-chart': { sketch: 180, refined: 380, production: 650 },
  'sigil-emblem': { sketch: 60, refined: 150, production: 280 },
  'creature-sheet': { sketch: 250, refined: 450, production: 750 },
};
const WORLDBUILDING_ADDONS = [
  { id: 'extra_element', label: 'Extra element or character', pct: 40, on: 'base', per: true, note: 'Base price is for 1 main subject' },
  { id: 'color', label: 'Full color rendering', pct: 30, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];

const MARKETING_PRICES = {
  'social-banner': { 'design-only': 50, illustrated: 120, 'full-scene': 220 },
  'email-header': { 'design-only': 40, illustrated: 100, 'full-scene': 180 },
  'print-postcard': { 'design-only': 60, illustrated: 150, 'full-scene': 280 },
  'teaser-reveal': { 'design-only': 80, illustrated: 180, 'full-scene': 320 },
  'ad-banner': { 'design-only': 45, illustrated: 110, 'full-scene': 200 },
};
const MARKETING_ADDONS = [
  { id: 'platform_adapt', label: 'Platform adaptation', amount: 35, on: 'base', per: true, note: 'Per extra platform or size' },
  { id: 'animation_ready', label: 'Animation-ready preparation', pct: 25, on: 'base' },
  { id: 'commercial', label: 'Commercial license', pct: 75, on: 'total' },
  { id: 'rush', label: 'Rush delivery', pct: 30, on: 'total' },
];

const BUILT_IN_PRICE_OPTION_SOURCES = [
  ADDONS,
  PORTRAIT_ADDONS,
  NSFW_ADDONS,
  EDITORIAL_ADDONS,
  STUDIO_ADDONS,
  STUDIO_GENERAL_ADDONS,
  STUDIO_CHARACTER_ADDONS,
  FANART_ADDONS,
  MERCH_ADDONS,
  INTERIOR_ADDONS,
  WORLDBUILDING_ADDONS,
  MARKETING_ADDONS,
];

export const GLOBAL_PRICE_OPTIONS = Array.from(
  new Map(BUILT_IN_PRICE_OPTION_SOURCES.flat().map((option) => [option.id, { ...option, source: 'built-in' }])).values(),
);

function normalizeCustomPriceOption(option) {
  const id = String(option?.id || option?.key || '').trim();
  const label = String(option?.label || '').trim();
  const value = Number(option?.value ?? option?.amount ?? option?.pct);
  if (!id || !label || !Number.isFinite(value) || value < 0) return null;
  return {
    id,
    label,
    ...(option.note ? { note: String(option.note) } : {}),
    ...(String(option.pricingMode || '').toUpperCase() === 'FIXED' ? { amount: value } : { pct: value }),
    on: option.applyTo === 'total' ? 'total' : 'base',
    ...(option.isPer ? { per: true } : {}),
    ...(Number.isFinite(Number(option.minimum)) ? { min: Number(option.minimum) } : {}),
    ...(option.exclusiveGroup ? { exclusive: String(option.exclusiveGroup) } : {}),
    isActive: option.isActive !== false,
    source: 'custom',
  };
}

export function getGlobalPriceOptions(customOptions = []) {
  const custom = customOptions
    .map(normalizeCustomPriceOption)
    .filter(Boolean);
  return Array.from(new Map([...GLOBAL_PRICE_OPTIONS, ...custom].map((option) => [option.id, option])).values());
}

const portraitDimensions = [
  { id: 'style', label: 'Style', options: STYLES },
  { id: 'finish', label: 'Finish', dependsOn: 'style', optionsByParent: FINISHES_BY_STYLE },
  { id: 'framing', label: 'Framing', options: FRAMINGS },
];

const VISUAL_KEY_PRICES = {
  portraitFull: Object.fromEntries(Object.entries(BASE_PRICES).map(([style, finishes]) => [
    style,
    Object.fromEntries(Object.entries(finishes).map(([finish, framings]) => [finish, framings.full])),
  ])),
  composition: { motif: 0.8, character: 1.2, scene: 1.6 },
  characters: { '1': 1, '2': 1.5, '3+': 2 },
  estimateRange: { minimum: 0.85, maximum: 1.2 },
};

const AUTHOR_DESIGN_SERVICE_CONFIGS = {
  'concept-art': {
    label: 'Concept Art',
    subtitle: 'Explores visual ideas for atmospheres, characters and settings.',
    dimensions: [
      { id: 'ca-count', label: 'How many explorations?', options: [
        { id: '1', label: '1 exploration' },
        { id: '2-3', label: '2–3 explorations' },
        { id: '4-6', label: '4–6 explorations' },
      ] },
      { id: 'ca-subject', label: 'What to explore', options: [
        { id: 'characters', label: 'Characters' },
        { id: 'environments', label: 'Environments / landscapes' },
        { id: 'atmosphere', label: 'Atmosphere & mood' },
        { id: 'mixed', label: 'Mixed subjects' },
      ] },
      { id: 'ca-level', label: 'Visual level', options: [
        { id: 'rough', label: 'Rough sketches' },
        { id: 'refined', label: 'Refined concepts' },
        { id: 'detailed', label: 'Presentation-ready' },
      ] },
    ],
    prices: {
      '1':   { rough: [80, 150], refined: [150, 280], detailed: [280, 450] },
      '2-3': { rough: [200, 380], refined: [380, 700], detailed: [700, 1100] },
      '4-6': { rough: [350, 650], refined: [650, 1200], detailed: [1200, 1900] },
    },
    calculate(sel) {
      const range = this.prices[sel['ca-count']]?.[sel['ca-level']];
      return range ? { min: range[0], max: range[1] } : null;
    },
  },
  'visual-development': {
    label: 'Visual Development',
    subtitle: 'Refines the story visual identity through palettes and symbolic imagery.',
    dimensions: [
      { id: 'vd-scope', label: 'What to develop', options: [
        { id: 'palette', label: 'Color palette' },
        { id: 'symbols', label: 'Symbolic imagery' },
        { id: 'language', label: 'Visual language' },
        { id: 'identity', label: 'Full identity system' },
      ] },
      { id: 'vd-elements', label: 'How many elements?', options: [
        { id: '1-3', label: '1–3 elements' },
        { id: '4-6', label: '4–6 elements' },
      ] },
    ],
    prices: {
      palette:  { '1-3': [100, 200], '4-6': [200, 380] },
      symbols:  { '1-3': [150, 280], '4-6': [280, 520] },
      language: { '1-3': [250, 450], '4-6': [450, 800] },
      identity: { '1-3': [400, 700], '4-6': [700, 1200] },
    },
    calculate(sel) {
      const range = this.prices[sel['vd-scope']]?.[sel['vd-elements']];
      return range ? { min: range[0], max: range[1] } : null;
    },
  },
  'visual-key': {
    label: 'Visual Key',
    subtitle: 'A central motif that captures the story theme and atmosphere.',
    prices: VISUAL_KEY_PRICES,
    dimensions: [
      { id: 'vk-composition', label: 'Composition', options: [
        { id: 'motif', label: 'Simple motif / element' },
        { id: 'character', label: 'Character + atmosphere' },
        { id: 'scene', label: 'Full scene' },
      ] },
      { id: 'vk-characters', label: 'Characters', options: [
        { id: '1', label: '1 character' },
        { id: '2', label: '2 characters' },
        { id: '3+', label: '3+ characters' },
      ] },
      { id: 'vk-style', label: 'Style', options: STYLES },
      { id: 'vk-finish', label: 'Finish', dependsOn: 'vk-style', optionsByParent: FINISHES_BY_STYLE },
    ],
    calculate(sel) {
      const portraitBase = this.prices.portraitFull?.[sel['vk-style']]?.[sel['vk-finish']];
      if (portraitBase == null) return null;
      const compMult = this.prices.composition?.[sel['vk-composition']];
      if (!compMult) return null;
      const charMult = this.prices.characters?.[sel['vk-characters']] ?? 1;
      const base = portraitBase * compMult * charMult;
      return {
        min: Math.round(base * this.prices.estimateRange.minimum),
        max: Math.round(base * this.prices.estimateRange.maximum),
      };
    },
  },
  'character-design': {
    label: 'Character Design',
    subtitle: 'Defines visual identity for narrative consistency.',
    dimensions: [
      { id: 'cd-scope', label: 'Deliverable', options: [
        { id: 'basic', label: 'Basic design' },
        { id: 'turnaround', label: 'Design + turnaround' },
        { id: 'full-sheet', label: 'Full character sheet' },
      ] },
      { id: 'cd-complexity', label: 'Complexity', options: [
        { id: 'simple', label: 'Simple design' },
        { id: 'moderate', label: 'Moderate detail' },
        { id: 'complex', label: 'Complex design' },
      ] },
    ],
    prices: {
      basic:        { simple: [120, 200], moderate: [200, 350], complex: [350, 550] },
      turnaround:   { simple: [250, 400], moderate: [400, 650], complex: [650, 1000] },
      'full-sheet': { simple: [400, 650], moderate: [650, 1000], complex: [1000, 1600] },
    },
    calculate(sel) {
      const range = this.prices[sel['cd-scope']]?.[sel['cd-complexity']];
      return range ? { min: range[0], max: range[1] } : null;
    },
  },
};

export const PRICING_CONFIGS = {
  portraits: {
    id: 'portraits', label: 'Portrait pricing', currency: 'USD', dimensions: portraitDimensions, addons: PORTRAIT_ADDONS, prices: BASE_PRICES,
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.style]?.[selections.finish]?.[selections.framing], addons, this.addons);
    },
  },
  fanart: {
    id: 'fanart', label: 'Fanart pricing', currency: 'USD', dimensions: portraitDimensions, addons: FANART_ADDONS, prices: BASE_PRICES,
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.style]?.[selections.finish]?.[selections.framing], addons, this.addons);
    },
  },
  petPortraits: {
    id: 'petPortraits', label: 'Pet portrait pricing', currency: 'USD', dimensions: portraitDimensions, addons: PORTRAIT_ADDONS, prices: PET_BASE_PRICES,
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.style]?.[selections.finish]?.[selections.framing], addons, this.addons);
    },
  },
  editorial: {
    id: 'editorial', label: 'Editorial pricing', currency: 'USD', addons: EDITORIAL_ADDONS, prices: EDITORIAL_PRICES,
    dimensions: [
      { id: 'coverType', label: 'Cover type', options: [{ id: 'front-cover', label: 'Front cover only' }, { id: 'front-back-wrap', label: 'Front + back wrap' }, { id: 'full-wrap', label: 'Full wrap (front, back + spine)' }] },
      { id: 'complexity', label: 'Complexity', options: [{ id: 'simple', label: 'Simple (1–2 elements)' }, { id: 'medium', label: 'Medium (3–5 elements + background)' }, { id: 'complex', label: 'Complex (full scene)' }] },
      { id: 'illustrationStyle', label: 'Illustration style', options: [{ id: 'stylized', label: 'Stylized / flat' }, { id: 'semi', label: 'Semi-realistic' }, { id: 'painted', label: 'Fully painted' }] },
    ],
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.coverType]?.[selections.complexity]?.[selections.illustrationStyle], addons, this.addons);
    },
  },
  studioConceptArt: {
    id: 'studioConceptArt', label: 'Concept art pricing', currency: 'USD',
    addons: STUDIO_GENERAL_ADDONS, prices: STUDIO_BASES['concept-art'],
    dimensions: [
      { id: 'detailLevel', label: 'Detail level', options: [{ id: 'rough', label: 'Rough / exploratory' }, { id: 'refined', label: 'Refined' }, { id: 'production', label: 'Production-ready' }] },
      { id: 'quantity', label: 'Quantity', options: Object.entries(STUDIO_QUANTITIES).map(([id, details]) => ({ id, label: details.label })) },
    ],
    calculate(selections, addons = {}) {
      const quantity = STUDIO_QUANTITIES[selections.quantity];
      const base = this.prices?.[selections.detailLevel];
      const areas = selections.scopeCount || 1;
      if (!quantity || base == null) return null;
      return calculateConfiguredPrice(base * areas * quantity.count * (1 - quantity.discount), addons, this.addons);
    },
  },
  studioCharacter: {
    id: 'studioCharacter', label: 'Character development pricing', currency: 'USD',
    addons: STUDIO_CHARACTER_ADDONS, prices: STUDIO_BASES['character-sheet'],
    dimensions: [
      { id: 'detailLevel', label: 'Detail level', options: [{ id: 'rough', label: 'Rough / exploratory' }, { id: 'refined', label: 'Refined' }, { id: 'production', label: 'Production-ready' }] },
      { id: 'quantity', label: 'Quantity', options: Object.entries(STUDIO_QUANTITIES).map(([id, details]) => ({ id, label: details.label })) },
    ],
    calculate(selections, addons = {}) {
      const quantity = STUDIO_QUANTITIES[selections.quantity];
      const base = this.prices?.[selections.detailLevel];
      if (!quantity || base == null) return null;
      return calculateConfiguredPrice(base * quantity.count * (1 - quantity.discount), addons, this.addons);
    },
  },
  studioVisualKey: {
    id: 'studioVisualKey', label: 'Visual key pricing', currency: 'USD',
    addons: STUDIO_GENERAL_ADDONS, prices: STUDIO_BASES['visual-key'],
    dimensions: [
      { id: 'detailLevel', label: 'Detail level', options: [{ id: 'rough', label: 'Rough / exploratory' }, { id: 'refined', label: 'Refined' }, { id: 'production', label: 'Production-ready' }] },
      { id: 'quantity', label: 'Quantity', options: Object.entries(STUDIO_QUANTITIES).map(([id, details]) => ({ id, label: details.label })) },
    ],
    calculate(selections, addons = {}) {
      const quantity = STUDIO_QUANTITIES[selections.quantity];
      const base = this.prices?.[selections.detailLevel];
      const areas = selections.scopeCount || 1;
      if (!quantity || base == null) return null;
      return calculateConfiguredPrice(base * areas * quantity.count * (1 - quantity.discount), addons, this.addons);
    },
  },
  studioEnvironment: {
    id: 'studioEnvironment', label: 'Environment design pricing', currency: 'USD',
    addons: STUDIO_GENERAL_ADDONS, prices: STUDIO_BASES.environment,
    dimensions: [
      { id: 'detailLevel', label: 'Detail level', options: [{ id: 'rough', label: 'Rough / exploratory' }, { id: 'refined', label: 'Refined' }, { id: 'production', label: 'Production-ready' }] },
      { id: 'quantity', label: 'Quantity', options: Object.entries(STUDIO_QUANTITIES).map(([id, details]) => ({ id, label: details.label })) },
    ],
    calculate(selections, addons = {}) {
      const quantity = STUDIO_QUANTITIES[selections.quantity];
      const base = this.prices?.[selections.detailLevel];
      const areas = selections.scopeCount || 1;
      if (!quantity || base == null) return null;
      return calculateConfiguredPrice(base * areas * quantity.count * (1 - quantity.discount), addons, this.addons);
    },
  },
  nsfw: {
    id: 'nsfw', label: 'NSFW pricing', currency: 'USD', dimensions: portraitDimensions, addons: NSFW_ADDONS, prices: NSFW_BASE_PRICES,
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.style]?.[selections.finish]?.[selections.framing], addons, this.addons);
    },
  },
  merch: {
    id: 'merch', label: 'Merch pricing', currency: 'USD', addons: MERCH_ADDONS, prices: MERCH_PRICES,
    dimensions: [
      { id: 'productType', label: 'Product type', options: [
        { id: 'sticker', label: 'Sticker design' },
        { id: 'bookmark', label: 'Bookmark illustration' },
        { id: 'print', label: 'Art print / poster' },
        { id: 'clothing', label: 'T-shirt / clothing illustration' },
        { id: 'mug', label: 'Mug / drinkware design' },
        { id: 'enamel', label: 'Pin / enamel design' },
        { id: 'phone-case', label: 'Phone case design' },
      ] },
      { id: 'complexity', label: 'Complexity', options: [
        { id: 'simple', label: 'Simple (single element, no background)' },
        { id: 'standard', label: 'Standard (1-2 elements, minimal background)' },
        { id: 'detailed', label: 'Detailed (character + background, moderate detail)' },
        { id: 'complex', label: 'Complex (full scene, multiple characters)' },
      ] },
    ],
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(this.prices[selections.productType]?.[selections.complexity], addons, this.addons);
    },
  },
  worldbuilding: {
    id: 'worldbuilding', label: 'Worldbuilding pricing', currency: 'USD',
    addons: WORLDBUILDING_ADDONS, prices: WORLDBUILDING_PRICES,
    dimensions: [
      { id: 'assetType', label: 'What do you need?', multi: true, options: [
        { id: 'character-card', label: 'Character card' },
        { id: 'concept-art', label: 'Concept art' },
        { id: 'character-sheet', label: 'Character design sheet' },
        { id: 'visual-key', label: 'Visual key' },
        { id: 'environment', label: 'Environment design' },
        { id: 'map', label: 'Map (world, region or city)' },
        { id: 'timeline', label: 'Timeline / chronology' },
        { id: 'lore-chart', label: 'Lore chart / infographic' },
        { id: 'sigil-emblem', label: 'Sigil / emblem / crest' },
        { id: 'creature-sheet', label: 'Creature / species sheet' },
      ] },
      { id: 'detailLevel', label: 'Detail level', options: [
        { id: 'sketch', label: 'Sketch / exploratory' },
        { id: 'refined', label: 'Refined' },
        { id: 'production', label: 'Production-ready' },
      ] },
    ],
    calculate(selections, addons = {}) {
      const types = Array.isArray(selections.assetType) ? selections.assetType : selections.assetType ? [selections.assetType] : [];
      let totalBase = 0;
      for (const t of types) {
        const price = this.prices[t]?.[selections.detailLevel];
        if (price != null) totalBase += price;
      }
      if (totalBase === 0) return null;
      return calculateConfiguredPrice(totalBase, addons, this.addons);
    },
  },
  marketing: {
    id: 'marketing', label: 'Marketing pricing', currency: 'USD',
    addons: MARKETING_ADDONS, prices: MARKETING_PRICES,
    dimensions: [
      { id: 'assetType', label: 'Type of asset', options: [
        { id: 'social-banner', label: 'Social media banner' },
        { id: 'email-header', label: 'Email header' },
        { id: 'print-postcard', label: 'Print postcard' },
        { id: 'teaser-reveal', label: 'Teaser / reveal graphic' },
        { id: 'ad-banner', label: 'Ad banner' },
      ] },
      { id: 'illustrationLevel', label: 'Illustration level', options: [
        { id: 'design-only', label: 'Design only (layout + typography)' },
        { id: 'illustrated', label: 'Illustrated (custom artwork)' },
        { id: 'full-scene', label: 'Full scene illustration' },
      ] },
    ],
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(
        this.prices[selections.assetType]?.[selections.illustrationLevel],
        addons,
        this.addons,
      );
    },
  },
  interiorIllustrations: {
    id: 'interiorIllustrations', label: 'Interior illustration pricing', currency: 'USD',
    addons: INTERIOR_ADDONS, prices: INTERIOR_PRICES,
    dimensions: [
      { id: 'illustrationType', label: 'Type of illustration', options: [
        { id: 'chapter-header', label: 'Chapter header' },
        { id: 'spot-illustration', label: 'Spot illustration' },
        { id: 'half-page', label: 'Half-page illustration' },
        { id: 'full-page', label: 'Full-page illustration' },
        { id: 'full-scene', label: 'Full scene' },
      ] },
      { id: 'style', label: 'Style', options: STYLES },
      { id: 'finish', label: 'Finish', dependsOn: 'style', optionsByParent: FINISHES_BY_STYLE },
    ],
    calculate(selections, addons = {}) {
      return calculateConfiguredPrice(
        this.prices[selections.illustrationType]?.[selections.style]?.[selections.finish],
        addons,
        this.addons,
      );
    },
  },
  authorDesign: {
    id: 'authorDesign',
    label: 'Author design services',
    currency: 'USD',
    multiService: true,
    servicesStepId: 'author-design-services',
    serviceConfigs: AUTHOR_DESIGN_SERVICE_CONFIGS,
    calculate(selections, _addons, selectedServices) {
      let totalMin = 0;
      let totalMax = 0;
      const breakdown = [];
      for (const serviceId of selectedServices) {
        const svc = this.serviceConfigs[serviceId];
        if (!svc || svc.isActive === false) continue;
        const result = svc.calculate(selections);
        if (result) {
          totalMin += result.min;
          totalMax += result.max;
          breakdown.push({ serviceId, label: svc.label, min: result.min, max: result.max });
        }
      }
      if (breakdown.length === 0) return null;
      return { min: totalMin, max: totalMax, breakdown };
    },
  },
};

function clonePriceTable(value) {
  if (Array.isArray(value)) return value.map(clonePriceTable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clonePriceTable(child)]));
  }
  return value;
}

function optionSettingsFor(settings, dimensionId, optionId) {
  return settings?.dimensions?.[dimensionId]?.options?.[optionId] ?? {};
}

function mergeOption(option, settings, dimensionId) {
  const override = optionSettingsFor(settings, dimensionId, option.id);
  return {
    ...option,
    ...(typeof override.label === 'string' && override.label.trim() ? { label: override.label.trim() } : {}),
    ...(typeof override.isActive === 'boolean' ? { isActive: override.isActive } : {}),
  };
}

function mergeDimension(dimension, settings) {
  const override = settings?.dimensions?.[dimension.id] ?? {};
  const merged = {
    ...dimension,
    ...(typeof override.label === 'string' && override.label.trim() ? { label: override.label.trim() } : {}),
  };

  if (Array.isArray(dimension.options)) {
    merged.options = dimension.options.map((option) => mergeOption(option, settings, dimension.id));
  }
  if (dimension.optionsByParent && typeof dimension.optionsByParent === 'object') {
    merged.optionsByParent = Object.fromEntries(
      Object.entries(dimension.optionsByParent).map(([parentId, options]) => [
        parentId,
        Array.isArray(options) ? options.map((option) => mergeOption(option, settings, dimension.id)) : options,
      ]),
    );
  }
  return merged;
}

function mergeAddon(addon, settings) {
  const override = settings?.addons?.[addon.id] ?? {};
  const merged = { ...addon };
  for (const key of ['label', 'note']) {
    if (typeof override[key] === 'string' && override[key].trim()) merged[key] = override[key].trim();
  }
  for (const key of ['pct', 'amount', 'min']) {
    if (Number.isFinite(override[key]) && override[key] >= 0) merged[key] = override[key];
  }
  if (typeof override.isActive === 'boolean') merged.isActive = override.isActive;
  return merged;
}

function setExistingPrice(table, path, value) {
  const segments = String(path).split('.').filter(Boolean);
  if (!segments.length || !Number.isFinite(value) || value < 0) return;
  let current = table;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    if (!current || typeof current !== 'object' || !(key in current)) return;
    current = current[key];
  }
  const finalKey = segments[segments.length - 1];
  if (!current || typeof current !== 'object' || typeof current[finalKey] !== 'number') return;
  current[finalKey] = value;
}

function applySettingsToConfig(config, settings = {}, globalPriceOptions = []) {
  const configuredAddons = (settings.assignedAddons ?? [])
    .map((id) => globalPriceOptions.find((option) => option.id === id))
    .filter((option) => option && !config.addons?.some((addon) => addon.id === option.id));
  const runtime = {
    ...config,
    isActive: settings.isActive !== false,
    ...(typeof settings.label === 'string' && settings.label.trim() ? { label: settings.label.trim() } : {}),
    dimensions: (config.dimensions ?? []).map((dimension) => mergeDimension(dimension, settings)),
    addons: [...(config.addons ?? []), ...configuredAddons]
      .map((addon) => mergeAddon(addon, settings))
      .filter((addon) => addon.isActive !== false),
  };

  if (config.prices) {
    runtime.prices = clonePriceTable(config.prices);
    for (const [path, value] of Object.entries(settings.prices ?? {})) {
      setExistingPrice(runtime.prices, path, Number(value));
    }
  }

  return runtime;
}

/**
 * Applies the persisted, data-only adjustments to a known calculator. Formulas stay in this
 * module, so an admin adjustment can never execute arbitrary code in the visitor's browser.
 */
export function getRuntimePricingConfig(configId, settings = {}, customPriceOptions = []) {
  const source = PRICING_CONFIGS[configId];
  if (!source) return null;

  const runtime = applySettingsToConfig(source, settings, getGlobalPriceOptions(customPriceOptions));
  if (source.serviceConfigs) {
    runtime.serviceConfigs = Object.fromEntries(
      Object.entries(source.serviceConfigs).map(([serviceId, config]) => [
        serviceId,
        applySettingsToConfig(config, settings.services?.[serviceId] ?? {}),
      ]),
    );
  }
  return runtime;
}

function allDimensionOptions(dimension) {
  const choices = [
    ...(dimension.options ?? []),
    ...Object.values(dimension.optionsByParent ?? {}).flat(),
  ];
  return Array.from(new Map(choices.map((option) => [option.id, option])).values());
}

function optionLabelMap(dimensions) {
  return Object.fromEntries(
    dimensions.flatMap((dimension) => allDimensionOptions(dimension).map((option) => [option.id, option.label])),
  );
}

function flattenPrices(table, labels, path = [], result = []) {
  if (typeof table === 'number') {
    result.push({
      path: path.join('.'),
      label: path.map((segment) => labels[segment] ?? (segment === '0' ? 'Minimum' : segment === '1' ? 'Maximum' : segment)).join(' / '),
      value: table,
    });
    return result;
  }
  if (Array.isArray(table)) {
    table.forEach((value, index) => flattenPrices(value, labels, [...path, String(index)], result));
    return result;
  }
  if (table && typeof table === 'object') {
    Object.entries(table).forEach(([key, value]) => flattenPrices(value, labels, [...path, key], result));
  }
  return result;
}

function editorSection(id, label, config) {
  const dimensions = config.dimensions ?? [];
  return {
    id,
    label,
    dimensions: dimensions.map((dimension) => ({
      id: dimension.id,
      label: dimension.label,
      options: allDimensionOptions(dimension),
    })),
    addons: config.addons ?? [],
    prices: config.prices ? flattenPrices(config.prices, optionLabelMap(dimensions)) : [],
  };
}

/** A serializable editor map used by Admin; it deliberately exposes values, never formulas. */
export function getPricingConfigEditorModel(configId, settings = {}, customPriceOptions = []) {
  const config = PRICING_CONFIGS[configId];
  if (!config) return null;

  const sections = config.serviceConfigs
    ? Object.entries(config.serviceConfigs).map(([serviceId, service]) => editorSection(serviceId, service.label, service))
    : [editorSection('root', config.label, config)];

  if (!config.serviceConfigs && sections[0]) {
    const allOptions = getGlobalPriceOptions(customPriceOptions);
    const configured = new Set(settings.assignedAddons ?? []);
    const knownAddonIds = new Set(sections[0].addons.map((addon) => addon.id));
    sections[0].addons.push(...allOptions.filter((option) => configured.has(option.id) && !knownAddonIds.has(option.id)));
  }

  return {
    id: configId,
    label: config.label,
    currency: config.currency ?? 'USD',
    sections,
  };
}
