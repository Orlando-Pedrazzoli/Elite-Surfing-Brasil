// server/controllers/bannerController.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ BANNERS DA HERO — leitura pública (loja) + gestão no admin
// ═══════════════════════════════════════════════════════════════════════
// Público:
//   GET  /api/banner                      → banners ativos, na ordem
// Admin (authSeller) — montado em /api/seller/banners para o frontend
// enviar o x-seller-token também no iPhone (ver isSellerRoute no
// AppContext):
//   GET    /api/seller/banners            → todos os banners
//   POST   /api/seller/banners            → criar (multipart)
//   PUT    /api/seller/banners/reorder    → nova ordem { ids: [...] }
//   POST   /api/seller/banners/import-defaults → importa os 2 originais
//   PUT    /api/seller/banners/:id        → editar (multipart)
//   POST   /api/seller/banners/:id/toggle → ativar / desativar
//   DELETE /api/seller/banners/:id        → apagar
//
// Imagens: campos multipart `image` (desktop) e `mobileImage` (telemóvel),
// enviados para o Cloudinary na pasta "banners". O painel já as reduz no
// browser antes do envio (limite de ~4,5 MB por pedido na Vercel).
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { dangerouslyDeleteByTag, waitUntil } from '@vercel/functions';
import Banner from '../models/Banner.js';

// ─────────────────────────────────────────────────────────────────────
// Cache no CDN da Vercel
//   A lista pública é igual para todos os visitantes: fica 10 min no CDN
//   e é limpa a cada alteração feita no admin. Se a limpeza falhar, uma
//   alteração demora no máximo 10 min a aparecer na loja.
//   Fora da Vercel estas funções não fazem nada.
// ─────────────────────────────────────────────────────────────────────
const BANNERS_TAG = 'hero-banners';
const CDN_TTL_SECONDS = 600;
const CLOUDINARY_FOLDER = 'banners';

const purgeBannersCache = () => {
  try {
    const purge = Promise.resolve(dangerouslyDeleteByTag(BANNERS_TAG)).catch(
      error =>
        console.error('[banners] limpeza do CDN falhou:', error?.message),
    );
    waitUntil(purge);
  } catch (error) {
    console.error('[banners] limpeza do CDN falhou:', error?.message);
  }
};

const setPrivateHeaders = res => {
  res.setHeader(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate, max-age=0',
  );
};

// ─────────────────────────────────────────────────────────────────────
// Banners originais do site (ficheiros em client/public). Servem para o
// admin começar a partir do que já está no ar em vez de uma lista vazia.
// A loja usa esta mesma lista como reserva quando não há banners ativos
// (client/src/utils/heroBanners.js) — manter as duas iguais.
// ─────────────────────────────────────────────────────────────────────
const DEFAULT_BANNERS = [
  {
    title:
      'Elite Surfing Brasil - Acessórios de Surf Premium - Decks, Leashes, Capas e Quilhas',
    image: '/hero-new.jpg',
    mobileImage: '/hero-new.jpg',
    heading: 'Precision Meets\nPerformance',
    subtitle: 'Elite Surfing',
  },
  {
    title:
      'Surfista em onda com equipamentos Elite Surfing - Loja Online de Surf no Brasil',
    image: '/banner-novo2.png',
    mobileImage: '/banner-carlos-mobile.jpg',
    heading: '',
    subtitle: 'Premium Surf Accessories',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const toBool = (value, fallback) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
};

const toDateOrNull = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Destino do clique: caminho do próprio site ou URL http(s). Qualquer
// outra coisa (javascript:, data:, //host) é recusada.
const isValidLink = link =>
  link === '' ||
  (/^\/(?!\/)/.test(link) && !/\s/.test(link)) ||
  /^https?:\/\/[^\s]+$/i.test(link);

// Valida e normaliza os campos de texto. Devolve { error } ou { data }.
const sanitizeBannerFields = body => {
  const title = String(body.title || '').trim();
  if (!title) return { error: 'Dê um nome ao banner.' };
  if (title.length > 160)
    return { error: 'O nome do banner tem no máximo 160 caracteres.' };

  const heading = String(body.heading || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (heading.length > 120)
    return { error: 'O texto principal tem no máximo 120 caracteres.' };

  const subtitle = String(body.subtitle || '').trim();
  if (subtitle.length > 80)
    return { error: 'O texto secundário tem no máximo 80 caracteres.' };

  const link = String(body.link || '').trim();
  if (!isValidLink(link))
    return {
      error:
        'Link inválido: use um caminho do site (ex.: /collections/decks) ou um endereço completo começado por https://.',
    };

  const startsAt = toDateOrNull(body.startsAt);
  const endsAt = toDateOrNull(body.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt)
    return { error: 'A data de fim deve ser posterior à data de início.' };

  return {
    data: {
      title,
      heading,
      subtitle,
      link,
      startsAt,
      endsAt,
      isActive: toBool(body.isActive, true),
    },
  };
};

const pickFile = (req, field) => req.files?.[field]?.[0] || null;

const uploadBannerImage = async file => {
  if (!file.mimetype?.startsWith('image/'))
    throw new Error(`"${file.originalname}" não é uma imagem válida.`);
  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: 'image',
    folder: CLOUDINARY_FOLDER,
  });
  return { url: result.secure_url, publicId: result.public_id };
};

// Apaga do Cloudinary sem nunca falhar o pedido (imagem órfã é inofensiva)
const destroyBannerImage = async publicId => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('[banners] erro ao apagar imagem:', error?.message);
  }
};

const isLive = (banner, now = new Date()) =>
  banner.isActive &&
  (!banner.startsAt || banner.startsAt <= now) &&
  (!banner.endsAt || banner.endsAt >= now);

const sortedBanners = () => Banner.find().sort({ order: 1, createdAt: 1 });

// ═════════════════════════════════════════════════════════════════════
// 🌐 PÚBLICO — GET /api/banner
//   Banners ativos e dentro do período, já na ordem do carrossel.
//   Lista vazia = a loja mostra os banners originais (reserva).
// ═════════════════════════════════════════════════════════════════════
export const getPublicBanners = async (req, res) => {
  // Pedidos sem credenciais são iguais para todos → cache no CDN.
  // (Com Authorization/x-seller-token mantém-se o no-store global.)
  const hasCredentials =
    !!req.headers.authorization || !!req.headers['x-seller-token'];
  if (!hasCredentials && !req.query.fresh) {
    res.setHeader(
      'Cache-Control',
      `public, max-age=60, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=60`,
    );
    res.setHeader('Vercel-Cache-Tag', BANNERS_TAG);
    res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
  } else {
    setPrivateHeaders(res);
  }

  try {
    const now = new Date();
    const banners = (await sortedBanners()).filter(b => isLive(b, now));
    return res.json({
      success: true,
      banners: banners.map(b => ({
        _id: b._id,
        title: b.title,
        image: b.image,
        mobileImage: b.mobileImage || '',
        heading: b.heading || '',
        subtitle: b.subtitle || '',
        link: b.link || '',
      })),
    });
  } catch (error) {
    console.error('❌ getPublicBanners:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: false, banners: [] });
  }
};

// ═════════════════════════════════════════════════════════════════════
// 🔐 ADMIN
// ═════════════════════════════════════════════════════════════════════

// GET /api/seller/banners
export const listBanners = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const banners = await sortedBanners();
    return res.json({ success: true, banners });
  } catch (error) {
    console.error('❌ listBanners:', error);
    return res.json({ success: false, message: error.message });
  }
};

// POST /api/seller/banners  (multipart: image*, mobileImage)
export const createBanner = async (req, res) => {
  setPrivateHeaders(res);
  const uploaded = [];
  try {
    const { error, data } = sanitizeBannerFields(req.body || {});
    if (error) return res.json({ success: false, message: error });

    const imageFile = pickFile(req, 'image');
    const mobileFile = pickFile(req, 'mobileImage');
    if (!imageFile)
      return res.json({
        success: false,
        message: 'Envie a imagem para desktop.',
      });

    const image = await uploadBannerImage(imageFile);
    uploaded.push(image.publicId);
    const mobile = mobileFile ? await uploadBannerImage(mobileFile) : null;
    if (mobile) uploaded.push(mobile.publicId);

    // Novo banner entra no fim do carrossel
    const last = await Banner.findOne().sort({ order: -1 }).select('order');
    const banner = await Banner.create({
      ...data,
      image: image.url,
      imagePublicId: image.publicId,
      mobileImage: mobile?.url || '',
      mobileImagePublicId: mobile?.publicId || '',
      order: last ? last.order + 1 : 0,
    });

    purgeBannersCache();
    return res.json({ success: true, message: 'Banner criado!', banner });
  } catch (error) {
    console.error('❌ createBanner:', error);
    // não deixa imagens órfãs no Cloudinary se a gravação falhar
    await Promise.all(uploaded.map(destroyBannerImage));
    return res.json({
      success: false,
      message: error.message || 'Erro ao criar o banner.',
    });
  }
};

// PUT /api/seller/banners/:id  (multipart: image, mobileImage,
//                               removeMobileImage='true')
export const updateBanner = async (req, res) => {
  setPrivateHeaders(res);
  const uploaded = [];
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.json({ success: false, message: 'Banner não encontrado.' });

    const { error, data } = sanitizeBannerFields(req.body || {});
    if (error) return res.json({ success: false, message: error });

    const banner = await Banner.findById(req.params.id);
    if (!banner)
      return res.json({ success: false, message: 'Banner não encontrado.' });

    const imageFile = pickFile(req, 'image');
    const mobileFile = pickFile(req, 'mobileImage');
    const removeMobile = toBool(req.body.removeMobileImage, false);
    const toDestroy = [];

    if (imageFile) {
      const image = await uploadBannerImage(imageFile);
      uploaded.push(image.publicId);
      toDestroy.push(banner.imagePublicId);
      banner.image = image.url;
      banner.imagePublicId = image.publicId;
    }

    if (mobileFile) {
      const mobile = await uploadBannerImage(mobileFile);
      uploaded.push(mobile.publicId);
      toDestroy.push(banner.mobileImagePublicId);
      banner.mobileImage = mobile.url;
      banner.mobileImagePublicId = mobile.publicId;
    } else if (removeMobile) {
      toDestroy.push(banner.mobileImagePublicId);
      banner.mobileImage = '';
      banner.mobileImagePublicId = '';
    }

    Object.assign(banner, data);
    await banner.save();

    // só apaga as imagens antigas depois de a gravação ter corrido bem
    await Promise.all(toDestroy.map(destroyBannerImage));

    purgeBannersCache();
    return res.json({ success: true, message: 'Banner atualizado!', banner });
  } catch (error) {
    console.error('❌ updateBanner:', error);
    await Promise.all(uploaded.map(destroyBannerImage));
    return res.json({
      success: false,
      message: error.message || 'Erro ao atualizar o banner.',
    });
  }
};

// PUT /api/seller/banners/reorder   body: { ids: [id, id, ...] }
export const reorderBanners = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!ids || !ids.every(id => mongoose.isValidObjectId(id)))
      return res.json({ success: false, message: 'Ordem inválida.' });

    if (ids.length) {
      await Banner.bulkWrite(
        ids.map((id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { order: index } },
          },
        })),
      );
    }

    purgeBannersCache();
    return res.json({ success: true, message: 'Ordem atualizada!' });
  } catch (error) {
    console.error('❌ reorderBanners:', error);
    return res.json({ success: false, message: error.message });
  }
};

// POST /api/seller/banners/:id/toggle
export const toggleBanner = async (req, res) => {
  setPrivateHeaders(res);
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.json({ success: false, message: 'Banner não encontrado.' });
    const banner = await Banner.findById(req.params.id);
    if (!banner)
      return res.json({ success: false, message: 'Banner não encontrado.' });

    banner.isActive = !banner.isActive;
    await banner.save();

    purgeBannersCache();
    return res.json({
      success: true,
      message: banner.isActive ? 'Banner ativado.' : 'Banner desativado.',
      banner,
    });
  } catch (error) {
    console.error('❌ toggleBanner:', error);
    return res.json({ success: false, message: error.message });
  }
};

// DELETE /api/seller/banners/:id
export const deleteBanner = async (req, res) => {
  setPrivateHeaders(res);
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.json({ success: false, message: 'Banner não encontrado.' });
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner)
      return res.json({ success: false, message: 'Banner não encontrado.' });

    await Promise.all([
      destroyBannerImage(banner.imagePublicId),
      destroyBannerImage(banner.mobileImagePublicId),
    ]);

    purgeBannersCache();
    return res.json({ success: true, message: 'Banner excluído.' });
  } catch (error) {
    console.error('❌ deleteBanner:', error);
    return res.json({ success: false, message: error.message });
  }
};

// POST /api/seller/banners/import-defaults
//   Copia para o painel os 2 banners originais do site, para o admin os
//   poder reordenar, editar ou substituir. Só funciona com a lista vazia.
export const importDefaultBanners = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const existing = await Banner.countDocuments();
    if (existing > 0)
      return res.json({
        success: false,
        message: 'Já existem banners cadastrados.',
      });

    await Banner.insertMany(
      DEFAULT_BANNERS.map((banner, index) => ({
        ...banner,
        order: index,
        isActive: true,
      })),
    );

    purgeBannersCache();
    const banners = await sortedBanners();
    return res.json({
      success: true,
      message: 'Banners atuais importados!',
      banners,
    });
  } catch (error) {
    console.error('❌ importDefaultBanners:', error);
    return res.json({ success: false, message: error.message });
  }
};
