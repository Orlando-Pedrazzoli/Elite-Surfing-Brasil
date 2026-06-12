// server/routes/mercadoPagoRoute.js
// ═══════════════════════════════════════════════════════════════
// 💠 ROTAS MERCADO PAGO — Cartão + PIX + Boleto
// Mantém a mesma proteção do fluxo anterior:
//   - user logado: authUser + fraudProtection
//   - guest: verifyEmailToken (OTP) + fraudProtection
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import { fraudProtection } from '../middlewares/fraudProtection.js';
import {
  createCardPayment,
  createPixPayment,
  createBoletoPayment,
  mercadoPagoWebhook,
  getPublicPaymentStatus,
  checkMpOrderStatus,
} from '../controllers/mercadoPagoController.js';

const router = express.Router();

// ─── CARTÃO ───────────────────────────────────────────────────
router.post('/card/create', authUser, fraudProtection, createCardPayment);
router.post(
  '/card/guest/create',
  verifyEmailToken,
  fraudProtection,
  createCardPayment,
);

// ─── PIX ──────────────────────────────────────────────────────
router.post('/pix/create', authUser, fraudProtection, createPixPayment);
router.post(
  '/pix/guest/create',
  verifyEmailToken,
  fraudProtection,
  createPixPayment,
);

// ─── BOLETO ───────────────────────────────────────────────────
router.post('/boleto/create', authUser, fraudProtection, createBoletoPayment);
router.post(
  '/boleto/guest/create',
  verifyEmailToken,
  fraudProtection,
  createBoletoPayment,
);

// ─── WEBHOOK (público, chamado pelo Mercado Pago) ─────────────
router.post('/webhook', mercadoPagoWebhook);

// ─── STATUS público (polling da página PIX) ───────────────────
router.get('/payment-status/:orderId', getPublicPaymentStatus);

// ─── STATUS detalhado (admin) ─────────────────────────────────
router.get('/status/:orderId', authSeller, checkMpOrderStatus);

export default router;
