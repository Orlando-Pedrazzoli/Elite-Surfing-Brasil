// server/models/Product.js
import mongoose from 'mongoose';
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: [String],
      required: true,
    },
    // 🆕 SKU - Código do produto (único)
    // 🔧 FIX: removido `default: null`. Índice sparse só ignora documentos
    // onde o campo está AUSENTE — com default null, o campo era gravado
    // explicitamente como null e o 2º produto sem SKU disparava
    // "E11000 duplicate key error ... dup key: { sku: null }".
    // Agora o campo simplesmente não existe quando o SKU não é informado
    // (o controller também faz $unset no update quando o SKU é apagado).
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    // 🆕 Peso líquido em gramas (para cálculo de frete)
    weight: {
      type: Number,
      default: null,
    },
    // 🆕 Dimensões da embalagem em cm (para cálculo de frete)
    dimensions: {
      length: { type: Number, default: null }, // comprimento cm
      width: { type: Number, default: null }, // largura cm
      height: { type: Number, default: null }, // altura cm
    },
    price: {
      type: Number,
      required: true,
    },
    offerPrice: {
      type: Number,
      required: true,
    },
    image: {
      type: [String],
      required: true,
    },
    video: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: true,
    },
    group: {
      type: String,
      default: null,
    },
    filters: {
      type: Map,
      of: String,
      default: {},
    },

    // ═══════════════════════════════════════════════════════════════
    // 🆕 TAGS TRANSVERSAIS — permite que um produto apareça em
    //    coleções cross-group (SUP, Bodyboard, Outlet, etc.)
    //    Ex: um Leash Stand Up com tags: ['sup'] aparece tanto
    //    em /collections/leashes quanto /collections/sup
    // ═══════════════════════════════════════════════════════════════
    tags: {
      type: [String],
      default: [],
    },

    // 🆕 FRETE GRÁTIS — indica se o produto tem frete grátis
    freeShipping: {
      type: Boolean,
      default: false,
    },

    inStock: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      default: 0,
    },
    // Sistema de Família/Cor
    productFamily: {
      type: String,
      default: null,
    },
    // 🆕 Tipo de variante da família: "color" (bolinhas de cor) ou "size" (badges de tamanho)
    variantType: {
      type: String,
      enum: ['color', 'size'],
      default: 'color',
    },
    color: {
      type: String,
      default: null,
    },
    colorCode: {
      type: String,
      default: null,
    },
    colorCode2: {
      type: String,
      default: null,
    },
    // 🆕 Tamanho da variante (ex: "6'0", "6'3", "7'0") — usado quando variantType = "size"
    size: {
      type: String,
      default: null,
    },
    isMainVariant: {
      type: Boolean,
      default: true,
    },
    // 🆕 Ordem de exibição na loja (menor = aparece primeiro)
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Índices para performance
productSchema.index({ category: 1, inStock: 1 });
productSchema.index({ productFamily: 1 });
productSchema.index({ group: 1 });
// 🔧 FIX: removido productSchema.index({ sku: 1 }) — o `unique: true` no
// campo já cria o índice sku_1. Declarar os dois gerava o warning de
// índice duplicado do Mongoose e trabalho redundante no Atlas.
productSchema.index({ tags: 1 }); // 🆕 Para queries por tag
productSchema.index({ freeShipping: 1 }); // 🆕 Para filtro de frete grátis

const Product = mongoose.model('Product', productSchema);
export default Product;
