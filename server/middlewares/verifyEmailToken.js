// server/middlewares/verifyEmailToken.js
// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE — Verificar Email Token em rotas de Guest Checkout
// Garante que o email foi verificado via OTP antes de criar pedido
// ═══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const verifyEmailToken = (req, res, next) => {
  try {
    const { verificationToken, guestEmail } = req.body;

    // Se não é guest checkout, pular verificação (user logado já tem email verificado)
    // As rotas de user logado usam authUser — este middleware é só para guests
    if (req.body.userId && !req.body.isGuestOrder) {
      return next();
    }

    // Para guest checkout, o verificationToken é obrigatório
    if (!verificationToken) {
      console.log('❌ Guest checkout sem verificationToken');
      return res.status(403).json({
        success: false,
        message:
          'Verificação de email necessária. Por favor, verifique seu email antes de finalizar a compra.',
        requiresVerification: true,
      });
    }

    // Decodificar e validar o token
    const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);

    // Validar que o token é de verificação de email
    if (decoded.purpose !== 'email_verification' || !decoded.verified) {
      console.log('❌ Token de verificação inválido (purpose/verified)');
      return res.status(403).json({
        success: false,
        message:
          'Token de verificação inválido. Por favor, verifique seu email novamente.',
        requiresVerification: true,
      });
    }

    // Validar que o email no token corresponde ao email do pedido
    const orderEmail = guestEmail || req.body.customerEmail || '';
    const tokenEmail = decoded.email;

    if (orderEmail && tokenEmail !== orderEmail.toLowerCase().trim()) {
      console.log('❌ Email no token não corresponde ao email do pedido');
      console.log('   Token email:', tokenEmail);
      console.log('   Order email:', orderEmail);
      return res.status(403).json({
        success: false,
        message:
          'O email verificado não corresponde ao email do pedido. Verifique novamente.',
        requiresVerification: true,
      });
    }

    // ✅ Token válido — adicionar email verificado ao request
    req.verifiedEmail = tokenEmail;
    console.log('✅ Email verificado via token:', tokenEmail);

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token de verificação expirado');
      return res.status(403).json({
        success: false,
        message: 'Verificação expirada. Por favor, solicite um novo código.',
        requiresVerification: true,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Token de verificação malformado');
      return res.status(403).json({
        success: false,
        message: 'Token de verificação inválido.',
        requiresVerification: true,
      });
    }

    console.error('❌ Erro no verifyEmailToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno na verificação de email.',
    });
  }
};

export default verifyEmailToken;
