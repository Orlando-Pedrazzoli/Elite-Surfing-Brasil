// server/services/melhorEnvioLabelService.js
// ═══════════════════════════════════════════════════════════════════════
// 🏷️ MELHOR ENVIO — COMPRA E IMPRESSÃO DE ETIQUETAS
// ═══════════════════════════════════════════════════════════════════════
// Fluxo oficial (docs.melhorenvio.com.br, atualizado 2026):
//   1. POST /api/v2/me/cart               → insere o envio no carrinho ME
//   2. POST /api/v2/me/shipment/checkout  → paga com saldo da carteira ME
//   3. POST /api/v2/me/shipment/generate  → gera a etiqueta (assíncrono)
//   4. POST /api/v2/me/shipment/print     → retorna URL do PDF
//
// Regras importantes da API atual:
//   - Desde 06/04/2026 a API integra com a SEFAZ (DC-e): o array
//     `products` (nome, quantidade, valor unitário) é OBRIGATÓRIO e
//     deve estar completo e correto.
//   - Envio NÃO comercial (declaração de conteúdo): NÃO enviar
//     options.invoice; from.state_register vazio ou "ISENTO".
//   - Envio comercial: enviar options.invoice.key (chave da NF-e).
//   - Correios (serviços 1, 2, 17): apenas 1 volume por requisição de
//     carrinho — múltiplos pacotes = múltiplas inserções.
//   - Azul Cargo (15, 16): compra de etiqueta NÃO disponível via API.
//   - Latam (12) e Buslog (14) com token de painel exigem `agency`.
//   - Etiqueta no carrinho expira em 7 dias se não for comprada.
//
// Variáveis de ambiente necessárias (.env) — dados do REMETENTE:
//   MELHOR_ENVIO_TOKEN   (já existente)
//   MELHOR_ENVIO_URL     (já existente — sandbox ou produção)
//   ORIGIN_CEP           (já existente)
//   ME_FROM_NAME         Ex: "Elite Surfing"
//   ME_FROM_EMAIL        Ex: "elitesurfingrj@yahoo.com.br"
//   ME_FROM_PHONE        Ex: "21999998888" (só dígitos)
//   ME_FROM_DOCUMENT     CPF do remetente (se Pessoa Física) OU
//   ME_FROM_CNPJ         CNPJ do remetente (se Pessoa Jurídica)
//   ME_FROM_ADDRESS      Ex: "Av. das Américas"
//   ME_FROM_NUMBER       Ex: "1000"
//   ME_FROM_COMPLEMENT   (opcional)
//   ME_FROM_DISTRICT     Ex: "Barra da Tijuca"
//   ME_FROM_CITY         Ex: "Rio de Janeiro"
//   ME_FROM_STATE        Ex: "RJ"
//   MELHOR_ENVIO_AGENCY  (opcional — ID da agência p/ Latam/Buslog)
// ═══════════════════════════════════════════════════════════════════════

import axios from 'axios';
import { ORIGIN_CEP } from './melhorEnvioService.js';

const MELHOR_ENVIO_URL =
  process.env.MELHOR_ENVIO_URL || 'https://www.melhorenvio.com.br';
const MELHOR_ENVIO_TOKEN = process.env.MELHOR_ENVIO_TOKEN;
const ME_AGENCY = process.env.MELHOR_ENVIO_AGENCY || null;

const USER_AGENT = 'Elite Surfing Brasil (elitesurfingrj@yahoo.com.br)';

// Serviços com regras especiais
const CORREIOS_SERVICES = [1, 2, 17]; // 1 volume por etiqueta
const AZUL_SERVICES = [15, 16]; // compra via API indisponível
const AGENCY_REQUIRED_SERVICES = [12, 14]; // Latam, Buslog (token de painel)

// ─── Cliente HTTP ──────────────────────────────────────────────────────

const me = axios.create({
  baseURL: `${MELHOR_ENVIO_URL}/api/v2/me`,
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${MELHOR_ENVIO_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────

const onlyDigits = value => String(value || '').replace(/\D/g, '');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Estados por extenso → UF (o checkout do site pode gravar por extenso;
// a API valida a UF contra o CEP, então só enviamos se for confiável)
const STATE_TO_UF = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const toUf = value => {
  if (!value) return null;
  const clean = String(value).trim();
  if (/^[A-Za-z]{2}$/.test(clean)) return clean.toUpperCase();
  const normalized = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return STATE_TO_UF[normalized] || null;
};

// Extrai mensagem legível dos erros 422 da API do ME
const extractMeError = error => {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Erro na API do Melhor Envio';
  if (data.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0];
    const firstMsg = Array.isArray(data.errors[firstKey])
      ? data.errors[firstKey][0]
      : data.errors[firstKey];
    return `${firstMsg}`;
  }
  return data.message || data.error || 'Erro na API do Melhor Envio';
};

// ─── Remetente (env) ───────────────────────────────────────────────────

const buildSender = () => {
  const required = {
    ME_FROM_NAME: process.env.ME_FROM_NAME,
    ME_FROM_PHONE: process.env.ME_FROM_PHONE,
    ME_FROM_ADDRESS: process.env.ME_FROM_ADDRESS,
    ME_FROM_DISTRICT: process.env.ME_FROM_DISTRICT,
    ME_FROM_CITY: process.env.ME_FROM_CITY,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const cpf = onlyDigits(process.env.ME_FROM_DOCUMENT);
  const cnpj = onlyDigits(process.env.ME_FROM_CNPJ);
  if (!cpf && !cnpj) missing.push('ME_FROM_DOCUMENT ou ME_FROM_CNPJ');

  if (missing.length > 0) {
    throw new Error(
      `Dados do remetente incompletos no .env: ${missing.join(', ')}`,
    );
  }

  const from = {
    name: process.env.ME_FROM_NAME,
    email: process.env.ME_FROM_EMAIL || '',
    phone: onlyDigits(process.env.ME_FROM_PHONE),
    address: process.env.ME_FROM_ADDRESS,
    complement: process.env.ME_FROM_COMPLEMENT || '',
    number: process.env.ME_FROM_NUMBER || 'S/N',
    district: process.env.ME_FROM_DISTRICT,
    city: process.env.ME_FROM_CITY,
    postal_code: ORIGIN_CEP,
  };

  const uf = toUf(process.env.ME_FROM_STATE);
  if (uf) from.state_abbr = uf;

  if (cnpj) {
    // Pessoa Jurídica
    from.document = '';
    from.company_document = cnpj;
    // Sem NF-e → state_register "ISENTO" (regra da declaração de conteúdo)
    from.state_register = process.env.ME_FROM_STATE_REGISTER || 'ISENTO';
  } else {
    // Pessoa Física
    from.document = cpf;
  }

  return from;
};

// ─── Destinatário (Address do pedido) ──────────────────────────────────

const buildRecipient = (address, recipientDocument) => {
  const cpf = onlyDigits(recipientDocument || address.cpf);
  if (cpf.length !== 11) {
    throw new Error(
      'CPF do destinatário ausente ou inválido. Informe o CPF para emitir a etiqueta (obrigatório para a declaração de conteúdo).',
    );
  }

  const to = {
    name: `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    email: address.email || '',
    phone: onlyDigits(address.phone),
    document: cpf,
    address: address.street,
    complement: address.complement || '',
    number: address.number || 'S/N',
    district: address.neighborhood || '',
    city: address.city,
    postal_code: onlyDigits(address.zipcode),
    country_id: 'BR',
  };

  const uf = toUf(address.state);
  if (uf) to.state_abbr = uf;

  return to;
};

// ─── Volumes: re-cota para obter os pacotes do serviço escolhido ───────
// A cotação original não persiste os pacotes no pedido; refazer a cotação
// com os MESMOS produtos garante volumes idênticos aos cotados.

const getVolumesForService = async (destinationCep, products, serviceId) => {
  const formattedProducts = products.map(product => ({
    id: String(product._id),
    width:
      Number(product.dimensions?.width) > 0
        ? Number(product.dimensions.width)
        : 11,
    height:
      Number(product.dimensions?.height) > 0
        ? Number(product.dimensions.height)
        : 2,
    length:
      Number(product.dimensions?.length) > 0
        ? Number(product.dimensions.length)
        : 16,
    weight: Math.max(Number(product.weight || 0) / 1000, 0.3),
    insurance_value: Number(product.offerPrice || 0),
    quantity: Number(product.quantity || 1),
  }));

  const { data } = await me.post('/shipment/calculate', {
    from: { postal_code: ORIGIN_CEP },
    to: { postal_code: onlyDigits(destinationCep) },
    products: formattedProducts,
  });

  const quote = (Array.isArray(data) ? data : []).find(
    q => Number(q.id) === Number(serviceId),
  );

  if (!quote || quote.error) {
    throw new Error(
      `O serviço de frete escolhido no pedido (id ${serviceId}) não está mais disponível para este CEP: ${quote?.error || 'sem cotação'}. Compre a etiqueta manualmente no painel escolhendo outro serviço.`,
    );
  }

  const volumes = (quote.packages || []).map(pkg => ({
    height: Number(pkg.dimensions?.height || pkg.height),
    width: Number(pkg.dimensions?.width || pkg.width),
    length: Number(pkg.dimensions?.length || pkg.length),
    weight: Number(pkg.weight),
  }));

  if (volumes.length === 0) {
    throw new Error('A cotação não retornou pacotes para este serviço.');
  }

  return { volumes, quotedPrice: Number(quote.custom_price || quote.price) };
};

// ─── Passo 1: Inserir no carrinho ──────────────────────────────────────

/**
 * Insere o(s) envio(s) do pedido no carrinho do Melhor Envio.
 * Retorna array de IDs de etiqueta (Correios pode gerar 1 por pacote).
 */
export const addOrderToMeCart = async ({
  order,
  address,
  products, // [{ _id, name, offerPrice, quantity, weight, dimensions }]
  invoiceKey = null,
  recipientDocument = null,
}) => {
  if (!MELHOR_ENVIO_TOKEN) {
    throw new Error('MELHOR_ENVIO_TOKEN não configurado no .env');
  }

  const serviceId = Number(order.shippingServiceId);
  if (!serviceId) {
    throw new Error(
      'Pedido sem serviço de frete do Melhor Envio (shippingServiceId vazio). Provável retirada local ou pedido antigo — emita manualmente no painel.',
    );
  }

  if (AZUL_SERVICES.includes(serviceId)) {
    throw new Error(
      'A Azul Cargo não permite compra de etiquetas via API. Emita esta etiqueta diretamente no painel do Melhor Envio.',
    );
  }

  if (AGENCY_REQUIRED_SERVICES.includes(serviceId) && !ME_AGENCY) {
    throw new Error(
      'Latam/Buslog exigem agência de postagem. Configure MELHOR_ENVIO_AGENCY no .env (ID da agência) ou emita no painel.',
    );
  }

  const from = buildSender();
  const to = buildRecipient(address, recipientDocument);

  // 🆕 Obrigatório desde 06/04/2026 (DC-e / SEFAZ): produtos completos
  const meProducts = products.map(p => ({
    name: String(p.name || 'Produto').slice(0, 255),
    quantity: String(p.quantity || 1),
    unitary_value: String(Number(p.offerPrice || 0).toFixed(2)),
  }));

  const insuranceValue = products.reduce(
    (sum, p) => sum + Number(p.offerPrice || 0) * Number(p.quantity || 1),
    0,
  );

  const { volumes } = await getVolumesForService(
    address.zipcode,
    products,
    serviceId,
  );

  const baseOptions = {
    platform: 'Elite Surfing Brasil',
    reminder: `Pedido ${String(order._id).slice(-8).toUpperCase()}`,
    insurance_value: Number(insuranceValue.toFixed(2)),
    receipt: false,
    own_hand: false,
    reverse: false,
    non_commercial: !invoiceKey,
    tags: [
      {
        tag: String(order._id),
        url: `https://www.elitesurfing.com.br/seller/orders`,
      },
    ],
  };

  if (invoiceKey) {
    baseOptions.invoice = { key: onlyDigits(invoiceKey) };
  }

  const basePayload = { service: serviceId, from, to, products: meProducts };
  if (AGENCY_REQUIRED_SERVICES.includes(serviceId) && ME_AGENCY) {
    basePayload.agency = Number(ME_AGENCY);
  }

  // Correios: 1 volume por etiqueta → n inserções. Demais: 1 inserção.
  const cartPayloads = CORREIOS_SERVICES.includes(serviceId)
    ? volumes.map(volume => ({
        ...basePayload,
        volumes: [volume],
        options: baseOptions,
      }))
    : [{ ...basePayload, volumes, options: baseOptions }];

  const shipmentIds = [];
  for (const payload of cartPayloads) {
    try {
      const { data } = await me.post('/cart', payload);
      if (!data?.id) {
        throw new Error('Resposta do carrinho sem ID de etiqueta');
      }
      shipmentIds.push(data.id);
      console.log(
        `🏷️ ME cart — etiqueta ${data.id} inserida (pedido ${order._id})`,
      );
    } catch (error) {
      // Se alguma inserção falhar após outras terem sucesso, devolve as
      // que já entraram (o carrinho ME expira em 7 dias, sem custo)
      if (shipmentIds.length > 0) {
        return {
          shipmentIds,
          partial: true,
          error: extractMeError(error),
        };
      }
      throw new Error(extractMeError(error));
    }
  }

  return { shipmentIds, partial: false };
};

// ─── Passo 2: Checkout (paga com saldo da carteira ME) ─────────────────

export const checkoutShipments = async shipmentIds => {
  try {
    const { data } = await me.post('/shipment/checkout', {
      orders: shipmentIds,
    });
    return data;
  } catch (error) {
    const message = extractMeError(error);
    // Saldo insuficiente é o erro mais comum aqui
    if (/saldo|balance|insufficient/i.test(message)) {
      throw new Error(
        'Saldo insuficiente na carteira do Melhor Envio. As etiquetas já estão no carrinho — adicione saldo em melhorenvio.com.br e clique novamente em "Etiqueta ME".',
      );
    }
    throw new Error(message);
  }
};

// ─── Passo 3: Gerar etiquetas (assíncrono no ME) ───────────────────────

export const generateLabels = async shipmentIds => {
  try {
    const { data } = await me.post('/shipment/generate', {
      orders: shipmentIds,
    });
    return data;
  } catch (error) {
    throw new Error(extractMeError(error));
  }
};

// ─── Passo 4: URL de impressão do PDF ──────────────────────────────────

export const printLabels = async shipmentIds => {
  try {
    const { data } = await me.post('/shipment/print', {
      mode: 'private',
      orders: shipmentIds,
    });
    if (!data?.url) {
      throw new Error('Impressão não retornou URL');
    }
    return data.url;
  } catch (error) {
    throw new Error(extractMeError(error));
  }
};

// ─── Consulta: código de rastreio / status da etiqueta ─────────────────

export const getShipmentInfo = async shipmentId => {
  try {
    const { data } = await me.get(`/orders/${shipmentId}`);
    return {
      id: data.id,
      status: data.status,
      tracking: data.tracking || null,
      protocol: data.protocol || null,
    };
  } catch (error) {
    console.warn('⚠️ ME — falha ao consultar etiqueta:', extractMeError(error));
    return null;
  }
};

export { sleep as meDelay };
