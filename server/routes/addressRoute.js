// server/routes/addressRoute.js
// ✅ 29/03/2026: Guest address agora exige email verificado (OTP)

import express from 'express';
import authUser from '../middlewares/authUser.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import {
  addAddress,
  getAddress,
  addGuestAddress,
} from '../controllers/addressController.js';

const addressRouter = express.Router();

// =============================================================================
// 🆕 ROTA PÚBLICA (GUEST CHECKOUT) - Email verificado obrigatório
// =============================================================================
addressRouter.post('/guest', verifyEmailToken, addGuestAddress);

// =============================================================================
// ROTAS ORIGINAIS (PROTEGIDAS)
// =============================================================================
addressRouter.post('/add', authUser, addAddress);
addressRouter.post('/get', authUser, getAddress);

export default addressRouter;
