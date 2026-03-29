// server/emails/OtpVerificationEmail.js
// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — VERIFICAÇÃO DE EMAIL (OTP)
// Elite Surfing Brasil
// ═══════════════════════════════════════════════════════════════

export const createOtpEmailTemplate = (otp, email) => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - Elite Surfing Brasil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: 0.5px;">
        🏄 Elite Surfing Brasil
      </h1>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">
        Verificação de Email
      </p>
    </div>

    <!-- Body -->
    <div style="background: #ffffff; padding: 36px 28px; border-left: 1px solid #e8e8e8; border-right: 1px solid #e8e8e8;">
      
      <p style="font-size: 16px; color: #333333; margin: 0 0 8px 0; font-weight: 600;">
        Olá!
      </p>
      
      <p style="font-size: 14px; color: #555555; line-height: 1.6; margin: 0 0 24px 0;">
        Para continuar com a sua compra, insira o código de verificação abaixo. 
        Este código é válido por <strong>10 minutos</strong>.
      </p>

      <!-- OTP Code -->
      <div style="background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
          Seu código de verificação
        </p>
        <p style="font-size: 36px; font-weight: 800; color: #1a1a2e; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${otp}
        </p>
      </div>

      <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0 0 20px 0;">
        Este código foi solicitado para o email <strong>${email}</strong>. 
        Se você não fez essa solicitação, pode ignorar este email com segurança.
      </p>

      <!-- Security Notice -->
      <div style="background: #fef3cd; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 0 0 8px 0;">
        <p style="font-size: 12px; color: #92400e; margin: 0; line-height: 1.5;">
          <strong>🔒 Segurança:</strong> Nunca compartilhe este código com ninguém. 
          A Elite Surfing nunca pedirá seu código por telefone ou WhatsApp.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e8e8e8; border-top: none;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px 0;">
        Elite Surfing Brasil — Acessórios de Surf de Alta Performance
      </p>
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        <a href="https://www.elitesurfing.com.br" style="color: #3b82f6; text-decoration: none;">www.elitesurfing.com.br</a>
        &nbsp;|&nbsp;
        <a href="https://wa.me/5521964358058" style="color: #3b82f6; text-decoration: none;">WhatsApp</a>
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
};

export const createOtpTextTemplate = (otp, email) => {
  return `
Elite Surfing Brasil - Verificação de Email

Olá!

Seu código de verificação é: ${otp}

Este código é válido por 10 minutos e foi solicitado para o email ${email}.

Se você não fez essa solicitação, ignore este email.

---
Elite Surfing Brasil
www.elitesurfing.com.br
  `.trim();
};
