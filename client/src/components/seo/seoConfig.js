/**
 * SEO Configuration - Elite Surfing Brasil
 * Versão: 2.0.0
 * Última atualização: 2026-02-10
 *
 * REGRAS:
 * 1. URLs SEM trailing slash (exceto homepage que usa '')
 * 2. URLs devem ser idênticas às do sitemap.xml
 * 3. Descrições entre 120-160 caracteres para melhor exibição no Google
 * 4. Títulos máximo 60 caracteres
 *
 * GRUPOS REAIS (assets.js):
 * decks, leashes, capas, sarcofagos, bodyboard, sup, acessorios, outlet
 *
 * CATEGORIAS REAIS (assets.js):
 * Decks: Maldivas, Mentawai, Fiji Classic, Hawaii, J-Bay, Noronha, Peniche, Saquarema, Combate, Longboard, Front, SUP
 * Leashes: 6ft-6mm, 6ft-7mm, 7ft-7mm, 8ft-7mm
 * Capas: Refletiva Combate, Refletiva Premium, Capa Toalha
 * Acessórios: Racks, Parafinas, Quilhas, Bonés, Protetor/Rabeta, Wetsuit Bag, Diversos
 */

const BASE_URL = 'https://www.elitesurfing.com.br';

/**
 * Configuração SEO para páginas estáticas
 */
const seoConfig = {
  home: {
    title: null, // Usa título padrão do SEO.jsx
    description:
      'Loja online de acessórios de surf no Brasil. Decks, leashes, capas de prancha, sarcófagos, wax e quilhas. PIX com 10% OFF. Até 10x sem juros. Frete para todo Brasil.',
    url: '',
    keywords: [
      'loja surf brasil',
      'acessórios surf online',
      'deck surf',
      'leash surf',
      'capa prancha',
    ],
  },

  products: {
    title: 'Todos os Produtos',
    description:
      'Confira nossa coleção completa de acessórios de surf. Decks, leashes, capas, sarcófagos, wax e quilhas. Frete para todo Brasil. PIX com 10% OFF.',
    url: '/products',
    keywords: [
      'produtos surf',
      'equipamento surf brasil',
      'comprar surf online',
    ],
  },

  cart: {
    title: 'Carrinho de Compras',
    description:
      'Seu carrinho de compras na Elite Surfing Brasil. Finalize seu pedido de acessórios de surf.',
    url: '/cart',
    noindex: true,
  },

  contact: {
    title: 'Contato',
    description:
      'Fale com a Elite Surfing Brasil. Atendimento por WhatsApp, email e telefone. Tire suas dúvidas sobre produtos, frete, pagamento e pedidos.',
    url: '/contact',
    keywords: [
      'contato elite surfing',
      'loja surf atendimento',
      'whatsapp loja surf',
    ],
  },

  faq: {
    title: 'Perguntas Frequentes',
    description:
      'Respostas para as dúvidas mais comuns sobre compras, frete, PIX, boleto, prazos de entrega e devoluções na Elite Surfing Brasil.',
    url: '/faq',
    keywords: ['faq', 'perguntas frequentes', 'ajuda', 'dúvidas'],
  },

  privacy: {
    title: 'Política de Privacidade',
    description:
      'Política de privacidade da Elite Surfing Brasil conforme a LGPD (Lei 13.709/2018). Saiba como protegemos seus dados pessoais e informações de pagamento.',
    url: '/privacy',
    noindex: false,
  },

  terms: {
    title: 'Termos e Condições',
    description:
      'Termos e condições de uso da loja online Elite Surfing Brasil. Informações sobre compras, frete, garantias e devoluções conforme o CDC.',
    url: '/terms',
    noindex: false,
  },

  refund: {
    title: 'Política de Troca e Devolução',
    description:
      'Política de troca e devolução da Elite Surfing Brasil. 7 dias para devolução conforme o Código de Defesa do Consumidor (CDC). Processo simples e rápido.',
    url: '/refund-policy',
    noindex: false,
  },

  // Páginas privadas - não indexar
  myOrders: {
    title: 'Meus Pedidos',
    description:
      'Consulte o histórico dos seus pedidos na Elite Surfing Brasil.',
    url: '/my-orders',
    noindex: true,
  },

  addAddress: {
    title: 'Adicionar Endereço',
    description:
      'Adicione um novo endereço de entrega na Elite Surfing Brasil.',
    url: '/add-address',
    noindex: true,
  },

  writeReview: {
    title: 'Escrever Avaliação',
    description:
      'Compartilhe sua opinião sobre os produtos da Elite Surfing Brasil.',
    url: '/write-review',
    noindex: true,
  },

  orderSuccess: {
    title: 'Pedido Confirmado',
    description:
      'Seu pedido foi confirmado com sucesso na Elite Surfing Brasil.',
    url: '/order-success',
    noindex: true,
  },
};

/**
 * Descrições SEO para páginas de COLLECTIONS (8 grupos do assets.js)
 * Rotas: /collections/{slug}
 */
export const collectionDescriptions = {
  decks: {
    title: 'Decks de Surf - Traction Pads',
    description:
      'Decks de surf e traction pads de alta performance. EVA premium fresado com texturas que garantem aderência máxima. Modelos Maldivas, Mentawai, Fiji, Hawaii, J-Bay, Noronha, Peniche, Saquarema e Combate.',
    url: '/collections/decks',
    keywords: [
      'deck surf',
      'traction pad',
      'grip surf',
      'deck fresado',
      'deck eva',
      'comprar deck surf',
    ],
    image: '/og-image.jpg',
  },

  leashes: {
    title: 'Leashes de Surf',
    description:
      'Leashes de surf premium para máxima segurança e durabilidade. Tamanhos de 6ft a 8ft, espessuras de 6mm a 7mm. Swivel duplo anti-torção. Frete para todo Brasil.',
    url: '/collections/leashes',
    keywords: [
      'leash surf',
      'cordinha prancha',
      'leash 6ft',
      'leash 7ft',
      'leash 8ft',
      'comprar leash surf',
    ],
    image: '/og-image.jpg',
  },

  capas: {
    title: 'Capas para Prancha de Surf',
    description:
      'Capas de proteção para pranchas de surf. Modelos Refletiva Combate, Refletiva Premium e Capa Toalha. Para shortboard, fish, longboard e mais. Frete para todo Brasil.',
    url: '/collections/capas',
    keywords: [
      'capa prancha surf',
      'capa refletiva',
      'boardbag',
      'proteção prancha',
      'capa shortboard',
      'comprar capa prancha',
    ],
    image: '/og-image.jpg',
  },

  sarcofagos: {
    title: 'Sarcófagos para Prancha de Surf',
    description:
      'Sarcófagos para viagens e proteção total. Modelos Combate e Premium, com ou sem rodas. Duplos, triplos e quádruplos. Acolchoamento interno reforçado.',
    url: '/collections/sarcofagos',
    keywords: [
      'sarcófago prancha',
      'sarcófago surf',
      'capa viagem prancha',
      'boardbag viagem',
      'sarcófago rodas',
    ],
    image: '/og-image.jpg',
  },

  bodyboard: {
    title: 'Acessórios de Bodyboard',
    description:
      'Tudo para bodyboard: leashes, capas e acessórios. Produtos de qualidade premium para todas as ondas. Frete para todo Brasil. PIX com 10% OFF.',
    url: '/collections/bodyboard',
    keywords: [
      'bodyboard acessórios',
      'leash bodyboard',
      'capa bodyboard',
      'comprar bodyboard',
    ],
    image: '/og-image.jpg',
  },

  sup: {
    title: 'Stand Up Paddle - Acessórios',
    description:
      'Acessórios de Stand Up Paddle: leashes, capas e decks para SUP. Produtos para passeio, race e surf. Frete para todo Brasil.',
    url: '/collections/sup',
    keywords: [
      'stand up paddle',
      'sup acessórios',
      'leash sup',
      'deck sup',
      'capa sup',
    ],
    image: '/og-image.jpg',
  },

  acessorios: {
    title: 'Acessórios de Surf',
    description:
      'Acessórios de surf: parafinas (wax), quilhas, racks, bonés, protetores de rabeta e mais. Tudo que você precisa para sua sessão. Frete para todo Brasil.',
    url: '/collections/acessorios',
    keywords: [
      'acessórios surf',
      'wax surf',
      'parafina surf',
      'quilhas surf',
      'rack prancha',
      'comprar acessórios surf',
    ],
    image: '/og-image.jpg',
  },

  outlet: {
    title: 'Outlet - Ofertas de Surf',
    description:
      'Produtos de surf com desconto especial. Decks, leashes, capas, sarcófagos e acessórios com preços imperdíveis. Aproveite as ofertas da Elite Surfing Brasil!',
    url: '/collections/outlet',
    keywords: [
      'outlet surf',
      'promoção surf',
      'desconto surf',
      'oferta acessórios surf',
    ],
    image: '/og-image.jpg',
  },
};

/**
 * Descrições SEO para páginas de CATEGORIAS (modelos/subcategorias do assets.js)
 * Rotas: /products/{slug}
 */
export const categoryDescriptions = {
  // ═══════════════════════════════════════════════════════════════
  // DECKS - 12 categorias
  // ═══════════════════════════════════════════════════════════════

  'deck-maldivas': {
    title: 'Deck Maldivas - Traction Pad',
    description:
      'Deck Maldivas de alta performance com EVA premium. Textura exclusiva para máxima aderência. Várias cores disponíveis. Frete para todo Brasil.',
    url: '/products/deck-maldivas',
    keywords: ['deck maldivas', 'deck surf maldivas', 'traction pad maldivas'],
  },

  'deck-mentawai': {
    title: 'Deck Mentawai - Traction Pad',
    description:
      'Deck Mentawai com EVA fresado de alta qualidade. Design inspirado nas ondas da Indonésia. Grip máximo em todas as condições.',
    url: '/products/deck-mentawai',
    keywords: ['deck mentawai', 'deck surf mentawai', 'traction pad mentawai'],
  },

  'deck-fiji-classic': {
    title: 'Deck Fiji Classic - Traction Pad',
    description:
      'Deck Fiji Classic em 3 partes com EVA fresado em ângulo diamantado. Design clássico com várias combinações de cores. Kicktail de 26mm.',
    url: '/products/deck-fiji-classic',
    keywords: ['deck fiji', 'deck fiji classic', 'traction pad fiji'],
  },

  'deck-hawaii': {
    title: 'Deck Hawaii - Traction Pad',
    description:
      'Deck Hawaii com EVA fresado em ângulo diamantado. Kicktail de 26mm e fita adesiva premium. Ideal para surfistas de todos os níveis.',
    url: '/products/deck-hawaii',
    keywords: ['deck hawaii', 'deck surf hawaii', 'traction pad hawaii'],
  },

  'deck-j-bay': {
    title: 'Deck J-Bay - Traction Pad',
    description:
      'Deck J-Bay em 3 partes com EVA fresado em ângulo diamantado. Inspirado na famosa onda sul-africana. Várias cores disponíveis.',
    url: '/products/deck-j-bay',
    keywords: ['deck j-bay', 'deck jbay', 'traction pad j-bay'],
  },

  'deck-noronha': {
    title: 'Deck Noronha - Traction Pad',
    description:
      'Deck Noronha com EVA lixado e fresa dupla em formato de quadrados. Barra central super soft com detalhes CNC. Várias cores disponíveis.',
    url: '/products/deck-noronha',
    keywords: ['deck noronha', 'deck cnc', 'traction pad noronha'],
  },

  'deck-peniche': {
    title: 'Deck Peniche - Traction Pad',
    description:
      'Deck Peniche com EVA premium de alta aderência. Design funcional para performance máxima. Frete para todo Brasil.',
    url: '/products/deck-peniche',
    keywords: ['deck peniche', 'deck surf peniche', 'traction pad peniche'],
  },

  'deck-saquarema': {
    title: 'Deck Saquarema - Traction Pad',
    description:
      'Deck Saquarema com EVA lixado e fresa dupla (Double Square Groove). 3 partes, barra central super soft e kicktail rígido de 25mm. Fita adesiva 3M.',
    url: '/products/deck-saquarema',
    keywords: ['deck saquarema', 'deck premium', 'traction pad saquarema'],
  },

  'deck-combate': {
    title: 'Deck Combate - Traction Pad',
    description:
      'Deck Combate de alta resistência. Projetado para condições intensas de surf. EVA durável com aderência superior.',
    url: '/products/deck-combate',
    keywords: ['deck combate', 'deck resistente', 'traction pad combate'],
  },

  'deck-longboard': {
    title: 'Deck Longboard - Traction Pad',
    description:
      'Deck para longboard com EVA premium. Cobertura ampla para maior aderência e controle. Ideal para longboarders.',
    url: '/products/deck-longboard',
    keywords: ['deck longboard', 'grip longboard', 'traction pad longboard'],
  },

  'deck-front': {
    title: 'Deck Front - Traction Pad Frontal',
    description:
      'Deck Front para posição dianteira da prancha. EVA premium com textura anti-derrapante. Complemento perfeito para seu traction pad.',
    url: '/products/deck-front',
    keywords: ['deck front', 'deck frontal', 'front pad surf'],
  },

  'deck-sup': {
    title: 'Deck SUP - Stand Up Paddle',
    description:
      'Deck para Stand Up Paddle com EVA premium. Cobertura ampla e confortável para longas sessões. Alta aderência e durabilidade.',
    url: '/products/deck-sup',
    keywords: ['deck sup', 'deck stand up paddle', 'grip sup'],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEASHES - 4 categorias
  // ═══════════════════════════════════════════════════════════════

  'leash-6ft-6mm': {
    title: 'Leash 6ft 6mm - Leash Competição',
    description:
      'Leash competição 6ft com 6mm de espessura. Ideal para pranchas até 6\'6". Swivel duplo anti-torção. Material ultra-resistente.',
    url: '/products/leash-6ft-6mm',
    keywords: ['leash 6ft', 'leash comp', 'leash 6mm', 'cordinha surf'],
  },

  'leash-6ft-7mm': {
    title: 'Leash 6ft 7mm - Leash Regular',
    description:
      'Leash regular 6ft com 7mm de espessura. Excelente equilíbrio entre leveza e resistência. Swivel duplo anti-torção.',
    url: '/products/leash-6ft-7mm',
    keywords: ['leash 6ft 7mm', 'leash regular', 'cordinha prancha'],
  },

  'leash-7ft-7mm': {
    title: 'Leash 7ft 7mm - Leash Funboard',
    description:
      'Leash 7ft com 7mm de espessura. Ideal para funboards e pranchas maiores. Swivel duplo anti-torção e material ultra-resistente.',
    url: '/products/leash-7ft-7mm',
    keywords: ['leash 7ft', 'leash funboard', 'leash 7mm'],
  },

  'leash-8ft-7mm': {
    title: 'Leash 8ft 7mm - Leash Longboard',
    description:
      'Leash 8ft com 7mm de espessura. Perfeito para longboards e SUP. Resistência máxima com swivel duplo anti-torção.',
    url: '/products/leash-8ft-7mm',
    keywords: ['leash 8ft', 'leash longboard', 'leash 7mm longboard'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CAPAS - 3 categorias
  // ═══════════════════════════════════════════════════════════════

  'refletiva-combate': {
    title: 'Capa Refletiva Combate',
    description:
      'Capa refletiva modelo Combate para prancha de surf. Proteção térmica contra o sol. Material resistente e leve. Vários tamanhos disponíveis.',
    url: '/products/refletiva-combate',
    keywords: [
      'capa refletiva combate',
      'capa prancha refletiva',
      'boardbag refletiva',
    ],
  },

  'refletiva-premium': {
    title: 'Capa Refletiva Premium',
    description:
      'Capa refletiva modelo Premium para prancha de surf. Máxima proteção térmica e acolchoamento reforçado. Acabamento superior.',
    url: '/products/refletiva-premium',
    keywords: [
      'capa refletiva premium',
      'capa prancha premium',
      'boardbag premium',
    ],
  },

  'capa-toalha': {
    title: 'Capa Toalha para Prancha',
    description:
      'Capa toalha para prancha de surf. Proteção suave contra arranhões e absorção de umidade. Prática e funcional para o dia a dia.',
    url: '/products/capa-toalha',
    keywords: ['capa toalha prancha', 'capa toalha surf', 'sock prancha'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ACESSÓRIOS - 7 categorias
  // ═══════════════════════════════════════════════════════════════

  racks: {
    title: 'Racks para Prancha de Surf',
    description:
      'Racks para transporte de pranchas de surf. Modelos para carro e parede. Seguros e práticos. Frete para todo Brasil.',
    url: '/products/racks',
    keywords: ['rack prancha', 'rack surf carro', 'suporte prancha'],
  },

  parafinas: {
    title: 'Parafinas / Wax para Surf',
    description:
      'Parafinas e wax para surf. Fu Wax, Bull Wax e mais. Para águas frias e quentes. Aderência máxima garantida.',
    url: '/products/parafinas',
    keywords: [
      'parafina surf',
      'wax surf',
      'fu wax',
      'bull wax',
      'cera prancha',
    ],
  },

  quilhas: {
    title: 'Quilhas de Surf',
    description:
      'Quilhas de surf de alta performance. Modelos para diferentes estilos e condições. Materiais premium para máxima resposta.',
    url: '/products/quilhas',
    keywords: ['quilhas surf', 'quilha prancha', 'fins surf', 'quilha fcs'],
  },

  bones: {
    title: 'Bonés de Surf',
    description:
      'Bonés de surf para proteção contra o sol. Modelos estilosos e funcionais. Ideal para sessões e dia a dia.',
    url: '/products/bones',
    keywords: ['boné surf', 'boné aba curva surf', 'chapéu surf'],
  },

  'protetor-rabeta': {
    title: 'Protetores de Rabeta',
    description:
      'Protetores de rabeta para prancha de surf. Proteção extra contra batidas e impactos. Fácil aplicação e alta durabilidade.',
    url: '/products/protetor-rabeta',
    keywords: ['protetor rabeta', 'tail pad', 'proteção prancha'],
  },

  'wetsuit-bag': {
    title: 'Wetsuit Bag - Bolsa para Roupa de Neoprene',
    description:
      'Bolsas para wetsuit e roupas de neoprene. Práticas e impermeáveis. Ideais para organizar seu equipamento de surf.',
    url: '/products/wetsuit-bag',
    keywords: ['wetsuit bag', 'bolsa neoprene', 'saco roupa surf'],
  },

  diversos: {
    title: 'Diversos - Acessórios de Surf',
    description:
      'Acessórios diversos para surf. Produtos complementares para sua sessão e manutenção do equipamento.',
    url: '/products/diversos',
    keywords: ['acessórios surf diversos', 'manutenção prancha'],
  },
};

/**
 * Helper: Obter configuração SEO para uma collection (grupo)
 * @param {string} collectionSlug - Slug da coleção (ex: 'decks')
 * @returns {object} Configuração SEO
 */
export const getCollectionSEO = collectionSlug => {
  const slug = (collectionSlug || '').toLowerCase().trim();

  if (collectionDescriptions[slug]) {
    return collectionDescriptions[slug];
  }

  // Fallback para coleções não definidas
  const formattedName = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `${formattedName} - Elite Surfing Brasil`,
    description: `Coleção ${formattedName} na Elite Surfing Brasil. Acessórios de surf de alta qualidade com frete para todo Brasil.`,
    url: `/collections/${slug}`,
    keywords: [slug, 'surf', 'brasil'],
  };
};

/**
 * Helper: Obter configuração SEO para uma categoria (subcategoria/modelo)
 * @param {string} categorySlug - Slug da categoria (ex: 'deck-maldivas')
 * @returns {object} Configuração SEO
 */
export const getCategorySEO = categorySlug => {
  const slug = (categorySlug || '').toLowerCase().trim();

  if (categoryDescriptions[slug]) {
    return categoryDescriptions[slug];
  }

  // Fallback para categorias não definidas
  const formattedName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${formattedName} - Elite Surfing Brasil`,
    description: `Produtos ${formattedName} na Elite Surfing Brasil. Acessórios de surf de alta qualidade com frete para todo Brasil.`,
    url: `/products/${slug}`,
    keywords: [slug, 'surf', 'brasil'],
  };
};

/**
 * Helper: Gerar meta tags para produto individual
 * @param {object} product - Objeto do produto
 * @returns {object} Configuração SEO
 */
export const getProductSEO = product => {
  if (!product) return seoConfig.products;

  const category = (product.category || '').toLowerCase();
  const price = product.offerPrice || product.price;

  return {
    title: product.name,
    description: `${product.name} - R$ ${price?.toFixed(2).replace('.', ',')}. ${Array.isArray(product.description) ? product.description[0] : product.description || ''}`.slice(
      0,
      155
    ),
    url: `/products/${category}/${product._id}`,
    image: product.image?.[0] || '/og-image.jpg',
    type: 'product',
    product: {
      price: price,
      inStock: product.inStock || product.stock > 0,
    },
  };
};

export default seoConfig;