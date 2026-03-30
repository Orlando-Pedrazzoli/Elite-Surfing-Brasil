// server/emails/OtpVerificationEmail.js
// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — VERIFICAÇÃO DE EMAIL (OTP)
// Elite Surfing Brasil
// ✅ Corrigido: Alto contraste para dark mode
// ✅ Corrigido: Logo da empresa em vez de emoji
// ═══════════════════════════════════════════════════════════════

// URL pública do logo — substitua se necessário
const LOGO_URL = 'https://www.elitesurfing.com.br/logo-branco.png';

export const createOtpEmailTemplate = (otp, email) => {
  // Separar dígitos para exibição individual
  const digits = otp.split('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Código de Verificação - Elite Surfing Brasil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="max-width: 520px; margin: 0 auto; padding: 20px;">

    <!-- Header com logo -->
    <div style="background-color: #1a1a2e; border-radius: 16px 16px 0 0; padding: 28px 24px; text-align: center;">
      <img 
        src="${LOGO_URL}" 
        alt="Elite Surfing Brasil" 
        width="120" 
        height="auto" 
        style="display: block; margin: 0 auto 12px auto; max-width: 160px; height: auto;" 
      />
      <p style="color: #a0aec0; font-size: 13px; margin: 0; letter-spacing: 0.5px;">
        Verificação de Email
      </p>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 36px 28px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
      
      <p style="font-size: 16px; color: #1a202c; margin: 0 0 8px 0; font-weight: 600;">
        Olá!
      </p>
      
      <p style="font-size: 14px; color: #4a5568; line-height: 1.6; margin: 0 0 28px 0;">
        Para continuar com a sua compra, insira o código de verificação abaixo. 
        Este código é válido por <strong style="color: #1a202c;">10 minutos</strong>.
      </p>

      <!-- OTP Code — Fundo escuro + texto branco = legível em light e dark mode -->
      <div style="background-color: #1a1a2e; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 0 0 28px 0;">
        <p style="font-size: 11px; color: #a0aec0; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
          Seu código de verificação
        </p>
        <div style="display: inline-block;">
          ${digits
            .map(
              d =>
                `<span style="display: inline-block; width: 34px; height: 44px; line-height: 44px; background-color: #2d3748; border-radius: 6px; margin: 0 2px; font-size: 24px; font-weight: 800; color: #ffffff; font-family: 'Courier New', Courier, monospace; text-align: center;">${d}</span>`,
            )
            .join('')}
        </div>
      </div>

      <p style="font-size: 13px; color: #718096; line-height: 1.6; margin: 0 0 20px 0;">
        Este código foi solicitado para o email <strong style="color: #4a5568;">${email}</strong>. 
        Se você não fez essa solicitação, pode ignorar este email com segurança.
      </p>

      <!-- Security Notice -->
      <div style="background-color: #fffbeb; border-left: 4px solid #d69e2e; border-radius: 0 8px 8px 0; padding: 12px 16px;">
        <p style="font-size: 12px; color: #744210; margin: 0; line-height: 1.5;">
          <strong>Segurança:</strong> Nunca compartilhe este código com ninguém. 
          A Elite Surfing nunca pedirá seu código por telefone ou WhatsApp.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f7fafc; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #a0aec0; margin: 0 0 4px 0;">
        Elite Surfing Brasil — Acessórios de Surf de Alta Performance
      </p>
      <p style="font-size: 11px; color: #a0aec0; margin: 0;">
        <a href="https://www.elitesurfing.com.br" style="color: #4299e1; text-decoration: none;">www.elitesurfing.com.br</a>
        &nbsp;|&nbsp;
        <a href="https://wa.me/5521964358058" style="color: #4299e1; text-decoration: none;">WhatsApp</a>
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

Segurança: Nunca compartilhe este código com ninguém.
A Elite Surfing nunca pedirá seu código por telefone ou WhatsApp.

---
Elite Surfing Brasil
www.elitesurfing.com.br
  `.trim();
};
