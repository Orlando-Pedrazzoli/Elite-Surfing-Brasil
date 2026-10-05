// server/services/priceTable/priceTableMailer.js
// ═══════════════════════════════════════════════════════════════════════
// ✉️ TABELAS DE PREÇO — envio por email com a tabela em anexo
// ═══════════════════════════════════════════════════════════════════════
// Usa o mesmo Gmail (nodemailer) dos emails de pedido:
//   GMAIL_USER + GMAIL_APP_PASSWORD
// Opcional:
//   PRICE_TABLE_REPLY_TO → endereço que recebe as respostas dos lojistas
//                          (padrão: atendimento@elitesurfing.com.br)
//
// Um email POR destinatário (nenhum lojista vê o endereço dos outros).
// ═══════════════════════════════════════════════════════════════════════

import nodemailer from 'nodemailer';
import { formatDateBR } from './exportFormat.js';

const DEFAULT_REPLY_TO = 'atendimento@elitesurfing.com.br';
const SITE_URL = 'https://www.elitesurfing.com.br';

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
      // A função serverless tem 60 s no total: uma ligação SMTP parada não
      // pode consumir esse tempo todo (os padrões do nodemailer são minutos)
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
};

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Mensagem digitada pelo admin → parágrafos HTML seguros. */
const messageToHtml = message =>
  escapeHtml(message)
    .split(/\n{2,}/)
    .map(
      block =>
        `<p style="margin:0 0 14px;line-height:1.55;">${block.replace(/\n/g, '<br>')}</p>`,
    )
    .join('');

const buildHtml = ({ message, doc, attachments }) => {
  const rows = [
    ['Tabela', doc.header?.title || 'Tabela de Preços'],
    ['Atualizada em', formatDateBR(doc.createdAt)],
  ];
  if (doc.header?.validUntil)
    rows.push(['Válida até', formatDateBR(doc.header.validUntil)]);
  rows.push(['Produtos', String(doc.rowCount)]);
  rows.push(['Anexos', attachments.map(a => a.filename).join(', ')]);

  const summary = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0F3057;padding:22px 28px;">
                <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">ELITE SURFING</div>
                <div style="color:#c7d2fe;font-size:13px;margin-top:4px;">${escapeHtml(doc.header?.title || 'Tabela de Preços')}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;color:#111827;font-size:15px;">
                ${messageToHtml(message)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 16px;">
                  ${summary}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 22px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.5;">
                Elite Surfing Brasil · <a href="${SITE_URL}" style="color:#0F3057;">www.elitesurfing.com.br</a><br>
                Para falar conosco, basta responder a este email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildText = ({ message, doc, attachments }) =>
  [
    message,
    '',
    `Tabela: ${doc.header?.title || 'Tabela de Preços'}`,
    `Atualizada em: ${formatDateBR(doc.createdAt)}`,
    doc.header?.validUntil
      ? `Válida até: ${formatDateBR(doc.header.validUntil)}`
      : null,
    `Anexos: ${attachments.map(a => a.filename).join(', ')}`,
    '',
    'Elite Surfing Brasil — www.elitesurfing.com.br',
  ]
    .filter(line => line !== null)
    .join('\n');

/**
 * Envia a tabela a UM destinatário.
 * @param {object} args
 * @param {string} args.to
 * @param {string} args.subject
 * @param {string} args.message   texto digitado pelo admin
 * @param {object} args.doc       versão congelada (header, createdAt, rowCount)
 * @param {Array<{filename:string, content:Buffer, contentType:string}>} args.attachments
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export const sendPriceTableEmail = async ({
  to,
  subject,
  message,
  doc,
  attachments,
}) => {
  try {
    const result = await getTransporter().sendMail({
      from: { name: 'Elite Surfing Brasil', address: process.env.GMAIL_USER },
      to,
      replyTo: process.env.PRICE_TABLE_REPLY_TO || DEFAULT_REPLY_TO,
      subject,
      html: buildHtml({ message, doc, attachments }),
      text: buildText({ message, doc, attachments }),
      attachments,
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `❌ Tabela de preços: falha ao enviar para ${to}:`,
      error.message,
    );
    return { success: false, error: error.message || 'Falha no envio' };
  }
};
