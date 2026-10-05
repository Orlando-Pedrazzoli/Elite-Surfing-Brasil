// server/services/priceTable/pricingEngine.js
// ═══════════════════════════════════════════════════════════════════════
// 💰 TABELAS DE PREÇO — motor de cálculo (função pura, sem I/O)
// ═══════════════════════════════════════════════════════════════════════
// ⚠️ ESPELHADO: este arquivo existe em dois lugares com o MESMO conteúdo
//   server/services/priceTable/pricingEngine.js  ← fonte de verdade
//   client/src/utils/priceTableEngine.js         ← pré-visualização no editor
// Servidor e cliente são pacotes separados, por isso o arquivo é copiado.
// Ao alterar uma regra aqui, copie o corpo para o outro arquivo (só a
// linha 1 muda).
//
// Regras:
//   • Cada tabela tem uma BASE (custo, preço de tabela ou preço do site),
//     um MODO (markup ou margem) e uma % geral.
//   • Precedência por item (a mais específica vence):
//       preço fixo do item → % do item → % da seção → % da tabela
//   • Markup  → preço = base × (1 + %/100)   (% negativa = desconto)
//     Margem  → preço = base ÷ (1 − %/100)   (% tem de ser < 100)
//   • Ordem: aplica a % → arredonda. Preço fixo nunca é arredondado.
//   • Contas em CENTAVOS inteiros e % em centésimos (basis points) para
//     não acumular erro de ponto flutuante.
// ═══════════════════════════════════════════════════════════════════════

export const PRICE_BASES = ['cost', 'wholesale', 'sale'];
export const PRICE_MODES = ['markup', 'margin'];
export const ROUNDINGS = ['none', '0.05', '0.10', '0.50', '1.00', 'end90'];
export const TABLE_KINDS = ['interna', 'cliente'];

/** Limites aceitos para uma porcentagem (markup pode ser negativo = desconto). */
export const PCT_LIMITS = { min: -100, max: 1000, marginMax: 99.99 };

/** Campo do produto usado por cada base. */
export const BASE_FIELD = {
  cost: 'costPrice',
  wholesale: 'wholesalePrice',
  sale: 'offerPrice',
};

export const BASE_LABELS = {
  cost: 'Custo do Fornecedor',
  wholesale: 'Preço de Tabela',
  sale: 'Preço de Venda (site)',
};

export const MODE_LABELS = {
  markup: 'Markup',
  margin: 'Margem',
};

export const ROUNDING_LABELS = {
  none: 'Sem arredondamento',
  0.05: 'Múltiplos de R$ 0,05',
  '0.10': 'Múltiplos de R$ 0,10',
  '0.50': 'Múltiplos de R$ 0,50',
  '1.00': 'Valor inteiro (R$ 1,00)',
  end90: 'Terminar em ,90',
};

export const SOURCE_LABELS = {
  fixed: 'Preço fixo',
  item: '% do item',
  section: '% da seção',
  table: '% da tabela',
};

const ROUNDING_STEP = { 0.05: 5, '0.10': 10, '0.50': 50, '1.00': 100 };

// ─────────────────────────────────────────────────────────────────────
// Conversões
// ─────────────────────────────────────────────────────────────────────

/** '', null, undefined ou inválido → null; número válido → Number. */
export const toNumberOrNull = value => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/** Reais → centavos inteiros (null quando vazio, inválido ou negativo). */
export const toCents = value => {
  const num = toNumberOrNull(value);
  if (num === null || num < 0) return null;
  return Math.round((num + Number.EPSILON) * 100);
};

/** Centavos → reais (2 casas). */
export const fromCents = cents =>
  cents === null || cents === undefined ? null : cents / 100;

/** Porcentagem → centésimos de ponto percentual (12.5 → 1250). */
const toBasisPoints = pct => Math.round((pct + Number.EPSILON) * 100);

/** Normaliza uma % vinda do usuário: null quando vazia/ inválida. */
export const normalizePct = (value, mode = 'markup') => {
  const num = toNumberOrNull(value);
  if (num === null) return null;
  const max = mode === 'margin' ? PCT_LIMITS.marginMax : PCT_LIMITS.max;
  const min = mode === 'margin' ? 0 : PCT_LIMITS.min;
  const clamped = Math.min(max, Math.max(min, num));
  return Math.round((clamped + Number.EPSILON) * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────────
// Cálculo
// ─────────────────────────────────────────────────────────────────────

/**
 * Aplica a porcentagem sobre a base (em centavos).
 * @returns {number|null} centavos, ou null quando a conta é impossível
 *   (margem >= 100%).
 */
export const applyPct = (baseCents, pct, mode) => {
  const bp = toBasisPoints(pct || 0);
  if (mode === 'margin') {
    if (bp >= 10000 || bp < 0) return null;
    return Math.round((baseCents * 10000) / (10000 - bp));
  }
  if (bp < -10000) return null;
  return Math.round((baseCents * (10000 + bp)) / 10000);
};

/** Arredonda um valor em centavos conforme a regra da tabela. */
export const applyRounding = (cents, rounding) => {
  if (cents === null || cents <= 0) return cents;
  if (rounding === 'end90') {
    // Sobe para o próximo valor terminado em ,90 (177,45 → 177,90).
    return Math.ceil((cents - 90) / 100) * 100 + 90;
  }
  const step = ROUNDING_STEP[rounding];
  if (!step) return cents;
  return Math.max(step, Math.round(cents / step) * step);
};

/**
 * Resolve o preço de UM item da tabela.
 *
 * @param {object} args
 * @param {object} args.product  { costPrice, wholesalePrice, offerPrice }
 * @param {object} [args.item]    { pct, fixedPrice }
 * @param {object} [args.section] { pct }
 * @param {object} args.table    { base, mode, defaultPct, rounding }
 * @returns {{
 *   price: number|null,       preço final em reais (null = sem preço)
 *   priceCents: number|null,
 *   source: 'fixed'|'item'|'section'|'table',
 *   pct: number|null,         % efetivamente aplicada (null no preço fixo)
 *   base: number|null,        valor da base em reais
 *   cost: number|null,        custo do fornecedor em reais
 *   belowCost: boolean,       preço final abaixo do custo
 *   missing: null|'base'|'invalid'   motivo de não haver preço
 *   profit: number|null,      preço − custo
 *   marginPct: number|null,   lucro / preço × 100
 *   markupPct: number|null,   lucro / custo × 100
 * }}
 */
export const resolveItemPrice = ({ product, item, section, table }) => {
  const base = PRICE_BASES.includes(table?.base) ? table.base : 'cost';
  const mode = PRICE_MODES.includes(table?.mode) ? table.mode : 'markup';

  const costCents = toCents(product?.costPrice);
  const rawBase = toCents(product?.[BASE_FIELD[base]]);
  // Base zerada não gera preço (uma linha a R$ 0,00 seria um erro na tabela)
  const baseCents = rawBase !== null && rawBase > 0 ? rawBase : null;

  let priceCents = null;
  let source = 'table';
  let pct = null;
  let missing = null;

  const fixedCents = toCents(item?.fixedPrice);
  if (fixedCents !== null && fixedCents > 0) {
    priceCents = fixedCents;
    source = 'fixed';
  } else {
    const itemPct = toNumberOrNull(item?.pct);
    const sectionPct = toNumberOrNull(section?.pct);
    if (itemPct !== null) {
      pct = itemPct;
      source = 'item';
    } else if (sectionPct !== null) {
      pct = sectionPct;
      source = 'section';
    } else {
      pct = toNumberOrNull(table?.defaultPct) ?? 0;
      source = 'table';
    }

    if (baseCents === null) {
      missing = 'base';
    } else {
      const raw = applyPct(baseCents, pct, mode);
      if (raw === null || raw <= 0) {
        missing = 'invalid';
      } else {
        priceCents = applyRounding(raw, table?.rounding);
      }
    }
  }

  const hasCost = costCents !== null && costCents > 0;
  const profitCents =
    priceCents !== null && hasCost ? priceCents - costCents : null;

  return {
    price: fromCents(priceCents),
    priceCents,
    source,
    pct,
    base: fromCents(baseCents),
    cost: hasCost ? fromCents(costCents) : null,
    belowCost: profitCents !== null && profitCents < 0,
    missing,
    profit: fromCents(profitCents),
    marginPct:
      profitCents !== null && priceCents > 0
        ? Math.round((profitCents / priceCents) * 10000) / 100
        : null,
    markupPct:
      profitCents !== null
        ? Math.round((profitCents / costCents) * 10000) / 100
        : null,
  };
};

/**
 * Um item entra na tabela exportada?
 * Fica de fora quando: oculto pelo admin, rascunho (se a tabela não inclui
 * rascunhos), sem estoque (se a tabela esconde esgotados) ou sem preço.
 * @returns {null|'hidden'|'unpublished'|'outOfStock'|'noPrice'}
 */
export const exclusionReason = ({ product, item, table, resolved }) => {
  if (item?.hidden) return 'hidden';
  const options = table?.options || {};
  if (!options.includeUnpublished && product?.inStock === false)
    return 'unpublished';
  if (options.hideOutOfStock && (Number(product?.stock) || 0) <= 0)
    return 'outOfStock';
  if (!resolved || resolved.price === null) return 'noPrice';
  return null;
};

export const EXCLUSION_LABELS = {
  hidden: 'Oculto',
  unpublished: 'Rascunho',
  outOfStock: 'Sem estoque',
  noPrice: 'Sem preço',
};

/**
 * Calcula a tabela inteira.
 *
 * @param {object} table       documento da tabela (com sections[].items[])
 * @param {object} productsById  { [id]: produto }
 * @returns {{
 *   sections: Array<{ key, title, pct, rows: Array, visibleCount: number }>,
 *   stats: { total, visible, hidden, unpublished, outOfStock, noPrice,
 *            belowCost, fixed, itemPct, sectionPct }
 * }}
 *   Cada row: { productId, product, item, ...resolveItemPrice(), excluded }
 */
export const computeTable = (table, productsById) => {
  const stats = {
    total: 0,
    visible: 0,
    hidden: 0,
    unpublished: 0,
    outOfStock: 0,
    noPrice: 0,
    belowCost: 0,
    fixed: 0,
    itemPct: 0,
    sectionPct: 0,
  };

  const sections = (table?.sections || []).map(section => {
    const rows = [];
    (section.items || []).forEach(item => {
      const productId = String(item.product);
      const product = productsById?.[productId];
      if (!product) return; // produto apagado: some da tabela

      const resolved = resolveItemPrice({ product, item, section, table });
      const excluded = exclusionReason({ product, item, table, resolved });

      stats.total++;
      if (excluded) stats[excluded]++;
      else {
        stats.visible++;
        if (resolved.belowCost) stats.belowCost++;
      }
      if (resolved.source === 'fixed') stats.fixed++;
      else if (resolved.source === 'item') stats.itemPct++;

      rows.push({ productId, product, item, ...resolved, excluded });
    });

    if (toNumberOrNull(section.pct) !== null) stats.sectionPct++;

    return {
      key: section.key,
      title: section.title,
      pct: toNumberOrNull(section.pct),
      rows,
      visibleCount: rows.filter(r => !r.excluded).length,
    };
  });

  return { sections, stats };
};

// ─────────────────────────────────────────────────────────────────────
// Formatação
// ─────────────────────────────────────────────────────────────────────

/** R$ 1.234,56 ('—' quando vazio). */
export const formatBRL = value => {
  const num = toNumberOrNull(value);
  if (num === null) return '—';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
};

/** 42,5% — até 2 casas, sem zeros à direita. */
export const formatPct = value => {
  const num = toNumberOrNull(value);
  if (num === null) return '—';
  return `${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
};

/** Frase curta que descreve a regra geral da tabela. */
export const describeRule = table => {
  const base = BASE_LABELS[table?.base] || BASE_LABELS.cost;
  const pct = toNumberOrNull(table?.defaultPct) ?? 0;
  if (pct === 0) return `${base}, sem acréscimo`;
  if (table?.mode === 'margin')
    return `${base} com margem de ${formatPct(pct)}`;
  return pct > 0
    ? `${base} + ${formatPct(pct)} de markup`
    : `${base} − ${formatPct(Math.abs(pct))} de desconto`;
};
