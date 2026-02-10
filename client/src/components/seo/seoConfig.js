/**
 * SEO Config - Elite Surfing Brasil
 * Versão: 2.0.0 BR
 * Última atualização: 2026-02-10
 * 
 * Otimizado para competir com: wetdreams.com.br, expans.com.br, onlysurf.com.br
 * Keywords pesquisadas: deck surf, leash surf, capa prancha, acessórios surf brasil
 */

const BASE_URL = 'https://www.elitesurfing.com.br';
const DEFAULT_IMAGE = '/og-image.jpg';

/**
 * Truncar texto para SEO (max 155 caracteres)
 */
const truncateForSeo = (text, max = 155) => {
  if (!text || text.length <= max) return text;
  return text.substring(0, max - 3).trim() + '...';
};

const seoConfig = {

  // ═══════════════════════════════════════════════════════════════
  // 🏠 HOME PAGE
  // ═══════════════════════════════════════════════════════════════
  home: {
    title: null, // Usa o default do SEO.jsx: "Elite Surfing - Loja de Surf - Equipamentos e Acessórios"
    description: 'Elite Surfing Brasil - Sua loja online de acessórios de surf. Decks fresados, leashes premium, capas de prancha e wax. Até 10x sem juros. PIX com 10% OFF. Frete para todo Brasil!',
    url: '/',
    keywords: 'loja surf online, acessórios surf brasil, deck surf, leash surf, capa prancha, comprar surf online',
  },

  // ═══════════════════════════════════════════════════════════════
  // 🛍️ PRODUTOS - LISTAGEM
  // ═══════════════════════════════════════════════════════════════
  products: {
    title: 'Produtos de Surf - Decks, Leashes, Capas e Wax',
    description: 'Confira todos os acessórios de surf da Elite Surfing Brasil. Decks fresados de alta performance, leashes premium, capas reflexivas e wax. Parcelamento em até 10x sem juros!',
    url: '/products',
    keywords: 'deck surf comprar, leash surf comprar, capa prancha surf, wax surf, acessórios prancha surf',
  },

  // ═══════════════════════════════════════════════════════════════
  // 📦 GRUPOS / COLEÇÕES
  // ═══════════════════════════════════════════════════════════════
  groups: {
    decks: {
      title: 'Deck para Prancha de Surf - Traction Pad Fresado EVA Premium',
      description: 'Decks fresados de alta performance para prancha de surf. Tecnologia EVA premium com texturas que garantem aderência máxima. Até 10x sem juros. Frete grátis!',
      url: '/collection/decks',
      keywords: 'deck surf, deck fresado, traction pad, grip surf, antiderrapante prancha, deck EVA premium',
    },
    leashes: {
      title: 'Leash para Prancha de Surf - Cordinha Premium',
      description: 'Leashes premium com PU importado de alta memória elástica. Máxima segurança e durabilidade. Diversos tamanhos: 6ft, 7ft, 8ft. Até 10x sem juros!',
      url: '/collection/leashes',
      keywords: 'leash surf, cordinha surf, leash prancha, strep surf, leash premium, leash 6ft, leash 7ft',
    },
    capas: {
      title: 'Capa de Prancha de Surf - Proteção Premium Reflexiva',
      description: 'Capas de prancha de surf com proteção premium. Shortboard, fish, evolution e sarcófago. Lona reflexiva de alta gramatura. Frete para todo Brasil!',
      url: '/collection/capas',
      keywords: 'capa prancha surf, capa shortboard, capa fish, capa prancha reflexiva, sarcófago prancha, proteção prancha',
    },
    wax: {
      title: 'Wax e Parafina de Surf - Grip Perfeito',
      description: 'Parafina de surf premium para grip perfeito em qualquer temperatura. Fu Wax, Bull Wax e mais. Fórmulas para águas frias, temperadas e tropicais.',
      url: '/collection/wax',
      keywords: 'wax surf, parafina surf, fu wax, bull wax, parafina prancha, wax cold, wax tropical',
    },
    quilhas: {
      title: 'Quilhas para Prancha de Surf - FCS e Compatíveis',
      description: 'Quilhas de alta performance para prancha de surf. Modelos FCS I e FCS II compatíveis. Fibra de vidro e materiais premium. Até 10x sem juros!',
      url: '/collection/quilhas',
      keywords: 'quilha surf, quilha FCS, quilha prancha, quilha fibra, quilha FCS II, jogo quilha',
    },
    acessorios: {
      title: 'Acessórios de Surf - Racks, Protetores e Mais',
      description: 'Acessórios essenciais para surf. Racks, protetores de bico e rabeta, estojos para quilhas, raspadores e mais. Tudo para seu surf!',
      url: '/collection/acessorios',
      keywords: 'acessórios surf, rack prancha, protetor bico prancha, raspador parafina, estojo quilha',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏷️ CATEGORIAS (PRODUTOS ESPECÍFICOS)
  // ═══════════════════════════════════════════════════════════════
  categories: {
    // DECKS
    'Deck-J-Bay': {
      title: 'Deck J-Bay Fresado - Traction Pad Premium',
      description: 'Deck J-Bay fresado com EVA premium de alta aderência. Design inspirado nas ondas de Jeffrey\'s Bay. Parcele em até 10x sem juros!',
      keywords: 'deck j-bay, deck fresado j-bay, traction pad j-bay',
    },
    'Deck-Fiji-Classic': {
      title: 'Deck Fiji Classic - Traction Pad Fresado',
      description: 'Deck Fiji Classic com acabamento fresado CNC. EVA premium para máximo grip. Design clássico e funcional. Até 10x sem juros!',
      keywords: 'deck fiji classic, deck fresado fiji, traction pad fiji',
    },
    'Deck-Noronha': {
      title: 'Deck Noronha - Traction Pad Fresado Premium',
      description: 'Deck Noronha com tecnologia de fresagem CNC. EVA de alta resistência e aderência. Inspirado em Fernando de Noronha. Compre agora!',
      keywords: 'deck noronha, deck fresado noronha, traction pad noronha',
    },
    'Deck-Saquarema': {
      title: 'Deck Saquarema - Traction Pad Premium',
      description: 'Deck Saquarema fresado para alta performance. Perfeito para as ondas brasileiras. EVA premium. Parcele em até 10x sem juros!',
      keywords: 'deck saquarema, deck fresado saquarema, traction pad saquarema',
    },
    'Deck-Hawaii-Grom': {
      title: 'Deck Hawaii Grom - Traction Pad Júnior',
      description: 'Deck Hawaii Grom para surfistas jovens. Tamanho otimizado, EVA premium e máxima aderência. Ideal para pranchas menores!',
      keywords: 'deck hawaii grom, deck junior, traction pad grom, deck infantil surf',
    },
    'Deck-Tahiti': {
      title: 'Deck Tahiti - Traction Pad Premium Pro',
      description: 'Deck Tahiti pro com fresagem CNC avançada. Projetado para ondas de alta performance. EVA premium de máxima aderência!',
      keywords: 'deck tahiti, deck fresado tahiti, traction pad tahiti pro',
    },

    // WAX / PARAFINA
    'Fuwax-Cool': {
      title: 'Fu Wax Cool - Parafina para Águas Frias',
      description: 'Fu Wax Cool para águas frias. A parafina favorita dos surfistas profissionais. Grip excepcional e longa duração. Confira!',
      keywords: 'fu wax cool, parafina fria, wax cool, fu wax brasil',
    },
    'Fuwax-Warm': {
      title: 'Fu Wax Warm - Parafina para Águas Mornas',
      description: 'Fu Wax Warm para águas mornas e temperadas. Parafina premium com aderência superior. Ideal para o litoral brasileiro!',
      keywords: 'fu wax warm, parafina morna, wax warm, fu wax tropical',
    },
    'Fuwax-Tropical': {
      title: 'Fu Wax Tropical - Parafina para Águas Quentes',
      description: 'Fu Wax Tropical para águas quentes. Fórmula que não derrete no calor brasileiro. Grip perfeito para o verão. Compre agora!',
      keywords: 'fu wax tropical, parafina tropical, wax quente, fu wax verão',
    },
    'Bullwax-Cool': {
      title: 'Bull Wax Cool - Parafina Premium Águas Frias',
      description: 'Bull Wax Cool para águas frias e temperadas. Fórmula premium para grip prolongado. Compre agora na Elite Surfing!',
      keywords: 'bull wax cool, parafina surf, bull wax brasil',
    },

    // LEASHES
    'Leash-6ft-6mm': {
      title: 'Leash 6ft 6mm - Cordinha Comp',
      description: 'Leash 6ft x 6mm modelo competição. Ultra leve com PU importado de alta memória elástica. Ideal para pranchas até 6\'2. Até 10x sem juros!',
      keywords: 'leash 6ft, leash 6mm, cordinha surf comp, leash competição',
    },
    'Leash-6ft-7mm': {
      title: 'Leash 6ft 7mm - Cordinha Premium',
      description: 'Leash 6ft x 7mm premium para uso diário. PU importado, giradores duplos. Equilíbrio perfeito entre leveza e resistência!',
      keywords: 'leash 6ft 7mm, cordinha surf, leash premium, leash dia a dia',
    },
    'Leash-7ft-7mm': {
      title: 'Leash 7ft 7mm - Cordinha para Ondas Maiores',
      description: 'Leash 7ft x 7mm premium para ondas médias a grandes. PU importado, giradores duplos. Máxima segurança e durabilidade!',
      keywords: 'leash 7ft, leash 7mm, cordinha surf, leash premium, leash ondas grandes',
    },
    'Leash-8ft-7mm': {
      title: 'Leash 8ft 7mm - Cordinha para Funboard e Long',
      description: 'Leash 8ft x 7mm para funboards, evolutions e longboards. Construção reforçada com PU de alta resistência. Segurança máxima!',
      keywords: 'leash 8ft, leash grande, cordinha funboard, leash long, leash evolution',
    },

    // CAPAS
    'Capa-Shortboard': {
      title: 'Capa de Prancha Shortboard - Proteção Reflexiva',
      description: 'Capa para prancha shortboard com lona reflexiva de alta gramatura. Espuma de 6mm, reforço no bico e rabeta. Proteção total!',
      keywords: 'capa shortboard, capa prancha surf, capa reflexiva, capa shortboard reflexiva',
    },
    'Capa-Fish': {
      title: 'Capa de Prancha Fish / Evolution - Proteção Premium',
      description: 'Capa para prancha fish e evolution com lona reflexiva. Espuma protetora de 6mm. Modelos de 5\'8 a 7\'0. Frete para todo Brasil!',
      keywords: 'capa fish, capa evolution, capa prancha fish, capa prancha evolution',
    },
    'Capa-Sarcofago': {
      title: 'Capa Sarcófago - Transporte Múltiplas Pranchas',
      description: 'Capa sarcófago para transportar 2 a 5 pranchas. Nylon reforçado com rodas. Ideal para viagens e day use. Confira!',
      keywords: 'capa sarcófago, sarcófago prancha, capa tripla surf, capa viagem surf, capa quíntupla',
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // 📄 PÁGINAS INSTITUCIONAIS
  // ═══════════════════════════════════════════════════════════════
  contact: {
    title: 'Contato - Fale Conosco',
    description: 'Entre em contato com a Elite Surfing Brasil. Atendimento por WhatsApp, email e redes sociais. Seg-Sex 9h-18h. Estamos prontos para ajudar!',
    url: '/contact',
  },

  privacy: {
    title: 'Política de Privacidade - LGPD',
    description: 'Política de Privacidade da Elite Surfing Brasil em conformidade com a LGPD. Saiba como protegemos seus dados pessoais.',
    url: '/privacy',
  },

  terms: {
    title: 'Termos e Condições de Uso',
    description: 'Termos e Condições de uso da loja online Elite Surfing Brasil. Informações sobre compras, entregas, devoluções e garantias.',
    url: '/terms',
  },

  refundPolicy: {
    title: 'Política de Devolução e Reembolso',
    description: 'Política de devolução da Elite Surfing Brasil. Direito de arrependimento de 7 dias conforme o Código de Defesa do Consumidor (CDC).',
    url: '/refund-policy',
  },

  faq: {
    title: 'Perguntas Frequentes - FAQ',
    description: 'Tire suas dúvidas sobre compras, entregas, formas de pagamento, devoluções e mais. Tudo sobre a Elite Surfing Brasil.',
    url: '/faq',
  },

  about: {
    title: 'Sobre Nós - Elite Surfing Brasil',
    description: 'Conheça a Elite Surfing Brasil. Somos apaixonados por surf e comprometidos em oferecer os melhores acessórios com qualidade e preço justo.',
    url: '/about',
  },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 PÁGINAS DE COMPRA (noindex)
  // ═══════════════════════════════════════════════════════════════
  cart: {
    title: 'Carrinho de Compras',
    description: 'Seu carrinho de compras na Elite Surfing Brasil. Finalize sua compra com PIX, cartão ou boleto.',
    url: '/cart',
    noindex: true,
  },

  myOrders: {
    title: 'Meus Pedidos',
    description: 'Acompanhe seus pedidos na Elite Surfing Brasil.',
    url: '/my-orders',
    noindex: true,
  },

  orderSuccess: {
    title: 'Pedido Confirmado',
    description: 'Seu pedido foi confirmado com sucesso! Acompanhe o status da entrega.',
    url: '/order-placed',
    noindex: true,
  },

  login: {
    title: 'Login - Acesse sua Conta',
    description: 'Faça login na Elite Surfing Brasil para acompanhar seus pedidos e acessar ofertas exclusivas.',
    url: '/login',
    noindex: true,
  },

  register: {
    title: 'Criar Conta',
    description: 'Crie sua conta na Elite Surfing Brasil e aproveite ofertas exclusivas, acompanhamento de pedidos e mais.',
    url: '/register',
    noindex: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // 🔧 HELPERS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Gerar SEO dinâmico para página de produto individual
   */
  getProductSeo: (product) => {
    if (!product) return {};
    
    const price = product.offerPrice 
      ? `R$ ${product.offerPrice.toFixed(2).replace('.', ',')}`
      : '';
    
    const categoryName = product.category || '';
    const productName = product.name || 'Produto';
    
    return {
      title: `${productName}${price ? ' - ' + price : ''} | Até 10x sem Juros`,
      description: truncateForSeo(
        product.description || 
        `${productName}. ${categoryName} de alta performance. ${price ? 'A partir de ' + price + '.' : ''} Parcele em até 10x sem juros. PIX com 10% OFF. Frete para todo Brasil!`
      ),
      url: `/products/${categoryName.toLowerCase()}/${product._id}`,
      image: product.image?.[0] || DEFAULT_IMAGE,
      type: 'product',
      product: {
        price: product.offerPrice,
        inStock: (product.stock || 0) > 0,
      },
    };
  },

  /**
   * Gerar SEO dinâmico para página de coleção/grupo
   */
  getGroupSeo: (groupSlug) => {
    const groupConfig = seoConfig.groups[groupSlug];
    if (groupConfig) return groupConfig;
    
    // Fallback genérico
    const name = groupSlug.charAt(0).toUpperCase() + groupSlug.slice(1);
    return {
      title: `${name} - Acessórios de Surf`,
      description: `Confira nossa coleção de ${name.toLowerCase()} para surf. Produtos de alta qualidade com até 10x sem juros. Frete para todo Brasil!`,
      url: `/collection/${groupSlug}`,
    };
  },

  /**
   * Gerar SEO dinâmico para categoria
   */
  getCategorySeo: (categoryPath) => {
    const catConfig = seoConfig.categories[categoryPath];
    if (catConfig) {
      return {
        ...catConfig,
        url: `/products/${categoryPath.toLowerCase()}`,
      };
    }
    
    // Fallback genérico
    const name = categoryPath.replace(/-/g, ' ');
    return {
      title: `${name} - Elite Surfing Brasil`,
      description: `Confira ${name} na Elite Surfing Brasil. Produtos de alta performance. Parcele em até 10x sem juros!`,
      url: `/products/${categoryPath.toLowerCase()}`,
    };
  },
};

export default seoConfig;