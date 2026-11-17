// server/controllers/categoryController.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS — leitura pública (loja) + gestão no admin
// ═══════════════════════════════════════════════════════════════════════
// Público (cache no CDN, limpo a cada alteração):
//   GET  /api/category                         → árvore ativa da loja
// Admin (authSeller) — em /api/seller/categories para o frontend enviar o
// x-seller-token também no iPhone (ver isSellerRoute no AppContext):
//   GET    /api/seller/categories              → todas + nº de produtos
//   POST   /api/seller/categories              → criar (multipart: image)
//   PUT    /api/seller/categories/reorder      → { parent, ids: [...] }
//   PUT    /api/seller/categories/:id          → editar (multipart: image)
//   POST   /api/seller/categories/:id/toggle   → ativar / desativar
//   DELETE /api/seller/categories/:id          → apagar (só se vazia)
//
// Primeira utilização: se a coleção estiver vazia, importa as categorias
// que estavam no código (data/defaultCategories.js).
//
// Mudanças que se propagam:
//   • slug de categoria     → product.group, coupon.groups, captionTemplate.group
//   • slug de subcategoria  → product.category, coupon.categories,
//                             priceTable.sections.categoryPath
//   • subcategoria movida para outra categoria → product.group dos produtos dela
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { dangerouslyDeleteByTag, waitUntil } from '@vercel/functions';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import PriceTable from '../models/PriceTable.js';
import CaptionTemplate from '../models/CaptionTemplate.js';
import { DEFAULT_GROUPS } from '../data/defaultCategories.js';

const CATEGORIES_TAG = 'categories';
const CDN_TTL_SECONDS = 600;
const CLOUDINARY_FOLDER = 'categories';

// ─────────────────────────────────────────────────────────────────────
// Cache / cabeçalhos
// ─────────────────────────────────────────────────────────────────────
const purgeCategoriesCache = () => {
  try {
    const purge = Promise.resolve(dangerouslyDeleteByTag(CATEGORIES_TAG)).catch(
      error =>
        console.error('[categories] limpeza do CDN falhou:', error?.message),
    );
    waitUntil(purge);
  } catch (error) {
    console.error('[categories] limpeza do CDN falhou:', error?.message);
  }
};

const setPrivateHeaders = res => {
  res.setHeader(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate, max-age=0',
  );
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const stripAccents = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Categoria → "acessorios" | Subcategoria → "Deck-Maldivas" (padrão do site)
export const generateSlug = (name, isGroup) => {
  const words = stripAccents(name)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (isGroup) return words.join('-').toLowerCase();
  return words
    .map(w => (/^[A-Z0-9]+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join('-');
};

const cleanSlug = (value, isGroup) => {
  const slug = stripAccents(value)
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return isGroup ? slug.toLowerCase() : slug;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 'on';
};

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Busca case-insensitive exata (product.category tem variações de caixa)
const exactCi = value => new RegExp(`^${escapeRegex(value)}$`, 'i');

const uploadImage = async file => {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: CLOUDINARY_FOLDER,
    resource_type: 'image',
  });
  return result.secure_url;
};

const destroyImage = async url => {
  if (!url || !url.includes('res.cloudinary.com')) return;
  try {
    const after = url.split('/upload/')[1];
    if (!after) return;
    const parts = after.split('/');
    if (/^v\d+$/.test(parts[0])) parts.shift();
    const publicId = parts.join('/').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log('[categories] erro ao apagar imagem:', error.message);
  }
};

// Importa as categorias originais quando a coleção está vazia
let seeding = null;
export const ensureSeeded = async () => {
  if (seeding) return seeding;
  seeding = (async () => {
    const count = await Category.estimatedDocumentCount();
    if (count > 0) return false;
    for (let gi = 0; gi < DEFAULT_GROUPS.length; gi++) {
      const { children = [], ...group } = DEFAULT_GROUPS[gi];
      const doc = await Category.create({
        ...group,
        parent: null,
        order: gi,
        showOnHome: !group.isTagGroup,
        filterSet: group.isTagGroup ? '' : group.slug,
      });
      if (children.length) {
        await Category.insertMany(
          children.map((child, ci) => ({
            ...child,
            slugKey: child.slug.toLowerCase(),
            parent: doc._id,
            order: ci,
          })),
        );
      }
    }
    console.log('🗂️ Categorias originais importadas para o MongoDB');
    return true;
  })().finally(() => {
    seeding = null;
  });
  return seeding;
};

const sortedAll = () =>
  Category.find().sort({ parent: 1, order: 1, createdAt: 1 }).lean();

// Formato que a loja usa (igual ao antigo assets.js) + árvore
const toStoreShape = docs => {
  const roots = docs
    .filter(d => !d.parent)
    .sort((a, b) => a.order - b.order);
  const groups = roots.map(g => ({
    _id: g._id,
    id: g.slug,
    name: g.name,
    slug: g.slug,
    description: g.description || '',
    image: g.image || '',
    isTagGroup: !!g.isTagGroup,
    tagKey: g.tagKey || '',
    filterSet: g.filterSet || '',
    showOnHome: g.showOnHome !== false,
    isActive: g.isActive !== false,
    order: g.order,
  }));
  const categories = [];
  for (const g of roots) {
    docs
      .filter(d => d.parent && String(d.parent) === String(g._id))
      .sort((a, b) => a.order - b.order)
      .forEach(c =>
        categories.push({
          _id: c._id,
          text: c.name,
          path: c.slug,
          group: g.slug,
          parentId: g._id,
          isActive: c.isActive !== false,
          order: c.order,
        }),
      );
  }
  return { groups, categories };
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/category — árvore ativa (loja)
// ─────────────────────────────────────────────────────────────────────
export const getPublicCategories = async (req, res) => {
  const hasCredentials =
    !!req.headers.authorization || !!req.headers['x-seller-token'];
  if (!hasCredentials && !req.query.fresh) {
    res.setHeader(
      'Cache-Control',
      `public, max-age=60, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=60`,
    );
    res.setHeader('Vercel-Cache-Tag', CATEGORIES_TAG);
    res.setHeader('Vary', 'Origin, Authorization, x-seller-token');
  } else {
    setPrivateHeaders(res);
  }

  try {
    await ensureSeeded();
    const docs = await sortedAll();
    const activeRootIds = new Set(
      docs.filter(d => !d.parent && d.isActive !== false).map(d => String(d._id)),
    );
    const visible = docs.filter(d =>
      d.parent
        ? d.isActive !== false && activeRootIds.has(String(d.parent))
        : d.isActive !== false,
    );
    return res.json({ success: true, ...toStoreShape(visible) });
  } catch (error) {
    console.error('❌ getPublicCategories:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: false, groups: [], categories: [] });
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/seller/categories — todas + contagem de produtos (admin)
// ─────────────────────────────────────────────────────────────────────
export const listCategories = async (req, res) => {
  setPrivateHeaders(res);
  try {
    await ensureSeeded();
    const docs = await sortedAll();

    const [byGroup, byCategory, byTag] = await Promise.all([
      Product.aggregate([{ $group: { _id: '$group', n: { $sum: 1 } } }]),
      Product.aggregate([
        { $group: { _id: { $toLower: '$category' }, n: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', n: { $sum: 1 } } },
      ]),
    ]);
    const groupCount = new Map(byGroup.map(r => [r._id, r.n]));
    const categoryCount = new Map(byCategory.map(r => [r._id, r.n]));
    const tagCount = new Map(byTag.map(r => [r._id, r.n]));

    const categories = docs.map(d => ({
      ...d,
      productCount: d.parent
        ? categoryCount.get(String(d.slug).toLowerCase()) || 0
        : d.isTagGroup
          ? tagCount.get(d.tagKey) || 0
          : groupCount.get(d.slug) || 0,
    }));

    // Produtos cuja categoria/subcategoria não existe no admin (ex: slug
    // antigo escrito à mão) — o painel mostra um aviso.
    const knownGroups = new Set(docs.filter(d => !d.parent).map(d => d.slug));
    const knownCats = new Set(
      docs.filter(d => d.parent).map(d => String(d.slug).toLowerCase()),
    );
    const orphans = {
      groups: byGroup
        .filter(r => r._id && !knownGroups.has(r._id))
        .map(r => ({ slug: r._id, count: r.n })),
      categories: byCategory
        .filter(r => r._id && !knownCats.has(r._id))
        .map(r => ({ slug: r._id, count: r.n })),
    };

    return res.json({ success: true, categories, orphans });
  } catch (error) {
    console.error('❌ listCategories:', error);
    return res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// Validação comum de criar/editar
// ─────────────────────────────────────────────────────────────────────
const resolveParent = async (rawParent, selfId = null) => {
  if (!rawParent || rawParent === 'null') return { parent: null };
  if (!mongoose.isValidObjectId(rawParent)) {
    return { error: 'Categoria-mãe inválida' };
  }
  if (selfId && String(rawParent) === String(selfId)) {
    return { error: 'Uma categoria não pode estar dentro dela mesma' };
  }
  const parent = await Category.findById(rawParent);
  if (!parent) return { error: 'Categoria-mãe não encontrada' };
  if (parent.parent) {
    return { error: 'Só são permitidos 2 níveis (categoria → subcategoria)' };
  }
  if (parent.isTagGroup) {
    return {
      error:
        'Coleções por tag (ex: SUP, Outlet) não têm subcategorias — os produtos entram nelas pela tag',
    };
  }
  return { parent };
};

const slugTaken = async (slug, selfId = null) => {
  const query = { slugKey: String(slug).toLowerCase() };
  if (selfId) query._id = { $ne: selfId };
  return !!(await Category.exists(query));
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/seller/categories — criar
// ─────────────────────────────────────────────────────────────────────
export const createCategory = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.json({ success: false, message: 'Informe o nome' });

    const { parent, error } = await resolveParent(body.parent);
    if (error) return res.json({ success: false, message: error });
    const isGroup = !parent;

    const slug = cleanSlug(body.slug || generateSlug(name, isGroup), isGroup);
    if (!slug) return res.json({ success: false, message: 'Endereço (slug) inválido' });
    if (await slugTaken(slug)) {
      return res.json({
        success: false,
        message: `Já existe uma categoria com o endereço "${slug}"`,
      });
    }

    const isTagGroup = isGroup && toBool(body.isTagGroup, false);
    const tagKey = isTagGroup
      ? cleanSlug(body.tagKey || slug, true)
      : '';
    if (isTagGroup && !tagKey) {
      return res.json({ success: false, message: 'Informe a tag da coleção' });
    }

    const last = await Category.findOne({ parent: parent ? parent._id : null })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const imageFile = req.files?.image?.[0];
    const image = imageFile ? await uploadImage(imageFile) : '';

    const category = await Category.create({
      name,
      slug,
      parent: parent ? parent._id : null,
      order: last ? last.order + 1 : 0,
      isActive: toBool(body.isActive, true),
      description: isGroup ? String(body.description || '').trim() : '',
      image: isGroup ? image : '',
      showOnHome: isGroup ? toBool(body.showOnHome, !isTagGroup) : false,
      isTagGroup,
      tagKey,
      filterSet: isGroup && !isTagGroup ? slug : '',
    });

    purgeCategoriesCache();
    return res.json({ success: true, message: 'Categoria criada', category });
  } catch (error) {
    console.error('❌ createCategory:', error);
    return res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/seller/categories/:id — editar
// ─────────────────────────────────────────────────────────────────────
export const updateCategory = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.json({ success: false, message: 'Categoria não encontrada' });
    }
    const body = req.body || {};
    const wasGroup = !category.parent;
    const oldSlug = category.slug;
    const oldParentId = category.parent ? String(category.parent) : null;

    // ─── Nível (categoria ↔ subcategoria) ───
    let newParent = category.parent ? await Category.findById(category.parent) : null;
    if (body.parent !== undefined) {
      const resolved = await resolveParent(body.parent, category._id);
      if (resolved.error) return res.json({ success: false, message: resolved.error });
      newParent = resolved.parent;
    }
    const isGroup = !newParent;

    if (wasGroup !== isGroup) {
      return res.json({
        success: false,
        message: wasGroup
          ? 'Uma categoria não pode virar subcategoria. Crie uma subcategoria nova e mova os produtos.'
          : 'Uma subcategoria não pode virar categoria. Crie uma categoria nova.',
      });
    }

    // ─── Nome / slug ───
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return res.json({ success: false, message: 'Informe o nome' });
      category.name = name;
    }
    if (body.slug !== undefined && body.slug !== oldSlug) {
      const slug = cleanSlug(body.slug, isGroup);
      if (!slug) return res.json({ success: false, message: 'Endereço (slug) inválido' });
      if (await slugTaken(slug, category._id)) {
        return res.json({
          success: false,
          message: `Já existe uma categoria com o endereço "${slug}"`,
        });
      }
      category.slug = slug;
    }

    if (body.isActive !== undefined) category.isActive = toBool(body.isActive, true);

    if (isGroup) {
      if (body.description !== undefined) {
        category.description = String(body.description || '').trim();
      }
      if (body.showOnHome !== undefined) {
        category.showOnHome = toBool(body.showOnHome, true);
      }
      if (body.isTagGroup !== undefined) {
        const nextTagGroup = toBool(body.isTagGroup, false);
        if (nextTagGroup && !category.isTagGroup) {
          const hasChildren = await Category.exists({ parent: category._id });
          if (hasChildren) {
            return res.json({
              success: false,
              message:
                'Esta categoria tem subcategorias — não pode virar coleção por tag',
            });
          }
        }
        category.isTagGroup = nextTagGroup;
      }
      if (category.isTagGroup) {
        const tagKey = cleanSlug(body.tagKey || category.tagKey || category.slug, true);
        if (!tagKey) {
          return res.json({ success: false, message: 'Informe a tag da coleção' });
        }
        category.tagKey = tagKey;
      } else {
        category.tagKey = '';
        // Mantém os filtros mesmo que o slug mude
        if (!category.filterSet) category.filterSet = oldSlug;
      }

      // ─── Imagem ───
      const imageFile = req.files?.image?.[0];
      if (imageFile) {
        const oldImage = category.image;
        category.image = await uploadImage(imageFile);
        await destroyImage(oldImage);
      } else if (toBool(body.removeImage, false)) {
        await destroyImage(category.image);
        category.image = '';
      }
    } else if (newParent && String(newParent._id) !== oldParentId) {
      // Subcategoria movida: vai para o fim da nova categoria
      const last = await Category.findOne({ parent: newParent._id })
        .sort({ order: -1 })
        .select('order')
        .lean();
      category.parent = newParent._id;
      category.order = last ? last.order + 1 : 0;
    }

    await category.save();

    // ─── Propagar mudanças ───
    const newSlug = category.slug;
    const slugChanged = newSlug !== oldSlug;
    const moved = !isGroup && String(category.parent) !== oldParentId;
    const summary = { products: 0 };

    if (isGroup && slugChanged && !category.isTagGroup) {
      const r = await Product.updateMany({ group: oldSlug }, { $set: { group: newSlug } });
      summary.products = r.modifiedCount || 0;
      await Coupon.updateMany(
        { groups: oldSlug },
        { $set: { 'groups.$[g]': newSlug } },
        { arrayFilters: [{ g: oldSlug }] },
      );
      await CaptionTemplate.updateMany({ group: oldSlug }, { $set: { group: newSlug } });
    }

    if (!isGroup && (slugChanged || moved)) {
      const set = {};
      if (slugChanged) set.category = newSlug;
      if (moved) set.group = newParent.slug;
      const r = await Product.updateMany({ category: exactCi(oldSlug) }, { $set: set });
      summary.products = r.modifiedCount || 0;

      if (slugChanged) {
        await Coupon.updateMany(
          { categories: oldSlug },
          { $set: { 'categories.$[c]': newSlug } },
          { arrayFilters: [{ c: oldSlug }] },
        );
        await PriceTable.updateMany(
          { 'sections.categoryPath': oldSlug },
          { $set: { 'sections.$[s].categoryPath': newSlug } },
          { arrayFilters: [{ 's.categoryPath': oldSlug }] },
        );
      }
    }

    purgeCategoriesCache();
    const parts = ['Categoria atualizada'];
    if (summary.products > 0) parts.push(`${summary.products} produto(s) atualizado(s)`);
    return res.json({ success: true, message: parts.join(' — '), category, summary });
  } catch (error) {
    console.error('❌ updateCategory:', error);
    return res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/seller/categories/reorder — { parent, ids }
// ─────────────────────────────────────────────────────────────────────
export const reorderCategories = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.some(id => !mongoose.isValidObjectId(id))) {
      return res.json({ success: false, message: 'Lista inválida' });
    }
    await Category.bulkWrite(
      ids.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
      })),
    );
    purgeCategoriesCache();
    return res.json({ success: true, message: 'Ordem salva' });
  } catch (error) {
    console.error('❌ reorderCategories:', error);
    return res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/seller/categories/:id/toggle
// ─────────────────────────────────────────────────────────────────────
export const toggleCategory = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.json({ success: false, message: 'Categoria não encontrada' });
    }
    category.isActive = !category.isActive;
    await category.save();
    purgeCategoriesCache();
    return res.json({
      success: true,
      message: category.isActive ? 'Categoria visível na loja' : 'Categoria oculta da loja',
      category,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/seller/categories/:id — só se não tiver produtos/subcategorias
// ─────────────────────────────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  setPrivateHeaders(res);
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.json({ success: false, message: 'Categoria não encontrada' });
    }

    if (!category.parent) {
      const children = await Category.countDocuments({ parent: category._id });
      if (children > 0) {
        return res.json({
          success: false,
          message: `Esta categoria tem ${children} subcategoria(s). Mova-as ou apague-as primeiro.`,
        });
      }
      if (!category.isTagGroup) {
        const products = await Product.countDocuments({ group: category.slug });
        if (products > 0) {
          return res.json({
            success: false,
            message: `Esta categoria tem ${products} produto(s). Mude-os de categoria primeiro.`,
          });
        }
      }
    } else {
      const products = await Product.countDocuments({
        category: exactCi(category.slug),
      });
      if (products > 0) {
        return res.json({
          success: false,
          message: `Esta subcategoria tem ${products} produto(s). Mude-os de subcategoria primeiro (ou desative-a para escondê-la da loja).`,
        });
      }
    }

    await destroyImage(category.image);
    await Category.deleteOne({ _id: category._id });
    purgeCategoriesCache();
    return res.json({ success: true, message: 'Categoria apagada' });
  } catch (error) {
    console.error('❌ deleteCategory:', error);
    return res.json({ success: false, message: error.message });
  }
};
