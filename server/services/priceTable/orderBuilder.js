// server/services/priceTable/orderBuilder.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS — monta os itens de um pedido a partir da tabela já resolvida
// ═══════════════════════════════════════════════════════════════════════
// Função pura (sem I/O). Recebe o resultado de resolveTable() e as
// quantidades pedidas, e devolve os itens com o preço DA TABELA.
//
// Regras:
//   • só entra produto que aparece na tabela exportada (não oculto, não
//     rascunho/esgotado conforme as opções da tabela, e com preço);
//   • quantidade inteira de 1 a MAX_QTY; o mesmo produto repetido soma;
//   • os itens saem na ORDEM DA TABELA (a organização do admin);
//   • contas em centavos inteiros.
// ═══════════════════════════════════════════════════════════════════════

export const MAX_ORDER_ITEMS = 400;
export const MAX_QTY = 99999;

const toQty = value => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const int = Math.floor(num);
  return int >= 1 ? Math.min(int, MAX_QTY) : null;
};

/**
 * @param {object} resolved  resultado de resolveTable(table)
 * @param {Array<{product:string, qty:number}>} rawItems
 * @returns {{
 *   items: Array<{product, sku, name, image, section, qty, unitPrice, total}>,
 *   missing: Array<{product:string, name:string, reason:string}>,
 *   itemCount: number, totalQty: number, subtotal: number,
 *   error?: string
 * }}
 */
export const priceOrderItems = (resolved, rawItems) => {
  const qtyById = new Map();
  (Array.isArray(rawItems) ? rawItems : []).forEach(raw => {
    const id = String(raw?.product ?? '');
    if (!/^[a-f0-9]{24}$/i.test(id)) return;
    const qty = toQty(raw?.qty);
    if (qty === null) return;
    qtyById.set(id, Math.min(MAX_QTY, (qtyById.get(id) || 0) + qty));
  });

  if (qtyById.size > MAX_ORDER_ITEMS)
    return {
      error: `Máximo de ${MAX_ORDER_ITEMS} produtos por pedido.`,
      items: [],
      missing: [],
      itemCount: 0,
      totalQty: 0,
      subtotal: 0,
    };

  const items = [];
  const missing = [];
  const seen = new Set();
  let subtotalCents = 0;
  let totalQty = 0;

  resolved.computed.sections.forEach(section => {
    section.rows.forEach(row => {
      const qty = qtyById.get(row.productId);
      if (!qty) return;
      seen.add(row.productId);
      if (row.excluded || row.priceCents === null) {
        missing.push({
          product: row.productId,
          name: row.product?.name || '',
          reason: row.excluded || 'noPrice',
        });
        return;
      }
      const totalCents = row.priceCents * qty;
      subtotalCents += totalCents;
      totalQty += qty;
      items.push({
        product: row.productId,
        sku: row.product.sku || '',
        name: row.product.name || '',
        image: row.product.image || '',
        section: section.title || '',
        qty,
        unitPrice: row.priceCents / 100,
        total: totalCents / 100,
      });
    });
  });

  // Produto que nem existe mais no catálogo
  qtyById.forEach((_, id) => {
    if (!seen.has(id)) missing.push({ product: id, name: '', reason: 'gone' });
  });

  return {
    items,
    missing,
    itemCount: items.length,
    totalQty,
    subtotal: subtotalCents / 100,
  };
};

export const MISSING_LABELS = {
  hidden: 'oculto na tabela',
  unpublished: 'em rascunho',
  outOfStock: 'sem estoque',
  noPrice: 'sem preço na tabela',
  gone: 'não existe mais',
};

/** Número do pedido para exibir: 12 → "0012". */
export const formatOrderNumber = number =>
  String(Number(number) || 0).padStart(4, '0');
