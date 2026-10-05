// server/services/priceTable/xlsxBuilder.js
// ═══════════════════════════════════════════════════════════════════════
// 📊 TABELAS DE PREÇO — geração do Excel (exceljs)
// ═══════════════════════════════════════════════════════════════════════
// Planilha PLANA de propósito: uma linha de cabeçalho, uma coluna
// "Categoria" e nenhuma célula mesclada no corpo. É o que permite ao
// lojista filtrar e ordenar. Preços são NÚMEROS com formato R$ (não
// texto), para poderem ser somados e usados em fórmulas.
//
// Tabela `interna` leva também Custo, % e Regra. Tabela `cliente` nunca
// leva custo.
// ═══════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { formatDateBR } from './exportFormat.js';

const NAVY = 'FF0F3057';
const BRL_FORMAT = '"R$" #,##0.00';
const HEADER_ROW = 5;
const IMAGE_PX = 52;
const IMAGE_ROW_HEIGHT = 42; // pontos (~56 px)

const SOURCE_LABELS = {
  fixed: 'Preço fixo',
  item: '% do item',
  section: '% da seção',
  table: '% da tabela',
};

/**
 * @param {object} doc   versão congelada (mesmo formato do pdfBuilder)
 * @param {object} [opts]
 * @param {boolean} [opts.withImages=false]
 * @param {Map} [opts.images]  Map(urlOriginal → { buffer, type })
 * @returns {Promise<Buffer>}
 */
export const buildPriceTableXlsx = async (doc, opts = {}) => {
  const images = opts.images || new Map();
  const withImages = !!opts.withImages;
  const internal = doc.kind === 'interna';
  const showSku = doc.showSku !== false;
  const pureCost =
    internal &&
    doc.sections.every(s =>
      s.rows.every(r => r.cost !== null && r.cost === r.price),
    );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Elite Surfing Brasil';
  workbook.created = new Date(doc.createdAt || Date.now());

  const sheet = workbook.addWorksheet('Tabela de Preços', {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // ─── Colunas ───
  const columns = [];
  if (withImages) columns.push({ key: 'image', header: 'Imagem', width: 9 });
  if (showSku) columns.push({ key: 'sku', header: 'Código', width: 14 });
  columns.push({ key: 'name', header: 'Produto', width: 52 });
  columns.push({ key: 'category', header: 'Categoria', width: 30 });
  if (internal && !pureCost) {
    columns.push({ key: 'cost', header: 'Custo (R$)', width: 14, money: true });
    columns.push({ key: 'pct', header: '% aplicada', width: 12 });
    columns.push({ key: 'source', header: 'Regra', width: 14 });
  }
  columns.push({
    key: 'price',
    header: pureCost ? 'Custo (R$)' : 'Preço (R$)',
    width: 15,
    money: true,
  });

  sheet.columns = columns.map(c => ({ key: c.key, width: c.width }));
  const lastCol = columns.length;

  // ─── Cabeçalho do documento (linhas 1–3) ───
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `ELITE SURFING — ${doc.header.title || 'Tabela de Preços'}`;
  titleCell.font = { bold: true, size: 14, color: { argb: NAVY } };
  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getRow(1).height = 22;

  const info = [];
  if (doc.header.subtitle) info.push(doc.header.subtitle);
  info.push(`Atualizada em: ${formatDateBR(doc.createdAt)}`);
  if (doc.header.validUntil)
    info.push(`Válida até: ${formatDateBR(doc.header.validUntil)}`);
  const infoCell = sheet.getCell(2, 1);
  infoCell.value = info.join('   ·   ');
  infoCell.font = { size: 10, color: { argb: 'FF6B7280' } };
  sheet.mergeCells(2, 1, 2, lastCol);

  if (internal) {
    const warn = sheet.getCell(3, 1);
    warn.value = 'USO INTERNO — CONFIDENCIAL · NÃO COMPARTILHAR';
    warn.font = { bold: true, size: 10, color: { argb: 'FFB91C1C' } };
    sheet.mergeCells(3, 1, 3, lastCol);
  }

  // ─── Linha de cabeçalho da tabela ───
  const headerRow = sheet.getRow(HEADER_ROW);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.money || col.key === 'pct' ? 'right' : 'left',
    };
  });
  headerRow.height = 20;

  // ─── Linhas ───
  let rowNumber = HEADER_ROW;
  doc.sections.forEach(section => {
    section.rows.forEach(row => {
      rowNumber++;
      const excelRow = sheet.getRow(rowNumber);
      const values = {
        sku: row.sku || '',
        name: row.name,
        category: section.title,
        cost: row.cost,
        pct: row.source === 'fixed' || row.pct === null ? null : row.pct / 100,
        source: SOURCE_LABELS[row.source] || '',
        price: row.price,
      };

      columns.forEach((col, index) => {
        if (col.key === 'image') return;
        const cell = excelRow.getCell(index + 1);
        cell.value = values[col.key] ?? null;
        cell.alignment = { vertical: 'middle', wrapText: col.key === 'name' };
        if (col.money) {
          cell.numFmt = BRL_FORMAT;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (col.key === 'pct') {
          // '0.##%' deixaria uma vírgula solta em "40,%"
          cell.numFmt = Number.isInteger(row.pct) ? '0%' : '0.00%';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (col.key === 'price') cell.font = { bold: true };
      });

      if (withImages) {
        excelRow.height = IMAGE_ROW_HEIGHT;
        const loaded = images.get(row.image);
        if (loaded) {
          const imageId = workbook.addImage({
            buffer: loaded.buffer,
            extension: loaded.type === 'png' ? 'png' : 'jpeg',
          });
          sheet.addImage(imageId, {
            tl: { col: 0.12, row: rowNumber - 1 + 0.06 },
            ext: { width: IMAGE_PX, height: IMAGE_PX },
            editAs: 'oneCell',
          });
        }
      }
    });
  });

  // Filtro em todas as colunas da tabela
  if (rowNumber > HEADER_ROW) {
    sheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: rowNumber, column: lastCol },
    };
  }

  // ─── Condições (abaixo da tabela) ───
  let footRow = rowNumber + 2;
  const addNote = (label, text) => {
    if (!text) return;
    const cell = sheet.getCell(footRow, 1);
    cell.value = {
      richText: [
        { text: `${label}: `, font: { bold: true, size: 10 } },
        { text, font: { size: 10 } },
      ],
    };
    cell.alignment = { wrapText: true, vertical: 'top' };
    sheet.mergeCells(footRow, 1, footRow, lastCol);
    sheet.getRow(footRow).height = Math.max(
      16,
      Math.ceil(text.length / 95) * 14,
    );
    footRow++;
  };
  addNote('Condições de pagamento', doc.header.paymentTerms);
  addNote('Observações', doc.header.notes);

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
};
