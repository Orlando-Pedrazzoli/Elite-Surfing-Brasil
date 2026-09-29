// server/controllers/socialController.js
// ═══════════════════════════════════════════════════════════════════════
// 📸 SOCIAL CONTROLLER — Estúdio Instagram (Fase 1)
// ═══════════════════════════════════════════════════════════════════════
// Todas as rotas são protegidas por authSeller (ver socialRoute.js).
//
//   GET    /api/social/health            → estado da configuração (chave, modelos)
//   GET    /api/social/settings          → voz da marca + estado da ligação IG
//   PUT    /api/social/settings          → atualiza voz da marca / defaults
//   GET    /api/social/sources           → produtos, cupons e eventos WSL para o wizard
//   GET    /api/social/media/templates   → imagens compostas (Cloudinary) de um produto
//   POST   /api/social/generate          → gera conteúdo e cria SocialPost (draft)
//   POST   /api/social/rewrite           → reescrita rápida de um texto
//   GET    /api/social/posts             → lista (filtros: status, type)
//   GET    /api/social/posts/:id         → detalhe
//   PUT    /api/social/posts/:id         → edita conteúdo / status / media
//   DELETE /api/social/posts/:id         → apaga (só draft/approved/failed)
// ═══════════════════════════════════════════════════════════════════════
import SocialPost, {
  SOCIAL_POST_TYPES,
  SOCIAL_POST_GOALS,
} from '../models/SocialPost.js';
import SocialSettings from '../models/SocialSettings.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import WslEvent from '../models/WslEvent.js';
import {
  generateContent,
  rewriteText,
  isGeneratorConfigured,
  getModelInfo,
  REWRITE_MODE_KEYS,
} from '../services/instagram/contentGenerator.js';
import {
  buildProductTemplates,
  isCloudinaryUrl,
} from '../services/instagram/mediaComposer.js';
import { isMetaConfigured } from '../services/instagram/metaGraphService.js';
import { isSecretBoxConfigured } from '../utils/secretBox.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.elitesurfing.com.br').replace(
  /\/$/,
  '',
);

const noStore = res => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};

const isValidId = id => /^[a-f\d]{24}$/i.test(String(id || ''));

// URL pública do produto com UTM para medir vendas vindas do Instagram
const buildProductUrl = (product, campaign, postId) => {
  const category = String(product.category || '').toLowerCase();
  const base = `${SITE_URL}/products/${encodeURIComponent(category)}/${product._id}`;
  const params = new URLSearchParams({
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: campaign || 'organic',
  });
  if (postId) params.set('utm_content', String(postId));
  return `${base}?${params.toString()}`;
};

// ─────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────
export const health = async (req, res) => {
  noStore(res);
  res.json({
    success: true,
    generatorConfigured: isGeneratorConfigured(),
    models: getModelInfo(),
    logoConfigured: !!process.env.SOCIAL_LOGO_PUBLIC_ID,
    siteUrl: SITE_URL,
    // Fase 2
    metaConfigured: isMetaConfigured(),
    encryptionConfigured: isSecretBoxConfigured(),
    cronConfigured: !!process.env.CRON_SECRET,
    cloudinaryUploadConfigured: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  });
};

// ─────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────
export const getSettings = async (req, res) => {
  try {
    noStore(res);
    const settings = await SocialSettings.getSingleton();
    res.json({ success: true, settings: settings.toSafeJSON() });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    noStore(res);
    const settings = await SocialSettings.getSingleton();
    const { brandVoice, defaults } = req.body || {};

    if (brandVoice && typeof brandVoice === 'object') {
      const allowed = [
        'tone',
        'pillars',
        'audience',
        'bannedWords',
        'emojiLevel',
        'ctaStyle',
        'baseHashtags',
        'handle',
      ];
      for (const key of allowed) {
        if (brandVoice[key] !== undefined) {
          settings.brandVoice[key] = brandVoice[key];
        }
      }
      // Normaliza listas de texto
      ['pillars', 'bannedWords', 'baseHashtags'].forEach(k => {
        if (Array.isArray(settings.brandVoice[k])) {
          settings.brandVoice[k] = settings.brandVoice[k]
            .map(s => String(s).trim())
            .filter(Boolean)
            .slice(0, 20);
        }
      });
      settings.brandVoice.baseHashtags = settings.brandVoice.baseHashtags.map(h =>
        h.replace(/^#+/, '').toLowerCase(),
      );
    }

    if (defaults && typeof defaults === 'object') {
      if (defaults.timezone) settings.defaults.timezone = String(defaults.timezone);
      if (Array.isArray(defaults.postingTimes)) {
        settings.defaults.postingTimes = defaults.postingTimes
          .map(s => String(s).trim())
          .filter(s => /^\d{2}:\d{2}$/.test(s))
          .slice(0, 6);
      }
      if (defaults.variantCount !== undefined) {
        settings.defaults.variantCount = Math.min(
          3,
          Math.max(1, parseInt(defaults.variantCount) || 3),
        );
      }
    }

    await settings.save();
    res.json({
      success: true,
      message: 'Configurações salvas',
      settings: settings.toSafeJSON(),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// SOURCES — o que o wizard pode selecionar
// ─────────────────────────────────────────────────────────────────────
export const getSources = async (req, res) => {
  try {
    noStore(res);
    const [products, coupons, wslEvents] = await Promise.all([
      Product.find({})
        .select(
          'name sku category group price offerPrice stock inStock image color size freeShipping tags productFamily isMainVariant displayOrder',
        )
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean(),
      Coupon.find({ isActive: { $ne: false } })
        .select('code description discountType discountValue maxDiscount minOrderValue expiresAt firstOrderOnly isActive')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      WslEvent.find({ status: { $in: ['upcoming', 'live'] } })
        .sort({ season: -1, stop: 1 })
        .limit(30)
        .lean(),
    ]);

    res.json({ success: true, products, coupons, wslEvents });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// MEDIA TEMPLATES — imagens compostas de um produto
// ─────────────────────────────────────────────────────────────────────
export const getMediaTemplates = async (req, res) => {
  try {
    noStore(res);
    const { productId, imageIndex, background } = req.query;
    if (!isValidId(productId)) {
      return res.json({ success: false, message: 'productId inválido' });
    }
    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    const idx = Math.max(0, parseInt(imageIndex) || 0);
    const templates = buildProductTemplates(product, {
      imageIndex: idx,
      background: background === 'auto' ? 'auto' : 'white',
    });

    res.json({
      success: true,
      templates,
      images: (product.image || []).map((url, i) => ({
        index: i,
        url,
        composable: isCloudinaryUrl(url),
      })),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GENERATE — cria um SocialPost em draft com tudo o que a IA devolveu
// ─────────────────────────────────────────────────────────────────────
export const generate = async (req, res) => {
  try {
    noStore(res);

    if (!isGeneratorConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          'Gerador não configurado: falta ANTHROPIC_API_KEY nas variáveis de ambiente do servidor.',
      });
    }

    const {
      type,
      goal = 'sell',
      productIds = [],
      couponId = null,
      wslEventId = null,
      context = '',
      variantCount,
      campaign = '',
    } = req.body || {};

    if (!SOCIAL_POST_TYPES.includes(type)) {
      return res.json({ success: false, message: 'Formato inválido' });
    }
    if (!SOCIAL_POST_GOALS.includes(goal)) {
      return res.json({ success: false, message: 'Objetivo inválido' });
    }
    const ids = (Array.isArray(productIds) ? productIds : []).filter(isValidId).slice(0, 5);
    if (ids.length === 0 && !wslEventId && !String(context).trim()) {
      return res.json({
        success: false,
        message: 'Selecione pelo menos um produto, um evento WSL ou escreva um briefing.',
      });
    }

    const settings = await SocialSettings.getSingleton();

    const [products, coupon, wslEvent] = await Promise.all([
      ids.length ? Product.find({ _id: { $in: ids } }).lean() : [],
      isValidId(couponId) ? Coupon.findById(couponId).lean() : null,
      isValidId(wslEventId) ? WslEvent.findById(wslEventId).lean() : null,
    ]);

    // Cria o post primeiro para ter o _id no link UTM
    const post = new SocialPost({
      type,
      goal,
      products: products.map(p => p._id),
      coupon: coupon?._id || null,
      wslEvent: wslEvent?._id || null,
      context: String(context || '').slice(0, 1000),
      status: 'draft',
    });

    const campaignSlug =
      String(campaign || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40) || `${goal}-${type}`;

    const productsWithUrl = products.map(p => ({
      ...p,
      url: buildProductUrl(p, campaignSlug, post._id),
    }));

    const count = Math.min(
      3,
      Math.max(1, parseInt(variantCount) || settings.defaults?.variantCount || 3),
    );

    const { content, generation } = await generateContent(
      {
        type,
        goal,
        products: productsWithUrl,
        coupon,
        wslEvent,
        context,
        variantCount: count,
      },
      settings,
    );

    const first = content.variants[0] || {};
    post.formula = content.formula;
    post.variants = content.variants;
    post.selectedVariant = 0;
    post.hook = first.hook || '';
    post.caption = first.caption || '';
    post.cta = first.cta || '';
    post.hashtags = first.hashtags || [];
    post.slides = content.slides;
    post.reelScript = content.reelScript;
    post.stories = content.stories;
    post.mediaGuidance = content.mediaGuidance;
    post.generation = generation;
    post.utm = {
      campaign: campaignSlug,
      url: productsWithUrl[0]?.url || '',
    };

    await post.save();

    const populated = await SocialPost.findById(post._id)
      .populate('products', 'name sku category price offerPrice image freeShipping stock')
      .populate('coupon', 'code discountType discountValue')
      .populate('wslEvent', 'event location dates stop season')
      .lean();

    res.json({ success: true, post: populated });
  } catch (error) {
    console.error('[social/generate]', error);
    const status = error?.status || (error?.code === 'NO_API_KEY' ? 503 : 500);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: friendlyAiError(error),
    });
  }
};

const friendlyAiError = error => {
  const msg = String(error?.message || '');
  if (error?.status === 401 || /invalid x-api-key|authentication/i.test(msg)) {
    return 'Chave da Anthropic inválida. Verifique ANTHROPIC_API_KEY.';
  }
  if (error?.status === 429 || /rate limit/i.test(msg)) {
    return 'Limite de pedidos da IA atingido. Aguarde alguns segundos e tente de novo.';
  }
  if (error?.status === 529 || /overloaded/i.test(msg)) {
    return 'A IA está sobrecarregada neste momento. Tente novamente em instantes.';
  }
  return msg || 'Erro ao gerar conteúdo';
};

// ─────────────────────────────────────────────────────────────────────
// REWRITE — humanizar / encurtar / mais direto / gancho
// ─────────────────────────────────────────────────────────────────────
export const rewrite = async (req, res) => {
  try {
    noStore(res);
    const { text, mode = 'humanize' } = req.body || {};
    if (!text || String(text).trim().length < 10) {
      return res.json({ success: false, message: 'Texto muito curto' });
    }
    if (!REWRITE_MODE_KEYS.includes(mode)) {
      return res.json({ success: false, message: 'Modo inválido' });
    }
    const settings = await SocialSettings.getSingleton();
    const result = await rewriteText(String(text).slice(0, 4000), mode, settings);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[social/rewrite]', error);
    res.status(500).json({ success: false, message: friendlyAiError(error) });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POSTS — CRUD
// ─────────────────────────────────────────────────────────────────────
export const listPosts = async (req, res) => {
  try {
    noStore(res);
    const { status, type, limit } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const posts = await SocialPost.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(200, parseInt(limit) || 100))
      .populate('products', 'name image offerPrice')
      .lean();

    const counts = await SocialPost.aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const statusCounts = Object.fromEntries(counts.map(c => [c._id, c.n]));

    res.json({ success: true, posts, statusCounts });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getPost = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });

    const post = await SocialPost.findById(id)
      .populate('products', 'name sku category price offerPrice image freeShipping stock')
      .populate('coupon', 'code discountType discountValue')
      .populate('wslEvent', 'event location dates stop season')
      .lean();

    if (!post) return res.json({ success: false, message: 'Post não encontrado' });
    res.json({ success: true, post });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Campos que o admin pode editar diretamente
const EDITABLE = [
  'hook',
  'caption',
  'cta',
  'hashtags',
  'selectedVariant',
  'slides',
  'reelScript',
  'stories',
  'media',
  'context',
  'scheduledAt',
];

export const updatePost = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });

    const post = await SocialPost.findById(id);
    if (!post) return res.json({ success: false, message: 'Post não encontrado' });

    // Não editar o que já está a ser publicado/publicado
    if (['publishing', 'published'].includes(post.status) && req.body.status !== post.status) {
      return res.json({
        success: false,
        message: 'Post já publicado não pode ser editado. Crie um novo.',
      });
    }

    const body = req.body || {};
    for (const key of EDITABLE) {
      if (body[key] !== undefined) post[key] = body[key];
    }

    if (Array.isArray(post.hashtags)) {
      post.hashtags = [...new Set(post.hashtags.map(h => String(h).replace(/^#+/, '').trim().toLowerCase()))]
        .filter(Boolean)
        .slice(0, 30);
    }

    // Trocar de variante copia o conteúdo dela para os campos principais
    if (body.selectedVariant !== undefined && post.variants[body.selectedVariant]) {
      const v = post.variants[body.selectedVariant];
      if (body.hook === undefined) post.hook = v.hook;
      if (body.caption === undefined) post.caption = v.caption;
      if (body.cta === undefined) post.cta = v.cta;
      if (body.hashtags === undefined) post.hashtags = v.hashtags;
    }

    // Transições de estado permitidas na Fase 1
    if (body.status !== undefined) {
      const allowed = {
        draft: ['approved'],
        approved: ['draft', 'scheduled'],
        scheduled: ['approved', 'draft'],
        failed: ['draft', 'approved'],
      };
      if (body.status !== post.status) {
        if (!(allowed[post.status] || []).includes(body.status)) {
          return res.json({
            success: false,
            message: `Transição ${post.status} → ${body.status} não permitida`,
          });
        }
        if (body.status === 'scheduled' && !post.scheduledAt) {
          return res.json({
            success: false,
            message: 'Defina a data/hora para agendar',
          });
        }
        if (body.status === 'approved' && !post.caption?.trim() && post.type !== 'story') {
          return res.json({ success: false, message: 'Legenda vazia' });
        }
        post.status = body.status;
        post.lastError = null;
      }
    }

    await post.save();
    const populated = await SocialPost.findById(post._id)
      .populate('products', 'name sku category price offerPrice image freeShipping stock')
      .populate('coupon', 'code discountType discountValue')
      .populate('wslEvent', 'event location dates stop season')
      .lean();

    res.json({ success: true, message: 'Post atualizado', post: populated });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const post = await SocialPost.findById(id);
    if (!post) return res.json({ success: false, message: 'Post não encontrado' });
    if (['publishing', 'published'].includes(post.status)) {
      return res.json({
        success: false,
        message: 'Post publicado fica no histórico e não pode ser apagado.',
      });
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Post apagado' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
