// server/controllers/pagarmeController.js
// ═══════════════════════════════════════════════════════════════════════
// 💳 PAGAR.ME V5 — CARTÃO DE CRÉDITO COM PARCELAMENTO ATÉ 12x
// ═══════════════════════════════════════════════════════════════════════
// Moeda: BRL (R$)
// Método: Cartão de crédito (transparent checkout)
// Parcelamento: Até 12x sem juros
// Tokenização: Frontend tokeniza → Backend cria pedido com card_token
// Webhook: Pagar.me notifica mudanças de status
// ═══════════════════════════════════════════════════════════════════════
// ✅ FIX 11/03/2026: sendAllOrderEmails agora é importada corretamente
//    do orderController.js (antes era const privada, agora é export)
// ✅ FIX 11/03/2026: Removido código morto de imports no topo
// ✅ FIX 11/03/2026: Fallback de notificação melhorado
// ═══════════════════════════════════════════════════════════════════════

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Address from '../models/Address.js';

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

    // ─── Montar items para Pagar.me (valores em CENTAVOS) ─────
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

    // Total em centavos
    const totalCentavos = Math.round(amount * 100);

    // ─── Formatar telefone para Pagar.me ──────────────────────
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

      // ✅ FIX: AWAIT notificações ANTES de responder
      // No Vercel serverless, a função morre após res.json()
      // Se não fizer await, os emails nunca são enviados
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
// 📧 ENVIAR NOTIFICAÇÕES (emails + WhatsApp)
// ✅ FIX: Agora importa sendAllOrderEmails corretamente (é export)
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
    // ✅ FIX: sendAllOrderEmails agora é EXPORTADA do orderController
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

        // Montar objeto user para adminNotificationService
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
// 🔔 WEBHOOK PAGAR.ME — ATUALIZAÇÃO DE STATUS
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

            const updatedOrder = await Order.findByIdAndUpdate(
              order._id,
              { isPaid: true, paidAt: new Date() },
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

            // ✅ FIX: AWAIT notificações no webhook também
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
    res.status(200).json({ received: true }); // Sempre retornar 200 para não re-enviar
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
