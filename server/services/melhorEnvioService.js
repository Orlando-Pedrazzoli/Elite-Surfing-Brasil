// server/services/melhorEnvioService.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 MELHOR ENVIO — SERVIÇO DE INTEGRAÇÃO COM API
// ═══════════════════════════════════════════════════════════════════════
// Responsabilidades:
//   1. Cotação de frete (calcular preços e prazos)
//   2. Formatação de resposta para o frontend
//
// Documentação oficial: https://docs.melhorenvio.com.br
// Endpoint: POST /api/v2/me/shipment/calculate
// ═══════════════════════════════════════════════════════════════════════

import axios from 'axios';

// ─── Configuração ──────────────────────────────────────────────────────
const MELHOR_ENVIO_URL = process.env.MELHOR_ENVIO_URL || 'https://www.melhorenvio.com.br';
const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;
const ORIGIN_CEP = (process.env.ORIGIN_CEP || '22790-702').replace(/\D/g, '');

// IDs dos serviços do Melhor Envio (transportadoras)
// Referência: https://docs.melhorenvio.com.br/reference/listar-servicos
const SERVICES = {
  // Correios
  1: { name: 'PAC', carrier: 'Correios', icon: '📦' },
  2: { name: 'SEDEX', carrier: 'Correios', icon: '🚀' },
  17: { name: 'Mini Envios', carrier: 'Correios', icon: '✉️' },
  // Jadlog
  3: { name: '.Package', carrier: 'Jadlog', icon: '📦' },
  4: { name: '.Com', carrier: 'Jadlog', icon: '🚀' },
  // Via Brasil (Rodoviário)
  9: { name: 'Rodoviário', carrier: 'Via Brasil', icon: '🚛' },
  // Azul Cargo
  15: { name: 'Amanhã', carrier: 'Azul Cargo', icon: '✈️' },
  16: { name: 'E-commerce', carrier: 'Azul Cargo', icon: '📦' },
  // Latam Cargo
  12: { name: 'LATAM Juntos', carrier: 'LATAM Cargo', icon: '✈️' },
  // Buslog
  14: { name: 'Rodoviário', carrier: 'Buslog', icon: '🚛' },
};

// ─── Validações ────────────────────────────────────────────────────────

/**
 * Verifica se o token do Melhor Envio está configurado
 */
const validateConfig = () => {
  if (!MELHOR_ENVIO_TOKEN) {
    throw new Error('MELHOR_ENVIO_TOKEN não configurado no .env');
  }
  if (!ORIGIN_CEP || ORIGIN_CEP.length !== 8) {
    throw new Error('ORIGIN_CEP inválido no .env');
  }
};

/**
 * Valida formato do CEP (8 dígitos)
 */
const isValidCep = (cep) => {
  const clean = String(cep).replace(/\D/g, '');
  return clean.length === 8;
};

// ─── Funções Auxiliares ────────────────────────────────────────────────

/**
 * Converte peso de gramas para quilogramas
 * A API do Melhor Envio exige peso em KG
 * O Product model armazena em gramas
 */
const gramsToKg = (grams) => {
  const kg = Number(grams) / 1000;
  // Peso mínimo aceite pela API: 0.001 kg (1 grama)
  // Peso mínimo prático para envio: 0.3 kg (300g)
  return Math.max(kg, 0.3);
};

/**
 * Garante que dimensão tem valor mínimo aceitável pela API
 * Mínimo Melhor Envio: 1 cm para cada dimensão
 * Mínimos práticos para acessórios de surf:
 *   - Deck: ~30x20x1 cm
 *   - Leash: ~30x10x3 cm
 *   - Capa: ~60x30x5 cm
 */
const ensureMinDimension = (value, minValue = 11) => {
  const num = Number(value);
  return num > 0 ? num : minValue;
};

// ─── Função Principal: Cotação ─────────────────────────────────────────

/**
 * Calcula frete via API do Melhor Envio
 *
 * @param {string} destinationCep - CEP de destino (com ou sem máscara)
 * @param {Array} products - Array de produtos do carrinho
 *   Cada produto: { _id, name, weight (gramas), dimensions { length, width, height (cm) }, offerPrice, quantity }
 * @returns {Object} { success, options[], origin, destination }
 */
const calculateShipping = async (destinationCep, products) => {
  // 1. Validações
  validateConfig();

  const cleanCep = String(destinationCep).replace(/\D/g, '');
  if (!isValidCep(cleanCep)) {
    return { success: false, error: 'CEP de destino inválido. Verifique e tente novamente.' };
  }

  if (!products || products.length === 0) {
    return { success: false, error: 'Nenhum produto informado para cálculo de frete.' };
  }

  // 2. Montar payload dos produtos
  // Formato exigido pela API: dimensões em cm, peso em kg, valor em R$
  const formattedProducts = products.map((product) => ({
    id: String(product._id || product.id),
    width: ensureMinDimension(product.dimensions?.width, 11),
    height: ensureMinDimension(product.dimensions?.height, 2),
    length: ensureMinDimension(product.dimensions?.length, 16),
    weight: gramsToKg(product.weight),
    insurance_value: Number(product.offerPrice || product.price || 0),
    quantity: Number(product.quantity || 1),
  }));

  // 3. Payload da requisição
  const payload = {
    from: { postal_code: ORIGIN_CEP },
    to: { postal_code: cleanCep },
    products: formattedProducts,
  };

  // 4. Chamar API do Melhor Envio
  console.log('📦 Melhor Envio — Cotação de frete');
  console.log('   Origem:', ORIGIN_CEP);
  console.log('   Destino:', cleanCep);
  console.log('   Produtos:', formattedProducts.length);

  try {
    const response = await axios.post(
      `${MELHOR_ENVIO_URL}/api/v2/me/shipment/calculate`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Elite Surfing Brasil (elitesurfingrj@yahoo.com.br)',
        },
        timeout: 15000, // 15 segundos timeout
      }
    );

    // 5. Processar resposta
    const quotes = response.data;

    if (!Array.isArray(quotes)) {
      console.error('❌ Resposta inesperada da API:', response.data);
      return { success: false, error: 'Erro ao consultar frete. Tente novamente.' };
    }

    // 6. Filtrar e formatar opções válidas (sem erro)
    const options = quotes
      .filter((quote) => !quote.error) // Remove transportadoras com erro
      .map((quote) => {
        const serviceInfo = SERVICES[quote.id] || {
          name: quote.name,
          carrier: quote.company?.name || 'Transportadora',
          icon: '📦',
        };

        return {
          id: quote.id,
          name: quote.name || serviceInfo.name,
          carrier: quote.company?.name || serviceInfo.carrier,
          icon: serviceInfo.icon,
          price: Number(quote.custom_price || quote.price),
          deliveryDays: Number(quote.custom_delivery_time || quote.delivery_time),
          deliveryText: `${quote.custom_delivery_time || quote.delivery_time} dias úteis`,
          // Dados extras (úteis para compra de etiqueta depois)
          serviceId: quote.id,
          companyId: quote.company?.id,
          companyName: quote.company?.name,
          companyPicture: quote.company?.picture,
        };
      })
      .sort((a, b) => a.price - b.price); // Ordena por preço (mais barato primeiro)

    if (options.length === 0) {
      console.warn('⚠️ Nenhuma opção de frete disponível para CEP:', cleanCep);
      return {
        success: false,
        error: 'Não há opções de frete disponíveis para este CEP. Verifique o endereço ou entre em contato.',
      };
    }

    console.log(`✅ Melhor Envio — ${options.length} opções encontradas`);
    options.forEach((opt) => {
      console.log(`   ${opt.icon} ${opt.carrier} ${opt.name}: R$ ${opt.price.toFixed(2)} (${opt.deliveryDays} dias)`);
    });

    return {
      success: true,
      origin: ORIGIN_CEP,
      destination: cleanCep,
      options,
    };

  } catch (error) {
    // 7. Tratamento de erros específicos da API
    console.error('❌ Melhor Envio — Erro na cotação:', error.message);

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      console.error('   Status:', status);
      console.error('   Data:', JSON.stringify(data));

      if (status === 401) {
        return { success: false, error: 'Erro de autenticação com a transportadora. Contate o suporte.' };
      }
      if (status === 422) {
        return { success: false, error: 'Dados inválidos para cálculo de frete. Verifique o CEP.' };
      }
      if (status === 429) {
        return { success: false, error: 'Muitas consultas. Aguarde um momento e tente novamente.' };
      }
    }

    if (error.code === 'ECONNABORTED') {
      return { success: false, error: 'Tempo esgotado ao consultar frete. Tente novamente.' };
    }

    return { success: false, error: 'Erro ao calcular frete. Tente novamente em instantes.' };
  }
};

// ─── Exports ───────────────────────────────────────────────────────────
export { calculateShipping, isValidCep, ORIGIN_CEP };