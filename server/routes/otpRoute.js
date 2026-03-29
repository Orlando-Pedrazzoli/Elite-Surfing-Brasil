// server/routes/otpRoute.js
// ═══════════════════════════════════════════════════════════════
// ROTAS OTP — VERIFICAÇÃO DE EMAIL
// Elite Surfing Brasil
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { sendOtp, verifyOtp } from '../controllers/otpController.js';

const otpRouter = express.Router();

// Enviar código OTP para email
otpRouter.post('/send', sendOtp);

// Verificar código OTP e retornar verificationToken
otpRouter.post('/verify', verifyOtp);

export default otpRouter;
