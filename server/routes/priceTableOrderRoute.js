// server/routes/priceTableOrderRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS A PARTIR DA TABELA DE LOJISTA — /api/price-tables/orders
// ═══════════════════════════════════════════════════════════════════════
// Montado DENTRO do priceTableRouter (que já aplica authSeller), antes das
// rotas /:id — senão "orders" seria lido como o id de uma tabela.
// Só GET/POST/PUT/DELETE (métodos liberados no CORS do server.js).
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  setOrderStatus,
  recordShare,
  exportOrderPdf,
  sendOrder,
  deleteOrder,
} from '../controllers/priceTableOrderController.js';

const priceTableOrderRouter = express.Router();

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitos envios em sequência. Aguarde um minuto.',
  },
});

priceTableOrderRouter.get('/', listOrders);
priceTableOrderRouter.post('/', createOrder);
priceTableOrderRouter.get('/:orderId', getOrder);
priceTableOrderRouter.put('/:orderId', updateOrder);
priceTableOrderRouter.delete('/:orderId', deleteOrder);
priceTableOrderRouter.post('/:orderId/status', setOrderStatus);
priceTableOrderRouter.post('/:orderId/shared', recordShare);
priceTableOrderRouter.post('/:orderId/pdf', exportOrderPdf);
priceTableOrderRouter.post('/:orderId/send', sendLimiter, sendOrder);

export default priceTableOrderRouter;
