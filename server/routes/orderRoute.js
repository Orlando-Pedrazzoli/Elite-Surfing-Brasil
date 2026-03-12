import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
  getAllOrders,
  getUserOrders,
  updateOrderStatus,
  getOrderById,
} from '../controllers/orderController.js';

const orderRouter = express.Router();

// =============================================================================
// 🆕 ROTAS PÚBLICAS
// =============================================================================

// Rota pública para ver detalhes de um pedido (página de sucesso)
orderRouter.get('/details/:orderId', getOrderById);

// =============================================================================
// ROTAS DE USER AUTENTICADO
// =============================================================================

orderRouter.post('/user', authUser, getUserOrders);

// =============================================================================
// ROTAS DE SELLER/ADMIN
// =============================================================================

orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.post('/status', authSeller, updateOrderStatus);

export default orderRouter;
