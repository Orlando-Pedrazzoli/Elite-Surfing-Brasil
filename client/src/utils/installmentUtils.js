// client/src/utils/installmentUtils.js
// ═══════════════════════════════════════════════════════════
// 💰 CÁLCULO DE PARCELAS — E-COMMERCE BRASIL
// ═══════════════════════════════════════════════════════════
// Parcela mínima: R$10,00 (padrão mercado brasileiro)
// Sem juros: até 6x (custo assumido pela loja)
// Com juros: de 7x a 12x (juros do cartão, pagos pelo cliente)
// Desconto PIX: 10%
//
// ⚠️ A taxa de juros de 7x–12x NÃO é calculada aqui: quem aplica é
// o Mercado Pago, conforme a configuração da conta em
// "Seu Negócio > Custos > Parcelamento sem juros" (deve estar em 6x).
// O valor exato com juros é mostrado pelo Card Payment Brick no
// checkout. Este ficheiro só controla o que a loja ANUNCIA.

const MIN_INSTALLMENT = 10; // R$10,00 mínimo por parcela
const MAX_INSTALLMENTS_NO_INTEREST = 6; // Máximo 6x sem juros
const MAX_INSTALLMENTS = 12; // Máximo 12x no total (7x–12x com juros)
const PIX_DISCOUNT = 0.1; // 10% de desconto no PIX à vista

/**
 * Calcula as opções de parcelamento SEM JUROS
 * @param {number} price - Preço do produto (offerPrice)
 * @returns {Object} Dados de parcelamento
 *   maxInstallments / installmentValue / allInstallments → só sem juros
 *   hasInterestOptions → true quando o cliente pode ir além (até 12x com juros)
 *   maxInstallmentsWithInterest → teto de parcelas com juros (12)
 */
export const calculateInstallments = price => {
  if (!price || price <= 0) {
    return {
      pixPrice: 0,
      maxInstallments: 1,
      installmentValue: 0,
      allInstallments: [],
      hasDiscount: false,
      hasInterestOptions: false,
      maxInstallmentsWithInterest: MAX_INSTALLMENTS,
    };
  }

  const pixPrice = price * (1 - PIX_DISCOUNT);
  const maxInstallments = Math.min(
    MAX_INSTALLMENTS_NO_INTEREST,
    Math.max(1, Math.floor(price / MIN_INSTALLMENT)),
  );
  const installmentValue =
    maxInstallments > 0 ? price / maxInstallments : price;

  // Só anunciamos "até 12x com juros" quando o valor comporta mais
  // parcelas do que o limite sem juros (respeitando a parcela mínima)
  const hasInterestOptions =
    Math.floor(price / MIN_INSTALLMENT) > MAX_INSTALLMENTS_NO_INTEREST;

  // Gerar todas as opções de parcela SEM JUROS
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
    hasInterestOptions,
    maxInstallmentsWithInterest: MAX_INSTALLMENTS,
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

export {
  MIN_INSTALLMENT,
  MAX_INSTALLMENTS,
  MAX_INSTALLMENTS_NO_INTEREST,
  PIX_DISCOUNT,
};
