// server/controllers/couponController.js
// ═══════════════════════════════════════════════════════════════════════
// 🎫 CUPONS — API admin (painel /seller/cupons) + validação pública
// ═══════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { dangerouslyDeleteByTag, waitUntil } from '@vercel/functions';
import Coupon, { COUPON_SCOPES, COUPON_TYPES } from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Product from '../models/Product.js';
import {
  evaluateCoupon,
  normalizeCode,
  couponLabel,
  getActiveWelcomeCoupon,
} from '../services/couponService.js';

// ─────────────────────────────────────────────────────────────────────
// 🎁 Oferta de boas-vindas — cache no CDN da Vercel
//   A resposta de GET /api/coupon/welcome é igual para todos os
//   visitantes, por isso fica 10 min no CDN (o modal não acorda a função
//   nem o MongoDB a cada visita). Qualquer alteração de cupons no admin
//   limpa essa cache; se a limpeza falhar, o atraso máximo é de 10 min.
//   Fora da Vercel as funções abaixo são no-op.
// ─────────────────────────────────────────────────────────────────────
const WELCOME_TAG = 'welcome-offer';
const WELCOME_CDN_TTL_SECONDS = 600;

const purgeWelcomeCache = () => {
  try {
    const purge = Promise.resolve(dangerouslyDeleteByTag(WELCOME_TAG)).catch(
      error =>
        console.error('[welcomeOffer] limpeza do CDN falhou:', error?.message),
    );
    waitUntil(purge);
  } catch (error) {
    console.error('[welcomeOffer] limpeza do CDN falhou:', error?.message);
  }
};

// Só pode existir um cupom de boas-vindas: ao ligar a opção num cupom,
// desliga-a em todos os outros.
const keepSingleWelcomeCoupon = async coupon => {
  if (!coupon?.welcomeOffer) return;
  await Coupon.updateMany(
    { _id: { $ne: coupon._id }, welcomeOffer: true },
    { $set: { welcomeOffer: false } },
  );
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const toNumberOrNull = v => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toDateOrNull = v => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const uniqStrings = arr =>
  Array.isArray(arr)
    ? [...new Set(arr.map(s => String(s).trim()).filter(Boolean))]
    : [];

// Valida e normaliza o payload do admin. Devolve { error } ou { data }.
const sanitizeCouponPayload = body => {
  const code = normalizeCode(body.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code))
    return {
      error:
        'Código inválido: use 3 a 30 caracteres (letras, números, "-" ou "_").',
    };

  const discountType = String(body.discountType || '');
  if (!COUPON_TYPES.includes(discountType))
    return { error: 'Tipo de desconto inválido.' };

  const discountValue = toNumberOrNull(body.discountValue);
  if (discountValue === null || discountValue <= 0)
    return { error: 'Valor do desconto deve ser maior que zero.' };
  if (discountType === 'percentage' && discountValue > 100)
    return { error: 'Desconto percentual não pode exceder 100%.' };

  const maxDiscount =
    discountType === 'percentage' ? toNumberOrNull(body.maxDiscount) : null;
  if (maxDiscount !== null && maxDiscount < 0)
    return { error: 'Desconto máximo não pode ser negativo.' };

  const minOrderValue = toNumberOrNull(body.minOrderValue) ?? 0;
  if (minOrderValue < 0)
    return { error: 'Pedido mínimo não pode ser negativo.' };

  const startsAt = toDateOrNull(body.startsAt);
  const expiresAt = toDateOrNull(body.expiresAt);
  if (startsAt && expiresAt && expiresAt <= startsAt)
    return { error: 'A data de expiração deve ser posterior ao início.' };

  const usageLimit = toNumberOrNull(body.usageLimit);
  if (usageLimit !== null && usageLimit < 1)
    return { error: 'Limite de utilizações deve ser ≥ 1.' };

  const perCustomerLimit = toNumberOrNull(body.perCustomerLimit);
  if (perCustomerLimit !== null && perCustomerLimit < 1)
    return { error: 'Limite por cliente deve ser ≥ 1.' };

  const scope = COUPON_SCOPES.includes(body.scope) ? body.scope : 'all';
  const groups = scope === 'groups' ? uniqStrings(body.groups) : [];
  const categories = scope === 'categories' ? uniqStrings(body.categories) : [];
  if (scope === 'groups' && !groups.length)
    return { error: 'Selecione pelo menos uma categoria.' };
  if (scope === 'categories' && !categories.length)
    return { error: 'Selecione pelo menos uma subcategoria.' };

  return {
    data: {
      code,
      description: String(body.description || '')
        .trim()
        .slice(0, 200),
      discountType,
      discountValue,
      maxDiscount: maxDiscount && maxDiscount > 0 ? maxDiscount : null,
      minOrderValue,
      startsAt,
      expiresAt,
      usageLimit: usageLimit ? Math.floor(usageLimit) : null,
      perCustomerLimit: perCustomerLimit ? Math.floor(perCustomerLimit) : null,
      scope,
      groups,
      categories,
      stackWithPix:
        body.stackWithPix !== false && body.stackWithPix !== 'false',
      firstOrderOnly:
        body.firstOrderOnly === true || body.firstOrderOnly === 'true',
      welcomeOffer: body.welcomeOffer === true || body.welcomeOffer === 'true',
      isActive: body.isActive !== false && body.isActive !== 'false',
    },
  };
};

// Identificação opcional do cliente logado (cookie `token`) — sem bloquear
const getOptionalUserId = req => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null) ||
      req.headers['x-auth-token'] ||
      null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id || decoded?._id || decoded?.userId || null;
  } catch {
    return null;
  }
};

// Carrega os produtos das linhas do carrinho (mantém quantidade)
export const loadCartLines = async items => {
  const ids = (items || [])
    .map(i => i?.product?._id || i?.product)
    .filter(Boolean)
    .map(String);
  if (!ids.length) return [];
  const products = await Product.find({ _id: { $in: ids } }).select(
    'name offerPrice price group category',
  );
  const byId = new Map(products.map(p => [String(p._id), p]));
  return (items || [])
    .map(i => ({
      product: byId.get(String(i?.product?._id || i?.product)) || null,
      quantity: Math.max(0, Number(i?.quantity) || 0),
    }))
    .filter(l => l.product && l.quantity > 0);
};

// ═════════════════════════════════════════════════════════════════════
// 🌐 PÚBLICO — POST /api/coupon/validate
//   body: { code, items: [{ product, quantity }], email? }
//   Devolve a pré-visualização do desconto (o valor final é SEMPRE
//   recalculado no servidor de pagamento).
// ═════════════════════════════════════════════════════════════════════
export const validateCoupon = async (req, res) => {
  try {
    const { code, items, email } = req.body || {};
    const lines = await loadCartLines(items);
    if (!lines.length)
      return res.json({ success: false, message: 'Carrinho vazio.' });

    const userId = getOptionalUserId(req);
    const result = await evaluateCoupon({
      code,
      lines,
      userId,
      email: email ? String(email).toLowerCase().trim() : null,
    });

    if (!result.valid)
      return res.json({
        success: false,
        reason: result.reason,
        message: result.message,
      });

    return res.json({
      success: true,
      message: result.message,
      coupon: {
        code: result.code,
        description: result.description,
        discountType: result.discountType,
        discountValue: result.discountValue,
        discountAmount: result.discountAmount,
        effectivePercentage: result.effectivePercentage,
        eligibleSubtotal: result.eligibleSubtotal,
        eligibleProductIds: result.eligibleProductIds,
        partial: result.partial,
        stackWithPix: result.stackWithPix,
        label: result.label,
      },
    });
  } catch (error) {
    console.error('❌ validateCoupon:', error);
    return res.json({ success: false, message: 'Erro ao validar o cupom.' });
  }
};

// ═════════════════════════════════════════════════════════════════════
// 🌐 PÚBLICO — GET /api/coupon/welcome
//   Devolve a oferta de boas-vindas em vigor (ou offer: null). O modal do
//   site só aparece quando existe uma oferta — desativar o cupom no admin
//   desliga o modal, e o texto ("5% OFF") vem sempre do cupom real.
// ═════════════════════════════════════════════════════════════════════
export const getWelcomeOffer = async (req, res) => {
  // Pedidos sem credenciais são iguais para todos → cache no CDN.
  // (Com Authorization/x-seller-token mantém-se o no-store global.)
  const hasCredentials =
    !!req.headers.authorization || !!req.headers['x-seller-token'];
  if (!hasCredentials) {
    res.setHeader(
      'Cache-Control',
      `public, max-age=60, s-maxage=${WELCOME_CDN_TTL_SECONDS}, stale-while-revalidate=60`,
    );
    res.setHeader('Vercel-Cache-Tag', WELCOME_TAG);
    res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
  }

  try {
    const coupon = await getActiveWelcomeCoupon();
    if (!coupon) return res.json({ success: true, offer: null });

    return res.json({
      success: true,
      offer: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        label: couponLabel(coupon),
        stackWithPix: coupon.stackWithPix,
        firstOrderOnly: true, // o cupom de boas-vindas é sempre de 1ª compra
        minOrderValue: coupon.minOrderValue || 0,
        partial: coupon.scope !== 'all',
      },
    });
  } catch (error) {
    console.error('❌ getWelcomeOffer:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: false, offer: null });
  }
};

// ═════════════════════════════════════════════════════════════════════
// 🔐 ADMIN — CRUD
// ═════════════════════════════════════════════════════════════════════

// GET /api/coupon  → lista + métricas agregadas
export const listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    const stats = await CouponRedemption.aggregate([
      { $match: { status: { $ne: 'released' } } },
      {
        $group: {
          _id: '$coupon',
          redemptions: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
          },
          totalDiscount: { $sum: '$discountAmount' },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, '$orderAmount', 0],
            },
          },
        },
      },
    ]);
    const statsById = new Map(stats.map(s => [String(s._id), s]));

    const data = coupons.map(c => {
      const s = statsById.get(String(c._id));
      return {
        ...c.toJSON(),
        stats: {
          redemptions: s?.redemptions || 0,
          confirmed: s?.confirmed || 0,
          totalDiscount: Math.round((s?.totalDiscount || 0) * 100) / 100,
          totalRevenue: Math.round((s?.totalRevenue || 0) * 100) / 100,
        },
      };
    });

    return res.json({ success: true, coupons: data });
  } catch (error) {
    console.error('❌ listCoupons:', error);
    return res.json({ success: false, message: error.message });
  }
};

// POST /api/coupon
export const createCoupon = async (req, res) => {
  try {
    const { error, data } = sanitizeCouponPayload(req.body || {});
    if (error) return res.json({ success: false, message: error });

    const exists = await Coupon.exists({ code: data.code });
    if (exists)
      return res.json({
        success: false,
        message: `Já existe um cupom com o código ${data.code}.`,
      });

    const coupon = await Coupon.create(data);
    await keepSingleWelcomeCoupon(coupon);
    purgeWelcomeCache();
    return res.json({ success: true, message: 'Cupom criado!', coupon });
  } catch (error) {
    console.error('❌ createCoupon:', error);
    return res.json({ success: false, message: error.message });
  }
};

// PUT /api/coupon/:id
export const updateCoupon = async (req, res) => {
  try {
    const { error, data } = sanitizeCouponPayload(req.body || {});
    if (error) return res.json({ success: false, message: error });

    const clash = await Coupon.exists({
      code: data.code,
      _id: { $ne: req.params.id },
    });
    if (clash)
      return res.json({
        success: false,
        message: `Já existe um cupom com o código ${data.code}.`,
      });

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!coupon)
      return res.json({ success: false, message: 'Cupom não encontrado.' });

    await keepSingleWelcomeCoupon(coupon);
    purgeWelcomeCache();
    return res.json({ success: true, message: 'Cupom atualizado!', coupon });
  } catch (error) {
    console.error('❌ updateCoupon:', error);
    return res.json({ success: false, message: error.message });
  }
};

// PATCH /api/coupon/:id/toggle
export const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon)
      return res.json({ success: false, message: 'Cupom não encontrado.' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    purgeWelcomeCache();
    return res.json({
      success: true,
      message: coupon.isActive ? 'Cupom ativado.' : 'Cupom desativado.',
      coupon,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// DELETE /api/coupon/:id
//   Cupons com resgates são desativados (mantém histórico dos pedidos).
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon)
      return res.json({ success: false, message: 'Cupom não encontrado.' });

    const hasRedemptions = await CouponRedemption.exists({
      coupon: coupon._id,
      status: { $ne: 'released' },
    });
    if (hasRedemptions) {
      coupon.isActive = false;
      await coupon.save();
      purgeWelcomeCache();
      return res.json({
        success: true,
        softDeleted: true,
        message:
          'Este cupom já foi utilizado em pedidos e foi desativado (histórico preservado).',
      });
    }

    await CouponRedemption.deleteMany({ coupon: coupon._id });
    await coupon.deleteOne();
    purgeWelcomeCache();
    return res.json({ success: true, message: 'Cupom excluído.' });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// GET /api/coupon/:id/redemptions
export const listRedemptions = async (req, res) => {
  try {
    const redemptions = await CouponRedemption.find({ coupon: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, redemptions });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
