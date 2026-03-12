// server/controllers/pagarmeController.js
// ═══════════════════════════════════════════════════════════════════════
// 💳 PAGAR.ME V5 — CARTÃO DE CRÉDITO + BOLETO BANCÁRIO
// ═══════════════════════════════════════════════════════════════════════
// Moeda: BRL (R$)
// Métodos: Cartão de crédito (transparent checkout) + Boleto bancário
// Parcelamento: Até 12x sem juros (cartão)
// Tokenização: Frontend tokeniza → Backend cria pedido com card_token
// Boleto: Backend cria → Frontend exibe URL/código de barras
// Webhook: Pagar.me notifica mudanças de status (cartão + boleto)
// ═══════════════════════════════════════════════════════════════════════
// ✅ MIGRAÇÃO 12/03/2026: Boleto migrado de Stripe para Pagar.me V5
// ✅ FIX 11/03/2026: sendAllOrderEmails importada do orderController
// ═══════════════════════════════════════════════════════════════════════

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import nodemailer from 'nodemailer';

// =============================================================================
// IMPORTAÇÃO DOS SERVIÇOS DE NOTIFICAÇÃO
// =============================================================================
let notifyAdminNewOrder = null;

try {
  const adminService = await import('../services/adminNotificationService.js');
  notifyAdminNewOrder = adminService.notifyAdminNewOrder;
  console.log('✅ adminNotificationService carregado (pagarme)');
} catch (error) {
  console.error(
    '❌ ERRO ao carregar adminNotificationService (pagarme):',
    error.message,
  );
}

// =============================================================================
// HELPERS
// =============================================================================
const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

const pagarmeHeaders = () => {
  const secretKey = process.env.PAGARME_SECRET_KEY;
  if (!secretKey) throw new Error('PAGARME_SECRET_KEY não configurada');

  const auth = Buffer.from(`${secretKey}:`).toString('base64');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  };
};

const pagarmeRequest = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: pagarmeHeaders(),
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${PAGARME_API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Pagar.me API Error:', JSON.stringify(data, null, 2));
    throw new Error(data.message || `Pagar.me API error: ${response.status}`);
  }

  return data;
};

// =============================================================================
// VALIDAR STOCK
// =============================================================================
const validateOrderStock = async items => {
  const errors = [];
  for (const item of items) {
    const productId = item.product._id || item.product;
    const quantity = item.quantity;
    const product = await Product.findById(productId);

    if (!product) {
      errors.push(`Produto não encontrado: ${productId}`);
      continue;
    }

    const availableStock = product.stock || 0;
    if (availableStock === 0) {
      errors.push(`${product.name} está esgotado`);
    } else if (quantity > availableStock) {
      errors.push(
        `${product.name}: apenas ${availableStock} disponível(eis), solicitado ${quantity}`,
      );
    }
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
      const quantity = item.quantity;
      const product = await Product.findById(productId);

      if (product) {
        const newStock = Math.max(0, (product.stock || 0) - quantity);
        await Product.findByIdAndUpdate(productId, {
          stock: newStock,
          inStock: newStock > 0,
        });
        console.log(`  ✓ ${product.name}: ${product.stock} → ${newStock}`);
      }
    }
    console.log('✅ Estoque atualizado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao decrementar estoque:', error.message);
    return false;
  }
};

// =============================================================================
// FORMATAR TELEFONE PARA PAGAR.ME
// =============================================================================
const parsePhone = phone => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return {
      country_code: '55',
      area_code:
        digits.substring(digits.length - 11, digits.length - 9) ||
        digits.substring(0, 2),
      number: digits.substring(digits.length - 9),
    };
  }
  return null;
};

// =============================================================================
// MONTAR ITEMS PARA PAGAR.ME (valores em CENTAVOS)
// =============================================================================
const buildPagarmeItems = (
  productData,
  discountPercentage,
  shippingCost,
  shippingCarrier,
  shippingMethod,
) => {
  const pagarmeItems = productData.map(item => {
    let itemPrice = item.price;
    if (discountPercentage > 0) {
      itemPrice = item.price * (1 - discountPercentage / 100);
    }
    return {
      amount: Math.round(itemPrice * 100),
      description: item.name.substring(0, 256),
      quantity: item.quantity,
      code: item.id,
    };
  });

  // Adicionar frete como item se existir
  if (shippingCost && shippingCost > 0) {
    pagarmeItems.push({
      amount: Math.round(shippingCost * 100),
      description: `Frete - ${shippingCarrier || ''} ${shippingMethod || ''}`
        .trim()
        .substring(0, 256),
      quantity: 1,
      code: 'shipping',
    });
  }

  return pagarmeItems;
};

// =============================================================================
// 💳 CRIAR PEDIDO COM CARTÃO — PAGAR.ME V5 (TRANSPARENT CHECKOUT)
// =============================================================================
export const createCardOrder = async (req, res) => {
  console.log('');
  console.log('💳 ═══════════════════════════════════════════════════');
  console.log('💳 NOVO PEDIDO PAGAR.ME — CARTÃO DE CRÉDITO');
  console.log('💳 ═══════════════════════════════════════════════════');

  try {
    const {
      // Dados do pedido
      items,
      address,
      amount,
      originalAmount,
      discountAmount,
      discountPercentage,
      promoCode,
      installments,
      // Dados do cartão (tokenizado)
      cardToken,
      // Dados do cliente (para Pagar.me)
      customerName,
      customerEmail,
      customerPhone,
      customerDocument, // CPF
      // Dados de entrega
      shippingCost,
      shippingMethod,
      shippingCarrier,
      shippingDeliveryDays,
      shippingServiceId,
      // Endereço de cobrança
      billingAddress,
      // Guest ou User
      isGuestOrder,
      guestEmail,
      guestName,
      guestPhone,
      userId,
    } = req.body;

    console.log('💳 cardToken:', cardToken ? '✅ Recebido' : '❌ Ausente');
    console.log('💳 installments:', installments || 1);
    console.log('💳 amount:', amount);
    console.log('💳 isGuestOrder:', isGuestOrder);
    console.log('💳 customerDocument (CPF):', customerDocument ? '✅' : '❌');

    // ─── Validações ───────────────────────────────────────────
    if (!cardToken) {
      return res.json({
        success: false,
        message: 'Token do cartão é obrigatório',
      });
    }
    if (!items || items.length === 0) {
      return res.json({ success: false, message: 'Carrinho vazio' });
    }
    if (!address) {
      return res.json({
        success: false,
        message: 'Endereço de entrega obrigatório',
      });
    }
    if (!customerDocument) {
      return res.json({
        success: false,
        message: 'CPF é obrigatório para pagamento com cartão',
      });
    }
    if (!customerName || !customerEmail) {
      return res.json({
        success: false,
        message: 'Nome e email são obrigatórios',
      });
    }

    // Validar stock
    const stockValidation = await validateOrderStock(items);
    if (!stockValidation.valid) {
      return res.json({
        success: false,
        message: 'Estoque insuficiente: ' + stockValidation.errors.join(', '),
      });
    }

    // ─── Buscar dados dos produtos ────────────────────────────
    let productData = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.json({
          success: false,
          message: `Produto não encontrado: ${item.product}`,
        });
      }
      productData.push({
        id: product._id.toString(),
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
    }

    // ─── Criar pedido no MongoDB ──────────────────────────────
    const orderData = {
      items,
      amount,
      address,
      paymentType: 'pagarme_card',
      isPaid: false,
      promoCode: promoCode || '',
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || 0,
      originalAmount: originalAmount || amount,
      shippingCost: shippingCost || 0,
      shippingMethod: shippingMethod || '',
      shippingCarrier: shippingCarrier || '',
      shippingDeliveryDays: shippingDeliveryDays || 0,
      shippingServiceId: shippingServiceId || '',
    };

    if (isGuestOrder) {
      orderData.isGuestOrder = true;
      orderData.guestEmail = guestEmail || customerEmail;
      orderData.guestName = guestName || customerName;
      orderData.guestPhone = guestPhone || customerPhone || '';
      orderData.userId = null;
    } else {
      orderData.userId = userId;
      orderData.isGuestOrder = false;
    }

    const order = await Order.create(orderData);
    console.log('✅ Pedido MongoDB criado:', order._id);

    // ─── Buscar endereço para billing ─────────────────────────
    const addressDoc = await Address.findById(address);
    if (!addressDoc) {
      return res.json({ success: false, message: 'Endereço não encontrado' });
    }

    // ─── Montar items para Pagar.me ───────────────────────────
    const pagarmeItems = buildPagarmeItems(
      productData,
      discountPercentage,
      shippingCost,
      shippingCarrier,
      shippingMethod,
    );

    // Total em centavos
    const totalCentavos = Math.round(amount * 100);

    const mobilePhone = parsePhone(customerPhone || addressDoc.phone);

    // ─── Formatar CPF ─────────────────────────────────────────
    const cleanCPF = customerDocument.replace(/\D/g, '');

    // ─── Montar billing address ───────────────────────────────
    const billingLine1 =
      `${addressDoc.number || ''}, ${addressDoc.street}, ${addressDoc.neighborhood || ''}`.trim();

    // ─── Criar pedido na API Pagar.me V5 ──────────────────────
    const pagarmePayload = {
      items: pagarmeItems,
      customer: {
        name: customerName,
        email: customerEmail,
        document: cleanCPF,
        document_type: 'CPF',
        type: 'individual',
        phones: mobilePhone ? { mobile_phone: mobilePhone } : undefined,
      },
      payments: [
        {
          payment_method: 'credit_card',
          amount: totalCentavos,
          credit_card: {
            installments: parseInt(installments) || 1,
            statement_descriptor: 'ELITESURF',
            card_token: cardToken,
            card: {
              billing_address: {
                line_1: billingLine1.substring(0, 256),
                line_2: addressDoc.complement || '',
                zip_code: (addressDoc.zipcode || '').replace(/\D/g, ''),
                city: addressDoc.city || '',
                state: addressDoc.state || '',
                country: 'BR',
              },
            },
          },
        },
      ],
      metadata: {
        order_id: order._id.toString(),
        is_guest: isGuestOrder ? 'true' : 'false',
      },
    };

    console.log('💳 Enviando para Pagar.me V5...');
    console.log('💳 Parcelas:', installments);
    console.log('💳 Total (centavos):', totalCentavos);

    const pagarmeOrder = await pagarmeRequest(
      '/orders',
      'POST',
      pagarmePayload,
    );

    console.log('💳 Resposta Pagar.me:', pagarmeOrder.status);
    console.log('💳 Pagar.me Order ID:', pagarmeOrder.id);

    // ─── Verificar resultado ──────────────────────────────────
    const charge = pagarmeOrder.charges?.[0];
    const lastTransaction = charge?.last_transaction;
    const transactionStatus = lastTransaction?.status;

    console.log('💳 Charge Status:', charge?.status);
    console.log('💳 Transaction Status:', transactionStatus);

    if (
      charge?.status === 'paid' ||
      transactionStatus === 'captured' ||
      transactionStatus === 'authorized_pending_capture'
    ) {
      // ✅ PAGAMENTO APROVADO
      console.log('✅ Pagamento APROVADO pelo Pagar.me!');

      const updatedOrder = await Order.findByIdAndUpdate(
        order._id,
        {
          isPaid: true,
          paidAt: new Date(),
          pagarmeOrderId: pagarmeOrder.id,
          pagarmeChargeId: charge.id,
          paymentInstallments: parseInt(installments) || 1,
        },
        { new: true },
      ).populate('items.product');

      // Decrementar estoque
      await decrementProductStock(updatedOrder.items);

      // Limpar carrinho (se não for guest)
      if (userId && !isGuestOrder) {
        await User.findByIdAndUpdate(userId, { cartItems: {} });
      }

      // ✅ AWAIT notificações ANTES de responder
      try {
        await sendNotifications(
          updatedOrder,
          isGuestOrder,
          guestEmail || customerEmail,
          userId,
        );
      } catch (err) {
        console.error('❌ Erro ao enviar notificações:', err.message);
      }

      return res.json({
        success: true,
        message: 'Pagamento aprovado!',
        orderId: order._id,
        pagarmeOrderId: pagarmeOrder.id,
        status: 'paid',
        installments: parseInt(installments) || 1,
      });
    } else if (
      charge?.status === 'pending' ||
      transactionStatus === 'waiting_payment'
    ) {
      // ⏳ PENDENTE (antifraud review)
      console.log('⏳ Pagamento PENDENTE (revisão antifraude)');

      await Order.findByIdAndUpdate(order._id, {
        pagarmeOrderId: pagarmeOrder.id,
        pagarmeChargeId: charge?.id,
        paymentInstallments: parseInt(installments) || 1,
      });

      return res.json({
        success: true,
        message:
          'Pagamento em análise. Você será notificado quando for aprovado.',
        orderId: order._id,
        pagarmeOrderId: pagarmeOrder.id,
        status: 'pending',
      });
    } else {
      // ❌ PAGAMENTO RECUSADO
      console.log(
        '❌ Pagamento RECUSADO:',
        lastTransaction?.acquirer_message || 'Motivo desconhecido',
      );

      // Deletar pedido do MongoDB
      await Order.findByIdAndDelete(order._id);

      const declineMessage =
        lastTransaction?.acquirer_message ||
        'Pagamento recusado pela operadora';

      return res.json({
        success: false,
        message: `Pagamento recusado: ${declineMessage}. Por favor, verifique os dados do cartão ou tente outro cartão.`,
        declineReason: declineMessage,
      });
    }
  } catch (error) {
    console.error('❌ Erro Pagar.me:', error);

    // Mensagem amigável para erros comuns
    let userMessage = 'Erro ao processar pagamento. Tente novamente.';

    if (error.message?.includes('card_token')) {
      userMessage = 'Erro com os dados do cartão. Verifique e tente novamente.';
    } else if (error.message?.includes('document')) {
      userMessage = 'CPF inválido. Por favor, verifique.';
    }

    return res.json({ success: false, message: userMessage });
  }
};

// =============================================================================
// 🏦 CRIAR PEDIDO COM BOLETO — PAGAR.ME V5
// =============================================================================
export const createBoletoOrder = async (req, res) => {
  console.log('');
  console.log('🏦 ═══════════════════════════════════════════════════');
  console.log('🏦 NOVO PEDIDO PAGAR.ME — BOLETO BANCÁRIO');
  console.log('🏦 ═══════════════════════════════════════════════════');

  try {
    const {
      // Dados do pedido
      items,
      address,
      amount,
      originalAmount,
      discountAmount,
      discountPercentage,
      promoCode,
      // Dados do cliente (para Pagar.me)
      customerName,
      customerEmail,
      customerPhone,
      customerDocument, // CPF
      // Dados de entrega
      shippingCost,
      shippingMethod,
      shippingCarrier,
      shippingDeliveryDays,
      shippingServiceId,
      // Guest ou User
      isGuestOrder,
      guestEmail,
      guestName,
      guestPhone,
      userId,
    } = req.body;

    console.log('🏦 amount:', amount);
    console.log('🏦 isGuestOrder:', isGuestOrder);
    console.log('🏦 customerDocument (CPF):', customerDocument ? '✅' : '❌');

    // ─── Validações ───────────────────────────────────────────
    if (!items || items.length === 0) {
      return res.json({ success: false, message: 'Carrinho vazio' });
    }
    if (!address) {
      return res.json({
        success: false,
        message: 'Endereço de entrega obrigatório',
      });
    }
    if (!customerDocument) {
      return res.json({
        success: false,
        message: 'CPF é obrigatório para pagamento com boleto',
      });
    }
    if (!customerName || !customerEmail) {
      return res.json({
        success: false,
        message: 'Nome e email são obrigatórios',
      });
    }

    // Validar stock
    const stockValidation = await validateOrderStock(items);
    if (!stockValidation.valid) {
      return res.json({
        success: false,
        message: 'Estoque insuficiente: ' + stockValidation.errors.join(', '),
      });
    }

    // ─── Buscar dados dos produtos ────────────────────────────
    let productData = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.json({
          success: false,
          message: `Produto não encontrado: ${item.product}`,
        });
      }
      productData.push({
        id: product._id.toString(),
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
    }

    // ─── Criar pedido no MongoDB ──────────────────────────────
    const orderData = {
      items,
      amount,
      address,
      paymentType: 'pagarme_boleto',
      isPaid: false,
      status: 'Aguardando Pagamento',
      promoCode: promoCode || '',
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || 0,
      originalAmount: originalAmount || amount,
      shippingCost: shippingCost || 0,
      shippingMethod: shippingMethod || '',
      shippingCarrier: shippingCarrier || '',
      shippingDeliveryDays: shippingDeliveryDays || 0,
      shippingServiceId: shippingServiceId || '',
    };

    if (isGuestOrder) {
      orderData.isGuestOrder = true;
      orderData.guestEmail = guestEmail || customerEmail;
      orderData.guestName = guestName || customerName;
      orderData.guestPhone = guestPhone || customerPhone || '';
      orderData.userId = null;
    } else {
      orderData.userId = userId;
      orderData.isGuestOrder = false;
    }

    const order = await Order.create(orderData);
    console.log('✅ Pedido MongoDB criado:', order._id);

    // ─── Buscar endereço ──────────────────────────────────────
    const addressDoc = await Address.findById(address);
    if (!addressDoc) {
      return res.json({ success: false, message: 'Endereço não encontrado' });
    }

    // ─── Montar items para Pagar.me ───────────────────────────
    const pagarmeItems = buildPagarmeItems(
      productData,
      discountPercentage,
      shippingCost,
      shippingCarrier,
      shippingMethod,
    );

    // Total em centavos
    const totalCentavos = Math.round(amount * 100);

    const mobilePhone = parsePhone(customerPhone || addressDoc.phone);

    // ─── Formatar CPF ─────────────────────────────────────────
    const cleanCPF = customerDocument.replace(/\D/g, '');

    // ─── Montar billing address ───────────────────────────────
    const billingLine1 =
      `${addressDoc.number || ''}, ${addressDoc.street}, ${addressDoc.neighborhood || ''}`.trim();

    // ─── Calcular data de vencimento (3 dias úteis) ───────────
    const dueDate = new Date();
    let daysAdded = 0;
    while (daysAdded < 3) {
      dueDate.setDate(dueDate.getDate() + 1);
      const dayOfWeek = dueDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    const dueDateISO = dueDate.toISOString().split('T')[0] + 'T23:59:59Z';

    // ─── Criar pedido na API Pagar.me V5 ──────────────────────
    const pagarmePayload = {
      items: pagarmeItems,
      customer: {
        name: customerName,
        email: customerEmail,
        document: cleanCPF,
        document_type: 'CPF',
        type: 'individual',
        phones: mobilePhone ? { mobile_phone: mobilePhone } : undefined,
      },
      payments: [
        {
          payment_method: 'boleto',
          amount: totalCentavos,
          boleto: {
            instructions:
              'Pagar em qualquer banco ou casa lotérica até o vencimento.',
            due_at: dueDateISO,
            document_number: order._id.toString().slice(-8),
            type: 'DM',
            bank: '001',
          },
        },
      ],
      metadata: {
        order_id: order._id.toString(),
        is_guest: isGuestOrder ? 'true' : 'false',
        payment_method: 'boleto',
      },
    };

    console.log('🏦 Enviando boleto para Pagar.me V5...');
    console.log('🏦 Total (centavos):', totalCentavos);
    console.log('🏦 Vencimento:', dueDateISO);

    const pagarmeOrder = await pagarmeRequest(
      '/orders',
      'POST',
      pagarmePayload,
    );

    console.log('🏦 Resposta Pagar.me:', pagarmeOrder.status);
    console.log('🏦 Pagar.me Order ID:', pagarmeOrder.id);

    // ─── Extrair dados do boleto ──────────────────────────────
    const charge = pagarmeOrder.charges?.[0];
    const lastTransaction = charge?.last_transaction;

    const boletoUrl = lastTransaction?.url || lastTransaction?.pdf || '';
    const boletoBarcode =
      lastTransaction?.barcode || lastTransaction?.line || '';
    const boletoExpiresAt = lastTransaction?.due_at || dueDateISO;

    console.log('🏦 Boleto URL:', boletoUrl ? '✅' : '❌');
    console.log('🏦 Boleto Barcode:', boletoBarcode ? '✅' : '❌');

    if (!boletoUrl && !boletoBarcode) {
      console.error('❌ Pagar.me não retornou dados do boleto');
      console.error('❌ Charge:', JSON.stringify(charge, null, 2));
      await Order.findByIdAndDelete(order._id);
      return res.json({
        success: false,
        message: 'Erro ao gerar boleto. Tente novamente.',
      });
    }

    // ─── Atualizar pedido com dados do boleto ─────────────────
    await Order.findByIdAndUpdate(order._id, {
      pagarmeOrderId: pagarmeOrder.id,
      pagarmeChargeId: charge?.id,
      pagarmeBoletoUrl: boletoUrl,
      pagarmeBoletoBarcode: boletoBarcode,
      pagarmeBoletoExpiresAt: boletoExpiresAt,
    });

    console.log('✅ Boleto gerado com sucesso!');

    // Limpar carrinho (se não for guest) — boleto foi gerado, comprometimento do cliente
    if (userId && !isGuestOrder) {
      await User.findByIdAndUpdate(userId, { cartItems: {} });
    }

    // ✅ ENVIAR NOTIFICAÇÕES (cliente recebe boleto por email + admin é notificado)
    try {
      await sendBoletoGeneratedEmails(
        order,
        customerName,
        customerEmail,
        customerPhone || '',
        productData,
        addressDoc,
        {
          url: boletoUrl,
          barcode: boletoBarcode,
          expiresAt: boletoExpiresAt,
        },
      );
    } catch (err) {
      console.error('❌ Erro ao enviar emails do boleto:', err.message);
      // Não bloqueia a resposta — boleto já foi gerado com sucesso
    }

    return res.json({
      success: true,
      message: 'Boleto gerado com sucesso!',
      orderId: order._id,
      pagarmeOrderId: pagarmeOrder.id,
      status: 'pending',
      boleto: {
        url: boletoUrl,
        barcode: boletoBarcode,
        expiresAt: boletoExpiresAt,
      },
    });
  } catch (error) {
    console.error('❌ Erro Pagar.me Boleto:', error);

    let userMessage = 'Erro ao gerar boleto. Tente novamente.';

    if (error.message?.includes('document')) {
      userMessage = 'CPF inválido. Por favor, verifique.';
    }

    return res.json({ success: false, message: userMessage });
  }
};

// =============================================================================
// FORMATAR VALOR EM BRL
// =============================================================================
const formatBRL = value => {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// =============================================================================
// 🏦 ENVIAR EMAILS QUANDO BOLETO É GERADO (CLIENTE + ADMIN)
// Diferente do sendAllOrderEmails: aqui o pagamento ainda NÃO foi confirmado
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
  console.log('');
  console.log('🏦 ═══════════════════════════════════════════════════');
  console.log('🏦 ENVIANDO EMAILS DE BOLETO GERADO');
  console.log('🏦 ═══════════════════════════════════════════════════');

  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Variáveis de email não configuradas!');
      return { success: false, error: 'Configuração de email incompleta' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const orderNumber = order._id.toString().slice(-8).toUpperCase();
    const orderDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Formatar data de vencimento
    let expiresFormatted = '';
    try {
      expiresFormatted = new Date(boleto.expiresAt).toLocaleDateString(
        'pt-BR',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        },
      );
    } catch {
      expiresFormatted = boleto.expiresAt || 'N/A';
    }

    // ─── Items HTML para ambos os templates ───────────────────
    const itemsHTML = productData
      .map(item => {
        let itemPrice = item.price;
        if (order.discountPercentage > 0) {
          itemPrice = item.price * (1 - order.discountPercentage / 100);
        }
        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(itemPrice * item.quantity)}</td>
        </tr>
      `;
      })
      .join('');

    // ═════════════════════════════════════════════════════════════
    // 📧 TEMPLATE 1: EMAIL PARA O CLIENTE (boleto com link)
    // ═════════════════════════════════════════════════════════════
    const clientHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏄 Elite Surfing Brasil</h1>
            <p style="color: #a0a0a0; margin: 10px 0 0 0;">Seu boleto foi gerado!</p>
          </div>
          
          <div style="padding: 30px;">
            
            <!-- Alerta -->
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
              <h2 style="margin: 0 0 10px 0; color: #856404;">⏳ Aguardando Pagamento</h2>
              <p style="margin: 0; color: #856404;">O seu pedido será confirmado assim que o pagamento for identificado.</p>
            </div>
            
            <!-- Order Info -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Nº Pedido:</strong> #${orderNumber}</p>
              <p style="margin: 5px 0;"><strong>Data:</strong> ${orderDate}</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> <span style="font-size: 20px; font-weight: bold; color: #1a1a2e;">${formatBRL(order.amount)}</span></p>
            </div>
            
            <!-- Boleto Info -->
            <div style="background: #e8f4f8; border: 2px solid #17a2b8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #0c5460;">🏦 Dados do Boleto</h3>
              
              <p style="margin: 5px 0;"><strong>Vencimento:</strong> ${expiresFormatted}</p>
              
              ${
                boleto.barcode
                  ? `
              <div style="background: white; padding: 12px; border-radius: 4px; margin: 15px 0; word-break: break-all;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">Código de barras (copie e cole no app do banco):</p>
                <p style="margin: 0; font-family: monospace; font-size: 14px; color: #333;">${boleto.barcode}</p>
              </div>
              `
                  : ''
              }
              
              ${
                boleto.url
                  ? `
              <div style="text-align: center; margin-top: 15px;">
                <a href="${boleto.url}" target="_blank" 
                   style="display: inline-block; background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  📄 Abrir Boleto
                </a>
              </div>
              `
                  : ''
              }
              
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #666; text-align: center;">
                Pague em qualquer banco, casa lotérica ou pelo app do seu banco.
              </p>
            </div>
            
            <!-- Products Table -->
            <h3 style="color: #333;">📦 Produtos</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            ${
              order.promoCode
                ? `
            <p style="color: #28a745; font-size: 14px;">
              🎉 Cupom aplicado: <strong>${order.promoCode}</strong> (-${order.discountPercentage}%)
            </p>
            `
                : ''
            }
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
              <p>Dúvidas? Fale conosco:</p>
              <p>📧 atendimento@elitesurfing.com.br | 📱 +55 (21) 96435-8058</p>
              <p style="margin-top: 20px;">
                <a href="https://www.elitesurfing.com.br" style="color: #1a1a2e;">www.elitesurfing.com.br</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // ═════════════════════════════════════════════════════════════
    // 📧 TEMPLATE 2: EMAIL PARA O ADMIN (boleto pendente)
    // ═════════════════════════════════════════════════════════════
    const adminHTML = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 25px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏦 NOVO BOLETO GERADO!</h1>
            <p style="color: #fff3e0; margin: 10px 0 0 0;">${order.isGuestOrder ? '👤 GUEST CHECKOUT' : '👤 Cliente Cadastrado'}</p>
          </div>
          
          <div style="padding: 25px;">
            
            <!-- Status Badge -->
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 18px; font-weight: bold; color: #856404;">⏳ AGUARDANDO PAGAMENTO</span>
              <p style="margin: 5px 0 0 0; color: #856404;">Vencimento: ${expiresFormatted}</p>
            </div>
            
            <!-- Order Info -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>📋 Pedido:</strong> #${orderNumber}</p>
              <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${orderDate}</p>
              <p style="margin: 5px 0;"><strong>💳 Método:</strong> Boleto Bancário</p>
            </div>
            
            <!-- Customer Info -->
            <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #155724;">👤 Cliente</h3>
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${customerName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail}</p>
              ${customerPhone ? `<p style="margin: 5px 0;"><strong>Telefone:</strong> ${customerPhone}</p>` : ''}
            </div>
            
            <!-- Address -->
            <div style="background: #cce5ff; border: 1px solid #007bff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #004085;">📍 Endereço de Entrega</h3>
              <p style="margin: 5px 0;">${addressDoc.firstName || ''} ${addressDoc.lastName || ''}</p>
              <p style="margin: 5px 0;">${addressDoc.street || ''}</p>
              ${addressDoc.complement ? `<p style="margin: 5px 0;">${addressDoc.complement}</p>` : ''}
              ${addressDoc.neighborhood ? `<p style="margin: 5px 0;">Bairro: ${addressDoc.neighborhood}</p>` : ''}
              <p style="margin: 5px 0;">CEP: ${addressDoc.zipcode || ''} - ${addressDoc.city || ''}/${addressDoc.state || ''}</p>
            </div>
            
            <!-- Products -->
            <h3 style="color: #333;">📦 Produtos</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left;">Produto</th>
                  <th style="padding: 10px; text-align: center;">Qtd</th>
                  <th style="padding: 10px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            <!-- Total -->
            <div style="background: #ff9800; color: white; padding: 15px; border-radius: 8px; text-align: center;">
              <span style="font-size: 24px; font-weight: bold;">💰 TOTAL: ${formatBRL(order.amount)}</span>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-top: 25px;">
              <a href="https://www.elitesurfing.com.br/seller/orders" 
                 style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                📋 Ver Pedido no Painel
              </a>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;

    // ─── Enviar emails em paralelo ────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

    console.log('🏦 Enviando email do boleto para cliente:', customerEmail);
    console.log('🏦 Enviando notificação de boleto para admin:', adminEmail);

    const promises = [
      // Email para cliente com dados do boleto
      transporter
        .sendMail({
          from: {
            name: 'Elite Surfing Brasil',
            address: process.env.GMAIL_USER,
          },
          to: customerEmail,
          subject: `🏦 Boleto Gerado — Pedido #${orderNumber} - Elite Surfing Brasil`,
          html: clientHTML,
        })
        .then(r => ({ success: true, messageId: r.messageId }))
        .catch(e => ({ success: false, error: e.message })),

      // Email para admin sobre boleto pendente
      transporter
        .sendMail({
          from: {
            name: 'Elite Surfing Brasil',
            address: process.env.GMAIL_USER,
          },
          to: adminEmail,
          subject: `🏦 BOLETO GERADO #${orderNumber} - ${formatBRL(order.amount)} - AGUARDANDO PAGAMENTO`,
          html: adminHTML,
        })
        .then(r => ({ success: true, messageId: r.messageId }))
        .catch(e => ({ success: false, error: e.message })),
    ];

    // WhatsApp admin (se disponível)
    if (notifyAdminNewOrder) {
      const products = productData.map(p => ({
        _id: p.id,
        name: p.name,
        offerPrice: p.price,
      }));
      const userForAdmin = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || '',
      };
      promises.push(
        notifyAdminNewOrder(order, userForAdmin, products, addressDoc)
          .then(r => ({ success: true, details: r }))
          .catch(e => ({ success: false, error: e.message })),
      );
    }

    const results = await Promise.all(promises);
    const [clientResult, adminResult, whatsappResult] = results;

    console.log('🏦 RESULTADO EMAILS BOLETO:');
    console.log(
      '   Cliente:',
      clientResult.success
        ? `✅ ENVIADO (${clientResult.messageId})`
        : `❌ FALHOU (${clientResult.error})`,
    );
    console.log(
      '   Admin:',
      adminResult.success
        ? `✅ ENVIADO (${adminResult.messageId})`
        : `❌ FALHOU (${adminResult.error})`,
    );
    if (whatsappResult) {
      console.log(
        '   WhatsApp:',
        whatsappResult.success
          ? '✅ ENVIADO'
          : `❌ FALHOU (${whatsappResult.error})`,
      );
    }

    return {
      success: clientResult.success || adminResult.success,
      clientEmail: clientResult,
      adminEmail: adminResult,
      whatsapp: whatsappResult || null,
    };
  } catch (error) {
    console.error('❌ ERRO em sendBoletoGeneratedEmails:', error.message);
    return { success: false, error: error.message };
  }
};

// =============================================================================
// 📧 ENVIAR NOTIFICAÇÕES (emails + WhatsApp)
// =============================================================================
const sendNotifications = async (order, isGuestOrder, email, userId) => {
  console.log('');
  console.log('📧 ═══════════════════════════════════════════════════');
  console.log('📧 PAGAR.ME — ENVIANDO NOTIFICAÇÕES');
  console.log('📧 ═══════════════════════════════════════════════════');
  console.log('📧 isGuestOrder:', isGuestOrder);
  console.log('📧 email:', email);
  console.log('📧 userId:', userId);

  try {
    const { sendAllOrderEmails } = await import('./orderController.js');

    if (typeof sendAllOrderEmails === 'function') {
      const recipient = isGuestOrder ? email : userId;
      console.log('📧 Recipient para sendAllOrderEmails:', recipient);

      if (recipient) {
        const result = await sendAllOrderEmails(order, recipient);
        console.log(
          '📧 Resultado sendAllOrderEmails:',
          JSON.stringify(result, null, 2),
        );
        return result;
      } else {
        console.error('❌ Nenhum recipient encontrado para emails');
      }
    } else {
      console.error('❌ sendAllOrderEmails não é uma função!');
      console.error('❌ Tipo recebido:', typeof sendAllOrderEmails);
    }
  } catch (error) {
    console.error(
      '❌ Erro ao importar/executar sendAllOrderEmails:',
      error.message,
    );

    // Fallback: tentar notificação admin diretamente
    console.log('📧 Tentando fallback de notificação admin...');
    if (notifyAdminNewOrder) {
      try {
        const products = await Product.find({
          _id: { $in: order.items.map(i => i.product._id || i.product) },
        });
        const address = await Address.findById(order.address);

        let userObj;
        if (isGuestOrder) {
          userObj = {
            name: order.guestName || 'Cliente',
            email: email || order.guestEmail,
            phone: order.guestPhone || '',
          };
        } else if (userId) {
          const userDoc = await User.findById(userId);
          userObj = userDoc || {
            name: 'Cliente',
            email: email,
            phone: '',
          };
        } else {
          userObj = {
            name: 'Cliente',
            email: email,
            phone: '',
          };
        }

        const adminResult = await notifyAdminNewOrder(
          order,
          userObj,
          products,
          address,
        );
        console.log(
          '📧 Fallback admin result:',
          JSON.stringify(adminResult, null, 2),
        );
      } catch (e) {
        console.error(
          '❌ Fallback notificação admin também falhou:',
          e.message,
        );
      }
    }
  }
};

// =============================================================================
// 🔔 WEBHOOK PAGAR.ME — ATUALIZAÇÃO DE STATUS (CARTÃO + BOLETO)
// =============================================================================
export const pagarmeWebhook = async (req, res) => {
  console.log('');
  console.log('🔔 ═══════════════════════════════════════════════════');
  console.log('🔔 WEBHOOK PAGAR.ME RECEBIDO');
  console.log('🔔 ═══════════════════════════════════════════════════');

  try {
    const event = req.body;
    const eventType = event.type;

    console.log('🔔 Tipo:', eventType);
    console.log('🔔 Data:', JSON.stringify(event.data?.id || 'N/A'));

    // Verificar assinatura do webhook (Pagar.me envia account_id)
    if (
      event.account?.id &&
      event.account.id !== process.env.PAGARME_ACCOUNT_ID
    ) {
      console.log('⚠️ Account ID não corresponde, ignorando');
      return res.status(200).json({ received: true });
    }

    switch (eventType) {
      case 'charge.paid': {
        const charge = event.data;
        const pagarmeOrderId = charge.order?.id;

        console.log('✅ Charge paga:', charge.id);

        if (pagarmeOrderId) {
          const order = await Order.findOne({ pagarmeOrderId });

          if (order && !order.isPaid) {
            console.log('✅ Atualizando pedido como pago:', order._id);
            console.log('✅ Tipo de pagamento:', order.paymentType);

            const updatedOrder = await Order.findByIdAndUpdate(
              order._id,
              { isPaid: true, paidAt: new Date(), status: 'Pedido Confirmado' },
              { new: true },
            ).populate('items.product');

            // Decrementar estoque
            await decrementProductStock(updatedOrder.items);

            // Limpar carrinho
            if (updatedOrder.userId && !updatedOrder.isGuestOrder) {
              await User.findByIdAndUpdate(updatedOrder.userId, {
                cartItems: {},
              });
            }

            // ✅ AWAIT notificações no webhook
            try {
              await sendNotifications(
                updatedOrder,
                updatedOrder.isGuestOrder,
                updatedOrder.guestEmail,
                updatedOrder.userId,
              );
            } catch (err) {
              console.error('❌ Erro notificações webhook:', err.message);
            }
          } else if (order?.isPaid) {
            console.log('⚠️ Pedido já marcado como pago, ignorando');
          }
        }
        break;
      }

      case 'charge.payment_failed': {
        const charge = event.data;
        const pagarmeOrderId = charge.order?.id;

        console.log('❌ Charge falhou:', charge.id);

        if (pagarmeOrderId) {
          const order = await Order.findOne({ pagarmeOrderId });
          if (order && !order.isPaid) {
            await Order.findByIdAndDelete(order._id);
            console.log('🗑️ Pedido deletado:', order._id);
          }
        }
        break;
      }

      case 'charge.refunded':
      case 'charge.chargedback': {
        const charge = event.data;
        const pagarmeOrderId = charge.order?.id;

        console.log(`⚠️ ${eventType}:`, charge.id);

        if (pagarmeOrderId) {
          const order = await Order.findOne({ pagarmeOrderId });
          if (order) {
            await Order.findByIdAndUpdate(order._id, {
              status: 'Cancelado',
            });
            console.log('⚠️ Pedido marcado como cancelado:', order._id);
          }
        }
        break;
      }

      default:
        console.log('ℹ️ Evento não tratado:', eventType);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erro no webhook Pagar.me:', error);
    res.status(200).json({ received: true });
  }
};

// =============================================================================
// 🔍 VERIFICAR STATUS DO PEDIDO NO PAGAR.ME
// =============================================================================
export const checkPagarmeOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order || !order.pagarmeOrderId) {
      return res.json({ success: false, message: 'Pedido não encontrado' });
    }

    const pagarmeOrder = await pagarmeRequest(
      `/orders/${order.pagarmeOrderId}`,
    );

    return res.json({
      success: true,
      isPaid: order.isPaid,
      pagarmeStatus: pagarmeOrder.status,
      charges: pagarmeOrder.charges?.map(c => ({
        id: c.id,
        status: c.status,
        amount: c.amount,
      })),
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status Pagar.me:', error);
    return res.json({ success: false, message: error.message });
  }
};
