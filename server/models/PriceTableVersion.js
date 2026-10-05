// server/models/PriceTableVersion.js
// ═══════════════════════════════════════════════════════════════════════
// 🧊 VERSÃO CONGELADA DE UMA TABELA DE PREÇOS
// ═══════════════════════════════════════════════════════════════════════
// Criada quando o admin exporta (PDF/Excel) ou envia uma tabela por email.
// Guarda as linhas JÁ CALCULADAS: o que o cliente recebeu nunca muda,
// mesmo que o custo ou as regras da tabela mudem depois.
//
// `hash` identifica o conteúdo: exportar duas vezes sem mudar nada
// reaproveita a mesma versão em vez de criar outra.
// `sends` é o histórico de envios por email desta versão.
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

const rowSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, default: '' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    // Dados internos (só saem em tabela `interna`)
    cost: { type: Number, default: null },
    base: { type: Number, default: null },
    pct: { type: Number, default: null },
    source: { type: String, default: 'table' },
  },
  { _id: false },
);

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    rows: { type: [rowSchema], default: [] },
  },
  { _id: false },
);

const sendSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, default: '' },
    formats: { type: [String], default: [] }, // ['pdf', 'xlsx']
    images: { type: Boolean, default: false },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String, default: null },
    messageId: { type: String, default: null },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const priceTableVersionSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PriceTable',
      required: true,
    },
    number: { type: Number, required: true },
    hash: { type: String, required: true },

    // Cópia do estado da tabela no momento
    name: { type: String, required: true },
    kind: { type: String, default: 'cliente' },
    settings: {
      base: String,
      mode: String,
      defaultPct: Number,
      rounding: String,
    },
    header: {
      title: String,
      subtitle: String,
      validUntil: Date,
      paymentTerms: String,
      notes: String,
    },
    showSku: { type: Boolean, default: true },

    sections: { type: [sectionSchema], default: [] },
    rowCount: { type: Number, default: 0 },

    sends: { type: [sendSchema], default: [] },
  },
  { timestamps: true },
);

// Único: o número vem de um contador atômico na tabela; o índice garante
// que nunca existam duas versões com o mesmo número.
priceTableVersionSchema.index({ table: 1, number: -1 }, { unique: true });

const PriceTableVersion = mongoose.model(
  'PriceTableVersion',
  priceTableVersionSchema,
);
export default PriceTableVersion;
