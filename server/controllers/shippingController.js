// server/controllers/shippingController.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING CONTROLLER — Endpoint de Cotação de Frete
// ═══════════════════════════════════════════════════════════════════════
// Recebe: CEP de destino + array de produtos (do carrinho)
// Retorna: Opções de frete com preço e prazo (via Melhor Envio)
// ✅ Lógica de FRETE GRÁTIS integrada
// ═══════════════════════════════════════════════════════════════════════

import { calculateShipping } from '../services/melhorEnvioService.js';
import Product from '../models/Product.js';

// =============================================================================
// HELPERS — REGIÃO, FRETE GRÁTIS
// =============================================================================

/**
 * Determina a região a partir do CEP (2 primeiros dígitos)
 * Sul/Sudeste: SP (01-19), RJ (20-28), ES (29), MG (30-39), PR (80-87), SC (88-89), RS (90-99)
 * Demais: tudo entre 40-79
 */
const getRegionFromCep = (cep) => {
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
const getStateFromCep = (cep) => {
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
      return res.json({ success: false, message: 'CEP inválido. Deve conter 8 dígitos.' });
    }

    // 2. Montar lista de produtos para cotação
    let productList = [];

    if (products && Array.isArray(products) && products.length > 0) {
      // ═══ MODO CARRINHO ═══
      const productIds = products.map((p) => p.productId || p._id || p.id);
      const dbProducts = await Product.find({ _id: { $in: productIds } });

      if (dbProducts.length === 0) {
        return res.json({ success: false, message: 'Nenhum produto encontrado.' });
      }

      productList = dbProducts.map((dbProduct) => {
        const cartItem = products.find(
          (p) => String(p.productId || p._id || p.id) === String(dbProduct._id)
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
        productList = [{
          _id: product._id,
          weight: product.weight,
          dimensions: product.dimensions,
          offerPrice: product.offerPrice || 0,
          quantity: product.quantity || 1,
        }];
      } else if (product._id || product.productId) {
        const dbProduct = await Product.findById(product._id || product.productId);
        if (!dbProduct) {
          return res.json({ success: false, message: 'Produto não encontrado.' });
        }
        productList = [{
          _id: dbProduct._id,
          weight: dbProduct.weight,
          dimensions: dbProduct.dimensions,
          offerPrice: dbProduct.offerPrice,
          quantity: product.quantity || 1,
        }];
      } else {
        return res.json({ success: false, message: 'Dados do produto incompletos.' });
      }

    } else {
      return res.json({ success: false, message: 'Informe os produtos para cálculo de frete.' });
    }

    // 3. Calcular subtotal dos produtos
    const subtotal = productList.reduce((sum, p) => sum + (p.offerPrice * p.quantity), 0);

    // 4. Determinar região e threshold de frete grátis
    const region = getRegionFromCep(cleanCep);
    const state = getStateFromCep(cleanCep);
    const threshold = FREE_SHIPPING_THRESHOLDS[region];
    const qualifiesFreeShipping = subtotal >= threshold;
    const amountToFreeShipping = Math.max(0, threshold - subtotal);

    console.log(`📦 Frete — CEP: ${cleanCep} | Estado: ${state} | Região: ${region} | Subtotal: R$${subtotal.toFixed(2)} | Threshold: R$${threshold} | Free: ${qualifiesFreeShipping}`);

    // 5. Chamar serviço do Melhor Envio
    const result = await calculateShipping(cleanCep, productList);

    if (!result.success) {
      return res.json({ success: false, message: result.error });
    }

    // 6. Aplicar frete grátis nas opções (se qualificar)
    let options = result.options.map((option) => {
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