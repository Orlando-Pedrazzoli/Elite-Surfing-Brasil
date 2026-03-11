// ═══════════════════════════════════════════════════════════════
// server/controllers/pixManualController.js
// CONTROLLER PIX MANUAL — ELITE SURFING BRASIL
// Cria pedido com isPaid: false, notifica admin via email
// Admin confirma manualmente no painel do vendedor
// ═══════════════════════════════════════════════════════════════
// ✅ FIX: Emails agora incluem detalhes completos dos produtos
// ✅ FIX: Confirmação PIX envia email completo ao cliente com produtos
// ✅ FIX: Notificação admin usa template rico (igual ao Stripe)
// ✅ FIX 11/03: confirmPixPayment usa 'Pedido Confirmado' (não 'Order Placed')
// ═══════════════════════════════════════════════════════════════

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════════════
// HELPER: FORMATAR BRL
// ═══════════════════════════════════════════════════════════════
const formatBRL = value => {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// ═══════════════════════════════════════════════════════════════
// HELPER: ENVIAR EMAIL
// ═══════════════════════════════════════════════════════════════
const sendPixEmail = async ({ to, subject, html }) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(
      '⚠️ PIX Email: GMAIL_USER ou GMAIL_APP_PASSWORD não configurado, pulando envio',
    );
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const result = await transporter.sendMail({
    from: { name: 'Elite Surfing Brasil', address: process.env.GMAIL_USER },
    to,
    subject,
    html,
  });

  console.log(`✅ PIX Email enviado para ${to} (${result.messageId})`);
  return result;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: GERAR TABELA HTML DE PRODUTOS (reutilizado em todos os emails)
// ═══════════════════════════════════════════════════════════════
const generateProductsTableHTML = (orderItems, products) => {
  const rows = orderItems
    .map(item => {
      const productId = item.product?._id || item.product;
      const product = products.find(
        p => p._id.toString() === productId.toString(),
      );
      if (!product) return '';

      const itemPrice = product.offerPrice || product.price || 0;
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${product.name}</strong>
          ${product.category ? `<br><small style="color: #666;">Categoria: ${product.category}</small>` : ''}
          ${product.color ? `<br><small style="color: #666;">Cor: ${product.color}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(itemPrice)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatBRL(itemPrice * item.quantity)}</td>
      </tr>
    `;
    })
    .filter(Boolean)
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Produto</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qtd</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Preço</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: GERAR EMAIL ADMIN COM PRODUTOS (PIX)
// ═══════════════════════════════════════════════════════════════
const generateAdminPixEmailHTML = ({
  shortId,
  customerName,
  customerEmail,
  customerPhone,
  orderItems,
  products,
  address,
  originalAmount,
  couponDiscount,
  promoCode,
  pixDiscount,
  shippingCost,
  shippingCarrier,
  totalAmount,
  isGuest,
}) => {
  const productsTable = generateProductsTableHTML(orderItems, products);

  const addressHTML = address
    ? `
    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #e65100;">📍 Endereço de Entrega</h3>
      <p style="margin: 0; line-height: 1.8;">
        ${address.firstName || ''} ${address.lastName || ''}<br>
        ${address.street || ''}${address.number ? `, ${address.number}` : ''}<br>
        ${address.complement ? `${address.complement}<br>` : ''}
        ${address.neighborhood ? `${address.neighborhood}<br>` : ''}
        CEP: ${address.zipcode || ''} - ${address.city || ''}/${address.state || ''}<br>
        ${address.country || 'Brasil'}
        ${address.cpf ? `<br>CPF: ${address.cpf}` : ''}
        ${address.phone ? `<br>📱 ${address.phone}` : ''}
      </p>
    </div>
  `
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💰 NOVO PEDIDO PIX!</h1>
        <p style="color: #fff; margin: 10px 0 0 0; font-size: 14px;">
          ${isGuest ? '👤 VISITANTE' : '👤 Cliente Cadastrado'} — Aguardando Confirmação
        </p>
      </div>
      <div style="background: white; padding: 25px; border: 1px solid #ddd; border-top: none;">
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>📋 Pedido:</strong> #${shortId}</p>
          <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <p style="margin: 5px 0;"><strong>💳 Pagamento:</strong> <span style="background: #f59e0b; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold;">⏳ PIX MANUAL — AGUARDANDO</span></p>
        </div>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #2e7d32;">👤 Cliente</h3>
          <p style="margin: 5px 0;"><strong>Nome:</strong> ${customerName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail || 'N/A'}</p>
          ${customerPhone ? `<p style="margin: 5px 0;"><strong>Telefone:</strong> ${customerPhone}</p>` : ''}
        </div>
        ${addressHTML}
        <h3 style="color: #333;">📦 Produtos</h3>
        ${productsTable}
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${formatBRL(originalAmount)}</p>
          ${couponDiscount > 0 ? `<p style="margin: 5px 0; color: #16a34a;"><strong>Cupom (${promoCode}):</strong> -${formatBRL(couponDiscount)}</p>` : ''}
          <p style="margin: 5px 0; color: #16a34a;"><strong>Desconto PIX (10%):</strong> -${formatBRL(pixDiscount)}</p>
          <p style="margin: 5px 0;"><strong>Frete:</strong> ${formatBRL(shippingCost)} ${shippingCarrier ? `(${shippingCarrier})` : ''}</p>
        </div>
        <div style="background: #1a237e; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; font-size: 28px;">💰 TOTAL: ${formatBRL(totalAmount)}</h2>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
          <p style="margin: 0; color: #b91c1c; font-weight: bold; font-size: 16px;">
            ⚠️ VERIFIQUE O PAGAMENTO NO EXTRATO E CONFIRME NO PAINEL
          </p>
          <p style="margin: 8px 0 0 0; color: #991b1b;">Chave PIX: (21) 96435-8058 — André Oliveira Granha</p>
        </div>
        <div style="text-align: center; margin-top: 25px;">
          <a href="https://www.elitesurfing.com.br/seller/orders"
             style="display: inline-block; background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            ✅ Confirmar no Painel do Vendedor
          </a>
        </div>
      </div>
      <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="margin: 0; color: #666; font-size: 12px;">
          Elite Surfing Brasil — Notificação Automática PIX<br>
          ${new Date().toISOString()}
        </p>
      </div>
    </div>
  `;
};

// ═══════════════════════════════════════════════════════════════
// HELPER: GERAR EMAIL DE CONFIRMAÇÃO PIX PARA CLIENTE (com produtos)
// ═══════════════════════════════════════════════════════════════
const generateClientPixConfirmationHTML = ({
  shortId,
  customerName,
  orderItems,
  products,
  address,
  order,
}) => {
  const productsTable = generateProductsTableHTML(orderItems, products);
  const orderDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🏄 Elite Surfing Brasil</h1>
          <p style="color: #bbf7d0; margin: 10px 0 0 0; font-size: 16px;">✅ Pagamento PIX Confirmado!</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-bottom: 20px;">Olá ${customerName}! 👋</h2>
          <p style="font-size: 16px; margin-bottom: 25px;">
            Ótima notícia! O pagamento PIX do seu pedido foi confirmado com sucesso.
            Estamos preparando tudo para o envio!
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #15803d;">📋 Detalhes do Pedido</h3>
            <p style="margin: 5px 0;"><strong>Nº Pedido:</strong> #${shortId}</p>
            <p style="margin: 5px 0;"><strong>Data:</strong> ${orderDate}</p>
            <p style="margin: 5px 0;"><strong>Pagamento:</strong> ✅ PIX Confirmado</p>
          </div>
          <h3 style="color: #333;">📦 Produtos</h3>
          ${productsTable}
          ${
            order.originalAmount && order.originalAmount !== order.amount
              ? `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${formatBRL(order.originalAmount)}</p>
            ${order.promoCode ? `<p style="margin: 5px 0; color: #16a34a;"><strong>Cupom (${order.promoCode}):</strong> -${formatBRL(order.discountAmount)}</p>` : ''}
            ${order.pixDiscount > 0 ? `<p style="margin: 5px 0; color: #16a34a;"><strong>Desconto PIX (10%):</strong> -${formatBRL(order.pixDiscount)}</p>` : ''}
            ${order.shippingCost > 0 ? `<p style="margin: 5px 0;"><strong>Frete:</strong> ${formatBRL(order.shippingCost)} ${order.shippingCarrier ? `(${order.shippingCarrier})` : ''}</p>` : ''}
          </div>
          `
              : ''
          }
          <div style="background: #1a1a2e; color: white; padding: 15px 20px; border-radius: 8px; text-align: right;">
            <span style="font-size: 18px;">Total Pago: </span>
            <span style="font-size: 24px; font-weight: bold;">${formatBRL(order.amount)}</span>
          </div>
          ${
            address
              ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #495057;">🏠 Endereço de Entrega</h3>
            <p style="margin: 0; line-height: 1.5;">
              ${address.firstName || ''} ${address.lastName || ''}<br>
              ${address.street || ''}${address.number ? `, ${address.number}` : ''}<br>
              ${address.complement ? `${address.complement}<br>` : ''}
              ${address.neighborhood ? `${address.neighborhood}<br>` : ''}
              ${address.city || ''} - ${address.state || ''}<br>
              CEP: ${address.zipcode || ''}<br>
              ${address.country || 'Brasil'}
            </p>
          </div>
          `
              : ''
          }
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin-top: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #1976d2;">📦 Próximos Passos</h3>
            <p style="margin: 5px 0;">• Vamos processar e preparar o seu pedido</p>
            <p style="margin: 5px 0;">• Você receberá um email com o código de rastreamento</p>
            <p style="margin: 5px 0;">• Prazo estimado: 3-10 dias úteis</p>
          </div>
          <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee; margin-top: 25px;">
            <p style="margin: 0 0 10px 0; color: #666;">Tem alguma dúvida?</p>
            <p style="margin: 0; color: #666;">
              📧 <a href="mailto:atendimento@elitesurfing.com.br" style="color: #667eea;">atendimento@elitesurfing.com.br</a>
            </p>
            <p style="margin: 5px 0; color: #666;">📱 WhatsApp: +55 (21) 96435-8058</p>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            Obrigado por escolher a Elite Surfing Brasil! 🏄‍♂️<br>
            <a href="https://www.elitesurfing.com.br" style="color: #667eea;">www.elitesurfing.com.br</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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
      return res
        .status(400)
        .json({ success: false, message: 'Carrinho vazio' });
    }

    let subtotal = 0;
    const orderItems = [];
    const productsList = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({
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
      productsList.push(product);
    }

    const originalAmount = subtotal;
    const couponDiscount = discountAmount || 0;
    const afterCoupon = subtotal - couponDiscount;
    const pixDiscount = afterCoupon * 0.1;
    const afterPix = afterCoupon - pixDiscount;
    const totalAmount = afterPix + Number(shippingCost);

    const order = await Order.create({
      userId,
      items: orderItems,
      address,
      amount: totalAmount,
      originalAmount,
      paymentType: 'pix_manual',
      isPaid: false,
      status: 'Aguardando Pagamento',
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

    try {
      const user = await User.findById(userId);
      const addressDoc = await Address.findById(address);
      const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
      const shortId = order._id.toString().slice(-6).toUpperCase();

      await sendPixEmail({
        to: adminEmail,
        subject: `🔔 Novo Pedido PIX #${shortId} - ${formatBRL(totalAmount)} - ${user?.name || 'Cliente'}`,
        html: generateAdminPixEmailHTML({
          shortId,
          customerName: user?.name || 'N/A',
          customerEmail: user?.email || 'N/A',
          customerPhone: user?.phone || addressDoc?.phone || '',
          orderItems,
          products: productsList,
          address: addressDoc,
          originalAmount,
          couponDiscount,
          promoCode,
          pixDiscount,
          shippingCost: Number(shippingCost),
          shippingCarrier,
          totalAmount,
          isGuest: false,
        }),
      });
    } catch (emailErr) {
      console.error('Erro ao enviar email admin (PIX):', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido criado. Aguardando Pagamento.',
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
    return res
      .status(500)
      .json({ success: false, message: 'Erro interno ao criar pedido PIX' });
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
      return res
        .status(400)
        .json({ success: false, message: 'Carrinho vazio' });
    }
    if (!guestName || !guestEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'Nome e email são obrigatórios' });
    }

    let subtotal = 0;
    const orderItems = [];
    const productsList = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Produto não encontrado' });
      }
      const itemPrice = product.offerPrice || product.price;
      subtotal += itemPrice * item.quantity;
      orderItems.push({
        product: product._id.toString(),
        quantity: item.quantity,
      });
      productsList.push(product);
    }

    const originalAmount = subtotal;
    const couponDiscount = discountAmount || 0;
    const afterCoupon = subtotal - couponDiscount;
    const pixDiscount = afterCoupon * 0.1;
    const afterPix = afterCoupon - pixDiscount;
    const totalAmount = afterPix + Number(shippingCost);

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
      status: 'Aguardando Pagamento',
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

    try {
      const addressDoc = await Address.findById(address);
      const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
      const shortId = order._id.toString().slice(-6).toUpperCase();

      await sendPixEmail({
        to: adminEmail,
        subject: `🔔 Pedido PIX (Visitante) #${shortId} - ${formatBRL(totalAmount)} - ${guestName}`,
        html: generateAdminPixEmailHTML({
          shortId,
          customerName: guestName,
          customerEmail: guestEmail,
          customerPhone: guestPhone || addressDoc?.phone || '',
          orderItems,
          products: productsList,
          address: addressDoc,
          originalAmount,
          couponDiscount,
          promoCode,
          pixDiscount,
          shippingCost: Number(shippingCost),
          shippingCarrier,
          totalAmount,
          isGuest: true,
        }),
      });
    } catch (emailErr) {
      console.error('Erro email admin (PIX guest):', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido criado. Aguardando Pagamento.',
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
// ✅ FIX 11/03: Agora usa 'Pedido Confirmado' (antes era 'Order Placed')
// ═══════════════════════════════════════════════════════════════
export const confirmPixPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Pedido não encontrado' });
    }

    if (order.isPaid) {
      return res
        .status(400)
        .json({ success: false, message: 'Pedido já está pago' });
    }

    // ─── Marcar como pago ───
    order.isPaid = true;
    order.status = 'Pedido Confirmado'; // ✅ FIX: era 'Order Placed' (status antigo em inglês)
    order.paidAt = new Date();
    await order.save();

    // ─── Decrementar estoque ───
    for (const item of order.items) {
      try {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      } catch (stockErr) {
        console.error(
          `Erro estoque produto ${item.product}:`,
          stockErr.message,
        );
      }
    }

    // ─── Buscar produtos e endereço para email completo ───
    const productIds = order.items.map(
      item => item.product._id || item.product,
    );
    const products = await Product.find({ _id: { $in: productIds } });
    const address = await Address.findById(order.address);

    // ─── Notificar cliente por email COMPLETO ───
    try {
      let customerEmail = null;
      let customerName = 'Cliente';

      if (order.userId) {
        const user = await User.findById(order.userId);
        customerEmail = user?.email;
        customerName = user?.name || 'Cliente';
      } else if (order.guestEmail) {
        customerEmail = order.guestEmail;
        customerName = order.guestName || 'Cliente';
      }

      if (!customerEmail && address?.email) {
        customerEmail = address.email;
        customerName =
          `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
          'Cliente';
      }

      if (customerEmail) {
        const shortId = order._id.toString().slice(-6).toUpperCase();

        await sendPixEmail({
          to: customerEmail,
          subject: `✅ Pagamento Confirmado - Pedido #${shortId} - Elite Surfing Brasil`,
          html: generateClientPixConfirmationHTML({
            shortId,
            customerName,
            orderItems: order.items,
            products,
            address,
            order,
          }),
        });

        console.log(
          `✅ Email de confirmação PIX enviado para ${customerEmail}`,
        );
      } else {
        console.error(
          '❌ Nenhum email de cliente encontrado para confirmação PIX',
        );
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
    return res
      .status(500)
      .json({ success: false, message: 'Erro ao confirmar pagamento' });
  }
};
