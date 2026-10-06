// server/routes/bannerRoute.js
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ BANNERS DA HERO
//   bannerPublicRouter → /api/banner          (loja, em cache no CDN)
//   bannerAdminRouter  → /api/seller/banners  (admin, authSeller)
// ═══════════════════════════════════════════════════════════════════════
import express from 'express';
import authSeller from '../middlewares/authSeller.js';
import { handleUpload } from '../configs/multer.js';
import {
  getPublicBanners,
  listBanners,
  createBanner,
  updateBanner,
  reorderBanners,
  toggleBanner,
  deleteBanner,
  importDefaultBanners,
} from '../controllers/bannerController.js';

// ─── Público ───
export const bannerPublicRouter = express.Router();
bannerPublicRouter.get('/', getPublicBanners);

// ─── Admin ───
export const bannerAdminRouter = express.Router();
bannerAdminRouter.use(authSeller);

const bannerImages = handleUpload([
  { name: 'image', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
]);

bannerAdminRouter.get('/', listBanners);
bannerAdminRouter.post('/', bannerImages, createBanner);
// rotas fixas antes de "/:id"
bannerAdminRouter.put('/reorder', reorderBanners);
bannerAdminRouter.post('/import-defaults', importDefaultBanners);
bannerAdminRouter.put('/:id', bannerImages, updateBanner);
bannerAdminRouter.post('/:id/toggle', toggleBanner);
bannerAdminRouter.delete('/:id', deleteBanner);
