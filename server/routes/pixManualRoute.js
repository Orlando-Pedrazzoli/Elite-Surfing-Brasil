// ═══════════════════════════════════════════════════════════════
// server/routes/pixManualRoute.js
// ROTAS PIX MANUAL — ELITE SURFING BRASIL
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';     // ajuste path se necessário
import authSeller from '../middlewares/authSeller.js'; // ajuste path se necessário
import {
  createPixOrder,
  createPixOrderGuest,
  confirmPixPayment,
} from '../controllers/pixManualController.js';

const pixRouter = express.Router();

// ─── User logado cria pedido PIX ───
pixRouter.post('/create', authUser, createPixOrder);

// ─── Guest checkout cria pedido PIX ───
pixRouter.post('/guest/create', createPixOrderGuest);

// ─── Admin confirma pagamento PIX (painel vendedor) ───
pixRouter.put('/confirm/:orderId', authSeller, confirmPixPayment);

export default pixRouter;