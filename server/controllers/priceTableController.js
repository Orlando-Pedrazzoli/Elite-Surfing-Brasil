// server/controllers/priceTableController.js
// ═══════════════════════════════════════════════════════════════════════
// 📋 TABELAS DE PREÇO — API admin (painel /seller/tabelas)
// ═══════════════════════════════════════════════════════════════════════
// Todas as rotas passam por authSeller: aqui circulam custo e preço de
// tabela, que são dados privados. Nenhuma resposta é cacheável.
//
// Fluxo:
//   • a tabela guarda regras + organização (PriceTable);
//   • GET /:id devolve a tabela já sincronizada com o catálogo + os
//     produtos, e o editor calcula os preços ao vivo;
//   • exportar ou enviar congela uma versão (PriceTableVersion) e gera
//     PDF/Excel a partir dela.
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import PriceTable, { IMAGE_LAYOUTS } from '../models/PriceTable.js';
import PriceTableVersion from '../models/PriceTableVersion.js';
import {
  PRICE_BASES,
  PRICE_MODES,
  ROUNDINGS,
  TABLE_KINDS,
  normalizePct,
  toNumberOrNull,
} from '../services/priceTable/pricingEngine.js';
import {
  loadProducts,
  resolveTable,
  buildDefaultSections,
  buildSnapshot,
  catalogStats,
  newSectionKey,
} from '../services/priceTable/tableResolver.js';
import { loadImages, THUMB_SIZES } from '../services/priceTable/imageLoader.js';
import { documentTitle } from '../services/priceTable/exportFormat.js';
import {
  isEmailConfigured,
  sendPriceTableEmail,
} from '../services/priceTable/priceTableMailer.js';

const MAX_SECTIONS = 300;
const MAX_ITEMS = 5000;
const MAX_RECIPIENTS = 15;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // folga sob os 25 MB do Gmail
// A função serverless tem 60 s no total. Orçamento por pedido:
const IMAGE_TIME_BUDGET_MS = 25000; // baixar miniaturas (todos os formatos)
const SEND_TIME_BUDGET_MS = 45000; // último instante para começar um envio
const MAX_EMAIL_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

const MIME = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const setPrivateHeaders = res => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, max-age=0',
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Surrogate-Control', 'no-store');
};

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const handleError = (res, error, context) => {
  console.error(`❌ priceTable.${context}:`, error);
  if (error?.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return fail(res, 400, first?.message || 'Dados da tabela inválidos.');
  }
  if (error?.name === 'CastError') return fail(res, 400, 'ID inválido.');
  return fail(res, 500, error?.message || 'Erro interno');
};

const cleanText = (value, max) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);

const toDateOrNull = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toMoneyOrNull = value => {
  const num = toNumberOrNull(value);
  if (num === null || num <= 0) return null;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Valida e normaliza as seções vindas do editor.
 *
 * As % são guardadas como o admin as digitou (só limitadas à faixa geral
 * −100…1000). NÃO são ajustadas ao modo da tabela: uma % impossível para o
 * modo (ex.: margem de 120%) é tratada pelo motor como "sem preço" — do
 * mesmo jeito no editor e na exportação. Ajustar aqui faria o arquivo
 * exportado divergir do que o admin vê na tela.
 */
const sanitizeSections = rawSections => {
  if (!Array.isArray(rawSections)) return { error: 'Seções inválidas.' };
  if (rawSections.length > MAX_SECTIONS)
    return { error: `Máximo de ${MAX_SECTIONS} seções por tabela.` };

  const usedKeys = new Set();
  const usedProducts = new Set();
  let itemCount = 0;

  const sections = rawSections.map(raw => {
    let key = cleanText(raw?.key, 40);
    if (!key || usedKeys.has(key)) key = newSectionKey();
    usedKeys.add(key);

    const items = [];
    (Array.isArray(raw?.items) ? raw.items : []).forEach(item => {
      const productId = String(item?.product ?? '');
      if (!mongoose.isValidObjectId(productId)) return;
      if (usedProducts.has(productId)) return; // um produto, uma linha
      usedProducts.add(productId);
      itemCount++;
      items.push({
        product: productId,
        pct: normalizePct(item.pct),
        fixedPrice: toMoneyOrNull(item.fixedPrice),
        hidden: !!item.hidden,
      });
    });

    return {
      key,
      title: cleanText(raw?.title, 80) || 'Sem título',
      categoryPath: raw?.categoryPath ? cleanText(raw.categoryPath, 80) : null,
      pct: normalizePct(raw?.pct),
      items,
    };
  });

  if (itemCount > MAX_ITEMS)
    return { error: `Máximo de ${MAX_ITEMS} itens por tabela.` };

  return { sections };
};

/**
 * Valida e normaliza os campos de configuração da tabela.
 * Só devolve os campos presentes no body (permite atualização parcial).
 */
const sanitizeSettings = (body, { requireName = false } = {}) => {
  const data = {};

  if (body.name !== undefined || requireName) {
    const name = cleanText(body.name, 80);
    if (!name) return { error: 'Dê um nome à tabela.' };
    data.name = name;
  }
  if (body.description !== undefined)
    data.description = cleanText(body.description, 300);

  if (body.kind !== undefined) {
    if (!TABLE_KINDS.includes(body.kind))
      return { error: 'Tipo de tabela inválido.' };
    data.kind = body.kind;
  }
  if (body.base !== undefined) {
    if (!PRICE_BASES.includes(body.base))
      return { error: 'Base de preço inválida.' };
    data.base = body.base;
  }
  if (body.mode !== undefined) {
    if (!PRICE_MODES.includes(body.mode))
      return { error: 'Modo de porcentagem inválido.' };
    data.mode = body.mode;
  }
  if (body.rounding !== undefined) {
    if (!ROUNDINGS.includes(body.rounding))
      return { error: 'Arredondamento inválido.' };
    data.rounding = body.rounding;
  }
  if (body.defaultPct !== undefined)
    data.defaultPct = normalizePct(body.defaultPct) ?? 0;

  if (body.header !== undefined) {
    const header = body.header || {};
    data.header = {
      title: cleanText(header.title, 80) || 'Tabela de Preços',
      subtitle: cleanText(header.subtitle, 120),
      validUntil: toDateOrNull(header.validUntil),
      paymentTerms: cleanText(header.paymentTerms, 400),
      notes: cleanText(header.notes, 600),
    };
  }

  if (body.options !== undefined) {
    const options = body.options || {};
    data.options = {
      showSku: options.showSku !== false,
      showImages: !!options.showImages,
      imageLayout: IMAGE_LAYOUTS.includes(options.imageLayout)
        ? options.imageLayout
        : 'list',
      includeUnpublished: !!options.includeUnpublished,
      hideOutOfStock: !!options.hideOutOfStock,
    };
  }

  return { data };
};

/** Resumo de uma tabela para a tela de lista (sem as seções). */
const toSummary = (table, resolved) => ({
  _id: table._id,
  name: table.name,
  description: table.description,
  kind: table.kind,
  base: table.base,
  mode: table.mode,
  defaultPct: table.defaultPct,
  rounding: table.rounding,
  header: { validUntil: table.header?.validUntil || null },
  options: table.options,
  position: table.position,
  archived: table.archived,
  versionCount: table.versionCount,
  lastExportedAt: table.lastExportedAt,
  lastSentAt: table.lastSentAt,
  updatedAt: table.updatedAt,
  sectionCount: resolved.table.sections.length,
  stats: resolved.computed.stats,
});

const slugify = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'tabela';

const isoDay = date => {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return parts; // yyyy-mm-dd
};

/**
 * Nome do arquivo. Em tabela `cliente` usa o título do DOCUMENTO (o que o
 * lojista já lê no cabeçalho), nunca o nome interno da tabela — que pode
 * ser algo como "Lojistas +40%".
 */
const fileNameFor = (version, format, { images, layout }) => {
  const parts = [];
  if (version.kind === 'interna')
    parts.push('USO-INTERNO', 'Elite-Surfing', slugify(version.name));
  else parts.push('Elite-Surfing', slugify(documentTitle(version)));
  if (images)
    parts.push(
      format === 'pdf' && layout === 'grid' ? 'catalogo' : 'com-imagens',
    );
  parts.push(`v${version.number}`, isoDay(version.createdAt));
  return `${parts.join('_')}.${format}`;
};

/**
 * Congela a versão atual da tabela. Se nada mudou desde a última versão
 * (mesmo hash de conteúdo), reaproveita-a.
 * @returns {Promise<{ version?: object, error?: string, status?: number }>}
 */
const freezeVersion = async tableId => {
  const table = await PriceTable.findById(tableId).lean();
  if (!table) return { error: 'Tabela não encontrada.', status: 404 };

  const resolved = await resolveTable(table);
  const snapshot = buildSnapshot(resolved);
  if (snapshot.rowCount === 0)
    return {
      error:
        'Esta tabela não tem nenhum produto com preço para exportar. Confira o custo dos produtos e as opções da tabela.',
      status: 400,
    };

  const last = await PriceTableVersion.findOne({ table: table._id })
    .sort({ number: -1 })
    .lean();
  if (last && last.hash === snapshot.hash) return { version: last, table };

  const counter = await PriceTable.findByIdAndUpdate(
    table._id,
    { $inc: { versionCount: 1 } },
    { new: true },
  ).lean();

  const created = await PriceTableVersion.create({
    table: table._id,
    number: counter.versionCount,
    hash: snapshot.hash,
    name: snapshot.name,
    kind: snapshot.kind,
    settings: snapshot.settings,
    header: snapshot.header,
    showSku: snapshot.showSku,
    sections: snapshot.sections,
    rowCount: snapshot.rowCount,
  });

  return { version: created.toObject(), table };
};

/** Lê as opções de exportação do body (formato(s), imagens, layout). */
const readExportOptions = body => {
  const images = !!body?.images;
  const layout = images && body?.layout === 'grid' ? 'grid' : 'list';
  return { images, layout };
};

/**
 * Gera os arquivos pedidos a partir de uma versão.
 *
 * pdfmake e exceljs são carregados SÓ aqui (import dinâmico): esta API é
 * uma única função serverless, e carregá-los no topo do arquivo tornaria
 * mais lento o arranque a frio de todas as rotas — inclusive as da loja.
 *
 * @param {number} startedAt  Date.now() do início do pedido: todas as
 *   miniaturas (de todos os formatos) partilham o mesmo prazo.
 * @returns {Promise<{ files: Array<{format, filename, content, contentType}>,
 *                     imageStats: {requested:number, loaded:number} }>}
 */
const renderFiles = async (version, formats, { images, layout }, startedAt) => {
  const urls = images
    ? version.sections.flatMap(s => s.rows.map(r => r.image)).filter(Boolean)
    : [];
  const deadline = startedAt + IMAGE_TIME_BUDGET_MS;
  const imageStats = { requested: 0, loaded: 0 };
  const files = [];

  for (const format of formats) {
    let loaded = { images: new Map(), requested: 0, loaded: 0 };
    if (images) {
      const size =
        format === 'xlsx'
          ? THUMB_SIZES.xlsx
          : layout === 'grid'
            ? THUMB_SIZES.grid
            : THUMB_SIZES.list;
      loaded = await loadImages(urls, { size, deadline });
      imageStats.requested = Math.max(imageStats.requested, loaded.requested);
      // Reporta o pior caso: se um dos arquivos saiu com imagens em falta,
      // o admin precisa saber
      imageStats.loaded =
        files.length === 0
          ? loaded.loaded
          : Math.min(imageStats.loaded, loaded.loaded);
    }

    let content;
    if (format === 'xlsx') {
      const { buildPriceTableXlsx } =
        await import('../services/priceTable/xlsxBuilder.js');
      content = await buildPriceTableXlsx(version, {
        withImages: images,
        images: loaded.images,
      });
    } else {
      const { buildPriceTablePdf } =
        await import('../services/priceTable/pdfBuilder.js');
      content = await buildPriceTablePdf(version, {
        withImages: images,
        layout,
        images: loaded.images,
      });
    }

    files.push({
      format,
      filename: fileNameFor(version, format, { images, layout }),
      content,
      contentType: MIME[format],
    });
  }

  return { files, imageStats };
};

const sendFile = (res, file, version, imageStats) => {
  setPrivateHeaders(res);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.content.length);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.filename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
  );
  res.setHeader('X-Table-Version', String(version.number));
  res.setHeader('X-Images-Requested', String(imageStats.requested));
  res.setHeader('X-Images-Loaded', String(imageStats.loaded));
  // O painel roda em outro domínio: sem isto o browser esconde estes headers
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition, X-Table-Version, X-Images-Requested, X-Images-Loaded',
  );
  res.status(200).end(file.content);
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/price-tables — lista + números do catálogo
// ─────────────────────────────────────────────────────────────────────
export const listTables = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const [tables, products] = await Promise.all([
      PriceTable.find({}).sort({ position: 1, createdAt: 1 }).lean(),
      loadProducts(),
    ]);

    const summaries = await Promise.all(
      tables.map(async table =>
        toSummary(table, await resolveTable(table, products)),
      ),
    );

    res.json({
      success: true,
      tables: summaries,
      catalog: catalogStats(products),
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    handleError(res, error, 'listTables');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables — cria com todos os produtos, por categoria
// ─────────────────────────────────────────────────────────────────────
export const createTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const { data, error } = sanitizeSettings(req.body || {}, {
      requireName: true,
    });
    if (error) return fail(res, 400, error);

    const products = await loadProducts();
    const last = await PriceTable.findOne({})
      .sort({ position: -1 })
      .select('position')
      .lean();

    const table = await PriceTable.create({
      ...data,
      sections: buildDefaultSections(products),
      position: (last?.position ?? -1) + 1,
    });

    res.status(201).json({ success: true, id: table._id });
  } catch (error) {
    handleError(res, error, 'createTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/price-tables/:id — tabela sincronizada + produtos
// ─────────────────────────────────────────────────────────────────────
export const getTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const table = await PriceTable.findById(req.params.id).lean();
    if (!table) return fail(res, 404, 'Tabela não encontrada.');

    const resolved = await resolveTable(table);
    res.json({
      success: true,
      table: resolved.table,
      products: resolved.products,
      sync: resolved.sync,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    handleError(res, error, 'getTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/price-tables/:id — salva regras e organização
// Body: { rev, ...configuração, sections }
// ─────────────────────────────────────────────────────────────────────
export const updateTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const body = req.body || {};
    const rev = Number(body.rev);
    if (!Number.isInteger(rev))
      return fail(res, 400, 'Revisão da tabela ausente.');

    const { data, error } = sanitizeSettings(body);
    if (error) return fail(res, 400, error);

    if (body.sections !== undefined) {
      const result = sanitizeSections(body.sections);
      if (result.error) return fail(res, 400, result.error);
      data.sections = result.sections;
    }

    const updated = await PriceTable.findOneAndUpdate(
      { _id: req.params.id, rev },
      { $set: data, $inc: { rev: 1 } },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      const exists = await PriceTable.exists({ _id: req.params.id });
      if (!exists) return fail(res, 404, 'Tabela não encontrada.');
      return fail(
        res,
        409,
        'Esta tabela foi alterada em outra aba ou dispositivo. Recarregue para continuar.',
        { conflict: true },
      );
    }

    res.json({ success: true, rev: updated.rev, updatedAt: updated.updatedAt });
  } catch (error) {
    handleError(res, error, 'updateTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/price-tables/reorder — ordem da lista de tabelas
// Body: { ids: [id, id, ...] } na ordem desejada
// ─────────────────────────────────────────────────────────────────────
export const reorderTables = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;
    if (!ids || !ids.every(id => mongoose.isValidObjectId(id)))
      return fail(res, 400, 'Lista de tabelas inválida.');

    if (ids.length) {
      await PriceTable.bulkWrite(
        ids.map((id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { position: index } },
          },
        })),
      );
    }
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'reorderTables');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/:id/duplicate
// ─────────────────────────────────────────────────────────────────────
export const duplicateTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const source = await PriceTable.findById(req.params.id).lean();
    if (!source) return fail(res, 404, 'Tabela não encontrada.');

    const last = await PriceTable.findOne({})
      .sort({ position: -1 })
      .select('position')
      .lean();

    const copy = await PriceTable.create({
      name:
        cleanText(req.body?.name, 80) || `${source.name} (cópia)`.slice(0, 80),
      description: source.description,
      kind: source.kind,
      base: source.base,
      mode: source.mode,
      defaultPct: source.defaultPct,
      rounding: source.rounding,
      header: source.header,
      options: source.options,
      sections: source.sections.map(section => ({
        ...section,
        key: newSectionKey(),
      })),
      position: (last?.position ?? -1) + 1,
    });

    res.status(201).json({ success: true, id: copy._id });
  } catch (error) {
    handleError(res, error, 'duplicateTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/:id/archive — Body: { archived: boolean }
// ─────────────────────────────────────────────────────────────────────
export const archiveTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const updated = await PriceTable.findByIdAndUpdate(
      req.params.id,
      { $set: { archived: req.body?.archived !== false } },
      { new: true },
    ).lean();
    if (!updated) return fail(res, 404, 'Tabela não encontrada.');
    res.json({ success: true, archived: updated.archived });
  } catch (error) {
    handleError(res, error, 'archiveTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/price-tables/:id — apaga a tabela e o histórico de versões
// ─────────────────────────────────────────────────────────────────────
export const deleteTable = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const deleted = await PriceTable.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return fail(res, 404, 'Tabela não encontrada.');
    await PriceTableVersion.deleteMany({ table: deleted._id });
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'deleteTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/:id/export
// Body: { format: 'pdf'|'xlsx', images?: boolean, layout?: 'list'|'grid' }
// Responde com o arquivo.
// ─────────────────────────────────────────────────────────────────────
export const exportTable = async (req, res) => {
  const startedAt = Date.now();
  try {
    const format = req.body?.format === 'xlsx' ? 'xlsx' : 'pdf';
    const options = readExportOptions(req.body);

    const { version, error, status } = await freezeVersion(req.params.id);
    if (error) {
      setPrivateHeaders(res);
      return fail(res, status, error);
    }

    const { files, imageStats } = await renderFiles(
      version,
      [format],
      options,
      startedAt,
    );
    await PriceTable.updateOne(
      { _id: req.params.id },
      { $set: { lastExportedAt: new Date() } },
    );
    sendFile(res, files[0], version, imageStats);
  } catch (error) {
    setPrivateHeaders(res);
    handleError(res, error, 'exportTable');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/versions/:versionId/export
// Baixa de novo exatamente o que foi exportado/enviado naquela versão.
// ─────────────────────────────────────────────────────────────────────
export const exportVersion = async (req, res) => {
  const startedAt = Date.now();
  try {
    const format = req.body?.format === 'xlsx' ? 'xlsx' : 'pdf';
    const options = readExportOptions(req.body);

    const version = await PriceTableVersion.findById(
      req.params.versionId,
    ).lean();
    if (!version) {
      setPrivateHeaders(res);
      return fail(res, 404, 'Versão não encontrada.');
    }

    const { files, imageStats } = await renderFiles(
      version,
      [format],
      options,
      startedAt,
    );
    sendFile(res, files[0], version, imageStats);
  } catch (error) {
    setPrivateHeaders(res);
    handleError(res, error, 'exportVersion');
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/price-tables/:id/versions — histórico (sem as linhas)
// ─────────────────────────────────────────────────────────────────────
export const listVersions = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const versions = await PriceTableVersion.find({ table: req.params.id })
      .select('-sections -hash')
      .sort({ number: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, versions });
  } catch (error) {
    handleError(res, error, 'listVersions');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/:id/send — envia por email
// Body: { recipients: string[], subject, message, formats: ['pdf','xlsx'],
//         images?: boolean, layout?: 'list'|'grid', confirmInternal?: boolean }
// ─────────────────────────────────────────────────────────────────────
export const sendTable = async (req, res) => {
  const startedAt = Date.now();
  try {
    setPrivateHeaders(res);
    const body = req.body || {};

    if (!isEmailConfigured())
      return fail(
        res,
        503,
        'O envio de email não está configurado no servidor (GMAIL_USER / GMAIL_APP_PASSWORD).',
      );

    // ─── Destinatários ───
    const recipients = [
      ...new Set(
        (Array.isArray(body.recipients) ? body.recipients : [])
          .map(email =>
            String(email || '')
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    ];
    if (!recipients.length) return fail(res, 400, 'Informe ao menos um email.');
    if (recipients.length > MAX_RECIPIENTS)
      return fail(
        res,
        400,
        `Envie para no máximo ${MAX_RECIPIENTS} emails de cada vez.`,
      );
    // O tamanho é conferido ANTES do regex (entradas enormes fariam o
    // regex demorar segundos)
    const invalid = recipients.filter(
      email => email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email),
    );
    if (invalid.length)
      return fail(
        res,
        400,
        `Email inválido: ${invalid.map(email => email.slice(0, 60)).join(', ')}`,
      );

    const formats = ['pdf', 'xlsx'].filter(format =>
      (Array.isArray(body.formats) ? body.formats : ['pdf']).includes(format),
    );
    if (!formats.length)
      return fail(res, 400, 'Escolha ao menos um anexo (PDF ou Excel).');

    const subject = cleanText(body.subject, 150);
    const message = cleanText(body.message, 3000);
    if (!subject) return fail(res, 400, 'Informe o assunto do email.');
    if (!message) return fail(res, 400, 'Escreva uma mensagem.');

    const options = readExportOptions(body);

    // ─── Trava de tabela interna (antes de congelar qualquer versão) ───
    const current = await PriceTable.findById(req.params.id)
      .select('kind')
      .lean();
    if (!current) return fail(res, 404, 'Tabela não encontrada.');
    if (current.kind === 'interna' && body.confirmInternal !== true)
      return fail(
        res,
        400,
        'Esta é uma tabela de uso interno (contém custo). Confirme que quer mesmo enviá-la.',
        { needsConfirmation: true },
      );

    // ─── Versão ───
    const { version, error, status } = await freezeVersion(req.params.id);
    if (error) return fail(res, status, error);
    // A tabela pode ter virado "interna" entre as duas leituras
    if (version.kind === 'interna' && body.confirmInternal !== true)
      return fail(
        res,
        400,
        'Esta é uma tabela de uso interno (contém custo). Confirme que quer mesmo enviá-la.',
        { needsConfirmation: true },
      );

    // ─── Anexos ───
    const { files, imageStats } = await renderFiles(
      version,
      formats,
      options,
      startedAt,
    );
    const attachments = files.map(file => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
    }));
    const totalBytes = attachments.reduce(
      (sum, a) => sum + a.content.length,
      0,
    );
    if (totalBytes > MAX_ATTACHMENT_BYTES)
      return fail(
        res,
        400,
        'Os anexos ficaram grandes demais para email. Envie sem imagens ou só o PDF.',
      );

    // ─── Envio (um email por destinatário) ───
    // Cada resultado é gravado no histórico logo a seguir ao seu envio: se
    // a função for interrompida a meio, o que já saiu fica registrado.
    const results = [];
    for (const to of recipients) {
      let result;
      if (Date.now() - startedAt > SEND_TIME_BUDGET_MS) {
        result = {
          to,
          status: 'failed',
          error:
            'Tempo esgotado antes do envio. Envie de novo para este email.',
          messageId: null,
        };
      } else {
        const sent = await sendPriceTableEmail({
          to,
          subject,
          message,
          doc: version,
          attachments,
        });
        result = {
          to,
          status: sent.success ? 'sent' : 'failed',
          error: sent.success ? null : sent.error,
          messageId: sent.messageId || null,
        };
      }
      results.push(result);

      await PriceTableVersion.updateOne(
        { _id: version._id },
        {
          $push: {
            sends: {
              to: result.to,
              subject,
              formats,
              images: options.images,
              status: result.status,
              error: result.error,
              messageId: result.messageId,
              sentAt: new Date(),
            },
          },
        },
      );
    }

    const sentAt = new Date();
    const sentCount = results.filter(r => r.status === 'sent').length;
    if (sentCount > 0)
      await PriceTable.updateOne(
        { _id: req.params.id },
        { $set: { lastSentAt: sentAt } },
      );

    res.json({
      success: sentCount > 0,
      message:
        sentCount === results.length
          ? `Tabela enviada para ${sentCount} ${sentCount === 1 ? 'email' : 'emails'}.`
          : sentCount > 0
            ? `Enviada para ${sentCount} de ${results.length} emails.`
            : 'Nenhum email pôde ser enviado.',
      version: version.number,
      results: results.map(({ to, status, error }) => ({ to, status, error })),
      imageStats,
    });
  } catch (error) {
    handleError(res, error, 'sendTable');
  }
};
