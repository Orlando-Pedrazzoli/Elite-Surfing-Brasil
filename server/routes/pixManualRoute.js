// ═══════════════════════════════════════════════════════════════
// server/routes/pixManualRoute.js
// ROTAS PIX MANUAL — ELITE SURFING BRASIL
// ✅ 29/03/2026: Guest checkout agora exige email verificado (OTP)
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import {
  createPixOrder,
  createPixOrderGuest,
  confirmPixPayment,
} from '../controllers/pixManualController.js';

const pixRouter = express.Router();

// ─── User logado cria pedido PIX ───
pixRouter.post('/create', authUser, createPixOrder);

// ─── Guest checkout cria pedido PIX (email verificado obrigatório) ───
pixRouter.post('/guest/create', verifyEmailToken, createPixOrderGuest);

// ─── Admin confirma pagamento PIX (painel vendedor) ───
pixRouter.put('/confirm/:orderId', authSeller, confirmPixPayment);

export default pixRouter;
