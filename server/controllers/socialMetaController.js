// server/controllers/socialMetaController.js
// ═══════════════════════════════════════════════════════════════════════
// 📡 SOCIAL META CONTROLLER — ligação da conta, publicação, cron, upload
// ═══════════════════════════════════════════════════════════════════════
//   GET  /api/social/meta/login-url        (admin)  → URL do Facebook Login
//   GET  /api/social/meta/callback         (público, redirect da Meta)
//   GET  /api/social/meta/pages            (admin)  → páginas com IG (seleção)
//   POST /api/social/meta/connect          (admin)  { pageId }
//   POST /api/social/meta/disconnect       (admin)
//   GET  /api/social/meta/status           (admin)  → verifica token + limite
//   POST /api/social/posts/:id/publish     (admin)  → publica agora / avança
//   POST /api/social/posts/:id/schedule    (admin)  { scheduledAt }
//   POST /api/social/posts/:id/unschedule  (admin)
//   GET|POST /api/social/cron/publish      (CRON_SECRET) → agendados + presos
//   POST /api/social/media/sign-upload     (admin)  → assinatura Cloudinary
//   POST /api/social/media/register        (admin)  → valida URL enviada
// ═══════════════════════════════════════════════════════════════════════
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import SocialPost from '../models/SocialPost.js';
import SocialSettings from '../models/SocialSettings.js';
import { encrypt, decrypt, isSecretBoxConfigured } from '../utils/secretBox.js';
import * as meta from '../services/instagram/metaGraphService.js';
import {
  advancePost,
  runScheduledPublishing,
  validateMediaForType,
} from '../services/instagram/publishService.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.elitesurfing.com.br').replace(/\/$/, '');
const SETTINGS_PAGE = `${SITE_URL}/seller/instagram/settings`;

const noStore = res => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};
const isValidId = id => /^[a-f\d]{24}$/i.test(String(id || ''));

// ─────────────────────────────────────────────────────────────────────
// State do OAuth — HMAC com timestamp, válido 10 min (sem sessão no server)
// ─────────────────────────────────────────────────────────────────────
const signState = () => {
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString('hex');
  const sig = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${ts}.${nonce}`)
    .digest('hex');
  return `${ts}.${nonce}.${sig}`;
};
const verifyState = state => {
  const [ts, nonce, sig] = String(state || '').split('.');
  if (!ts || !nonce || !sig) return false;
  const expected = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${ts}.${nonce}`)
    .digest('hex');
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Date.now() - Number(ts) < 10 * 60 * 1000;
};

const redirectToSettings = (res, params) => {
  const qs = new URLSearchParams(params).toString();
  return res.redirect(`${SETTINGS_PAGE}?${qs}`);
};

// ─────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────
export const metaLoginUrl = async (req, res) => {
  try {
    noStore(res);
    if (!meta.isMetaConfigured()) {
      return res.json({
        success: false,
        message: 'Faltam META_APP_ID / META_APP_SECRET / META_REDIRECT_URI no servidor.',
      });
    }
    if (!isSecretBoxConfigured()) {
      return res.json({
        success: false,
        message: 'Falta SOCIAL_TOKEN_ENCRYPTION_KEY no servidor (32 bytes hex).',
      });
    }
    res.json({ success: true, url: meta.buildLoginUrl(signState()) });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Redirect da Meta — sem authSeller (o browser do admin chega aqui via Facebook)
export const metaCallback = async (req, res) => {
  noStore(res);
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return redirectToSettings(res, { meta: 'error', message: errorDescription || error });
  }
  if (!verifyState(state)) {
    return redirectToSettings(res, { meta: 'error', message: 'Sessão de ligação expirada. Tente de novo.' });
  }
  if (!code) {
    return redirectToSettings(res, { meta: 'error', message: 'Código de autorização em falta.' });
  }

  try {
    const userToken = await meta.exchangeCodeForLongLivedToken(code);
    const pages = await meta.listPagesWithInstagram(userToken);

    if (pages.length === 0) {
      return redirectToSettings(res, {
        meta: 'error',
        message:
          'Nenhuma Página do Facebook com conta Instagram profissional ligada foi encontrada para este utilizador.',
      });
    }

    const settings = await SocialSettings.getSingleton();

    if (pages.length === 1) {
      await applyConnection(settings, pages[0]);
      return redirectToSettings(res, { meta: 'connected', username: pages[0].igUsername });
    }

    // Várias páginas → guardar user token temporariamente e pedir escolha
    settings.instagram.pendingUserToken = encrypt(userToken);
    settings.instagram.pendingAt = new Date();
    await settings.save();
    return redirectToSettings(res, { meta: 'select' });
  } catch (err) {
    console.error('[meta/callback]', err);
    return redirectToSettings(res, { meta: 'error', message: err.message || 'Falha na ligação' });
  }
};

const applyConnection = async (settings, page) => {
  settings.instagram.connected = true;
  settings.instagram.igUserId = page.igUserId;
  settings.instagram.username = page.igUsername;
  settings.instagram.pageId = page.pageId;
  settings.instagram.pageName = page.pageName;
  settings.instagram.accessToken = encrypt(page.pageAccessToken);
  settings.instagram.connectedAt = new Date();
  settings.instagram.lastCheckedAt = new Date();
  settings.instagram.lastError = null;
  settings.instagram.pendingUserToken = null;
  settings.instagram.pendingAt = null;
  await settings.save();
};

export const metaPages = async (req, res) => {
  try {
    noStore(res);
    const settings = await SocialSettings.findOne({ key: 'default' }).select(
      '+instagram.pendingUserToken',
    );
    const pending = settings?.instagram?.pendingUserToken;
    const fresh =
      settings?.instagram?.pendingAt &&
      Date.now() - new Date(settings.instagram.pendingAt).getTime() < 30 * 60 * 1000;
    if (!pending || !fresh) {
      return res.json({ success: false, message: 'Nenhuma ligação pendente. Inicie de novo.' });
    }
    const pages = await meta.listPagesWithInstagram(decrypt(pending));
    res.json({
      success: true,
      pages: pages.map(p => ({
        pageId: p.pageId,
        pageName: p.pageName,
        igUserId: p.igUserId,
        igUsername: p.igUsername,
        igPicture: p.igPicture,
      })),
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const metaConnect = async (req, res) => {
  try {
    noStore(res);
    const { pageId } = req.body || {};
    const settings = await SocialSettings.findOne({ key: 'default' }).select(
      '+instagram.pendingUserToken +instagram.accessToken',
    );
    const pending = settings?.instagram?.pendingUserToken;
    if (!pending) {
      return res.json({ success: false, message: 'Nenhuma ligação pendente. Inicie de novo.' });
    }
    const pages = await meta.listPagesWithInstagram(decrypt(pending));
    const page = pages.find(p => p.pageId === String(pageId));
    if (!page) return res.json({ success: false, message: 'Página não encontrada' });
    await applyConnection(settings, page);
    res.json({ success: true, message: `Ligado a @${page.igUsername}`, settings: settings.toSafeJSON() });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const metaDisconnect = async (req, res) => {
  try {
    noStore(res);
    const settings = await SocialSettings.findOne({ key: 'default' }).select(
      '+instagram.accessToken +instagram.pendingUserToken',
    );
    if (settings) {
      settings.instagram = {
        connected: false,
        igUserId: null,
        username: null,
        pageId: null,
        pageName: null,
        accessToken: null,
        connectedAt: null,
        lastCheckedAt: null,
        lastError: null,
        pendingUserToken: null,
        pendingAt: null,
      };
      await settings.save();
    }
    res.json({ success: true, message: 'Conta desligada' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const metaStatus = async (req, res) => {
  try {
    noStore(res);
    const settings = await SocialSettings.findOne({ key: 'default' }).select(
      '+instagram.accessToken',
    );
    const ig = settings?.instagram;
    const base = {
      configured: meta.isMetaConfigured(),
      encryptionConfigured: isSecretBoxConfigured(),
      connected: !!ig?.connected,
      username: ig?.username || null,
      pageName: ig?.pageName || null,
      connectedAt: ig?.connectedAt || null,
      lastError: ig?.lastError || null,
    };
    if (!ig?.connected || !ig?.accessToken) {
      return res.json({ success: true, ...base });
    }
    const token = decrypt(ig.accessToken);
    const [account, limit] = await Promise.all([
      meta.getAccountInfo(ig.igUserId, token),
      meta.getPublishingLimit(ig.igUserId, token).catch(() => null),
    ]);
    settings.instagram.lastCheckedAt = new Date();
    settings.instagram.lastError = null;
    await settings.save();
    res.json({
      success: true,
      ...base,
      account: {
        username: account.username,
        name: account.name,
        followers: account.followers_count,
        mediaCount: account.media_count,
        picture: account.profile_picture_url,
      },
      limit,
    });
  } catch (error) {
    if (error?.authProblem) {
      await SocialSettings.updateOne(
        { key: 'default' },
        { $set: { 'instagram.connected': false, 'instagram.lastError': error.message } },
      );
    }
    res.json({ success: false, message: error.message, authProblem: !!error?.authProblem });
  }
};

// ─────────────────────────────────────────────────────────────────────
// Publicar / agendar
// ─────────────────────────────────────────────────────────────────────
const populateAndReturn = async id =>
  SocialPost.findById(id)
    .populate('products', 'name sku category price offerPrice image freeShipping stock')
    .populate('coupon', 'code discountType discountValue')
    .populate('wslEvent', 'event location dates stop season')
    .lean();

export const publishNow = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const result = await advancePost(id);
    const post = await populateAndReturn(id);
    res.json({
      success: result.done || result.pending,
      done: result.done,
      pending: result.pending,
      message: result.message,
      post,
    });
  } catch (error) {
    console.error('[social/publish]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const schedulePost = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    const { scheduledAt } = req.body || {};
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const when = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(when.getTime())) {
      return res.json({ success: false, message: 'Data/hora inválida' });
    }
    if (when.getTime() < Date.now() + 60 * 1000) {
      return res.json({ success: false, message: 'Escolha um horário no futuro (mín. 1 minuto)' });
    }
    const post = await SocialPost.findById(id);
    if (!post) return res.json({ success: false, message: 'Post não encontrado' });
    if (!['approved', 'scheduled', 'failed'].includes(post.status)) {
      return res.json({ success: false, message: 'Aprove o conteúdo antes de agendar' });
    }
    const mediaError = validateMediaForType(post.type, post.media);
    if (mediaError) return res.json({ success: false, message: mediaError });

    const settings = await SocialSettings.getSingleton();
    if (!settings.instagram?.connected) {
      return res.json({ success: false, message: 'Ligue a conta Instagram antes de agendar' });
    }

    post.status = 'scheduled';
    post.scheduledAt = when;
    post.lastError = null;
    post.igContainerId = null;
    await post.save();
    res.json({ success: true, message: 'Agendado', post: await populateAndReturn(id) });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const unschedulePost = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const post = await SocialPost.findById(id);
    if (!post) return res.json({ success: false, message: 'Post não encontrado' });
    if (post.status !== 'scheduled') {
      return res.json({ success: false, message: 'Post não está agendado' });
    }
    post.status = 'approved';
    post.scheduledAt = null;
    await post.save();
    res.json({ success: true, message: 'Agendamento cancelado', post: await populateAndReturn(id) });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// Cron — Vercel envia "Authorization: Bearer <CRON_SECRET>"; um pinger
// externo (cron-job.org) pode enviar o mesmo header ou "x-cron-secret".
// ─────────────────────────────────────────────────────────────────────
export const cronPublish = async (req, res) => {
  noStore(res);
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, message: 'CRON_SECRET não configurado' });
  }
  const auth = req.headers['authorization'] || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-cron-secret'];
  if (
    !provided ||
    provided.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  ) {
    return res.status(401).json({ success: false, message: 'Não autorizado' });
  }
  try {
    const summary = await runScheduledPublishing({ limit: 5 });
    res.json({ success: true, ...summary });
  } catch (error) {
    console.error('[social/cron]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────
// Upload assinado (Cloudinary) — o browser envia o ficheiro diretamente,
// sem passar pela Vercel (limite ~4.5MB). O server só assina.
// ─────────────────────────────────────────────────────────────────────
export const signUpload = async (req, res) => {
  try {
    noStore(res);
    const { resourceType = 'video' } = req.body || {};
    if (!['video', 'image'].includes(resourceType)) {
      return res.json({ success: false, message: 'resourceType inválido' });
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.json({ success: false, message: 'Cloudinary não configurado' });
    }
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'social/instagram';
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    res.json({
      success: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Valida a URL devolvida pelo Cloudinary antes de a aceitar como media
export const registerUploadedMedia = async (req, res) => {
  try {
    noStore(res);
    const { url, kind, width, height, duration, format } = req.body || {};
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!url || !cloudName || !String(url).startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
      return res.json({ success: false, message: 'URL de media inválida' });
    }
    if (!['image', 'video'].includes(kind)) {
      return res.json({ success: false, message: 'Tipo inválido' });
    }
    // Vídeo: força MP4 (H.264) via transformação — a Meta exige MP4/MOV
    let finalUrl = String(url);
    if (kind === 'video' && String(format).toLowerCase() !== 'mp4') {
      finalUrl = finalUrl.replace('/video/upload/', '/video/upload/f_mp4,vc_h264/').replace(/\.\w+$/, '.mp4');
    }
    res.json({
      success: true,
      media: {
        url: finalUrl,
        kind,
        format: 'story',
        width: Number(width) || null,
        height: Number(height) || null,
        duration: Number(duration) || null,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
