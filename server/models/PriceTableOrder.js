// server/models/PriceTableOrder.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDO GERADO A PARTIR DE UMA TABELA DE PREÇOS (lojista)
// ═══════════════════════════════════════════════════════════════════════
// O vendedor recebe um pedido (ex.: pelo WhatsApp), preenche as
// quantidades sobre a tabela de lojista e envia o pedido ao cliente para
// ele conferir os valores e confirmar.
//
// • Só entram os itens com quantidade preenchida.
// • Os preços são calculados NO SERVIDOR a partir da tabela (nunca vêm do
//   browser) e ficam gravados no pedido: o que o cliente recebeu não muda
//   se o custo ou a tabela mudarem depois. Ao editar o pedido, os preços
//   são recalculados com a tabela atual.
// • Cliente, prazo de pagamento e condições são opcionais.
// • `sends` guarda o histórico de envios (email, WhatsApp, compartilhar).
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'rascunho',
  'enviado',
  'confirmado',
  'cancelado',
];
export const SEND_CHANNELS = ['email', 'whatsapp', 'share'];

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, default: '' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    section: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    // Cliente das Vendas Diretas, quando escolhido na busca
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      default: null,
    },
  },
  { _id: false },
);

const sendSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: SEND_CHANNELS, required: true },
    to: { type: String, default: '' },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: null },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const priceTableOrderSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceTable',
      required: true,
    },
    // Cópias para exibir o pedido mesmo se a tabela for apagada
    tableName: { type: String, default: '' },
    tableTitle: { type: String, default: '' },
    showSku: { type: Boolean, default: true },

    customer: { type: customerSchema, default: () => ({}) },
    items: { type: [itemSchema], default: [] },
    itemCount: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },

    paymentTerms: { type: String, default: '' },
    conditions: { type: String, default: '' },

    status: { type: String, enum: ORDER_STATUSES, default: 'rascunho' },
    sends: { type: [sendSchema], default: [] },
    lastSentAt: { type: Date, default: null },
    pricedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

priceTableOrderSchema.index({ number: 1 }, { unique: true });
priceTableOrderSchema.index({ createdAt: -1 });
priceTableOrderSchema.index({ status: 1, createdAt: -1 });

const PriceTableOrder =
  mongoose.models.PriceTableOrder ||
  mongoose.model('PriceTableOrder', priceTableOrderSchema);

export default PriceTableOrder;
