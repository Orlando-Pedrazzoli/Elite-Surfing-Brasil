// server/services/instagram/metaGraphService.js
// ═══════════════════════════════════════════════════════════════════════
// 📡 META GRAPH API — Instagram (via Facebook Login + Página)
// ═══════════════════════════════════════════════════════════════════════
// Cobre:
//   • OAuth: URL de login, troca de code, token long-lived, páginas + IG
//   • Conta: verificação, limite de publicação (100/24h)
//   • Publicação: containers (imagem, carrossel, reel, story), status,
//     media_publish, permalink
//   • Insights por media (Fase 3)
//
// Referência de fluxo (Content Publishing API):
//   1) POST /{ig-user-id}/media            → container (creation_id)
//   2) GET  /{container-id}?fields=status_code  (vídeo: aguardar FINISHED)
//   3) POST /{ig-user-id}/media_publish    → media id
//
// Env: META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, META_GRAPH_VERSION
// ═══════════════════════════════════════════════════════════════════════
import axios from 'axios';
import crypto from 'crypto';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const FB_DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const META_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
];

export const isMetaConfigured = () =>
  !!(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);

const requireConfig = () => {
  if (!isMetaConfigured()) {
    const err = new Error(
      'Integração Meta não configurada: faltam META_APP_ID, META_APP_SECRET ou META_REDIRECT_URI.',
    );
    err.code = 'META_NOT_CONFIGURED';
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────
// Erros — transforma a resposta da Meta em algo legível
// ─────────────────────────────────────────────────────────────────────
export class MetaApiError extends Error {
  constructor(message, { code, subcode, type, userMessage, transient = false, status } = {}) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.subcode = subcode;
    this.type = type;
    this.userMessage = userMessage;
    this.transient = transient;
    this.status = status;
  }
}

const wrapError = error => {
  const data = error?.response?.data?.error;
  const status = error?.response?.status;
  if (!data) {
    // rede / timeout → transitório
    return new MetaApiError(error?.message || 'Falha de rede ao falar com a Meta', {
      transient: true,
      status,
    });
  }
  const code = data.code;
  // 190 = token inválido/expirado; 10/200-299 = permissões; 4/17/32/613 = rate limit
  const transient = [1, 2, 4, 17, 32, 613].includes(code) || (status >= 500 && status < 600);
  const authProblem = code === 190 || code === 102;
  const msg = data.error_user_msg || data.message || 'Erro da API da Meta';
  const err = new MetaApiError(msg, {
    code,
    subcode: data.error_subcode,
    type: data.type,
    userMessage: data.error_user_msg,
    transient,
    status,
  });
  err.authProblem = authProblem;
  return err;
};

const get = async (path, params = {}) => {
  try {
    const { data } = await axios.get(`${GRAPH}${path}`, { params, timeout: 25000 });
    return data;
  } catch (e) {
    throw wrapError(e);
  }
};

const post = async (path, params = {}) => {
  try {
    const { data } = await axios.post(`${GRAPH}${path}`, null, { params, timeout: 25000 });
    return data;
  } catch (e) {
    throw wrapError(e);
  }
};

// appsecret_proof protege as chamadas server-side (recomendado pela Meta)
const proof = token =>
  crypto.createHmac('sha256', process.env.META_APP_SECRET).update(token).digest('hex');

const withAuth = (token, params = {}) => ({
  ...params,
  access_token: token,
  appsecret_proof: proof(token),
});

// ─────────────────────────────────────────────────────────────────────
// OAuth
// ─────────────────────────────────────────────────────────────────────
export const buildLoginUrl = state => {
  requireConfig();
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    state,
    scope: META_SCOPES.join(','),
    response_type: 'code',
  });
  return `${FB_DIALOG}?${params.toString()}`;
};

export const exchangeCodeForLongLivedToken = async code => {
  requireConfig();
  const short = await get('/oauth/access_token', {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    code,
  });
  const long = await get('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return long.access_token; // ~60 dias; os tokens de Página derivados não expiram
};

/**
 * Páginas do utilizador com conta Instagram profissional ligada.
 * O `access_token` de cada página (derivado de um user token long-lived)
 * é o que guardamos: não expira enquanto o utilizador mantiver o acesso.
 */
export const listPagesWithInstagram = async userToken => {
  const data = await get(
    '/me/accounts',
    withAuth(userToken, {
      fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
      limit: 50,
    }),
  );
  return (data.data || [])
    .filter(p => p.instagram_business_account?.id)
    .map(p => ({
      pageId: p.id,
      pageName: p.name,
      pageAccessToken: p.access_token,
      igUserId: p.instagram_business_account.id,
      igUsername: p.instagram_business_account.username,
      igPicture: p.instagram_business_account.profile_picture_url || null,
    }));
};

// ─────────────────────────────────────────────────────────────────────
// Conta
// ─────────────────────────────────────────────────────────────────────
export const getAccountInfo = async (igUserId, token) =>
  get(
    `/${igUserId}`,
    withAuth(token, { fields: 'id,username,name,followers_count,media_count,profile_picture_url' }),
  );

export const getPublishingLimit = async (igUserId, token) => {
  const data = await get(
    `/${igUserId}/content_publishing_limit`,
    withAuth(token, { fields: 'quota_usage,config' }),
  );
  const item = data.data?.[0] || {};
  return {
    used: item.quota_usage ?? 0,
    total: item.config?.quota_total ?? 100,
    windowHours: (item.config?.quota_duration ?? 86400) / 3600,
  };
};

// ─────────────────────────────────────────────────────────────────────
// Publicação — containers
// ─────────────────────────────────────────────────────────────────────
export const createImageContainer = (igUserId, token, { imageUrl, caption, isCarouselItem = false }) =>
  post(
    `/${igUserId}/media`,
    withAuth(token, {
      image_url: imageUrl,
      ...(isCarouselItem ? { is_carousel_item: 'true' } : { caption: caption || '' }),
    }),
  );

export const createVideoItemContainer = (igUserId, token, { videoUrl }) =>
  post(
    `/${igUserId}/media`,
    withAuth(token, { media_type: 'VIDEO', video_url: videoUrl, is_carousel_item: 'true' }),
  );

export const createCarouselContainer = (igUserId, token, { children, caption }) =>
  post(
    `/${igUserId}/media`,
    withAuth(token, {
      media_type: 'CAROUSEL',
      children: children.join(','),
      caption: caption || '',
    }),
  );

export const createReelContainer = (igUserId, token, { videoUrl, caption, coverUrl, shareToFeed = true }) =>
  post(
    `/${igUserId}/media`,
    withAuth(token, {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption || '',
      share_to_feed: shareToFeed ? 'true' : 'false',
      ...(coverUrl ? { cover_url: coverUrl } : {}),
    }),
  );

export const createStoryContainer = (igUserId, token, { imageUrl, videoUrl }) =>
  post(
    `/${igUserId}/media`,
    withAuth(token, {
      media_type: 'STORIES',
      ...(videoUrl ? { video_url: videoUrl } : { image_url: imageUrl }),
    }),
  );

/** status_code: EXPIRED | ERROR | FINISHED | IN_PROGRESS | PUBLISHED */
export const getContainerStatus = async (containerId, token) => {
  const data = await get(`/${containerId}`, withAuth(token, { fields: 'status_code,status' }));
  return { statusCode: data.status_code, status: data.status || '' };
};

export const publishContainer = (igUserId, token, creationId) =>
  post(`/${igUserId}/media_publish`, withAuth(token, { creation_id: creationId }));

export const getMedia = (mediaId, token) =>
  get(`/${mediaId}`, withAuth(token, { fields: 'id,permalink,timestamp,media_type,media_product_type' }));

// ─────────────────────────────────────────────────────────────────────
// Insights (Fase 3) — métricas variam por tipo de media
// ─────────────────────────────────────────────────────────────────────
export const getMediaInsights = async (mediaId, token, mediaProductType = 'FEED') => {
  const metrics =
    mediaProductType === 'REELS'
      ? 'reach,saved,shares,comments,likes,plays,total_interactions'
      : mediaProductType === 'STORY'
        ? 'reach,impressions,replies,shares'
        : 'reach,impressions,saved,shares,comments,likes,total_interactions';
  const data = await get(`/${mediaId}/insights`, withAuth(token, { metric: metrics }));
  const out = {};
  (data.data || []).forEach(m => {
    out[m.name] = m.values?.[0]?.value ?? null;
  });
  return out;
};
