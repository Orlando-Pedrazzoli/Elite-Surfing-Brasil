/**
 * ═══════════════════════════════════════════════════════════════
 * PartnerKey.js — Modelo MongoDB para lojas parceiras (dropshipping)
 * ═══════════════════════════════════════════════════════════════
 *
 * Cada registo representa uma loja parceira que consome a API de
 * catálogo da Elite Surfing. A API key é gerada automaticamente
 * com 64 chars hex (prefixo es_partner_) e pode ter expiração.
 *
 * Campos principais:
 *   - storeName / storeUrl / platform → identificação do parceiro
 *   - apiKey → chave de autenticação (única, indexada)
 *   - permissions → controlo granular (catálogo, stock, preços, imagens)
 *   - priceModifierPercent → markup/desconto aplicado nos preços
 *   - rateLimit → máximo de requisições por hora
 *   - expiresAt → expiração automática da key (best practice de segurança)
 *   - lastAccessAt / totalRequests → tracking de uso
 *
 * Referência de segurança:
 *   - API keys devem ser rotacionadas a cada 30-90 dias
 *   - Keys nunca devem ser enviadas em URLs (só via header X-API-Key)
 *   - Sempre usar HTTPS (Vercel já garante isso)
 *
 * Uso:
 *   POST /api/partner/create → cria parceiro + gera key
 *   GET  /api/partner/list   → lista parceiros (keys mascaradas)
 * ═══════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const partnerKeySchema = new mongoose.Schema(
  {
    // ── Identificação ──────────────────────────────────────────
    storeName: {
      type: String,
      required: [true, 'Nome da loja é obrigatório'],
      trim: true,
      maxlength: [100, 'Nome deve ter no máximo 100 caracteres'],
    },
    storeUrl: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // opcional
          return /^https?:\/\/.+/.test(v);
        },
        message: 'URL inválida. Deve começar com http:// ou https://',
      },
    },
    platform: {
      type: String,
      enum: {
        values: ['woocommerce', 'shopify', 'nuvemshop', 'custom', 'other'],
        message: 'Plataforma inválida: {VALUE}',
      },
      default: 'woocommerce',
    },

    // ── Autenticação ───────────────────────────────────────────
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Expiração automática (best practice: rotacionar a cada 90 dias)
    expiresAt: {
      type: Date,
      default: null, // null = nunca expira
    },

    // ── Permissões granulares ──────────────────────────────────
    permissions: {
      catalog: { type: Boolean, default: true }, // ler catálogo
      stock: { type: Boolean, default: true }, // ver stock
      prices: { type: Boolean, default: true }, // ver preços
      images: { type: Boolean, default: true }, // acesso às imagens
    },

    // ── Preço ──────────────────────────────────────────────────
    // Markup/desconto aplicado ao preço da Elite Surfing
    // Ex: -10 = 10% desconto, +15 = 15% markup sobre o nosso preço
    priceModifierPercent: {
      type: Number,
      default: 0,
      min: [-50, 'Desconto máximo é 50%'],
      max: [200, 'Markup máximo é 200%'],
    },

    // ── Rate Limiting ──────────────────────────────────────────
    rateLimit: {
      requestsPerHour: {
        type: Number,
        default: 100,
        min: [10, 'Mínimo 10 requests/hora'],
        max: [1000, 'Máximo 1000 requests/hora'],
      },
    },

    // ── Tracking de uso ────────────────────────────────────────
    lastAccessAt: {
      type: Date,
      default: null,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },

    // ── Notas internas ─────────────────────────────────────────
    notes: {
      type: String,
      default: null,
      maxlength: [500, 'Notas devem ter no máximo 500 caracteres'],
    },
  },
  {
    timestamps: true,
  },
);

// ── Índices ──────────────────────────────────────────────────
partnerKeySchema.index({ isActive: 1 });
partnerKeySchema.index({ expiresAt: 1 });

// ── Método estático: gerar API key segura ────────────────────
// Formato: es_partner_ + 64 chars hex = 75 chars total
partnerKeySchema.statics.generateApiKey = function () {
  return `es_partner_${crypto.randomBytes(32).toString('hex')}`;
};

// ── Método de instância: verificar se key expirou ────────────
partnerKeySchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

const PartnerKey = mongoose.model('PartnerKey', partnerKeySchema);
export default PartnerKey;
