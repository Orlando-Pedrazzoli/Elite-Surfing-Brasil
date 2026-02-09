// server/emails/OrderConfirmationEmail.js
// VERSÃO BRASIL - Elite Surfing Brasil

const formatBRL = (value) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const createOrderEmailTemplate = (order, user, products, address) => {
  // Criar HTML dos items do pedido
  const itemsHTML = order.items
    .map(item => {
      const product = products.find(
        p => p._id.toString() === item.product.toString()
      );
      if (!product) return '';

      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 15px; text-align: left;">
            <strong>${product.name}</strong><br>
            <small style="color: #666;">Categoria: ${product.category}</small>
          </td>
          <td style="padding: 15px; text-align: center;">${item.quantity}</td>
          <td style="padding: 15px; text-align: right;">${formatBRL(product.offerPrice)}</td>
          <td style="padding: 15px; text-align: right; font-weight: bold;">${formatBRL(product.offerPrice * item.quantity)}</td>
        </tr>
      `;
    })
    .filter(Boolean)
    .join('');

  // Seção de desconto se aplicável
  const discountHTML = order.promoCode
    ? `
    <tr style="background: #f0f8ff; border-bottom: 1px solid #ddd;">
      <td colspan="3" style="padding: 15px; text-align: right; color: #2196f3; font-weight: bold;">
        Desconto (${order.promoCode} - ${order.discountPercentage}%):
      </td>
      <td style="padding: 15px; text-align: right; color: #2196f3; font-weight: bold; font-size: 16px;">
        -${formatBRL(order.discountAmount)}
      </td>
    </tr>
  `
    : '';

  // Template HTML completo
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Pedido</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Elite Surfing Brasil</h1>
        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Confirmação de Pedido</p>
      </div>

      <!-- Main Content -->
      <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
        
        <!-- Greeting -->
        <h2 style="color: #333; margin-bottom: 20px;">Olá ${user.name}! 👋</h2>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          Muito obrigado pela sua compra! O seu pedido foi processado com sucesso e está sendo preparado para envio.
        </p>

        <!-- Order Info -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #495057;">📋 Detalhes do Pedido</h3>
          <p style="margin: 5px 0;"><strong>Número do Pedido:</strong> #${order._id}</p>
          <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
          <p style="margin: 5px 0;"><strong>Método de Pagamento:</strong> Pagamento Online</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status === 'Order Placed' ? 'Pedido Realizado' : order.status}</p>
          ${order.promoCode ? `<p style="margin: 5px 0; color: #2196f3;"><strong>Cupom:</strong> ${order.promoCode} (${order.discountPercentage}% de desconto)</p>` : ''}
        </div>

        <!-- Items Table -->
        <h3 style="color: #333; margin-bottom: 15px;">🛒 Itens do Pedido</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #ddd;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Produto</th>
              <th style="padding: 15px; text-align: center; border-bottom: 2px solid #dee2e6;">Qtd</th>
              <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">Preço Unit.</th>
              <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            ${
              order.promoCode
                ? `
            <tr style="background: #f8f9fa;">
              <td colspan="3" style="padding: 15px; text-align: right; border-top: 1px solid #dee2e6;">
                <strong>Subtotal:</strong>
              </td>
              <td style="padding: 15px; text-align: right; border-top: 1px solid #dee2e6; font-size: 16px;">
                ${formatBRL(order.originalAmount)}
              </td>
            </tr>
            <tr style="background: #e3f2fd;">
              <td colspan="3" style="padding: 15px; text-align: right; color: #1976d2;">
                <strong>Desconto (${order.promoCode} - ${order.discountPercentage}%):</strong>
              </td>
              <td style="padding: 15px; text-align: right; color: #1976d2; font-size: 16px; font-weight: bold;">
                -${formatBRL(order.discountAmount)}
              </td>
            </tr>
            `
                : ''
            }
            <tr style="background: #f8f9fa; font-weight: bold;">
              <td colspan="3" style="padding: 15px; text-align: right; border-top: 2px solid #dee2e6;">
                <strong>Total do Pedido:</strong>
              </td>
              <td style="padding: 15px; text-align: right; border-top: 2px solid #dee2e6; color: #28a745; font-size: 18px;">
                ${formatBRL(order.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- Shipping Address -->
        ${
          address
            ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #495057;">🏠 Endereço de Entrega</h3>
          <p style="margin: 0; line-height: 1.5;">
            ${address.firstName} ${address.lastName}<br>
            ${address.street}${address.number ? `, ${address.number}` : ''}<br>
            ${address.complement ? `${address.complement}<br>` : ''}
            ${address.neighborhood ? `${address.neighborhood}<br>` : ''}
            ${address.city} - ${address.state}<br>
            CEP: ${address.zipcode}<br>
            ${address.country}<br>
            <br>
            📧 ${address.email}<br>
            📱 ${address.phone}
            ${address.cpf ? `<br>CPF: ${address.cpf}` : ''}
          </p>
        </div>
        `
            : ''
        }

        <!-- Next Steps -->
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #1976d2;">📦 Próximos Passos</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Vamos processar e preparar o seu pedido</li>
            <li style="margin-bottom: 8px;">Você receberá um email de confirmação de envio com o código de rastreamento</li>
            <li style="margin-bottom: 8px;">O prazo estimado de entrega é de 3-10 dias úteis</li>
          </ul>
        </div>

        <!-- Promo Code Success Message -->
        ${
          order.promoCode
            ? `
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #2e7d32;">🎉 Desconto Aplicado</h3>
          <p style="margin: 0; color: #2e7d32;">
            Parabéns! Você economizou <strong>${formatBRL(order.discountAmount)}</strong> com o cupom <strong>${order.promoCode}</strong>!
          </p>
        </div>
        `
            : ''
        }

        <!-- Contact Info -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px 0; color: #666;">
            Tem alguma dúvida sobre o seu pedido?
          </p>
          <p style="margin: 0; color: #666;">
            Fale conosco: <a href="mailto:contato@elitesurfing.com.br" style="color: #667eea;">contato@elitesurfing.com.br</a>
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          Obrigado por escolher a Elite Surfing Brasil! 🏄‍♂️<br>
          <a href="https://elitesurfing.com.br" style="color: #667eea;">www.elitesurfing.com.br</a>
        </p>
      </div>

    </body>
    </html>
  `;
};

export default { createOrderEmailTemplate };