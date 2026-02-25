// ═══════════════════════════════════════════════════════════════
// src/utils/pixUtils.js
// GERADOR DE PAYLOAD PIX (BRCode) — ELITE SURFING BRASIL
// Gera payload EMV QR Code conforme especificação do BCB
// ═══════════════════════════════════════════════════════════════

// ─── CONFIGURAÇÃO PIX ───
export const PIX_CONFIG = {
  key: '+5521964358058',
  merchantName: 'Andre Oliveira Granha',
  merchantCity: 'Rio de Janeiro',
};

// ─── CRC16-CCITT ───
const crc16ccitt = (str) => {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

// ─── CAMPO TLV (Tag-Length-Value) ───
const tlv = (tag, value) => `${tag}${value.length.toString().padStart(2, '0')}${value}`;

// ─── REMOVER ACENTOS ───
const clean = (str, max = 25) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, max);

// ═══════════════════════════════════════════════════════════════
// GERAR PAYLOAD PIX
// @param {number} amount - Valor (ex: 199.90)
// @param {string} txId  - ID da transação (ex: ES1A2B3C)
// @returns {string} Payload BRCode (string para QR Code)
// ═══════════════════════════════════════════════════════════════
export const generatePixPayload = (amount, txId = '***') => {
  const fields = [
    tlv('00', '01'),                                          // Payload Format
    tlv('01', amount > 0 ? '12' : '11'),                      // Initiation (12=único)
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', PIX_CONFIG.key)), // Merchant PIX
    tlv('52', '0000'),                                        // Category Code
    tlv('53', '986'),                                         // Currency (BRL)
  ];

  if (amount > 0) {
    fields.push(tlv('54', amount.toFixed(2)));                // Amount
  }

  fields.push(
    tlv('58', 'BR'),                                          // Country
    tlv('59', clean(PIX_CONFIG.merchantName)),                 // Name
    tlv('60', clean(PIX_CONFIG.merchantCity, 15)),             // City
    tlv('62', tlv('05', txId.substring(0, 25))),              // Reference
  );

  const payloadSemCRC = fields.join('') + '6304';
  return payloadSemCRC + crc16ccitt(payloadSemCRC);
};

// ─── ID CURTO DO PEDIDO ───
export const getShortOrderId = (orderId) => {
  if (!orderId) return 'ES00000';
  return 'ES' + orderId.toString().slice(-6).toUpperCase();
};