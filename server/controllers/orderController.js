// server/controllers/orderController.js
// VERSÃO BRASIL - Elite Surfing Brasil
// ✅ Moeda: BRL (R$)
// ✅ Pagamentos: PIX Manual + Pagar.me (Cartão 12x + Boleto)
// ✅ Locale: pt-BR
// ✅ Domínio: www.elitesurfing.com.br
// ✅ Notificações: Email (Nodemailer/Gmail) + WhatsApp (via adminNotificationService)
// ✅ MIGRAÇÃO 12/03: Stripe REMOVIDO — Pagar.me é o único gateway
// ✅ MIGRAÇÃO 12/03: COD REMOVIDO — não existe mais

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import nodemailer from 'nodemailer';

// =============================================================================
// IMPORTAÇÃO DOS SERVIÇOS
// =============================================================================
let sendOrderStatusUpdateEmail = null;
let notifyAdminNewOrder = null;

try {
  const emailService = await import('../services/emailService.js');
  sendOrderStatusUpdateEmail = emailService.sendOrderStatusUpdateEmail;
  console.log('✅ emailService carregado com sucesso');
} catch (error) {
  console.error('❌ ERRO ao carregar emailService:', error.message);
}

try {
  const adminService = await import('../services/adminNotificationService.js');
  notifyAdminNewOrder = adminService.notifyAdminNewOrder;
  console.log('✅ adminNotificationService carregado com sucesso');
} catch (error) {
  console.error('❌ ERRO ao carregar adminNotificationService:', error.message);
}

// =============================================================================
// FUNÇÃO PARA DECREMENTAR STOCK
// =============================================================================
const decrementProductStock = async items => {
  try {
    console.log('📦 Decrementando estoque dos produtos...');

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
// FUNÇÃO PARA VALIDAR STOCK ANTES DE CRIAR PEDIDO
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

  return {
    valid: errors.length === 0,
    errors,
  };
};

// =============================================================================
// FORMATAR VALOR EM BRL
// =============================================================================
const formatBRL = value => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// =============================================================================
// GERAR HTML DO EMAIL DE CONFIRMAÇÃO PARA CLIENTE
// =============================================================================
const generateOrderConfirmationHTML = (
  order,
  customerName,
  products,
  address,
) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsHTML = order.items
    .map(item => {
      const product = products.find(
        p => p._id.toString() === (item.product._id || item.product).toString(),
      );
      const productName = product?.name || 'Produto';
      const productPrice = item.price || product?.offerPrice || 0;
      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(productPrice * item.quantity)}</td>
      </tr>
    `;
    })
    .join('');

  return `
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
          <p style="color: #a0a0a0; margin: 10px 0 0 0;">Obrigado pelo seu pedido!</p>
        </div>
        
        <!-- Order Info -->
        <div style="padding: 30px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 15px 0; color: #333;">📋 Detalhes do Pedido</h2>
            <p style="margin: 5px 0;"><strong>Nº Pedido:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Data:</strong> ${orderDate}</p>
            <p style="margin: 5px 0;"><strong>Pagamento:</strong> ✅ Pago Online</p>
          </div>
          
          <!-- Customer Info -->
          <div style="background: #e8f4f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">👤 Dados do Cliente</h3>
            <p style="margin: 5px 0;"><strong>Nome:</strong> ${customerName}</p>
            <p style="margin: 5px 0;"><strong>Endereço:</strong> ${address.street}, ${address.zipcode} ${address.city} - ${address.state}, ${address.country}</p>
            ${address.phone ? `<p style="margin: 5px 0;"><strong>Telefone:</strong> ${address.phone}</p>` : ''}
          </div>
          
          <!-- Products Table -->
          <h3 style="color: #333;">📦 Produtos</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <!-- Total -->
          <div style="background: #1a1a2e; color: white; padding: 15px 20px; border-radius: 8px; text-align: right;">
            <span style="font-size: 18px;">Total: </span>
            <span style="font-size: 24px; font-weight: bold;">${formatBRL(order.amount)}</span>
          </div>
          
          ${
            order.promoCode
              ? `
          <p style="margin-top: 10px; color: #28a745; font-size: 14px;">
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
};

// =============================================================================
// GERAR HTML DO EMAIL PARA ADMIN
// =============================================================================
const generateAdminNotificationHTML = (
  order,
  customerName,
  customerEmail,
  customerPhone,
  products,
  address,
) => {
  const orderDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsHTML = order.items
    .map(item => {
      const product = products.find(
        p => p._id.toString() === (item.product._id || item.product).toString(),
      );
      const productName = product?.name || 'Produto';
      const productPrice = item.price || product?.offerPrice || 0;
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${productName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(productPrice * item.quantity)}</td>
      </tr>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 NOVO PEDIDO!</h1>
          <p style="color: #ffcccc; margin: 10px 0 0 0;">${order.isGuestOrder ? '👤 GUEST CHECKOUT' : '👤 Cliente Cadastrado'}</p>
        </div>
        
        <div style="padding: 25px;">
          
          <!-- Order Info -->
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>📋 Pedido:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${orderDate}</p>
            <p style="margin: 5px 0;"><strong>💳 Pagamento:</strong> ✅ PAGO Online</p>
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
            <p style="margin: 5px 0;">${address.firstName} ${address.lastName}</p>
            <p style="margin: 5px 0;">${address.street}</p>
            ${address.complement ? `<p style="margin: 5px 0;">${address.complement}</p>` : ''}
            ${address.neighborhood ? `<p style="margin: 5px 0;">Bairro: ${address.neighborhood}</p>` : ''}
            <p style="margin: 5px 0;">CEP: ${address.zipcode} - ${address.city}/${address.state}</p>
            <p style="margin: 5px 0;">${address.country}</p>
            ${address.phone ? `<p style="margin: 5px 0;">📱 ${address.phone}</p>` : ''}
            ${address.cpf ? `<p style="margin: 5px 0;">CPF: ${address.cpf}</p>` : ''}
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
          
          ${
            order.promoCode
              ? `
          <p style="color: #28a745;"><strong>🎉 Cupom:</strong> ${order.promoCode} (-${order.discountPercentage}%)</p>
          `
              : ''
          }
          
          <!-- Total -->
          <div style="background: #007bff; color: white; padding: 15px; border-radius: 8px; text-align: center;">
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
};

// =============================================================================
// FUNÇÃO PRINCIPAL PARA ENVIAR TODOS OS EMAILS + WHATSAPP
// ✅ EXPORTADA — pagarmeController.js e pixManualController.js importam esta função
// =============================================================================
export const sendAllOrderEmails = async (order, userOrEmail) => {
  console.log('');
  console.log(
    '╔═══════════════════════════════════════════════════════════════╗',
  );
  console.log(
    '║           📧 INICIANDO ENVIO DE EMAILS (PARALELO)             ║',
  );
  console.log(
    '╚═══════════════════════════════════════════════════════════════╝',
  );
  console.log('');

  try {
    // 1. IDENTIFICAR O DESTINATÁRIO
    console.log('📋 Order ID:', order?._id);
    console.log('📧 userOrEmail recebido:', userOrEmail);
    console.log('🛒 isGuestOrder:', order?.isGuestOrder);

    let customerEmail = null;
    let customerName = null;
    let customerPhone = null;
    let userObj = null;

    // Determinar email e nome do cliente
    if (order.isGuestOrder) {
      customerEmail = order.guestEmail;
      customerName = order.guestName || 'Cliente';
      customerPhone = order.guestPhone || '';
      console.log('👤 Modo: GUEST');
    } else if (typeof userOrEmail === 'string') {
      if (userOrEmail.includes('@')) {
        customerEmail = userOrEmail;
        customerName = 'Cliente';
        console.log('👤 Modo: Email direto');
      } else {
        // É um userId - buscar user
        console.log('👤 Modo: Buscando user por ID...');
        userObj = await User.findById(userOrEmail);
        if (userObj) {
          customerEmail = userObj.email;
          customerName = userObj.name;
          customerPhone = userObj.phone || '';
          console.log('👤 User encontrado:', userObj.name, '-', userObj.email);
        } else {
          console.error('❌ User não encontrado com ID:', userOrEmail);
        }
      }
    } else if (userOrEmail?._id) {
      userObj = userOrEmail;
      customerEmail = userOrEmail.email;
      customerName = userOrEmail.name;
      customerPhone = userOrEmail.phone || '';
      console.log('👤 Modo: Objeto user');
    }

    // Fallback para guest
    if (!customerEmail && order.guestEmail) {
      customerEmail = order.guestEmail;
      customerName = order.guestName || 'Cliente';
      console.log('👤 Modo: Fallback guest');
    }

    console.log('');
    console.log('📧 Email final do cliente:', customerEmail);
    console.log('👤 Nome final:', customerName);
    console.log('📱 Telefone:', customerPhone || 'N/A');

    if (!customerEmail) {
      console.error('❌ ERRO: Nenhum email de cliente encontrado!');
      return { success: false, error: 'Email não encontrado' };
    }

    // 2. BUSCAR ADDRESS
    console.log('');
    console.log('📍 Buscando endereço:', order.address);
    const address = await Address.findById(order.address);

    if (!address) {
      console.error('❌ ERRO: Endereço não encontrado!');
      return { success: false, error: 'Endereço não encontrado' };
    }
    console.log('✅ Endereço encontrado:', address.city, address.state);

    // 3. BUSCAR PRODUTOS
    const productIds = order.items.map(
      item => item.product._id || item.product,
    );
    const products = await Product.find({ _id: { $in: productIds } });
    console.log('📦 Produtos encontrados:', products.length);

    // 4. CRIAR TRANSPORTER (Nodemailer + Gmail)
    console.log('');
    console.log('📧 Criando transporter...');
    console.log(
      '📧 GMAIL_USER:',
      process.env.GMAIL_USER ? '✅ Configurado' : '❌ NÃO CONFIGURADO',
    );
    console.log(
      '📧 GMAIL_APP_PASSWORD:',
      process.env.GMAIL_APP_PASSWORD ? '✅ Configurado' : '❌ NÃO CONFIGURADO',
    );

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ ERRO: Variáveis de email não configuradas!');
      return { success: false, error: 'Configuração de email incompleta' };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 5. PREPARAR EMAILS
    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;

    const clientHTML = generateOrderConfirmationHTML(
      order,
      customerName,
      products,
      address,
    );
    const clientSubject = `✅ Confirmação do Pedido #${order._id.toString().slice(-8).toUpperCase()} - Elite Surfing Brasil`;

    const adminHTML = generateAdminNotificationHTML(
      order,
      customerName,
      customerEmail,
      customerPhone,
      products,
      address,
    );
    const adminSubject = `🔔 NOVO PEDIDO #${order._id.toString().slice(-8).toUpperCase()} - ${formatBRL(order.amount)}`;

    // 6. ENVIAR EMAILS EM PARALELO + NOTIFICAÇÃO ADMIN (WhatsApp)
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 ENVIANDO EMAILS + NOTIFICAÇÕES EM PARALELO...');
    console.log('   → Cliente:', customerEmail);
    console.log('   → Admin:', adminEmail);
    console.log(
      '   → WhatsApp:',
      notifyAdminNewOrder ? '✅ Ativo' : '⚠️ Indisponível',
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Preparar user object para adminNotificationService
    const userForAdmin = userObj || {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    };

    const promises = [
      // Email para cliente
      transporter
        .sendMail({
          from: {
            name: 'Elite Surfing Brasil',
            address: process.env.GMAIL_USER,
          },
          to: customerEmail,
          subject: clientSubject,
          html: clientHTML,
        })
        .then(r => ({ success: true, messageId: r.messageId }))
        .catch(e => ({ success: false, error: e.message })),

      // Email para admin
      transporter
        .sendMail({
          from: {
            name: 'Elite Surfing Brasil',
            address: process.env.GMAIL_USER,
          },
          to: adminEmail,
          subject: adminSubject,
          html: adminHTML,
        })
        .then(r => ({ success: true, messageId: r.messageId }))
        .catch(e => ({ success: false, error: e.message })),
    ];

    // Notificação Admin centralizada (Email extra + WhatsApp)
    if (notifyAdminNewOrder) {
      promises.push(
        notifyAdminNewOrder(order, userForAdmin, products, address)
          .then(r => ({ success: true, details: r }))
          .catch(e => ({ success: false, error: e.message })),
      );
    }

    const results = await Promise.all(promises);
    const [clientResult, adminResult, adminNotifyResult] = results;

    // 7. LOG DOS RESULTADOS
    console.log('');
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('📧 RESULTADO DAS NOTIFICAÇÕES:');
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
    if (adminNotifyResult) {
      console.log(
        '   Admin+WhatsApp:',
        adminNotifyResult.success
          ? '✅ ENVIADO'
          : `❌ FALHOU (${adminNotifyResult.error})`,
      );
    }
    console.log(
      '═══════════════════════════════════════════════════════════════',
    );
    console.log('');

    return {
      success: clientResult.success || adminResult.success,
      clientEmail: clientResult,
      adminEmail: adminResult,
      adminNotification: adminNotifyResult || null,
    };
  } catch (error) {
    console.error('');
    console.error('❌ ═══════════════════════════════════════════════════════');
    console.error('❌ ERRO GERAL EM sendAllOrderEmails:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ═══════════════════════════════════════════════════════');
    console.error('');
    return { success: false, error: error.message };
  }
};

// =============================================================================
// GET USER ORDERS
// =============================================================================
export const getUserOrders = async (req, res) => {
  try {
    const userId =
      req.user?.id || req.user?._id || req.query.userId || req.body.userId;
    const guestEmail = req.query.guestEmail || req.body.guestEmail;

    let query;
    if (guestEmail) {
      query = {
        isGuestOrder: true,
        guestEmail: guestEmail,
        isPaid: true,
      };
    } else if (userId) {
      query = {
        userId,
        isPaid: true,
      };
    } else {
      return res.json({
        success: false,
        message: 'User ID ou Email de visitante necessário',
      });
    }

    const orders = await Order.find(query)
      .populate({
        path: 'items.product',
        select: 'name image category offerPrice weight color colorCode',
      })
      .populate({
        path: 'address',
        select:
          'firstName lastName street complement neighborhood city state zipcode country email phone cpf',
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// GET SINGLE ORDER (PUBLIC)
// =============================================================================
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.json({ success: false, message: 'ID do pedido necessário' });
    }

    const order = await Order.findById(orderId)
      .populate({
        path: 'items.product',
        select: 'name image category offerPrice weight color colorCode',
      })
      .populate({
        path: 'address',
        select:
          'firstName lastName street complement neighborhood city state zipcode country email phone cpf',
      });

    if (!order) {
      return res.json({ success: false, message: 'Pedido não encontrado' });
    }

    // Só mostra pedidos pagos (exceto boleto pendente que precisa mostrar URL)
    if (!order.isPaid && order.paymentType !== 'pagarme_boleto') {
      return res.json({
        success: false,
        message: 'Pedido ainda não confirmado',
        pending: true,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Erro ao buscar pedido:', error);
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// GET ALL ORDERS (SELLER/ADMIN)
// ✅ Inclui pedidos pendentes: PIX manual, Pagar.me cartão (antifraude), Pagar.me boleto
// =============================================================================
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { isPaid: true },
        {
          paymentType: 'pix_manual',
          isPaid: false,
          status: { $nin: ['Cancelled', 'Cancelado'] },
        },
        {
          paymentType: 'pagarme_card',
          isPaid: false,
          status: { $nin: ['Cancelled', 'Cancelado'] },
        },
        {
          paymentType: 'pagarme_boleto',
          isPaid: false,
          status: { $nin: ['Cancelled', 'Cancelado'] },
        },
      ],
    })
      .populate('items.product address')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// UPDATE ORDER STATUS (SELLER/ADMIN)
// =============================================================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.json({
        success: false,
        message: 'ID do pedido e Status são obrigatórios',
      });
    }

    const validStatuses = [
      'Pedido Confirmado',
      'Enviado',
      'Entregue',
      'Cancelado',
    ];

    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: 'Status inválido' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.json({ success: false, message: 'Pedido não encontrado' });
    }

    const previousStatus = order.status;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    )
      .populate('items.product')
      .populate('address');

    console.log('✅ Status atualizado:', {
      orderId,
      oldStatus: previousStatus,
      newStatus: status,
    });

    // Enviar notificação de status
    let notificationSent = false;
    if (previousStatus !== status && sendOrderStatusUpdateEmail) {
      const productIds = updatedOrder.items.map(
        item => item.product?._id || item.product,
      );
      const products = await Product.find({ _id: { $in: productIds } });

      try {
        const result = await sendOrderStatusUpdateEmail(
          updatedOrder,
          status,
          products,
        );
        if (result.success) {
          console.log('✅ Email de status enviado');
          notificationSent = true;
        }
      } catch (err) {
        console.error('❌ Erro ao enviar email de status:', err.message);
      }
    }

    res.json({
      success: true,
      message: `Status atualizado para "${status}"`,
      order: updatedOrder,
      notificationSent,
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.json({ success: false, message: error.message });
  }
};
