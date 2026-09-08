// server/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, ref: 'user', default: null },
    isGuestOrder: { type: Boolean, default: false },
    guestEmail: { type: String, default: null },
    guestName: { type: String, default: null },
    guestPhone: { type: String, default: null },
    items: [
      {
        product: { type: String, required: true, ref: 'Product' },
        quantity: { type: Number, required: true },
      },
    ],
    amount: { type: Number, required: true },
    address: { type: String, required: true, ref: 'address' },
    status: { type: String, default: 'Pedido Confirmado' },
    paymentType: { type: String, required: true },
    // paymentType:
    //   'mercadopago_card' | 'mercadopago_pix' | 'mercadopago_boleto'
    //   (legados: 'pix_manual' | 'pagarme_card' | 'pagarme_boleto')
    isPaid: { type: Boolean, required: true, default: false },
    promoCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    originalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    shippingMethod: { type: String, default: '' },
    shippingCarrier: { type: String, default: '' },
    shippingDeliveryDays: { type: Number, default: 0 },
    shippingServiceId: { type: String, default: '' },
    // 🏷️ CPF do cliente informado no pagamento (fallback para a etiqueta
    // ME quando o endereço não tiver CPF — pedidos antigos/legados)
    customerDocument: { type: String, default: '' },
    // 🏬 Retirada no Local (Barra da Tijuca/RJ) — sem frete, sem etiqueta ME
    isPickup: { type: Boolean, default: false },
    pixDiscount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },

    // ═══ 🏷️ Melhor Envio — Etiqueta de Envio ═══
    // meStatus: null → 'cart' → 'paid' → 'generated' → 'printed'
    // O fluxo é retomável: se parar em qualquer etapa (ex: saldo
    // insuficiente no checkout), clicar de novo continua de onde parou.
    meShipmentIds: { type: [String], default: [] },
    meStatus: { type: String, default: null },
    meTrackingCode: { type: String, default: null },
    meLabelUrl: { type: String, default: null },
    mePurchasedAt: { type: Date, default: null },
    meError: { type: String, default: null },

    // ═══ Mercado Pago ═══
    mpPaymentId: { type: String, default: null },
    mpStatus: { type: String, default: null }, // approved | pending | in_process | rejected | cancelled | refunded | charged_back
    mpStatusDetail: { type: String, default: null },
    paymentInstallments: { type: Number, default: 1 },
    // PIX
    mpPixQrCode: { type: String, default: null }, // copia e cola
    mpPixQrCodeBase64: { type: String, default: null }, // imagem PNG (base64, sem prefixo)
    mpPixTicketUrl: { type: String, default: null },
    // Boleto
    mpBoletoUrl: { type: String, default: null },
    mpBoletoBarcode: { type: String, default: null },
    mpExpiresAt: { type: String, default: null },

    // ═══ Legado Pagar.me (mantido para pedidos antigos) ═══
    pagarmeOrderId: { type: String, default: null },
    pagarmeChargeId: { type: String, default: null },
    pagarmeBoletoUrl: { type: String, default: null },
    pagarmeBoletoBarcode: { type: String, default: null },
    pagarmeBoletoExpiresAt: { type: String, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ guestEmail: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ mpPaymentId: 1 });
orderSchema.index({ pagarmeOrderId: 1 });

const Order = mongoose.models.order || mongoose.model('order', orderSchema);

export default Order;
