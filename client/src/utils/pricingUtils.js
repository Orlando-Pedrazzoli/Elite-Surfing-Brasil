// client/src/utils/pricingUtils.js
// ═══════════════════════════════════════════════════════════════════════
// 💰 PRECIFICAÇÃO — custo, lucro, margem e markup
// ═══════════════════════════════════════════════════════════════════════
// Fonte única de verdade para os cálculos de margem no admin.
// Usado por: PricingFields (Add/Edit), MarginBadge e ProductList.
//
// Definições (padrão varejo):
//   Lucro bruto  = Preço de venda − Custo
//   Margem (%)   = Lucro bruto / Preço de venda × 100   ← "quanto do preço fica"
//   Markup (%)   = Lucro bruto / Custo × 100            ← "quanto marquei sobre o custo"
//
// Ex: custo 50, venda 100 → lucro 50, margem 50%, markup 100%.
//
// Nada disto é gravado no banco: é sempre derivado de costPrice + offerPrice,
// para nunca ficar desatualizado quando um dos dois muda.
// ═══════════════════════════════════════════════════════════════════════

/** Converte '', null, undefined ou texto inválido em null; números válidos em Number. */
export const toNumberOrNull = value => {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/** Arredonda a 2 casas sem erro de ponto flutuante (ex: 1.005 → 1.01). */
export const round2 = num => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Faixas de margem usadas para colorir a UI.
 * Ajustar aqui altera Add, Edit e Lista de uma vez.
 */
export const MARGIN_THRESHOLDS = {
  LOW: 15, // abaixo disto = margem baixa
  OK: 35, // entre LOW e OK = razoável; acima = boa
};

/**
 * Calcula os indicadores de margem.
 * @returns {null | { cost, sale, profit, marginPct, markupPct }}
 *   null quando faltam dados (custo ou venda vazios/inválidos).
 */
export const calcMargin = (costPrice, offerPrice) => {
  const cost = toNumberOrNull(costPrice);
  const sale = toNumberOrNull(offerPrice);

  if (cost === null || sale === null || sale <= 0 || cost < 0) return null;

  const profit = round2(sale - cost);
  const marginPct = round2((profit / sale) * 100);
  // Markup indefinido quando o custo é zero (divisão por zero)
  const markupPct = cost > 0 ? round2((profit / cost) * 100) : null;

  return { cost, sale, profit, marginPct, markupPct };
};

/**
 * Classifica a margem numa "tonalidade" semântica.
 * 'none'     → sem custo cadastrado
 * 'negative' → vende abaixo do custo (prejuízo)
 * 'low'      → < MARGIN_THRESHOLDS.LOW
 * 'ok'       → < MARGIN_THRESHOLDS.OK
 * 'good'     → >= MARGIN_THRESHOLDS.OK
 */
export const getMarginTone = marginPct => {
  if (marginPct === null || marginPct === undefined) return 'none';
  if (marginPct < 0) return 'negative';
  if (marginPct < MARGIN_THRESHOLDS.LOW) return 'low';
  if (marginPct < MARGIN_THRESHOLDS.OK) return 'ok';
  return 'good';
};

/** Classes Tailwind por tonalidade — badge (fundo + texto). */
export const MARGIN_TONE_CLASSES = {
  none: 'bg-gray-100 text-gray-500 border-gray-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  low: 'bg-orange-100 text-orange-700 border-orange-200',
  ok: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  good: 'bg-green-100 text-green-700 border-green-200',
};

export const MARGIN_TONE_LABELS = {
  none: 'Sem custo',
  negative: 'Prejuízo',
  low: 'Margem baixa',
  ok: 'Margem ok',
  good: 'Margem boa',
};

/**
 * Preço de venda necessário para atingir uma margem alvo.
 * margem = (venda − custo) / venda  →  venda = custo / (1 − margem)
 * Ex: custo 50, alvo 50% → 100.
 */
export const priceForTargetMargin = (costPrice, targetMarginPct) => {
  const cost = toNumberOrNull(costPrice);
  if (cost === null || cost <= 0) return null;
  if (targetMarginPct >= 100 || targetMarginPct < 0) return null;
  return round2(cost / (1 - targetMarginPct / 100));
};

/** Formata em BRL (R$ 1.234,56). */
export const formatBRL = value => {
  const num = toNumberOrNull(value);
  if (num === null) return '—';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
};

/** Formata percentagem com 1 casa (ex: 42,5%). Sinal incluído quando negativo. */
export const formatPct = value => {
  const num = toNumberOrNull(value);
  if (num === null) return '—';
  return `${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
};

/**
 * Resumo agregado para a Lista de Produtos.
 * Considera apenas produtos com custo cadastrado E publicados
 * (rascunhos não contam para a saúde financeira do catálogo).
 */
export const summarizeMargins = products => {
  const withCost = products.filter(
    p => toNumberOrNull(p.costPrice) !== null && p.inStock !== false,
  );

  if (withCost.length === 0) {
    return {
      count: 0,
      withoutCost: products.length,
      avgMarginPct: null,
      negativeCount: 0,
      lowCount: 0,
      // Valor de estoque a custo e a preço de venda (para noção de capital parado)
      stockCostValue: 0,
      stockSaleValue: 0,
    };
  }

  let marginSum = 0;
  let negativeCount = 0;
  let lowCount = 0;
  let stockCostValue = 0;
  let stockSaleValue = 0;

  withCost.forEach(p => {
    const m = calcMargin(p.costPrice, p.offerPrice);
    if (!m) return;
    marginSum += m.marginPct;
    if (m.marginPct < 0) negativeCount++;
    else if (m.marginPct < MARGIN_THRESHOLDS.LOW) lowCount++;
    const qty = Number(p.stock) || 0;
    stockCostValue += m.cost * qty;
    stockSaleValue += m.sale * qty;
  });

  return {
    count: withCost.length,
    withoutCost: products.filter(p => toNumberOrNull(p.costPrice) === null)
      .length,
    avgMarginPct: round2(marginSum / withCost.length),
    negativeCount,
    lowCount,
    stockCostValue: round2(stockCostValue),
    stockSaleValue: round2(stockSaleValue),
  };
};
