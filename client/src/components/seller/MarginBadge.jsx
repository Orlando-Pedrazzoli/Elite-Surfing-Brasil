// client/src/components/seller/MarginBadge.jsx
import React from 'react';
import {
  calcMargin,
  getMarginTone,
  MARGIN_TONE_CLASSES,
  MARGIN_TONE_LABELS,
  formatBRL,
  formatPct,
} from '../../utils/pricingUtils';

/**
 * Badge compacto de margem para a Lista de Produtos (tabela e grid).
 * Mostra "42,5%" colorido; o title traz lucro e markup no hover.
 *
 * @param {number|null} costPrice
 * @param {number} offerPrice
 * @param {'sm'|'xs'} size
 */
const MarginBadge = ({ costPrice, offerPrice, size = 'xs' }) => {
  const margin = calcMargin(costPrice, offerPrice);
  const tone = getMarginTone(margin?.marginPct ?? null);

  const sizeClasses =
    size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5';

  if (!margin) {
    return (
      <span
        className={`inline-flex items-center rounded-md border font-medium ${sizeClasses} ${MARGIN_TONE_CLASSES.none}`}
        title='Cadastre o custo do fornecedor para ver a margem'
      >
        {MARGIN_TONE_LABELS.none}
      </span>
    );
  }

  const tooltip = [
    `Custo: ${formatBRL(margin.cost)}`,
    `Venda: ${formatBRL(margin.sale)}`,
    `Lucro: ${formatBRL(margin.profit)}`,
    `Margem: ${formatPct(margin.marginPct)}`,
    margin.markupPct !== null ? `Markup: ${formatPct(margin.markupPct)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-semibold tabular-nums ${sizeClasses} ${MARGIN_TONE_CLASSES[tone]}`}
      title={tooltip}
    >
      {tone === 'negative' && <span aria-hidden>▼</span>}
      {formatPct(margin.marginPct)}
    </span>
  );
};

export default MarginBadge;
