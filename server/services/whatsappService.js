// server/services/whatsappService.js
// VERSÃO BRASIL - Elite Surfing Brasil
// Serviço de notificações WhatsApp usando CallMeBot API
// Documentação: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// 
// SETUP: 
// 1. Adicione o número +34 644 71 81 99 nos seus contatos do WhatsApp
// 2. Envie "I allow callmebot to send me messages" para esse número
// 3. Você receberá sua API key
// 4. Adicione no .env:
//    ADMIN_WHATSAPP_NUMBER=5511999999999  (seu número BR com código do país)
//    CALLMEBOT_API_KEY=sua_api_key

/**
 * Envia notificação WhatsApp usando CallMeBot API
 * @param {string} message - Mensagem a enviar
 * @returns {Object} Resultado do envio
 */
export const sendWhatsAppNotification = async (message) => {
  try {
    const phoneNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    const apiKey = process.env.CALLMEBOT_API_KEY;

    if (!phoneNumber || !apiKey) {
      console.log('⚠️ WhatsApp não configurado (ADMIN_WHATSAPP_NUMBER ou CALLMEBOT_API_KEY ausente)');
      return { 
        success: false, 
        error: 'WhatsApp não configurado no .env' 
      };
    }

    console.log('📱 Enviando WhatsApp para:', phoneNumber);

    // Codificar mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // CallMeBot API URL
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNumber}&text=${encodedMessage}&apikey=${apiKey}`;

    // Usar AbortController para timeout (compatível com Node.js)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('📱 CallMeBot response:', responseText);

    // CallMeBot retorna texto com "Message queued" se sucesso
    if (response.ok && responseText.toLowerCase().includes('queued')) {
      console.log('✅ WhatsApp enviado com sucesso!');
      return { 
        success: true, 
        message: 'WhatsApp enviado',
        response: responseText 
      };
    } else {
      console.error('❌ WhatsApp falhou:', responseText);
      return { 
        success: false, 
        error: responseText 
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ WhatsApp timeout (15s)');
      return { success: false, error: 'Timeout ao enviar WhatsApp' };
    }
    console.error('❌ Erro ao enviar WhatsApp:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Formata valor em BRL
 */
const formatBRL = (value) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Formata mensagem de novo pedido para WhatsApp
 * @param {Object} order - Pedido
 * @param {Object} user - Usuário
 * @param {Array} products - Produtos
 * @param {Object} address - Endereço
 * @returns {string} Mensagem formatada
 */
export const formatNewOrderMessage = (order, user, products, address) => {
  const orderId = order._id.toString().slice(-8).toUpperCase();
  const customerName = order.isGuestOrder 
    ? (order.guestName || 'Visitante') 
    : (user?.name || 'Cliente');
  const customerEmail = order.isGuestOrder 
    ? order.guestEmail 
    : (user?.email || address?.email || 'N/A');
  const customerPhone = order.isGuestOrder 
    ? (order.guestPhone || address?.phone) 
    : (address?.phone || 'N/A');

  // Listar produtos
  const productList = order.items
    .map(item => {
      const productId = item.product?._id || item.product;
      const product = products.find(p => p._id.toString() === productId.toString());
      if (!product) return `- Item (${item.quantity}x)`;
      return `• ${product.name} (${item.quantity}x) - ${formatBRL((product.offerPrice || 0) * item.quantity)}`;
    })
    .join('\n');

  const guestTag = order.isGuestOrder ? ' [VISITANTE]' : '';

  const message = `🔔 *NOVO PEDIDO!*${guestTag}

📋 *Pedido:* #${orderId}
📅 *Data:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
💳 *Pagamento:* ✅ PAGO Online

👤 *Cliente:*
Nome: ${customerName}
Email: ${customerEmail}
Tel: ${customerPhone}

📍 *Endereço:*
${address?.firstName || ''} ${address?.lastName || ''}
${address?.street || ''}${address?.number ? `, ${address.number}` : ''}
${address?.complement ? `${address.complement}\n` : ''}${address?.neighborhood ? `${address.neighborhood}\n` : ''}CEP: ${address?.zipcode || ''} - ${address?.city || ''}/${address?.state || ''}
${address?.country || 'Brasil'}
${address?.cpf ? `CPF: ${address.cpf}` : ''}

📦 *Produtos:*
${productList}

💰 *TOTAL: ${formatBRL(order.amount)}*

🔗 Ver pedido: elitesurfing.com.br/seller/orders`;

  return message;
};

/**
 * Envia atualização de status para o admin
 * @param {Object} order - Pedido
 * @param {string} customerName - Nome do cliente
 * @param {string} newStatus - Novo status
 */
export const sendStatusUpdateToAdmin = async (order, customerName, newStatus) => {
  const statusEmojis = {
    'Order Placed': '📋',
    'Processing': '⚙️',
    'Shipped': '🚚',
    'Out for Delivery': '📦',
    'Delivered': '✅',
    'Cancelled': '❌',
  };

  const emoji = statusEmojis[newStatus] || '📋';
  const orderId = order._id.toString().slice(-8).toUpperCase();

  const message = `${emoji} *STATUS ATUALIZADO*

📋 Pedido: #${orderId}
👤 Cliente: ${customerName}
📊 Novo Status: *${newStatus}*
📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

  return await sendWhatsAppNotification(message);
};

export default { 
  sendWhatsAppNotification, 
  formatNewOrderMessage,
  sendStatusUpdateToAdmin 
};