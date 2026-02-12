// ═══════════════════════════════════════════════════════════════════════
// 📦 CÁLCULO DE FRETE — TABELA POR REGIÃO + PESO (BRASIL)
// ═══════════════════════════════════════════════════════════════════════
// Origem: Rio de Janeiro, RJ (Barra da Tijuca - CEP 22790-702)
// Preços calibrados com base na origem RJ → destino por região
// ═══════════════════════════════════════════════════════════════════════
import COMPANY from './companyConfig';

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
  '69': 'AM',
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

// ═══════════════════════════════════════════════════════════════════════
// 📊 TABELA DE FRETE — ORIGEM: RIO DE JANEIRO (RJ)
// ═══════════════════════════════════════════════════════════════════════
// Preços calibrados por distância real do RJ:
//   - local_rj:     Dentro do estado do RJ (mais barato)
//   - sudeste:      SP, MG, ES (próximo)
//   - sul:          PR, SC, RS (distância média-longa)
//   - centro_oeste: DF, GO, MT, MS, TO (distância média)
//   - nordeste:     BA→MA (distância média-longa a longa)
//   - norte:        PA, AM, RR, AP, AC, RO (mais distante, mais caro)
// ═══════════════════════════════════════════════════════════════════════

const SHIPPING_TABLE_PAC = [
  {
    maxWeight: 300,
    label: 'Até 300g',
    prices:   { local_rj: 15.90, sudeste: 19.90, sul: 24.90, centro_oeste: 26.90, nordeste: 29.90, norte: 38.90 },
    deadline: { local_rj: 2,     sudeste: 4,     sul: 5,     centro_oeste: 6,      nordeste: 8,     norte: 12 },
  },
  {
    maxWeight: 500,
    label: 'Até 500g',
    prices:   { local_rj: 17.90, sudeste: 22.90, sul: 27.90, centro_oeste: 29.90, nordeste: 33.90, norte: 42.90 },
    deadline: { local_rj: 2,     sudeste: 4,     sul: 5,     centro_oeste: 6,      nordeste: 8,     norte: 12 },
  },
  {
    maxWeight: 1000,
    label: 'Até 1kg',
    prices:   { local_rj: 20.90, sudeste: 26.90, sul: 32.90, centro_oeste: 34.90, nordeste: 39.90, norte: 49.90 },
    deadline: { local_rj: 2,     sudeste: 5,     sul: 6,     centro_oeste: 7,      nordeste: 9,     norte: 14 },
  },
  {
    maxWeight: 2000,
    label: 'Até 2kg',
    prices:   { local_rj: 24.90, sudeste: 32.90, sul: 38.90, centro_oeste: 40.90, nordeste: 46.90, norte: 58.90 },
    deadline: { local_rj: 3,     sudeste: 5,     sul: 6,     centro_oeste: 7,      nordeste: 10,    norte: 14 },
  },
  {
    maxWeight: 5000,
    label: 'Até 5kg',
    prices:   { local_rj: 32.90, sudeste: 42.90, sul: 49.90, centro_oeste: 52.90, nordeste: 59.90, norte: 75.90 },
    deadline: { local_rj: 3,     sudeste: 6,     sul: 7,     centro_oeste: 8,      nordeste: 10,    norte: 15 },
  },
  {
    maxWeight: 10000,
    label: 'Até 10kg',
    prices:   { local_rj: 42.90, sudeste: 55.90, sul: 65.90, centro_oeste: 69.90, nordeste: 79.90, norte: 99.90 },
    deadline: { local_rj: 3,     sudeste: 7,     sul: 8,     centro_oeste: 9,      nordeste: 12,    norte: 18 },
  },
  {
    maxWeight: 30000,
    label: 'Até 30kg',
    prices:   { local_rj: 59.90, sudeste: 75.90, sul: 89.90, centro_oeste: 95.90, nordeste: 109.90, norte: 139.90 },
    deadline: { local_rj: 4,     sudeste: 8,     sul: 9,     centro_oeste: 10,     nordeste: 13,     norte: 20 },
  },
];

// SEDEX (mais rápido, mais caro) — Origem RJ
const SHIPPING_TABLE_SEDEX = [
  {
    maxWeight: 300,
    prices:   { local_rj: 22.90, sudeste: 29.90, sul: 36.90, centro_oeste: 38.90, nordeste: 44.90, norte: 55.90 },
    deadline: { local_rj: 1,     sudeste: 1,     sul: 2,     centro_oeste: 2,      nordeste: 3,     norte: 5 },
  },
  {
    maxWeight: 500,
    prices:   { local_rj: 25.90, sudeste: 33.90, sul: 40.90, centro_oeste: 42.90, nordeste: 49.90, norte: 60.90 },
    deadline: { local_rj: 1,     sudeste: 1,     sul: 2,     centro_oeste: 2,      nordeste: 3,     norte: 5 },
  },
  {
    maxWeight: 1000,
    prices:   { local_rj: 29.90, sudeste: 38.90, sul: 46.90, centro_oeste: 48.90, nordeste: 55.90, norte: 69.90 },
    deadline: { local_rj: 1,     sudeste: 2,     sul: 2,     centro_oeste: 3,      nordeste: 4,     norte: 6 },
  },
  {
    maxWeight: 2000,
    prices:   { local_rj: 35.90, sudeste: 46.90, sul: 55.90, centro_oeste: 58.90, nordeste: 66.90, norte: 85.90 },
    deadline: { local_rj: 1,     sudeste: 2,     sul: 3,     centro_oeste: 3,      nordeste: 4,     norte: 7 },
  },
  {
    maxWeight: 5000,
    prices:   { local_rj: 45.90, sudeste: 58.90, sul: 69.90, centro_oeste: 72.90, nordeste: 84.90, norte: 109.90 },
    deadline: { local_rj: 1,     sudeste: 2,     sul: 3,     centro_oeste: 3,      nordeste: 5,     norte: 8 },
  },
  {
    maxWeight: 10000,
    prices:   { local_rj: 59.90, sudeste: 75.90, sul: 89.90, centro_oeste: 95.90, nordeste: 109.90, norte: 139.90 },
    deadline: { local_rj: 1,     sudeste: 3,     sul: 3,     centro_oeste: 4,      nordeste: 6,     norte: 9 },
  },
  {
    maxWeight: 30000,
    prices:   { local_rj: 82.90, sudeste: 105.90, sul: 125.90, centro_oeste: 132.90, nordeste: 152.90, norte: 195.90 },
    deadline: { local_rj: 2,     sudeste: 3,      sul: 4,      centro_oeste: 4,      nordeste: 7,      norte: 10 },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO — FRETE GRÁTIS
// ═══════════════════════════════════════════════════════════════════════
const FREE_SHIPPING_THRESHOLD = COMPANY.payments.freeShippingMin;
const FREE_SHIPPING_REGIONS = ['local_rj', 'sudeste'];

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
 * Diferencia "local_rj" (dentro do RJ) de "sudeste" (SP, MG, ES)
 */
export const getRegionFromCep = (cep) => {
  const state = getStateFromCep(cep);
  if (!state) return null;
  
  // Envios dentro do próprio RJ são mais baratos
  if (state === 'RJ') return 'local_rj';
  
  return STATE_TO_REGION[state] || null;
};

/**
 * Nome da região formatado
 */
const REGION_NAMES = {
  local_rj: 'Rio de Janeiro (local)',
  sudeste: 'Sudeste',
  sul: 'Sul',
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
  return (dimensions.length * dimensions.width * dimensions.height) / 6000 * 1000;
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

  const state = getStateFromCep(cep);
  const region = getRegionFromCep(cep);
  
  if (!region) {
    return { error: 'CEP não encontrado. Verifique e tente novamente.' };
  }

  // Peso real do produto (em gramas)
  const realWeight = product?.weight || 300;
  
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
    origin: `${COMPANY.address.city}/${COMPANY.address.state}`,
    originCep: COMPANY.originCep,
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
  if (!isFreeShipping && FREE_SHIPPING_REGIONS.includes(region) && orderTotal < FREE_SHIPPING_THRESHOLD) {
    const remaining = FREE_SHIPPING_THRESHOLD - orderTotal;
    results.freeShippingMessage = `Frete grátis para RJ e Sudeste em compras acima de R$ ${FREE_SHIPPING_THRESHOLD},00. Faltam R$ ${remaining.toFixed(2).replace('.', ',')}!`;
  } else if (!isFreeShipping && !FREE_SHIPPING_REGIONS.includes(region)) {
    results.freeShippingMessage = `Frete grátis para RJ e Sudeste em compras acima de R$ ${FREE_SHIPPING_THRESHOLD},00.`;
  }

  return results;
};

export { FREE_SHIPPING_THRESHOLD, REGION_NAMES };