const { createHash, randomUUID } = require('node:crypto');
const { JSDOM } = require('jsdom');
const { indexText, resolveSelector, selectorFromRange } = require('../../../shared/annotationCore.cjs');

const hash = (value) => createHash('sha256').update(value).digest('hex');
const validKey = (key) => typeof key === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(key);

// A detached document neither executes scripts nor loads external resources.
function contentDocument(html, seed) {
  const document = new JSDOM('').window.document;
  const root = document.createElement('article');
  root.innerHTML = html;
  const seen = new Set();
  [...root.querySelectorAll('p')].forEach((paragraph, index) => {
    let key = paragraph.getAttribute('data-paragraph-id');
    if (!validKey(key) || seen.has(key)) {
      key = seed === undefined ? randomUUID() : `legacy-${hash(`${seed}:${index}:${paragraph.textContent}`).slice(0,32)}`;
      paragraph.setAttribute('data-paragraph-id', key);
    }
    seen.add(key);
  });
  return root;
}

function paragraphHtml(html, seed) {
  const root = contentDocument(html, seed);
  const output = root.innerHTML;
  root.ownerDocument.defaultView.close();
  return output;
}

function validateSelector(selector) {
  return selector && typeof selector === 'object' && !Array.isArray(selector)
    && typeof selector.exact === 'string' && selector.exact.trim().length > 0 && selector.exact.length <= 10000
    && typeof selector.prefix === 'string' && selector.prefix.length <= 32
    && typeof selector.suffix === 'string' && selector.suffix.length <= 32
    && Number.isSafeInteger(selector.start) && selector.start >= 0
    && Number.isSafeInteger(selector.end) && selector.end > selector.start
    && selector.end - selector.start === selector.exact.length;
}

function locate(root, selector) {
  const index = indexText(root);
  const range = resolveSelector(root, selector, index);
  if (!range) return null;
  const canonical = selectorFromRange(range, root, index);
  const paragraph = range.startContainer.parentElement?.closest('p[data-paragraph-id]');
  return {
    selector: canonical,
    paragraphId: paragraph?.getAttribute('data-paragraph-id') || null,
    paragraphSnapshot: paragraph?.textContent || null,
    sourceRevision: hash(index.text),
  };
}

module.exports = { hash, contentDocument, paragraphHtml, validateSelector, locate };
