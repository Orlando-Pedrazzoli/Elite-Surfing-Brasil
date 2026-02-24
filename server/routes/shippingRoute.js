// server/routes/shippingRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 📦 SHIPPING ROUTES — Rotas de Frete (Melhor Envio)
// ═══════════════════════════════════════════════════════════════════════
// POST /api/shipping/calculate — Cotação de frete (público, sem auth)
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import { calculateShippingQuote } from '../controllers/shippingController.js';

const shippingRouter = express.Router();

// Cotação de frete — público (guest + logado)
shippingRouter.post('/calculate', calculateShippingQuote);

export default shippingRouter;