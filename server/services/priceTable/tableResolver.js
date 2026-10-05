// server/services/priceTable/tableResolver.js
// ═══════════════════════════════════════════════════════════════════════
// 🔗 TABELAS DE PREÇO — junta a tabela (regras + organização) com os
//    produtos do banco e devolve tudo calculado.
// ═══════════════════════════════════════════════════════════════════════
// Garantia "tabela completa": toda tabela contém SEMPRE todos os produtos
// cadastrados. A cada leitura a organização salva é sincronizada com o
// catálogo, em memória e de forma determinística:
//   • produto novo  → entra no fim da seção da sua categoria (ou numa
//                     seção nova no fim, se a categoria ainda não existir)
//   • produto apagado → sai
// Rascunhos e esgotados continuam na organização (não perdem posição nem
// exceções); só ficam de fora da exportação conforme as opções da tabela.
// ═══════════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import Product from '../../models/Product.js';
import { computeTable } from './pricingEngine.js';
import {
  categoryTitle,
  categoryOrder,
  categoryKey,
} from './categoryCatalog.js';

const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

export const newSectionKey = () =>
  `sec_${crypto.randomBytes(6).toString('hex')}`;

// Campos do produto usados nas tabelas. costPrice e wholesalePrice são
// `select: false` no schema — incluí-los explicitamente na projeção é o
// que os traz. Este serviço só é chamado por rotas com authSeller.
const PRODUCT_PROJECTION = {
  name: 1,
  sku: 1,
  image: 1,
  category: 1,
  offerPrice: 1,
  costPrice: 1,
  wholesalePrice: 1,
  inStock: 1,
  stock: 1,
};

const toTableProduct = doc => ({
  _id: String(doc._id),
  name: String(doc.name || '').trim(),
  sku: doc.sku ? String(doc.sku).trim() : '',
  image: Array.isArray(doc.image) && doc.image[0] ? String(doc.image[0]) : '',
  category: String(doc.category || '').trim(),
  costPrice: doc.costPrice ?? null,
  wholesalePrice: doc.wholesalePrice ?? null,
  offerPrice: doc.offerPrice ?? null,
  inStock: doc.inStock !== false,
  stock: Number(doc.stock) || 0,
});

/** Todos os produtos cadastrados (inclui variantes e rascunhos). */
export const loadProducts = async () => {
  const docs = await Product.find({}).select(PRODUCT_PROJECTION).lean();
  return docs.map(toTableProduct);
};

const byName = (a, b) => collator.compare(a.name, b.name);

/** Seções iniciais: uma por categoria, na ordem do catálogo; itens por nome. */
export const buildDefaultSections = products => {
  const groups = new Map();
  products.forEach(product => {
    const key = categoryKey(product.category);
    if (!groups.has(key))
      groups.set(key, { categoryPath: product.category, products: [] });
    groups.get(key).products.push(product);
  });

  return [...groups.values()]
    .sort((a, b) => {
      const diff =
        categoryOrder(a.categoryPath) - categoryOrder(b.categoryPath);
      if (diff !== 0) return diff;
      return collator.compare(
        categoryTitle(a.categoryPath),
        categoryTitle(b.categoryPath),
      );
    })
    .map(group => ({
      key: newSectionKey(),
      title: categoryTitle(group.categoryPath),
      categoryPath: group.categoryPath || null,
      pct: null,
      items: group.products.sort(byName).map(product => ({
        product: product._id,
        pct: null,
        fixedPrice: null,
        hidden: false,
      })),
    }));
};

/**
 * Sincroniza a organização salva com o catálogo atual.
 * Não grava nada: devolve as seções já ajustadas.
 * @returns {{ sections: object[], addedIds: string[], removedCount: number }}
 */
export const syncSections = (savedSections, products) => {
  const known = new Map(products.map(p => [p._id, p]));
  const seen = new Set();
  let removedCount = 0;

  const sections = (savedSections || []).map(section => ({
    key: section.key || newSectionKey(),
    title: section.title,
    categoryPath: section.categoryPath || null,
    pct: section.pct ?? null,
    items: (section.items || [])
      .map(item => ({
        product: String(item.product),
        pct: item.pct ?? null,
        fixedPrice: item.fixedPrice ?? null,
        hidden: !!item.hidden,
      }))
      .filter(item => {
        if (!known.has(item.product) || seen.has(item.product)) {
          removedCount++;
          return false;
        }
        seen.add(item.product);
        return true;
      }),
  }));

  const missing = products.filter(p => !seen.has(p._id)).sort(byName);
  const addedIds = [];

  missing.forEach(product => {
    const key = categoryKey(product.category);
    let target = sections.find(
      s => s.categoryPath && categoryKey(s.categoryPath) === key,
    );
    if (!target) {
      target = {
        key: newSectionKey(),
        title: categoryTitle(product.category),
        categoryPath: product.category || null,
        pct: null,
        items: [],
      };
      sections.push(target);
    }
    target.items.push({
      product: product._id,
      pct: null,
      fixedPrice: null,
      hidden: false,
    });
    addedIds.push(product._id);
  });

  return { sections, addedIds, removedCount };
};

/**
 * Tabela pronta para o editor ou para exportar.
 * @param {object} table  documento (plain object / lean) da PriceTable
 * @param {object[]} [preloaded] produtos já carregados (evita 2ª consulta)
 */
export const resolveTable = async (table, preloaded) => {
  const products = preloaded || (await loadProducts());
  const { sections, addedIds, removedCount } = syncSections(
    table.sections,
    products,
  );
  const merged = { ...table, sections };
  const productsById = Object.fromEntries(products.map(p => [p._id, p]));
  const computed = computeTable(merged, productsById);

  return {
    table: merged,
    products,
    productsById,
    computed,
    sync: { addedIds, removedCount },
  };
};

/**
 * Conteúdo congelável de uma tabela: só as linhas que saem na exportação,
 * com os valores já calculados, e um hash desse conteúdo.
 */
export const buildSnapshot = resolved => {
  const { table, computed } = resolved;

  const sections = computed.sections
    .map(section => ({
      title: section.title,
      rows: section.rows
        .filter(row => !row.excluded)
        .map(row => ({
          product: row.productId,
          sku: row.product.sku,
          name: row.product.name,
          image: row.product.image,
          price: row.price,
          cost: row.cost,
          base: row.base,
          pct: row.pct,
          source: row.source,
        })),
    }))
    .filter(section => section.rows.length > 0);

  const rowCount = sections.reduce((sum, s) => sum + s.rows.length, 0);

  const content = {
    name: table.name,
    kind: table.kind,
    settings: {
      base: table.base,
      mode: table.mode,
      defaultPct: table.defaultPct ?? 0,
      rounding: table.rounding,
    },
    header: {
      title: table.header?.title || 'Tabela de Preços',
      subtitle: table.header?.subtitle || '',
      validUntil: table.header?.validUntil || null,
      paymentTerms: table.header?.paymentTerms || '',
      notes: table.header?.notes || '',
    },
    showSku: table.options?.showSku !== false,
    sections,
  };

  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify(content))
    .digest('hex');

  return { ...content, rowCount, hash };
};

/** Números do catálogo para a tela de lista / nova tabela. */
export const catalogStats = products => ({
  total: products.length,
  published: products.filter(p => p.inStock).length,
  withoutCost: products.filter(p => !(Number(p.costPrice) > 0)).length,
  withoutWholesale: products.filter(p => !(Number(p.wholesalePrice) > 0))
    .length,
});
