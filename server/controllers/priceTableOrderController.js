// server/controllers/priceTableOrderController.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS A PARTIR DA TABELA DE LOJISTA — API admin
//    (/api/price-tables/orders, painel /seller/tabelas/pedidos)
// ═══════════════════════════════════════════════════════════════════════
// Uso típico: o lojista manda o pedido pelo WhatsApp, o vendedor preenche
// as quantidades sobre a tabela de lojista e devolve o pedido (WhatsApp,
// email ou PDF) para o cliente conferir os valores e confirmar.
//
// • Só tabelas `cliente` geram pedido (as `interna` têm custo).
// • Os preços são SEMPRE calculados aqui, a partir da tabela gravada: o
//   browser só manda produto + quantidade.
// • Tudo passa por authSeller (montado no priceTableRouter).
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import PriceTable from '../models/PriceTable.js';
import PriceTableOrder, { ORDER_STATUSES } from '../models/PriceTableOrder.js';
import { resolveTable } from '../services/priceTable/tableResolver.js';
import {
  priceOrderItems,
  MISSING_LABELS,
  formatOrderNumber,
} from '../services/priceTable/orderBuilder.js';
import { loadImages, THUMB_SIZES } from '../services/priceTable/imageLoader.js';
import { documentTitle } from '../services/priceTable/exportFormat.js';
import {
  isEmailConfigured,
  sendOrderEmail,
} from '../services/priceTable/priceTableMailer.js';

const MAX_RECIPIENTS = 5;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;
const IMAGE_TIME_BUDGET_MS = 20000;
const SEND_TIME_BUDGET_MS = 45000;

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
  console.error(`❌ priceTableOrder.${context}:`, error);
  if (error?.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return fail(res, 400, first?.message || 'Dados do pedido inválidos.');
  }
  if (error?.name === 'CastError') return fail(res, 400, 'ID inválido.');
  return fail(res, 500, error?.message || 'Erro interno');
};

const cleanText = (value, max) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);

const isValidEmail = email =>
  email.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(email);

/** Cliente é opcional: tudo pode vir vazio. */
const sanitizeCustomer = raw => {
  const customer = raw || {};
  const email = cleanText(customer.email, MAX_EMAIL_LENGTH).toLowerCase();
  if (email && !isValidEmail(email))
    return { error: 'O email do cliente não parece válido.' };
  const clienteId = String(customer.cliente ?? '');
  return {
    customer: {
      name: cleanText(customer.name, 120),
      phone: cleanText(customer.phone, 30),
      email,
      cliente: mongoose.isValidObjectId(clienteId) ? clienteId : null,
    },
  };
};

/** Mensagem para os itens que não puderam entrar no pedido. */
const missingMessage = missing => {
  const named = missing
    .slice(0, 5)
    .map(m =>
      m.name
        ? `${m.name} (${MISSING_LABELS[m.reason] || 'indisponível'})`
        : 'um produto que não existe mais',
    );
  const extra = missing.length > 5 ? ` e mais ${missing.length - 5}` : '';
  return `Estes produtos não estão disponíveis nesta tabela: ${named.join(', ')}${extra}. Remova-os do pedido e tente de novo.`;
};

/**
 * Lê a tabela, confere o tipo e calcula os itens com os preços atuais.
 * @returns {Promise<{ table?, priced?, error?, status? }>}
 */
const priceFromTable = async (tableId, rawItems) => {
  if (!mongoose.isValidObjectId(String(tableId || '')))
    return { error: 'Tabela inválida.', status: 400 };
  const table = await PriceTable.findById(tableId).lean();
  if (!table) return { error: 'Tabela não encontrada.', status: 404 };
  if (table.kind !== 'cliente')
    return {
      error:
        'Pedidos só podem ser gerados a partir de tabelas para lojistas (esta é de uso interno).',
      status: 400,
    };

  const resolved = await resolveTable(table);
  const priced = priceOrderItems(resolved, rawItems);
  if (priced.error) return { error: priced.error, status: 400 };
  if (priced.missing.length)
    return {
      error: missingMessage(priced.missing),
      status: 400,
      missing: priced.missing,
    };
  if (!priced.items.length)
    return {
      error: 'Preencha a quantidade de ao menos um produto.',
      status: 400,
    };
  return { table, priced };
};

/** Próximo número de pedido (1, 2, 3…). O índice único evita repetição. */
const nextNumber = async () => {
  const last = await PriceTableOrder.findOne({})
    .sort({ number: -1 })
    .select('number')
    .lean();
  return (last?.number || 0) + 1;
};

const createWithNumber = async data => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await PriceTableOrder.create({
        ...data,
        number: await nextNumber(),
      });
    } catch (error) {
      if (error?.code !== 11000) throw error; // outro pedido levou o número
    }
  }
  throw new Error('Não foi possível numerar o pedido. Tente de novo.');
};

const slugify = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const orderFileName = order =>
  [
    'Elite-Surfing',
    'Pedido',
    formatOrderNumber(order.number),
    slugify(order.customer?.name),
  ]
    .filter(Boolean)
    .join('_') + '.pdf';

const renderOrderPdf = async (order, { images }, startedAt) => {
  let loaded = { images: new Map(), requested: 0, loaded: 0 };
  if (images) {
    loaded = await loadImages(order.items.map(i => i.image).filter(Boolean), {
      size: THUMB_SIZES.list,
      deadline: startedAt + IMAGE_TIME_BUDGET_MS,
    });
  }
  const { buildOrderPdf } =
    await import('../services/priceTable/orderPdfBuilder.js');
  const content = await buildOrderPdf(order, {
    withImages: images,
    images: loaded.images,
  });
  return {
    content,
    filename: orderFileName(order),
    imageStats: { requested: loaded.requested, loaded: loaded.loaded },
  };
};

/** Registra um envio e passa o pedido de rascunho para enviado. */
const recordSends = async (orderId, sends) => {
  const ok = sends.some(s => s.status === 'sent');
  const update = { $push: { sends: { $each: sends } } };
  if (ok) update.$set = { lastSentAt: new Date() };
  await PriceTableOrder.updateOne({ _id: orderId }, update);
  if (ok)
    await PriceTableOrder.updateOne(
      { _id: orderId, status: 'rascunho' },
      { $set: { status: 'enviado' } },
    );
  return PriceTableOrder.findById(orderId).lean();
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/price-tables/orders?status=&q=&table=
// ─────────────────────────────────────────────────────────────────────
export const listOrders = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const filter = {};
    if (ORDER_STATUSES.includes(req.query.status))
      filter.status = req.query.status;
    if (mongoose.isValidObjectId(String(req.query.table || '')))
      filter.table = req.query.table;

    const q = cleanText(req.query.q, 60);
    if (q) {
      const asNumber = Number(q.replace(/^#|^n[ºo°]?\s*/i, ''));
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { 'customer.name': { $regex: escaped, $options: 'i' } },
        { 'customer.email': { $regex: escaped, $options: 'i' } },
        { 'customer.phone': { $regex: escaped, $options: 'i' } },
      ];
      if (Number.isInteger(asNumber) && asNumber > 0)
        filter.$or.push({ number: asNumber });
    }

    const orders = await PriceTableOrder.find(filter)
      .select('-items -sends')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, orders });
  } catch (error) {
    handleError(res, error, 'listOrders');
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/price-tables/orders/:orderId
// ─────────────────────────────────────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const order = await PriceTableOrder.findById(req.params.orderId).lean();
    if (!order) return fail(res, 404, 'Pedido não encontrado.');
    res.json({
      success: true,
      order,
      emailConfigured: isEmailConfigured(),
    });
  } catch (error) {
    handleError(res, error, 'getOrder');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/orders
// Body: { table, items: [{ product, qty }], customer?, paymentTerms?,
//         conditions? }
// ─────────────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const body = req.body || {};
    const { customer, error: customerError } = sanitizeCustomer(body.customer);
    if (customerError) return fail(res, 400, customerError);

    const { table, priced, error, status, missing } = await priceFromTable(
      body.table,
      body.items,
    );
    if (error) return fail(res, status, error, missing ? { missing } : {});

    const order = await createWithNumber({
      table: table._id,
      tableName: table.name,
      tableTitle: documentTitle(table),
      showSku: table.options?.showSku !== false,
      customer,
      items: priced.items,
      itemCount: priced.itemCount,
      totalQty: priced.totalQty,
      subtotal: priced.subtotal,
      paymentTerms: cleanText(body.paymentTerms, 500),
      conditions: cleanText(body.conditions, 1000),
      pricedAt: new Date(),
    });

    res.status(201).json({ success: true, order: order.toObject() });
  } catch (error) {
    handleError(res, error, 'createOrder');
  }
};

// ─────────────────────────────────────────────────────────────────────
// PUT /api/price-tables/orders/:orderId — mesmo body do POST (sem table)
// Os preços são recalculados com a tabela atual; `priceChanges` diz
// quantos itens mudaram de preço desde a última gravação.
// ─────────────────────────────────────────────────────────────────────
export const updateOrder = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const body = req.body || {};
    const current = await PriceTableOrder.findById(req.params.orderId).lean();
    if (!current) return fail(res, 404, 'Pedido não encontrado.');

    const { customer, error: customerError } = sanitizeCustomer(body.customer);
    if (customerError) return fail(res, 400, customerError);

    const { table, priced, error, status, missing } = await priceFromTable(
      current.table,
      body.items,
    );
    if (error) return fail(res, status, error, missing ? { missing } : {});

    const previous = new Map(
      current.items.map(i => [String(i.product), i.unitPrice]),
    );
    const priceChanges = priced.items.filter(
      i => previous.has(i.product) && previous.get(i.product) !== i.unitPrice,
    ).length;

    const order = await PriceTableOrder.findByIdAndUpdate(
      current._id,
      {
        $set: {
          tableName: table.name,
          tableTitle: documentTitle(table),
          showSku: table.options?.showSku !== false,
          customer,
          items: priced.items,
          itemCount: priced.itemCount,
          totalQty: priced.totalQty,
          subtotal: priced.subtotal,
          paymentTerms: cleanText(body.paymentTerms, 500),
          conditions: cleanText(body.conditions, 1000),
          pricedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    ).lean();

    res.json({ success: true, order, priceChanges });
  } catch (error) {
    handleError(res, error, 'updateOrder');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/orders/:orderId/status — Body: { status }
// ─────────────────────────────────────────────────────────────────────
export const setOrderStatus = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const status = req.body?.status;
    if (!ORDER_STATUSES.includes(status))
      return fail(res, 400, 'Situação inválida.');
    const order = await PriceTableOrder.findByIdAndUpdate(
      req.params.orderId,
      { $set: { status } },
      { new: true },
    ).lean();
    if (!order) return fail(res, 404, 'Pedido não encontrado.');
    res.json({ success: true, order });
  } catch (error) {
    handleError(res, error, 'setOrderStatus');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/orders/:orderId/shared
// Body: { channel: 'whatsapp'|'share', to? } — o envio em si acontece no
// aparelho do vendedor; aqui só fica registrado.
// ─────────────────────────────────────────────────────────────────────
export const recordShare = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const channel = req.body?.channel === 'share' ? 'share' : 'whatsapp';
    const exists = await PriceTableOrder.exists({ _id: req.params.orderId });
    if (!exists) return fail(res, 404, 'Pedido não encontrado.');
    const order = await recordSends(req.params.orderId, [
      { channel, to: cleanText(req.body?.to, 60), status: 'sent' },
    ]);
    res.json({ success: true, order });
  } catch (error) {
    handleError(res, error, 'recordShare');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/orders/:orderId/pdf — Body: { images?: boolean }
// ─────────────────────────────────────────────────────────────────────
export const exportOrderPdf = async (req, res) => {
  const startedAt = Date.now();
  try {
    const order = await PriceTableOrder.findById(req.params.orderId).lean();
    if (!order) {
      setPrivateHeaders(res);
      return fail(res, 404, 'Pedido não encontrado.');
    }
    const file = await renderOrderPdf(
      order,
      { images: req.body?.images !== false },
      startedAt,
    );

    setPrivateHeaders(res);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', file.content.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    res.setHeader('X-Images-Requested', String(file.imageStats.requested));
    res.setHeader('X-Images-Loaded', String(file.imageStats.loaded));
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Images-Requested, X-Images-Loaded',
    );
    res.status(200).end(file.content);
  } catch (error) {
    setPrivateHeaders(res);
    handleError(res, error, 'exportOrderPdf');
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/price-tables/orders/:orderId/send
// Body: { recipients: string[], subject, message, images?: boolean }
// ─────────────────────────────────────────────────────────────────────
export const sendOrder = async (req, res) => {
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
    if (!recipients.length)
      return fail(res, 400, 'Informe o email do cliente.');
    if (recipients.length > MAX_RECIPIENTS)
      return fail(
        res,
        400,
        `Envie para no máximo ${MAX_RECIPIENTS} emails de cada vez.`,
      );
    const invalid = recipients.filter(email => !isValidEmail(email));
    if (invalid.length)
      return fail(
        res,
        400,
        `Email inválido: ${invalid.map(e => e.slice(0, 60)).join(', ')}`,
      );

    const subject = cleanText(body.subject, 150);
    const message = cleanText(body.message, 3000);
    if (!subject) return fail(res, 400, 'Informe o assunto do email.');
    if (!message) return fail(res, 400, 'Escreva uma mensagem.');

    const order = await PriceTableOrder.findById(req.params.orderId).lean();
    if (!order) return fail(res, 404, 'Pedido não encontrado.');

    const file = await renderOrderPdf(
      order,
      { images: body.images !== false },
      startedAt,
    );
    const attachments = [
      {
        filename: file.filename,
        content: file.content,
        contentType: 'application/pdf',
      },
    ];

    const results = [];
    for (const to of recipients) {
      if (Date.now() - startedAt > SEND_TIME_BUDGET_MS) {
        results.push({
          channel: 'email',
          to,
          status: 'failed',
          error:
            'Tempo esgotado antes do envio. Envie de novo para este email.',
        });
        continue;
      }
      const sent = await sendOrderEmail({
        to,
        subject,
        message,
        order,
        attachments,
      });
      results.push({
        channel: 'email',
        to,
        status: sent.success ? 'sent' : 'failed',
        error: sent.success ? null : sent.error,
      });
    }

    const updated = await recordSends(order._id, results);
    const sentCount = results.filter(r => r.status === 'sent').length;

    res.json({
      success: sentCount > 0,
      message:
        sentCount === results.length
          ? `Pedido enviado para ${recipients.join(', ')}.`
          : sentCount > 0
            ? `Enviado para ${sentCount} de ${results.length} emails.`
            : 'O email não pôde ser enviado.',
      results: results.map(({ to, status, error }) => ({ to, status, error })),
      order: updated,
      imageStats: file.imageStats,
    });
  } catch (error) {
    handleError(res, error, 'sendOrder');
  }
};

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/price-tables/orders/:orderId
// ─────────────────────────────────────────────────────────────────────
export const deleteOrder = async (req, res) => {
  try {
    setPrivateHeaders(res);
    const deleted = await PriceTableOrder.findByIdAndDelete(
      req.params.orderId,
    ).lean();
    if (!deleted) return fail(res, 404, 'Pedido não encontrado.');
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'deleteOrder');
  }
};
