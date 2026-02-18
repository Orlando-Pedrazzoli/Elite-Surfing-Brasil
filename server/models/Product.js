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
    sku: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    // 🆕 Peso líquido em gramas (para cálculo de frete)
    weight: {
      type: Number,
      default: null,
    },
    // 🆕 Dimensões da embalagem em cm (para cálculo de frete)
    dimensions: {
      length: { type: Number, default: null }, // comprimento cm
      width: { type: Number, default: null },  // largura cm
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
  }
);

// Índices para performance
productSchema.index({ category: 1, inStock: 1 });
productSchema.index({ productFamily: 1 });
productSchema.index({ group: 1 });
productSchema.index({ sku: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;