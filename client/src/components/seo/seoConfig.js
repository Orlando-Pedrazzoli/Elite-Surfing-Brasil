/**
 * SEO Configuration - Elite Surfing Brasil
 * Versão: 3.0.0
 * Última atualização: 2026-02-16
 *
 * REGRAS DE SINCRONIZAÇÃO:
 * 1. URLs SEM trailing slash (exceto homepage que usa '')
 * 2. URLs devem ser idênticas às do sitemap.xml
 * 3. Descrições entre 120-160 caracteres para melhor exibição no Google
 * 4. Títulos máximo 60 caracteres
 *
 * SINCRONIZADO COM:
 * - assets.js → groups[] (9 coleções)
 * - assets.js → categories[] (34 categorias)
 * - App.jsx → Routes
 * - generate-sitemap.js → URLs
 *
 * GROUPS (assets.js):
 * decks, leashes, capas, sarcofagos, quilhas, acessorios, bodyboard, sup, outlet
 *
 * CATEGORIES (assets.js) — paths exatos:
 * Decks: Deck-Maldivas, Deck-Mentawai, Deck-Fiji-Classic, Deck-Hawaii, Deck-J-Bay,
 *        Deck-Noronha, Deck-Peniche, Deck-Saquarema, Deck-Combate, Deck-Longboard,
 *        Deck-Front, Deck-SUP
 * Leashes: Leash-Shortboard-Hibridas, Leash-Fun-MiniLong, Leash-Longboard,
 *          Leash-StandUp, Leash-Bodyboard
 * Capas: Refletiva-Combate, Refletiva-Premium, Capa-Toalha
 * Sarcófagos: Sarcofago-Combate, Sarcofago-Premium, Sarcofago-Combate-Rodas,
 *             Sarcofago-Premium-Rodas
 * Quilhas: Quilha-Shortboard, Quilha-Longboard, Quilha-SUP, Chave-Parafuso
 * Acessórios: Racks, Parafinas, Bones, Protetor-Rabeta, Wetsuit-Bag, Diversos
 */

const BASE_URL = 'https://www.elitesurfing.com.br';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO SEO — PÁGINAS ESTÁTICAS
// ═══════════════════════════════════════════════════════════════════

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

  institucional: {
    title: 'Quem Somos - Elite Surfing Brasil',
    description:
      'Conheça a história da Elite Surfing Brasil. Desde a fundação até hoje, nossa missão é oferecer acessórios de surf de qualidade premium para surfistas exigentes.',
    url: '/institucional',
    noindex: false,
  },

  // Páginas privadas — não indexar
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

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO SEO — COLLECTIONS (9 grupos do assets.js)
// Rotas: /collections/{slug}
// ═══════════════════════════════════════════════════════════════════

export const collectionDescriptions = {
  decks: {
    title: 'Decks de Surf - Traction Pads',
    description:
      'Decks de surf e traction pads de alta performance. EVA premium fresado com aderência máxima. Modelos Maldivas, Mentawai, Fiji, Hawaii, J-Bay, Noronha, Peniche, Saquarema e Combate.',
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
      'Leashes de surf premium para máxima segurança e durabilidade. Para shortboard, longboard, fun, stand up e bodyboard. Swivel duplo anti-torção. Frete para todo Brasil.',
    url: '/collections/leashes',
    keywords: [
      'leash surf',
      'cordinha prancha',
      'leash shortboard',
      'leash longboard',
      'comprar leash surf',
    ],
    image: '/og-image.jpg',
  },

  capas: {
    title: 'Capas para Prancha de Surf',
    description:
      'Capas de proteção para pranchas de surf. Refletiva Combate, Refletiva Premium e Capa Toalha. Para shortboard, fish, longboard e mais. Frete para todo Brasil.',
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

  quilhas: {
    title: 'Quilhas de Surf',
    description:
      'Quilhas de alta performance para shortboard, longboard e SUP. Materiais premium para máximo controle e velocidade. Chaves e parafusos incluídos.',
    url: '/collections/quilhas',
    keywords: [
      'quilhas surf',
      'quilha shortboard',
      'quilha longboard',
      'quilha sup',
      'fins surf',
    ],
    image: '/og-image.jpg',
  },

  acessorios: {
    title: 'Acessórios de Surf',
    description:
      'Acessórios de surf: parafinas (wax), racks, bonés, protetores de rabeta, wetsuit bags e mais. Tudo que você precisa para sua sessão. Frete para todo Brasil.',
    url: '/collections/acessorios',
    keywords: [
      'acessórios surf',
      'wax surf',
      'parafina surf',
      'rack prancha',
      'comprar acessórios surf',
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

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO SEO — CATEGORIAS (34 subcategorias do assets.js)
// Rotas: /products/{slug}
//
// IMPORTANTE: As keys aqui são LOWERCASE dos paths do assets.js
// O helper getCategorySEO() faz toLowerCase() antes de buscar
// ═══════════════════════════════════════════════════════════════════

export const categoryDescriptions = {
  // ═══════════════════════════════════════════════════════════════
  // DECKS — 12 categorias
  // Paths: Deck-Maldivas, Deck-Mentawai, etc.
  // ═══════════════════════════════════════════════════════════════

  'deck-maldivas': {
    title: 'Deck Maldivas - Traction Pad',
    description:
      'Deck Maldivas de alta performance com EVA premium fresado. Textura exclusiva para máxima aderência. Várias cores disponíveis. Frete para todo Brasil.',
    url: '/products/Deck-Maldivas',
    keywords: ['deck maldivas', 'deck surf maldivas', 'traction pad maldivas'],
  },

  'deck-mentawai': {
    title: 'Deck Mentawai - Traction Pad',
    description:
      'Deck Mentawai com EVA fresado de alta qualidade. Design inspirado nas ondas da Indonésia. Grip máximo em todas as condições.',
    url: '/products/Deck-Mentawai',
    keywords: ['deck mentawai', 'deck surf mentawai', 'traction pad mentawai'],
  },

  'deck-fiji-classic': {
    title: 'Deck Fiji Classic - Traction Pad',
    description:
      'Deck Fiji Classic em 3 partes com EVA fresado em ângulo diamantado. Design clássico com várias combinações de cores. Kicktail de 26mm.',
    url: '/products/Deck-Fiji-Classic',
    keywords: ['deck fiji', 'deck fiji classic', 'traction pad fiji'],
  },

  'deck-hawaii': {
    title: 'Deck Hawaii - Traction Pad',
    description:
      'Deck Hawaii com EVA fresado em ângulo diamantado. Kicktail de 26mm e fita adesiva premium. Ideal para surfistas de todos os níveis.',
    url: '/products/Deck-Hawaii',
    keywords: ['deck hawaii', 'deck surf hawaii', 'traction pad hawaii'],
  },

  'deck-j-bay': {
    title: 'Deck J-Bay - Traction Pad',
    description:
      'Deck J-Bay em 3 partes com EVA fresado em ângulo diamantado. Inspirado na famosa onda sul-africana. Várias cores disponíveis.',
    url: '/products/Deck-J-Bay',
    keywords: ['deck j-bay', 'deck jbay', 'traction pad j-bay'],
  },

  'deck-noronha': {
    title: 'Deck Noronha - Traction Pad',
    description:
      'Deck Noronha com EVA lixado e fresa dupla em formato de quadrados. Barra central super soft com detalhes CNC. Várias cores.',
    url: '/products/Deck-Noronha',
    keywords: ['deck noronha', 'deck cnc', 'traction pad noronha'],
  },

  'deck-peniche': {
    title: 'Deck Peniche - Traction Pad',
    description:
      'Deck Peniche com EVA premium de alta aderência. Design funcional para performance máxima. Frete para todo Brasil.',
    url: '/products/Deck-Peniche',
    keywords: ['deck peniche', 'deck surf peniche', 'traction pad peniche'],
  },

  'deck-saquarema': {
    title: 'Deck Saquarema - Traction Pad',
    description:
      'Deck Saquarema com EVA lixado e fresa dupla (Double Square Groove). 3 partes, barra central super soft e kicktail rígido de 25mm. Fita 3M.',
    url: '/products/Deck-Saquarema',
    keywords: ['deck saquarema', 'deck premium', 'traction pad saquarema'],
  },

  'deck-combate': {
    title: 'Deck Combate - Traction Pad',
    description:
      'Deck Combate de alta resistência. Projetado para condições intensas de surf. EVA durável com aderência superior.',
    url: '/products/Deck-Combate',
    keywords: ['deck combate', 'deck resistente', 'traction pad combate'],
  },

  'deck-longboard': {
    title: 'Deck Longboard - Traction Pad',
    description:
      'Deck para longboard com EVA premium. Cobertura ampla para maior aderência e controle. Ideal para longboarders.',
    url: '/products/Deck-Longboard',
    keywords: ['deck longboard', 'grip longboard', 'traction pad longboard'],
  },

  'deck-front': {
    title: 'Deck Front - Traction Pad Frontal',
    description:
      'Deck Front para posição dianteira da prancha. EVA premium com textura anti-derrapante. Complemento perfeito para seu traction pad.',
    url: '/products/Deck-Front',
    keywords: ['deck front', 'deck frontal', 'front pad surf'],
  },

  'deck-sup': {
    title: 'Deck SUP - Stand Up Paddle',
    description:
      'Deck para Stand Up Paddle com EVA premium. Cobertura ampla e confortável para longas sessões. Alta aderência e durabilidade.',
    url: '/products/Deck-SUP',
    keywords: ['deck sup', 'deck stand up paddle', 'grip sup'],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEASHES — 5 categorias
  // Paths: Leash-Shortboard-Hibridas, Leash-Fun-MiniLong, etc.
  // ═══════════════════════════════════════════════════════════════

  'leash-shortboard-hibridas': {
    title: 'Leash Shortboard / Híbridas',
    description:
      'Leashes para shortboard e pranchas híbridas. Swivel duplo anti-torção, material ultra-resistente. Diversas espessuras e comprimentos disponíveis.',
    url: '/products/Leash-Shortboard-Hibridas',
    keywords: ['leash shortboard', 'leash híbrida', 'cordinha shortboard', 'leash comp surf'],
  },

  'leash-fun-minilong': {
    title: 'Leash Fun / Mini Long',
    description:
      'Leashes para funboards e mini long. Comprimento ideal para pranchas de 7\' a 8\'. Swivel duplo anti-torção e resistência máxima.',
    url: '/products/Leash-Fun-MiniLong',
    keywords: ['leash fun', 'leash mini long', 'leash funboard', 'cordinha funboard'],
  },

  'leash-longboard': {
    title: 'Leash Longboard',
    description:
      'Leashes para longboard com comprimento e resistência adequados. Swivel duplo anti-torção. Ideal para pranchas acima de 9 pés.',
    url: '/products/Leash-Longboard',
    keywords: ['leash longboard', 'cordinha longboard', 'leash 9ft', 'leash 10ft'],
  },

  'leash-standup': {
    title: 'Leash Stand Up Paddle',
    description:
      'Leashes para Stand Up Paddle (SUP). Modelos retos e espirais para passeio, race e surf. Resistência máxima para águas abertas.',
    url: '/products/Leash-StandUp',
    keywords: ['leash sup', 'leash stand up', 'leash stand up paddle', 'cordinha sup'],
  },

  'leash-bodyboard': {
    title: 'Leash Bodyboard',
    description:
      'Leashes para bodyboard com design específico para pulso e bíceps. Material resistente e confortável para todas as condições.',
    url: '/products/Leash-Bodyboard',
    keywords: ['leash bodyboard', 'cordinha bodyboard', 'leash pulso bodyboard'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CAPAS — 3 categorias
  // Paths: Refletiva-Combate, Refletiva-Premium, Capa-Toalha
  // ═══════════════════════════════════════════════════════════════

  'refletiva-combate': {
    title: 'Capa Refletiva Combate',
    description:
      'Capa refletiva modelo Combate para prancha de surf. Proteção térmica contra o sol. Material resistente e leve. Vários tamanhos disponíveis.',
    url: '/products/Refletiva-Combate',
    keywords: ['capa refletiva combate', 'capa prancha refletiva', 'boardbag refletiva'],
  },

  'refletiva-premium': {
    title: 'Capa Refletiva Premium',
    description:
      'Capa refletiva modelo Premium para prancha de surf. Máxima proteção térmica e acolchoamento reforçado. Acabamento superior.',
    url: '/products/Refletiva-Premium',
    keywords: ['capa refletiva premium', 'capa prancha premium', 'boardbag premium'],
  },

  'capa-toalha': {
    title: 'Capa Toalha para Prancha',
    description:
      'Capa toalha para prancha de surf. Proteção suave contra arranhões e absorção de umidade. Prática e funcional para o dia a dia.',
    url: '/products/Capa-Toalha',
    keywords: ['capa toalha prancha', 'capa toalha surf', 'sock prancha'],
  },

  // ═══════════════════════════════════════════════════════════════
  // SARCÓFAGOS — 4 categorias
  // Paths: Sarcofago-Combate, Sarcofago-Premium, etc.
  // ═══════════════════════════════════════════════════════════════

  'sarcofago-combate': {
    title: 'Sarcófago Combate',
    description:
      'Sarcófago Combate para viagem com pranchas de surf. Estrutura reforçada e acolchoamento interno. Duplos, triplos e quádruplos disponíveis.',
    url: '/products/Sarcofago-Combate',
    keywords: ['sarcófago combate', 'sarcófago prancha', 'boardbag viagem combate'],
  },

  'sarcofago-premium': {
    title: 'Sarcófago Premium',
    description:
      'Sarcófago Premium para máxima proteção em viagens. Acolchoamento extra e acabamento superior. Para 2, 3 ou 4 pranchas.',
    url: '/products/Sarcofago-Premium',
    keywords: ['sarcófago premium', 'sarcófago prancha premium', 'boardbag viagem premium'],
  },

  'sarcofago-combate-rodas': {
    title: 'Sarcófago Combate com Rodas',
    description:
      'Sarcófago Combate com rodas para facilitar o transporte. Estrutura reforçada, acolchoamento interno e rodas resistentes.',
    url: '/products/Sarcofago-Combate-Rodas',
    keywords: ['sarcófago combate rodas', 'sarcófago rodas', 'boardbag rodas'],
  },

  'sarcofago-premium-rodas': {
    title: 'Sarcófago Premium com Rodas',
    description:
      'Sarcófago Premium com rodas. Máxima proteção e mobilidade para suas pranchas. Acolchoamento extra e rodas de alta resistência.',
    url: '/products/Sarcofago-Premium-Rodas',
    keywords: ['sarcófago premium rodas', 'sarcófago surf rodas', 'boardbag premium rodas'],
  },

  // ═══════════════════════════════════════════════════════════════
  // QUILHAS — 4 categorias
  // Paths: Quilha-Shortboard, Quilha-Longboard, Quilha-SUP, Chave-Parafuso
  // ═══════════════════════════════════════════════════════════════

  'quilha-shortboard': {
    title: 'Quilhas Shortboard',
    description:
      'Quilhas para shortboard de alta performance. Materiais premium para máxima resposta e velocidade. Vários modelos e tamanhos.',
    url: '/products/Quilha-Shortboard',
    keywords: ['quilha shortboard', 'quilhas surf', 'fins shortboard', 'quilha fcs'],
  },

  'quilha-longboard': {
    title: 'Quilhas Longboard',
    description:
      'Quilhas para longboard de alta qualidade. Modelos single fin e side fins. Materiais premium para controle e estabilidade.',
    url: '/products/Quilha-Longboard',
    keywords: ['quilha longboard', 'single fin', 'quilha central', 'fins longboard'],
  },

  'quilha-sup': {
    title: 'Quilhas Stand Up Paddle',
    description:
      'Quilhas para Stand Up Paddle (SUP). Modelos para passeio, race e surf. Alta performance e durabilidade.',
    url: '/products/Quilha-SUP',
    keywords: ['quilha sup', 'quilha stand up paddle', 'fins sup'],
  },

  'chave-parafuso': {
    title: 'Chaves e Parafusos para Quilhas',
    description:
      'Chaves e parafusos para quilhas de surf. Ferramentas essenciais para montagem e troca rápida de quilhas. Aço inox de alta resistência.',
    url: '/products/Chave-Parafuso',
    keywords: ['chave quilha', 'parafuso quilha', 'ferramenta quilha', 'chave fcs'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ACESSÓRIOS — 6 categorias
  // Paths: Racks, Parafinas, Bones, Protetor-Rabeta, Wetsuit-Bag, Diversos
  // ═══════════════════════════════════════════════════════════════

  racks: {
    title: 'Racks para Prancha de Surf',
    description:
      'Racks para transporte de pranchas de surf. Modelos para carro e parede. Seguros e práticos. Frete para todo Brasil.',
    url: '/products/Racks',
    keywords: ['rack prancha', 'rack surf carro', 'suporte prancha'],
  },

  parafinas: {
    title: 'Parafinas / Wax para Surf',
    description:
      'Parafinas e wax para surf. Fu Wax, Bull Wax e mais. Para águas frias e quentes. Aderência máxima garantida.',
    url: '/products/Parafinas',
    keywords: ['parafina surf', 'wax surf', 'fu wax', 'bull wax', 'cera prancha'],
  },

  bones: {
    title: 'Bonés de Surf',
    description:
      'Bonés de surf para proteção contra o sol. Modelos estilosos e funcionais. Ideal para sessões e dia a dia.',
    url: '/products/Bones',
    keywords: ['boné surf', 'boné aba curva surf', 'chapéu surf'],
  },

  'protetor-rabeta': {
    title: 'Protetores de Rabeta',
    description:
      'Protetores de rabeta para prancha de surf. Proteção extra contra batidas e impactos. Fácil aplicação e alta durabilidade.',
    url: '/products/Protetor-Rabeta',
    keywords: ['protetor rabeta', 'tail pad', 'proteção prancha'],
  },

  'wetsuit-bag': {
    title: 'Wetsuit Bag - Bolsa para Neoprene',
    description:
      'Bolsas para wetsuit e roupas de neoprene. Práticas e impermeáveis. Ideais para organizar seu equipamento de surf.',
    url: '/products/Wetsuit-Bag',
    keywords: ['wetsuit bag', 'bolsa neoprene', 'saco roupa surf'],
  },

  diversos: {
    title: 'Diversos - Acessórios de Surf',
    description:
      'Acessórios diversos para surf. Produtos complementares para sua sessão e manutenção do equipamento.',
    url: '/products/Diversos',
    keywords: ['acessórios surf diversos', 'manutenção prancha'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Obter configuração SEO para uma collection (grupo)
 * @param {string} collectionSlug - Slug da coleção (ex: 'decks')
 * @returns {object} Configuração SEO
 */
export const getCollectionSEO = (collectionSlug) => {
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
 * Obter configuração SEO para uma categoria (subcategoria/modelo)
 * @param {string} categorySlug - Slug da categoria (ex: 'Deck-Maldivas' ou 'deck-maldivas')
 * @returns {object} Configuração SEO
 */
export const getCategorySEO = (categorySlug) => {
  const slug = (categorySlug || '').toLowerCase().trim();

  if (categoryDescriptions[slug]) {
    return categoryDescriptions[slug];
  }

  // Fallback para categorias não definidas
  const formattedName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${formattedName} - Elite Surfing Brasil`,
    description: `Produtos ${formattedName} na Elite Surfing Brasil. Acessórios de surf de alta qualidade com frete para todo Brasil.`,
    url: `/products/${categorySlug || slug}`,
    keywords: [slug, 'surf', 'brasil'],
  };
};

/**
 * Gerar meta tags para produto individual
 * @param {object} product - Objeto do produto
 * @returns {object} Configuração SEO
 */
export const getProductSEO = (product) => {
  if (!product) return seoConfig.products;

  const category = (product.category || '').trim();
  const price = product.offerPrice || product.price;

  return {
    title: product.name,
    description: `${product.name} - R$ ${price?.toFixed(2).replace('.', ',')}. ${
      Array.isArray(product.description)
        ? product.description[0]
        : product.description || ''
    }`.slice(0, 155),
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