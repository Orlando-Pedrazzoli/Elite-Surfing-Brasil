// server/routes/priceTableRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 📋 TABELAS DE PREÇO — rotas admin (/api/price-tables)
// ═══════════════════════════════════════════════════════════════════════
// Tudo com authSeller: estas rotas devolvem custo e preço de tabela.
// Só GET/POST/PUT/DELETE — são os métodos liberados no CORS do server.js.
// As rotas fixas (/orders, /reorder, /versions/...) vêm ANTES de /:id.
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import rateLimit from 'express-rate-limit';
import authSeller from '../middlewares/authSeller.js';
import {
  listTables,
  createTable,
  getTable,
  updateTable,
  reorderTables,
  duplicateTable,
  archiveTable,
  deleteTable,
  exportTable,
  exportVersion,
  listVersions,
  sendTable,
} from '../controllers/priceTableController.js';
import priceTableOrderRouter from './priceTableOrderRoute.js';

const priceTableRouter = express.Router();

// 🛡️ Envio de email: 10 por minuto (cada envio aceita até 15 destinatários)
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

priceTableRouter.use(authSeller);

// 🧾 Pedidos (antes de /:id)
priceTableRouter.use('/orders', priceTableOrderRouter);

priceTableRouter.get('/', listTables);
priceTableRouter.post('/', createTable);
priceTableRouter.put('/reorder', reorderTables);
priceTableRouter.post('/versions/:versionId/export', exportVersion);

priceTableRouter.get('/:id', getTable);
priceTableRouter.put('/:id', updateTable);
priceTableRouter.delete('/:id', deleteTable);
priceTableRouter.post('/:id/duplicate', duplicateTable);
priceTableRouter.post('/:id/archive', archiveTable);
priceTableRouter.post('/:id/export', exportTable);
priceTableRouter.post('/:id/send', sendLimiter, sendTable);
priceTableRouter.get('/:id/versions', listVersions);

export default priceTableRouter;
