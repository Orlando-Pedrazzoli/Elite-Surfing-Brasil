// server/services/priceTable/pdfBuilder.js
// ═══════════════════════════════════════════════════════════════════════
// 📄 TABELAS DE PREÇO — geração do PDF (pdfmake)
// ═══════════════════════════════════════════════════════════════════════
// Dois layouts:
//   • list → uma linha por produto (Código / Produto / Preço), com
//            miniatura opcional. É o formato da tabela de preços clássica.
//   • grid → catálogo em grade (3 por linha) com imagem grande, para o
//            lojista reconhecer o produto.
//
// Robustez em serverless (Vercel):
//   • As fontes vêm de `pdfmake/build/vfs_fonts.js` (Roboto embutida em
//     JS) e ficam no sistema de arquivos virtual do pdfmake — não depende
//     de arquivos .ttf serem incluídos no bundle da função.
//   • As imagens entram como data URL já baixadas pelo imageLoader.
//     O pdfmake fica PROIBIDO de buscar URLs ou ler arquivos locais
//     (setUrlAccessPolicy / setLocalAccessPolicy → false).
// ═══════════════════════════════════════════════════════════════════════

import pdfmake from 'pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts.js';
import {
  documentTitle,
  formatBRL,
  formatDateBR,
  formatPct,
} from './exportFormat.js';

Object.entries(vfsFonts).forEach(([name, base64]) => {
  pdfmake.virtualfs.writeFileSync(name, Buffer.from(base64, 'base64'));
});
pdfmake.setFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
});
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(() => false);

const BRAND = 'ELITE SURFING';
const COLORS = {
  navy: '#0F3057',
  text: '#1f2937',
  muted: '#6b7280',
  faint: '#9ca3af',
  line: '#e5e7eb',
  zebra: '#f8fafc',
  headRow: '#eef2f7',
  price: '#15803d',
  danger: '#b91c1c',
  placeholder: '#f1f5f9',
};

const PAGE_MARGINS = [36, 36, 36, 44];
const CONTENT_WIDTH = 595.28 - PAGE_MARGINS[0] - PAGE_MARGINS[2];

const GRID_COLUMNS = 3;
const GRID_IMAGE = 116;
const LIST_IMAGE = 30;

/**
 * Tabela interna cujo preço é o próprio custo (0% em tudo): basta UMA
 * coluna, chamada "Custo". Caso contrário a interna mostra Custo, % e Preço.
 */
const isPureCostTable = doc =>
  doc.kind === 'interna' &&
  doc.sections.every(section =>
    section.rows.every(row => row.cost !== null && row.cost === row.price),
  );

// ─────────────────────────────────────────────────────────────────────
// Blocos
// ─────────────────────────────────────────────────────────────────────

const buildHeader = doc => {
  const dates = [`Atualizada em: ${formatDateBR(doc.createdAt)}`];
  if (doc.header.validUntil)
    dates.push(`Válida até: ${formatDateBR(doc.header.validUntil)}`);

  const stack = [
    {
      text: BRAND,
      fontSize: 22,
      bold: true,
      color: COLORS.navy,
      characterSpacing: 0.6,
    },
    {
      text: doc.header.title || 'Tabela de Preços',
      fontSize: 13,
      color: COLORS.muted,
      margin: [0, 4, 0, 0],
    },
  ];
  if (doc.header.subtitle)
    stack.push({
      text: doc.header.subtitle,
      fontSize: 10,
      color: COLORS.muted,
      margin: [0, 3, 0, 0],
    });
  stack.push({
    text: dates.join('   ·   '),
    fontSize: 8.5,
    color: COLORS.faint,
    margin: [0, 3, 0, 0],
  });
  if (doc.kind === 'interna')
    stack.push({
      text: 'USO INTERNO — CONFIDENCIAL · NÃO COMPARTILHAR',
      fontSize: 8.5,
      bold: true,
      color: COLORS.danger,
      margin: [0, 6, 0, 0],
    });

  return { stack, alignment: 'center', margin: [0, 0, 0, 16] };
};

const bandCell = (title, colSpan) => ({
  text: String(title || '').toUpperCase(),
  colSpan,
  bold: true,
  fontSize: 10,
  color: '#ffffff',
  fillColor: COLORS.navy,
  margin: [4, 3, 4, 3],
});

const headCell = (text, alignment = 'left') => ({
  text,
  bold: true,
  fontSize: 8,
  color: COLORS.muted,
  fillColor: COLORS.headRow,
  alignment,
  margin: [0, 1, 0, 1],
});

const imagePlaceholder = size => ({
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

const imageNode = (row, images, size) =>
  images.has(row.image)
    ? { image: row.image, fit: [size, size], alignment: 'center' }
    : imagePlaceholder(size);

// ─── Layout em lista ───
const buildListSection = (section, ctx) => {
  const { showSku, withImages, internalColumns, priceLabel, images } = ctx;

  const widths = [];
  const head = [];
  if (withImages) {
    widths.push(LIST_IMAGE + 2);
    head.push(headCell(''));
  }
  if (showSku) {
    widths.push(64);
    head.push(headCell('Código'));
  }
  widths.push('*');
  head.push(headCell('Produto'));
  if (internalColumns) {
    widths.push(62, 44);
    head.push(headCell('Custo', 'right'), headCell('%', 'right'));
  }
  widths.push(72);
  head.push(headCell(priceLabel, 'right'));

  const colCount = widths.length;
  const band = [bandCell(section.title, colCount)];
  while (band.length < colCount) band.push({});

  const vPad = withImages ? (LIST_IMAGE - 9) / 2 : 0;
  const cell = (text, extra = {}) => ({
    text,
    fontSize: 9,
    color: COLORS.text,
    margin: [0, vPad, 0, 0],
    ...extra,
  });

  const body = [band, head];
  section.rows.forEach(row => {
    const line = [];
    if (withImages) line.push(imageNode(row, images, LIST_IMAGE));
    if (showSku) line.push(cell(row.sku || '—', { color: COLORS.muted }));
    line.push(cell(row.name));
    if (internalColumns) {
      line.push(
        cell(row.cost !== null ? formatBRL(row.cost) : '—', {
          alignment: 'right',
          color: COLORS.muted,
        }),
        cell(row.source === 'fixed' ? 'fixo' : formatPct(row.pct), {
          alignment: 'right',
          color: COLORS.muted,
        }),
      );
    }
    line.push(
      cell(formatBRL(row.price), {
        alignment: 'right',
        bold: true,
        color: COLORS.price,
      }),
    );
    body.push(line);
  });

  return {
    table: {
      headerRows: 2,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths,
      body,
    },
    layout: {
      hLineWidth: i => (i <= 2 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.line,
      fillColor: rowIndex =>
        rowIndex > 1 && rowIndex % 2 === 1 ? COLORS.zebra : null,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => (withImages ? 2 : 2.5),
      paddingBottom: () => (withImages ? 2 : 2.5),
    },
    margin: [0, 0, 0, 12],
  };
};

// ─── Layout em grade (catálogo) ───
const buildGridSection = (section, ctx) => {
  const { showSku, images } = ctx;

  const band = [bandCell(section.title, GRID_COLUMNS)];
  while (band.length < GRID_COLUMNS) band.push({});
  const body = [band];

  const card = row => {
    const stack = [
      {
        // Altura fixa: cartões alinhados mesmo com imagens de proporções diferentes
        table: {
          widths: ['*'],
          heights: [GRID_IMAGE],
          body: [[imageNode(row, images, GRID_IMAGE)]],
        },
        layout: 'noBorders',
      },
    ];
    if (showSku && row.sku)
      stack.push({
        text: row.sku,
        fontSize: 7.5,
        color: COLORS.faint,
        margin: [0, 4, 0, 0],
      });
    stack.push(
      {
        text: row.name,
        fontSize: 9,
        bold: true,
        color: COLORS.text,
        margin: [0, 2, 0, 0],
      },
      {
        text: formatBRL(row.price),
        fontSize: 12,
        bold: true,
        color: COLORS.price,
        margin: [0, 3, 0, 0],
      },
    );
    return { stack, alignment: 'center', margin: [4, 6, 4, 8] };
  };

  for (let i = 0; i < section.rows.length; i += GRID_COLUMNS) {
    const line = section.rows.slice(i, i + GRID_COLUMNS).map(card);
    while (line.length < GRID_COLUMNS) line.push({ text: '' });
    body.push(line);
  }

  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths: Array(GRID_COLUMNS).fill('*'),
      body,
    },
    layout: {
      hLineWidth: i => (i <= 1 ? 0 : 0.5),
      vLineWidth: i => (i === 0 || i === GRID_COLUMNS ? 0 : 0.5),
      hLineColor: () => COLORS.line,
      vLineColor: () => COLORS.line,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 14],
  };
};

const buildTerms = doc => {
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
  add('Condições de pagamento', doc.header.paymentTerms);
  add('Observações', doc.header.notes);
  if (!blocks.length) return null;
  return {
    unbreakable: true,
    margin: [0, 4, 0, 0],
    table: {
      widths: [CONTENT_WIDTH - 20],
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

// ─────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────

/**
 * Gera o PDF de uma versão de tabela.
 *
 * @param {object} doc  versão congelada:
 *   { name, kind, header{title,subtitle,validUntil,paymentTerms,notes},
 *     showSku, createdAt, number,
 *     sections[{ title, rows[{ sku, name, image, price, cost, pct, source }] }] }
 * @param {object} [opts]
 * @param {boolean} [opts.withImages=false]
 * @param {'list'|'grid'} [opts.layout='list']  grid só vale com imagens
 * @param {Map} [opts.images]  Map(urlOriginal → { dataUrl }) do imageLoader
 * @returns {Promise<Buffer>}
 */
export const buildPriceTablePdf = async (doc, opts = {}) => {
  const images = opts.images || new Map();
  const withImages = !!opts.withImages;
  const layout = withImages && opts.layout === 'grid' ? 'grid' : 'list';

  const pureCost = isPureCostTable(doc);
  const ctx = {
    showSku: doc.showSku !== false,
    withImages,
    images,
    internalColumns: doc.kind === 'interna' && !pureCost,
    priceLabel: pureCost ? 'Custo' : 'Preço',
  };

  const content = [buildHeader(doc)];
  doc.sections.forEach(section => {
    if (!section.rows.length) return;
    content.push(
      layout === 'grid'
        ? buildGridSection(section, ctx)
        : buildListSection(section, ctx),
    );
  });
  const terms = buildTerms(doc);
  if (terms) content.push(terms);

  // Só entram no PDF as imagens efetivamente usadas (cada uma é embutida uma vez)
  const imageDict = {};
  if (withImages) {
    doc.sections.forEach(section =>
      section.rows.forEach(row => {
        const loaded = images.get(row.image);
        if (loaded) imageDict[row.image] = loaded.dataUrl;
      }),
    );
  }

  const footerLabel = `${BRAND} · ${doc.header.title || 'Tabela de Preços'}`;

  const definition = {
    pageSize: 'A4',
    pageMargins: PAGE_MARGINS,
    info: {
      // Só texto que o lojista já vê no documento — o nome interno da
      // tabela (que pode conter a % usada) nunca vai para os metadados
      title: doc.kind === 'interna' ? doc.name : documentTitle(doc),
      author: 'Elite Surfing Brasil',
      subject: doc.kind === 'interna' ? 'Uso interno' : 'Tabela de preços',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, color: COLORS.text },
    content,
    images: imageDict,
    footer: (currentPage, pageCount) => ({
      text: `${footerLabel}   |   Página ${currentPage} de ${pageCount}`,
      alignment: 'center',
      fontSize: 7.5,
      color: COLORS.faint,
      margin: [0, 16, 0, 0],
    }),
  };

  if (doc.kind === 'interna') {
    definition.watermark = {
      text: 'USO INTERNO',
      color: COLORS.danger,
      opacity: 0.07,
      bold: true,
    };
  }

  return pdfmake.createPdf(definition).getBuffer();
};
