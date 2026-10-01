const iconPaths = {
  fiction: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/>',
  fandoms: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/>',
  portraits: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  studio: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h2M15 7h2M7 11h2M15 11h2M7 15h2M11 21v-4h2v4"/>',
};

export const DEFAULT_SERVICE_CATALOG = {
  families: [
    {
      id: 'fiction',
      title: 'Fiction & Editorial',
      description: 'Visual work for writers, original worlds, launches and mature commissions.',
      image: '/recursos/hero_characters_figma.png',
      icon: iconPaths.fiction,
      ctaTitle: 'So, what are you looking for?',
      ctaDescription: 'Choose the kind of support your story needs.',
      isActive: true,
      offers: [
        { id: 'author-services', label: "I'm a writer and need author services.", description: 'Book covers, interiors and editorial illustration.', wizardId: 'authors', entry: { stepId: 'author-service', optionId: 'book-covers' }, isActive: true },
        { id: 'original-character', label: 'I have an original character I want to develop.', description: 'Character design, visual development and worldbuilding.', wizardId: 'authors', entry: { stepId: 'author-service', optionId: 'worldbuilding' }, isActive: true },
        { id: 'fiction-merch', label: 'I want to create merch or promote my work.', description: 'Bookmarks, prints, launch assets and campaign artwork.', wizardId: 'authors', entry: { stepId: 'author-service', optionId: 'merch' }, isActive: true },
        { id: 'fiction-mature', label: "I'm looking for mature / NSFW commissions.", description: 'Private adult commissions under the appropriate guidelines.', wizardId: 'nsfw', entry: { stepId: 'nsfw-service', optionId: 'character' }, isActive: true },
      ],
    },
    {
      id: 'fandoms',
      title: 'Fandoms',
      description: 'Fanart, favorite characters and custom fandom merchandise.',
      image: '/recursos/hero_characters_figma2.png',
      icon: iconPaths.fandoms,
      ctaTitle: 'What would you like to create?',
      ctaDescription: 'Pick the fandom commission that fits your idea.',
      isActive: true,
      offers: [
        { id: 'fanart', label: 'I want custom fanart.', description: 'A custom take on a character or world you love.', wizardId: 'fandoms', entry: { stepId: 'fandom-service', optionId: 'fanart' }, isActive: true },
        { id: 'fandom-merch', label: 'I want fandom merch.', description: 'Stickers, prints, bookmarks and other personal fandom pieces.', wizardId: 'fandoms', entry: { stepId: 'fandom-service', optionId: 'custom-merch' }, isActive: true },
        { id: 'fandom-mature', label: 'I need a private mature commission.', description: 'Adult character or scene commissions with clear boundaries.', wizardId: 'nsfw', entry: { stepId: 'nsfw-service', optionId: 'character' }, isActive: true },
      ],
    },
    {
      id: 'portraits',
      title: 'Portraits & Characters',
      description: 'Personal portraits, gifts, pets and artwork made for your own story.',
      image: '/recursos/hero_portraits_figma.png',
      icon: iconPaths.portraits,
      ctaTitle: 'Who are we creating this for?',
      ctaDescription: 'Start with the kind of personal commission you have in mind.',
      isActive: true,
      offers: [
        { id: 'portrait', label: 'I want a portrait of me or my character.', description: 'A custom illustration for yourself or someone you love.', wizardId: 'personal', entry: { stepId: 'personal-service', optionId: 'portrait' }, isActive: true },
        { id: 'gift', label: 'I want a meaningful gift or special moment.', description: 'Wedding, pet and occasion illustrations.', wizardId: 'personal', entry: { stepId: 'personal-service', optionId: 'gift' }, isActive: true },
        { id: 'portrait-merch', label: 'I want prints or personal merch.', description: 'Artwork prepared for a personal print or product.', wizardId: 'personal', entry: { stepId: 'personal-service', optionId: 'merch' }, isActive: true },
      ],
    },
    {
      id: 'studio',
      title: 'Studio, Brand & Web',
      description: 'Creative production, brand systems, campaigns and digital products.',
      image: '/recursos/storyboard.webp',
      icon: iconPaths.studio,
      ctaTitle: 'What does your project need?',
      ctaDescription: 'Choose a project path; scope-based work ends in a tailored proposal.',
      isActive: true,
      offers: [
        { id: 'studio-production', label: 'I need creative production for a studio.', description: 'Concept art, visual keys, environments and character development.', wizardId: 'studios', entry: { stepId: 'studio-service', optionId: 'concept-art' }, isActive: true },
        { id: 'studio-branding', label: 'I need branding or campaign assets.', description: 'Visual identity, logos, launches and business communication.', wizardId: 'brands', entry: { stepId: 'brand-service', optionId: 'branding' }, isActive: true },
        { id: 'studio-web', label: 'I need a website or digital product.', description: 'UX, UI and responsive web development.', wizardId: 'uxui', entry: { stepId: 'uxui-service', optionId: 'web' }, isActive: true },
        { id: 'studio-merch', label: 'I need artwork for merchandising.', description: 'Product artwork, campaigns, packaging and production-ready assets.', wizardId: 'studios', entry: { stepId: 'studio-service', optionId: 'merch-illustration' }, isActive: true },
      ],
    },
  ],
};

export function createDefaultServiceCatalog() {
  return JSON.parse(JSON.stringify(DEFAULT_SERVICE_CATALOG));
}

export function getServiceFamily(catalog, familyId) {
  return (catalog?.families || []).find((family) => family.id === familyId) || null;
}
