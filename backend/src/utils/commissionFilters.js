const { parseSearch } = require('./adminListQuery');
const { isFamilyId, isCategoryId, isPair, pairsForFamily } = require('./serviceFamilies');

const COMMISSION_STATUSES = new Set(['pending', 'reviewing', 'accepted', 'declined', 'closed']);
const ADMIN_UTC_OFFSET_MINUTES = -360;
const PAGED_MODE_KEYS = ['page', 'pageSize', 'q', 'status', 'family', 'category', 'subService', 'from', 'to'];

function jsonEq(key, value) {
  return { payload: { path: [key], equals: value } };
}

function startOfDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return utc - ADMIN_UTC_OFFSET_MINUTES * 60000;
}

function buildCommissionWhere(query) {
  const where = {};
  if (Object.hasOwn(query, 'status')) {
    if (typeof query.status !== 'string') return { error: 'Invalid commission status.' };
    const status = query.status.trim().toLowerCase();
    if (status && status !== 'all') {
      if (!COMMISSION_STATUSES.has(status)) return { error: 'Invalid commission status.' };
      where.status = status;
    }
  }

  const q = parseSearch(query.q);
  if (q) where.OR = ['id', 'name', 'email'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } }));

  const service = {};
  for (const key of ['family', 'category', 'subService']) {
    if (!Object.hasOwn(query, key)) continue;
    if (typeof query[key] !== 'string') return { error: 'Invalid service filter.' };
    const value = query[key].trim();
    if (value && value !== 'all') service[key] = value;
  }
  const conditions = [];
  if (service.family) {
    if (!isFamilyId(service.family)) return { error: 'Invalid service filter.' };
    conditions.push({ OR: pairsForFamily(service.family).map(({ category, subService }) => ({
      AND: [jsonEq('category', category), jsonEq('subService', subService)],
    })) });
  }
  if (service.category) {
    if (!isCategoryId(service.category)) return { error: 'Invalid service filter.' };
    conditions.push(jsonEq('category', service.category));
  }
  if (service.subService) {
    if (!service.category || !isPair(service.category, service.subService)) return { error: 'Invalid service filter.' };
    conditions.push(jsonEq('subService', service.subService));
  }

  const dates = {};
  const receivedAt = {};
  for (const key of ['from', 'to']) {
    if (!Object.hasOwn(query, key)) continue;
    if (typeof query[key] !== 'string') return { error: 'Invalid date range.' };
    const value = query[key].trim();
    if (!value) continue;
    const start = startOfDate(value);
    if (start === null) return { error: 'Invalid date range.' };
    dates[key] = value;
    if (key === 'from') receivedAt.gte = new Date(start);
    else receivedAt.lt = new Date(start + 86400000);
  }
  if (dates.from && dates.to && dates.from > dates.to) return { error: 'Invalid date range.' };
  if (Object.keys(receivedAt).length) where.receivedAt = receivedAt;
  if (conditions.length) where.AND = conditions;
  return { where };
}

module.exports = { buildCommissionWhere, COMMISSION_STATUSES, ADMIN_UTC_OFFSET_MINUTES, PAGED_MODE_KEYS };
