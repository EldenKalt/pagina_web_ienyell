/**
 * Configuración del Link in Bio.
 * Cada slide del carrusel y cada botón de intención se define aquí.
 * El contenido permanece revisado en código. El admin solo controla qué
 * botones principales están visibles mediante la API de Link-in-Bio.
 */

// ── Slides del carrusel ──
// Cada slide tiene: id, type, active (boolean para mostrar/ocultar)
// y campos específicos según el type.
export const carouselSlides = [
  {
    id: 'last-video',
    type: 'video',
    active: true,
    label: 'Last video',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: '',
    videoTitle: 'Video Title',
    videoDescription: 'A short description of the video content.',
    videoDuration: '12:34',
    videoDate: '2026-09-20',
    cta: { text: 'Subscribe to my channel', url: 'https://youtube.com/@ienyell' },
  },
  {
    id: 'last-project',
    type: 'project',
    active: true,
    label: 'Last project',
    title: 'Project Name',
    description: 'A short description of the project.',
    client: 'Client Name',
    tags: ['UX Design', 'Brand Design'],
    date: '2026-09-01',
    imageUrl: '/recursos/placeholder-project.webp',
    cta: { text: 'Explore my projects', url: '/work' },
  },
  {
    id: 'active-novel',
    type: 'novel',
    active: true,
    label: 'Active novel',
    bookName: 'Book Name',
    bookSinopsis: 'A short synopsis of the current novel...',
    bookGenre: 'Fantasy',
    bookSaga: 'Saga Name',
    bookWarning: 'Content warning if applicable',
    nextDate: '2026-10-15',
    coverUrl: '/recursos/placeholder-novel.webp',
    cta: { text: 'Start to read', url: '#' },
  },
  {
    id: 'best-seller',
    type: 'product',
    active: true,
    label: 'Best Seller',
    productName: 'Product Name',
    productDescription: 'A short description of the product.',
    productPrice: '$25.00',
    imageUrl: '/recursos/placeholder-product.webp',
    cta: { text: 'See information', url: '#' },
  },
];

// ── Botones de intención ──
export const intentionButtons = [
  {
    id: 'work-with-you', iconKey: 'briefcase', title: 'I want to work with you.',
    subtitle: 'Commissions, services, and freelance work.', href: '/links/services', active: true, order: 0, color: 'featured',
  },
  {
    id: 'social-media', iconKey: 'play', title: "I'm looking for your social media.",
    subtitle: "Find my content's channels, portfolios, and shop.", href: '/links/social', active: true, order: 1, color: 'coral',
  },
  {
    id: 'learn-from-you', iconKey: 'graduation', title: 'I want to learn from you.',
    subtitle: 'Tutorials, courses, and educational content.', href: '/links/learn', active: true, order: 2, color: 'sky',
  },
  {
    id: 'support-your-work', iconKey: 'heart', title: 'I want to support your work.',
    subtitle: 'Donations, subscriptions, and memberships.', href: '/links/support', active: true, order: 3, color: 'rose',
  },
  {
    id: 'read-stories', iconKey: 'book', title: 'I want to read your stories.',
    subtitle: 'Novels, short stories, and ongoing series.', href: '/links/stories', active: true, order: 4, color: 'amber',
  },
  {
    id: 'know-universe', iconKey: 'globe', title: 'I want to know the universe',
    subtitle: 'Read a resume of my fictional universe and know how every story is connected.', href: '/links/universe', active: true, order: 5, color: 'violet',
  },
  {
    id: 'store', iconKey: 'cart', title: "I'm looking for your store.",
    subtitle: 'Prints, merchandise, and digital products.', href: '/links/store', active: true, order: 6, color: 'mint',
  },
  {
    id: 'know-you', iconKey: 'person', title: 'I want to know you',
    subtitle: 'About me, my journey, and my creative process.', href: '/about', active: true, order: 7, color: 'lavender',
  },
  {
    id: 'stay-in-touch', iconKey: 'chat', title: 'I want to stay in touch with you.',
    subtitle: 'Contact forms, email, and direct messages.', href: '/links/contact', active: true, order: 8, color: 'slate',
  },
];

export function createDefaultLinkButtonSettings() {
  return {
    buttons: Object.fromEntries(
      intentionButtons.map((button) => [button.id, button.active !== false]),
    ),
  };
}

// ── Íconos SVG inline para los botones de intención ──
export const INTENTION_ICONS = {
  play: { viewBox: '0 0 24 24', paths: '<path d="M5 3l14 9-14 9V3z" fill="currentColor"/>' },
  briefcase: { viewBox: '0 0 24 24', paths: '<rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
  graduation: { viewBox: '0 0 24 24', paths: '<path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="currentColor"/><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="currentColor"/>' },
  heart: { viewBox: '0 0 24 24', paths: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor"/>' },
  book: { viewBox: '0 0 24 24', paths: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  globe: { viewBox: '0 0 24 24', paths: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
  cart: { viewBox: '0 0 24 24', paths: '<circle cx="9" cy="21" r="1" fill="currentColor"/><circle cx="20" cy="21" r="1" fill="currentColor"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' },
  person: { viewBox: '0 0 24 24', paths: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
  chat: { viewBox: '0 0 24 24', paths: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" fill="currentColor"/>' },
};
