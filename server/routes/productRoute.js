// server/routes/productRoute.js
import express from 'express';
import { handleUpload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import {
  addProduct,
  productList,
  productById,
  getProductById,
  getProductsByIds,
  changeStock,
  updateProduct,
  deleteProduct,
  getProductFamily,
  checkStock,
  updateStock,
  decrementStock,
  reorderProducts, // 🆕 Reordenar produtos
} from '../controllers/productController.js';

const productRouter = express.Router();

// Rotas públicas
productRouter.get('/list', productList);
productRouter.post('/by-ids', getProductsByIds);
productRouter.post('/id', productById);
productRouter.post('/family', getProductFamily);
productRouter.post('/check-stock', checkStock);
productRouter.get('/:id', getProductById);

// Rotas protegidas (seller/admin)
// 🔧 FIX: handleUpload envolve o multer e devolve JSON legível quando um
// arquivo é rejeitado (tipo inválido ou acima de 25MB), em vez de um 500.
productRouter.post(
  '/add',
  authSeller,
  handleUpload([
    { name: 'images', maxCount: 8 },
    { name: 'video', maxCount: 1 },
  ]),
  addProduct,
);

productRouter.post(
  '/update',
  authSeller,
  handleUpload([
    { name: 'images', maxCount: 8 },
    { name: 'video', maxCount: 1 },
  ]),
  updateProduct,
);

productRouter.post('/delete', authSeller, deleteProduct);
productRouter.post('/stock', authSeller, changeStock);
productRouter.post('/update-stock', authSeller, updateStock);
productRouter.post('/decrement-stock', authSeller, decrementStock);
productRouter.post('/reorder', authSeller, reorderProducts); // 🆕 Reordenar produtos

export default productRouter;
