const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10000;

function parsePage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

function parsePageSize(value) {
  const pageSize = Number.parseInt(value, 10);
  return Number.isInteger(pageSize) && pageSize >= 1
    ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
}

function parseSearch(value) {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, 100) : '';
}

function buildPageMeta(total, page, pageSize) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

module.exports = {
  parsePage, parsePageSize, parseSearch, buildPageMeta,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_PAGE,
};
