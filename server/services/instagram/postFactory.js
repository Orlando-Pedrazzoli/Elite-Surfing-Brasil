// server/services/instagram/postFactory.js
// ═══════════════════════════════════════════════════════════════════════
// 🏭 POST FACTORY — cria um SocialPost (draft) a partir de um briefing
// ═══════════════════════════════════════════════════════════════════════
// Usado pelo Estúdio (POST /api/social/generate) e pelo Planejador
// semanal (criar rascunho a partir de um item do plano). Centraliza:
// validação, carregamento de produto/cupom/evento, link UTM, chamada à
// IA (com dicas de desempenho recente) e gravação.
// ═══════════════════════════════════════════════════════════════════════
import SocialPost, { SOCIAL_POST_TYPES, SOCIAL_POST_GOALS } from '../../models/SocialPost.js';
import SocialSettings from '../../models/SocialSettings.js';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import WslEvent from '../../models/WslEvent.js';
import { generateContent, isGeneratorConfigured } from './contentGenerator.js';
import { getPerformanceHints } from './analyticsService.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.elitesurfing.com.br').replace(/\/$/, '');

export const isValidId = id => /^[a-f\d]{24}$/i.test(String(id || ''));

export const slugify = text =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

// URL pública do produto com UTM para medir vendas vindas do Instagram
export const buildProductUrl = (product, campaign, postId) => {
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

export const populatePost = id =>
  SocialPost.findById(id)
    .populate('products', 'name sku category price offerPrice image freeShipping stock')
    .populate('coupon', 'code discountType discountValue')
    .populate('wslEvent', 'event location dates stop season')
    .lean();

export class BriefingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'BriefingError';
    this.status = status;
  }
}

/**
 * @param {object} briefing { type, goal, productIds, couponId, wslEventId, context, variantCount, campaign, planItemRef }
 * @returns {Promise<object>} post populado
 */
export const createGeneratedPost = async briefing => {
  if (!isGeneratorConfigured()) {
    throw new BriefingError(
      'Gerador não configurado: falta ANTHROPIC_API_KEY nas variáveis de ambiente do servidor.',
      503,
    );
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
  } = briefing || {};

  if (!SOCIAL_POST_TYPES.includes(type)) throw new BriefingError('Formato inválido');
  if (!SOCIAL_POST_GOALS.includes(goal)) throw new BriefingError('Objetivo inválido');

  const ids = (Array.isArray(productIds) ? productIds : []).filter(isValidId).slice(0, 5);
  if (ids.length === 0 && !wslEventId && !String(context).trim()) {
    throw new BriefingError('Selecione pelo menos um produto, um evento WSL ou escreva um briefing.');
  }

  const settings = await SocialSettings.getSingleton();

  const [products, coupon, wslEvent, hints] = await Promise.all([
    ids.length ? Product.find({ _id: { $in: ids } }).lean() : [],
    isValidId(couponId) ? Coupon.findById(couponId).lean() : null,
    isValidId(wslEventId) ? WslEvent.findById(wslEventId).lean() : null,
    getPerformanceHints().catch(() => ''),
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

  const campaignSlug = slugify(campaign) || `${goal}-${type}`;
  const productsWithUrl = products.map(p => ({
    ...p,
    url: buildProductUrl(p, campaignSlug, post._id),
  }));

  const count = Math.min(
    3,
    Math.max(1, parseInt(variantCount) || settings.defaults?.variantCount || 3),
  );

  // Dicas de desempenho entram como contexto extra do briefing
  const fullContext = [String(context || '').trim(), hints].filter(Boolean).join('\n\n');

  const { content, generation } = await generateContent(
    {
      type,
      goal,
      products: productsWithUrl,
      coupon,
      wslEvent,
      context: fullContext,
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
  post.utm = { campaign: campaignSlug, url: productsWithUrl[0]?.url || '' };

  await post.save();
  return populatePost(post._id);
};
