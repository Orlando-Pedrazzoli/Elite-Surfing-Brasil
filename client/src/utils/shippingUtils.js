// ═══════════════════════════════════════════════════════════
// 📦 CÁLCULO DE FRETE — TABELA POR REGIÃO + PESO (BRASIL)
// ═══════════════════════════════════════════════════════════
// Baseado em faixas reais de Correios PAC/SEDEX
// CEP de origem configurável (padrão: região SC - sede Wet Dreams fica em SC)

// 🗺️ MAPEAMENTO CEP → ESTADO (2 primeiros dígitos)
const CEP_TO_STATE = {
  '01': 'SP', '02': 'SP', '03': 'SP', '04': 'SP', '05': 'SP',
  '06': 'SP', '07': 'SP', '08': 'SP', '09': 'SP',
  '10': 'SP', '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP',
  '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
  '20': 'RJ', '21': 'RJ', '22': 'RJ', '23': 'RJ',
  '24': 'RJ', '25': 'RJ', '26': 'RJ', '27': 'RJ', '28': 'RJ',
  '29': 'ES',
  '30': 'MG', '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG',
  '35': 'MG', '36': 'MG', '37': 'MG', '38': 'MG', '39': 'MG',
  '40': 'BA', '41': 'BA', '42': 'BA', '43': 'BA', '44': 'BA',
  '45': 'BA', '46': 'BA', '47': 'BA', '48': 'BA',
  '49': 'SE',
  '50': 'PE', '51': 'PE', '52': 'PE', '53': 'PE', '54': 'PE',
  '55': 'PE', '56': 'PE',
  '57': 'AL',
  '58': 'PB',
  '59': 'RN',
  '60': 'CE', '61': 'CE', '62': 'CE', '63': 'CE',
  '64': 'PI',
  '65': 'MA',
  '66': 'PA', '67': 'PA', '68': 'PA',
  '69': 'AM', // AM, RR, AP, AC, RO — tratados como Norte
  '70': 'DF', '71': 'DF', '72': 'GO', '73': 'GO',
  '74': 'GO', '75': 'GO', '76': 'GO',
  '77': 'TO',
  '78': 'MT',
  '79': 'MS',
  '80': 'PR', '81': 'PR', '82': 'PR', '83': 'PR',
  '84': 'PR', '85': 'PR', '86': 'PR', '87': 'PR',
  '88': 'SC', '89': 'SC',
  '90': 'RS', '91': 'RS', '92': 'RS', '93': 'RS',
  '94': 'RS', '95': 'RS', '96': 'RS', '97': 'RS', '98': 'RS', '99': 'RS',
};

// 🗺️ ESTADO → REGIÃO
const STATE_TO_REGION = {
  SP: 'sudeste', RJ: 'sudeste', MG: 'sudeste', ES: 'sudeste',
  PR: 'sul', SC: 'sul', RS: 'sul',
  DF: 'centro_oeste', GO: 'centro_oeste', MT: 'centro_oeste', MS: 'centro_oeste', TO: 'centro_oeste',
  BA: 'nordeste', SE: 'nordeste', PE: 'nordeste', AL: 'nordeste',
  PB: 'nordeste', RN: 'nordeste', CE: 'nordeste', PI: 'nordeste', MA: 'nordeste',
  PA: 'norte', AM: 'norte', RR: 'norte', AP: 'norte', AC: 'norte', RO: 'norte',
};

// 📊 TABELA DE FRETE POR REGIÃO + FAIXA DE PESO (em gramas)
// Valores aproximados baseados em Correios PAC
// Cada faixa: { maxWeight: gramas, prices: { região: valor } }
const SHIPPING_TABLE_PAC = [
  {
    maxWeight: 300,
    label: 'Até 300g',
    prices: { sul: 18.90, sudeste: 22.90, centro_oeste: 27.90, nordeste: 32.90, norte: 38.90 },
    deadline: { sul: 4, sudeste: 6, centro_oeste: 8, nordeste: 10, norte: 12 },
  },
  {
    maxWeight: 500,
    label: 'Até 500g',
    prices: { sul: 20.90, sudeste: 25.90, centro_oeste: 30.90, nordeste: 36.90, norte: 42.90 },
    deadline: { sul: 4, sudeste: 6, centro_oeste: 8, nordeste: 10, norte: 12 },
  },
  {
    maxWeight: 1000,
    label: 'Até 1kg',
    prices: { sul: 24.90, sudeste: 29.90, centro_oeste: 35.90, nordeste: 42.90, norte: 49.90 },
    deadline: { sul: 5, sudeste: 7, centro_oeste: 9, nordeste: 11, norte: 14 },
  },
  {
    maxWeight: 2000,
    label: 'Até 2kg',
    prices: { sul: 29.90, sudeste: 36.90, centro_oeste: 42.90, nordeste: 49.90, norte: 58.90 },
    deadline: { sul: 5, sudeste: 7, centro_oeste: 9, nordeste: 11, norte: 14 },
  },
  {
    maxWeight: 5000,
    label: 'Até 5kg',
    prices: { sul: 38.90, sudeste: 45.90, centro_oeste: 55.90, nordeste: 65.90, norte: 75.90 },
    deadline: { sul: 6, sudeste: 8, centro_oeste: 10, nordeste: 12, norte: 15 },
  },
  {
    maxWeight: 10000,
    label: 'Até 10kg',
    prices: { sul: 49.90, sudeste: 59.90, centro_oeste: 72.90, nordeste: 85.90, norte: 99.90 },
    deadline: { sul: 7, sudeste: 9, centro_oeste: 11, nordeste: 14, norte: 18 },
  },
  {
    maxWeight: 30000,
    label: 'Até 30kg',
    prices: { sul: 69.90, sudeste: 82.90, centro_oeste: 99.90, nordeste: 119.90, norte: 139.90 },
    deadline: { sul: 8, sudeste: 10, centro_oeste: 12, nordeste: 15, norte: 20 },
  },
];

// SEDEX (mais rápido, mais caro)
const SHIPPING_TABLE_SEDEX = [
  {
    maxWeight: 300,
    prices: { sul: 27.90, sudeste: 32.90, centro_oeste: 38.90, nordeste: 45.90, norte: 55.90 },
    deadline: { sul: 1, sudeste: 2, centro_oeste: 3, nordeste: 4, norte: 5 },
  },
  {
    maxWeight: 500,
    prices: { sul: 30.90, sudeste: 36.90, centro_oeste: 42.90, nordeste: 50.90, norte: 60.90 },
    deadline: { sul: 1, sudeste: 2, centro_oeste: 3, nordeste: 4, norte: 5 },
  },
  {
    maxWeight: 1000,
    prices: { sul: 35.90, sudeste: 42.90, centro_oeste: 49.90, nordeste: 58.90, norte: 69.90 },
    deadline: { sul: 1, sudeste: 2, centro_oeste: 3, nordeste: 5, norte: 6 },
  },
  {
    maxWeight: 2000,
    prices: { sul: 42.90, sudeste: 52.90, centro_oeste: 62.90, nordeste: 72.90, norte: 85.90 },
    deadline: { sul: 2, sudeste: 3, centro_oeste: 4, nordeste: 5, norte: 7 },
  },
  {
    maxWeight: 5000,
    prices: { sul: 55.90, sudeste: 65.90, centro_oeste: 78.90, nordeste: 92.90, norte: 109.90 },
    deadline: { sul: 2, sudeste: 3, centro_oeste: 4, nordeste: 6, norte: 8 },
  },
  {
    maxWeight: 10000,
    prices: { sul: 72.90, sudeste: 85.90, centro_oeste: 99.90, nordeste: 119.90, norte: 139.90 },
    deadline: { sul: 3, sudeste: 4, centro_oeste: 5, nordeste: 7, norte: 9 },
  },
  {
    maxWeight: 30000,
    prices: { sul: 99.90, sudeste: 119.90, centro_oeste: 139.90, nordeste: 165.90, norte: 195.90 },
    deadline: { sul: 3, sudeste: 4, centro_oeste: 6, nordeste: 8, norte: 10 },
  },
];

// ═══════════════════════════════════════════════════════════
// CONFIGURAÇÃO — FRETE GRÁTIS
// ═══════════════════════════════════════════════════════════
const FREE_SHIPPING_THRESHOLD = 299; // Frete grátis acima de R$299
const FREE_SHIPPING_REGIONS = ['sul', 'sudeste']; // Regiões com frete grátis (se acima do threshold)

/**
 * Validar formato do CEP
 */
export const isValidCep = (cep) => {
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
};

/**
 * Formatar CEP com máscara
 */
export const formatCep = (cep) => {
  const clean = cep.replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
};

/**
 * Obter estado a partir do CEP
 */
export const getStateFromCep = (cep) => {
  const clean = cep.replace(/\D/g, '');
  const prefix = clean.substring(0, 2);
  return CEP_TO_STATE[prefix] || null;
};

/**
 * Obter região a partir do CEP
 */
export const getRegionFromCep = (cep) => {
  const state = getStateFromCep(cep);
  if (!state) return null;
  return STATE_TO_REGION[state] || null;
};

/**
 * Nome da região formatado
 */
const REGION_NAMES = {
  sul: 'Sul',
  sudeste: 'Sudeste',
  centro_oeste: 'Centro-Oeste',
  nordeste: 'Nordeste',
  norte: 'Norte',
};

/**
 * Calcular peso cúbico (para itens volumosos)
 * Fórmula padrão Correios: (C × L × A) / 6000
 */
const calculateCubicWeight = (dimensions) => {
  if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
    return 0;
  }
  return (dimensions.length * dimensions.width * dimensions.height) / 6000 * 1000; // em gramas
};

/**
 * Calcular frete para um produto
 * @param {string} cep - CEP de destino
 * @param {Object} product - Produto com weight e dimensions
 * @param {number} orderTotal - Valor total do pedido (para frete grátis)
 * @returns {Object} Resultado do cálculo de frete
 */
export const calculateShipping = (cep, product, orderTotal = 0) => {
  if (!isValidCep(cep)) {
    return { error: 'CEP inválido. Verifique e tente novamente.' };
  }

  const region = getRegionFromCep(cep);
  const state = getStateFromCep(cep);
  
  if (!region) {
    return { error: 'CEP não encontrado. Verifique e tente novamente.' };
  }

  // Peso real do produto (em gramas)
  const realWeight = product?.weight || 300; // default 300g se não informado
  
  // Peso cúbico
  const cubicWeight = calculateCubicWeight(product?.dimensions);
  
  // Usar o MAIOR entre peso real e cúbico (regra dos Correios)
  const effectiveWeight = Math.max(realWeight, cubicWeight);

  // Verificar frete grátis
  const isFreeShipping = 
    orderTotal >= FREE_SHIPPING_THRESHOLD && 
    FREE_SHIPPING_REGIONS.includes(region);

  // Encontrar faixa de peso
  const pacRate = SHIPPING_TABLE_PAC.find(rate => effectiveWeight <= rate.maxWeight);
  const sedexRate = SHIPPING_TABLE_SEDEX.find(rate => effectiveWeight <= rate.maxWeight);

  if (!pacRate) {
    return { error: 'Produto excede o peso máximo para envio. Entre em contato.' };
  }

  const results = {
    state,
    region,
    regionName: REGION_NAMES[region],
    effectiveWeight,
    options: [],
  };

  // PAC
  results.options.push({
    type: 'PAC',
    name: 'PAC - Encomenda',
    price: isFreeShipping ? 0 : pacRate.prices[region],
    originalPrice: pacRate.prices[region],
    deadline: pacRate.deadline[region],
    deadlineText: `${pacRate.deadline[region]} a ${pacRate.deadline[region] + 2} dias úteis`,
    isFree: isFreeShipping,
    icon: '📦',
  });

  // SEDEX
  if (sedexRate) {
    results.options.push({
      type: 'SEDEX',
      name: 'SEDEX - Expresso',
      price: sedexRate.prices[region],
      originalPrice: sedexRate.prices[region],
      deadline: sedexRate.deadline[region],
      deadlineText: `${sedexRate.deadline[region]} a ${sedexRate.deadline[region] + 1} dias úteis`,
      isFree: false,
      icon: '🚀',
    });
  }

  // Mensagem de frete grátis
  if (!isFreeShipping && orderTotal < FREE_SHIPPING_THRESHOLD) {
    const remaining = FREE_SHIPPING_THRESHOLD - orderTotal;
    results.freeShippingMessage = `Frete grátis para ${FREE_SHIPPING_REGIONS.map(r => REGION_NAMES[r]).join(' e ')} em compras acima de R$ ${FREE_SHIPPING_THRESHOLD},00. Faltam R$ ${remaining.toFixed(2).replace('.', ',')}!`;
  }

  return results;
};

export { FREE_SHIPPING_THRESHOLD, REGION_NAMES };