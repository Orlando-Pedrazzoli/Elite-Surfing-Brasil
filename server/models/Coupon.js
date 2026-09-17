// server/models/Coupon.js
// ═══════════════════════════════════════════════════════════════════════
// 🎫 CUPOM DE DESCONTO — configuração gerida pelo admin (/seller/cupons)
// ═══════════════════════════════════════════════════════════════════════
// Regras suportadas (boas práticas de e-commerce):
//   • discountType  : 'percentage' | 'fixed'
//   • maxDiscount   : teto em R$ para cupons percentuais (protege margem)
//   • minOrderValue : pedido mínimo (subtotal dos itens) para aplicar
//   • startsAt/expiresAt : janela de validade (agendamento + expiração)
//   • usageLimit    : limite global de utilizações (null = ilimitado)
//   • perCustomerLimit : limite por cliente/email (null = ilimitado)
//   • scope         : 'all' | 'groups' | 'categories'
//       - groups     = categorias  (decks, leashes, capas, ...)
//       - categories = subcategorias (Deck-Maldivas, Leash-Longboard, ...)
//     O desconto incide APENAS sobre os itens elegíveis do carrinho.
//   • stackWithPix  : permite acumular com o desconto PIX (10%)
//   • firstOrderOnly: apenas clientes sem pedido pago anterior
//   • usageCount    : contador atómico (reservado na criação do pedido,
//                     libertado se o pagamento for cancelado/recusado)
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

export const COUPON_SCOPES = ['all', 'groups', 'categories'];
export const COUPON_TYPES = ['percentage', 'fixed'];

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[A-Z0-9_-]+$/, 'Código inválido (use letras, números, - ou _)'],
    },
    description: { type: String, default: '', trim: true, maxlength: 200 },

    discountType: { type: String, enum: COUPON_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0.01 },
    // Teto de desconto em R$ (apenas percentual). null = sem teto
    maxDiscount: { type: Number, default: null, min: 0 },
    // Subtotal mínimo dos itens (antes de descontos/frete). 0 = sem mínimo
    minOrderValue: { type: Number, default: 0, min: 0 },

    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    usageLimit: { type: Number, default: null, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: null, min: 1 },

    scope: { type: String, enum: COUPON_SCOPES, default: 'all' },
    groups: { type: [String], default: [] }, // slugs de categoria
    categories: { type: [String], default: [] }, // paths de subcategoria

    stackWithPix: { type: Boolean, default: true },
    firstOrderOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

couponSchema.index({ isActive: 1, expiresAt: 1 });

// ─── Estado calculado (útil no painel) ───
couponSchema.methods.getStatus = function () {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (this.startsAt && this.startsAt > now) return 'scheduled';
  if (this.expiresAt && this.expiresAt < now) return 'expired';
  if (this.usageLimit && this.usageCount >= this.usageLimit) return 'exhausted';
  return 'active';
};

couponSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.status = doc.getStatus();
    delete ret.__v;
    return ret;
  },
});

const Coupon = mongoose.models.coupon || mongoose.model('coupon', couponSchema);

export default Coupon;
