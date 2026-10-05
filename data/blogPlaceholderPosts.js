/**
 * Placeholder blog posts for the UI/UX phase.
 *
 * Shape mirrors `model BlogPost` in backend/prisma/schema.prisma exactly, plus the
 * `author` relation as the API serialises it, so reconnecting to the live API is a
 * change of source and nothing else.
 *
 * Lengths are deliberately varied (titles 3-12 words, excerpts 1-3 lines) and four
 * edge cases are seeded on purpose:
 *   - `no-cover-*`      -> post without coverUrl, exercises .blog-cover-placeholder
 *   - `no-excerpt-*`    -> post without excerpt, exercises the card fallback copy
 *   - `long-title-*`    -> very long title, exercises the card title clamp
 *   - id 16             -> no relatedPostIds, so the detail page drops its aside
 *
 * RESERVED SLUGS: `archive` must never be used as a post slug. /blog/archive is a
 * static route and a static segment wins over [slug], so such a post would be
 * unreachable.
 */

import { slugifyCmsValue } from '../lib/publishing';

// TODO: `readingTime` is not a field on model BlogPost. It is a value derived from
// `content`. Decide later whether to compute it client-side or add it to the schema.

const AUTHOR = { name: 'enyell', avatarUrl: '/recursos/profile_picture.webp' };

/**
 * Social profiles for the author card. The icons are the same files the site
 * footer already uses; the hrefs are placeholders until the real handles exist.
 */
const AUTHOR_SOCIALS = [
  { name: 'Instagram', icon: '/recursos/icon_social/_Instagram.svg', url: '#' },
  { name: 'TikTok', icon: '/recursos/icon_social/_TikTok.svg', url: '#' },
  { name: 'Twitter', icon: '/recursos/icon_social/_Twitter.svg', url: '#' },
  { name: 'LinkedIn', icon: '/recursos/icon_social/_Linkedin.svg', url: '#' },
  { name: 'YouTube', icon: '/recursos/icon_social/_YouTube.svg', url: '#' },
  { name: 'Wattpad', icon: '/recursos/icon_social/_Wattpad.svg', url: '#' },
  { name: 'GitHub', icon: '/recursos/icon_social/_Github.svg', url: '#' },
  { name: 'Behance', icon: '/recursos/icon_social/Behance.svg', url: '#' },
  { name: 'Dribbble', icon: '/recursos/icon_social/Dribbble.svg', url: '#' },
];

export const BLOG_PLACEHOLDER_POSTS = [
  {
    id: 1,
    slug: 'lorem-ipsum-dolor-sit-amet-consectetur',
    title: 'Lorem ipsum dolor sit amet consectetur',
    // (Dynamic content: post.title — short headline, 5 words)
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    // (Dynamic content: post.excerpt — 2-line summary shown on cards)
    coverUrl: '/recursos/hero_characters_figma.png',
    // (Dynamic metadata: post.coverUrl)
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
      <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur</li>
        <li>Adipiscing elit sed do eiusmod tempor</li>
        <li>Incididunt ut labore et dolore magna aliqua</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.</p>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.</blockquote>
      <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.</p>
      <img src="/recursos/storyboard.webp" alt="Lorem ipsum placeholder illustration" />
      <h2>Lorem ipsum sectione secunda</h2>
      <p>Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.</p>
      <pre><code>const loremIpsum = 'dolor sit amet';</code></pre>
      <p>Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.</p>
    `,
    // (Dynamic content: post.content — rich HTML body as emitted by the TipTap editor)
    isPublished: true,
    publishedAt: '2026-09-18T10:00:00.000Z',
    // (Dynamic metadata: post.publishedAt)
    author: AUTHOR,
    // (Dynamic metadata: post.author.name)
    keywords: ['Process', 'Character Design'],
    // (Dynamic metadata: post.keywords[])
    relatedPostIds: [2, 4],
    relatedProductIds: [],
    readingTime: 8,
  },
  {
    id: 2,
    slug: 'no-cover-lorem-ipsum-dolor',
    title: 'Lorem ipsum dolor sit',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
    coverUrl: null,
    // EDGE CASE: no cover — exercises .blog-cover-placeholder
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.</p>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit sed</li>
      </ul>
      <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni dolores eos qui ratione.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit.</blockquote>
      <h3>Lorem ipsum subsectione</h3>
      <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.</p>
      <p>Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae.</p>
    `,
    isPublished: true,
    publishedAt: '2026-09-11T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Worldbuilding'],
    relatedPostIds: [1, 3],
    relatedProductIds: [],
    readingTime: 5,
  },
  {
    id: 3,
    slug: 'no-excerpt-lorem-ipsum-consectetur-adipiscing',
    title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed',
    excerpt: null,
    // EDGE CASE: no excerpt — exercises the card fallback copy
    coverUrl: '/recursos/hero_portraits_figma.png',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate.</p>
      <img src="/recursos/content.png" alt="Lorem ipsum placeholder illustration" />
      <p>Velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Mollit anim id est laborum sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur adipiscing</li>
        <li>Sed do eiusmod tempor incididunt ut labore</li>
        <li>Et dolore magna aliqua ut enim ad minim</li>
      </ul>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.</blockquote>
      <p>Totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim.</p>
      <pre><code>function loremIpsum(dolor) {
  return dolor.sit.amet;
}</code></pre>
      <p>Ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni dolores eos qui ratione voluptatem sequi.</p>
    `,
    isPublished: true,
    publishedAt: '2026-09-04T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Illustration', 'Process'],
    relatedPostIds: [1, 5],
    relatedProductIds: [],
    readingTime: 6,
  },
  {
    id: 4,
    slug: 'long-title-lorem-ipsum-dolor-sit-amet-consectetur-adipiscing',
    title:
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore',
    // EDGE CASE: very long title — exercises the card title clamp
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
    // hero-characters.png and hero-portraits.png are transparent vertical
    // cut-outs of the home hero art: in any landscape cover crop the visible
    // band is empty, so the card showed its own background and read as a failed
    // image. Measured at 0% opaque pixels. These two render.
    coverUrl: '/recursos/image_placeholder_post_1.jpg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure.</p>
      <p>Dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod.</blockquote>
      <h3>Lorem ipsum subsectione</h3>
      <p>Sunt in culpa qui officia deserunt mollit anim id est laborum sed ut perspiciatis unde omnis iste natus error sit voluptatem.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit</li>
      </ul>
      <p>Accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae.</p>
      <img src="/recursos/hero_characters_figma2.png" alt="Lorem ipsum placeholder illustration" />
      <p>Dicta sunt explicabo nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni.</p>
    `,
    isPublished: true,
    publishedAt: '2026-08-28T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Behind the Scenes', 'Character Design'],
    relatedPostIds: [1, 2],
    relatedProductIds: [],
    readingTime: 7,
  },
  {
    id: 5,
    slug: 'lorem-ipsum-tempor-incididunt',
    title: 'Lorem ipsum tempor incididunt ut labore',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.',
    coverUrl: '/recursos/storyboard.webp',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur</li>
        <li>Adipiscing elit sed do eiusmod tempor</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit.</blockquote>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.</p>
    `,
    isPublished: true,
    publishedAt: '2026-08-21T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Tools'],
    relatedPostIds: [3, 6],
    relatedProductIds: [],
    readingTime: 4,
  },
  {
    id: 6,
    slug: 'lorem-ipsum-magna-aliqua-veniam',
    title: 'Lorem ipsum magna aliqua veniam quis nostrud',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.',
    coverUrl: '/recursos/imagine-0afa15fa.jpg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit.</p>
      <img src="/recursos/book_placeholder.png" alt="Lorem ipsum placeholder illustration" />
      <p>In voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Qui officia deserunt mollit anim id est laborum sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit sed</li>
        <li>Do eiusmod tempor incididunt</li>
      </ul>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.</blockquote>
      <p>Doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta.</p>
      <pre><code>const dolor = { sit: 'amet' };</code></pre>
      <p>Sunt explicabo nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur.</p>
    `,
    isPublished: true,
    publishedAt: '2026-08-14T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Worldbuilding', 'Illustration'],
    relatedPostIds: [2, 5],
    relatedProductIds: [],
    readingTime: 9,
  },
  {
    id: 7,
    slug: 'lorem-ipsum-exercitation-ullamco',
    title: 'Lorem ipsum exercitation ullamco laboris',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.',
    coverUrl: '/recursos/furry_placeholder.png',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing.</blockquote>
      <h3>Lorem ipsum subsectione</h3>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur adipiscing elit</li>
        <li>Sed do eiusmod tempor incididunt ut labore</li>
      </ul>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem.</p>
    `,
    isPublished: true,
    publishedAt: '2026-08-07T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Commissions', 'Process'],
    relatedPostIds: [1, 8],
    relatedProductIds: [],
    readingTime: 5,
  },
  {
    id: 8,
    slug: 'lorem-ipsum-commodo-consequat',
    title: 'Lorem ipsum commodo consequat',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, quis nostrud exercitation ullamco laboris nisi.',
    coverUrl: '/recursos/horror_placeholder.png',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit</li>
        <li>Sed do eiusmod tempor</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>Sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.</blockquote>
      <img src="/recursos/hero_portraits_figma2.png" alt="Lorem ipsum placeholder illustration" />
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque.</p>
      <p>Ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam.</p>
    `,
    isPublished: true,
    publishedAt: '2026-07-31T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Tools', 'Behind the Scenes'],
    relatedPostIds: [5, 7],
    relatedProductIds: [],
    readingTime: 6,
  },
  {
    id: 9,
    slug: 'lorem-ipsum-reprehenderit-voluptate',
    title: 'Lorem ipsum reprehenderit in voluptate velit',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim.',
    coverUrl: '/recursos/image_placeholder_post_2.jpg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur</li>
        <li>Adipiscing elit sed do eiusmod tempor</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>Irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat.</p>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.</blockquote>
      <p>Cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum sed ut perspiciatis unde omnis.</p>
    `,
    isPublished: true,
    publishedAt: '2026-07-24T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Illustration', 'Tools'],
    relatedPostIds: [3, 5],
    relatedProductIds: [],
    readingTime: 5,
  },
  {
    id: 10,
    slug: 'lorem-ipsum-excepteur-sint-occaecat',
    title: 'Lorem ipsum excepteur sint occaecat cupidatat non proident',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    coverUrl: '/recursos/content.png',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor.</p>
      <img src="/recursos/placeholder_gallery_2.svg" alt="Lorem ipsum placeholder illustration" />
      <p>In reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Non proident sunt in culpa qui officia deserunt mollit anim id est laborum sed ut perspiciatis unde omnis iste natus.</p>
      <p>Error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis.</p>
    `,
    isPublished: true,
    publishedAt: '2026-07-17T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Process', 'Behind the Scenes'],
    relatedPostIds: [1, 7],
    relatedProductIds: [],
    readingTime: 7,
  },
  {
    id: 11,
    slug: 'lorem-ipsum-culpa-officia-deserunt',
    title: 'Lorem ipsum culpa officia deserunt',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, quis nostrud exercitation ullamco.',
    coverUrl: '/recursos/placeholder_gallery_4.svg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.</p>
      <p>Consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit sed</li>
        <li>Do eiusmod tempor incididunt ut labore</li>
      </ul>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit.</blockquote>
      <h3>Lorem ipsum subsectione</h3>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem.</p>
    `,
    isPublished: true,
    publishedAt: '2026-07-10T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Worldbuilding', 'Character Design'],
    relatedPostIds: [2, 6],
    relatedProductIds: [],
    readingTime: 6,
  },
  {
    id: 12,
    slug: 'lorem-ipsum-perspiciatis-unde-omnis',
    title: 'Lorem ipsum perspiciatis unde omnis natus',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    coverUrl: '/recursos/placeholder_gallery_f3.svg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit sed.</blockquote>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    `,
    isPublished: true,
    publishedAt: '2026-07-03T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Commissions'],
    relatedPostIds: [7, 8],
    relatedProductIds: [],
    readingTime: 4,
  },
  {
    id: 13,
    slug: 'lorem-ipsum-accusantium-doloremque',
    title: 'Lorem ipsum accusantium doloremque laudantium totam rem aperiam eaque',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam.',
    coverUrl: '/recursos/hero_desktop.png',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <img src="/recursos/placeholder_gallery_5.svg" alt="Lorem ipsum placeholder illustration" />
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur adipiscing</li>
        <li>Sed do eiusmod tempor incididunt ut labore</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>Sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.</blockquote>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.</p>
    `,
    isPublished: true,
    publishedAt: '2026-06-26T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Behind the Scenes', 'Illustration'],
    relatedPostIds: [4, 6],
    relatedProductIds: [],
    readingTime: 8,
  },
  {
    id: 14,
    slug: 'lorem-ipsum-architecto-beatae-vitae',
    title: 'Lorem ipsum architecto beatae vitae',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna.',
    coverUrl: '/recursos/placeholder_gallery_f6.svg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet</li>
        <li>Consectetur adipiscing elit</li>
      </ul>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>
    `,
    isPublished: true,
    publishedAt: '2026-06-19T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Tools', 'Process'],
    relatedPostIds: [5, 8],
    relatedProductIds: [],
    readingTime: 5,
  },
  {
    id: 15,
    slug: 'lorem-ipsum-quasi-architecto-veritatis',
    title: 'Lorem ipsum quasi architecto veritatis',
    excerpt:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    coverUrl: '/recursos/placeholder_gallery_6.svg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      <h2>Lorem ipsum sectione</h2>
      <p>Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure.</p>
      <ul>
        <li>Lorem ipsum dolor sit amet consectetur</li>
        <li>Adipiscing elit sed do eiusmod tempor</li>
      </ul>
      <h3>Lorem ipsum subsectione</h3>
      <p>Dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat.</p>
      <blockquote>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod.</blockquote>
      <p>Non proident sunt in culpa qui officia deserunt mollit anim id est laborum sed ut perspiciatis unde omnis iste natus.</p>
    `,
    isPublished: true,
    publishedAt: '2026-06-12T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Character Design', 'Worldbuilding'],
    relatedPostIds: [4, 11],
    relatedProductIds: [],
    readingTime: 6,
  },
  {
    id: 16,
    slug: 'lorem-ipsum-beatae-vitae-dicta-explicabo',
    title: 'Lorem ipsum beatae vitae dicta sunt explicabo nemo enim',
    excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt.',
    coverUrl: '/recursos/placeholder_gallery_f4.svg',
    content: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore.</p>
      <h2>Lorem ipsum sectione prima</h2>
      <p>Magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <img src="/recursos/placeholder_gallery_f5.svg" alt="Lorem ipsum placeholder illustration" />
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      <h3>Lorem ipsum subsectione</h3>
      <p>Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.</p>
    `,
    isPublished: true,
    publishedAt: '2026-06-05T10:00:00.000Z',
    author: AUTHOR,
    keywords: ['Commissions', 'Tools'],
    // EDGE CASE: no related posts — the detail page must drop the whole aside
    // rather than render an empty column beside the article.
    relatedPostIds: [],
    relatedProductIds: [],
    readingTime: 5,
  },
];

/** Newest first, matching the order the API returns. */
export function getPlaceholderPosts() {
  return [...BLOG_PLACEHOLDER_POSTS].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );
}

/**
 * Emulates `GET /api/blog?page=&limit=` so the archive can be paginated from the
 * mock with the same response shape the live endpoint returns.
 */
export function getPlaceholderPostsPage(page = 1, limit = 6) {
  const all = getPlaceholderPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    posts: all.slice(start, start + limit),
    total: all.length,
    page: safePage,
    totalPages,
  };
}

/** Unique topic list derived from every post's `keywords[]`, alphabetical. */
export function getPlaceholderTopics() {
  const topics = new Set();
  BLOG_PLACEHOLDER_POSTS.forEach((post) => {
    (post.keywords || []).forEach((keyword) => topics.add(keyword));
  });
  return [...topics].sort((a, b) => a.localeCompare(b));
}

/**
 * Fields the post template's header needs that `model BlogPost` DOES NOT HAVE.
 *
 * These are placeholders for the UI phase, not a proposed schema. They are derived
 * from `id` so every post gets a different, stable value and the layout can be
 * judged against varied content instead of one repeated number.
 *
 *   seriesName        (Expected dynamic field: the series a post belongs to)
 *   updatedAt         `model BlogPost.updatedAt` exists but the API `select` omits it
 *   stats.likes       (Expected dynamic field: reaction count)
 *   stats.comments    (Expected dynamic field: comment count, inline + general)
 *   stats.shares      (Expected dynamic field: share count)
 *   author.pronouns   (Expected dynamic field: shown next to the author name)
 *   author.patreonUrl (Expected dynamic field: target of the "Be my patreon" link)
 *   author.bio        (Expected dynamic field: short description for the author card)
 *   author.readers    (Expected dynamic field: reader count)
 *   author.followers  (Expected dynamic field: follower count)
 *   author.socials    (Expected dynamic field: the author's social profiles)
 *
 * Decide when the backend is built whether each one is a column, a derived count,
 * or a separate aggregate. Nothing here should be read as a schema decision.
 */
const PLACEHOLDER_SERIES = [
  'Lorem ipsum dolor',
  'Consectetur adipiscing',
  null, // not every post belongs to a series — the row must disappear cleanly
];

/**
 * The series a post belongs to, without building the whole detail shape.
 *
 * withPostDetailFields derives seriesName from the id and nothing else, but it
 * also attaches the author's bio, socials and the invented stats — none of which
 * a list card needs. The archive filters by series over the plain list, so it
 * gets the one field it is asking about.
 *
 * PLACEHOLDER, like seriesName itself: when the schema grows a real series
 * relation this reads the relation and the callers do not change.
 */
export function getPostSeries(post) {
  if (!post || typeof post.id !== 'number') return '';
  return PLACEHOLDER_SERIES[post.id % PLACEHOLDER_SERIES.length];
}

function withPostDetailFields(post) {
  const n = post.id;

  return {
    ...post,
    seriesName: PLACEHOLDER_SERIES[n % PLACEHOLDER_SERIES.length],
    updatedAt: post.updatedAt || post.publishedAt,
    author: {
      ...post.author,
      pronouns: 'she/her',
      patreonUrl: '#',
      bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi, aliquam in hendrerit urna, pellentesque sit amet sapien fringilla.',
      // (Future content: two or three lines in the author's own voice)
      readers: 12400,
      followers: 3180,
      socials: AUTHOR_SOCIALS,
    },
    stats: {
      likes: 400 + n * 137,
      comments: 3 + ((n * 7) % 40),
      shares: 1 + ((n * 5) % 25),
    },
  };
}

/**
 * Emulates `GET /api/blog/:slug`, including the `previousPost` / `nextPost` /
 * `relatedPosts` fields the controller attaches, so the detail page renders its
 * sidebar and inline navigation from the mock. Returns null when not found.
 */
/**
 * Sequence navigation: series when there is one, chronological when there is not.
 *
 * A post that belongs to a series is read in order, so previous/next walk that
 * series by publication date (oldest first — the one written first comes first) and the counter is its position inside it. A standalone post falls back
 * to the archive's own order, newest first, so "22/52" still means something.
 *
 * `seriesName` is a placeholder field; see withPostDetailFields. When the schema
 * grows a real series relation this is the function that changes, not the UI.
 */
function getSequenceNav(post, all) {
  const series = post.seriesName;

  const entries = series
    ? all
        .filter((entry) => withPostDetailFields(entry).seriesName === series)
        .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))
    : all;

  const index = entries.findIndex((entry) => entry.id === post.id);
  if (index === -1) return null;

  return {
    scope: series ? 'series' : 'archive',
    seriesName: series || null,
    position: index + 1,
    total: entries.length,
    previous: entries[index - 1] || null,
    next: entries[index + 1] || null,
  };
}

export function getPlaceholderPostBySlug(slug) {
  const all = getPlaceholderPosts();
  const index = all.findIndex((post) => post.slug === slug);
  if (index === -1) return null;

  const post = all[index];

  // Related-post cards show a thumbnail, categories and counts, so the summary
  // carries more than the prev/next links need. When the API is reconnected these
  // are the fields its related-post `select` has to include.
  const summary = (entry) => {
    const detailed = withPostDetailFields(entry);

    return {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      excerpt: entry.excerpt,
      publishedAt: entry.publishedAt,
      coverUrl: entry.coverUrl,
      keywords: entry.keywords,
      updatedAt: detailed.updatedAt,
      stats: detailed.stats,
    };
  };

  const detailed = withPostDetailFields(post);
  const sequence = getSequenceNav(detailed, all);

  return {
    ...detailed,
    // previousPost / nextPost keep the names the API already uses, but they now
    // follow the sequence order rather than the raw archive order.
    previousPost: sequence?.previous ? summary(sequence.previous) : null,
    nextPost: sequence?.next ? summary(sequence.next) : null,
    sequence: sequence
      ? { scope: sequence.scope, seriesName: sequence.seriesName, position: sequence.position, total: sequence.total }
      : null,
    relatedPosts: (post.relatedPostIds || [])
      .map((id) => all.find((candidate) => candidate.id === id))
      .filter(Boolean)
      .map(summary),
  };
}

/**
 * Editorial imagery for the About and Follow sections of the blog landing.
 * These live in public/recursos/ (they were originally dropped in the repo-root
 * recursos/ folder, which Next.js does not serve).
 */
export const BLOG_EDITORIAL_IMAGES = {
  aboutMain: '/recursos/image_placeholder_post_1.jpg',
  aboutSecondary: [
    '/recursos/image_placeholder_post_2.jpg',
    '/recursos/placeholder_gallery_3.svg',
  ],
  followStrip: [
    '/recursos/image_placeholder_post_1.jpg',
    '/recursos/image_placeholder_post_2.jpg',
    '/recursos/placeholder_gallery_1.svg',
    '/recursos/placeholder_gallery_2.svg',
    '/recursos/placeholder_gallery_4.svg',
    '/recursos/placeholder_gallery_5.svg',
    '/recursos/placeholder_gallery_f1.svg',
    '/recursos/placeholder_gallery_f2.svg',
  ],
};

/**
 * Card category label. Derived from the first keyword rather than stored as its own
 * field, so there is no parallel taxonomy to keep in sync with `keywords[]`.
 * Not a column on model BlogPost.
 */
/**
 * The series a post can belong to, each with its posts in reading order.
 *
 * Reading order is publication order, oldest first — the one written first is
 * read first — which is the same order the sequence navigation walks.
 *
 * `seriesName` is a placeholder field on the mock, not a column on model
 * BlogPost. When a real series relation exists, this is the function that
 * changes; the series page and the sequence navigation both read from here.
 */
/**
 * Editorial metadata for a series — everything the series hero shows that is not
 * derivable from its posts.
 *
 * NONE OF THIS EXISTS ON model BlogPost. A series is a placeholder field today;
 * when it becomes a real relation these are the columns it needs:
 *   summary, category, goal, audience, introPostId, featuredPostIds[]
 *
 * `introPostId` is the post that opens the series — usually, but not necessarily,
 * the first one published, which is why it is stored rather than inferred.
 */
const PLACEHOLDER_SERIES_META = {
  'lorem-ipsum-dolor': {
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut et massa mi, aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris.',
    // (Future content: two or three sentences on what the series covers)
    category: 'Process',
    goal: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor.',
    // (Future content: one sentence on what a reader will be able to do after it)
    audience: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    // (Future content: one sentence naming who this is written for)
    introPostId: 3,
    featuredPostIds: [6, 9, 12],
  },
  'consectetur-adipiscing': {
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    category: 'Character Design',
    goal: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    audience:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
    introPostId: 16,
    featuredPostIds: [1, 7, 10],
  },
};

export function getPlaceholderSeries() {
  const all = getPlaceholderPosts();
  const bySlug = new Map();

  all.forEach((post) => {
    const name = withPostDetailFields(post).seriesName;
    if (!name) return;

    const slug = slugifyCmsValue(name, 'series');
    if (!bySlug.has(slug)) bySlug.set(slug, { slug, name, posts: [] });
    bySlug.get(slug).posts.push(post);
  });

  return [...bySlug.values()].map((series) => {
    const posts = [...series.posts].sort(
      (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
    );
    const meta = PLACEHOLDER_SERIES_META[series.slug] || {};
    const byId = (id) => posts.find((post) => post.id === id) || null;

    return {
      ...series,
      ...meta,
      posts,
      // Resolved here rather than in the page: whether the intro post is the
      // first chapter or a separate preface is a content decision, and the UI
      // should not have to know which.
      introPost: meta.introPostId ? byId(meta.introPostId) : posts[0] || null,
      featuredPosts: (meta.featuredPostIds || [])
        .map(byId)
        .filter(Boolean),
    };
  });
}

/** One series by slug, or null. Mirrors what GET /api/blog/series/:slug returns. */
export function getPlaceholderSeriesBySlug(slug) {
  return getPlaceholderSeries().find((series) => series.slug === slug) || null;
}

export function getPostCategory(post) {
  return post?.keywords?.[0] || 'General';
}
