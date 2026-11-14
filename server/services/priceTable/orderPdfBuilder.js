// server/services/priceTable/orderPdfBuilder.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS — PDF do pedido para o lojista conferir e confirmar
// ═══════════════════════════════════════════════════════════════════════
// Só os itens com quantidade. Colunas: [foto] Código · Produto · Qtd ·
// Preço un. · Total. Cliente, prazo de pagamento e condições só aparecem
// quando foram preenchidos.
// ═══════════════════════════════════════════════════════════════════════

import pdfmake, { BRAND, COLORS } from './pdfSetup.js';
import { formatBRL, formatDateBR } from './exportFormat.js';
import { formatOrderNumber } from './orderBuilder.js';

const PAGE_MARGINS = [36, 36, 36, 44];
const CONTENT_WIDTH = 595.28 - PAGE_MARGINS[0] - PAGE_MARGINS[2];
const IMAGE = 30;

const headCell = (text, alignment = 'left') => ({
  text,
  bold: true,
  fontSize: 8,
  color: COLORS.muted,
  fillColor: COLORS.headRow,
  alignment,
  margin: [0, 2, 0, 2],
});

const placeholder = size => ({
  canvas: [
    {
      type: 'rect',
      x: 0,
      y: 0,
      w: size,
      h: size,
      r: 2,
      color: COLORS.placeholder,
    },
  ],
  width: size,
});

const buildHeader = order => {
  const left = {
    stack: [
      {
        text: BRAND,
        fontSize: 20,
        bold: true,
        color: COLORS.navy,
        characterSpacing: 0.6,
      },
      {
        text: order.tableTitle || 'Tabela de Preços',
        fontSize: 9.5,
        color: COLORS.muted,
        margin: [0, 3, 0, 0],
      },
      {
        text: 'www.elitesurfing.com.br',
        fontSize: 8.5,
        color: COLORS.faint,
        margin: [0, 2, 0, 0],
      },
    ],
  };
  const right = {
    width: 'auto',
    alignment: 'right',
    stack: [
      { text: 'PEDIDO', fontSize: 9, bold: true, color: COLORS.muted },
      {
        text: `Nº ${formatOrderNumber(order.number)}`,
        fontSize: 18,
        bold: true,
        color: COLORS.navy,
      },
      {
        text: `Data: ${formatDateBR(order.pricedAt || order.updatedAt || order.createdAt)}`,
        fontSize: 8.5,
        color: COLORS.muted,
        margin: [0, 2, 0, 0],
      },
    ],
  };
  return {
    columns: [left, right],
    margin: [0, 0, 0, 14],
  };
};

const buildCustomer = order => {
  const c = order.customer || {};
  const lines = [];
  if (c.name) lines.push({ text: c.name, bold: true, fontSize: 10.5 });
  const contact = [c.phone, c.email].filter(Boolean).join('   ·   ');
  if (contact)
    lines.push({
      text: contact,
      fontSize: 9,
      color: COLORS.muted,
      margin: [0, 2, 0, 0],
    });
  if (!lines.length) return null;
  return {
    margin: [0, 0, 0, 12],
    table: {
      widths: [CONTENT_WIDTH - 12],
      body: [
        [
          {
            stack: [
              {
                text: 'CLIENTE',
                fontSize: 7.5,
                bold: true,
                color: COLORS.faint,
                margin: [0, 0, 0, 2],
              },
              ...lines,
            ],
            margin: [6, 5, 6, 5],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.line,
      vLineColor: () => COLORS.line,
    },
  };
};

const buildItems = (order, { withImages, images }) => {
  const showSku = order.showSku !== false;
  const widths = [];
  const head = [];
  if (withImages) {
    widths.push(IMAGE + 2);
    head.push(headCell(''));
  }
  if (showSku) {
    widths.push(60);
    head.push(headCell('Código'));
  }
  widths.push('*', 34, 64, 70);
  head.push(
    headCell('Produto'),
    headCell('Qtd', 'center'),
    headCell('Preço un.', 'right'),
    headCell('Total', 'right'),
  );

  const vPad = withImages ? (IMAGE - 9) / 2 : 0;
  const cell = (text, extra = {}) => ({
    text,
    fontSize: 9,
    color: COLORS.text,
    margin: [0, vPad, 0, 0],
    ...extra,
  });

  const body = [head];
  order.items.forEach(item => {
    const line = [];
    if (withImages)
      line.push(
        images.has(item.image)
          ? { image: item.image, fit: [IMAGE, IMAGE], alignment: 'center' }
          : placeholder(IMAGE),
      );
    if (showSku) line.push(cell(item.sku || '—', { color: COLORS.muted }));
    line.push(
      cell(item.name),
      cell(String(item.qty), { alignment: 'center', bold: true }),
      cell(formatBRL(item.unitPrice), { alignment: 'right' }),
      cell(formatBRL(item.total), { alignment: 'right', bold: true }),
    );
    body.push(line);
  });

  return {
    table: { headerRows: 1, dontBreakRows: true, widths, body },
    layout: {
      hLineWidth: i => (i <= 1 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.line,
      fillColor: rowIndex =>
        rowIndex > 0 && rowIndex % 2 === 0 ? COLORS.zebra : null,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2.5,
      paddingBottom: () => 2.5,
    },
    margin: [0, 0, 0, 10],
  };
};

const buildTotals = order => ({
  columns: [
    {
      width: '*',
      text: `${order.itemCount} ${order.itemCount === 1 ? 'produto' : 'produtos'}  ·  ${order.totalQty} ${order.totalQty === 1 ? 'peça' : 'peças'}`,
      fontSize: 9,
      color: COLORS.muted,
      margin: [0, 6, 0, 0],
    },
    {
      width: 'auto',
      table: {
        body: [
          [
            {
              text: 'TOTAL DO PEDIDO',
              fontSize: 9,
              bold: true,
              color: '#ffffff',
              margin: [8, 6, 12, 6],
            },
            {
              text: formatBRL(order.subtotal),
              fontSize: 13,
              bold: true,
              color: '#ffffff',
              alignment: 'right',
              margin: [0, 4, 8, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => COLORS.navy,
      },
    },
  ],
  margin: [0, 0, 0, 14],
});

const buildTerms = order => {
  const blocks = [];
  const add = (label, text) => {
    if (!text) return;
    blocks.push(
      { text: label, bold: true, fontSize: 9, color: COLORS.navy },
      {
        text,
        fontSize: 9,
        color: COLORS.text,
        margin: [0, 2, 0, 8],
        lineHeight: 1.25,
      },
    );
  };
  add('Prazo de pagamento', order.paymentTerms);
  add('Condições', order.conditions);
  if (!blocks.length) return null;
  return {
    unbreakable: true,
    table: {
      widths: [CONTENT_WIDTH - 12],
      body: [[{ stack: blocks, margin: [6, 6, 6, 0] }]],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.line,
      vLineColor: () => COLORS.line,
    },
  };
};

/**
 * @param {object} order  PriceTableOrder (lean)
 * @param {object} [opts]
 * @param {boolean} [opts.withImages=false]
 * @param {Map} [opts.images]  Map(urlOriginal → { dataUrl }) do imageLoader
 * @returns {Promise<Buffer>}
 */
export const buildOrderPdf = async (order, opts = {}) => {
  const images = opts.images || new Map();
  const withImages = !!opts.withImages;

  const content = [buildHeader(order)];
  const customer = buildCustomer(order);
  if (customer) content.push(customer);
  content.push(buildItems(order, { withImages, images }), buildTotals(order));
  const terms = buildTerms(order);
  if (terms) content.push(terms);
  content.push({
    text: 'Confira os itens e os valores. Para confirmar o pedido, é só responder a esta mensagem.',
    fontSize: 8,
    color: COLORS.faint,
    margin: [0, 10, 0, 0],
  });

  const imageDict = {};
  if (withImages)
    order.items.forEach(item => {
      const loaded = images.get(item.image);
      if (loaded) imageDict[item.image] = loaded.dataUrl;
    });

  const label = `${BRAND} · Pedido nº ${formatOrderNumber(order.number)}`;

  return pdfmake
    .createPdf({
      pageSize: 'A4',
      pageMargins: PAGE_MARGINS,
      info: {
        title: `Pedido ${formatOrderNumber(order.number)} — Elite Surfing`,
        author: 'Elite Surfing Brasil',
        subject: 'Pedido',
      },
      defaultStyle: { font: 'Roboto', fontSize: 9, color: COLORS.text },
      content,
      images: imageDict,
      footer: (currentPage, pageCount) => ({
        text: `${label}   |   Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        fontSize: 7.5,
        color: COLORS.faint,
        margin: [0, 16, 0, 0],
      }),
    })
    .getBuffer();
};
