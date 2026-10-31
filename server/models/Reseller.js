// server/models/Reseller.js
// ═══════════════════════════════════════════════════════════════════════
// 🏪 REVENDEDOR — candidatura de lojista enviada em /revendedores
// ═══════════════════════════════════════════════════════════════════════
// Fluxo: o lojista preenche o formulário público → status `pending` →
// o admin analisa em /seller/revendedores e aprova ou recusa.
//
// Índices (correr `npm run indexes` na pasta server/ depois do deploy —
// na Vercel o autoIndex está desligado, ver configs/db.js):
//   • cnpj  único  — um CNPJ candidata-se uma vez; para tentar de novo o
//                    admin apaga a candidatura antiga (ou reaprova)
//   • email único
//   • status + createdAt — listagem do admin
// ═══════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose';

const resellerSchema = new mongoose.Schema(
  {
    // ─── Empresa ───
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    tradeName: { type: String, required: true, trim: true, maxlength: 120 },
    cnpj: { type: String, required: true, unique: true, trim: true }, // só dígitos
    stateRegistration: { type: String, default: '', trim: true, maxlength: 30 },
    storeType: {
      type: String,
      enum: ['fisica', 'online', 'ambas'],
      default: 'fisica',
    },
    website: { type: String, default: '', trim: true, maxlength: 200 },
    address: {
      cep: { type: String, default: '', trim: true },
      street: { type: String, default: '', trim: true },
      number: { type: String, default: '', trim: true },
      complement: { type: String, default: '', trim: true },
      neighborhood: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true, uppercase: true },
    },

    // ─── Contato ───
    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true }, // só dígitos
    message: { type: String, default: '', maxlength: 2000 },

    // ─── Fluxo de aprovação ───
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, default: '', maxlength: 2000 },
    rejectionReason: { type: String, default: '', maxlength: 1000 },
    reviewedAt: { type: Date, default: null },

    // ─── Auditoria ───
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

// Listagem do admin (mais recentes primeiro, por status)
resellerSchema.index({ status: 1, createdAt: -1 });

const Reseller =
  mongoose.models.reseller || mongoose.model('reseller', resellerSchema);

export default Reseller;
