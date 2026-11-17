// server/data/defaultCategories.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS ORIGINAIS DO SITE — usadas UMA vez para popular o MongoDB
// ─────────────────────────────────────────────────────────────────────
// Cópia de `groups` + `categories` de client/src/assets/assets.js no
// momento em que as categorias passaram a ser geridas no admin
// (/seller/categorias). Quando a coleção `categories` está vazia, o
// servidor importa esta lista automaticamente (controllers/categoryController.js).
// Depois disso o MongoDB é a fonte da verdade — editar AQUI não muda nada
// na loja.
//
// Os slugs são EXATAMENTE os que os produtos já têm gravados em
// `product.group` e `product.category` — por isso nenhum produto precisa de
// ser migrado.
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_GROUPS = [
  {
    name: 'Acessórios',
    slug: 'acessorios',
    description:
      'Wax, racks, wetsuits e tudo que você precisa para sua sessão de surf.',
    children: [
      { name: 'Racks', slug: 'Racks' },
      { name: 'Parafinas', slug: 'Parafinas' },
      { name: 'Bonés', slug: 'Bones' },
      { name: 'Protetor / Rabeta', slug: 'Protetor-Rabeta' },
      { name: 'Wetsuit Bag', slug: 'Wetsuit-Bag' },
      { name: 'Diversos', slug: 'Diversos' },
    ],
  },
  {
    name: 'Leashes',
    slug: 'leashes',
    description:
      'Leashes premium para máxima segurança e durabilidade. Construídos para aguentar as condições mais pesadas.',
    children: [
      { name: 'Leash Shortboard / Híbridas', slug: 'Leash-Shortboard-Hibridas' },
      { name: 'Leash Fun / Mini Long', slug: 'Leash-Fun-MiniLong' },
      { name: 'Leash Longboard', slug: 'Leash-Longboard' },
      { name: 'Leash Stand Up', slug: 'Leash-StandUp' },
      { name: 'Leash Bodyboard', slug: 'Leash-Bodyboard' },
    ],
  },
  {
    name: 'Decks',
    slug: 'decks',
    description:
      'Traction pads de alta performance para todas as condições. Tecnologia EVA premium com texturas que garantem aderência máxima.',
    children: [
      { name: 'Deck Maldivas', slug: 'Deck-Maldivas' },
      { name: 'Deck Mentawai', slug: 'Deck-Mentawai' },
      { name: 'Deck Fiji Classic', slug: 'Deck-Fiji-Classic' },
      { name: 'Deck Hawaii', slug: 'Deck-Hawaii' },
      { name: 'Deck J-Bay', slug: 'Deck-J-Bay' },
      { name: 'Deck Noronha', slug: 'Deck-Noronha' },
      { name: 'Deck Peniche', slug: 'Deck-Peniche' },
      { name: 'Deck Saquarema', slug: 'Deck-Saquarema' },
      { name: 'Deck Combate', slug: 'Deck-Combate' },
      { name: 'Deck Longboard', slug: 'Deck-Longboard' },
      { name: 'Deck Front', slug: 'Deck-Front' },
      { name: 'Deck SUP', slug: 'Deck-SUP' },
    ],
  },
  {
    name: 'Capas',
    slug: 'capas',
    description:
      'Proteja sua prancha com as nossas capas de qualidade. Materiais resistentes e designs funcionais.',
    children: [
      { name: 'Refletiva Combate', slug: 'Refletiva-Combate' },
      { name: 'Refletiva Premium', slug: 'Refletiva-Premium' },
      { name: 'Capa Toalha', slug: 'Capa-Toalha' },
    ],
  },
  {
    name: 'Sarcófagos',
    slug: 'sarcofagos',
    description:
      'Sarcófagos para viagens e proteção total da sua prancha. Estrutura reforçada com acolchoamento interno.',
    children: [
      { name: 'Sarcófago Combate', slug: 'Sarcofago-Combate' },
      { name: 'Sarcófago Premium', slug: 'Sarcofago-Premium' },
      { name: 'Sarcófago Combate c/ Rodas', slug: 'Sarcofago-Combate-Rodas' },
      { name: 'Sarcófago Premium c/ Rodas', slug: 'Sarcofago-Premium-Rodas' },
    ],
  },
  {
    name: 'Quilhas',
    slug: 'quilhas',
    description:
      'Quilhas de alta performance para shortboard, longboard e SUP. Materiais premium para máximo controle e velocidade.',
    children: [
      { name: 'Quilha Shortboard', slug: 'Quilha-Shortboard' },
      { name: 'Quilha Longboard', slug: 'Quilha-Longboard' },
      { name: 'Quilha SUP', slug: 'Quilha-SUP' },
      { name: 'Chave / Parafuso', slug: 'Chave-Parafuso' },
    ],
  },
  // ─── Coleções por TAG (agregam produtos de várias categorias) ───
  {
    name: 'Bodyboard',
    slug: 'bodyboard',
    isTagGroup: true,
    tagKey: 'bodyboard',
    description:
      'Tudo para bodyboard: pranchas, leashes, pés de pato e acessórios. Qualidade premium para todas as ondas.',
    children: [],
  },
  {
    name: 'Stand Up Paddle',
    slug: 'sup',
    isTagGroup: true,
    tagKey: 'sup',
    description:
      'Pranchas, remos, leashes e acessórios de Stand Up Paddle. Para passeio, race e surf.',
    children: [],
  },
  {
    name: 'Outlet',
    slug: 'outlet',
    isTagGroup: true,
    tagKey: 'outlet',
    description:
      'Produtos com desconto especial. Aproveite as melhores ofertas da Elite Surfing Brasil!',
    image:
      'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
    children: [],
  },
];
