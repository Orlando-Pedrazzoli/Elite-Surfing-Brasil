// client/src/utils/priceTableOrderUtils.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS A PARTIR DA TABELA DE LOJISTA — utilitários do painel
// ═══════════════════════════════════════════════════════════════════════
// Texto do WhatsApp, telefone, leitura de pedido colado do WhatsApp,
// download do PDF e atalhos de prazo/condições.
// ═══════════════════════════════════════════════════════════════════════

import { formatBRL } from './priceTableEngine';

export const ORDER_API = '/api/price-tables/orders';

export const ORDER_STATUS_META = {
  rascunho: {
    label: 'Rascunho',
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  enviado: {
    label: 'Enviado',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  confirmado: {
    label: 'Confirmado',
    cls: 'bg-green-50 text-green-700 border-green-200',
  },
  cancelado: {
    label: 'Cancelado',
    cls: 'bg-red-50 text-red-600 border-red-200',
  },
};

/** Atalhos (o vendedor clica e o texto entra no campo, que continua editável). */
export const PAYMENT_PRESETS = [
  'PIX à vista',
  'Boleto 30 dias',
  'Boleto 30/60 dias',
  'Boleto 30/60/90 dias',
  'Cartão de crédito',
];

export const CONDITION_PRESETS = [
  'Frete por conta do cliente',
  'Sujeito à disponibilidade de estoque',
  'Prazo de envio a combinar',
];

/** Tabelas que podem gerar pedido: "Para lojistas" e não arquivadas. */
export const orderableTables = tables =>
  (tables || []).filter(t => t.kind === 'cliente' && !t.archived);

export const formatOrderNumber = number =>
  String(Number(number) || 0).padStart(4, '0');

/** Acrescenta um atalho ao texto (numa linha nova, sem repetir). */
export const appendPreset = (text, preset) => {
  const current = String(text || '').trim();
  if (!current) return preset;
  if (current.toLowerCase().includes(preset.toLowerCase())) return current;
  return `${current}\n${preset}`;
};

// ─────────────────────────────────────────────────────────────────────
// WhatsApp
// ─────────────────────────────────────────────────────────────────────

/**
 * Telefone digitado → número internacional só com dígitos (Brasil).
 *   '(12) 99999-0000'   → '5512999990000'
 *   '+55 12 99999-0000' → '5512999990000'
 *   ''                  → ''
 */
export const normalizePhoneBR = phone => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  digits = digits.replace(/^0+/, ''); // 012... (código de operadora antigo)
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

/** Texto do pedido para o WhatsApp (negrito com *asteriscos*). */
export const buildWhatsAppText = order => {
  const c = order.customer || {};
  const lines = [
    `*ELITE SURFING — Pedido nº ${formatOrderNumber(order.number)}*`,
  ];
  if (c.name) lines.push(`Cliente: ${c.name}`);
  lines.push(
    `Data: ${new Date(order.pricedAt || order.updatedAt || Date.now()).toLocaleDateString('pt-BR')}`,
    '',
    '*ITENS*',
  );
  order.items.forEach(item => {
    const sku = order.showSku !== false && item.sku ? ` (${item.sku})` : '';
    lines.push(
      `• ${item.qty} × ${item.name}${sku} — ${formatBRL(item.unitPrice)} = ${formatBRL(item.total)}`,
    );
  });
  lines.push(
    '',
    `${order.itemCount} ${order.itemCount === 1 ? 'produto' : 'produtos'} · ${order.totalQty} ${order.totalQty === 1 ? 'peça' : 'peças'}`,
    `*TOTAL: ${formatBRL(order.subtotal)}*`,
  );
  if (order.paymentTerms)
    lines.push('', '*Prazo de pagamento*', order.paymentTerms);
  if (order.conditions) lines.push('', '*Condições*', order.conditions);
  lines.push(
    '',
    'Confere os itens e os valores? Se estiver tudo certo, é só confirmar por aqui. 🤙',
  );
  return lines.join('\n');
};

export const whatsappUrl = (phone, text) => {
  const number = normalizePhoneBR(phone);
  const encoded = encodeURIComponent(text);
  return number
    ? `https://wa.me/${number}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

// ─────────────────────────────────────────────────────────────────────
// Pedido colado do WhatsApp → quantidades
// ─────────────────────────────────────────────────────────────────────

const normSku = value =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const QTY_PATTERNS = [
  /(?:^|\s)(\d{1,5})\s*(?:x|un|und|unid|unidades?|p[çc]s?|pe[çc]as?|cx)\b/i,
  /\bx\s*(\d{1,5})\b/i,
  /\bqtd?e?\.?\s*:?\s*(\d{1,5})\b/i,
  /(?:^|\s)(\d{1,5})(?:\s|$)/,
];

/**
 * Lê um pedido colado (uma linha por produto) e reconhece os produtos
 * pelo CÓDIGO (SKU) — com ou sem hífen/espaço: "ES-402", "ES402", "ES 402".
 * Quantidade: "3x", "x3", "3 un", "qtd 3" ou um número solto; sem número,
 * conta 1.
 *
 * @param {string} text
 * @param {Array<{productId:string, product:{sku:string,name:string}}>} rows
 *   linhas da tabela que podem entrar no pedido
 * @returns {{ matches: Array<{productId, name, sku, qty, line}>,
 *             unmatched: string[] }}
 */
export const parseOrderText = (text, rows) => {
  const bySku = new Map();
  rows.forEach(row => {
    const key = normSku(row.product?.sku);
    if (key.length >= 2 && !bySku.has(key)) bySku.set(key, row);
  });

  const matches = [];
  const unmatched = [];

  String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const tokens = line.split(/[\s,;|()[\]]+/).filter(Boolean);
      let found = null;
      // pares primeiro ("ES 402"), depois tokens soltos; o mais longo vence
      const candidates = [];
      for (let i = 0; i < tokens.length; i++) {
        if (i + 1 < tokens.length)
          candidates.push({
            from: i,
            to: i + 1,
            key: normSku(tokens[i] + tokens[i + 1]),
          });
        candidates.push({ from: i, to: i, key: normSku(tokens[i]) });
      }
      candidates
        .sort((a, b) => b.key.length - a.key.length)
        .some(candidate => {
          const row = bySku.get(candidate.key);
          if (!row) return false;
          found = { row, candidate };
          return true;
        });

      if (!found) {
        unmatched.push(line);
        return;
      }

      const rest = tokens
        .filter((_, i) => i < found.candidate.from || i > found.candidate.to)
        .join(' ');
      let qty = 1;
      for (const pattern of QTY_PATTERNS) {
        const m = rest.match(pattern);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > 0) {
            qty = n;
            break;
          }
        }
      }

      matches.push({
        productId: found.row.productId,
        name: found.row.product.name,
        sku: found.row.product.sku,
        qty,
        line,
      });
    });

  return { matches, unmatched };
};

// ─────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────

const filenameFromDisposition = disposition => {
  if (!disposition) return null;
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      /* cai no filename simples */
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : null;
};

/** Pede o PDF do pedido ao servidor (não baixa: devolve o Blob). */
export const fetchOrderPdf = async (axios, order, images) => {
  const response = await axios.post(
    `${ORDER_API}/${order._id}/pdf`,
    { images: !!images },
    { responseType: 'blob', timeout: 70000 },
  );
  return {
    blob: response.data,
    filename:
      filenameFromDisposition(response.headers['content-disposition']) ||
      `Elite-Surfing_Pedido_${formatOrderNumber(order.number)}.pdf`,
    imagesRequested: Number(response.headers['x-images-requested']) || 0,
    imagesLoaded: Number(response.headers['x-images-loaded']) || 0,
  };
};

export const downloadBlob = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
};

/** O aparelho consegue compartilhar um PDF (WhatsApp, email…) pela folha nativa? */
export const canShareFiles = () => {
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    const probe = new File(['%PDF'], 'pedido.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────
// Rascunho local (pedido novo ainda não salvo)
// ─────────────────────────────────────────────────────────────────────
const draftKey = tableId => `es_order_draft_${tableId}`;

export const readDraft = tableId => {
  try {
    const raw = window.localStorage.getItem(draftKey(tableId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeDraft = (tableId, draft) => {
  try {
    window.localStorage.setItem(draftKey(tableId), JSON.stringify(draft));
  } catch {
    /* modo privado / sem espaço: o rascunho só não fica guardado */
  }
};

export const clearDraft = tableId => {
  try {
    window.localStorage.removeItem(draftKey(tableId));
  } catch {
    /* idem */
  }
};
