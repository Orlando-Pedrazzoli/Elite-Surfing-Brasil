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

// Galeria unificada: imagem principal → vídeos → restantes imagens.
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
  if (imageItems.length === 0) return videoItems;
  return [imageItems[0], ...videoItems, ...imageItems.slice(1)];
};
