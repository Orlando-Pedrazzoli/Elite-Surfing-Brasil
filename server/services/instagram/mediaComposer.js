// server/services/instagram/mediaComposer.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ COMPOSITOR DE IMAGENS — Cloudinary por URL (sem serviço novo)
// ═══════════════════════════════════════════════════════════════════════
// As fotos dos produtos já vivem no Cloudinary. A composição para o
// Instagram é feita inserindo transformações na própria URL:
//   • enquadramento com padding para 1:1, 4:5 e 9:16
//   • badge de preço (texto com fundo)
//   • badge "FRETE GRÁTIS"
//   • logo (se SOCIAL_LOGO_PUBLIC_ID estiver configurado)
//   • saída JPEG (a API da Meta exige JPEG em imagens)
//
// Nada é gravado: as URLs são derivadas e o Cloudinary gera/cacheia sob
// demanda. Se um dia quisermos templates mais ricos (fundos, tipografia
// própria), o ponto de troca é este ficheiro.
// ═══════════════════════════════════════════════════════════════════════

export const IG_FORMATS = {
  feed: { width: 1080, height: 1080, label: 'Feed 1:1' },
  portrait: { width: 1080, height: 1350, label: 'Feed 4:5 (retrato)' },
  story: { width: 1080, height: 1920, label: 'Story / Reel 9:16' },
};

// Fonte Google suportada nativamente pelo Cloudinary
const FONT = 'Montserrat';

const formatBRL = value =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
    // toLocaleString usa espaço inseparável (U+00A0); normalizar para espaço
    .replace(/\u00a0/g, ' ');

// Texto para layer l_text. O Cloudinary exige DUPLA codificação dos
// caracteres especiais (vírgula, barra, cifrão, acentos): "R$ 199,90" →
// "R%2524%20199%252C90". Espaços ficam como %20 (simples), como na doc.
// Validado contra res.cloudinary.com: codificação simples devolve 404.
const encodeText = text => encodeURIComponent(text).replace(/%(?!20)/g, '%25');

// Detecta se é uma URL de upload do Cloudinary e separa base/resto
const splitCloudinaryUrl = url => {
  if (typeof url !== 'string') return null;
  const idx = url.indexOf('/image/upload/');
  if (idx === -1) return null;
  const base = url.slice(0, idx + '/image/upload/'.length);
  let rest = url.slice(idx + '/image/upload/'.length);
  // Remove transformações já presentes (raro em uploads diretos): mantém
  // apenas a partir de "v<versão>/" quando existe
  const vMatch = rest.match(/(^|\/)(v\d+\/.+)$/);
  if (vMatch) rest = vMatch[2];
  return { base, rest };
};

export const isCloudinaryUrl = url => !!splitCloudinaryUrl(url);

/**
 * Compõe a imagem de um produto para um formato do Instagram.
 *
 * @param {object} opts
 * @param {string} opts.imageUrl        URL Cloudinary original da foto
 * @param {'feed'|'portrait'|'story'} opts.format
 * @param {number|null} opts.price       preço de venda (badge) — null = sem badge
 * @param {number|null} opts.originalPrice  preço original riscado — opcional
 * @param {boolean} opts.freeShipping    badge "FRETE GRÁTIS"
 * @param {'white'|'auto'} opts.background  fundo do padding
 * @param {boolean} opts.logo            aplicar logo (requer env)
 * @returns {string|null} URL composta, ou null se a URL não for Cloudinary
 */
export const composeProductImage = ({
  imageUrl,
  format = 'feed',
  price = null,
  originalPrice = null,
  freeShipping = false,
  background = 'white',
  logo = true,
}) => {
  const parts = splitCloudinaryUrl(imageUrl);
  if (!parts) return null;

  const dims = IG_FORMATS[format] || IG_FORMATS.feed;
  const bg = background === 'auto' ? 'b_auto:predominant' : 'b_white';
  const isStory = format === 'story';

  const chain = [];

  // 1) Enquadramento base + saída JPEG
  chain.push(`c_pad,w_${dims.width},h_${dims.height},${bg},f_jpg,q_auto:good`);

  // 2) Logo (canto superior esquerdo)
  const logoPublicId = process.env.SOCIAL_LOGO_PUBLIC_ID;
  if (logo && logoPublicId) {
    const layerId = logoPublicId.replace(/\//g, ':');
    chain.push(`l_${layerId},c_scale,w_${isStory ? 260 : 200}`);
    chain.push(`fl_layer_apply,g_north_west,x_48,y_${isStory ? 120 : 48}`);
  }

  // 3) Badge de preço (canto inferior direito; story: centro inferior)
  if (price !== null && Number.isFinite(Number(price))) {
    const hasDiscount =
      originalPrice !== null &&
      Number.isFinite(Number(originalPrice)) &&
      Number(originalPrice) > Number(price);

    const priceText = encodeText(`  ${formatBRL(price)}  `);
    const size = isStory ? 72 : 56;
    chain.push(
      `l_text:${FONT}_${size}_bold:${priceText},co_white,b_rgb:0f172a`,
    );
    chain.push(
      isStory
        ? 'fl_layer_apply,g_south,y_260'
        : 'fl_layer_apply,g_south_east,x_48,y_48',
    );

    if (hasDiscount) {
      const fromText = encodeText(`  de ${formatBRL(originalPrice)}  `);
      chain.push(
        `l_text:${FONT}_${isStory ? 36 : 28}:${fromText},co_rgb:0f172a,b_rgb:e2e8f0`,
      );
      chain.push(
        isStory
          ? 'fl_layer_apply,g_south,y_360'
          : `fl_layer_apply,g_south_east,x_48,y_${48 + size + 24}`,
      );
    }
  }

  // 4) Badge frete grátis (canto inferior esquerdo; story: topo)
  if (freeShipping) {
    const shipText = encodeText('  FRETE GRÁTIS  ');
    chain.push(
      `l_text:${FONT}_${isStory ? 40 : 32}_bold:${shipText},co_white,b_rgb:16a34a`,
    );
    chain.push(
      isStory
        ? 'fl_layer_apply,g_north,y_120'
        : 'fl_layer_apply,g_south_west,x_48,y_48',
    );
  }

  return `${parts.base}${chain.join('/')}/${parts.rest}`;
};

/**
 * Gera o conjunto de templates para um produto (usado pelo Estúdio).
 * Para cada formato: versão limpa e versão promo (preço + frete).
 */
export const buildProductTemplates = (product, { imageIndex = 0, background } = {}) => {
  const images = Array.isArray(product?.image) ? product.image : [];
  const imageUrl = images[imageIndex] || images[0];
  if (!imageUrl) return [];

  const templates = [];
  for (const [format, dims] of Object.entries(IG_FORMATS)) {
    const clean = composeProductImage({
      imageUrl,
      format,
      background,
      price: null,
      freeShipping: false,
    });
    const promo = composeProductImage({
      imageUrl,
      format,
      background,
      price: product.offerPrice,
      originalPrice: product.price,
      freeShipping: !!product.freeShipping,
    });

    if (clean) {
      templates.push({
        id: `${format}-clean`,
        format,
        label: `${dims.label} · limpa`,
        url: clean,
        width: dims.width,
        height: dims.height,
      });
    }
    if (promo) {
      templates.push({
        id: `${format}-promo`,
        format,
        label: `${dims.label} · com preço`,
        url: promo,
        width: dims.width,
        height: dims.height,
      });
    }
  }
  return templates;
};
