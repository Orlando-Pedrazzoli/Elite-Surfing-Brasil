// server/models/OtpVerification.js
// ═══════════════════════════════════════════════════════════════
// OTP VERIFICATION MODEL — Elite Surfing Brasil
// Código de 6 dígitos com expiração automática (TTL 10 min)
// ═══════════════════════════════════════════════════════════════

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // TTL: documento auto-deletado após 600s (10 minutos)
  },
});

// Index composto para buscas rápidas por email
otpVerificationSchema.index({ email: 1, createdAt: -1 });

// Método estático: gerar OTP de 6 dígitos
otpVerificationSchema.statics.generateOTP = function () {
  // Gerar código aleatório de 6 dígitos (100000–999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Método estático: criar novo OTP para email
otpVerificationSchema.statics.createOTP = async function (email) {
  const normalizedEmail = email.toLowerCase().trim();

  // Remover OTPs anteriores deste email
  await this.deleteMany({ email: normalizedEmail });

  // Gerar novo OTP
  const otp = this.generateOTP();

  // Hash do OTP (não armazenar em texto plano)
  const salt = await bcrypt.genSalt(8);
  const otpHash = await bcrypt.hash(otp, salt);

  // Criar registro
  await this.create({
    email: normalizedEmail,
    otpHash,
  });

  return otp; // Retornar OTP em texto plano para enviar por email
};

// Método estático: verificar OTP
otpVerificationSchema.statics.verifyOTP = async function (email, otp) {
  const normalizedEmail = email.toLowerCase().trim();

  // Buscar OTP mais recente para este email
  const record = await this.findOne({ email: normalizedEmail }).sort({
    createdAt: -1,
  });

  if (!record) {
    return {
      valid: false,
      reason: 'Código expirado ou não encontrado. Solicite um novo.',
    };
  }

  // Verificar tentativas (máximo 5)
  if (record.attempts >= 5) {
    await this.deleteMany({ email: normalizedEmail });
    return {
      valid: false,
      reason: 'Número máximo de tentativas excedido. Solicite um novo código.',
    };
  }

  // Incrementar tentativas
  record.attempts += 1;
  await record.save();

  // Comparar OTP
  const isMatch = await bcrypt.compare(otp, record.otpHash);

  if (!isMatch) {
    const remaining = 5 - record.attempts;
    return {
      valid: false,
      reason: `Código incorreto. ${remaining} tentativa(s) restante(s).`,
    };
  }

  // Marcar como verificado
  record.verified = true;
  await record.save();

  return { valid: true };
};

const OtpVerification =
  mongoose.models.OtpVerification ||
  mongoose.model('OtpVerification', otpVerificationSchema);

export default OtpVerification;