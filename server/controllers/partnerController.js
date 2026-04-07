/**
 * ═══════════════════════════════════════════════════════════════
 * partnerController.js — CRUD de gestão de parceiros
 * ═══════════════════════════════════════════════════════════════
 *
 * Endpoints protegidos por authSeller (admin da Elite Surfing).
 * Permite criar, listar, ativar/desativar, regenerar keys e
 * eliminar parceiros.
 *
 * Endpoints:
 *   POST /api/partner/create         → cria parceiro + gera key
 *   GET  /api/partner/list           → lista (keys mascaradas)
 *   POST /api/partner/toggle         → ativa/desativa
 *   POST /api/partner/regenerate-key → nova key (invalida anterior)
 *   POST /api/partner/delete         → remove parceiro
 *
 * Segurança:
 *   - API key só é mostrada na criação e regeneração (nunca mais)
 *   - Listagem mostra apenas os últimos 8 chars da key
 *   - Validação de todos os inputs
 * ═══════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import PartnerKey from '../models/PartnerKey.js';

// ── Helper: validar ObjectId ───────────────────────────────────
function isValidId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

// ═══════════════════════════════════════════════════════════════
// POST /api/partner/create
// ═══════════════════════════════════════════════════════════════
/**
 * Cria um novo parceiro e gera uma API key.
 *
 * Body:
 *   storeName (obrigatório) → nome da loja parceira
 *   storeUrl                → URL da loja (ex: https://riosurfshop.com.br)
 *   platform                → "woocommerce", "shopify", etc.
 *   priceModifierPercent    → markup/desconto (ex: 0 = sem alteração)
 *   expiresInDays           → dias até expirar (null = nunca)
 *   notes                   → notas internas
 *
 * A API key só é retornada AQUI — guardar imediatamente!
 */
export const createPartner = async (req, res) => {
  try {
    const {
      storeName,
      storeUrl,
      platform,
      priceModifierPercent,
      expiresInDays,
      notes,
    } = req.body;

    // ── Validação ──────────────────────────────────────────────
    if (
      !storeName ||
      typeof storeName !== 'string' ||
      storeName.trim().length < 2
    ) {
      return res.json({
        success: false,
        message: 'Nome da loja é obrigatório (mínimo 2 caracteres).',
      });
    }

    // ── Gerar API key ──────────────────────────────────────────
    const apiKey = PartnerKey.generateApiKey();

    // ── Calcular expiração ─────────────────────────────────────
    let expiresAt = null;
    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAt = new Date(
        Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000,
      );
    }

    // ── Criar parceiro ─────────────────────────────────────────
    const partner = await PartnerKey.create({
      storeName: storeName.trim(),
      storeUrl: storeUrl?.trim() || null,
      platform: platform || 'woocommerce',
      priceModifierPercent: Number(priceModifierPercent) || 0,
      expiresAt,
      notes: notes?.trim() || null,
      apiKey,
    });

    res.json({
      success: true,
      message: 'Parceiro criado com sucesso',
      partner: {
        id: partner._id,
        storeName: partner.storeName,
        storeUrl: partner.storeUrl,
        platform: partner.platform,
        isActive: partner.isActive,
        expiresAt: partner.expiresAt,
        // ⚠️ API key só é mostrada aqui — guardar imediatamente!
        apiKey: partner.apiKey,
      },
    });
  } catch (error) {
    console.error('createPartner error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET /api/partner/list
// ═══════════════════════════════════════════════════════════════
/**
 * Lista todos os parceiros com API keys mascaradas.
 * As keys completas nunca são expostas após a criação.
 */
export const listPartners = async (req, res) => {
  try {
    const partners = await PartnerKey.find().sort({ createdAt: -1 }).lean();

    // Mascarar API keys (mostrar só os últimos 8 chars)
    const masked = partners.map(p => ({
      id: p._id,
      storeName: p.storeName,
      storeUrl: p.storeUrl,
      platform: p.platform,
      isActive: p.isActive,
      expiresAt: p.expiresAt,
      permissions: p.permissions,
      priceModifierPercent: p.priceModifierPercent,
      rateLimit: p.rateLimit,
      lastAccessAt: p.lastAccessAt,
      totalRequests: p.totalRequests,
      notes: p.notes,
      createdAt: p.createdAt,
      // Key mascarada — segurança
      apiKey: `es_partner_...${p.apiKey.slice(-8)}`,
    }));

    res.json({ success: true, partners: masked });
  } catch (error) {
    console.error('listPartners error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/partner/toggle
// ═══════════════════════════════════════════════════════════════
/**
 * Ativa ou desativa um parceiro.
 * Quando desativado, todas as requisições são rejeitadas.
 */
export const togglePartner = async (req, res) => {
  try {
    const { id } = req.body;

    if (!isValidId(id)) {
      return res.json({ success: false, message: 'ID inválido.' });
    }

    const partner = await PartnerKey.findById(id);
    if (!partner) {
      return res.json({ success: false, message: 'Parceiro não encontrado.' });
    }

    partner.isActive = !partner.isActive;
    await partner.save();

    res.json({
      success: true,
      message: `Parceiro ${partner.isActive ? 'ativado' : 'desativado'}`,
      isActive: partner.isActive,
    });
  } catch (error) {
    console.error('togglePartner error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/partner/regenerate-key
// ═══════════════════════════════════════════════════════════════
/**
 * Gera nova API key para um parceiro.
 * A key anterior é INVALIDADA imediatamente.
 * O parceiro precisa atualizar a key no plugin WooCommerce.
 */
export const regenerateKey = async (req, res) => {
  try {
    const { id, expiresInDays } = req.body;

    if (!isValidId(id)) {
      return res.json({ success: false, message: 'ID inválido.' });
    }

    const partner = await PartnerKey.findById(id);
    if (!partner) {
      return res.json({ success: false, message: 'Parceiro não encontrado.' });
    }

    // Gerar nova key
    const newKey = PartnerKey.generateApiKey();
    partner.apiKey = newKey;
    partner.totalRequests = 0; // resetar contador

    // Atualizar expiração se especificada
    if (expiresInDays && Number(expiresInDays) > 0) {
      partner.expiresAt = new Date(
        Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000,
      );
    }

    await partner.save();

    res.json({
      success: true,
      message: 'Nova API key gerada com sucesso',
      // ⚠️ Mostrar a nova key — o parceiro precisa atualizar no plugin
      apiKey: newKey,
      expiresAt: partner.expiresAt,
    });
  } catch (error) {
    console.error('regenerateKey error:', error.message);
    res.json({ success: false, message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/partner/delete
// ═══════════════════════════════════════════════════════════════
/**
 * Remove permanentemente um parceiro.
 * A API key é invalidada imediatamente.
 */
export const deletePartner = async (req, res) => {
  try {
    const { id } = req.body;

    if (!isValidId(id)) {
      return res.json({ success: false, message: 'ID inválido.' });
    }

    const partner = await PartnerKey.findByIdAndDelete(id);
    if (!partner) {
      return res.json({ success: false, message: 'Parceiro não encontrado.' });
    }

    res.json({
      success: true,
      message: `Parceiro "${partner.storeName}" removido com sucesso`,
    });
  } catch (error) {
    console.error('deletePartner error:', error.message);
    res.json({ success: false, message: error.message });
  }
};
