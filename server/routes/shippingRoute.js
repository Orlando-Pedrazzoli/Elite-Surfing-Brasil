// server/routes/shippingRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING ROUTES — Rotas de Frete (Melhor Envio)
// ═══════════════════════════════════════════════════════════════════════
// POST /api/shipping/calculate           — Cotação de frete (público)
// POST /api/shipping/label/process       — 🏷️ Comprar/gerar etiqueta (admin)
// POST /api/shipping/label/tracking      — 🏷️ Atualizar rastreio (admin)
// GET  /api/shipping/label/pdf/:orderId  — 🏷️ PDF da etiqueta no painel (admin)
// GET  /api/shipping/balance             — 💰 Saldo da carteira ME (admin)
// POST /api/shipping/balance/add         — 💰 Recarga PIX/boleto (admin)
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import authSeller from '../middlewares/authSeller.js';
import {
  calculateShippingQuote,
  processShippingLabel,
  refreshLabelTracking,
  getLabelPdf,
  getMeBalance,
  addMeBalance,
} from '../controllers/shippingController.js';

const shippingRouter = express.Router();

// Cotação de frete — público (guest + logado)
shippingRouter.post('/calculate', calculateShippingQuote);

// 🏷️ Etiquetas Melhor Envio — apenas admin
shippingRouter.post('/label/process', authSeller, processShippingLabel);
shippingRouter.post('/label/tracking', authSeller, refreshLabelTracking);
shippingRouter.get('/label/pdf/:orderId', authSeller, getLabelPdf);

// 💰 Carteira Melhor Envio — apenas admin
shippingRouter.get('/balance', authSeller, getMeBalance);
shippingRouter.post('/balance/add', authSeller, addMeBalance);

export default shippingRouter;
