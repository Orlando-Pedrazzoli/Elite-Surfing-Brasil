// server/emails/OrderStatusUpdateEmail.js
// VERSÃO BRASIL - Elite Surfing Brasil
// ✅ Sistema simplificado: 5 status em português
// ✅ Backward compatible com status antigos

const formatBRL = value => {
  return (value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const getStatusInfo = status => {
  const statusMap = {
    'Aguardando Pagamento': {
      label: 'Aguardando Pagamento',
      emoji: '⏳',
      color: '#F59E0B',
      message: 'Estamos aguardando a confirmação do seu pagamento.',
      icon: '💰',
    },
    'Pedido Confirmado': {
      label: 'Pedido Confirmado',
      emoji: '✅',
      color: '#3B82F6',
      message:
        'O seu pagamento foi confirmado! Estamos preparando o seu pedido para envio.',
      icon: '📋',
    },
    Enviado: {
      label: 'Enviado',
      emoji: '🚚',
      color: '#8B5CF6',
      message: 'O seu pedido foi enviado e está a caminho!',
      icon: '📬',
    },
    Entregue: {
      label: 'Entregue',
      emoji: '📦',
      color: '#10B981',
      message:
        'O seu pedido foi entregue com sucesso. Obrigado pela sua compra!',
      icon: '🎉',
    },
    Cancelado: {
      label: 'Cancelado',
      emoji: '❌',
      color: '#EF4444',
      message:
        'O seu pedido foi cancelado. Se tiver dúvidas, entre em contato conosco.',
      icon: '🚫',
    },
    // Backward compat
    'Aguardando Pagamento PIX': {
      label: 'Aguardando Pagamento',
      emoji: '⏳',
      color: '#F59E0B',
      message: 'Estamos aguardando a confirmação do seu pagamento PIX.',
      icon: '💰',
    },
    'Order Placed': {
      label: 'Pedido Confirmado',
      emoji: '✅',
      color: '#3B82F6',
      message:
        'O seu pagamento foi confirmado! Estamos preparando o seu pedido.',
      icon: '📋',
    },
    Processing: {
      label: 'Pedido Confirmado',
      emoji: '✅',
      color: '#3B82F6',
      message: 'O seu pedido está sendo preparado.',
      icon: '📋',
    },
    Shipped: {
      label: 'Enviado',
      emoji: '🚚',
      color: '#8B5CF6',
      message: 'O seu pedido foi enviado e está a caminho!',
      icon: '📬',
    },
    'Out for Delivery': {
      label: 'Enviado',
      emoji: '🚚',
      color: '#8B5CF6',
      message: 'O seu pedido está a caminho do seu endereço.',
      icon: '📬',
    },
    Delivered: {
      label: 'Entregue',
      emoji: '📦',
      color: '#10B981',
      message: 'O seu pedido foi entregue com sucesso!',
      icon: '🎉',
    },
    Cancelled: {
      label: 'Cancelado',
      emoji: '❌',
      color: '#EF4444',
      message: 'O seu pedido foi cancelado.',
      icon: '🚫',
    },
  };
  return (
    statusMap[status] || {
      label: status,
      emoji: '📦',
      color: '#6B7280',
      message: 'O status do seu pedido foi atualizado.',
      icon: '📦',
    }
  );
};

export const createStatusUpdateEmailTemplate = (
  order,
  customerName,
  customerEmail,
  newStatus,
  products = [],
) => {
  const statusInfo = getStatusInfo(newStatus);
  const productsHTML =
    products.length > 0
      ? `
    <div style="margin-top:20px;">
      <h3 style="margin:0 0 15px;color:#495057;font-size:16px;">📦 Produtos do Pedido</h3>
      <div style="background:#f8f9fa;border-radius:8px;padding:15px;">
        ${order.items
          .map(item => {
            const product = products.find(
              p =>
                p._id.toString() ===
                (item.product._id || item.product).toString(),
            );
            if (!product) return '';
            return `<div style="padding:10px 0;border-bottom:1px solid #e9ecef;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-weight:600;color:#333;">${product.name}<br><span style="font-size:13px;color:#666;font-weight:400;">Qtd: ${item.quantity}</span></td><td style="text-align:right;font-weight:600;color:#333;">${formatBRL(product.offerPrice * item.quantity)}</td></tr></table></div>`;
          })
          .join('')}
        <div style="padding-top:15px;text-align:right;border-top:2px solid #dee2e6;margin-top:10px;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:${statusInfo.color};">Total: ${formatBRL(order.amount)}</p>
        </div>
      </div>
    </div>`
      : '';

  const timelineStatuses = ['Pedido Confirmado', 'Enviado', 'Entregue'];
  const normalizedLabel = statusInfo.label;
  const currentIndex = timelineStatuses.indexOf(normalizedLabel);
  const timelineHTML =
    normalizedLabel !== 'Cancelado' &&
    normalizedLabel !== 'Aguardando Pagamento' &&
    currentIndex >= 0
      ? `
    <div style="margin:30px 0;">
      <h3 style="margin:0 0 20px;color:#495057;font-size:16px;text-align:center;">📍 Progresso do Pedido</h3>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${timelineStatuses
          .map((s, i) => {
            const info = getStatusInfo(s);
            const done = i <= currentIndex;
            const curr = i === currentIndex;
            return `<td style="text-align:center;width:33%;"><div style="width:44px;height:44px;border-radius:50%;background:${done ? info.color : '#e9ecef'};color:${done ? 'white' : '#adb5bd'};display:inline-block;line-height:44px;font-size:20px;${curr ? 'box-shadow:0 0 0 4px ' + info.color + '40;' : ''}">${info.emoji}</div><p style="margin:8px 0 0;font-size:12px;color:${done ? '#333' : '#adb5bd'};font-weight:${curr ? '700' : '400'};">${info.label}</p></td>`;
          })
          .join('')}
      </tr></table>
    </div>`
      : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
<div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,${statusInfo.color} 0%,${statusInfo.color}dd 100%);padding:30px;text-align:center;">
    <div style="font-size:50px;margin-bottom:10px;">${statusInfo.icon}</div>
    <h1 style="color:white;margin:0;font-size:24px;">${statusInfo.label}</h1>
    <p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">Pedido #${order._id.toString().slice(-8).toUpperCase()}</p>
  </div>
  <div style="padding:30px;">
    <p style="font-size:16px;margin:0 0 20px;">Olá <strong>${customerName}</strong>,</p>
    <div style="background:${statusInfo.color}15;border-left:4px solid ${statusInfo.color};padding:20px;border-radius:0 8px 8px 0;margin-bottom:25px;">
      <p style="margin:0;color:#333;font-size:15px;">${statusInfo.emoji} ${statusInfo.message}</p>
    </div>
    ${timelineHTML}
    <div style="background:#f8f9fa;padding:20px;border-radius:12px;margin:25px 0;">
      <h3 style="margin:0 0 15px;color:#495057;font-size:16px;">📋 Detalhes do Pedido</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#666;font-size:14px;">Número:</td><td style="padding:8px 0;text-align:right;font-weight:600;font-family:monospace;">#${order._id.toString().slice(-8).toUpperCase()}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:14px;">Data:</td><td style="padding:8px 0;text-align:right;">${new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:14px;">Total:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:${statusInfo.color};font-size:18px;">${formatBRL(order.amount)}</td></tr>
      </table>
    </div>
    ${productsHTML}
    <div style="text-align:center;margin:30px 0;">
      <a href="https://www.elitesurfing.com.br/my-orders" style="display:inline-block;background:${statusInfo.color};color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Ver Meus Pedidos</a>
    </div>
    ${normalizedLabel === 'Enviado' ? '<div style="background:#EEF2FF;border:1px solid #C7D2FE;padding:20px;border-radius:12px;margin-top:20px;"><h4 style="margin:0 0 10px;color:#4F46E5;">📬 Dicas de Entrega</h4><ul style="margin:0;padding-left:20px;color:#4338CA;font-size:14px;"><li style="margin-bottom:8px;">Mantenha o seu celular por perto</li><li style="margin-bottom:8px;">Verifique se o endereço está correto</li><li>Prazo estimado: 3-10 dias úteis</li></ul></div>' : ''}
    ${normalizedLabel === 'Entregue' ? '<div style="background:#ECFDF5;border:1px solid #A7F3D0;padding:20px;border-radius:12px;margin-top:20px;"><h4 style="margin:0 0 10px;color:#059669;">⭐ A sua opinião é importante!</h4><p style="margin:0 0 15px;color:#047857;font-size:14px;">Esperamos que esteja satisfeito com a sua compra!</p><div style="text-align:center;"><a href="https://www.elitesurfing.com.br/write-review" style="display:inline-block;background:#10B981;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;">Deixar Avaliação</a></div></div>' : ''}
    <div style="text-align:center;padding:25px 0 10px;border-top:1px solid #e9ecef;margin-top:30px;">
      <p style="margin:0 0 10px;color:#666;font-size:14px;">Tem alguma dúvida?</p>
      <p style="margin:0;"><a href="mailto:atendimento@elitesurfing.com.br" style="color:${statusInfo.color};text-decoration:none;font-weight:500;">atendimento@elitesurfing.com.br</a></p>
      <p style="margin:5px 0;color:#666;font-size:13px;">📱 WhatsApp: +55 (21) 96435-8058</p>
    </div>
  </div>
  <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #e9ecef;">
    <p style="margin:0;color:#666;font-size:13px;">Obrigado por escolher a Elite Surfing Brasil! 🏄‍♂️</p>
    <p style="margin:10px 0 0;"><a href="https://www.elitesurfing.com.br" style="color:${statusInfo.color};text-decoration:none;font-size:13px;">www.elitesurfing.com.br</a></p>
  </div>
</div>
<p style="text-align:center;color:#999;font-size:11px;margin-top:20px;">Este email foi enviado automaticamente.</p>
</body></html>`;
};

export const createStatusUpdateTextTemplate = (
  order,
  customerName,
  newStatus,
) => {
  const s = getStatusInfo(newStatus);
  return `Olá ${customerName},\n\n${s.emoji} ${s.label}\n\n${s.message}\n\nPedido: #${order._id.toString().slice(-8).toUpperCase()}\nData: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\nTotal: ${formatBRL(order.amount)}\n\nAcesse: https://www.elitesurfing.com.br/my-orders\n\nDúvidas? atendimento@elitesurfing.com.br\nWhatsApp: +55 (21) 96435-8058\n\nElite Surfing Brasil — www.elitesurfing.com.br`;
};

export default {
  createStatusUpdateEmailTemplate,
  createStatusUpdateTextTemplate,
  getStatusInfo,
};
