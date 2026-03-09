// server/services/emailService.js
// VERSÃO BRASIL - Elite Surfing Brasil
// ✅ Moeda: BRL (R$)
// ✅ Locale: pt-BR
// ✅ Domínio: elitesurfing.com.br

import nodemailer from 'nodemailer';
import { createOrderEmailTemplate } from '../emails/OrderConfirmationEmail.js';

// Importação segura do template de status
let createStatusUpdateEmailTemplate = null;
let createStatusUpdateTextTemplate = null;

try {
  const statusModule = await import('../emails/OrderStatusUpdateEmail.js');
  createStatusUpdateEmailTemplate =
    statusModule.createStatusUpdateEmailTemplate;
  createStatusUpdateTextTemplate = statusModule.createStatusUpdateTextTemplate;
  console.log('✅ Template de status update carregado');
} catch (error) {
  console.log('⚠️ Template de status update não disponível:', error.message);
}

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
// VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// =============================================================================
const validateEmailConfig = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  console.log('📧 ═══════════════════════════════════════════════');
  console.log('📧 VALIDAÇÃO DE CONFIGURAÇÃO DE EMAIL');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log(
    '📧 GMAIL_USER:',
    gmailUser ? `✅ ${gmailUser}` : '❌ NÃO CONFIGURADO',
  );
  console.log(
    '📧 GMAIL_APP_PASSWORD:',
    gmailPassword
      ? `✅ Configurado (${gmailPassword.length} caracteres)`
      : '❌ NÃO CONFIGURADO',
  );

  if (!gmailUser || !gmailPassword) {
    console.error('❌ ERRO CRÍTICO: Variáveis de email não configuradas!');
    console.error(
      '❌ Adicione GMAIL_USER e GMAIL_APP_PASSWORD no .env e na Vercel',
    );
    return false;
  }

  if (gmailPassword.length !== 16) {
    console.warn(
      '⚠️ AVISO: GMAIL_APP_PASSWORD deveria ter 16 caracteres, tem',
      gmailPassword.length,
    );
  }

  console.log('📧 ✅ Configuração de email validada!');
  return true;
};

// Validar ao carregar o módulo
validateEmailConfig();

// =============================================================================
// CRIAR TRANSPORTER
// =============================================================================
const createGmailTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.error('❌ Tentativa de criar transporter sem credenciais!');
    throw new Error('GMAIL_USER ou GMAIL_APP_PASSWORD não configurado');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });
};

// =============================================================================
// ENVIAR EMAIL DE CONFIRMAÇÃO DE PEDIDO
// =============================================================================
export const sendOrderConfirmationEmail = async (
  order,
  user,
  products,
  address,
) => {
  console.log('');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log('📧 ENVIANDO EMAIL DE CONFIRMAÇÃO DE PEDIDO');
  console.log('📧 ═══════════════════════════════════════════════');

  try {
    // Validar configuração
    if (!validateEmailConfig()) {
      return { success: false, error: 'Configuração de email inválida' };
    }

    // Determinar qual email usar
    let emailToSend = user?.email;

    // Se o email do usuário for inválido, use o do endereço
    if (!emailToSend || emailToSend === '') {
      console.log('⚠️ Email do usuário inválido, usando email do endereço');
      emailToSend = address?.email;
    }

    // Validação final
    if (!emailToSend || emailToSend === '') {
      console.error('❌ Nenhum email válido encontrado');
      console.error('❌ user.email:', user?.email);
      console.error('❌ address.email:', address?.email);
      return {
        success: false,
        error: 'Nenhum email válido encontrado para envio',
      };
    }

    console.log('📧 Destinatário:', emailToSend);
    console.log('📧 Nome:', user?.name || 'Cliente');
    console.log('📧 Order ID:', order?._id);

    const transporter = createGmailTransporter();

    let emailHtml;
    try {
      emailHtml = createOrderEmailTemplate(order, user, products, address);
    } catch (templateError) {
      console.error('❌ Erro ao criar template:', templateError.message);
      // Usar template simples de fallback
      emailHtml = `
        <h1>Confirmação de Pedido - Elite Surfing Brasil</h1>
        <p>Olá ${user?.name || 'Cliente'},</p>
        <p>Obrigado pela sua compra!</p>
        <p><strong>Pedido:</strong> #${order._id}</p>
        <p><strong>Total:</strong> ${formatBRL(order.amount)}</p>
        <p>Obrigado por escolher a Elite Surfing Brasil!</p>
      `;
    }

    const mailOptions = {
      from: {
        name: 'Elite Surfing Brasil',
        address: process.env.GMAIL_USER,
      },
      to: emailToSend,
      subject: `✅ Confirmação do Pedido #${order._id.toString().slice(-8).toUpperCase()} - Elite Surfing Brasil`,
      html: emailHtml,
      text: `
        Olá ${user?.name || 'Cliente'},
        
        Obrigado pela sua compra! O seu pedido #${order._id} foi processado com sucesso.
        
        Total: ${formatBRL(order.amount)}
        Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}
        
        Obrigado por escolher a Elite Surfing Brasil!
        www.elitesurfing.com.br
      `,
    };

    console.log('📧 Enviando email...');
    const result = await transporter.sendMail(mailOptions);

    console.log('✅ EMAIL DE CONFIRMAÇÃO ENVIADO!');
    console.log('✅ Message ID:', result.messageId);
    console.log('✅ Destinatário:', emailToSend);

    return {
      success: true,
      messageId: result.messageId,
      message: `Email enviado para ${emailToSend}`,
      recipient: emailToSend,
    };
  } catch (error) {
    console.error('❌ ERRO ao enviar email de confirmação:', error.message);
    console.error('❌ Stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Erro desconhecido no envio de email',
    };
  }
};

// =============================================================================
// ENVIAR EMAIL DE ATUALIZAÇÃO DE STATUS
// =============================================================================
export const sendOrderStatusUpdateEmail = async (
  order,
  newStatus,
  products = [],
) => {
  console.log('');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log('📧 ENVIANDO EMAIL DE ATUALIZAÇÃO DE STATUS');
  console.log('📧 ═══════════════════════════════════════════════');

  try {
    // Validar configuração
    if (!validateEmailConfig()) {
      return { success: false, error: 'Configuração de email inválida' };
    }

    // Verificar se template está disponível
    if (!createStatusUpdateEmailTemplate) {
      console.log('⚠️ Template de status não disponível, usando fallback');
    }

    // Determinar email e nome do cliente
    let customerEmail = null;
    let customerName = 'Cliente';

    // 1. Se é guest order, usar dados do pedido
    if (order.isGuestOrder && order.guestEmail) {
      customerEmail = order.guestEmail;
      customerName = order.guestName || 'Cliente';
      console.log('📧 Modo: Guest');
    }
    // 2. Se tem userId, buscar do usuário
    else if (order.userId) {
      try {
        const { default: User } = await import('../models/User.js');
        const user = await User.findById(order.userId);
        if (user) {
          customerEmail = user.email;
          customerName = user.name;
          console.log('📧 Modo: Usuário cadastrado');
        }
      } catch (userError) {
        console.error('❌ Erro ao buscar usuário:', userError.message);
      }
    }

    // 3. Fallback: usar email do endereço
    if (!customerEmail && order.address) {
      try {
        const { default: Address } = await import('../models/Address.js');
        const address = await Address.findById(order.address);
        if (address && address.email) {
          customerEmail = address.email;
          customerName = `${address.firstName} ${address.lastName}`;
          console.log('📧 Modo: Email do endereço');
        }
      } catch (addressError) {
        console.error('❌ Erro ao buscar endereço:', addressError.message);
      }
    }

    // Validação final
    if (!customerEmail) {
      console.error('❌ Nenhum email encontrado para notificação de status');
      return {
        success: false,
        error: 'Nenhum email encontrado para o cliente',
      };
    }

    console.log('📧 Destinatário:', customerEmail);
    console.log('📧 Nome:', customerName);
    console.log('📧 Novo status:', newStatus);

    const transporter = createGmailTransporter();

    // Criar templates
    let emailHtml;
    if (createStatusUpdateEmailTemplate) {
      try {
        emailHtml = createStatusUpdateEmailTemplate(
          order,
          customerName,
          customerEmail,
          newStatus,
          products,
        );
      } catch (templateError) {
        console.error('❌ Erro no template:', templateError.message);
        emailHtml = null;
      }
    }

    // Fallback template
    if (!emailHtml) {
      const statusMessages = {
        'Order Placed': 'foi recebido',
        Processing: 'está sendo processado',
        Shipped: 'foi enviado',
        'Out for Delivery': 'saiu para entrega',
        Delivered: 'foi entregue',
        Cancelled: 'foi cancelado',
      };
      const statusMsg =
        statusMessages[newStatus] || `foi atualizado para ${newStatus}`;

      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🏄 Elite Surfing Brasil</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #333;">Olá ${customerName}!</h2>
              <p style="font-size: 16px; color: #555;">O seu pedido <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> ${statusMsg}.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Status atual:</strong> ${newStatus}</p>
                <p style="margin: 10px 0 0 0;"><strong>Total:</strong> ${formatBRL(order.amount)}</p>
              </div>
              
              <p style="color: #666;">Se tiver alguma dúvida, entre em contato conosco.</p>
              <p style="color: #666;">Obrigado por escolher a Elite Surfing Brasil!</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
              <p style="margin: 0;">www.elitesurfing.com.br | contato@elitesurfing.com.br</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailText = `Olá ${customerName}, o status do seu pedido #${order._id.toString().slice(-8).toUpperCase()} foi atualizado para: ${newStatus}`;

    // Mapear status para assunto do email
    const statusSubjects = {
      // Novos
      'Aguardando Pagamento': '⏳ Aguardando Pagamento',
      'Pedido Confirmado': '✅ Pedido Confirmado',
      Enviado: '🚚 Pedido Enviado!',
      Entregue: '📦 Pedido Entregue!',
      Cancelado: '❌ Pedido Cancelado',
      // Backward compat
      'Order Placed': '✅ Pedido Confirmado',
      Processing: '✅ Pedido Confirmado',
      Shipped: '🚚 Pedido Enviado!',
      'Out for Delivery': '🚚 Pedido Enviado!',
      Delivered: '📦 Pedido Entregue!',
      Cancelled: '❌ Pedido Cancelado',
    };

    const subjectStatus = statusSubjects[newStatus] || newStatus;

    const mailOptions = {
      from: {
        name: 'Elite Surfing Brasil',
        address: process.env.GMAIL_USER,
      },
      to: customerEmail,
      subject: `${subjectStatus} - Pedido #${order._id.toString().slice(-8).toUpperCase()} - Elite Surfing Brasil`,
      html: emailHtml,
      text: emailText,
    };

    console.log('📧 Enviando email de status...');
    const result = await transporter.sendMail(mailOptions);

    console.log('✅ EMAIL DE STATUS ENVIADO!');
    console.log('✅ Message ID:', result.messageId);
    console.log('✅ Destinatário:', customerEmail);

    return {
      success: true,
      messageId: result.messageId,
      recipient: customerEmail,
      status: newStatus,
    };
  } catch (error) {
    console.error('❌ ERRO ao enviar email de status:', error.message);
    console.error('❌ Stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Erro desconhecido',
    };
  }
};

// =============================================================================
// ENVIAR EMAIL SIMPLES (GENÉRICO)
// =============================================================================
export const sendSimpleEmail = async (to, subject, html, text = null) => {
  console.log('');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log('📧 ENVIANDO EMAIL SIMPLES');
  console.log('📧 ═══════════════════════════════════════════════');
  console.log('📧 Para:', to);
  console.log('📧 Assunto:', subject);

  try {
    // Validar configuração
    if (!validateEmailConfig()) {
      return { success: false, error: 'Configuração de email inválida' };
    }

    const transporter = createGmailTransporter();

    const result = await transporter.sendMail({
      from: {
        name: 'Elite Surfing Brasil',
        address: process.env.GMAIL_USER,
      },
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || subject,
    });

    console.log('✅ EMAIL SIMPLES ENVIADO!');
    console.log('✅ Message ID:', result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ ERRO no sendSimpleEmail:', error.message);
    console.error('❌ Stack:', error.stack);
    return { success: false, error: error.message };
  }
};

export default {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendSimpleEmail,
};
