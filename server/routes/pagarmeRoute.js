// server/routes/pagarmeRoute.js
// ═══════════════════════════════════════════════════════════════
// 💳 ROTAS PAGAR.ME — CARTÃO DE CRÉDITO + BOLETO BANCÁRIO
// ✅ 29/03/2026: Guest checkout agora exige email verificado (OTP)
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import {
  createCardOrder,
  createBoletoOrder,
  pagarmeWebhook,
  checkPagarmeOrderStatus,
} from '../controllers/pagarmeController.js';

const pagarmeRouter = express.Router();

// ─── CARTÃO DE CRÉDITO ───────────────────────────────────────

// Criar pedido com cartão (user logado)
pagarmeRouter.post('/card/create', authUser, createCardOrder);

// Criar pedido com cartão (guest checkout — email verificado obrigatório)
pagarmeRouter.post('/card/guest/create', verifyEmailToken, createCardOrder);

// ─── BOLETO BANCÁRIO ─────────────────────────────────────────

// Criar pedido com boleto (user logado)
pagarmeRouter.post('/boleto/create', authUser, createBoletoOrder);

// Criar pedido com boleto (guest checkout — email verificado obrigatório)
pagarmeRouter.post('/boleto/guest/create', verifyEmailToken, createBoletoOrder);

// ─── WEBHOOK (público — chamado pelo Pagar.me) ──────────────

pagarmeRouter.post('/webhook', pagarmeWebhook);

// ─── STATUS (admin) ──────────────────────────────────────────

pagarmeRouter.get('/status/:orderId', authSeller, checkPagarmeOrderStatus);

export default pagarmeRouter;
