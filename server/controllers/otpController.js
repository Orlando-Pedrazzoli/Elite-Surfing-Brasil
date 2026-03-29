// server/controllers/otpController.js
// ═══════════════════════════════════════════════════════════════
// OTP VERIFICATION CONTROLLER — Elite Surfing Brasil
// Envio e verificação de código OTP por email
// ═══════════════════════════════════════════════════════════════

import OtpVerification from '../models/OtpVerification.js';
import { sendSimpleEmail } from '../services/emailService.js';
import {
  createOtpEmailTemplate,
  createOtpTextTemplate,
} from '../emails/OtpVerificationEmail.js';
import jwt from 'jsonwebtoken';

// =============================================================================
// Rate limiting em memória (por IP + email)
// Cooldown de 60 segundos entre envios para o mesmo email
// =============================================================================
const otpCooldowns = new Map();

const COOLDOWN_MS = 60 * 1000; // 60 segundos
const MAX_SENDS_PER_HOUR = 5; // Máximo 5 envios por email por hora

const checkCooldown = email => {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = otpCooldowns.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Verificar cooldown (60s entre envios)
  const timeSinceLastSend = now - record.lastSend;
  if (timeSinceLastSend < COOLDOWN_MS) {
    const waitSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastSend) / 1000);
    return {
      allowed: false,
      reason: `Aguarde ${waitSeconds}s antes de solicitar outro código.`,
    };
  }

  // Verificar limite por hora
  // Limpar envios com mais de 1 hora
  record.sends = record.sends.filter(t => now - t < 3600000);
  if (record.sends.length >= MAX_SENDS_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Limite de envios atingido. Tente novamente em 1 hora.',
    };
  }

  return { allowed: true };
};

const registerSend = email => {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const record = otpCooldowns.get(key) || { sends: [], lastSend: 0 };

  record.sends.push(now);
  record.lastSend = now;

  // Limpar envios antigos (mais de 1 hora)
  record.sends = record.sends.filter(t => now - t < 3600000);

  otpCooldowns.set(key, record);
};

// Limpeza periódica do Map (a cada 30 minutos)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of otpCooldowns.entries()) {
      record.sends = record.sends.filter(t => now - t < 3600000);
      if (record.sends.length === 0 && now - record.lastSend > 3600000) {
        otpCooldowns.delete(key);
      }
    }
  },
  30 * 60 * 1000,
);

// =============================================================================
// SEND OTP : POST /api/otp/send
// Público — usado no guest checkout
// =============================================================================
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validação do email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validação de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido.',
      });
    }

    // Bloquear domínios descartáveis conhecidos
    const disposableDomains = [
      'tempmail.com',
      'throwaway.email',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'trashmail.com',
      'fakeinbox.com',
      'sharklasers.com',
      'guerrillamailblock.com',
      'grr.la',
      'dispostable.com',
      'maildrop.cc',
      'temp-mail.org',
      'tempail.com',
      'tempr.email',
      '10minutemail.com',
      'mohmal.com',
    ];

    const emailDomain = normalizedEmail.split('@')[1];
    if (disposableDomains.includes(emailDomain)) {
      return res.status(400).json({
        success: false,
        message: 'Emails temporários não são permitidos. Use um email válido.',
      });
    }

    // Rate limiting
    const cooldownCheck = checkCooldown(normalizedEmail);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: cooldownCheck.reason,
      });
    }

    // Gerar OTP
    const otp = await OtpVerification.createOTP(normalizedEmail);

    console.log('📧 OTP gerado para:', normalizedEmail);

    // Enviar email
    const emailHtml = createOtpEmailTemplate(otp, normalizedEmail);
    const emailText = createOtpTextTemplate(otp, normalizedEmail);

    const emailResult = await sendSimpleEmail(
      normalizedEmail,
      '🔐 Código de Verificação - Elite Surfing Brasil',
      emailHtml,
      emailText,
    );

    if (!emailResult.success) {
      console.error('❌ Falha ao enviar email OTP:', emailResult.error);
      // Limpar OTP se email falhou
      await OtpVerification.deleteMany({ email: normalizedEmail });
      return res.status(500).json({
        success: false,
        message:
          'Erro ao enviar email. Verifique o endereço e tente novamente.',
      });
    }

    // Registrar envio no rate limiter
    registerSend(normalizedEmail);

    console.log('✅ Email OTP enviado com sucesso para:', normalizedEmail);

    return res.status(200).json({
      success: true,
      message: 'Código de verificação enviado para o seu email.',
    });
  } catch (error) {
    console.error('❌ Erro no sendOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao enviar código de verificação.',
    });
  }
};

// =============================================================================
// VERIFY OTP : POST /api/otp/verify
// Público — retorna verificationToken JWT (válido 30 min)
// =============================================================================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validações
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email e código são obrigatórios.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validar formato do OTP (6 dígitos)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'O código deve ter 6 dígitos.',
      });
    }

    // Verificar OTP
    const result = await OtpVerification.verifyOTP(normalizedEmail, otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }

    // ✅ OTP válido — gerar verificationToken JWT
    // Este token será enviado junto com o pedido para provar que o email foi verificado
    const verificationToken = jwt.sign(
      {
        email: normalizedEmail,
        purpose: 'email_verification',
        verified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }, // Token válido por 30 minutos
    );

    // Limpar OTPs usados deste email
    await OtpVerification.deleteMany({ email: normalizedEmail });

    console.log('✅ Email verificado com sucesso:', normalizedEmail);

    return res.status(200).json({
      success: true,
      message: 'Email verificado com sucesso!',
      verificationToken,
    });
  } catch (error) {
    console.error('❌ Erro no verifyOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao verificar código.',
    });
  }
};
