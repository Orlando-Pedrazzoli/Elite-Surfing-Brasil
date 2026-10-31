// server/routes/resellerRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 🏪 REVENDEDORES
//   resellerPublicRouter → /api/reseller          (formulário /revendedores)
//   resellerAdminRouter  → /api/seller/resellers  (admin, authSeller)
// ═══════════════════════════════════════════════════════════════════════
import express from 'express';
import rateLimit from 'express-rate-limit';
import authSeller from '../middlewares/authSeller.js';
import {
  submitApplication,
  listResellers,
  getReseller,
  updateReseller,
  deleteReseller,
} from '../controllers/resellerController.js';

// ─── Público ───
export const resellerPublicRouter = express.Router();

// Anti-spam: 3 candidaturas ACEITES por IP a cada 30 min (além do limite
// global). Respostas 4xx (CNPJ inválido, duplicado…) não contam, para o
// lojista poder corrigir o formulário.
const applyLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Muitos envios em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.',
  },
});

resellerPublicRouter.post('/', applyLimiter, submitApplication);

// ─── Admin ───
export const resellerAdminRouter = express.Router();
resellerAdminRouter.use(authSeller);

resellerAdminRouter.get('/', listResellers);
resellerAdminRouter.get('/:id', getReseller);
resellerAdminRouter.patch('/:id', updateReseller);
resellerAdminRouter.delete('/:id', deleteReseller);
