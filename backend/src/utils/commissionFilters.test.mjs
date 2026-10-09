import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildCommissionWhere, COMMISSION_STATUSES, ADMIN_UTC_OFFSET_MINUTES,
  PAGED_MODE_KEYS } = require('./commissionFilters.js');
const jsonEq = (key, value) => ({ payload: { path: [key], equals: value } });

describe('commission filter query construction', () => {
  it('CF1 returns exactly an empty where without filters', () => {
    expect(buildCommissionWhere({})).toEqual({ where: {} });
    expect(buildCommissionWhere({}).where).not.toHaveProperty('AND');
    expect(PAGED_MODE_KEYS).toEqual(['page', 'pageSize', 'q', 'status', 'family', 'category', 'subService', 'from', 'to']);
  });
  it('CF2 builds the marketing family as an OR of pair AND conditions', () => {
    expect(buildCommissionWhere({ family: 'marketing' })).toEqual({ where: {
      AND: [{ OR: [{ AND: [jsonEq('category', 'authors'), jsonEq('subService', 'marketing')] }] }],
    } });
  });
  it('CF3 orders category before subService JSON conditions', () => {
    expect(buildCommissionWhere({ category: 'brands', subService: 'merch' })).toEqual({ where: {
      AND: [jsonEq('category', 'brands'), jsonEq('subService', 'merch')],
    } });
  });
  it('CF4 rejects invalid service values and pairs', () => {
    for (const query of [
      { subService: 'merch' }, { category: 'authors', subService: 'pet' }, { category: 'nope' },
      { family: 'unclassified' }, { family: ['a'] }, { category: {} }, { subService: null },
    ]) expect(buildCommissionWhere(query)).toEqual({ error: 'Invalid service filter.' });
  });
  it('CF5 omits empty and all service filters after trimming', () => {
    expect(buildCommissionWhere({ family: ' all ', category: '' })).toEqual({ where: {} });
    expect(buildCommissionWhere({ category: ' all ', subService: ' all ' })).toEqual({ where: {} });
  });
  it('CF6 translates local date boundaries into UTC with an exclusive upper bound', () => {
    expect(ADMIN_UTC_OFFSET_MINUTES).toBe(-360);
    expect(buildCommissionWhere({ from: '2026-10-01', to: '2026-10-31' })).toEqual({ where: {
      receivedAt: { gte: new Date('2026-10-01T06:00:00.000Z'), lt: new Date('2026-11-01T06:00:00.000Z') },
    } });
  });
  it('CF7 rejects impossible, malformed, reversed and non-string date ranges', () => {
    for (const query of [
      { from: '2026-02-30' }, { to: '10/01/2026' }, { from: '2026-10-05', to: '2026-10-01' },
      { from: ['x'] }, { to: null }, { from: '2026-13-01' }, { to: '2026-00-01' },
      { from: '2026-01-00' }, { to: '2026-02-29' },
    ]) expect(buildCommissionWhere(query)).toEqual({ error: 'Invalid date range.' });
  });
  it('CF8 combines status, search, service and a lower date boundary', () => {
    expect(buildCommissionWhere({ status: 'reviewing', q: 'x', family: 'merch', from: '2026-10-01' })).toEqual({ where: {
      status: 'reviewing',
      OR: ['id', 'name', 'email'].map((field) => ({ [field]: { contains: 'x', mode: 'insensitive' } })),
      AND: [{ OR: [
        ['authors', 'merch'], ['personal', 'merch'], ['fandoms', 'custom-merch'], ['brands', 'merch'],
      ].map(([category, subService]) => ({ AND: [jsonEq('category', category), jsonEq('subService', subService)] })) }],
      receivedAt: { gte: new Date('2026-10-01T06:00:00.000Z') },
    } });
  });
  it('CF9 returns the first status error before invalid service or date filters', () => {
    expect(buildCommissionWhere({ status: 'bogus', family: 'nope' })).toEqual({ error: 'Invalid commission status.' });
    expect(buildCommissionWhere({ status: [], from: 'bad' })).toEqual({ error: 'Invalid commission status.' });
    expect(buildCommissionWhere({ family: 'nope', from: 'bad' })).toEqual({ error: 'Invalid service filter.' });
  });
  it('CF10 preserves status and search normalization', () => {
    expect(COMMISSION_STATUSES).toBeInstanceOf(Set);
    expect([...COMMISSION_STATUSES]).toEqual(['pending', 'reviewing', 'accepted', 'declined', 'closed']);
    expect(buildCommissionWhere({ status: ' Reviewing ', q: ' a\u0000b ' })).toEqual({ where: {
      status: 'reviewing', OR: ['id', 'name', 'email'].map((field) => ({ [field]: { contains: 'ab', mode: 'insensitive' } })),
    } });
    expect(buildCommissionWhere({ status: ' ALL ', q: ['x'] })).toEqual({ where: {} });
    expect(buildCommissionWhere({ status: '', q: '' })).toEqual({ where: {} });
  });
  it('CF11 orders all service conditions and trims values without changing case', () => {
    expect(buildCommissionWhere({ family: ' marketing ', category: ' authors ', subService: ' marketing ' })).toEqual({ where: {
      AND: [
        { OR: [{ AND: [jsonEq('category', 'authors'), jsonEq('subService', 'marketing')] }] },
        jsonEq('category', 'authors'), jsonEq('subService', 'marketing'),
      ],
    } });
    expect(buildCommissionWhere({ family: 'Marketing' })).toEqual({ error: 'Invalid service filter.' });
  });
  it('CF12 supports leap days, single days and upper-only or empty boundaries', () => {
    expect(buildCommissionWhere({ from: ' 2024-02-29 ', to: '2024-02-29' })).toEqual({ where: {
      receivedAt: { gte: new Date('2024-02-29T06:00:00.000Z'), lt: new Date('2024-03-01T06:00:00.000Z') },
    } });
    expect(buildCommissionWhere({ to: '2026-12-31' })).toEqual({ where: {
      receivedAt: { lt: new Date('2027-01-01T06:00:00.000Z') },
    } });
    expect(buildCommissionWhere({ from: ' ', to: '' })).toEqual({ where: {} });
  });
});
