// server/utils/secretBox.js
// ═══════════════════════════════════════════════════════════════════════
// 🔐 SECRET BOX — encriptação simétrica (AES-256-GCM) para tokens em repouso
// ═══════════════════════════════════════════════════════════════════════
// Usado para guardar o access token da Página do Facebook no Mongo.
// Chave: SOCIAL_TOKEN_ENCRYPTION_KEY — 32 bytes em hex (64 chars) ou
// base64. Gerar com:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Formato guardado: "v1.<iv_b64>.<tag_b64>.<cipher_b64>"
// Se a chave mudar, os tokens guardados deixam de abrir → religar a conta.
// ═══════════════════════════════════════════════════════════════════════
import crypto from 'crypto';

const getKey = () => {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    const err = new Error(
      'SOCIAL_TOKEN_ENCRYPTION_KEY não configurada (32 bytes em hex ou base64).',
    );
    err.code = 'NO_ENCRYPTION_KEY';
    throw err;
  }
  let key;
  if (/^[0-9a-f]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    const err = new Error(
      'SOCIAL_TOKEN_ENCRYPTION_KEY inválida: precisa de 32 bytes (64 chars hex).',
    );
    err.code = 'BAD_ENCRYPTION_KEY';
    throw err;
  }
  return key;
};

export const isSecretBoxConfigured = () => {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
};

export const encrypt = plaintext => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
};

export const decrypt = payload => {
  if (!payload) return null;
  const parts = String(payload).split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Token guardado em formato desconhecido');
  }
  const key = getKey();
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
};
