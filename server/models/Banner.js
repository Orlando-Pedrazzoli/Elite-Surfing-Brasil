// server/models/Banner.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ BANNER DA HERO — gerido pelo admin (/seller/banners)
// ═══════════════════════════════════════════════════════════════════════
//   • title       : nome interno do banner; também é o texto alternativo
//                   da imagem (acessibilidade e SEO)
//   • image       : imagem para DESKTOP (obrigatória)
//   • mobileImage : imagem para TELEMÓVEL (opcional — sem ela, a de
//                   desktop é recortada automaticamente)
//   • heading     : texto grande sobre a imagem (opcional, aceita quebras
//                   de linha)
//   • subtitle    : texto pequeno sobre a imagem (opcional)
//   • link        : destino ao clicar (opcional) — caminho do site
//                   ("/collections/decks") ou URL completa
//   • order       : posição no carrossel (0 = primeiro)
//   • isActive    : desligado = não aparece na loja
//   • startsAt / endsAt : período de exibição (opcional)
//   • *PublicId   : identificador no Cloudinary, para apagar a imagem
//                   quando o banner é removido ou a imagem é trocada.
//                   Vazio nos banners importados (ficheiros do site).
//
// A coleção é minúscula (poucos documentos), por isso não tem índices
// próprios — nada a sincronizar com `npm run indexes`.
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },

    image: { type: String, required: true },
    imagePublicId: { type: String, default: '' },
    mobileImage: { type: String, default: '' },
    mobileImagePublicId: { type: String, default: '' },

    heading: { type: String, default: '', trim: true, maxlength: 120 },
    subtitle: { type: String, default: '', trim: true, maxlength: 80 },
    link: { type: String, default: '', trim: true, maxlength: 500 },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Estado calculado (útil no painel)
bannerSchema.methods.getStatus = function () {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (this.startsAt && this.startsAt > now) return 'scheduled';
  if (this.endsAt && this.endsAt < now) return 'expired';
  return 'active';
};

bannerSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.status = doc.getStatus();
    delete ret.__v;
    return ret;
  },
});

const Banner = mongoose.models.banner || mongoose.model('banner', bannerSchema);

export default Banner;
