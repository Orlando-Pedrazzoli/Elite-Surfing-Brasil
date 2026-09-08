// server/routes/addressRoute.js
// ✅ 29/03/2026: Guest address agora exige email verificado (OTP)
// 🆕 08/09/2026: update/delete adicionados (Minha Conta + fix do bug
//    do PUT /update/:id que o Cart já chamava mas não existia)

import express from 'express';
import authUser from '../middlewares/authUser.js';
import verifyEmailToken from '../middlewares/verifyEmailToken.js';
import {
  addAddress,
  getAddress,
  addGuestAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/addressController.js';

const addressRouter = express.Router();

// =============================================================================
// 🆕 ROTA PÚBLICA (GUEST CHECKOUT) - Email verificado obrigatório
// =============================================================================
addressRouter.post('/guest', verifyEmailToken, addGuestAddress);

// =============================================================================
// ROTAS PROTEGIDAS (authUser)
// =============================================================================
addressRouter.post('/add', authUser, addAddress);
addressRouter.post('/get', authUser, getAddress);
addressRouter.put('/update/:id', authUser, updateAddress);
addressRouter.delete('/delete/:id', authUser, deleteAddress);

export default addressRouter;
