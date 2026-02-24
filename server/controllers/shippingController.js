// server/controllers/shippingController.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING CONTROLLER — Endpoint de Cotação de Frete
// ═══════════════════════════════════════════════════════════════════════
// Recebe: CEP de destino + array de produtos (do carrinho)
// Retorna: Opções de frete com preço e prazo (via Melhor Envio)
//
// Este endpoint é PÚBLICO (sem auth) — qualquer visitante pode
// calcular frete, inclusive guest checkout.
// ═══════════════════════════════════════════════════════════════════════

import { calculateShipping } from '../services/melhorEnvioService.js';
import Product from '../models/Product.js';

// =============================================================================
// POST /api/shipping/calculate
// =============================================================================
// Body esperado:
// {
//   "cep": "01310-100",
//   "products": [
//     { "productId": "665abc...", "quantity": 2 },
//     { "productId": "665def...", "quantity": 1 }
//   ]
// }
//
// OU (para cálculo rápido na página do produto, sem carrinho):
// {
//   "cep": "01310-100",
//   "product": {
//     "_id": "665abc...",
//     "weight": 300,
//     "dimensions": { "length": 30, "width": 20, "height": 2 },
//     "offerPrice": 89.90
//   }
// }
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
      // Buscar dados completos dos produtos no banco
      const productIds = products.map((p) => p.productId || p._id || p.id);
      const dbProducts = await Product.find({ _id: { $in: productIds } });

      if (dbProducts.length === 0) {
        return res.json({ success: false, message: 'Nenhum produto encontrado.' });
      }

      // Mapear quantidade de cada produto
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
      // Pode vir já com dados completos (da página do produto)
      // ou só com o ID (precisa buscar no banco)
      if (product._id && product.weight && product.dimensions) {
        // Dados já vieram do frontend
        productList = [{
          _id: product._id,
          weight: product.weight,
          dimensions: product.dimensions,
          offerPrice: product.offerPrice || 0,
          quantity: product.quantity || 1,
        }];
      } else if (product._id || product.productId) {
        // Buscar no banco
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

    // 3. Chamar serviço do Melhor Envio
    const result = await calculateShipping(cleanCep, productList);

    if (!result.success) {
      return res.json({ success: false, message: result.error });
    }

    // 4. Retornar opções de frete
    return res.json({
      success: true,
      origin: result.origin,
      destination: result.destination,
      options: result.options,
    });

  } catch (error) {
    console.error('❌ Erro no cálculo de frete:', error.message);
    return res.json({
      success: false,
      message: 'Erro interno ao calcular frete. Tente novamente.',
    });
  }
};