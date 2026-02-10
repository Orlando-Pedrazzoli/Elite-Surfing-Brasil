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
// EXEMPLO DE PRODUTO NO MONGODB:
// {
//   name: "Leash Premium 6ft",
//   group: "leashes",
//   category: "Leash-6ft-6mm",
//   filters: {
//     boardType: "shortboard",      ← vem de filterDefinitions.leashes[0]
//     thickness: "6mm",             ← vem de filterDefinitions.leashes[1]
//     length: "6-pes"               ← vem de filterDefinitions.leashes[2]
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
      parentKey: 'tipo',           // indica que depende de outro filtro
      parentValue: 'shortboard',   // só relevante quando tipo = shortboard
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
        { value: 'bodyboard', label: 'Bodyboard' },
        { value: 'fun-minilong', label: 'Fun / Mini Long' },
        { value: 'longboard', label: 'Longboard' },
        { value: 'short-fish-evolution', label: 'Short / Fish / Evolution' },
        { value: 'shortboard', label: 'Shortboard' },
        { value: 'standup', label: 'Stand Up' },
      ],
    },
    {
      key: 'thickness',
      label: 'Espessura',
      options: [
        { value: '4mm', label: '4mm' },
        { value: '5mm', label: '5mm' },
        { value: '6mm', label: '6mm' },
        { value: '6.5mm', label: '6,5mm' },
        { value: '7mm', label: '7mm' },
        { value: '8mm', label: '8mm' },
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
        { value: 'funboard', label: 'Funboard' },
        { value: 'kitesurf', label: 'Kitesurf' },
        { value: 'longboard', label: 'Longboard' },
        { value: 'mini-simmons-tank', label: 'Mini Simmons / Mini Tank' },
        { value: 'remo', label: 'Remo' },
        { value: 'short-fish-evolution', label: 'Short / Fish / Evolution' },
        { value: 'shortboard', label: 'Shortboard' },
        { value: 'skate', label: 'Skate' },
        { value: 'skimboard', label: 'Skimboard' },
        { value: 'standup', label: 'Stand Up' },
        { value: 'standup-race', label: 'Stand Up Race' },
        { value: 'standup-wave', label: 'Stand Up Wave' },
      ],
    },
    {
      key: 'size',
      label: 'Tamanho',
      options: [
        { value: '5-8', label: "5'8" },
        { value: '6-0', label: "6'0" },
        { value: '6-2', label: "6'2" },
        { value: '6-4', label: "6'4" },
        { value: '6-6', label: "6'6" },
        { value: '6-8', label: "6'8" },
        { value: '7-0', label: "7'0" },
        { value: '7-6', label: "7'6" },
        { value: '8-0', label: "8'0" },
        { value: '9-0', label: "9'0" },
        { value: '9-6', label: "9'6" },
        { value: '10-0', label: "10'0" },
        { value: '10-6', label: "10'6" },
        { value: '11-0', label: "11'0" },
        { value: '12-0', label: "12'0" },
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
        { value: 'sarcofago-combate-rodas', label: 'Sarcófago Combate / Rodas' },
        { value: 'sarcofago-premium-rodas', label: 'Sarcófago Premium / Rodas' },
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
        { value: '6-0', label: "6'0" },
        { value: '6-4', label: "6'4" },
        { value: '6-8', label: "6'8" },
        { value: '7-0', label: "7'0" },
        { value: '7-6', label: "7'6" },
        { value: '8-0', label: "8'0" },
        { value: '9-0', label: "9'0" },
        { value: '9-6', label: "9'6" },
        { value: '10-0', label: "10'0" },
        { value: '10-6', label: "10'6" },
        { value: '11-0', label: "11'0" },
        { value: '12-0', label: "12'0" },
        { value: '12-6', label: "12'6" },
        { value: '14-0', label: "14'0" },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🏊 BODYBOARD
  // ═══════════════════════════════════════════════════════════════
  bodyboard: [
    {
      key: 'tipo',
      label: 'Tipo de Produto',
      options: [
        { value: 'leashes', label: 'Leashes' },
        { value: 'capas', label: 'Capas' },
        { value: 'acessorios', label: 'Acessórios' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🛶 STAND UP PADDLE
  // ═══════════════════════════════════════════════════════════════
  sup: [
    {
      key: 'tipo',
      label: 'Tipo de Produto',
      options: [
        { value: 'leashes', label: 'Leashes' },
        { value: 'capas', label: 'Capas' },
        { value: 'decks', label: 'Decks' },
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
        { value: 'quilhas', label: 'Quilhas' },
        { value: 'bones', label: 'Bonés' },
        { value: 'protetor-rabeta', label: 'Protetor / Rabeta' },
        { value: 'wetsuit-bag', label: 'Wetsuit Bag' },
        { value: 'diversos', label: 'Diversos' },
      ],
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // 🏷️ OUTLET
  // ═══════════════════════════════════════════════════════════════
  outlet: [
    {
      key: 'productType',
      label: 'Tipo de Produto',
      options: [
        { value: 'deck', label: 'Decks' },
        { value: 'leash', label: 'Leashes' },
        { value: 'capa', label: 'Capas' },
        { value: 'sarcofago', label: 'Sarcófagos' },
        { value: 'acessorio', label: 'Acessórios' },
        { value: 'bodyboard', label: 'Bodyboard' },
        { value: 'sup', label: 'Stand Up Paddle' },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 🆕 GROUPS - Coleções principais (aparecem no CollectionsGrid)
// ═══════════════════════════════════════════════════════════════════
export const groups = [
  {
    id: 'acessorios',
    name: 'Acessórios',
    slug: 'acessorios',
    description: 'Wax, quilhas, racks, wetsuits e tudo que você precisa para sua sessão de surf.',
    image: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=1920&q=80',
  },
  {
    id: 'leashes',
    name: 'Leashes',
    slug: 'leashes',
    description: 'Leashes premium para máxima segurança e durabilidade. Construídos para aguentar as condições mais pesadas.',
    image: decks_card,
    bannerImage: 'https://images.unsplash.com/photo-1455264745730-cb3b76250ae8?w=1920&q=80',
  },
  {
    id: 'decks',
    name: 'Decks',
    slug: 'decks',
    description: 'Traction pads de alta performance para todas as condições. Tecnologia EVA premium com texturas que garantem aderência máxima.',
    image: decks_card2,
    bannerImage: decks_banner,
  },
  {
    id: 'capas',
    name: 'Capas',
    slug: 'capas',
    description: 'Proteja sua prancha com as nossas capas de qualidade. Materiais resistentes e designs funcionais.',
    image: 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=1920&q=80',
  },
  {
    id: 'sarcofagos',
    name: 'Sarcófagos',
    slug: 'sarcofagos',
    description: 'Sarcófagos para viagens e proteção total da sua prancha. Estrutura reforçada com acolchoamento interno.',
    image: 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=1920&q=80',
  },
  {
    id: 'bodyboard',
    name: 'Bodyboard',
    slug: 'bodyboard',
    description: 'Tudo para bodyboard: pranchas, leashes, pés de pato e acessórios. Qualidade premium para todas as ondas.',
    image: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=1920&q=80',
  },
  {
    id: 'sup',
    name: 'Stand Up Paddle',
    slug: 'sup',
    description: 'Pranchas, remos, leashes e acessórios de Stand Up Paddle. Para passeio, race e surf.',
    image: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=1920&q=80',
  },
  {
    id: 'outlet',
    name: 'Outlet',
    slug: 'outlet',
    description: 'Produtos com desconto especial. Aproveite as melhores ofertas da Elite Surfing Brasil!',
    image: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=1920&q=80',
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
  { text: 'Leash 6ft-6mm', path: 'Leash-6ft-6mm', group: 'leashes' },
  { text: 'Leash 6ft-7mm', path: 'Leash-6ft-7mm', group: 'leashes' },
  { text: 'Leash 7ft-7mm', path: 'Leash-7ft-7mm', group: 'leashes' },
  { text: 'Leash 8ft-7mm', path: 'Leash-8ft-7mm', group: 'leashes' },
  
  // ═══ CAPAS ═══
  { text: 'Refletiva Combate', path: 'Refletiva-Combate', group: 'capas' },
  { text: 'Refletiva Premium', path: 'Refletiva-Premium', group: 'capas' },
  { text: 'Capa Toalha', path: 'Capa-Toalha', group: 'capas' },

  // ═══ ACESSÓRIOS ═══
  { text: 'Racks', path: 'Racks', group: 'acessorios' },
  { text: 'Parafinas', path: 'Parafinas', group: 'acessorios' },
  { text: 'Quilhas', path: 'Quilhas', group: 'acessorios' },
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
export const getCategoriesByGroup = (groupSlug) => {
  return categories.filter(cat => cat.group === groupSlug);
};

/**
 * Obter grupo por slug
 * @param {string} slug - Slug do grupo
 * @returns {Object|undefined} Dados do grupo
 */
export const getGroupBySlug = (slug) => {
  return groups.find(g => g.slug === slug);
};

/**
 * Obter todos os grupos que têm categorias
 * @returns {Array} Grupos com pelo menos uma categoria
 */
export const getGroupsWithCategories = () => {
  return groups.filter(group => 
    categories.some(cat => cat.group === group.slug)
  );
};

/**
 * 🆕 Obter definições de filtros de um grupo
 * @param {string} groupSlug - Slug do grupo (ex: 'leashes')
 * @returns {Array} Array de filtros com key, label e options
 */
export const getFiltersByGroup = (groupSlug) => {
  return filterDefinitions[groupSlug] || [];
};

/**
 * 🆕 Verificar se um grupo tem filtros definidos
 * @param {string} groupSlug - Slug do grupo
 * @returns {boolean}
 */
export const groupHasFilters = (groupSlug) => {
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
 * @param {Array} products - Array de produtos
 * @param {Object} activeFilters - Ex: { boardType: ['shortboard'], thickness: ['6mm', '7mm'] }
 * @returns {Array} Produtos filtrados
 */
export const filterProductsByFilters = (products, activeFilters) => {
  const activeKeys = Object.keys(activeFilters).filter(
    key => activeFilters[key].length > 0
  );
  
  if (activeKeys.length === 0) return products;
  
  return products.filter(product => {
    // product.filters pode ser um Map (Mongoose) ou Object
    const productFilters = product.filters instanceof Map 
      ? Object.fromEntries(product.filters) 
      : (product.filters || {});
    
    // AND entre filtros diferentes, OR dentro do mesmo filtro
    return activeKeys.every(filterKey => {
      const selectedValues = activeFilters[filterKey];
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
 * @returns {number}
 */
export const countProductsByFilter = (products, filterKey, filterValue) => {
  return products.filter(product => {
    if (product.isMainVariant === false) return false;
    const productFilters = product.filters instanceof Map 
      ? Object.fromEntries(product.filters) 
      : (product.filters || {});
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
      { text: 'Instagram', url: 'https://instagram.com/elitesurfingbrasil' },
      { text: 'TikTok', url: '#' },
      { text: 'Facebook', url: '#' },
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
    description: 'PIX, cartão e boleto com total segurança.',
  },
];