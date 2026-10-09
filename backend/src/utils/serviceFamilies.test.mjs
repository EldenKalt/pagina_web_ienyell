import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { FAMILIES, UNCLASSIFIED, CATEGORIES, familyFor, pairsForFamily,
  isFamilyId, isCategoryId, isPair, filterOptions } = require('./serviceFamilies.js');

describe('service family map', () => {
  it('SF1 contains seven categories and thirty unique pairs with known families', () => {
    expect(FAMILIES).toEqual([
      { id: 'illustration', label: 'Illustration' },
      { id: 'graphic-design', label: 'Graphic design' },
      { id: 'merch', label: 'Merch' },
      { id: 'worldbuilding', label: 'Worldbuilding' },
      { id: 'marketing', label: 'Marketing' },
      { id: 'ux-ui', label: 'UX/UI' },
      { id: 'web-development', label: 'Web development' },
      { id: 'other', label: 'Other' },
    ]);
    expect(CATEGORIES.map(({ id }) => id)).toEqual(['authors', 'personal', 'studios', 'fandoms', 'brands', 'uxui', 'nsfw']);
    const pairs = CATEGORIES.flatMap(({ id, subServices }) => subServices.map((service) => {
      expect(isFamilyId(service.family)).toBe(true);
      expect(isCategoryId(id)).toBe(true);
      expect(isPair(id, service.id)).toBe(true);
      return `${id}/${service.id}`;
    }));
    expect(pairs).toHaveLength(30);
    expect(new Set(pairs).size).toBe(30);
    expect(Object.isFrozen(FAMILIES)).toBe(true);
    expect(Object.isFrozen(CATEGORIES)).toBe(true);
    expect(Object.isFrozen(UNCLASSIFIED)).toBe(true);
    for (const category of CATEGORIES) {
      expect(Object.isFrozen(category)).toBe(true);
      expect(Object.isFrozen(category.subServices)).toBe(true);
      for (const service of category.subServices) expect(Object.isFrozen(service)).toBe(true);
    }
    expect(isFamilyId('unclassified')).toBe(false);
    expect(isCategoryId('Authors')).toBe(false);
    expect(isPair('authors', 'portrait')).toBe(false);
  });
  it('SF2 returns the original family objects for exact known pairs', () => {
    for (const [category, subService, family] of [
      ['authors', 'book-covers', 'illustration'], ['brands', 'merch', 'merch'],
      ['studios', 'custom-scope', 'other'], ['uxui', 'web', 'web-development'],
    ]) expect(familyFor(category, subService)).toBe(FAMILIES.find(({ id }) => id === family));
  });
  it('SF3 returns UNCLASSIFIED for invalid, missing or inexact pairs', () => {
    for (const [category, subService] of [
      ['authors', 'portrait'], [undefined, 'pet'], ['personal', null],
      ['Authors', 'book-covers'], [{}, []], [' authors', 'book-covers'], ['authors', 'book-covers '],
    ]) expect(familyFor(category, subService)).toBe(UNCLASSIFIED);
  });
  it('SF4 lists singleton families and rejects unknown family ids', () => {
    expect(pairsForFamily('worldbuilding')).toEqual([{ category: 'authors', subService: 'worldbuilding' }]);
    expect(pairsForFamily('marketing')).toEqual([{ category: 'authors', subService: 'marketing' }]);
    expect(pairsForFamily('unclassified')).toEqual([]);
    expect(pairsForFamily('nope')).toEqual([]);
  });
  it('SF5 returns independent plain filter options at every level', () => {
    const options = filterOptions();
    const original = filterOptions();
    expect(options).toEqual({ families: FAMILIES, categories: CATEGORIES });
    expect(Object.getPrototypeOf(options)).toBe(Object.prototype);
    options.families[0].label = 'Synthetic replacement';
    options.families.push({ id: 'fake', label: 'Synthetic family' });
    options.categories[0].label = 'Synthetic category';
    options.categories[0].subServices[0].family = 'fake';
    options.categories[0].subServices.push({ id: 'fake', label: 'Synthetic service', family: 'fake' });
    options.categories.pop();
    expect(filterOptions()).toEqual(original);
    const pairs = pairsForFamily('marketing');
    pairs[0].category = 'fake';
    expect(pairsForFamily('marketing')).toEqual([{ category: 'authors', subService: 'marketing' }]);
  });
});
