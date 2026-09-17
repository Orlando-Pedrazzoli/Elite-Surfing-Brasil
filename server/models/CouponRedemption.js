// server/models/CouponRedemption.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 RESGATE DE CUPOM — 1 documento por pedido que usou cupom
// ═══════════════════════════════════════════════════════════════════════
// Ciclo de vida:
//   'reserved'  → criado junto com o pedido (conta para os limites)
//   'confirmed' → pagamento aprovado
//   'released'  → pedido cancelado / pagamento recusado (deixa de contar)
// Serve para: limite por cliente, histórico/auditoria e métricas no painel.
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

const couponRedemptionSchema = new mongoose.Schema(
  {
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'coupon',
      required: true,
    },
    code: { type: String, required: true, uppercase: true },
    order: { type: String, ref: 'order', required: true },
    userId: { type: String, default: null },
    customerEmail: { type: String, default: null, lowercase: true, trim: true },
    discountAmount: { type: Number, required: true, default: 0 },
    orderAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'released'],
      default: 'reserved',
    },
  },
  { timestamps: true },
);

couponRedemptionSchema.index({ coupon: 1, status: 1 });
couponRedemptionSchema.index({ coupon: 1, customerEmail: 1 });
couponRedemptionSchema.index({ coupon: 1, userId: 1 });
couponRedemptionSchema.index({ order: 1 }, { unique: true });

const CouponRedemption =
  mongoose.models.couponRedemption ||
  mongoose.model('couponRedemption', couponRedemptionSchema);

export default CouponRedemption;
