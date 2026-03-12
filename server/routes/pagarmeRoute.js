// server/routes/pagarmeRoute.js
// ═══════════════════════════════════════════════════════════════
// 💳 ROTAS PAGAR.ME — CARTÃO DE CRÉDITO + BOLETO BANCÁRIO
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
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

// Criar pedido com cartão (guest checkout)
pagarmeRouter.post('/card/guest/create', createCardOrder);

// ─── BOLETO BANCÁRIO ─────────────────────────────────────────

// Criar pedido com boleto (user logado)
pagarmeRouter.post('/boleto/create', authUser, createBoletoOrder);

// Criar pedido com boleto (guest checkout)
pagarmeRouter.post('/boleto/guest/create', createBoletoOrder);

// ─── WEBHOOK (público — chamado pelo Pagar.me) ──────────────

pagarmeRouter.post('/webhook', pagarmeWebhook);

// ─── STATUS (admin) ──────────────────────────────────────────

pagarmeRouter.get('/status/:orderId', authSeller, checkPagarmeOrderStatus);

export default pagarmeRouter;
