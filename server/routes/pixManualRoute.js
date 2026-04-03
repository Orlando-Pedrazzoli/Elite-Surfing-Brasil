// ═══════════════════════════════════════════════════════════════
// server/routes/pixManualRoute.js
// ROTAS PIX MANUAL — ELITE SURFING BRASIL
// ✅ 29/03/2026: Guest checkout agora exige email verificado (OTP)
// ✅ 31/03/2026: Todas as rotas de pagamento agora passam por fraudProtection
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import { fraudProtection } from '../middlewares/fraudProtection.js';
import {
  createPixOrder,
  createPixOrderGuest,
  confirmPixPayment,
} from '../controllers/pixManualController.js';

const pixRouter = express.Router();

// ─── User logado cria pedido PIX — com proteção anti-fraude ───
pixRouter.post('/create', authUser, fraudProtection, createPixOrder);

// ─── Guest checkout cria pedido PIX (email verificado + anti-fraude) ───
pixRouter.post(
  '/guest/create',
  verifyEmailToken,
  fraudProtection,
  createPixOrderGuest,
);

// ─── Admin confirma pagamento PIX (painel vendedor) ───
pixRouter.put('/confirm/:orderId', authSeller, confirmPixPayment);

export default pixRouter;
