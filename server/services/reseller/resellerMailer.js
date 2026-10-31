// server/services/reseller/resellerMailer.js
// ═══════════════════════════════════════════════════════════════════════
// ✉️ REVENDEDORES — emails do programa de revenda
// ═══════════════════════════════════════════════════════════════════════
// Usa o mesmo Gmail (nodemailer) das tabelas de preço e dos pedidos:
//   GMAIL_USER + GMAIL_APP_PASSWORD
// Opcional:
//   RESELLER_NOTIFY_EMAIL → quem recebe o aviso de nova candidatura
//                           (padrão: atendimento@elitesurfing.com.br)
//
// Emails:
//   1. sendResellerApplicationNotification → LOJA (nova candidatura;
//      Reply-To = email do lojista; botão abre o painel)
//   2. sendResellerApplicationReceived     → LOJISTA (confirmação)
//   3. sendResellerApproved                → LOJISTA (aprovado; a equipe
//      envia a tabela de preços pelo painel "Tabelas de Preço")
//   4. sendResellerRejected                → LOJISTA (recusado, com motivo
//      opcional)
//
// Todas devolvem `true`/`false` e NUNCA lançam: a candidatura fica gravada
// mesmo que o email falhe (o admin vê tudo no painel).
// ═══════════════════════════════════════════════════════════════════════

import nodemailer from 'nodemailer';

const SITE_URL = process.env.SITE_URL || 'https://www.elitesurfing.com.br';
const STORE_EMAIL = 'atendimento@elitesurfing.com.br';
const STORE_WHATSAPP = '5521964358058';
const STORE_WHATSAPP_DISPLAY = '(21) 96435-8058';
const NOTIFY_TO = process.env.RESELLER_NOTIFY_EMAIL || STORE_EMAIL;

export const isEmailConfigured = () =>
  !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      // Função serverless com 60 s: uma ligação SMTP parada não pode
      // consumir esse tempo todo
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const esc = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const formatCNPJ = cnpj => {
  const d = String(cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj || '';
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

export const formatPhone = phone => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return phone || '';
};

const STORE_TYPE_LABEL = {
  fisica: 'Loja física',
  online: 'Loja online',
  ambas: 'Loja física + online',
};

const firstName = name => String(name || '').trim().split(/\s+/)[0] || '';

const paragraphs = text =>
  esc(text)
    .split(/\n{2,}/)
    .map(
      block =>
        `<p style="margin:0 0 14px;line-height:1.6;">${block.replace(/\n/g, '<br>')}</p>`,
    )
    .join('');

const shell = inner => `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;padding:24px 12px;">
    <div style="background:#111827;color:#ffffff;padding:18px 28px;border-radius:12px 12px 0 0;">
      <span style="font-size:18px;font-weight:700;letter-spacing:2px;">ELITE SURFING</span>
      <span style="font-size:12px;color:#9ca3af;margin-left:10px;">Programa de revendedores</span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;">
      ${inner}
    </div>
    <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;text-align:center;line-height:1.5;">
      Elite Surfing Brasil · ${esc(SITE_URL.replace(/^https?:\/\//, ''))} · ${esc(STORE_EMAIL)}
    </p>
  </div>
</body>
</html>`;

const button = (href, label, color = '#111827') =>
  `<div style="text-align:center;margin:28px 0 0;">
    <a href="${esc(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;">${esc(label)}</a>
  </div>`;

const whatsappButton = text =>
  button(
    `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(text)}`,
    `WhatsApp ${STORE_WHATSAPP_DISPLAY}`,
    '#25D366',
  );

const rowsHtml = r => {
  const a = r.address || {};
  const address = a.street
    ? `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''} · ${a.neighborhood} · ${a.city} - ${a.state} · CEP ${a.cep}`
    : [a.city, a.state].filter(Boolean).join(' - ');

  const rows = [
    ['Razão social', r.companyName],
    ['Nome fantasia', r.tradeName],
    ['CNPJ', formatCNPJ(r.cnpj)],
    ['Inscr. estadual', r.stateRegistration || '—'],
    ['Tipo de loja', STORE_TYPE_LABEL[r.storeType] || r.storeType],
    ['Site / Instagram', r.website || '—'],
    ['Endereço', address || '—'],
    ['Responsável', r.contactName],
    ['E-mail', r.email],
    ['WhatsApp', formatPhone(r.phone)],
  ];

  return rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;"><strong style="color:#374151;">${k}</strong></td>
        <td style="padding:6px 0;color:#374151;font-size:13px;">${esc(v)}</td>
      </tr>`,
    )
    .join('');
};

const send = async ({ to, subject, html, replyTo }) => {
  if (!isEmailConfigured()) {
    console.warn('[Resellers] GMAIL_USER/GMAIL_APP_PASSWORD em falta — email não enviado:', subject);
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: { name: 'Elite Surfing Brasil', address: process.env.GMAIL_USER },
      to,
      replyTo: replyTo || STORE_EMAIL,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('[Resellers] erro ao enviar email:', subject, error?.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────
// 1. Nova candidatura → LOJA
// ─────────────────────────────────────────────────────────────────────
export const sendResellerApplicationNotification = r => {
  const adminUrl = `${SITE_URL}/seller/revendedores?id=${String(r._id)}`;
  const receivedAt = new Date(r.createdAt || Date.now()).toLocaleString(
    'pt-BR',
    { timeZone: 'America/Sao_Paulo' },
  );
  return send({
    to: NOTIFY_TO,
    replyTo: r.email,
    subject: `🏪 Novo pedido de revenda · ${r.tradeName} (${formatCNPJ(r.cnpj)})`,
    html: shell(`
      <div style="padding:32px 28px;">
        <h2 style="margin:0 0 6px;font-size:20px;">Novo pedido para ser revendedor</h2>
        <p style="margin:0 0 18px;color:#6b7280;font-size:13px;">Recebido em ${esc(receivedAt)}</p>
        <table style="border-collapse:collapse;margin:0 0 16px;">${rowsHtml(r)}</table>
        ${
          r.message
            ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
                 <p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Mensagem do lojista</p>
                 <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${esc(r.message)}</p>
               </div>`
            : ''
        }
        ${button(adminUrl, 'Aprovar ou recusar no painel')}
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
          Responda este email para falar diretamente com ${esc(r.contactName)}.
        </p>
      </div>`),
  });
};

// ─────────────────────────────────────────────────────────────────────
// 2. Confirmação → LOJISTA
// ─────────────────────────────────────────────────────────────────────
export const sendResellerApplicationReceived = r => {
  const name = firstName(r.contactName);
  return send({
    to: r.email,
    subject: 'Recebemos seu pedido de revenda - Elite Surfing',
    html: shell(`
      <div style="padding:32px 28px;">
        <h2 style="margin:0 0 12px;font-size:20px;">Pedido recebido${name ? `, ${esc(name)}` : ''}! 🤙</h2>
        <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
          Recebemos o cadastro da <strong>${esc(r.tradeName)}</strong> para revender os
          produtos Elite Surfing. Nossa equipe comercial vai analisar os dados e
          entrar em contato por email com os <strong>próximos passos</strong>.
        </p>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
          Assim que o cadastro for aprovado, enviamos a <strong>tabela de preços para
          lojistas</strong>, com fotos e códigos de todos os produtos.
        </p>
        <p style="margin:0;color:#4b5563;font-size:15px;line-height:1.6;">Alguma dúvida? Chama a gente no WhatsApp:</p>
        ${whatsappButton('Olá! Enviei meu cadastro de revendedor Elite Surfing e tenho uma dúvida.')}
      </div>`),
  });
};

// ─────────────────────────────────────────────────────────────────────
// 3. Aprovado → LOJISTA
// ─────────────────────────────────────────────────────────────────────
export const sendResellerApproved = (r, note = '') => {
  const name = firstName(r.contactName);
  return send({
    to: r.email,
    subject: 'Cadastro aprovado! Bem-vindo ao programa de revendedores Elite Surfing',
    html: shell(`
      <div style="padding:32px 28px;">
        <h2 style="margin:0 0 12px;font-size:20px;">Cadastro aprovado${name ? `, ${esc(name)}` : ''}! 🎉</h2>
        <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
          A <strong>${esc(r.tradeName)}</strong> agora faz parte da rede de
          revendedores Elite Surfing. Em breve você recebe neste email a
          <strong>tabela de preços para lojistas</strong> e as condições comerciais.
        </p>
        ${note ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;color:#374151;font-size:14px;">${paragraphs(note)}</div>` : ''}
        <p style="margin:16px 0 0;color:#4b5563;font-size:15px;line-height:1.6;">
          Para fazer o primeiro pedido ou tirar dúvidas, fale com a equipe comercial:
        </p>
        ${whatsappButton('Olá! Meu cadastro de revendedor Elite Surfing foi aprovado e quero fazer um pedido.')}
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">ou responda este email · ${esc(STORE_EMAIL)}</p>
      </div>`),
  });
};

// ─────────────────────────────────────────────────────────────────────
// 4. Recusado → LOJISTA
// ─────────────────────────────────────────────────────────────────────
export const sendResellerRejected = r => {
  const name = firstName(r.contactName);
  return send({
    to: r.email,
    subject: 'Sobre o seu pedido de revenda - Elite Surfing',
    html: shell(`
      <div style="padding:32px 28px;">
        <h2 style="margin:0 0 12px;font-size:20px;">Olá${name ? `, ${esc(name)}` : ''}</h2>
        <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
          Obrigado pelo interesse em revender os produtos Elite Surfing. Neste
          momento não vamos seguir com o cadastro da <strong>${esc(r.tradeName)}</strong>.
        </p>
        ${r.rejectionReason ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;color:#374151;font-size:14px;">${paragraphs(r.rejectionReason)}</div>` : ''}
        <p style="margin:16px 0 0;color:#4b5563;font-size:15px;line-height:1.6;">
          Se quiser conversar sobre isso, estamos à disposição no WhatsApp ou
          respondendo este email.
        </p>
        ${whatsappButton('Olá! Recebi a resposta sobre meu cadastro de revendedor Elite Surfing e gostaria de conversar.')}
      </div>`),
  });
};
