import express from 'express';
import { upload } from '../configs/multer.js';
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
  reorderProducts,    // 🆕 Reordenar produtos
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
productRouter.post('/add', authSeller, upload.fields([
  { name: 'images', maxCount: 8 },
  { name: 'video', maxCount: 1 }
]), addProduct);

productRouter.post('/update', authSeller, upload.fields([
  { name: 'images', maxCount: 8 },
  { name: 'video', maxCount: 1 }
]), updateProduct);

productRouter.post('/delete', authSeller, deleteProduct);
productRouter.post('/stock', authSeller, changeStock);
productRouter.post('/update-stock', authSeller, updateStock);
productRouter.post('/decrement-stock', authSeller, decrementStock);
productRouter.post('/reorder', authSeller, reorderProducts);  // 🆕 Reordenar produtos

export default productRouter;