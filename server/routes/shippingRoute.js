// server/routes/shippingRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING ROUTES — Rotas de Frete (Melhor Envio)
// ═══════════════════════════════════════════════════════════════════════
// POST /api/shipping/calculate       — Cotação de frete (público)
// POST /api/shipping/label/process   — 🏷️ Comprar/gerar/imprimir etiqueta (admin)
// POST /api/shipping/label/tracking  — 🏷️ Atualizar código de rastreio (admin)
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import authSeller from '../middlewares/authSeller.js';
import {
  calculateShippingQuote,
  processShippingLabel,
  refreshLabelTracking,
} from '../controllers/shippingController.js';

const shippingRouter = express.Router();

// Cotação de frete — público (guest + logado)
shippingRouter.post('/calculate', calculateShippingQuote);

// 🏷️ Etiquetas Melhor Envio — apenas admin
shippingRouter.post('/label/process', authSeller, processShippingLabel);
shippingRouter.post('/label/tracking', authSeller, refreshLabelTracking);

export default shippingRouter;
