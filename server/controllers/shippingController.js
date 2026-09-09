// server/controllers/shippingController.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING CONTROLLER — Endpoint de Cotação de Frete
// ═══════════════════════════════════════════════════════════════════════
// Recebe: CEP de destino + array de produtos (do carrinho)
// Retorna: Opções de frete com preço e prazo (via Melhor Envio)
// ✅ Lógica de FRETE GRÁTIS integrada
// ═══════════════════════════════════════════════════════════════════════

import { calculateShipping } from '../services/melhorEnvioService.js';
import {
  addOrderToMeCart,
  checkoutShipments,
  generateLabels,
  printLabels,
  getShipmentInfo,
  downloadLabelPdf,
  getMeWalletBalance,
  addMeWalletBalance,
  meDelay,
} from '../services/melhorEnvioLabelService.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Address from '../models/Address.js';

// =============================================================================
// HELPERS — REGIÃO, FRETE GRÁTIS
// =============================================================================

/**
 * Determina a região a partir do CEP (2 primeiros dígitos)
 * Sul/Sudeste: SP (01-19), RJ (20-28), ES (29), MG (30-39), PR (80-87), SC (88-89), RS (90-99)
 * Demais: tudo entre 40-79
 */
const getRegionFromCep = cep => {
  const prefix = parseInt(cep.substring(0, 2), 10);

  // Sudeste: SP (01-19), RJ (20-28), ES (29), MG (30-39)
  if (prefix >= 1 && prefix <= 39) return 'sul_sudeste';

  // Sul: PR (80-87), SC (88-89), RS (90-99)
  if (prefix >= 80 && prefix <= 99) return 'sul_sudeste';

  // Demais regiões: Norte, Nordeste, Centro-Oeste (40-79)
  return 'demais';
};

/**
 * Retorna o estado estimado a partir do CEP (para exibição)
 */
const getStateFromCep = cep => {
  const prefix = parseInt(cep.substring(0, 2), 10);
  if (prefix >= 1 && prefix <= 19) return 'SP';
  if (prefix >= 20 && prefix <= 28) return 'RJ';
  if (prefix === 29) return 'ES';
  if (prefix >= 30 && prefix <= 39) return 'MG';
  if (prefix >= 40 && prefix <= 48) return 'BA';
  if (prefix === 49) return 'SE';
  if (prefix >= 50 && prefix <= 56) return 'PE';
  if (prefix === 57) return 'AL';
  if (prefix === 58) return 'PB';
  if (prefix === 59) return 'RN';
  if (prefix >= 60 && prefix <= 63) return 'CE';
  if (prefix === 64) return 'PI';
  if (prefix === 65) return 'MA';
  if (prefix >= 66 && prefix <= 68) return 'PA';
  if (prefix === 69) return 'AM';
  if (prefix >= 70 && prefix <= 73) return 'DF';
  if (prefix >= 74 && prefix <= 76) return 'GO';
  if (prefix === 77) return 'TO';
  if (prefix >= 78 && prefix <= 78) return 'MT';
  if (prefix === 79) return 'MS';
  if (prefix >= 80 && prefix <= 87) return 'PR';
  if (prefix >= 88 && prefix <= 89) return 'SC';
  if (prefix >= 90 && prefix <= 99) return 'RS';
  return '';
};

/**
 * Threshold de frete grátis por região
 * Sul/Sudeste: R$ 199
 * Demais: R$ 299
 */
const FREE_SHIPPING_THRESHOLDS = {
  sul_sudeste: 199,
  demais: 299,
};

// =============================================================================
// POST /api/shipping/calculate
// =============================================================================

export const calculateShippingQuote = async (req, res) => {
  try {
    const { cep, products, product } = req.body;

    // 1. Validar CEP
    if (!cep) {
      return res.json({ success: false, message: 'CEP é obrigatório.' });
    }

    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return res.json({
        success: false,
        message: 'CEP inválido. Deve conter 8 dígitos.',
      });
    }

    // 2. Montar lista de produtos para cotação
    let productList = [];

    if (products && Array.isArray(products) && products.length > 0) {
      // ═══ MODO CARRINHO ═══
      const productIds = products.map(p => p.productId || p._id || p.id);
      const dbProducts = await Product.find({ _id: { $in: productIds } });

      if (dbProducts.length === 0) {
        return res.json({
          success: false,
          message: 'Nenhum produto encontrado.',
        });
      }

      productList = dbProducts.map(dbProduct => {
        const cartItem = products.find(
          p => String(p.productId || p._id || p.id) === String(dbProduct._id),
        );
        return {
          _id: dbProduct._id,
          weight: dbProduct.weight,
          dimensions: dbProduct.dimensions,
          offerPrice: dbProduct.offerPrice,
          quantity: cartItem?.quantity || 1,
        };
      });
    } else if (product) {
      // ═══ MODO PRODUTO INDIVIDUAL ═══
      if (product._id && product.weight && product.dimensions) {
        productList = [
          {
            _id: product._id,
            weight: product.weight,
            dimensions: product.dimensions,
            offerPrice: product.offerPrice || 0,
            quantity: product.quantity || 1,
          },
        ];
      } else if (product._id || product.productId) {
        const dbProduct = await Product.findById(
          product._id || product.productId,
        );
        if (!dbProduct) {
          return res.json({
            success: false,
            message: 'Produto não encontrado.',
          });
        }
        productList = [
          {
            _id: dbProduct._id,
            weight: dbProduct.weight,
            dimensions: dbProduct.dimensions,
            offerPrice: dbProduct.offerPrice,
            quantity: product.quantity || 1,
          },
        ];
      } else {
        return res.json({
          success: false,
          message: 'Dados do produto incompletos.',
        });
      }
    } else {
      return res.json({
        success: false,
        message: 'Informe os produtos para cálculo de frete.',
      });
    }

    // 3. Calcular subtotal dos produtos
    const subtotal = productList.reduce(
      (sum, p) => sum + p.offerPrice * p.quantity,
      0,
    );

    // 4. Determinar região e threshold de frete grátis
    const region = getRegionFromCep(cleanCep);
    const state = getStateFromCep(cleanCep);
    const threshold = FREE_SHIPPING_THRESHOLDS[region];
    const qualifiesFreeShipping = subtotal >= threshold;
    const amountToFreeShipping = Math.max(0, threshold - subtotal);

    console.log(
      `📦 Frete — CEP: ${cleanCep} | Estado: ${state} | Região: ${region} | Subtotal: R$${subtotal.toFixed(2)} | Threshold: R$${threshold} | Free: ${qualifiesFreeShipping}`,
    );

    // 5. Chamar serviço do Melhor Envio
    const result = await calculateShipping(cleanCep, productList);

    if (!result.success) {
      return res.json({ success: false, message: result.error });
    }

    // 6. Aplicar frete grátis nas opções (se qualificar)
    let options = result.options.map(option => {
      if (qualifiesFreeShipping) {
        return {
          ...option,
          originalPrice: option.price,
          price: 0,
          freeShipping: true,
          freeShippingReason: `Frete grátis para compras acima de R$ ${threshold}`,
        };
      }
      return {
        ...option,
        originalPrice: option.price,
        freeShipping: false,
      };
    });

    // 7. Retornar opções + metadata de frete grátis
    return res.json({
      success: true,
      origin: result.origin,
      destination: result.destination,
      options,
      // ═══ METADATA FRETE GRÁTIS ═══
      freeShippingInfo: {
        region,
        state,
        threshold,
        subtotal: parseFloat(subtotal.toFixed(2)),
        qualifies: qualifiesFreeShipping,
        amountRemaining: parseFloat(amountToFreeShipping.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('❌ Erro no cálculo de frete:', error.message);
    return res.json({
      success: false,
      message: 'Erro interno ao calcular frete. Tente novamente.',
    });
  }
};
// =============================================================================
// 🏷️ POST /api/shipping/label/process — Etiqueta Melhor Envio (authSeller)
// =============================================================================
// Fluxo completo em UM clique: carrinho → checkout → geração → impressão.
// RETOMÁVEL: cada etapa persiste o progresso em order.meStatus. Se parar
// (ex: saldo insuficiente), o próximo clique continua de onde parou —
// nunca insere/paga duas vezes.
//
// Body: { orderId, invoiceKey?, recipientDocument? }
//   - invoiceKey: chave da NF-e (44 dígitos) → envio COMERCIAL.
//     Sem invoiceKey → envio com Declaração de Conteúdo (DC-e automática).
//   - recipientDocument: CPF do destinatário, caso o pedido não tenha.
// =============================================================================

export const processShippingLabel = async (req, res) => {
  try {
    const { orderId, invoiceKey, recipientDocument } = req.body;

    if (!orderId) {
      return res.json({ success: false, message: 'orderId é obrigatório' });
    }

    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      return res.json({ success: false, message: 'Pedido não encontrado' });
    }

    const address = await Address.findById(order.address);
    if (!address) {
      return res.json({
        success: false,
        message: 'Endereço do pedido não encontrado',
      });
    }

    // Limpa erro anterior (novo processamento)
    order.meError = null;

    // ─── ETAPA 1: Inserir no carrinho ME (se ainda não foi) ─────────
    if (!order.meShipmentIds || order.meShipmentIds.length === 0) {
      const products = order.items
        .filter(item => item.product)
        .map(item => ({
          _id: item.product._id,
          name: item.product.name,
          offerPrice: item.product.offerPrice,
          quantity: item.quantity,
          weight: item.product.weight,
          dimensions: item.product.dimensions,
        }));

      if (products.length === 0) {
        return res.json({
          success: false,
          message: 'Pedido sem produtos válidos (produtos excluídos?)',
        });
      }

      const cartResult = await addOrderToMeCart({
        order,
        address,
        products,
        invoiceKey: invoiceKey || null,
        // Cascata de CPF: prompt do admin → CPF do pagamento (pedido) →
        // CPF do endereço (dentro do buildRecipient). Cobre pedidos
        // antigos criados antes do CPF ser obrigatório no checkout.
        recipientDocument: recipientDocument || order.customerDocument || null,
      });

      order.meShipmentIds = cartResult.shipmentIds;
      order.meStatus = 'cart';
      await order.save();

      if (cartResult.partial) {
        return res.json({
          success: false,
          meStatus: 'cart',
          message: `Apenas parte dos volumes entrou no carrinho ME (${cartResult.shipmentIds.length}). Erro: ${cartResult.error}. Verifique no painel do Melhor Envio.`,
        });
      }
    }

    // ─── ETAPA 2: Checkout (pagar com saldo da carteira ME) ─────────
    if (order.meStatus === 'cart') {
      await checkoutShipments(order.meShipmentIds);
      order.meStatus = 'paid';
      order.mePurchasedAt = new Date();
      await order.save();
    }

    // ─── ETAPA 3: Gerar etiqueta (processo assíncrono no ME) ────────
    if (order.meStatus === 'paid') {
      await generateLabels(order.meShipmentIds);
      order.meStatus = 'generated';
      await order.save();
      // Docs recomendam delay entre generate e print (geração assíncrona)
      await meDelay(2000);
    }

    // ─── ETAPA 4: URL de impressão do PDF ───────────────────────────
    // (sempre re-executa: gera URL fresca mesmo para reimpressão)
    const labelUrl = await printLabels(order.meShipmentIds);
    order.meLabelUrl = labelUrl;
    order.meStatus = 'printed';

    // ─── Código de rastreio (best-effort) ───────────────────────────
    if (!order.meTrackingCode) {
      const info = await getShipmentInfo(order.meShipmentIds[0]);
      if (info?.tracking) {
        order.meTrackingCode = info.tracking;
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: order.meTrackingCode
        ? `Etiqueta pronta! Rastreio: ${order.meTrackingCode}`
        : 'Etiqueta pronta para impressão!',
      labelUrl,
      trackingCode: order.meTrackingCode,
      meStatus: order.meStatus,
    });
  } catch (error) {
    console.error('❌ Erro ao processar etiqueta ME:', error.message);

    // Persiste o erro e o progresso já feito (fluxo retomável)
    try {
      const { orderId } = req.body;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { meError: error.message });
      }
    } catch (saveError) {
      console.error('   (falha ao salvar meError):', saveError.message);
    }

    return res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🏷️ POST /api/shipping/label/tracking — Atualizar rastreio (authSeller)
// =============================================================================
// Consulta o ME e atualiza o código de rastreio do pedido (o código pode
// demorar a existir — só aparece depois que a etiqueta é gerada/postada).
// =============================================================================

export const refreshLabelTracking = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order || !order.meShipmentIds?.length) {
      return res.json({
        success: false,
        message: 'Pedido sem etiqueta do Melhor Envio',
      });
    }

    const info = await getShipmentInfo(order.meShipmentIds[0]);
    if (!info) {
      return res.json({
        success: false,
        message: 'Não foi possível consultar a etiqueta no Melhor Envio',
      });
    }

    if (info.tracking && info.tracking !== order.meTrackingCode) {
      order.meTrackingCode = info.tracking;
      await order.save();
    }

    return res.json({
      success: true,
      trackingCode: order.meTrackingCode,
      meStatus: order.meStatus,
      remoteStatus: info.status,
    });
  } catch (error) {
    console.error('❌ Erro ao consultar rastreio:', error.message);
    return res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 🏷️ GET /api/shipping/label/pdf/:orderId — PDF da etiqueta (authSeller)
// =============================================================================
// Proxy do PDF: gera SEMPRE uma URL de impressão fresca no ME (URLs expiram),
// baixa o PDF no servidor e devolve os bytes ao painel. O admin visualiza a
// etiqueta DENTRO do painel, sem sessão do Melhor Envio no browser.
// =============================================================================

export const getLabelPdf = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order || !order.meShipmentIds?.length) {
      return res.status(404).json({
        success: false,
        message: 'Pedido sem etiqueta do Melhor Envio',
      });
    }

    if (!['generated', 'printed'].includes(order.meStatus)) {
      return res.status(409).json({
        success: false,
        message: `Etiqueta ainda não gerada (status: ${order.meStatus || 'nenhum'}). Clique em "Etiqueta ME" para concluir a compra.`,
      });
    }

    // URL fresca (reimpressão é gratuita e idempotente no ME)
    const labelUrl = await printLabels(order.meShipmentIds);
    if (labelUrl !== order.meLabelUrl) {
      order.meLabelUrl = labelUrl;
      await order.save();
    }

    const pdfBuffer = await downloadLabelPdf(labelUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="etiqueta-${String(order._id).slice(-8)}.pdf"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Erro ao servir PDF da etiqueta:', error.message);
    return res.status(502).json({ success: false, message: error.message });
  }
};

// =============================================================================
// 💰 GET /api/shipping/balance — Saldo da carteira ME (authSeller)
// =============================================================================

export const getMeBalance = async (req, res) => {
  try {
    const wallet = await getMeWalletBalance();
    return res.json({ success: true, ...wallet });
  } catch (error) {
    console.error('❌ Erro ao consultar saldo ME:', error.message);
    return res.json({ success: false, message: error.message });
  }
};

// =============================================================================
// 💰 POST /api/shipping/balance/add — Adicionar saldo via PIX/boleto (authSeller)
// =============================================================================
// Body: { value, slug? }  (slug: 'pix' padrão | 'boleto')
// Retorna o link do QR Code PIX (ou PDF do boleto) gerado pelo ME.
// =============================================================================

export const addMeBalance = async (req, res) => {
  try {
    const { value, slug } = req.body;

    const amount = Number(value);
    if (!amount || isNaN(amount) || amount < 5) {
      return res.json({
        success: false,
        message: 'Informe um valor válido (mínimo R$ 5,00).',
      });
    }
    if (amount > 10000) {
      return res.json({
        success: false,
        message: 'Valor máximo por recarga: R$ 10.000,00.',
      });
    }

    const method = slug === 'boleto' ? 'boleto' : 'pix';
    const result = await addMeWalletBalance(amount, method);

    // A resposta do ME traz o código PIX "copia e cola" (payload EMV, começa
    // com "000201") em `digitable`/`qr_code`, e opcionalmente uma URL de
    // pagamento/boleto. São coisas DIFERENTES: o código EMV não é um link e
    // nunca deve ser aberto como URL (causava aba em branco no painel).
    const isHttpUrl = v => typeof v === 'string' && /^https?:\/\//i.test(v);
    const isPixEmv = v => typeof v === 'string' && v.startsWith('000201');

    const paymentUrl =
      [
        result?.link,
        result?.url,
        result?.qr_code_url,
        result?.redirect,
        result?.transaction?.link,
      ].find(isHttpUrl) || null;

    const pixCode =
      [result?.digitable, result?.qr_code, result?.qrcode, result?.code].find(
        isPixEmv,
      ) || null;

    return res.json({
      success: true,
      message:
        method === 'pix'
          ? 'Cobrança PIX gerada! Escaneie o QR Code ou copie o código para pagar.'
          : 'Boleto gerado! O saldo credita após a compensação.',
      paymentUrl,
      pixCode,
      raw: result,
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar saldo ME:', error.message);
    return res.json({ success: false, message: error.message });
  }
};
