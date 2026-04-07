/**
 * ═══════════════════════════════════════════════════════════════
 * catalogController.js — API de catálogo para parceiros
 * ═══════════════════════════════════════════════════════════════
 *
 * Endpoints read-only que expõem o catálogo da Elite Surfing
 * para lojas parceiras (ex: Rio Surf Shop via WooCommerce).
 *
 * Todos os endpoints requerem autenticação via authPartner.
 *
 * Endpoints:
 *   GET /api/v1/catalog/products      → catálogo paginado
 *   GET /api/v1/catalog/products/:id  → produto individual
 *   GET /api/v1/catalog/categories    → categorias com contagem
 *   GET /api/v1/catalog/stock         → stock resumido (leve)
 *
 * Segurança aplicada:
 *   - Validação e sanitização de todos os query params
 *   - Projeção de campos controlada (whitelist)
 *   - Paginação com limites (max 500/página)
 *   - Preços ajustados pelo modificador do parceiro
 *   - Campos internos removidos da resposta
 *   - .lean() em todas as queries (performance)
 * ═══════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import Product from '../models/Product.js';

// ═══════════════════════════════════════════════════════════════
// CAMPOS PERMITIDOS NA PROJEÇÃO
// ═══════════════════════════════════════════════════════════════
// Só estes campos podem ser pedidos via ?fields=xxx,yyy
// Isto impede acesso a campos internos do MongoDB
const ALLOWED_FIELDS = new Set([
  'name',
  'sku',
  'description',
  'price',
  'offerPrice',
  'image',
  'video',
  'category',
  'group',
  'tags',
  'inStock',
  'stock',
  'weight',
  'dimensions',
  'productFamily',
  'variantType',
  'color',
  'colorCode',
  'size',
  'isMainVariant',
  'freeShipping',
  'filters',
]);

// ═══════════════════════════════════════════════════════════════
// HELPERS DE VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitiza string para uso em queries MongoDB
 * Remove caracteres especiais que poderiam causar injection
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[^\w\-.\s]/g, '')
    .trim()
    .substring(0, 100);
}

/**
 * Valida e converte para inteiro dentro de um range
 */
function safeInt(value, min, max, fallback) {
  const num = parseInt(value);
  if (isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/**
 * Valida se é um ObjectId válido do MongoDB
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/catalog/products
// ═══════════════════════════════════════════════════════════════
/**
 * Retorna catálogo paginado com filtros opcionais.
 *
 * Query params:
 *   category     → filtrar por categoria (ex: "Deck-Hawaii")
 *   group        → filtrar por grupo (ex: "decks", "leashes")
 *   tag          → filtrar por tag (ex: "sup", "bodyboard")
 *   inStock      → "true" para só produtos em stock
 *   updatedSince → ISO date, retorna só alterados desde esta data
 *   page         → página (default: 1)
 *   limit        → itens por página (default: 100, max: 500)
 *   fields       → campos específicos (comma-separated)
 *
 * Resposta inclui paginação e metadata.
 */
export const getCatalogProducts = async (req, res) => {
  try {
    const partner = req.partner;
    const {
      category,
      group,
      tag,
      inStock,
      updatedSince,
      page = 1,
      limit = 100,
      fields,
    } = req.query;

    // ── Construir query com validação ──────────────────────────
    const query = {};

    if (category) {
      query.category = sanitizeString(category);
    }
    if (group) {
      query.group = sanitizeString(group);
    }
    if (tag) {
      query.tags = sanitizeString(tag);
    }
    if (inStock === 'true') {
      query.inStock = true;
    }

    // Sync incremental: só produtos alterados desde uma data
    if (updatedSince) {
      const sinceDate = new Date(updatedSince);
      if (!isNaN(sinceDate.getTime())) {
        query.updatedAt = { $gte: sinceDate };
      }
    }

    // ── Paginação segura ───────────────────────────────────────
    const pageNum = safeInt(page, 1, 1000, 1);
    const limitNum = safeInt(limit, 1, 500, 100);
    const skip = (pageNum - 1) * limitNum;

    // ── Projeção de campos (whitelist) ─────────────────────────
    let projection = null;
    if (fields && typeof fields === 'string') {
      projection = {};
      fields.split(',').forEach(f => {
        const field = f.trim();
        if (ALLOWED_FIELDS.has(field)) {
          projection[field] = 1;
        }
      });
      // Se nenhum campo válido, ignorar projeção
      if (Object.keys(projection).length === 0) {
        projection = null;
      }
    }

    // ── Executar queries em paralelo ───────────────────────────
    const [products, total] = await Promise.all([
      Product.find(query, projection)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    // ── Formatar resposta ──────────────────────────────────────
    const catalogProducts = products.map(p =>
      formatProductForPartner(p, partner),
    );

    res.json({
      success: true,
      data: {
        products: catalogProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: skip + limitNum < total,
        },
        meta: {
          generatedAt: new Date().toISOString(),
          currency: 'BRL',
          partner: partner.storeName,
        },
      },
    });
  } catch (error) {
    console.error('getCatalogProducts error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar catálogo.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/catalog/products/:id
// ═══════════════════════════════════════════════════════════════
/**
 * Retorna um produto específico pelo MongoDB ObjectId.
 */
export const getCatalogProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ObjectId (previne erros de cast e queries inválidas)
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de produto inválido.',
      });
    }

    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado.',
      });
    }

    res.json({
      success: true,
      data: {
        product: formatProductForPartner(product, req.partner),
        meta: {
          generatedAt: new Date().toISOString(),
          currency: 'BRL',
        },
      },
    });
  } catch (error) {
    console.error('getCatalogProductById error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar produto.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/catalog/categories
// ═══════════════════════════════════════════════════════════════
/**
 * Retorna lista de categorias com contagem de produtos em stock.
 * Útil para a loja parceira criar as categorias automaticamente.
 */
export const getCatalogCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { inStock: true } },
      {
        $group: {
          _id: { category: '$category', group: '$group' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.group': 1, '_id.category': 1 } },
    ]);

    const formatted = categories.map(c => ({
      category: c._id.category,
      group: c._id.group,
      productCount: c.count,
    }));

    res.json({
      success: true,
      data: {
        categories: formatted,
        total: formatted.length,
      },
    });
  } catch (error) {
    console.error('getCatalogCategories error:', error.message);
    res
      .status(500)
      .json({ success: false, error: 'Erro ao buscar categorias.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/catalog/stock
// ═══════════════════════════════════════════════════════════════
/**
 * Endpoint LEVE — retorna apenas SKU, stock e preço.
 * Ideal para sincronizações frequentes (a cada 1h).
 *
 * O plugin WooCommerce usa este endpoint no cron horário
 * para atualizar stock sem precisar baixar o catálogo inteiro.
 */
export const getCatalogStock = async (req, res) => {
  try {
    const partner = req.partner;
    const priceModifier = 1 + (partner.priceModifierPercent || 0) / 100;

    const products = await Product.find(
      {},
      { sku: 1, stock: 1, inStock: 1, offerPrice: 1, price: 1 },
    ).lean();

    const stockData = products.map(p => ({
      id: p._id,
      sku: p.sku || null,
      stock: p.stock,
      inStock: p.inStock,
      // Preço já com modificador do parceiro
      price: partner.permissions?.prices
        ? roundPrice((p.offerPrice || p.price) * priceModifier)
        : null,
    }));

    res.json({
      success: true,
      data: {
        products: stockData,
        total: stockData.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('getCatalogStock error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao buscar stock.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Formatar produto para resposta ao parceiro
// ═══════════════════════════════════════════════════════════════
/**
 * Transforma um documento Product do MongoDB no formato da API.
 *
 * O que faz:
 *   - Aplica modificador de preço do parceiro
 *   - Remove campos internos (displayOrder, colorCode2, etc.)
 *   - Respeita permissões (se !prices, retorna null)
 *   - Converte description de array para string
 *   - Retorna formato limpo e consistente
 */
function formatProductForPartner(product, partner) {
  const priceModifier = 1 + (partner.priceModifierPercent || 0) / 100;

  return {
    // Identificação
    id: product._id,
    sku: product.sku || null,
    name: product.name,
    description: Array.isArray(product.description)
      ? product.description.join('\n')
      : product.description || '',

    // Categorização
    category: product.category,
    group: product.group,
    tags: product.tags || [],

    // Preços (com modificador do parceiro)
    price: partner.permissions?.prices
      ? roundPrice(product.price * priceModifier)
      : null,
    salePrice: partner.permissions?.prices
      ? roundPrice((product.offerPrice || product.price) * priceModifier)
      : null,

    // Stock
    stock: partner.permissions?.stock ? product.stock : null,
    inStock: product.inStock,

    // Media
    images: partner.permissions?.images ? product.image || [] : [],
    video: partner.permissions?.images ? product.video || null : null,

    // Variantes
    productFamily: product.productFamily || null,
    variantType: product.variantType || 'color',
    color: product.color || null,
    colorCode: product.colorCode || null,
    size: product.size || null,
    isMainVariant: product.isMainVariant !== false,

    // Shipping
    weight: product.weight || null,
    dimensions: product.dimensions || null,
    freeShipping: product.freeShipping || false,

    // Filtros customizados
    filters: product.filters || {},

    // Timestamps
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function roundPrice(value) {
  if (!value || isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}
