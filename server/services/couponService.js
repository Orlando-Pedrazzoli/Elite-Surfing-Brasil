// server/services/couponService.js
// ═══════════════════════════════════════════════════════════════════════
// 🎫 SERVIÇO DE CUPONS — única fonte de verdade do desconto
// ═══════════════════════════════════════════════════════════════════════
// Usado por:
//   • POST /api/coupon/validate       → pré-visualização no checkout
//   • mercadoPagoController           → recálculo do valor (anti-tampering)
//
// Fluxo de utilização:
//   evaluateCoupon()   → valida regras + calcula desconto (sem efeitos)
//   reserveCoupon()    → incrementa usageCount de forma ATÓMICA e cria o
//                        registo de resgate (na criação do pedido)
//   confirmRedemption()→ pagamento aprovado
//   releaseCoupon()    → pedido cancelado/recusado → devolve o uso
// ═══════════════════════════════════════════════════════════════════════

import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import Order from '../models/Order.js';

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const normalizeCode = code =>
  String(code || '')
    .trim()
    .toUpperCase();

export const formatBRL = v =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(v) || 0,
  );

// Rótulo curto para UI/emails: "-10%" ou "-R$ 20,00"
export const couponLabel = coupon =>
  coupon.discountType === 'percentage'
    ? `-${coupon.discountValue}%`
    : `-${formatBRL(coupon.discountValue)}`;

// ─────────────────────────────────────────────────────────────────────
// Verifica se um produto é elegível para o cupom (escopo)
// ─────────────────────────────────────────────────────────────────────
export const isProductEligible = (coupon, product) => {
  if (!product) return false;
  if (coupon.scope === 'all') return true;
  if (coupon.scope === 'groups')
    return !!product.group && coupon.groups.includes(product.group);
  if (coupon.scope === 'categories')
    return !!product.category && coupon.categories.includes(product.category);
  return false;
};

// ─────────────────────────────────────────────────────────────────────
// Limite por cliente: conta resgates não libertados do mesmo email/user
// ─────────────────────────────────────────────────────────────────────
const countCustomerRedemptions = async (couponId, { userId, email }) => {
  const or = [];
  if (userId) or.push({ userId: String(userId) });
  if (email) or.push({ customerEmail: String(email).toLowerCase().trim() });
  if (!or.length) return 0;
  return CouponRedemption.countDocuments({
    coupon: couponId,
    status: { $ne: 'released' },
    $or: or,
  });
};

const customerHasPaidOrder = async ({ userId, email }) => {
  const or = [];
  if (userId) or.push({ userId: String(userId) });
  if (email) or.push({ guestEmail: String(email).toLowerCase().trim() });
  if (!or.length) return false;
  const found = await Order.exists({ isPaid: true, $or: or });
  return !!found;
};

// ─────────────────────────────────────────────────────────────────────
// 🔎 AVALIAR CUPOM
//   lines: [{ product: <ProductDoc>, quantity }]
//   Devolve sempre { valid, reason?, message } e, se válido:
//   { coupon, discountAmount, eligibleSubtotal, subtotal, label, stackWithPix }
// ─────────────────────────────────────────────────────────────────────
export const evaluateCoupon = async ({ code, lines, userId, email }) => {
  const normalized = normalizeCode(code);
  if (!normalized)
    return { valid: false, reason: 'EMPTY', message: 'Informe um cupom.' };

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon)
    return { valid: false, reason: 'NOT_FOUND', message: 'Cupom inválido.' };

  const now = new Date();
  if (!coupon.isActive)
    return {
      valid: false,
      reason: 'INACTIVE',
      message: 'Este cupom não está ativo.',
    };
  if (coupon.startsAt && coupon.startsAt > now)
    return {
      valid: false,
      reason: 'NOT_STARTED',
      message: `Este cupom só é válido a partir de ${coupon.startsAt.toLocaleDateString('pt-BR')}.`,
    };
  if (coupon.expiresAt && coupon.expiresAt < now)
    return { valid: false, reason: 'EXPIRED', message: 'Este cupom expirou.' };
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    return {
      valid: false,
      reason: 'EXHAUSTED',
      message: 'Este cupom atingiu o limite de utilizações.',
    };

  // ─── Subtotais ───
  let subtotal = 0;
  let eligibleSubtotal = 0;
  const eligibleProductIds = [];
  for (const line of lines || []) {
    const p = line.product;
    if (!p) continue;
    const qty = Math.max(0, Number(line.quantity) || 0);
    const lineTotal = (Number(p.offerPrice) || 0) * qty;
    subtotal += lineTotal;
    if (isProductEligible(coupon, p)) {
      eligibleSubtotal += lineTotal;
      eligibleProductIds.push(String(p._id));
    }
  }
  subtotal = round2(subtotal);
  eligibleSubtotal = round2(eligibleSubtotal);

  if (eligibleSubtotal <= 0)
    return {
      valid: false,
      reason: 'NO_ELIGIBLE_ITEMS',
      message: 'Este cupom não se aplica aos produtos do seu carrinho.',
    };
  if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue)
    return {
      valid: false,
      reason: 'MIN_ORDER',
      message: `Este cupom exige um pedido mínimo de ${formatBRL(coupon.minOrderValue)}.`,
    };

  // ─── Regras por cliente ───
  if (coupon.perCustomerLimit) {
    if (!userId && !email)
      return {
        valid: false,
        reason: 'NEED_IDENTITY',
        message: 'Adicione o seu endereço/email para aplicar este cupom.',
      };
    const used = await countCustomerRedemptions(coupon._id, { userId, email });
    if (used >= coupon.perCustomerLimit)
      return {
        valid: false,
        reason: 'CUSTOMER_LIMIT',
        message: 'Você já utilizou este cupom o número máximo de vezes.',
      };
  }
  if (coupon.firstOrderOnly) {
    if (!userId && !email)
      return {
        valid: false,
        reason: 'NEED_IDENTITY',
        message: 'Adicione o seu endereço/email para aplicar este cupom.',
      };
    if (await customerHasPaidOrder({ userId, email }))
      return {
        valid: false,
        reason: 'FIRST_ORDER_ONLY',
        message: 'Este cupom é válido apenas para a primeira compra.',
      };
  }

  // ─── Cálculo do desconto ───
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = eligibleSubtotal * (coupon.discountValue / 100);
    if (coupon.maxDiscount != null && coupon.maxDiscount > 0)
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  } else {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }
  discountAmount = round2(Math.max(0, discountAmount));

  if (discountAmount <= 0)
    return {
      valid: false,
      reason: 'ZERO_DISCOUNT',
      message: 'Este cupom não gera desconto para o seu carrinho.',
    };

  const effectivePercentage = round2((discountAmount / subtotal) * 100);

  return {
    valid: true,
    coupon,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    effectivePercentage,
    subtotal,
    eligibleSubtotal,
    eligibleProductIds,
    partial: eligibleSubtotal < subtotal,
    stackWithPix: coupon.stackWithPix,
    label: couponLabel(coupon),
    message: `Cupom ${coupon.code} aplicado!`,
  };
};

// ─────────────────────────────────────────────────────────────────────
// 🔒 RESERVAR UTILIZAÇÃO (atómico) — chamado após Order.create
//   Se o limite global foi atingido entre a validação e a criação,
//   a operação falha e devolve false (o controller decide o que fazer).
// ─────────────────────────────────────────────────────────────────────
export const reserveCoupon = async (evaluation, order, { userId, email }) => {
  if (!evaluation?.valid || !order?._id) return false;
  const { coupon } = evaluation;

  const filter = { _id: coupon._id, isActive: true };
  if (coupon.usageLimit) {
    filter.$expr = { $lt: ['$usageCount', '$usageLimit'] };
  }
  const updated = await Coupon.findOneAndUpdate(
    filter,
    { $inc: { usageCount: 1 } },
    { new: true },
  );
  if (!updated) return false;

  try {
    await CouponRedemption.create({
      coupon: coupon._id,
      code: coupon.code,
      order: order._id.toString(),
      userId: userId ? String(userId) : null,
      customerEmail: email ? String(email).toLowerCase().trim() : null,
      discountAmount: evaluation.discountAmount,
      orderAmount: order.amount,
      status: 'reserved',
    });
  } catch (e) {
    // Rollback do contador se o registo falhar (ex.: duplicado)
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { usageCount: -1 } });
    console.error('❌ reserveCoupon: falha ao registar resgate:', e.message);
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────
// ✅ CONFIRMAR (pagamento aprovado)
// ─────────────────────────────────────────────────────────────────────
export const confirmRedemption = async orderId => {
  if (!orderId) return;
  await CouponRedemption.updateOne(
    { order: String(orderId), status: 'reserved' },
    { status: 'confirmed' },
  );
};

// ─────────────────────────────────────────────────────────────────────
// ♻️ LIBERTAR (pedido cancelado / pagamento recusado / order apagada)
//   Idempotente: só decrementa se o resgate ainda não estava 'released'.
// ─────────────────────────────────────────────────────────────────────
export const releaseCoupon = async orderId => {
  if (!orderId) return;
  const redemption = await CouponRedemption.findOneAndUpdate(
    { order: String(orderId), status: { $ne: 'released' } },
    { status: 'released' },
    { new: true },
  );
  if (!redemption) return;
  await Coupon.updateOne(
    { _id: redemption.coupon, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } },
  );
};
