// server/models/PriceTable.js
// ═══════════════════════════════════════════════════════════════════════
// 📋 TABELA DE PREÇOS — painel /seller/tabelas
// ═══════════════════════════════════════════════════════════════════════
// A tabela guarda REGRAS e ORGANIZAÇÃO, nunca preços calculados:
//   • base + modo + % geral + arredondamento
//   • seções (ordem = ordem do array) com % própria opcional
//   • itens (ordem = ordem do array) com % própria ou preço fixo opcionais
// O preço é sempre derivado do produto no momento (ver
// services/priceTable/pricingEngine.js). O que é enviado a um cliente fica
// congelado em PriceTableVersion.
//
// `rev` é o controle de concorrência: o editor envia o rev que carregou e
// o servidor só grava se ainda for o mesmo (evita que duas abas abertas
// se sobrescrevam).
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import {
  PRICE_BASES,
  PRICE_MODES,
  ROUNDINGS,
  TABLE_KINDS,
} from '../services/priceTable/pricingEngine.js';

export const IMAGE_LAYOUTS = ['list', 'grid'];

const itemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // % própria do item (null = herda da seção/tabela)
    pct: { type: Number, default: null },
    // Preço fixo em R$ (null = calculado). Vence qualquer %.
    fixedPrice: { type: Number, default: null, min: 0 },
    // Oculto: continua na organização da tabela, mas não sai na exportação
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    // Categoria do site que alimenta esta seção (null = seção criada à mão).
    // Produtos novos dessa categoria entram aqui automaticamente.
    categoryPath: { type: String, default: null },
    // % própria da seção (null = herda da tabela)
    pct: { type: Number, default: null },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false },
);

const priceTableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 300 },

    // interna → contém custo; marca-d'água "USO INTERNO" e confirmação
    //           extra antes de enviar por email.
    // cliente → pode ser compartilhada com lojistas; nunca mostra custo.
    kind: { type: String, enum: TABLE_KINDS, default: 'cliente' },

    // ─── Regra geral ───
    base: { type: String, enum: PRICE_BASES, default: 'cost' },
    mode: { type: String, enum: PRICE_MODES, default: 'markup' },
    defaultPct: { type: Number, default: 0 },
    rounding: { type: String, enum: ROUNDINGS, default: 'none' },

    // ─── Cabeçalho do documento ───
    header: {
      title: { type: String, default: 'Tabela de Preços', maxlength: 80 },
      subtitle: { type: String, default: '', maxlength: 120 },
      validUntil: { type: Date, default: null },
      paymentTerms: { type: String, default: '', maxlength: 400 },
      notes: { type: String, default: '', maxlength: 600 },
    },

    // ─── Opções ───
    options: {
      showSku: { type: Boolean, default: true },
      // Padrão de exportação: com imagens? em lista ou em grade (catálogo)?
      showImages: { type: Boolean, default: false },
      imageLayout: { type: String, enum: IMAGE_LAYOUTS, default: 'list' },
      // Incluir produtos em rascunho (não publicados no site)
      includeUnpublished: { type: Boolean, default: false },
      // Esconder produtos sem estoque
      hideOutOfStock: { type: Boolean, default: false },
    },

    sections: { type: [sectionSchema], default: [] },

    // Ordem na lista de tabelas (menor = primeiro)
    position: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },

    // Controle de concorrência do editor
    rev: { type: Number, default: 0 },

    // Versões congeladas (PriceTableVersion)
    versionCount: { type: Number, default: 0 },
    lastExportedAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

priceTableSchema.index({ archived: 1, position: 1 });

const PriceTable = mongoose.model('PriceTable', priceTableSchema);
export default PriceTable;
