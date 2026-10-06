// server/routes/couponRoute.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import authSeller from '../middlewares/authSeller.js';
import {
  validateCoupon,
  getWelcomeOffer,
  listCoupons,
  createCoupon,
  updateCoupon,
  toggleCoupon,
  deleteCoupon,
  listRedemptions,
} from '../controllers/couponController.js';

const couponRouter = express.Router();

// 🛡️ Anti brute-force de códigos: 20 tentativas/min por IP
const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
  },
});

// ─── Público (checkout) ───
couponRouter.post('/validate', validateLimiter, validateCoupon);

// ─── Público (modal de boas-vindas do site) — resposta em cache no CDN ───
couponRouter.get('/welcome', getWelcomeOffer);

// ─── Admin ───
couponRouter.get('/', authSeller, listCoupons);
couponRouter.post('/', authSeller, createCoupon);
couponRouter.put('/:id', authSeller, updateCoupon);
couponRouter.patch('/:id/toggle', authSeller, toggleCoupon);
couponRouter.delete('/:id', authSeller, deleteCoupon);
couponRouter.get('/:id/redemptions', authSeller, listRedemptions);

export default couponRouter;
