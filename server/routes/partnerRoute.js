/**
 * ═══════════════════════════════════════════════════════════════
 * partnerRoute.js — Rotas de gestão de parceiros (admin)
 * ═══════════════════════════════════════════════════════════════
 *
 * Montado em: /api/partner
 * Autenticação: authSeller (token do admin da Elite Surfing)
 *
 * Rotas:
 *   POST /api/partner/create         → cria parceiro + gera key
 *   GET  /api/partner/list           → lista parceiros
 *   POST /api/partner/toggle         → ativa/desativa
 *   POST /api/partner/regenerate-key → gera nova key
 *   POST /api/partner/delete         → remove parceiro
 *
 * Estas rotas são para uso exclusivo do admin da Elite Surfing.
 * O parceiro (Rio Surf Shop) nunca acessa estas rotas.
 * ═══════════════════════════════════════════════════════════════
 */

import express from 'express';
import authSeller from '../middlewares/authSeller.js';
import {
  createPartner,
  listPartners,
  togglePartner,
  regenerateKey,
  deletePartner,
} from '../controllers/partnerController.js';

const partnerRouter = express.Router();

// Todas as rotas requerem auth de admin/seller
partnerRouter.use(authSeller);

partnerRouter.post('/create', createPartner);
partnerRouter.get('/list', listPartners);
partnerRouter.post('/toggle', togglePartner);
partnerRouter.post('/regenerate-key', regenerateKey);
partnerRouter.post('/delete', deletePartner);

export default partnerRouter;
