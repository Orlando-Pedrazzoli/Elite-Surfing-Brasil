// server/controllers/mercadoPagoController.js
// ═══════════════════════════════════════════════════════════════════════
// 💠 MERCADO PAGO — CARTÃO + PIX (nativo) + BOLETO
// ═══════════════════════════════════════════════════════════════════════
// SDK: mercadopago v3 (MercadoPagoConfig + Payment)
// Cartão : Card Payment Brick tokeniza no front → backend cria Payment
// PIX    : nativo, gera QR dinâmico + qr_code_base64 → auto-confirma via webhook
// Boleto : payment_method_id = 'bolbradesco' → URL/PDF + linha digitável
// Webhook: valida x-signature (HMAC-SHA256) e é a ÚNICA fonte de verdade
// Moeda  : BRL — transaction_amount em REAIS (float), NÃO centavos
// ═══════════════════════════════════════════════════════════════════════
// ⚠️ SEGURANÇA: o valor é SEMPRE recalculado no servidor a partir dos
//    produtos + frete. O client nunca dita o preço final cobrado.
// ═══════════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import { MercadoPagoConfig, Payment } from 'mercadopago';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import nodemailer from 'nodemailer';

// =============================================================================
// CLIENTE MERCADO PAGO
// =============================================================================
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 8000 },
});
const mpPayment = new Payment(mpClient);

const WEBHOOK_URL =
  process.env.MP_WEBHOOK_URL ||
  (process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL}/api/mercadopago/webhook`
    : undefined);

// Limite de desconto aceite vindo do client (defesa contra adulteração de cupom)
const MAX_DISCOUNT_PCT = 20;

// =============================================================================
// NOTIFICAÇÕES (carregamento defensivo, igual ao padrão do projeto)
// =============================================================================
let notifyAdminNewOrder = null;
try {
  const adminService = await import('../services/adminNotificationService.js');
  notifyAdminNewOrder = adminService.notifyAdminNewOrder;
  console.log('✅ adminNotificationService carregado (mercadopago)');
} catch (error) {
  console.error(
    '❌ ERRO ao carregar adminNotificationService (mp):',
    error.message,
  );
}

// =============================================================================
// HELPERS GERAIS
// =============================================================================
const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  const first_name = parts.shift() || 'Cliente';
  const last_name = parts.join(' ') || 'Sobrenome';
  return { first_name, last_name };
};

const cleanDigits = (v = '') => v.replace(/\D/g, '');

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const formatBRL = value =>
  (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Mensagens amigáveis para os principais status_detail de recusa
const declineMessage = statusDetail => {
  const map = {
    cc_rejected_insufficient_amount: 'Saldo/limite insuficiente no cartão.',
    cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
    cc_rejected_bad_filled_date: 'Data de validade incorreta.',
    cc_rejected_bad_filled_security_code:
      'Código de segurança (CVV) incorreto.',
    cc_rejected_bad_filled_other: 'Algum dado do cartão está incorreto.',
    cc_rejected_call_for_authorize:
      'Autorize o pagamento junto ao seu banco e tente de novo.',
    cc_rejected_card_disabled: 'Cartão desativado. Contacte o emissor.',
    cc_rejected_high_risk:
      'Pagamento recusado por análise de risco. Tente outro meio.',
    cc_rejected_max_attempts: 'Muitas tentativas. Tente novamente mais tarde.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado detetado.',
    cc_rejected_card_type_not_allowed: 'Tipo de cartão não aceite.',
  };
  return (
    map[statusDetail] ||
    'Pagamento recusado pela operadora. Verifique os dados ou tente outro cartão.'
  );
};

// =============================================================================
// VALIDAR STOCK
// =============================================================================
const validateOrderStock = async items => {
  const errors = [];
  for (const item of items) {
    const productId = item.product._id || item.product;
    const product = await Product.findById(productId);
    if (!product) {
      errors.push(`Produto não encontrado: ${productId}`);
      continue;
    }
    const stock = product.stock || 0;
    if (stock === 0) errors.push(`${product.name} está esgotado`);
    else if (item.quantity > stock)
      errors.push(
        `${product.name}: apenas ${stock} disponível(eis), solicitado ${item.quantity}`,
      );
  }
  return { valid: errors.length === 0, errors };
};

// =============================================================================
// DECREMENTAR STOCK
// =============================================================================
const decrementProductStock = async items => {
  try {
    for (const item of items) {
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId);
      if (product) {
        const newStock = Math.max(0, (product.stock || 0) - item.quantity);
        await Product.findByIdAndUpdate(productId, {
          stock: newStock,
          inStock: newStock > 0,
        });
      }
    }
    console.log('✅ Estoque atualizado');
    return true;
  } catch (error) {
    console.error('❌ Erro ao decrementar estoque:', error.message);
    return false;
  }
};

// =============================================================================
// 🛡️ RECALCULAR O VALOR NO SERVIDOR (anti-tampering)
//    Devolve { productData, computedAmount }
//    pixDiscount aplica-se só ao fluxo PIX.
// =============================================================================
const computeServerAmount = async ({
  items,
  discountPercentage = 0,
  shippingCost = 0,
  applyPixDiscount = false,
}) => {
  const safeDiscount = Math.min(
    Math.max(Number(discountPercentage) || 0, 0),
    MAX_DISCOUNT_PCT,
  );

  let productData = [];
  let subtotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new Error(`Produto não encontrado: ${item.product}`);
    const lineUnit = product.offerPrice;
    productData.push({
      id: product._id.toString(),
      name: product.name,
      price: lineUnit,
      quantity: item.quantity,
    });
    subtotal += lineUnit * item.quantity;
  }

  let amount = subtotal;
  if (safeDiscount > 0) amount = amount * (1 - safeDiscount / 100);
  if (applyPixDiscount) amount = amount * 0.9; // PIX 10% OFF
  amount = amount + Number(shippingCost || 0);

  return {
    productData,
    computedAmount: round2(amount),
    subtotal: round2(subtotal),
  };
};

// =============================================================================
// CRIAR DOCUMENTO DE ENCOMENDA NO MONGO
// =============================================================================
const buildOrderDoc = (req, paymentType, computedAmount, extra = {}) => {
  const b = req.body;
  const doc = {
    items: b.items,
    amount: computedAmount,
    address: b.address,
    paymentType,
    isPaid: false,
    promoCode: b.promoCode || '',
    discountAmount: b.discountAmount || 0,
    discountPercentage: b.discountPercentage || 0,
    originalAmount: b.originalAmount || computedAmount,
    shippingCost: b.shippingCost || 0,
    shippingMethod: b.shippingMethod || '',
    shippingCarrier: b.shippingCarrier || '',
    shippingDeliveryDays: b.shippingDeliveryDays || 0,
    shippingServiceId: b.shippingServiceId || '',
    ...extra,
  };
  if (b.isGuestOrder) {
    doc.isGuestOrder = true;
    doc.guestEmail = b.guestEmail || b.customerEmail;
    doc.guestName = b.guestName || b.customerName;
    doc.guestPhone = b.guestPhone || b.customerPhone || '';
    doc.userId = null;
  } else {
    doc.isGuestOrder = false;
    doc.userId = b.userId;
  }
  return doc;
};

// =============================================================================
// 💳 CARTÃO — recebe o formData do Card Payment Brick
// =============================================================================
export const createCardPayment = async (req, res) => {
  console.log('\n💳 ═══ MERCADO PAGO — CARTÃO ═══');
  try {
    const {
      items,
      address,
      discountPercentage,
      shippingCost,
      customerName,
      customerEmail,
      customerDocument,
      isGuestOrder,
      // dados do Brick:
      token,
      issuer_id,
      payment_method_id,
      installments,
      payer: brickPayer,
    } = req.body;

    if (!token)
      return res.json({ success: false, message: 'Token do cartão ausente.' });
    if (!items?.length)
      return res.json({ success: false, message: 'Carrinho vazio.' });
    if (!address)
      return res.json({
        success: false,
        message: 'Endereço de entrega obrigatório.',
      });

    const stock = await validateOrderStock(items);
    if (!stock.valid)
      return res.json({
        success: false,
        message: 'Estoque insuficiente: ' + stock.errors.join(', '),
      });

    const { productData, computedAmount } = await computeServerAmount({
      items,
      discountPercentage,
      shippingCost,
      applyPixDiscount: false,
    });

    const cpf = cleanDigits(
      customerDocument || brickPayer?.identification?.number,
    );
    const email = customerEmail || brickPayer?.email;
    const { first_name, last_name } = splitName(customerName);

    const order = await Order.create(
      buildOrderDoc(req, 'mercadopago_card', computedAmount),
    );
    console.log('✅ Order criada:', order._id, '| valor:', computedAmount);

    const body = {
      transaction_amount: computedAmount,
      token,
      description: `Pedido Elite Surfing #${order._id.toString().slice(-8).toUpperCase()}`,
      installments: Number(installments) || 1,
      payment_method_id,
      issuer_id,
      statement_descriptor: 'ELITESURF',
      external_reference: order._id.toString(),
      notification_url: WEBHOOK_URL,
      metadata: { order_id: order._id.toString(), is_guest: !!isGuestOrder },
      payer: {
        email,
        first_name,
        last_name,
        identification: { type: 'CPF', number: cpf },
      },
    };

    let payment;
    try {
      payment = await mpPayment.create({
        body,
        requestOptions: { idempotencyKey: `card_${order._id.toString()}` },
      });
    } catch (mpErr) {
      console.error('❌ MP card error:', mpErr?.message, mpErr?.cause || '');
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao processar o cartão. Verifique os dados.',
      });
    }

    console.log('💳 MP status:', payment.status, '|', payment.status_detail);

    await Order.findByIdAndUpdate(order._id, {
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
      paymentInstallments: Number(installments) || 1,
    });

    if (payment.status === 'approved') {
      const updated = await Order.findByIdAndUpdate(
        order._id,
        { isPaid: true, paidAt: new Date(), status: 'Pedido Confirmado' },
        { new: true },
      ).populate('items.product');
      await decrementProductStock(updated.items);
      if (updated.userId && !updated.isGuestOrder)
        await User.findByIdAndUpdate(updated.userId, { cartItems: {} });
      await safeSendPaidNotifications(updated, email);

      return res.json({
        success: true,
        status: 'paid',
        orderId: order._id,
        message: 'Pagamento aprovado!',
      });
    }

    if (payment.status === 'in_process' || payment.status === 'pending') {
      return res.json({
        success: true,
        status: 'pending',
        orderId: order._id,
        message:
          'Pagamento em análise. Você será notificado quando for aprovado.',
      });
    }

    // rejected / cancelled
    await Order.findByIdAndDelete(order._id);
    return res.json({
      success: false,
      status: 'rejected',
      message: declineMessage(payment.status_detail),
      declineReason: payment.status_detail,
    });
  } catch (error) {
    console.error('❌ Erro createCardPayment:', error);
    return res.json({
      success: false,
      message: 'Erro ao processar pagamento. Tente novamente.',
    });
  }
};

// =============================================================================
// 🔳 PIX NATIVO — gera QR dinâmico
// =============================================================================
export const createPixPayment = async (req, res) => {
  console.log('\n🔳 ═══ MERCADO PAGO — PIX ═══');
  try {
    const {
      items,
      address,
      discountPercentage,
      shippingCost,
      customerName,
      customerEmail,
      customerDocument,
      isGuestOrder,
    } = req.body;

    if (!items?.length)
      return res.json({ success: false, message: 'Carrinho vazio.' });
    if (!address)
      return res.json({
        success: false,
        message: 'Endereço de entrega obrigatório.',
      });

    const stock = await validateOrderStock(items);
    if (!stock.valid)
      return res.json({
        success: false,
        message: 'Estoque insuficiente: ' + stock.errors.join(', '),
      });

    const { computedAmount } = await computeServerAmount({
      items,
      discountPercentage,
      shippingCost,
      applyPixDiscount: true,
    });

    const email = customerEmail;
    const cpf = cleanDigits(customerDocument);
    const { first_name, last_name } = splitName(customerName);

    const order = await Order.create(
      buildOrderDoc(req, 'mercadopago_pix', computedAmount, {
        status: 'Aguardando Pagamento',
      }),
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const body = {
      transaction_amount: computedAmount,
      payment_method_id: 'pix',
      description: `Pedido Elite Surfing #${order._id.toString().slice(-8).toUpperCase()}`,
      external_reference: order._id.toString(),
      notification_url: WEBHOOK_URL,
      date_of_expiration: expiresAt.toISOString(),
      metadata: { order_id: order._id.toString(), is_guest: !!isGuestOrder },
      payer: {
        email,
        first_name,
        last_name,
        ...(cpf.length === 11
          ? { identification: { type: 'CPF', number: cpf } }
          : {}),
      },
    };

    let payment;
    try {
      payment = await mpPayment.create({
        body,
        requestOptions: { idempotencyKey: `pix_${order._id.toString()}` },
      });
    } catch (mpErr) {
      console.error('❌ MP pix error:', mpErr?.message, mpErr?.cause || '');
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao gerar o PIX. Tente novamente.',
      });
    }

    const txData = payment.point_of_interaction?.transaction_data || {};
    const qrCode = txData.qr_code || '';
    const qrCodeBase64 = txData.qr_code_base64 || '';
    const ticketUrl = txData.ticket_url || '';

    if (!qrCode) {
      console.error('❌ MP não retornou QR PIX');
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao gerar o PIX. Tente novamente.',
      });
    }

    await Order.findByIdAndUpdate(order._id, {
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      mpPixQrCode: qrCode,
      mpPixQrCodeBase64: qrCodeBase64,
      mpPixTicketUrl: ticketUrl,
      mpExpiresAt: expiresAt.toISOString(),
    });

    // Esvaziar carrinho do user logado (guest é limpo no client)
    if (!isGuestOrder && req.body.userId)
      await User.findByIdAndUpdate(req.body.userId, { cartItems: {} });

    console.log('✅ PIX gerado para order', order._id);

    return res.json({
      success: true,
      orderId: order._id,
      amount: computedAmount,
      pix: {
        qrCode,
        qrCodeBase64, // imagem PNG base64 (sem prefixo data:)
        ticketUrl,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Erro createPixPayment:', error);
    return res.json({
      success: false,
      message: 'Erro ao gerar o PIX. Tente novamente.',
    });
  }
};

// =============================================================================
// 🧾 BOLETO
// =============================================================================
export const createBoletoPayment = async (req, res) => {
  console.log('\n🧾 ═══ MERCADO PAGO — BOLETO ═══');
  try {
    const {
      items,
      address,
      discountPercentage,
      shippingCost,
      customerName,
      customerEmail,
      customerPhone,
      customerDocument,
      isGuestOrder,
    } = req.body;

    if (!items?.length)
      return res.json({ success: false, message: 'Carrinho vazio.' });
    if (!address)
      return res.json({
        success: false,
        message: 'Endereço de entrega obrigatório.',
      });

    const cpf = cleanDigits(customerDocument);
    if (cpf.length !== 11)
      return res.json({
        success: false,
        message: 'CPF é obrigatório para boleto.',
      });

    const stock = await validateOrderStock(items);
    if (!stock.valid)
      return res.json({
        success: false,
        message: 'Estoque insuficiente: ' + stock.errors.join(', '),
      });

    const { productData, computedAmount } = await computeServerAmount({
      items,
      discountPercentage,
      shippingCost,
      applyPixDiscount: false,
    });

    const addressDoc = await Address.findById(address);
    if (!addressDoc)
      return res.json({ success: false, message: 'Endereço não encontrado.' });

    const email = customerEmail;
    const { first_name, last_name } = splitName(customerName);

    const order = await Order.create(
      buildOrderDoc(req, 'mercadopago_boleto', computedAmount, {
        status: 'Aguardando Pagamento',
      }),
    );

    // Vencimento: 3 dias úteis
    const due = new Date();
    let added = 0;
    while (added < 3) {
      due.setDate(due.getDate() + 1);
      const d = due.getDay();
      if (d !== 0 && d !== 6) added++;
    }

    const body = {
      transaction_amount: computedAmount,
      payment_method_id: 'bolbradesco',
      description: `Pedido Elite Surfing #${order._id.toString().slice(-8).toUpperCase()}`,
      external_reference: order._id.toString(),
      notification_url: WEBHOOK_URL,
      date_of_expiration: due.toISOString(),
      metadata: { order_id: order._id.toString(), is_guest: !!isGuestOrder },
      payer: {
        email,
        first_name,
        last_name,
        identification: { type: 'CPF', number: cpf },
        address: {
          zip_code: cleanDigits(addressDoc.zipcode),
          street_name: addressDoc.street || '',
          street_number: String(addressDoc.number || 'S/N'),
          neighborhood: addressDoc.neighborhood || '',
          city: addressDoc.city || '',
          federal_unit: addressDoc.state || '',
        },
      },
    };

    let payment;
    try {
      payment = await mpPayment.create({
        body,
        requestOptions: { idempotencyKey: `boleto_${order._id.toString()}` },
      });
    } catch (mpErr) {
      console.error('❌ MP boleto error:', mpErr?.message, mpErr?.cause || '');
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao gerar o boleto. Tente novamente.',
      });
    }

    console.log(
      '🧾 MP boleto resposta:',
      JSON.stringify({
        id: payment?.id,
        status: payment?.status,
        status_detail: payment?.status_detail,
        external_resource_url:
          payment?.transaction_details?.external_resource_url || null,
        barcode: payment?.barcode?.content || null,
      }),
    );

    const td = payment.transaction_details || {};
    const boletoUrl = td.external_resource_url || '';
    const barcode = payment.barcode?.content || '';
    const expiresAt = payment.date_of_expiration || due.toISOString();

    if (!boletoUrl && !barcode) {
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao gerar o boleto. Tente novamente.',
      });
    }

    await Order.findByIdAndUpdate(order._id, {
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      mpBoletoUrl: boletoUrl,
      mpBoletoBarcode: barcode,
      mpExpiresAt: expiresAt,
    });

    if (!isGuestOrder && req.body.userId)
      await User.findByIdAndUpdate(req.body.userId, { cartItems: {} });

    // E-mail de "boleto gerado" (pagamento ainda pendente)
    try {
      await sendBoletoGeneratedEmails(
        order,
        customerName,
        email,
        customerPhone || '',
        productData,
        addressDoc,
        { url: boletoUrl, barcode, expiresAt },
      );
    } catch (e) {
      console.error('❌ Email boleto falhou:', e.message);
    }

    return res.json({
      success: true,
      orderId: order._id,
      amount: computedAmount,
      status: 'pending',
      boleto: { url: boletoUrl, barcode, expiresAt },
    });
  } catch (error) {
    console.error('❌ Erro createBoletoPayment:', error);
    return res.json({
      success: false,
      message: 'Erro ao gerar o boleto. Tente novamente.',
    });
  }
};

// =============================================================================
// 🔐 VALIDAR ASSINATURA DO WEBHOOK (x-signature HMAC-SHA256)
// =============================================================================
const isValidSignature = req => {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      console.warn(
        '⚠️ MP_WEBHOOK_SECRET não configurado — assinatura NÃO validada',
      );
      return true; // permite em dev; configure em produção
    }
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (!xSignature) return false;

    let ts = '';
    let v1 = '';
    for (const part of xSignature.split(',')) {
      const [k, val] = part.split('=').map(s => (s || '').trim());
      if (k === 'ts') ts = val;
      if (k === 'v1') v1 = val;
    }

    let dataId =
      req.query['data.id'] || req.query.id || req.body?.data?.id || '';
    dataId = String(dataId);
    if (/[a-zA-Z]/.test(dataId)) dataId = dataId.toLowerCase();

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const computed = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    if (computed.length !== v1.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch (e) {
    console.error('❌ Erro a validar assinatura:', e.message);
    return false;
  }
};

// =============================================================================
// 🔔 WEBHOOK — única fonte de verdade do status
// =============================================================================
export const mercadoPagoWebhook = async (req, res) => {
  try {
    if (!isValidSignature(req)) {
      console.warn('⛔ Webhook com assinatura inválida — ignorado');
      return res.status(401).json({ received: false });
    }

    const type = req.body?.type || req.query.type;
    const paymentId =
      req.body?.data?.id || req.query['data.id'] || req.query.id;

    // Responder rápido; processar o necessário
    if (type !== 'payment' || !paymentId) {
      return res.status(200).json({ received: true });
    }

    const payment = await mpPayment.get({ id: paymentId });
    const orderId = payment.external_reference;
    const status = payment.status;
    console.log(
      '🔔 Webhook payment',
      paymentId,
      '→',
      status,
      '| order',
      orderId,
    );

    if (!orderId) return res.status(200).json({ received: true });
    const order = await Order.findById(orderId);
    if (!order) return res.status(200).json({ received: true });

    await Order.findByIdAndUpdate(order._id, {
      mpStatus: status,
      mpStatusDetail: payment.status_detail,
    });

    if (status === 'approved' && !order.isPaid) {
      const updated = await Order.findByIdAndUpdate(
        order._id,
        { isPaid: true, paidAt: new Date(), status: 'Pedido Confirmado' },
        { new: true },
      ).populate('items.product');
      await decrementProductStock(updated.items);
      if (updated.userId && !updated.isGuestOrder)
        await User.findByIdAndUpdate(updated.userId, { cartItems: {} });
      await safeSendPaidNotifications(updated, updated.guestEmail);
    } else if (
      (status === 'cancelled' || status === 'rejected') &&
      !order.isPaid
    ) {
      // PIX expirado / boleto cancelado / cartão recusado pós-análise
      await Order.findByIdAndUpdate(order._id, { status: 'Cancelado' });
    } else if (status === 'refunded' || status === 'charged_back') {
      await Order.findByIdAndUpdate(order._id, { status: 'Cancelado' });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro no webhook MP:', error.message);
    // 200 para o MP não re-tentar indefinidamente em erros do nosso lado
    return res.status(200).json({ received: true });
  }
};

// =============================================================================
// 🔍 STATUS PÚBLICO (polling da página de PIX) — sem dados sensíveis
// =============================================================================
export const getPublicPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select(
      'isPaid status mpStatus',
    );
    if (!order)
      return res.json({ success: false, message: 'Pedido não encontrado' });
    return res.json({
      success: true,
      isPaid: order.isPaid,
      status: order.status,
      mpStatus: order.mpStatus,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🔍 STATUS DETALHADO (admin)
// =============================================================================
export const checkMpOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order?.mpPaymentId)
      return res.json({ success: false, message: 'Pedido sem pagamento MP' });
    const payment = await mpPayment.get({ id: order.mpPaymentId });
    return res.json({
      success: true,
      isPaid: order.isPaid,
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail,
      amount: payment.transaction_amount,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 📧 NOTIFICAÇÕES DE PAGAMENTO CONFIRMADO (reusa sendAllOrderEmails)
// =============================================================================
const safeSendPaidNotifications = async (order, fallbackEmail) => {
  try {
    const { sendAllOrderEmails } = await import('./orderController.js');
    if (typeof sendAllOrderEmails === 'function') {
      const recipient = order.isGuestOrder
        ? order.guestEmail || fallbackEmail
        : order.userId;
      if (recipient) await sendAllOrderEmails(order, recipient);
    }
  } catch (e) {
    console.error('❌ Notificações de pagamento falharam:', e.message);
  }
};

// =============================================================================
// 🧾 E-MAILS DE "BOLETO GERADO" (cliente + admin) — pagamento ainda pendente
//    (Portado do fluxo anterior para manter paridade visual.)
// =============================================================================
const sendBoletoGeneratedEmails = async (
  order,
  customerName,
  customerEmail,
  customerPhone,
  productData,
  addressDoc,
  boleto,
) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Email não configurado');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const orderNumber = order._id.toString().slice(-8).toUpperCase();
  let expires = boleto.expiresAt;
  try {
    expires = new Date(boleto.expiresAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    /* keep raw */
  }

  const itemsHTML = productData
    .map(it => {
      let price = it.price;
      if (order.discountPercentage > 0)
        price = it.price * (1 - order.discountPercentage / 100);
      return `<tr><td style="padding:10px;border-bottom:1px solid #eee;">${it.name}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${formatBRL(price * it.quantity)}</td></tr>`;
    })
    .join('');

  const clientHTML = `
  <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;">🏄 Elite Surfing Brasil</h1>
      <p style="color:#a0a0a0;margin:8px 0 0;">Seu boleto foi gerado!</p>
    </div>
    <div style="padding:28px;">
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:18px;margin-bottom:18px;text-align:center;">
        <h2 style="margin:0 0 8px;color:#856404;">⏳ Aguardando Pagamento</h2>
        <p style="margin:0;color:#856404;">O pedido será confirmado assim que o pagamento for identificado.</p>
      </div>
      <div style="background:#f8f9fa;border-radius:8px;padding:18px;margin-bottom:18px;">
        <p style="margin:5px 0;"><strong>Nº Pedido:</strong> #${orderNumber}</p>
        <p style="margin:5px 0;"><strong>Total:</strong> <strong style="font-size:18px;color:#1a1a2e;">${formatBRL(order.amount)}</strong></p>
        <p style="margin:5px 0;"><strong>Vencimento:</strong> ${expires}</p>
      </div>
      ${boleto.barcode ? `<div style="background:#fff;border:1px solid #e5e7eb;padding:12px;border-radius:6px;margin-bottom:14px;word-break:break-all;"><p style="margin:0 0 4px;font-size:12px;color:#666;">Linha digitável:</p><p style="margin:0;font-family:monospace;font-size:13px;">${boleto.barcode}</p></div>` : ''}
      ${boleto.url ? `<div style="text-align:center;margin:16px 0;"><a href="${boleto.url}" target="_blank" style="display:inline-block;background:#17a2b8;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">📄 Abrir Boleto</a></div>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:10px;">${itemsHTML}</table>
      <div style="margin-top:28px;text-align:center;color:#666;font-size:13px;">
        <p>📧 atendimento@elitesurfing.com.br · 📱 +55 (21) 96435-8058</p>
      </div>
    </div>
  </div>`;

  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  const adminHTML = `
  <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
    <div style="background:#ff9800;padding:22px;text-align:center;"><h1 style="color:#fff;margin:0;">🧾 NOVO BOLETO GERADO</h1></div>
    <div style="padding:22px;">
      <p><strong>Pedido:</strong> #${orderNumber}</p>
      <p><strong>Cliente:</strong> ${customerName} — ${customerEmail} ${customerPhone ? '· ' + customerPhone : ''}</p>
      <p><strong>Vencimento:</strong> ${expires}</p>
      <table style="width:100%;border-collapse:collapse;">${itemsHTML}</table>
      <div style="background:#ff9800;color:#fff;padding:14px;border-radius:8px;text-align:center;margin-top:14px;"><strong style="font-size:20px;">TOTAL: ${formatBRL(order.amount)}</strong></div>
    </div>
  </div>`;

  const tasks = [
    transporter
      .sendMail({
        from: { name: 'Elite Surfing Brasil', address: process.env.GMAIL_USER },
        to: customerEmail,
        subject: `🧾 Boleto Gerado — Pedido #${orderNumber}`,
        html: clientHTML,
      })
      .catch(e => ({ error: e.message })),
    transporter
      .sendMail({
        from: { name: 'Elite Surfing Brasil', address: process.env.GMAIL_USER },
        to: adminEmail,
        subject: `🧾 BOLETO #${orderNumber} — ${formatBRL(order.amount)} — AGUARDANDO`,
        html: adminHTML,
      })
      .catch(e => ({ error: e.message })),
  ];
  if (notifyAdminNewOrder) {
    const products = productData.map(p => ({
      _id: p.id,
      name: p.name,
      offerPrice: p.price,
    }));
    tasks.push(
      notifyAdminNewOrder(
        order,
        { name: customerName, email: customerEmail, phone: customerPhone },
        products,
        addressDoc,
      ).catch(e => ({ error: e.message })),
    );
  }
  await Promise.all(tasks);
  console.log('🧾 E-mails de boleto enviados');
};
