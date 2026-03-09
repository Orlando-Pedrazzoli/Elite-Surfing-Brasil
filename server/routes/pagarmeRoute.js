// server/routes/pagarmeRoute.js
// ═══════════════════════════════════════════════════════════════
// 💳 ROTAS PAGAR.ME — CARTÃO DE CRÉDITO COM PARCELAMENTO
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
  createCardOrder,
  pagarmeWebhook,
  checkPagarmeOrderStatus,
} from '../controllers/pagarmeController.js';

const pagarmeRouter = express.Router();

// ─── Criar pedido com cartão (user logado) ────────────────────
pagarmeRouter.post('/card/create', authUser, createCardOrder);

// ─── Criar pedido com cartão (guest checkout) ─────────────────
pagarmeRouter.post('/card/guest/create', createCardOrder);

// ─── Webhook do Pagar.me (público — chamado pelo Pagar.me) ───
pagarmeRouter.post('/webhook', pagarmeWebhook);

// ─── Verificar status do pedido (admin) ───────────────────────
pagarmeRouter.get('/status/:orderId', authSeller, checkPagarmeOrderStatus);

export default pagarmeRouter;
