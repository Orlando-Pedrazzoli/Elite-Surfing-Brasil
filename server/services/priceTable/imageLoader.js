// server/services/priceTable/imageLoader.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ TABELAS DE PREÇO — miniaturas dos produtos para PDF e Excel
// ═══════════════════════════════════════════════════════════════════════
// • Só baixa de res.cloudinary.com (nunca de uma URL arbitrária).
// • Pede ao Cloudinary uma miniatura quadrada, fundo branco, em JPG:
//   as bibliotecas de PDF/Excel não aceitam WebP/AVIF, por isso f_jpg.
// • Concorrência limitada + prazo global: se o Cloudinary estiver lento,
//   a tabela sai mesmo assim, com um espaço em branco no lugar da imagem.
// • Cache em memória por instância (exportar de novo em seguida é rápido).
// ═══════════════════════════════════════════════════════════════════════

import axios from 'axios';

const CLOUDINARY_HOST = 'res.cloudinary.com';
const UPLOAD_MARKER = '/image/upload/';

/** Lado da miniatura (px) por uso. ~2x o tamanho impresso, para nitidez. */
export const THUMB_SIZES = { list: 120, grid: 320, xlsx: 120 };

const CACHE_MAX_BYTES = 40 * 1024 * 1024;
const cache = new Map(); // thumbUrl → { buffer, type }
let cacheBytes = 0;

const cacheSet = (key, value) => {
  cache.set(key, value);
  cacheBytes += value.buffer.length;
  while (cacheBytes > CACHE_MAX_BYTES && cache.size > 1) {
    const oldestKey = cache.keys().next().value;
    cacheBytes -= cache.get(oldestKey).buffer.length;
    cache.delete(oldestKey);
  }
};

/**
 * URL da miniatura no Cloudinary, ou null se a imagem não for do Cloudinary.
 * https://res.cloudinary.com/<cloud>/image/upload/<transformação>/<resto>
 */
export const thumbUrl = (url, size) => {
  try {
    const parsed = new URL(String(url || ''));
    if (parsed.protocol !== 'https:' || parsed.hostname !== CLOUDINARY_HOST)
      return null;
    const idx = parsed.pathname.indexOf(UPLOAD_MARKER);
    if (idx < 0) return null;
    const cut = idx + UPLOAD_MARKER.length;
    const transformation = `c_pad,w_${size},h_${size},b_white,f_jpg,q_auto`;
    parsed.pathname = `${parsed.pathname.slice(0, cut)}${transformation}/${parsed.pathname.slice(cut)}`;
    parsed.search = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

/** Identifica JPEG/PNG pelos primeiros bytes (ignora o Content-Type). */
const detectType = buffer => {
  if (!buffer || buffer.length < 8) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return 'png';
  return null;
};

const fetchOne = async (url, timeoutMs) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    maxContentLength: 2 * 1024 * 1024,
    maxRedirects: 0,
    headers: { Accept: 'image/jpeg,image/png' },
    validateStatus: status => status === 200,
  });
  const buffer = Buffer.from(response.data);
  const type = detectType(buffer);
  if (!type) throw new Error('formato de imagem não suportado');
  return { buffer, type };
};

/**
 * Baixa as miniaturas de uma lista de URLs de produto.
 *
 * @param {string[]} urls  URLs originais (Product.image[0])
 * @param {object} [opts]
 * @param {number} [opts.size=120]        lado da miniatura em px
 * @param {number} [opts.concurrency=8]
 * @param {number} [opts.timeoutMs=8000]  por imagem
 * @param {number} [opts.budgetMs=30000]  prazo total (cabe no maxDuration)
 * @param {number} [opts.deadline]        instante limite (Date.now()) — tem
 *   prioridade sobre budgetMs; usado quando vários arquivos partilham o
 *   mesmo pedido
 * @returns {Promise<{ images: Map<string,{buffer:Buffer,type:string,dataUrl:string}>,
 *                     requested: number, loaded: number }>}
 *   `images` é indexado pela URL ORIGINAL. URLs que falharam não entram.
 */
export const loadImages = async (urls, opts = {}) => {
  const {
    size = THUMB_SIZES.list,
    concurrency = 8,
    timeoutMs = 8000,
    budgetMs = 30000,
  } = opts;

  const unique = [...new Set((urls || []).filter(Boolean))];
  const images = new Map();
  const deadline = opts.deadline || Date.now() + budgetMs;
  let cursor = 0;

  const store = (original, { buffer, type }) => {
    images.set(original, {
      buffer,
      type,
      dataUrl: `data:image/${type};base64,${buffer.toString('base64')}`,
    });
  };

  const worker = async () => {
    while (cursor < unique.length) {
      const original = unique[cursor++];
      const target = thumbUrl(original, size);
      if (!target) continue;

      const cached = cache.get(target);
      if (cached) {
        store(original, cached);
        continue;
      }
      if (Date.now() >= deadline) continue;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const remaining = deadline - Date.now();
          if (remaining <= 0) break;
          const result = await fetchOne(target, Math.min(timeoutMs, remaining));
          cacheSet(target, result);
          store(original, result);
          break;
        } catch (error) {
          // 4xx não adianta repetir; rede/timeout tenta mais uma vez
          const status = error?.response?.status;
          if (status && status >= 400 && status < 500) break;
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, worker),
  );

  return { images, requested: unique.length, loaded: images.size };
};
