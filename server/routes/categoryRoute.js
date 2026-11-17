// server/routes/categoryRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS
//   categoryPublicRouter → /api/category            (loja, em cache no CDN)
//   categoryAdminRouter  → /api/seller/categories   (admin, authSeller)
// ═══════════════════════════════════════════════════════════════════════
import express from 'express';
import authSeller from '../middlewares/authSeller.js';
import { handleUpload } from '../configs/multer.js';
import {
  getPublicCategories,
  listCategories,
  createCategory,
  updateCategory,
  reorderCategories,
  toggleCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

// ─── Público ───
export const categoryPublicRouter = express.Router();
categoryPublicRouter.get('/', getPublicCategories);

// ─── Admin ───
export const categoryAdminRouter = express.Router();
categoryAdminRouter.use(authSeller);

const categoryImage = handleUpload([{ name: 'image', maxCount: 1 }]);

categoryAdminRouter.get('/', listCategories);
categoryAdminRouter.post('/', categoryImage, createCategory);
// rotas fixas antes de "/:id"
categoryAdminRouter.put('/reorder', reorderCategories);
categoryAdminRouter.put('/:id', categoryImage, updateCategory);
categoryAdminRouter.post('/:id/toggle', toggleCategory);
categoryAdminRouter.delete('/:id', deleteCategory);
