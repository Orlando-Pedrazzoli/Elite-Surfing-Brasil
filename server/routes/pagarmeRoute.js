// server/routes/pagarmeRoute.js
// ═══════════════════════════════════════════════════════════════
// 💳 ROTAS PAGAR.ME — CARTÃO DE CRÉDITO + BOLETO BANCÁRIO
// ✅ 29/03/2026: Guest checkout agora exige email verificado (OTP)
// ✅ 31/03/2026: Todas as rotas de pagamento agora passam por fraudProtection
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import { fraudProtection } from '../middlewares/fraudProtection.js';
import {
  createCardOrder,
  createBoletoOrder,
  pagarmeWebhook,
  checkPagarmeOrderStatus,
} from '../controllers/pagarmeController.js';

const pagarmeRouter = express.Router();

// ─── CARTÃO DE CRÉDITO ───────────────────────────────────────
// Criar pedido com cartão (user logado) — com proteção anti-fraude
pagarmeRouter.post('/card/create', authUser, fraudProtection, createCardOrder);

// Criar pedido com cartão (guest checkout — email verificado + anti-fraude)
pagarmeRouter.post(
  '/card/guest/create',
  verifyEmailToken,
  fraudProtection,
  createCardOrder,
);

// ─── BOLETO BANCÁRIO ─────────────────────────────────────────
// Criar pedido com boleto (user logado) — com proteção anti-fraude
pagarmeRouter.post(
  '/boleto/create',
  authUser,
  fraudProtection,
  createBoletoOrder,
);

// Criar pedido com boleto (guest checkout — email verificado + anti-fraude)
pagarmeRouter.post(
  '/boleto/guest/create',
  verifyEmailToken,
  fraudProtection,
  createBoletoOrder,
);

// ─── WEBHOOK (público — chamado pelo Pagar.me) ──────────────
pagarmeRouter.post('/webhook', pagarmeWebhook);

// ─── STATUS (admin) ──────────────────────────────────────────
pagarmeRouter.get('/status/:orderId', authSeller, checkPagarmeOrderStatus);

export default pagarmeRouter;
