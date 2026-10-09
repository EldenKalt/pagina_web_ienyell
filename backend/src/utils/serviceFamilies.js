const FAMILIES = Object.freeze([
  { id: 'illustration', label: 'Illustration' },
  { id: 'graphic-design', label: 'Graphic design' },
  { id: 'merch', label: 'Merch' },
  { id: 'worldbuilding', label: 'Worldbuilding' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'ux-ui', label: 'UX/UI' },
  { id: 'web-development', label: 'Web development' },
  { id: 'other', label: 'Other' },
].map(Object.freeze));

const UNCLASSIFIED = Object.freeze({ id: 'unclassified', label: 'Unclassified' });

const CATEGORIES = Object.freeze([
  { id: 'authors', label: 'Authors', subServices: [
    { id: 'book-covers', label: 'Book covers', family: 'illustration' },
    { id: 'interior-illustrations', label: 'Interior illustrations', family: 'illustration' },
    { id: 'extras', label: 'Extras', family: 'graphic-design' },
    { id: 'worldbuilding', label: 'Worldbuilding', family: 'worldbuilding' },
    { id: 'merch', label: 'Merch', family: 'merch' },
    { id: 'marketing', label: 'Marketing', family: 'marketing' },
  ] },
  { id: 'personal', label: 'Personal', subServices: [
    { id: 'portrait', label: 'Portrait', family: 'illustration' },
    { id: 'pet', label: 'Pet portrait', family: 'illustration' },
    { id: 'wedding', label: 'Wedding illustration', family: 'illustration' },
    { id: 'gift', label: 'Gift illustration', family: 'illustration' },
    { id: 'merch', label: 'Personal merch / print', family: 'merch' },
  ] },
  { id: 'studios', label: 'Studios', subServices: [
    { id: 'concept-art', label: 'Concept art', family: 'illustration' },
    { id: 'character-development', label: 'Character development', family: 'illustration' },
    { id: 'visual-key', label: 'Visual key', family: 'illustration' },
    { id: 'environment', label: 'Environment design', family: 'illustration' },
    { id: 'merch-illustration', label: 'Merch illustration', family: 'illustration' },
    { id: 'custom-scope', label: 'Custom scope', family: 'other' },
  ] },
  { id: 'fandoms', label: 'Fandoms', subServices: [
    { id: 'fanart', label: 'Fanart', family: 'illustration' },
    { id: 'custom-merch', label: 'Custom merch', family: 'merch' },
  ] },
  { id: 'brands', label: 'Brands', subServices: [
    { id: 'branding', label: 'Brand design', family: 'graphic-design' },
    { id: 'logo', label: 'Logo', family: 'graphic-design' },
    { id: 'banners', label: 'Banners and campaigns', family: 'graphic-design' },
    { id: 'merch', label: 'Merchandise system', family: 'merch' },
  ] },
  { id: 'uxui', label: 'UX/UI', subServices: [
    { id: 'ui', label: 'UI design', family: 'ux-ui' },
    { id: 'ux', label: 'UX design', family: 'ux-ui' },
    { id: 'web', label: 'Web development', family: 'web-development' },
    { id: 'commerce', label: 'Online store / merch shop', family: 'web-development' },
  ] },
  { id: 'nsfw', label: 'NSFW', subServices: [
    { id: 'character', label: 'Character illustration', family: 'illustration' },
    { id: 'scene', label: 'Scene illustration', family: 'illustration' },
    { id: 'anthro', label: 'Anthropomorphic work', family: 'illustration' },
  ] },
].map((category) => Object.freeze({
  ...category, subServices: Object.freeze(category.subServices.map(Object.freeze)),
})));

function familyFor(category, subService) {
  if (typeof category !== 'string' || typeof subService !== 'string') return UNCLASSIFIED;
  const service = CATEGORIES.find(({ id }) => id === category)?.subServices.find(({ id }) => id === subService);
  return FAMILIES.find(({ id }) => id === service?.family) || UNCLASSIFIED;
}

function pairsForFamily(familyId) {
  return CATEGORIES.flatMap(({ id: category, subServices }) => subServices
    .filter(({ family }) => family === familyId)
    .map(({ id: subService }) => ({ category, subService })));
}

function isFamilyId(value) {
  return FAMILIES.some(({ id }) => id === value);
}

function isCategoryId(value) {
  return CATEGORIES.some(({ id }) => id === value);
}

function isPair(category, subService) {
  return CATEGORIES.some(({ id, subServices }) => id === category
    && subServices.some(({ id: serviceId }) => serviceId === subService));
}

function filterOptions() {
  return {
    families: FAMILIES.map(({ id, label }) => ({ id, label })),
    categories: CATEGORIES.map(({ id, label, subServices }) => ({
      id, label, subServices: subServices.map(({ id, label, family }) => ({ id, label, family })),
    })),
  };
}

module.exports = { FAMILIES, UNCLASSIFIED, CATEGORIES, familyFor, pairsForFamily,
  isFamilyId, isCategoryId, isPair, filterOptions };
