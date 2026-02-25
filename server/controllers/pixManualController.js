// ═══════════════════════════════════════════════════════════════
// server/controllers/pixManualController.js
// CONTROLLER PIX MANUAL — ELITE SURFING BRASIL
// Cria pedido com isPaid: false, notifica admin via email
// Admin confirma manualmente no painel do vendedor
// ═══════════════════════════════════════════════════════════════

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendEmail } from '../config/email.js'; // ajuste path se necessário

// ═══════════════════════════════════════════════════════════════
// POST /api/pix/create — Criar pedido PIX manual (user logado)
// ═══════════════════════════════════════════════════════════════
export const createPixOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      shippingCost = 0,
      shippingMethod = '',
      shippingCarrier = '',
      shippingDeliveryDays = 0,
      shippingServiceId = '',
      promoCode = null,
      discountAmount = 0,
      discountPercentage = 0,
    } = req.body;

    const userId = req.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Carrinho vazio' });
    }

    // ─── Validar estoque e calcular subtotal ───
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Produto não encontrado: ${item.product}`,
        });
      }

      const itemPrice = product.offerPrice || product.price;
      subtotal += itemPrice * item.quantity;

      orderItems.push({
        product: product._id.toString(),
        quantity: item.quantity,
      });
    }

    // ─── Calcular valores ───
    // originalAmount = subtotal antes de qualquer desconto
    const originalAmount = subtotal;

    // Desconto de cupom (se houver)
    const couponDiscount = discountAmount || 0;
    const afterCoupon = subtotal - couponDiscount;

    // Desconto PIX (10% sobre valor após cupom)
    const pixDiscount = afterCoupon * 0.10;
    const afterPix = afterCoupon - pixDiscount;

    // Total final = valor com descontos + frete
    const totalAmount = afterPix + Number(shippingCost);

    // ─── Criar pedido (NÃO PAGO) ───
    const order = await Order.create({
      userId,
      items: orderItems,
      address,
      amount: totalAmount,
      originalAmount,
      paymentType: 'pix_manual',
      isPaid: false,
      status: 'Aguardando Pagamento PIX',
      promoCode,
      discountAmount: couponDiscount,
      discountPercentage,
      pixDiscount,
      shippingCost: Number(shippingCost),
      shippingMethod,
      shippingCarrier,
      shippingDeliveryDays,
      shippingServiceId,
    });

    // ─── Notificar admin por email ───
    try {
      const user = await User.findById(userId);
      const adminEmail = process.env.ADMIN_EMAIL || 'elitesurfingrj@yahoo.com.br';
      const shortId = order._id.toString().slice(-6).toUpperCase();

      await sendEmail({
        to: adminEmail,
        subject: `🔔 Novo Pedido PIX #${shortId} - R$ ${totalAmount.toFixed(2)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <h2 style="color: #16a34a;">💰 Novo Pedido PIX Aguardando Confirmação</h2>
            <hr/>
            <p><b>Pedido:</b> #${shortId}</p>
            <p><b>Cliente:</b> ${user?.name || 'N/A'} (${user?.email || 'N/A'})</p>
            <p><b>Subtotal:</b> R$ ${originalAmount.toFixed(2)}</p>
            ${couponDiscount > 0 ? `<p><b>Cupom (${promoCode}):</b> -R$ ${couponDiscount.toFixed(2)}</p>` : ''}
            <p><b>Desconto PIX (10%):</b> -R$ ${pixDiscount.toFixed(2)}</p>
            <p><b>Frete:</b> R$ ${Number(shippingCost).toFixed(2)} ${shippingCarrier ? `(${shippingCarrier})` : ''}</p>
            <p style="font-size: 18px;"><b>TOTAL: R$ ${totalAmount.toFixed(2)}</b></p>
            <hr/>
            <p style="color: #b45309;">⚠️ Verifique o pagamento no extrato e confirme no painel do vendedor.</p>
            <p><b>Chave PIX:</b> (21) 96435-8058 — André Oliveira Granha</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Erro ao enviar email admin (PIX):', emailErr.message);
    }

    // ─── Resposta para o frontend ───
    return res.status(201).json({
      success: true,
      message: 'Pedido criado. Aguardando pagamento PIX.',
      order: {
        orderId: order._id,
        amount: totalAmount,
        originalAmount,
        pixDiscount,
        shippingCost: Number(shippingCost),
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Erro ao criar pedido PIX:', error);
    return res.status(500).json({ success: false, message: 'Erro interno ao criar pedido PIX' });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/pix/guest/create — Criar pedido PIX (guest checkout)
// ═══════════════════════════════════════════════════════════════
export const createPixOrderGuest = async (req, res) => {
  try {
    const {
      items,
      address,
      guestName,
      guestEmail,
      guestPhone = '',
      shippingCost = 0,
      shippingMethod = '',
      shippingCarrier = '',
      shippingDeliveryDays = 0,
      shippingServiceId = '',
      promoCode = null,
      discountAmount = 0,
      discountPercentage = 0,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Carrinho vazio' });
    }

    if (!guestName || !guestEmail) {
      return res.status(400).json({ success: false, message: 'Nome e email são obrigatórios' });
    }

    // ─── Validar estoque e calcular subtotal ───
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produto não encontrado' });
      }

      const itemPrice = product.offerPrice || product.price;
      subtotal += itemPrice * item.quantity;

      orderItems.push({
        product: product._id.toString(),
        quantity: item.quantity,
      });
    }

    // ─── Calcular valores ───
    const originalAmount = subtotal;
    const couponDiscount = discountAmount || 0;
    const afterCoupon = subtotal - couponDiscount;
    const pixDiscount = afterCoupon * 0.10;
    const afterPix = afterCoupon - pixDiscount;
    const totalAmount = afterPix + Number(shippingCost);

    // ─── Criar pedido GUEST (NÃO PAGO) ───
    const order = await Order.create({
      userId: null,
      isGuestOrder: true,
      guestName,
      guestEmail,
      guestPhone,
      items: orderItems,
      address,
      amount: totalAmount,
      originalAmount,
      paymentType: 'pix_manual',
      isPaid: false,
      status: 'Aguardando Pagamento PIX',
      promoCode,
      discountAmount: couponDiscount,
      discountPercentage,
      pixDiscount,
      shippingCost: Number(shippingCost),
      shippingMethod,
      shippingCarrier,
      shippingDeliveryDays,
      shippingServiceId,
    });

    // ─── Notificar admin ───
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'elitesurfingrj@yahoo.com.br';
      const shortId = order._id.toString().slice(-6).toUpperCase();

      await sendEmail({
        to: adminEmail,
        subject: `🔔 Pedido PIX (Visitante) #${shortId} - R$ ${totalAmount.toFixed(2)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <h2 style="color: #16a34a;">💰 Novo Pedido PIX (Visitante)</h2>
            <hr/>
            <p><b>Pedido:</b> #${shortId}</p>
            <p><b>Cliente:</b> ${guestName} (${guestEmail})</p>
            <p><b>Telefone:</b> ${guestPhone || 'N/A'}</p>
            <p style="font-size: 18px;"><b>TOTAL: R$ ${totalAmount.toFixed(2)}</b></p>
            <hr/>
            <p style="color: #b45309;">⚠️ Confirme no painel do vendedor após verificar o pagamento.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Erro email admin (PIX guest):', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido criado. Aguardando pagamento PIX.',
      order: {
        orderId: order._id,
        amount: totalAmount,
        originalAmount,
        pixDiscount,
        shippingCost: Number(shippingCost),
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('Erro ao criar pedido PIX guest:', error);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
};

// ═══════════════════════════════════════════════════════════════
// PUT /api/pix/confirm/:orderId — Admin confirma pagamento PIX
// (Usar no painel do vendedor)
// ═══════════════════════════════════════════════════════════════
export const confirmPixPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }

    if (order.isPaid) {
      return res.status(400).json({ success: false, message: 'Pedido já está pago' });
    }

    // ─── Marcar como pago ───
    order.isPaid = true;
    order.status = 'Order Placed';
    order.paidAt = new Date();
    await order.save();

    // ─── Decrementar estoque ───
    for (const item of order.items) {
      try {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      } catch (stockErr) {
        console.error(`Erro estoque produto ${item.product}:`, stockErr.message);
      }
    }

    // ─── Notificar cliente por email ───
    try {
      let customerEmail = null;

      if (order.userId) {
        const user = await User.findById(order.userId);
        customerEmail = user?.email;
      } else if (order.guestEmail) {
        customerEmail = order.guestEmail;
      }

      if (customerEmail) {
        const shortId = order._id.toString().slice(-6).toUpperCase();
        await sendEmail({
          to: customerEmail,
          subject: `✅ Pagamento Confirmado - Pedido #${shortId} - Elite Surfing`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px;">
              <h2 style="color: #16a34a;">✅ Pagamento PIX Confirmado!</h2>
              <p>Seu pedido <b>#${shortId}</b> foi confirmado com sucesso.</p>
              <p><b>Valor:</b> R$ ${order.amount.toFixed(2)}</p>
              <p>Estamos preparando seu pedido para envio. Você receberá o código de rastreio em breve.</p>
              <hr/>
              <p style="color: #6b7280; font-size: 12px;">Elite Surfing Brasil — elitesurfing.com.br</p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.error('Erro email confirmação PIX:', emailErr.message);
    }

    return res.json({
      success: true,
      message: 'Pagamento PIX confirmado com sucesso!',
      order: { orderId: order._id, isPaid: true, status: order.status },
    });
  } catch (error) {
    console.error('Erro ao confirmar PIX:', error);
    return res.status(500).json({ success: false, message: 'Erro ao confirmar pagamento' });
  }
};