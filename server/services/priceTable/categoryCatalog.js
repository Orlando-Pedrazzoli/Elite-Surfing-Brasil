// server/services/priceTable/categoryCatalog.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ TABELAS DE PREÇO — catálogo de categorias (títulos e ordem padrão)
// ═══════════════════════════════════════════════════════════════════════
// Espelha `categories` de client/src/assets/assets.js. Serve só para dar
// o TÍTULO e a ORDEM iniciais das seções de uma tabela nova (e das seções
// criadas automaticamente quando surge um produto de categoria nova).
// Única diferença de título: as refletivas levam "Capa" na frente
// ("Capa Refletiva Combate"), como na tabela de preços da marca.
//
// Se uma categoria for criada no site e não for adicionada aqui, nada
// quebra: a seção nasce no fim, com o título derivado do slug
// ("Deck-Novo" → "Deck Novo"), e o admin pode renomear no editor.
// ═══════════════════════════════════════════════════════════════════════

export const CATEGORY_CATALOG = [
  // ═══ DECKS ═══
  { path: 'Deck-Maldivas', title: 'Deck Maldivas', group: 'decks' },
  { path: 'Deck-Mentawai', title: 'Deck Mentawai', group: 'decks' },
  { path: 'Deck-Fiji-Classic', title: 'Deck Fiji Classic', group: 'decks' },
  { path: 'Deck-Hawaii', title: 'Deck Hawaii', group: 'decks' },
  { path: 'Deck-J-Bay', title: 'Deck J-Bay', group: 'decks' },
  { path: 'Deck-Noronha', title: 'Deck Noronha', group: 'decks' },
  { path: 'Deck-Peniche', title: 'Deck Peniche', group: 'decks' },
  { path: 'Deck-Saquarema', title: 'Deck Saquarema', group: 'decks' },
  { path: 'Deck-Combate', title: 'Deck Combate', group: 'decks' },
  { path: 'Deck-Longboard', title: 'Deck Longboard', group: 'decks' },
  { path: 'Deck-Front', title: 'Deck Front', group: 'decks' },
  { path: 'Deck-SUP', title: 'Deck SUP', group: 'decks' },

  // ═══ LEASHES ═══
  {
    path: 'Leash-Shortboard-Hibridas',
    title: 'Leash Shortboard / Híbridas',
    group: 'leashes',
  },
  {
    path: 'Leash-Fun-MiniLong',
    title: 'Leash Fun / Mini Long',
    group: 'leashes',
  },
  { path: 'Leash-Longboard', title: 'Leash Longboard', group: 'leashes' },
  { path: 'Leash-StandUp', title: 'Leash Stand Up', group: 'leashes' },
  { path: 'Leash-Bodyboard', title: 'Leash Bodyboard', group: 'leashes' },

  // ═══ CAPAS ═══
  {
    path: 'Refletiva-Combate',
    title: 'Capa Refletiva Combate',
    group: 'capas',
  },
  {
    path: 'Refletiva-Premium',
    title: 'Capa Refletiva Premium',
    group: 'capas',
  },
  { path: 'Capa-Toalha', title: 'Capa Toalha', group: 'capas' },

  // ═══ SARCÓFAGOS ═══
  {
    path: 'Sarcofago-Combate',
    title: 'Sarcófago Combate',
    group: 'sarcofagos',
  },
  {
    path: 'Sarcofago-Premium',
    title: 'Sarcófago Premium',
    group: 'sarcofagos',
  },
  {
    path: 'Sarcofago-Combate-Rodas',
    title: 'Sarcófago Combate c/ Rodas',
    group: 'sarcofagos',
  },
  {
    path: 'Sarcofago-Premium-Rodas',
    title: 'Sarcófago Premium c/ Rodas',
    group: 'sarcofagos',
  },

  // ═══ QUILHAS ═══
  { path: 'Quilha-Shortboard', title: 'Quilha Shortboard', group: 'quilhas' },
  { path: 'Quilha-Longboard', title: 'Quilha Longboard', group: 'quilhas' },
  { path: 'Quilha-SUP', title: 'Quilha SUP', group: 'quilhas' },
  { path: 'Chave-Parafuso', title: 'Chave / Parafuso', group: 'quilhas' },

  // ═══ ACESSÓRIOS ═══
  { path: 'Racks', title: 'Racks', group: 'acessorios' },
  { path: 'Parafinas', title: 'Parafinas', group: 'acessorios' },
  { path: 'Bones', title: 'Bonés', group: 'acessorios' },
  { path: 'Protetor-Rabeta', title: 'Protetor / Rabeta', group: 'acessorios' },
  { path: 'Wetsuit-Bag', title: 'Wetsuit Bag', group: 'acessorios' },
  { path: 'Diversos', title: 'Diversos', group: 'acessorios' },
];

const normalizePath = path =>
  String(path || '')
    .trim()
    .toLowerCase();

const INDEX = new Map(
  CATEGORY_CATALOG.map((cat, order) => [
    normalizePath(cat.path),
    { ...cat, order },
  ]),
);

/** Título legível de uma categoria (fallback: slug com espaços). */
export const categoryTitle = path => {
  const known = INDEX.get(normalizePath(path));
  if (known) return known.title;
  const clean = String(path || '')
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
  return clean || 'Sem categoria';
};

/** Posição da categoria na ordem padrão (desconhecidas vão para o fim). */
export const categoryOrder = path => {
  const known = INDEX.get(normalizePath(path));
  return known ? known.order : Number.MAX_SAFE_INTEGER;
};

/** Chave estável de comparação entre categorias (case-insensitive). */
export const categoryKey = path => normalizePath(path) || '__sem-categoria__';
