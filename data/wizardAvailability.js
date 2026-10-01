export const CALCULATOR_OPTION_VISIBILITY = {
  personal: {
    'personal-service': { portrait: 'portraits', pet: 'petPortraits', wedding: 'portraits', gift: 'portraits', merch: 'merch' },
  },
  authors: {
    'author-service': { 'book-covers': 'editorial', 'interior-illustrations': 'interiorIllustrations', worldbuilding: 'worldbuilding', merch: 'merch', marketing: 'marketing' },
  },
  studios: {
    'studio-service': { 'concept-art': 'studioConceptArt', 'character-development': 'studioCharacter', 'visual-key': 'studioVisualKey', environment: 'studioEnvironment', 'merch-illustration': 'merch' },
  },
  fandoms: {
    'fandom-service': { fanart: 'fanart', 'custom-merch': 'merch' },
  },
  nsfw: {
    'nsfw-service': { character: 'nsfw', scene: 'nsfw', anthro: 'nsfw' },
  },
};

export function getEntryPricingConfig(wizardId, entry) {
  if (!entry?.stepId || !entry?.optionId) return null;
  return CALCULATOR_OPTION_VISIBILITY[wizardId]?.[entry.stepId]?.[entry.optionId] || null;
}
