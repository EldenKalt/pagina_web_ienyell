const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

// Mirrors the authoritative ARTICLE_HTML_ALLOWANCES in lib/articleHtml.js.
// The compatibility test prevents these editor allowances from drifting.
const ARTICLE_HTML_ALLOWANCES = {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target"]
};

// No script execution or external resource loading is enabled in this DOM.
const DOMPurify = createDOMPurify(new JSDOM("").window);

function sanitizeArticleHtml(html) {
  if (typeof html !== "string") {
    throw new TypeError("El contenido del artículo debe ser texto HTML");
  }
  return DOMPurify.sanitize(html, ARTICLE_HTML_ALLOWANCES);
}

module.exports = { ARTICLE_HTML_ALLOWANCES, sanitizeArticleHtml };
