// client/src/utils/productMedia.js
// ═══════════════════════════════════════════════════════════════════════
// 🎥 Helpers de mídia do produto (imagens + vídeos MP4)
// ═══════════════════════════════════════════════════════════════════════

export const MAX_PRODUCT_VIDEOS = 4;

// Todos os vídeos de um produto: array novo `videos` + campo legado `video`
export const getProductVideos = product => {
  const list = Array.isArray(product?.videos) ? [...product.videos] : [];
  if (product?.video && !list.includes(product.video)) list.push(product.video);
  return list.filter(Boolean);
};

// Capa (frame do 1º segundo) gerada pelo Cloudinary a partir da URL do vídeo
export const getVideoPoster = url => {
  if (!url || !url.includes('/video/upload/')) return '';
  return url
    .replace('/video/upload/', '/video/upload/so_1,w_400,c_limit/')
    .replace(/\.[^/.]+$/, '.jpg');
};

// Galeria unificada (imagens + vídeos) na ordem definida pelo admin.
// `product.mediaOrder` guarda só os TIPOS por posição, ex:
//   ['image', 'video', 'image', 'image']
// e as URLs vêm de product.image / product.videos (cada um na sua ordem).
// Sem mediaOrder válido (produtos antigos): imagem principal → vídeos →
// restantes imagens.
// Cada item de imagem guarda `imageIndex` (índice em product.image) para
// abrir o modal de zoom na imagem certa.
export const buildProductMedia = product => {
  const images = Array.isArray(product?.image) ? product.image : [];
  const videos = getProductVideos(product);
  const imageItems = images.map((url, imageIndex) => ({
    type: 'image',
    url,
    imageIndex,
  }));
  const videoItems = videos.map(url => ({ type: 'video', url }));

  const order = Array.isArray(product?.mediaOrder) ? product.mediaOrder : [];
  const orderMatches =
    order.length === imageItems.length + videoItems.length &&
    order.filter(t => t === 'image').length === imageItems.length &&
    order.filter(t => t === 'video').length === videoItems.length;

  if (orderMatches) {
    let i = 0;
    let v = 0;
    return order.map(t => (t === 'video' ? videoItems[v++] : imageItems[i++]));
  }

  if (imageItems.length === 0) return videoItems;
  return [imageItems[0], ...videoItems, ...imageItems.slice(1)];
};

// Itens do formulário do admin (ProductMediaZone) a partir de um produto salvo
export const productToMediaItems = product =>
  buildProductMedia(product).map(item =>
    item.type === 'video'
      ? { type: 'video', url: item.url }
      : { type: 'existing', url: item.url },
  );

// Tipos dos itens do formulário do admin
export const isImageItem = item =>
  item?.type === 'existing' || item?.type === 'new';
export const isVideoItem = item => item?.type === 'video';
