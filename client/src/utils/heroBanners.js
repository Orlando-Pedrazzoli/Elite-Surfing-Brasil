// client/src/utils/heroBanners.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ BANNERS DA HERO — dados para o carrossel da página inicial
// ═══════════════════════════════════════════════════════════════════════
// Os banners são geridos pelo admin em /seller/banners e lidos de
// GET /api/banner. A hero é a primeira coisa que o visitante vê, por isso
// o carregamento é pensado para não a atrasar:
//
//   1. Quem já visitou o site vê de imediato os banners guardados no
//      browser; a lista é confirmada com o servidor em segundo plano.
//   2. Na primeira visita, o pedido ao servidor parte assim que este
//      ficheiro é carregado (não espera pelo React). A resposta vem do
//      CDN da Vercel (cache de 10 min, limpa quando o admin altera).
//   3. Se o servidor falhar ou demorar mais de FALLBACK_AFTER_MS, a hero
//      mostra os banners originais do site — nunca fica vazia.
//
// Sem banners ativos no painel, a loja mostra os banners originais.
// ═══════════════════════════════════════════════════════════════════════

// Banners originais do site (ficheiros em client/public). São a reserva
// da loja e o ponto de partida do admin ("Importar banners atuais") —
// manter igual a DEFAULT_BANNERS em server/controllers/bannerController.js.
export const DEFAULT_BANNERS = [
  {
    _id: 'default-1',
    title:
      'Elite Surfing Brasil - Acessórios de Surf Premium - Decks, Leashes, Capas e Quilhas',
    image: '/hero-new.jpg',
    mobileImage: '/hero-new.jpg',
    heading: 'Precision Meets\nPerformance',
    subtitle: 'Elite Surfing',
    link: '',
  },
  {
    _id: 'default-2',
    title:
      'Surfista em onda com equipamentos Elite Surfing - Loja Online de Surf no Brasil',
    image: '/banner-novo2.png',
    mobileImage: '/banner-carlos-mobile.jpg',
    heading: '',
    subtitle: 'Premium Surf Accessories',
    link: '',
  },
];

// Tempo máximo à espera do servidor na primeira visita antes de mostrar
// os banners originais
export const FALLBACK_AFTER_MS = 2500;

const CACHE_KEY = 'es_hero_banners_v1';

// ─── Tamanhos pedidos ao Cloudinary ───
// A imagem enviada pelo admin fica guardada em alta resolução; o
// Cloudinary entrega-a já redimensionada e no formato mais leve que o
// browser aceita (WebP/AVIF).
const DESKTOP_WIDTH = 1920;
const MOBILE_WIDTH = 1080;

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export const optimizedImage = (url, width) => {
  const match = String(url || '').match(CLOUDINARY_UPLOAD);
  if (!match) return url; // ficheiros do próprio site: seguem como estão
  return `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
};

// Formato usado pelo carrossel
const toSlide = banner => ({
  id: String(banner._id),
  alt: banner.title || 'Elite Surfing Brasil',
  desktop: optimizedImage(banner.image, DESKTOP_WIDTH),
  mobile: optimizedImage(banner.mobileImage || banner.image, MOBILE_WIDTH),
  heading: banner.heading || '',
  subtitle: banner.subtitle || '',
  link: banner.link || '',
});

export const DEFAULT_SLIDES = DEFAULT_BANNERS.map(toSlide);

const isValidList = list =>
  Array.isArray(list) && list.length > 0 && list.every(b => b && b.image);

// ─── Cópia guardada no browser ───
const readCache = () => {
  try {
    const list = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    return isValidList(list) ? list : null;
  } catch {
    return null;
  }
};

const writeCache = list => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* sem storage: funciona na mesma, só não memoriza */
  }
};

// Admin logado a ver a loja: lê sempre do servidor, sem caches, para ver
// na hora o que acabou de alterar no painel.
const isAdminBrowsing = () => {
  try {
    return !!window.localStorage.getItem('sellerToken');
  } catch {
    return false;
  }
};

// Slides guardados da última visita (null na primeira visita / admin)
export const getCachedHeroSlides = () => {
  if (isAdminBrowsing()) return null;
  const cached = readCache();
  return cached ? cached.map(toSlide) : null;
};

// ─── Pedido ao servidor (um só por carregamento de página) ───
let request = null;

// Resolve com os slides a mostrar. Nunca rejeita.
// Usa fetch SEM credenciais de propósito: a resposta é igual para todos e
// assim o CDN pode servi-la da cache (com Authorization nunca serve).
export const fetchHeroSlides = () => {
  if (request) return request;

  const base = import.meta.env.VITE_BACKEND_URL || '';
  const admin = isAdminBrowsing();
  const url = `${base}/api/banner${admin ? `?fresh=${Date.now()}` : ''}`;

  request = fetch(url, { credentials: 'omit' })
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (!data?.success) throw new Error('resposta inválida');
      // lista vazia = sem banners ativos no painel → banners originais
      const list = isValidList(data.banners) ? data.banners : DEFAULT_BANNERS;
      if (!admin) writeCache(list);
      return list.map(toSlide);
    })
    .catch(() => {
      request = null; // permite nova tentativa na próxima navegação
      const cached = readCache();
      return (cached || DEFAULT_BANNERS).map(toSlide);
    });

  return request;
};

// Depois de o admin alterar banners no painel: esquece o que foi lido
export const resetHeroBanners = () => {
  request = null;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignora */
  }
};

// Compara duas listas de slides (evita re-renderizar sem necessidade)
export const sameSlides = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 🚀 Primeira visita à página inicial: o pedido parte já, em paralelo com
// o arranque do React
try {
  if (typeof window !== 'undefined' && window.location.pathname === '/')
    fetchHeroSlides();
} catch {
  /* ignora */
}
