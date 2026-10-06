// server/controllers/productController.js
import { v2 as cloudinary } from 'cloudinary';
import {
  setPublicCatalogCache,
  purgeCatalogCache,
} from '../utils/catalogCache.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';

// ═══════════════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════════════

const setNoCacheHeaders = res => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, max-age=0',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};

const setMutationHeaders = res => {
  setNoCacheHeaders(res);
  res.setHeader('Surrogate-Control', 'no-store');
};

// ═══════════════════════════════════════════════════════════════════════
// 🔧 FIX SKU — helpers
// ═══════════════════════════════════════════════════════════════════════
// sanitizeSku: retorna o SKU limpo (trim + uppercase) ou null se vazio.
// O campo NUNCA deve ser gravado como null no documento (índice sparse
// indexa null explícito → E11000 no 2º produto sem SKU).
const sanitizeSku = value => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
};

// friendlyError: traduz erros técnicos do Mongo em mensagens legíveis
// para o admin, em vez de mostrar "E11000 duplicate key error..." no toast.
const friendlyError = error => {
  if (error?.code === 11000) {
    const dupField = Object.keys(error.keyPattern || {})[0];
    if (dupField === 'sku') {
      return 'Já existe um produto com este SKU. Use um código diferente.';
    }
    return 'Já existe um registro com este valor único.';
  }
  if (error?.name === 'CastError') {
    return 'ID de produto inválido.';
  }
  if (error?.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return first?.message || 'Dados do produto inválidos.';
  }
  return error?.message || 'Erro interno';
};

// ═══════════════════════════════════════════════════════════════════════
// 🔧 FIX: validação server-side — antes a API confiava 100% no frontend
// (JSON.parse direto e gravação sem checagem). Agora dados malformados
// são barrados com mensagem clara antes de tocar no banco/Cloudinary.
// ═══════════════════════════════════════════════════════════════════════
const parseProductData = raw => {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'Dados do produto malformados' };
    }
    return { data: parsed };
  } catch {
    return { error: 'Dados do produto malformados' };
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 CUSTO e PREÇO DE TABELA — helpers
// ═══════════════════════════════════════════════════════════════════════
// parseOptionalMoney: normaliza um valor monetário OPCIONAL vindo do frontend.
//   - undefined         → undefined (campo não enviado: não mexer no doc)
//   - null / ''         → null      (admin apagou o valor)
//   - número >= 0       → número arredondado a 2 casas
//   - qualquer outro    → { error }
const parseOptionalMoney = (value, errorMessage) => {
  if (value === undefined) return { value: undefined };
  if (value === null || value === '') return { value: null };
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return { error: errorMessage };
  }
  return { value: Math.round(num * 100) / 100 };
};

// Custo real pago ao fornecedor (privado)
const parseCostPrice = value =>
  parseOptionalMoney(value, 'Custo do produto inválido');

// Preço de tabela pago pelos lojistas (privado)
const parseWholesalePrice = value =>
  parseOptionalMoney(value, 'Preço de tabela inválido');

// ═══════════════════════════════════════════════════════════════════════
// 🆕 PREÇO "DE" (riscado) — agora opcional no admin
// ═══════════════════════════════════════════════════════════════════════
// O formulário de precificação passou a ser Custo / Tabela / Venda; o
// preço "de" virou um campo opcional de promoção. Quando o admin não o
// preenche (undefined, null ou ''), o produto é vendido sem preço riscado:
// gravamos price = offerPrice (o schema continua exigindo `price`, e a
// loja só risca quando price > offerPrice).
const resolveOriginalPrice = productData => {
  const raw = productData.price;
  if (raw === undefined || raw === null || raw === '') {
    return Number(productData.offerPrice);
  }
  return Number(raw);
};

const validateProductData = productData => {
  const name = String(productData.name || '').trim();
  if (!name) return 'Nome do produto é obrigatório';
  if (name.length > 200) return 'Nome do produto muito longo (máx. 200)';

  if (!productData.group) return 'Grupo é obrigatório';
  if (!productData.category) return 'Categoria é obrigatória';

  const offerPrice = Number(productData.offerPrice);
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    return 'Preço de venda inválido';
  }
  // Preço "de" é opcional: vazio → assume o preço de venda (sem riscado)
  const price = resolveOriginalPrice(productData);
  if (!Number.isFinite(price) || price <= 0) {
    return 'Preço "de" (riscado) inválido';
  }
  if (offerPrice > price) {
    return 'Preço de venda não pode ser maior que o preço "de" (riscado)';
  }

  // 🆕 Custo é opcional, mas se vier tem de ser um número >= 0.
  // Vender abaixo do custo NÃO é bloqueado (pode ser queima de estoque
  // intencional) — o admin vê o alerta de margem negativa na UI.
  const cost = parseCostPrice(productData.costPrice);
  if (cost.error) return cost.error;

  // 🆕 Preço de tabela (lojistas) é opcional, mas se vier tem de ser >= 0.
  // Tabela abaixo do custo ou acima do preço do site NÃO é bloqueada —
  // o admin vê o alerta na UI e decide.
  const wholesale = parseWholesalePrice(productData.wholesalePrice);
  if (wholesale.error) return wholesale.error;

  const stock = Number(productData.stock);
  if (!Number.isFinite(stock) || stock < 0) return 'Estoque inválido';

  if (
    productData.description !== undefined &&
    !Array.isArray(productData.description)
  ) {
    return 'Descrição inválida';
  }

  return null; // ok
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 isAdminRequest — identifica se quem chama é admin/seller
// ═══════════════════════════════════════════════════════════════════════
// Regra (padrão Shopify / WooCommerce):
//   - Admin vê TUDO (drafts, esgotados, tudo)
//   - Público só vê produtos com inStock !== false (= "publicados")
//   - inStock === true + stock === 0  → aparece como "Esgotado"
//   - inStock === false                → Draft (não aparece publicamente)
//
// 🔧 06/10/2026 — FIX: admin = JWT do seller VERIFICADO.
// Antes bastava o pedido trazer um header Authorization, x-seller-token
// (com qualquer valor) ou ?all=true. Como a loja envia Authorization para
// todos os clientes logados, um cliente com sessão recebia rascunhos e
// todas as variantes como produtos soltos (52 em vez de 18 num teste), e
// qualquer pessoa via rascunhos acrescentando ?all=true ao URL.
// O painel admin não muda: envia sempre o token do seller (cookie no
// desktop, header x-seller-token no Safari/iOS).
// ═══════════════════════════════════════════════════════════════════════
const isAdminRequest = req => isSellerAuthenticated(req);

// "Dica" NÃO verificada de que o pedido vem do painel admin ou de um
// utilizador logado. Não dá acesso a nada — serve só para nunca guardar
// estas respostas em cache (cada uma pode ser diferente da pública).
const hasAdminHint = req => {
  return (
    !!req.headers['x-seller-token'] ||
    !!req.headers['authorization'] ||
    req.query.all === 'true'
  );
};

const mustNotCache = (req, admin) => admin || hasAdminHint(req);

// ═══════════════════════════════════════════════════════════════════════
// 🆕 isSellerAuthenticated — verifica DE FACTO o JWT do seller
// ═══════════════════════════════════════════════════════════════════════
// Usado por isAdminRequest (visibilidade de rascunhos) e para decidir quem
// recebe custo e preço de tabela.
// O custo do produto só é devolvido quando este helper confirma o token
// (mesma lógica do middleware authSeller: cookie primeiro, header depois).
// Nunca lança: em rota pública, token inválido = simplesmente não é seller.
// ═══════════════════════════════════════════════════════════════════════
const isSellerAuthenticated = req => {
  const token = req.cookies?.sellerToken || req.headers['x-seller-token'];
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return !!decoded?.email && decoded.email === process.env.SELLER_EMAIL;
  } catch {
    return false;
  }
};

// Aplica `.select('+costPrice +wholesalePrice')` à query apenas para o
// seller autenticado — custo e preço de tabela são `select: false` no schema
// e nunca saem na API pública.
const withPrivatePricingIfSeller = (query, seller) =>
  seller ? query.select('+costPrice +wholesalePrice') : query;

// Add Product : /api/product/add
export const addProduct = async (req, res) => {
  try {
    setMutationHeaders(res);

    // 🔧 FIX: parse seguro + validação ANTES de subir qualquer arquivo
    // ao Cloudinary (evita assets órfãos quando os dados são inválidos)
    const parsed = parseProductData(req.body.productData);
    if (parsed.error) {
      return res.json({ success: false, message: parsed.error });
    }
    let productData = parsed.data;

    const validationError = validateProductData(productData);
    if (validationError) {
      return res.json({ success: false, message: validationError });
    }

    const images = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;

    let imagesUrl = await Promise.all(
      images.map(async item => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
        });
        return result.secure_url;
      }),
    );

    let videoUrl = null;
    if (videoFile) {
      const videoResult = await cloudinary.uploader.upload(videoFile.path, {
        resource_type: 'video',
        folder: 'products/videos',
      });
      videoUrl = videoResult.secure_url;
    }

    const stock = productData.stock || 0;

    // 🆕 Novos produtos nascem ATIVOS (publicados) — mantém comportamento
    // atual do admin. Se o admin quiser despublicar para terminar de cadastrar
    // (ex: faltam imagens), usa o toggle de Status na Lista de Produtos.
    // Se o payload enviar inStock explicitamente, respeita o valor enviado.
    const inStock =
      productData.inStock !== undefined ? productData.inStock : true;

    // 🔧 FIX SKU: nunca gravar sku: null — se vazio, o campo fica ausente
    // (o índice sparse ignora documentos sem o campo, mas indexa null).
    const cleanSku = sanitizeSku(productData.sku);
    delete productData.sku;

    // 🆕 Custo e preço de tabela normalizados (já validados em
    // validateProductData)
    const { value: costPrice } = parseCostPrice(productData.costPrice);
    delete productData.costPrice;
    const { value: wholesalePrice } = parseWholesalePrice(
      productData.wholesalePrice,
    );
    delete productData.wholesalePrice;

    // 🆕 Preço "de" opcional: vazio → igual ao preço de venda
    productData.price = resolveOriginalPrice(productData);

    await Product.create({
      ...productData,
      ...(cleanSku ? { sku: cleanSku } : {}),
      ...(costPrice !== undefined ? { costPrice } : {}),
      ...(wholesalePrice !== undefined ? { wholesalePrice } : {}),
      image: imagesUrl,
      video: videoUrl,
      stock,
      inStock,
    });

    res.json({ success: true, message: 'Produto adicionado com sucesso' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: friendlyError(error) });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Get Product List : /api/product/list
// 🆕 Admin → todos os produtos (inclui drafts)
//    Público → APENAS publicados (inStock !== false)
// ═══════════════════════════════════════════════════════════════════════
export const productList = async (req, res) => {
  try {
    // 🆕 seller = JWT válido → recebe costPrice + wholesalePrice e resposta
    // sem cache.
    // Um seller logado por cookie que abra a loja pública também cai
    // aqui como admin — evita que uma resposta COM custo seja cacheada
    // no CDN (o cache público faz Vary apenas em Authorization/x-seller-token,
    // não em Cookie).
    const seller = isSellerAuthenticated(req);
    const admin = isAdminRequest(req) || seller;

    let query = {};

    if (admin) {
      query = {};
    } else {
      // Público vê apenas:
      //   - publicados (inStock !== false)
      //   - variantes principais (isMainVariant !== false)
      // Produtos publicados com stock=0 CONTINUAM aparecendo como "Esgotado".
      query = {
        inStock: { $ne: false },
        isMainVariant: { $ne: false },
      };
    }

    const products = await withPrivatePricingIfSeller(
      Product.find(query),
      seller,
    ).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
      res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
    } else {
      const etag = crypto
        .createHash('md5')
        .update(
          JSON.stringify(products.map(p => ({ id: p._id, u: p.updatedAt }))),
        )
        .digest('hex');

      res.setHeader('ETag', `"${etag}"`);
      // 🗂️ 06/10/2026: 10 min no CDN + limpeza automática ao gravar produtos
      setPublicCatalogCache(res);

      if (req.headers['if-none-match'] === `"${etag}"`) {
        return res.status(304).end();
      }
    }

    res.json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Reorder Products : /api/product/reorder
export const reorderProducts = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.json({
        success: false,
        message: 'Array de ordens é obrigatório',
      });
    }

    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder } },
      },
    }));

    await Product.bulkWrite(bulkOps);
    purgeCatalogCache(); // bulkWrite não dispara os hooks do modelo

    res.json({ success: true, message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Get single Product (POST) : /api/product/id
// 🆕 Draft + público → 404 (padrão SEO Shopify)
// ═══════════════════════════════════════════════════════════════════════
export const productById = async (req, res) => {
  try {
    const { id } = req.body;
    const seller = isSellerAuthenticated(req);
    const admin = isAdminRequest(req) || seller;
    const product = await withPrivatePricingIfSeller(Product.findById(id), seller);

    if (!product) {
      setNoCacheHeaders(res);
      return res
        .status(404)
        .json({ success: false, message: 'Produto não encontrado' });
    }

    if (!admin && product.inStock === false) {
      setNoCacheHeaders(res);
      return res
        .status(404)
        .json({ success: false, message: 'Produto não encontrado' });
    }

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
    } else {
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      );
      res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
    }

    res.json({ success: true, product });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 Get Single Product by ID (GET) : /api/product/:id
// 🆕 Draft + público → 404 real (HTTP 404). Google removerá do índice.
// ═══════════════════════════════════════════════════════════════════════
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = isSellerAuthenticated(req);
    const admin = isAdminRequest(req) || seller;
    const product = await withPrivatePricingIfSeller(Product.findById(id), seller);

    if (!product) {
      setNoCacheHeaders(res);
      return res
        .status(404)
        .json({ success: false, message: 'Produto não encontrado' });
    }

    if (!admin && product.inStock === false) {
      setNoCacheHeaders(res);
      return res
        .status(404)
        .json({ success: false, message: 'Produto não encontrado' });
    }

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
    } else {
      const etag = crypto
        .createHash('md5')
        .update(`${product._id}-${product.updatedAt}`)
        .digest('hex');

      res.setHeader('ETag', `"${etag}"`);
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      );
      res.setHeader('Vary', 'Origin, Authorization, x-seller-token');

      if (req.headers['if-none-match'] === `"${etag}"`) {
        return res.status(304).end();
      }
    }

    res.json({ success: true, product });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 Get Products by IDs (múltiplos) : /api/product/by-ids
// Usado por: carrinho, produtos relacionados, etc.
// Se for público, filtra drafts silenciosamente.
// ═══════════════════════════════════════════════════════════════════════
export const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    const admin = isAdminRequest(req);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: false, message: 'IDs array is required' });
    }

    const limitedIds = ids.slice(0, 50);

    let query = { _id: { $in: limitedIds } };

    if (!admin) {
      query.inStock = { $ne: false };
    }

    const products = await Product.find(query);

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
    } else {
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      );
      res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
    }

    res.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching products by IDs:', error);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 06/10/2026 — Get ALL Product Families : GET /api/product/families
// ═══════════════════════════════════════════════════════════════════════
// Devolve TODAS as famílias (variantes de cor/tamanho) numa só resposta:
//   { success, families: { [familySlug]: [produtos...] } }
//
// Porquê: cada ProductCard fazia o seu próprio POST /api/product/family.
// Uma página com 30 produtos disparava 30+ pedidos em simultâneo, e POST
// nunca é cacheado no CDN. Este endpoint era 86% das invocações do backend
// e a origem das rajadas de instâncias (alerta de ligações do Atlas).
// Agora a loja faz 1 GET, cacheado no CDN, para todas as famílias.
//
// Cada família vem com os mesmos produtos, campos e ordem que o
// POST /api/product/family devolve para esse slug.
// Público: só variantes publicadas. Admin: todas (sem cache).
// ═══════════════════════════════════════════════════════════════════════
export const getAllProductFamilies = async (req, res) => {
  try {
    const seller = isSellerAuthenticated(req);
    const admin = isAdminRequest(req) || seller;

    const query = { productFamily: { $nin: [null, ''] } };

    if (!admin) {
      query.inStock = { $ne: false };
    }

    const products = await withPrivatePricingIfSeller(
      Product.find(query),
      seller,
    ).sort({
      isMainVariant: -1,
      createdAt: 1,
    });

    const families = {};
    for (const product of products) {
      const slug = product.productFamily;
      if (!families[slug]) families[slug] = [];
      families[slug].push(product);
    }

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
    } else {
      // 🗂️ 10 min no CDN + limpeza automática ao gravar produtos
      setPublicCatalogCache(res);
    }
    res.setHeader('Vary', 'Origin, Authorization, x-seller-token');

    res.json({ success: true, families });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 Get Products by Family : /api/product/family
// Público: só mostra variantes publicadas. Admin: mostra todas.
// ═══════════════════════════════════════════════════════════════════════
export const getProductFamily = async (req, res) => {
  try {
    const { familySlug } = req.body;
    const seller = isSellerAuthenticated(req);
    const admin = isAdminRequest(req) || seller;

    if (!familySlug) {
      return res.json({ success: false, message: 'Family slug é obrigatório' });
    }

    let query = { productFamily: familySlug };

    if (!admin) {
      query.inStock = { $ne: false };
    }

    const products = await withPrivatePricingIfSeller(Product.find(query), seller).sort({
      isMainVariant: -1,
      createdAt: 1,
    });

    if (mustNotCache(req, admin)) {
      setNoCacheHeaders(res);
    } else {
      res.setHeader(
        'Cache-Control',
        'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      );
      res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
    }

    res.json({ success: true, products });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// 🆕 Check Stock : /api/product/check-stock
export const checkStock = async (req, res) => {
  try {
    setNoCacheHeaders(res);

    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    // 🆕 Draft não pode ser comprado
    if (product.inStock === false) {
      return res.json({
        success: false,
        available: false,
        message: 'Produto indisponível',
      });
    }

    const available = product.stock >= quantity;

    res.json({
      success: true,
      available,
      stock: product.stock,
      message: available
        ? 'Stock disponível'
        : `Apenas ${product.stock} unidade(s) disponível(eis)`,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 Update Stock : /api/product/update-stock
// APENAS atualiza stock. NUNCA mexe em inStock (publicação).
// Antes: misturava conceitos. Agora: Publicação e Estoque são independentes.
// ═══════════════════════════════════════════════════════════════════════
export const updateStock = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { productId, stock } = req.body;
    const newStock = Math.max(0, parseInt(stock) || 0);

    await Product.findByIdAndUpdate(productId, {
      stock: newStock,
    });

    res.json({ success: true, message: 'Stock atualizado' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 Decrement Stock (após compra) : /api/product/decrement-stock
// Após compra, NUNCA despublica o produto. Se ficar stock=0, aparece como
// "Esgotado" no site. Só o admin despublica manualmente via toggle.
// ═══════════════════════════════════════════════════════════════════════
export const decrementStock = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { items } = req.body;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await Product.findByIdAndUpdate(item.productId, {
          stock: newStock,
        });
      }
    }

    res.json({ success: true, message: 'Stock decrementado' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Change Product inStock : /api/product/stock
// 🆕 Esta é a rota do TOGGLE de Status no admin. Controla PUBLICAÇÃO.
//    - inStock=true  → Publicado (aparece no site)
//    - inStock=false → Draft (não aparece no site, mas existe no admin)
//    NÃO mexe no stock — se despublica, o estoque é preservado para quando
//    republicar.
// ═══════════════════════════════════════════════════════════════════════
export const changeStock = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { id, inStock } = req.body;

    await Product.findByIdAndUpdate(id, { inStock });

    res.json({
      success: true,
      message: inStock ? 'Produto publicado' : 'Produto despublicado',
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Update Product : /api/product/update
// 🆕 NÃO calcula mais inStock a partir de stock. Publicação é independente.
// ═══════════════════════════════════════════════════════════════════════
export const updateProduct = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { id } = req.body;

    // 🔧 FIX: parse seguro + validação ANTES de deletar/subir qualquer
    // asset — dados inválidos não podem mais destruir imagens existentes
    const parsed = parseProductData(req.body.productData);
    if (parsed.error) {
      return res.json({ success: false, message: parsed.error });
    }
    let productData = parsed.data;

    const validationError = validateProductData(productData);
    if (validationError) {
      return res.json({ success: false, message: validationError });
    }

    const newImageFiles = req.files?.images || [];
    const videoFile = req.files?.video?.[0] || null;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    let finalImageUrls;
    const { existingImages, imageOrder } = productData;

    delete productData.existingImages;
    delete productData.imageOrder;

    if (imageOrder && Array.isArray(imageOrder)) {
      const uploadedNewUrls = await Promise.all(
        newImageFiles.map(async file => {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
          });
          return result.secure_url;
        }),
      );

      let newFileIndex = 0;
      finalImageUrls = imageOrder
        .map(item => {
          if (item.type === 'existing' && item.url) {
            return item.url;
          } else {
            const url = uploadedNewUrls[newFileIndex];
            newFileIndex++;
            return url;
          }
        })
        .filter(Boolean);

      const keptUrls = new Set(existingImages || []);
      for (const oldUrl of existingProduct.image) {
        if (!keptUrls.has(oldUrl)) {
          try {
            const publicId = oldUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.log('Erro ao excluir imagem removida:', err.message);
          }
        }
      }
    } else if (newImageFiles.length > 0) {
      for (const imageUrl of existingProduct.image) {
        try {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log('Erro ao excluir imagem antiga:', err.message);
        }
      }

      finalImageUrls = await Promise.all(
        newImageFiles.map(async file => {
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
          });
          return result.secure_url;
        }),
      );
    } else {
      finalImageUrls = existingProduct.image;
    }

    let videoUrl = existingProduct.video;
    if (videoFile) {
      if (existingProduct.video) {
        try {
          const videoPublicId = existingProduct.video
            .split('/')
            .slice(-2)
            .join('/')
            .split('.')[0];
          await cloudinary.uploader.destroy(videoPublicId, {
            resource_type: 'video',
          });
        } catch (error) {
          console.log('Erro ao excluir vídeo antigo:', error.message);
        }
      }

      const videoResult = await cloudinary.uploader.upload(videoFile.path, {
        resource_type: 'video',
        folder: 'products/videos',
      });
      videoUrl = videoResult.secure_url;
    }

    if (productData.removeVideo && existingProduct.video) {
      try {
        const videoPublicId = existingProduct.video
          .split('/')
          .slice(-2)
          .join('/')
          .split('.')[0];
        await cloudinary.uploader.destroy(videoPublicId, {
          resource_type: 'video',
        });
      } catch (error) {
        console.log('Erro ao excluir vídeo:', error.message);
      }
      videoUrl = null;
      delete productData.removeVideo;
    }

    // 🆕 REMOVIDO: cálculo automático de inStock baseado em stock.
    // inStock = "publicado" (controlado só pelo toggle do admin).
    // Se o payload enviar inStock, respeita. Senão, mantém o valor existente.

    // 🔧 FIX SKU: o modal de edição enviava sku: null, que era gravado
    // explicitamente e colidia no índice unique+sparse (E11000 dup key
    // { sku: null }). Agora: SKU vazio → $unset (campo removido do doc);
    // SKU preenchido → $set normalizado.
    const cleanSku = sanitizeSku(productData.sku);
    delete productData.sku;

    // 🆕 Custo e preço de tabela: undefined → não mexe; null → limpa;
    // número → grava
    const { value: costPrice } = parseCostPrice(productData.costPrice);
    delete productData.costPrice;
    const { value: wholesalePrice } = parseWholesalePrice(
      productData.wholesalePrice,
    );
    delete productData.wholesalePrice;

    // 🆕 Preço "de" opcional: vazio → igual ao preço de venda
    productData.price = resolveOriginalPrice(productData);

    const updateOps = {
      $set: {
        ...productData,
        image: finalImageUrls,
        video: videoUrl,
        ...(costPrice !== undefined ? { costPrice } : {}),
        ...(wholesalePrice !== undefined ? { wholesalePrice } : {}),
      },
    };

    if (cleanSku) {
      updateOps.$set.sku = cleanSku;
    } else {
      updateOps.$unset = { sku: 1 };
    }

    await Product.findByIdAndUpdate(id, updateOps);

    res.json({ success: true, message: 'Produto atualizado com sucesso' });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: friendlyError(error) });
  }
};

// Delete Product : /api/product/delete
export const deleteProduct = async (req, res) => {
  try {
    setMutationHeaders(res);

    const { id } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.json({ success: false, message: 'Produto não encontrado' });
    }

    for (const imageUrl of product.image) {
      try {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.log('Erro ao excluir imagem do Cloudinary:', error.message);
      }
    }

    // 🔧 FIX: o vídeo NÃO era apagado ao excluir o produto — cada produto
    // com vídeo deixava o arquivo órfão no Cloudinary para sempre (vídeo
    // é o que mais pesa na quota). Mesmo padrão de publicId do update.
    if (product.video) {
      try {
        const videoPublicId = product.video
          .split('/')
          .slice(-2)
          .join('/')
          .split('.')[0];
        await cloudinary.uploader.destroy(videoPublicId, {
          resource_type: 'video',
        });
      } catch (error) {
        console.log('Erro ao excluir vídeo do Cloudinary:', error.message);
      }
    }

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Produto excluído com sucesso',
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
