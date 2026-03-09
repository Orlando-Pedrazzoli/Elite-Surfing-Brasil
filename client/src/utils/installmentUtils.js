// ═══════════════════════════════════════════════════════════
// 💰 CÁLCULO DE PARCELAS — E-COMMERCE BRASIL
// ═══════════════════════════════════════════════════════════
// Parcela mínima: R$10,00 (padrão mercado brasileiro)
// Máximo: 12x sem juros (via Pagar.me)
// Desconto PIX: 10%

const MIN_INSTALLMENT = 10; // R$10,00 mínimo por parcela
const MAX_INSTALLMENTS = 12; // Máximo 12x sem juros
const PIX_DISCOUNT = 0.1; // 10% de desconto no PIX à vista

/**
 * Calcula as opções de parcelamento
 * @param {number} price - Preço do produto (offerPrice)
 * @returns {Object} Dados de parcelamento
 */
export const calculateInstallments = price => {
  if (!price || price <= 0) {
    return {
      pixPrice: 0,
      maxInstallments: 1,
      installmentValue: 0,
      allInstallments: [],
      hasDiscount: false,
    };
  }

  const pixPrice = price * (1 - PIX_DISCOUNT);
  const maxInstallments = Math.min(
    MAX_INSTALLMENTS,
    Math.max(1, Math.floor(price / MIN_INSTALLMENT)),
  );
  const installmentValue =
    maxInstallments > 0 ? price / maxInstallments : price;

  // Gerar todas as opções de parcela
  const allInstallments = [];
  for (let i = 1; i <= maxInstallments; i++) {
    const value = price / i;
    if (value >= MIN_INSTALLMENT || i === 1) {
      allInstallments.push({
        times: i,
        value: value,
        label:
          i === 1
            ? `1x de ${formatBRL(price)} sem juros`
            : `${i}x de ${formatBRL(value)} sem juros`,
      });
    }
  }

  return {
    pixPrice,
    pixDiscount: PIX_DISCOUNT,
    maxInstallments,
    installmentValue,
    allInstallments,
    hasDiscount: pixPrice < price,
  };
};

/**
 * Formata valor em Reais (R$)
 * @param {number} value
 * @returns {string}
 */
export const formatBRL = value => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export { MIN_INSTALLMENT, MAX_INSTALLMENTS, PIX_DISCOUNT };
