/**
 * Blog search.
 *
 * Today this is keyword matching, but the shape is chosen so that swapping in a
 * semantic / AI-backed search later is a change to ONE module, not a rewrite of the
 * UI. Three deliberate decisions make that possible:
 *
 *   1. One entry point, pluggable strategy. `searchPosts()` is all the UI ever calls.
 *      A future `semanticStrategy` implements the same signature and is injected;
 *      BlogSearch.jsx and the pages do not change.
 *
 *   2. Scored results from day one — `{ post, score, matchedOn }`, ordered by
 *      relevance — rather than a boolean filter. Today the score is a simple field
 *      weighting; tomorrow it is a cosine distance. Because the UI already renders in
 *      relevance order, the swap is invisible in the markup. Returning a plain
 *      filtered array now would force the UI to be reworked later.
 *
 *   3. The entry point is async even though the keyword strategy resolves
 *      synchronously. Semantic search is a network call; a sync signature would have
 *      to break every caller. Debouncing and a loading state are already in place, so
 *      this costs nothing today.
 *
 * What a semantic version would need (NOT implemented, no dependencies added):
 *   - an embedding column on BlogPost (e.g. `embedding vector(1536)`) and the
 *     `pgvector` Postgres extension;
 *   - vectors generated when a post is saved, in the blog controller's create/update
 *     path, from title + excerpt + stripped content;
 *   - a backend route doing an ANN lookup, returning the same `{post, score}` shape;
 *   - `semanticStrategy` here calling that route, with `keywordStrategy` kept as the
 *     offline/fallback path.
 */

/** Lowercase and strip accents, matching slugifyCmsValue() in lib/publishing.js. */
export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Field weights. Title matches outrank excerpt, which outranks keywords. */
const WEIGHTS = { title: 3, excerpt: 2, keywords: 1 };

/**
 * Keyword strategy: substring match over title, excerpt and keywords[] — the same
 * three fields the backend `search` param queries, so behaviour does not change when
 * the live API is connected.
 *
 * `content` is deliberately excluded: it holds HTML, so substring matching would hit
 * tag names and attributes.
 */
export function keywordStrategy(posts, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];

  const results = [];

  posts.forEach((post) => {
    const matchedOn = [];
    let score = 0;

    if (normalizeSearchText(post.title).includes(needle)) {
      matchedOn.push('title');
      score += WEIGHTS.title;
    }
    if (normalizeSearchText(post.excerpt).includes(needle)) {
      matchedOn.push('excerpt');
      score += WEIGHTS.excerpt;
    }
    if ((post.keywords || []).some((k) => normalizeSearchText(k).includes(needle))) {
      matchedOn.push('keywords');
      score += WEIGHTS.keywords;
    }

    if (score > 0) results.push({ post, score, matchedOn });
  });

  return results;
}

/**
 * The only function the UI calls.
 *
 * @returns {Promise<Array<{post: object, score: number, matchedOn: string[]}>>}
 *          ordered by descending score, then by publish date for stable ties.
 */
export async function searchPosts(posts, query, { strategy = keywordStrategy } = {}) {
  if (!query || !String(query).trim()) return [];

  const results = await strategy(posts || [], query);

  return [...results].sort(
    (a, b) =>
      b.score - a.score ||
      new Date(b.post.publishedAt) - new Date(a.post.publishedAt),
  );
}

/**
 * Narrows a list to one topic, matching against `keywords[]`.
 *
 * Topics come from a known, generated list (getPlaceholderTopics / the keywords the
 * CMS stores), so this is an exact match on the normalised value rather than a
 * substring test — "Tools" must not also match a hypothetical "Power Tools".
 *
 * Kept here beside the search so every way the post list gets narrowed lives in one
 * module and shares one normalisation.
 */
export function filterByTopic(posts, topic) {
  const needle = normalizeSearchText(topic);
  if (!needle) return posts || [];

  return (posts || []).filter((post) =>
    (post.keywords || []).some((keyword) => normalizeSearchText(keyword) === needle),
  );
}

/** Convenience for callers that only want the posts, still in relevance order. */
export function toPosts(results) {
  return results.map((result) => result.post);
}
