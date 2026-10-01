export const PORTFOLIO_SOFTWARE_OPTIONS = [
  { id: 'clip-studio', name: 'Clip Studio Paint', abbr: 'CSP' },
  { id: 'photoshop', name: 'Adobe Photoshop', abbr: 'PS' },
  { id: 'procreate', name: 'Procreate', abbr: 'Procreate' },
  { id: 'sai', name: 'Paint Tool SAI', abbr: 'SAI' },
  { id: 'krita', name: 'Krita', abbr: 'Krita' },
  { id: 'medibang', name: 'MediBang Paint', abbr: 'MediBang' },
  { id: 'illustrator', name: 'Adobe Illustrator', abbr: 'AI' },
  { id: 'firealpaca', name: 'FireAlpaca', abbr: 'FA' },
  { id: 'ibispaint', name: 'ibisPaint', abbr: 'ibis' },
  { id: 'blender', name: 'Blender', abbr: 'Blender' },
  { id: 'zbrush', name: 'ZBrush', abbr: 'ZB' },
  { id: 'after-effects', name: 'After Effects', abbr: 'AE' },
  { id: 'live2d', name: 'Live2D Cubism', abbr: 'L2D' },
  { id: 'spine', name: 'Spine', abbr: 'Spine' },
  { id: 'aseprite', name: 'Aseprite', abbr: 'Aseprite' },
];

export const PORTFOLIO_TECHNOLOGY_OPTIONS = [
  { id: 'digital', name: 'Digital Art', kind: 'medium' },
  { id: 'traditional', name: 'Traditional Art', kind: 'medium' },
  { id: 'watercolor', name: 'Watercolor', kind: 'medium' },
  { id: 'ink', name: 'Ink', kind: 'medium' },
  { id: 'pencil', name: 'Pencil / Graphite', kind: 'medium' },
  { id: 'oil', name: 'Oil Paint', kind: 'medium' },
  { id: 'acrylic', name: 'Acrylic', kind: 'medium' },
  { id: 'pastel', name: 'Pastel', kind: 'medium' },
  { id: 'charcoal', name: 'Charcoal', kind: 'medium' },
  { id: 'mixed-media', name: 'Mixed Media', kind: 'medium' },
  { id: 'vector', name: 'Vector', kind: 'technique' },
  { id: 'pixel-art', name: 'Pixel Art', kind: 'technique' },
  { id: 'cel-shading', name: 'Cel Shading', kind: 'technique' },
  { id: 'painterly', name: 'Painterly', kind: 'technique' },
  { id: 'lineart', name: 'Line Art', kind: 'technique' },
  { id: 'flat-color', name: 'Flat Color', kind: 'technique' },
  { id: 'semi-realism', name: 'Semi-Realism', kind: 'technique' },
  { id: 'anime', name: 'Anime / Manga', kind: 'style' },
  { id: 'chibi', name: 'Chibi', kind: 'style' },
  { id: 'cartoon', name: 'Cartoon', kind: 'style' },
  { id: 'realism', name: 'Realism', kind: 'style' },
];

export function normalizePortfolioSoftwareEntry(raw) {
  if (!raw) return null;
  const match = PORTFOLIO_SOFTWARE_OPTIONS.find((option) => (
    option.id === (raw.id || raw)
  ));
  if (match) return { ...match };
  if (typeof raw === 'object' && raw.name) {
    return {
      id: raw.id || raw.name,
      name: raw.name,
      abbr: raw.abbr || raw.name,
    };
  }
  return null;
}

export function normalizePortfolioTechnologyEntry(raw) {
  if (!raw) return null;
  const match = PORTFOLIO_TECHNOLOGY_OPTIONS.find((option) => (
    option.id === (raw.id || raw)
  ));
  if (match) return { ...match };
  if (typeof raw === 'object' && raw.name) {
    return {
      id: raw.id || raw.name,
      name: raw.name,
      kind: raw.kind || 'other',
    };
  }
  return null;
}
