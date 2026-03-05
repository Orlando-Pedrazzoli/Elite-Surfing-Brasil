import logo from './logo.svg';
import logo_es from './logoes.png';
import search_icon from './search_icon.svg';
import remove_icon from './remove_icon.svg';
import arrow_right_icon_colored from './arrow_right_icon_colored.svg';
import star_icon from './star_icon.svg';
import star_dull_icon from './star_dull_icon.svg';
import cart_icon from './cart_icon.svg';
import nav_cart_icon from './nav_cart_icon.svg';
import add_icon from './add_icon.svg';
import refresh_icon from './refresh_icon.svg';
import arrow_right from './arrow_right.svg';
import arrow_left from './arrow_left.svg';
import arrow_up from './arrow_up.svg';
import arrow_down from './arrow_down.svg';
import product_list_icon from './product_list_icon.svg';
import order_icon from './order_icon.svg';
import upload_area from './upload_area.png';
import profile_icon from './profile_icon.png';
import menu_icon from './menu_icon.svg';
import delivery_truck_icon from './delivery_truck_icon.svg';
import leaf_icon from './leaf_icon.svg';
import coin_icon from './coin_icon.svg';
import box_icon from './box_icon.svg';
import trust_icon from './trust_icon.svg';
import empty_cart from './empty_cart.svg';
import black_arrow_icon from './black_arrow_icon.svg';
import white_arrow_icon from './white_arrow_icon.svg';
import add_address_iamge from './add_address_image.svg';
import decks_banner from './decks-banner.jpg';
import decks_card from './decks-card1.jpg';
import decks_card2 from './decks-card2.jpg';
import acessorios_card from './acessorios.png';
import quilhas_card from './quilhas-card.png';
import capas_card from './capas.png';
import sarcofago_card from './sarcofago.png';
import decktop_card from './decktop.png';
import leash_tech from './leash-tech.png';
import bodyboard from './bodyboard.jpg';
import standup from './standup.jpg';

export const assets = {
  logo,
  logo_es,
  search_icon,
  remove_icon,
  arrow_right_icon_colored,
  star_icon,
  star_dull_icon,
  cart_icon,
  nav_cart_icon,
  add_icon,
  refresh_icon,
  product_list_icon,
  order_icon,
  upload_area,
  profile_icon,
  menu_icon,
  delivery_truck_icon,
  leaf_icon,
  coin_icon,
  trust_icon,
  black_arrow_icon,
  white_arrow_icon,
  add_address_iamge,
  box_icon,
  arrow_right,
  arrow_left,
  arrow_up,
  arrow_down,
  empty_cart,
  decks_banner,
  decks_card,
  decks_card2,
  leash_tech,
};

// ═══════════════════════════════════════════════════════════════════
// 🆕 FILTER DEFINITIONS POR GROUP
// ═══════════════════════════════════════════════════════════════════
//
// COMO FUNCIONA:
//
// 1. Cada group tem um array de filtros (acordeões na GroupPage)
// 2. Cada filtro tem:
//    - key:     campo salvo em product.filters (ex: product.filters.boardType)
//    - label:   título do acordeão na UI (ex: "Tipo de Prancha")
//    - options: valores possíveis com value (salvo no DB) e label (exibido na UI)
//
// 3. No AddProduct (seller), ao selecionar o group, aparecem os filtros
//    daquele group como selects para o seller preencher
//
// 4. No GroupPage, os filtros aparecem como acordeões expansíveis
//    e filtram os produtos em tempo real
//
// 🆕 FILTROS ESPECIAIS:
//    - fieldPath: 'group' → filtra pelo campo product.group (não product.filters)
//      Usado nos tag groups (bodyboard, sup, outlet) para filtrar por tipo de produto
//
// EXEMPLO DE PRODUTO NO MONGODB:
// {
//   name: "Leash Premium 6ft",
//   group: "leashes",
//   category: "Leash-6ft-6mm",
//   tags: ["sup"],                          ← 🆕 tag transversal
//   freeShipping: true,                     ← 🆕 frete grátis
//   filters: {
//     boardType: "shortboard",
//     thickness: "6mm",
//     length: "6-pes"
//   }
// }
// ═══════════════════════════════════════════════════════════════════

export const filterDefinitions = {
  // ═══════════════════════════════════════════════════════════════
  // 🏄 DECKS
  // ═══════════════════════════════════════════════════════════════
  decks: [
    {
      key: 'tipo',
      label: 'Tipo',
      options: [
        { value: 'shortboard', label: 'Deck Shortboard' },
        { value: 'longboard', label: 'Deck Longboard' },
        { value: 'front', label: 'Deck Front' },
        { value: 'sup', label: 'Deck SUP' },
      ],
    },
    {
      key: 'modelo',
      label: 'Modelo',
      parentKey: 'tipo',
      parentValue: 'shortboard',
      options: [
        { value: 'maldivas', label: 'Deck Maldivas' },
        { value: 'mentawai', label: 'Deck Mentawai' },
        { value: 'fiji-classic', label: 'Deck Fiji Classic' },
        { value: 'hawaii', label: 'Deck Hawaii' },
        { value: 'j-bay', label: 'Deck J-Bay' },
        { value: 'noronha', label: 'Deck Noronha' },
        { value: 'peniche', label: 'Deck Peniche' },
        { value: 'saquarema', label: 'Deck Saquarema' },
        { value: 'combate', label: 'Deck Combate' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🔗 LEASHES
  // ═══════════════════════════════════════════════════════════════
  leashes: [
    {
      key: 'boardType',
      label: 'Tipo de Prancha',
      options: [
        { value: 'shortboard-hibridas', label: 'Shortboard / Híbridas' },
        { value: 'fun-minilong', label: 'Fun / Mini Long' },
        { value: 'longboard', label: 'Longboard' },
        { value: 'standup', label: 'Stand Up' },
        { value: 'bodyboard', label: 'Bodyboard' },
      ],
    },
    {
      key: 'thickness',
      label: 'Espessura',
      options: [
        { value: '5mm', label: '5mm' },
        { value: '5.5mm', label: '5.5mm' },
        { value: '6mm', label: '6mm' },
        { value: '6.3mm', label: '6.3mm' },
        { value: '7mm', label: '7mm' },
        { value: '8mm', label: '8mm' },
        { value: 'espiral-6mm', label: 'espiral-6mm' },
        { value: 'espiral-7mm', label: 'espiral-7mm' },
      ],
    },
    {
      key: 'length',
      label: 'Comprimento',
      options: [
        { value: '5-pes', label: '5 pés' },
        { value: '6-pes', label: '6 pés' },
        { value: '6.6-pes', label: '6.6 pés' },
        { value: '7-pes', label: '7 pés' },
        { value: '8-pes', label: '8 pés' },
        { value: '9-pes', label: '9 pés' },
        { value: '10-pes', label: '10 pés' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🛡️ CAPAS
  // ═══════════════════════════════════════════════════════════════
  capas: [
    {
      key: 'modelo',
      label: 'Modelo',
      options: [
        { value: 'refletiva-combate', label: 'Refletiva Combate' },
        { value: 'refletiva-premium', label: 'Refletiva Premium' },
        { value: 'capa-toalha', label: 'Capa Toalha' },
      ],
    },
    {
      key: 'boardType',
      label: 'Tipo de Prancha',
      options: [
        { value: 'bodyboard', label: 'Bodyboard' },
        { value: 'fish-evolution', label: 'Fish / Evolution' },
        { value: 'fun-minilong', label: 'Fun / Mini Long' },
        { value: 'longboard', label: 'Longboard' },
        { value: 'mini-simmons-tank', label: 'Mini Simmons / Mini Tank' },
        { value: 'remo', label: 'Remo' },
        { value: 'shortboard', label: 'Shortboard' },
        { value: 'skate', label: 'Skate' },
        { value: 'standup', label: 'Stand Up' },
        { value: 'standup-race', label: 'Stand Up Race' },
        { value: 'standup-wave', label: 'Stand Up Wave' },
      ],
    },
    {
      key: 'size',
      label: 'Tamanho',
      options: [
        { value: '5-10', label: "5'10" },
        { value: '6-0', label: "6'0" },
        { value: '6-2', label: "6'2" },
        { value: '6-3', label: "6'3" },
        { value: '6-4', label: "6'4" },
        { value: '6-6', label: "6'6" },
        { value: '6-8', label: "6'8" },
        { value: '7-0', label: "7'0" },
        { value: '7-2', label: "7'2" },
        { value: '7-6', label: "7'6" },
        { value: '8-0', label: "8'0" },
        { value: '8-5', label: "8'5" },
        { value: '9-0', label: "9'0" },
        { value: '9-2', label: "9'2" },
        { value: '9-6', label: "9'6" },
        { value: '10-0', label: "10'0" },
        { value: '10-5', label: "10'5" },
        { value: '11-0', label: "11'0" },
        { value: '11-6', label: "11'6" },
        { value: '12-6', label: "12'6" },
        { value: '14-0', label: "14'0" },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // ⚰️ SARCÓFAGOS
  // ═══════════════════════════════════════════════════════════════
  sarcofagos: [
    {
      key: 'modelo',
      label: 'Modelo',
      options: [
        { value: 'sarcofago-combate', label: 'Sarcófago Combate' },
        { value: 'sarcofago-premium', label: 'Sarcófago Premium' },
        {
          value: 'sarcofago-combate-rodas',
          label: 'Sarcófago Combate / Rodas',
        },
        {
          value: 'sarcofago-premium-rodas',
          label: 'Sarcófago Premium / Rodas',
        },
      ],
    },
    {
      key: 'capacity',
      label: 'Sarcófagos',
      options: [
        { value: 'duplo', label: 'Duplos' },
        { value: 'triplo', label: 'Triplos' },
        { value: 'quadruplo', label: 'Quádruplos' },
      ],
    },
    {
      key: 'size',
      label: 'Tamanho',
      options: [
        { value: '6-3', label: "6'3" },
        { value: '6-6', label: "6'6" },
        { value: '6-8', label: "6'8" },
        { value: '7-0', label: "7'0" },
        { value: '7-2', label: "7'2" },
        { value: '8-0', label: "8'0" },
        { value: '9-8', label: "9'8" },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🏊 BODYBOARD — 🆕 Tag Group (busca por tag, não por group)
  //    O filtro sourceGroup filtra por product.group (de onde veio)
  // ═══════════════════════════════════════════════════════════════
  bodyboard: [
    {
      key: 'sourceGroup',
      label: 'Tipo de Produto',
      fieldPath: 'group', // 🆕 filtra pelo campo product.group
      options: [
        { value: 'leashes', label: 'Leashes' },
        { value: 'capas', label: 'Capas' },
        { value: 'acessorios', label: 'Acessórios' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🛶 STAND UP PADDLE — 🆕 Tag Group
  // ═══════════════════════════════════════════════════════════════
  sup: [
    {
      key: 'sourceGroup',
      label: 'Tipo de Produto',
      fieldPath: 'group', // 🆕 filtra pelo campo product.group
      options: [
        { value: 'leashes', label: 'Leashes' },
        { value: 'capas', label: 'Capas' },
        { value: 'decks', label: 'Decks' },
        { value: 'acessorios', label: 'Acessórios' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🔱 QUILHAS
  // ═══════════════════════════════════════════════════════════════
  quilhas: [
    {
      key: 'tipo',
      label: 'Tipo de Quilha',
      options: [
        { value: 'shortboard', label: 'Quilha Shortboard' },
        { value: 'longboard', label: 'Quilha Longboard' },
        { value: 'sup', label: 'Quilha SUP' },
        { value: 'chave-parafuso', label: 'Chave / Parafuso' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🎒 ACESSÓRIOS
  // ═══════════════════════════════════════════════════════════════
  acessorios: [
    {
      key: 'tipo',
      label: 'Tipo de Produto',
      options: [
        { value: 'racks', label: 'Racks' },
        { value: 'parafinas', label: 'Parafinas' },
        { value: 'bones', label: 'Bonés' },
        { value: 'protetor-rabeta', label: 'Protetor / Rabeta' },
        { value: 'wetsuit-bag', label: 'Wetsuit Bag' },
        { value: 'diversos', label: 'Diversos' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🏷️ OUTLET — 🆕 Tag Group
  // ═══════════════════════════════════════════════════════════════
  outlet: [
    {
      key: 'sourceGroup',
      label: 'Tipo de Produto',
      fieldPath: 'group', // 🆕 filtra pelo campo product.group
      options: [
        { value: 'decks', label: 'Decks' },
        { value: 'leashes', label: 'Leashes' },
        { value: 'capas', label: 'Capas' },
        { value: 'sarcofagos', label: 'Sarcófagos' },
        { value: 'quilhas', label: 'Quilhas' },
        { value: 'acessorios', label: 'Acessórios' },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 🆕 GROUPS - Coleções principais (aparecem no CollectionsGrid)
// ═══════════════════════════════════════════════════════════════════
//
// 🆕 isTagGroup: true  → Busca produtos por TAG em vez de por group
//    tagKey: 'sup'      → Qual tag procurar nos produtos
//
//    Isto resolve o problema de SUP, Bodyboard e Outlet que agregam
//    produtos de múltiplos grupos (leashes, decks, capas, etc.)
// ═══════════════════════════════════════════════════════════════════
export const groups = [
  {
    id: 'acessorios',
    name: 'Acessórios',
    slug: 'acessorios',
    description:
      'Wax, racks, wetsuits e tudo que você precisa para sua sessão de surf.',
    image: acessorios_card,
  },
  {
    id: 'leashes',
    name: 'Leashes',
    slug: 'leashes',
    description:
      'Leashes premium para máxima segurança e durabilidade. Construídos para aguentar as condições mais pesadas.',
    image: decks_card,
  },
  {
    id: 'decks',
    name: 'Decks',
    slug: 'decks',
    description:
      'Traction pads de alta performance para todas as condições. Tecnologia EVA premium com texturas que garantem aderência máxima.',
    image: decktop_card,
  },
  {
    id: 'capas',
    name: 'Capas',
    slug: 'capas',
    description:
      'Proteja sua prancha com as nossas capas de qualidade. Materiais resistentes e designs funcionais.',
    image: capas_card,
  },
  {
    id: 'sarcofagos',
    name: 'Sarcófagos',
    slug: 'sarcofagos',
    description:
      'Sarcófagos para viagens e proteção total da sua prancha. Estrutura reforçada com acolchoamento interno.',
    image: sarcofago_card,
  },
  {
    id: 'quilhas',
    name: 'Quilhas',
    slug: 'quilhas',
    description:
      'Quilhas de alta performance para shortboard, longboard e SUP. Materiais premium para máximo controle e velocidade.',
    image: quilhas_card,
  },
  // ═══════════════════════════════════════════════════════════════
  // 🆕 TAG GROUPS — Buscam produtos por tag, não por group
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bodyboard',
    name: 'Bodyboard',
    slug: 'bodyboard',
    isTagGroup: true,
    tagKey: 'bodyboard',
    description:
      'Tudo para bodyboard: pranchas, leashes, pés de pato e acessórios. Qualidade premium para todas as ondas.',
    image: bodyboard,
  },
  {
    id: 'sup',
    name: 'Stand Up Paddle',
    slug: 'sup',
    isTagGroup: true,
    tagKey: 'sup',
    description:
      'Pranchas, remos, leashes e acessórios de Stand Up Paddle. Para passeio, race e surf.',
    image: standup,
  },
  {
    id: 'outlet',
    name: 'Outlet',
    slug: 'outlet',
    isTagGroup: true,
    tagKey: 'outlet',
    description:
      'Produtos com desconto especial. Aproveite as melhores ofertas da Elite Surfing Brasil!',
    image:
      'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 🆕 TAGS DISPONÍVEIS — Para o AddProduct e para referência geral
// ═══════════════════════════════════════════════════════════════════
export const AVAILABLE_TAGS = [
  {
    value: 'sup',
    label: 'Stand Up Paddle',
    icon: '🛶',
    description: 'Aparece na coleção Stand Up Paddle',
  },
  {
    value: 'bodyboard',
    label: 'Bodyboard',
    icon: '🏊',
    description: 'Aparece na coleção Bodyboard',
  },
  {
    value: 'outlet',
    label: 'Outlet',
    icon: '🏷️',
    description: 'Aparece na coleção Outlet (com desconto)',
  },
  {
    value: 'lancamento',
    label: 'Lançamento',
    icon: '🆕',
    description: 'Destaque como produto novo',
  },
  {
    value: 'bestseller',
    label: 'Mais Vendido',
    icon: '⭐',
    description: 'Destaque como mais vendido',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 🎯 CATEGORIES - Mantido para compatibilidade com URLs e slugs
// O sistema principal de filtros agora usa filterDefinitions + product.filters
// O campo category continua existindo para URLs amigáveis de produto
// ═══════════════════════════════════════════════════════════════════
export const categories = [
  // ═══ DECKS ═══
  { text: 'Deck Maldivas', path: 'Deck-Maldivas', group: 'decks' },
  { text: 'Deck Mentawai', path: 'Deck-Mentawai', group: 'decks' },
  { text: 'Deck Fiji Classic', path: 'Deck-Fiji-Classic', group: 'decks' },
  { text: 'Deck Hawaii', path: 'Deck-Hawaii', group: 'decks' },
  { text: 'Deck J-Bay', path: 'Deck-J-Bay', group: 'decks' },
  { text: 'Deck Noronha', path: 'Deck-Noronha', group: 'decks' },
  { text: 'Deck Peniche', path: 'Deck-Peniche', group: 'decks' },
  { text: 'Deck Saquarema', path: 'Deck-Saquarema', group: 'decks' },
  { text: 'Deck Combate', path: 'Deck-Combate', group: 'decks' },
  { text: 'Deck Longboard', path: 'Deck-Longboard', group: 'decks' },
  { text: 'Deck Front', path: 'Deck-Front', group: 'decks' },
  { text: 'Deck SUP', path: 'Deck-SUP', group: 'decks' },

  // ═══ LEASHES ═══
  {
    text: 'Leash Shortboard / Híbridas',
    path: 'Leash-Shortboard-Hibridas',
    group: 'leashes',
  },
  {
    text: 'Leash Fun / Mini Long',
    path: 'Leash-Fun-MiniLong',
    group: 'leashes',
  },
  { text: 'Leash Longboard', path: 'Leash-Longboard', group: 'leashes' },
  { text: 'Leash Stand Up', path: 'Leash-StandUp', group: 'leashes' },
  { text: 'Leash Bodyboard', path: 'Leash-Bodyboard', group: 'leashes' },

  // ═══ CAPAS ═══
  { text: 'Refletiva Combate', path: 'Refletiva-Combate', group: 'capas' },
  { text: 'Refletiva Premium', path: 'Refletiva-Premium', group: 'capas' },
  { text: 'Capa Toalha', path: 'Capa-Toalha', group: 'capas' },

  // ═══ SARCÓFAGOS ═══
  { text: 'Sarcófago Combate', path: 'Sarcofago-Combate', group: 'sarcofagos' },
  { text: 'Sarcófago Premium', path: 'Sarcofago-Premium', group: 'sarcofagos' },
  {
    text: 'Sarcófago Combate c/ Rodas',
    path: 'Sarcofago-Combate-Rodas',
    group: 'sarcofagos',
  },
  {
    text: 'Sarcófago Premium c/ Rodas',
    path: 'Sarcofago-Premium-Rodas',
    group: 'sarcofagos',
  },

  // ═══ QUILHAS ═══
  { text: 'Quilha Shortboard', path: 'Quilha-Shortboard', group: 'quilhas' },
  { text: 'Quilha Longboard', path: 'Quilha-Longboard', group: 'quilhas' },
  { text: 'Quilha SUP', path: 'Quilha-SUP', group: 'quilhas' },
  { text: 'Chave / Parafuso', path: 'Chave-Parafuso', group: 'quilhas' },

  // ═══ ACESSÓRIOS ═══
  { text: 'Racks', path: 'Racks', group: 'acessorios' },
  { text: 'Parafinas', path: 'Parafinas', group: 'acessorios' },
  { text: 'Bonés', path: 'Bones', group: 'acessorios' },
  { text: 'Protetor / Rabeta', path: 'Protetor-Rabeta', group: 'acessorios' },
  { text: 'Wetsuit Bag', path: 'Wetsuit-Bag', group: 'acessorios' },
  { text: 'Diversos', path: 'Diversos', group: 'acessorios' },
];

// ═══════════════════════════════════════════════════════════════════
// 🛠️ HELPERS - Funções utilitárias
// ═══════════════════════════════════════════════════════════════════

/**
 * Obter categorias filtradas por grupo
 * @param {string} groupSlug - Slug do grupo (ex: 'decks')
 * @returns {Array} Categorias do grupo
 */
export const getCategoriesByGroup = groupSlug => {
  return categories.filter(cat => cat.group === groupSlug);
};

/**
 * Obter grupo por slug
 * @param {string} slug - Slug do grupo
 * @returns {Object|undefined} Dados do grupo
 */
export const getGroupBySlug = slug => {
  return groups.find(g => g.slug === slug);
};

/**
 * Obter todos os grupos que têm categorias
 * @returns {Array} Grupos com pelo menos uma categoria
 */
export const getGroupsWithCategories = () => {
  return groups.filter(group =>
    categories.some(cat => cat.group === group.slug),
  );
};

/**
 * 🆕 Obter definições de filtros de um grupo
 * @param {string} groupSlug - Slug do grupo (ex: 'leashes')
 * @returns {Array} Array de filtros com key, label e options
 */
export const getFiltersByGroup = groupSlug => {
  return filterDefinitions[groupSlug] || [];
};

/**
 * 🆕 Verificar se um grupo tem filtros definidos
 * @param {string} groupSlug - Slug do grupo
 * @returns {boolean}
 */
export const groupHasFilters = groupSlug => {
  const filters = filterDefinitions[groupSlug];
  return filters && filters.length > 0;
};

/**
 * 🆕 Obter label de um valor de filtro
 * @param {string} groupSlug - Slug do grupo
 * @param {string} filterKey - Key do filtro (ex: 'boardType')
 * @param {string} value - Valor (ex: 'shortboard')
 * @returns {string} Label legível (ex: 'Shortboard')
 */
export const getFilterLabel = (groupSlug, filterKey, value) => {
  const filters = filterDefinitions[groupSlug];
  if (!filters) return value;

  const filter = filters.find(f => f.key === filterKey);
  if (!filter) return value;

  const option = filter.options.find(o => o.value === value);
  return option ? option.label : value;
};

/**
 * 🆕 Filtrar produtos por filtros selecionados
 *    Suporta fieldPath para filtros que mapeiam campos diretos do produto
 * @param {Array} products - Array de produtos
 * @param {Object} activeFilters - Ex: { boardType: ['shortboard'], thickness: ['6mm', '7mm'] }
 * @param {string} groupSlug - Slug do grupo (para verificar fieldPath)
 * @returns {Array} Produtos filtrados
 */
export const filterProductsByFilters = (products, activeFilters, groupSlug) => {
  const activeKeys = Object.keys(activeFilters).filter(
    key => activeFilters[key].length > 0,
  );

  if (activeKeys.length === 0) return products;

  // Obter definições de filtros para verificar fieldPath
  const defs = filterDefinitions[groupSlug] || [];

  return products.filter(product => {
    const productFilters =
      product.filters instanceof Map
        ? Object.fromEntries(product.filters)
        : product.filters || {};

    return activeKeys.every(filterKey => {
      const selectedValues = activeFilters[filterKey];

      // 🆕 Verificar se o filtro tem fieldPath (ex: sourceGroup → product.group)
      const filterDef = defs.find(f => f.key === filterKey);
      if (filterDef?.fieldPath) {
        const fieldValue = product[filterDef.fieldPath];
        return fieldValue && selectedValues.includes(fieldValue);
      }

      // Filtro normal: busca em product.filters
      const productValue = productFilters[filterKey];
      return productValue && selectedValues.includes(productValue);
    });
  });
};

/**
 * 🆕 Contar produtos por valor de filtro (para mostrar contagem)
 * @param {Array} products - Produtos do grupo
 * @param {string} filterKey - Key do filtro
 * @param {string} filterValue - Valor a contar
 * @param {string} groupSlug - Slug do grupo (para verificar fieldPath)
 * @returns {number}
 */
export const countProductsByFilter = (
  products,
  filterKey,
  filterValue,
  groupSlug,
) => {
  const defs = filterDefinitions[groupSlug] || [];
  const filterDef = defs.find(f => f.key === filterKey);

  return products.filter(product => {
    if (product.isMainVariant === false) return false;

    // 🆕 fieldPath: buscar campo direto do produto
    if (filterDef?.fieldPath) {
      return product[filterDef.fieldPath] === filterValue;
    }

    const productFilters =
      product.filters instanceof Map
        ? Object.fromEntries(product.filters)
        : product.filters || {};
    return productFilters[filterKey] === filterValue;
  }).length;
};

// ═══════════════════════════════════════════════════════════════════
// 📎 FOOTER LINKS
// ═══════════════════════════════════════════════════════════════════
export const footerLinks = [
  {
    title: 'Links Rápidos',
    links: [
      { text: 'Início', url: '/' },
      { text: 'Mais Vendidos', url: '/products' },
      { text: 'Ofertas', url: '/products' },
      { text: 'Fale Conosco', url: '/contact' },
      { text: 'Perguntas Frequentes', url: '/faq' },
    ],
  },
  {
    title: 'Precisa de ajuda?',
    links: [
      { text: 'Informações de Entrega', url: '/faq' },
      { text: 'Política de Devolução', url: '/refund-policy' },
      { text: 'Formas de Pagamento', url: '/faq' },
      { text: 'Acompanhe seu Pedido', url: '/my-orders' },
      { text: 'Fale Conosco', url: '/contact' },
    ],
  },
  {
    title: 'Siga-nos',
    links: [
      { text: 'Instagram', url: 'https://instagram.com/elitesurfing' },
      { text: 'TikTok', url: '#' },
      { text: 'Facebook', url: 'https://www.facebook.com/elitesurfing.com.br' },
      { text: 'YouTube', url: '#' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// ⭐ FEATURES
// ═══════════════════════════════════════════════════════════════════
export const features = [
  {
    icon: delivery_truck_icon,
    title: 'Entrega para todo Brasil',
    description: 'Enviamos para todos os estados com rastreamento.',
  },
  {
    icon: leaf_icon,
    title: 'Qualidade Premium',
    description: 'Produtos selecionados das melhores marcas de surf.',
  },
  {
    icon: coin_icon,
    title: 'Melhor Preço',
    description: 'Preços competitivos e promoções exclusivas.',
  },
  {
    icon: trust_icon,
    title: 'Compra Segura',
    description: 'PIX e cartão de crédito com total segurança.',
  },
];
