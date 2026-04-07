/**
 * ═══════════════════════════════════════════════════════════════
 * authPartner.js — Middleware de autenticação para parceiros
 * ═══════════════════════════════════════════════════════════════
 *
 * Valida a API key enviada no header X-API-Key e adiciona os
 * dados do parceiro autenticado em req.partner.
 *
 * Fluxo de validação:
 *   1. Verificar se X-API-Key está presente no header
 *   2. Buscar parceiro no MongoDB pela key
 *   3. Verificar se está ativo (isActive)
 *   4. Verificar se a key não expirou (expiresAt)
 *   5. Verificar rate limiting (requests por hora)
 *   6. Atualizar tracking (lastAccessAt, totalRequests)
 *   7. Disponibilizar req.partner para os controllers
 *
 * Segurança (baseado em best practices REST API):
 *   - API key APENAS via header (nunca em query params/URL)
 *   - Respostas de erro genéricas (não revelar se key existe)
 *   - Rate limiting por janela de 1 hora
 *   - Logs de acesso para auditoria
 * ═══════════════════════════════════════════════════════════════
 */

import PartnerKey from '../models/PartnerKey.js';

const authPartner = async (req, res, next) => {
  try {
    // ── 1. Extrair API key do header ───────────────────────────
    // Best practice: API keys NUNCA devem ser passadas em URLs
    // porque URLs são logadas por proxies, CDNs e browsers.
    // Aceitamos APENAS via header X-API-Key.
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação requerida. Envie a API key no header X-API-Key.',
      });
    }

    // ── 2. Validar formato básico (evitar queries desnecessárias)
    if (
      typeof apiKey !== 'string' ||
      !apiKey.startsWith('es_partner_') ||
      apiKey.length < 40
    ) {
      return res.status(403).json({
        success: false,
        error: 'API key inválida.',
      });
    }

    // ── 3. Buscar parceiro ─────────────────────────────────────
    const partner = await PartnerKey.findOne({ apiKey, isActive: true });

    if (!partner) {
      // Mensagem genérica — não revelar se a key existe mas está inativa
      return res.status(403).json({
        success: false,
        error: 'API key inválida ou desativada.',
      });
    }

    // ── 4. Verificar expiração ─────────────────────────────────
    if (partner.isExpired()) {
      return res.status(403).json({
        success: false,
        error: 'API key expirada. Solicite uma nova key ao administrador.',
      });
    }

    // ── 5. Rate limiting (janela de 1 hora) ────────────────────
    // Conta requisições na última hora. Se exceder o limite,
    // retorna 429 com header Retry-After.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (partner.lastAccessAt && partner.lastAccessAt > oneHourAgo) {
      // Ainda dentro da mesma janela — verificar limite
      if (partner.totalRequests >= partner.rateLimit.requestsPerHour) {
        // Calcular tempo até reset
        const resetAt = new Date(
          partner.lastAccessAt.getTime() + 60 * 60 * 1000,
        );
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          error: 'Rate limit excedido. Tente novamente em breve.',
          retryAfterSeconds: retryAfter,
        });
      }
    }

    // ── 6. Atualizar tracking ──────────────────────────────────
    // Se a última janela expirou, resetar o contador
    const shouldReset =
      !partner.lastAccessAt || partner.lastAccessAt <= oneHourAgo;

    await PartnerKey.findByIdAndUpdate(partner._id, {
      lastAccessAt: new Date(),
      totalRequests: shouldReset ? 1 : partner.totalRequests + 1,
    });

    // ── 7. Disponibilizar dados do parceiro ────────────────────
    req.partner = partner;
    next();
  } catch (error) {
    console.error('authPartner error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno de autenticação.',
    });
  }
};

export default authPartner;
