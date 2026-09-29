// server/services/instagram/publishService.js
// ═══════════════════════════════════════════════════════════════════════
// 🚀 PUBLICAÇÃO — máquina de estados resiliente a serverless
// ═══════════════════════════════════════════════════════════════════════
// A publicação na Meta tem 3 passos e o de vídeo pode demorar mais do que
// uma função serverless aguenta. Por isso o serviço é "avançável":
// cada chamada a advancePost() faz o máximo que consegue e guarda o
// progresso no próprio SocialPost:
//
//   approved/scheduled ──claim──▶ publishing (sem container)
//   publishing ──cria container──▶ publishing (igContainerId)
//   publishing ──status FINISHED──▶ published (igMediaId, permalink)
//   publishing ──status ERROR/EXPIRED ou erro definitivo──▶ failed
//   publishing ──erro transitório──▶ publishing (retry no próximo tick)
//
// Quem chama: "Publicar agora" (front faz polling), o cron de agendados
// e o cron para posts presos em publishing.
// ═══════════════════════════════════════════════════════════════════════
import SocialPost from '../../models/SocialPost.js';
import SocialSettings from '../../models/SocialSettings.js';
import { decrypt } from '../../utils/secretBox.js';
import * as meta from './metaGraphService.js';

const MAX_ATTEMPTS = 3;
const STALE_PUBLISHING_MINUTES = 60;
// Quanto tempo esperamos, dentro de uma chamada, pelo processamento de um
// container (imagens ficam FINISHED em segundos; vídeo pode passar disto
// e fica para o próximo tick).
const POLL_BUDGET_MS = { image: 15000, video: 25000 };
const POLL_INTERVAL_MS = 3000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────
// Credenciais
// ─────────────────────────────────────────────────────────────────────
export const getCredentials = async () => {
  const settings = await SocialSettings.findOne({ key: 'default' }).select(
    '+instagram.accessToken',
  );
  if (!settings?.instagram?.connected || !settings.instagram.accessToken) {
    const err = new Error('Conta Instagram não ligada. Ligue em Instagram → Configurações.');
    err.code = 'IG_NOT_CONNECTED';
    throw err;
  }
  return {
    settings,
    igUserId: settings.instagram.igUserId,
    token: decrypt(settings.instagram.accessToken),
  };
};

// ─────────────────────────────────────────────────────────────────────
// Validação de media por formato (regras da Content Publishing API)
// ─────────────────────────────────────────────────────────────────────
export const validateMediaForType = (type, media = []) => {
  const images = media.filter(m => m.kind === 'image');
  const videos = media.filter(m => m.kind === 'video');
  switch (type) {
    case 'post':
      if (images.length !== 1 || videos.length)
        return 'Post precisa de exatamente 1 imagem.';
      return null;
    case 'carousel':
      if (media.length < 2 || media.length > 10)
        return 'Carrossel precisa de 2 a 10 itens.';
      if (images.length && videos.length)
        return 'Carrossel não pode misturar imagens e vídeos.';
      return null;
    case 'reel':
      if (videos.length !== 1) return 'Reel precisa de exatamente 1 vídeo (MP4).';
      return null;
    case 'story':
      if (media.length !== 1) return 'Story precisa de exatamente 1 imagem ou vídeo.';
      return null;
    default:
      return 'Formato desconhecido';
  }
};

const buildCaption = post => {
  const tags = (post.hashtags || []).map(h => `#${String(h).replace(/^#+/, '')}`);
  const text = [String(post.caption || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
  return text.slice(0, 2200);
};

// ─────────────────────────────────────────────────────────────────────
// Criação do container conforme o formato
// ─────────────────────────────────────────────────────────────────────
const createContainerForPost = async (post, igUserId, token) => {
  const media = post.media || [];
  const caption = buildCaption(post);

  if (post.type === 'post') {
    const r = await meta.createImageContainer(igUserId, token, {
      imageUrl: media[0].url,
      caption,
    });
    return r.id;
  }

  if (post.type === 'carousel') {
    const children = [];
    for (const m of media) {
      const r =
        m.kind === 'video'
          ? await meta.createVideoItemContainer(igUserId, token, { videoUrl: m.url })
          : await meta.createImageContainer(igUserId, token, {
              imageUrl: m.url,
              isCarouselItem: true,
            });
      children.push(r.id);
    }
    // Itens de vídeo precisam de estar FINISHED antes do container pai
    if (media.some(m => m.kind === 'video')) {
      for (const id of children) {
        await waitForContainer(id, token, POLL_BUDGET_MS.video);
      }
    }
    const parent = await meta.createCarouselContainer(igUserId, token, { children, caption });
    return parent.id;
  }

  if (post.type === 'reel') {
    const video = media.find(m => m.kind === 'video');
    const cover = media.find(m => m.kind === 'image');
    const r = await meta.createReelContainer(igUserId, token, {
      videoUrl: video.url,
      caption,
      coverUrl: cover?.url,
    });
    return r.id;
  }

  if (post.type === 'story') {
    const m = media[0];
    const r = await meta.createStoryContainer(igUserId, token, {
      imageUrl: m.kind === 'image' ? m.url : undefined,
      videoUrl: m.kind === 'video' ? m.url : undefined,
    });
    return r.id;
  }

  throw new Error('Formato não suportado');
};

// Espera até `budgetMs` pelo FINISHED. Devolve o status final observado.
const waitForContainer = async (containerId, token, budgetMs) => {
  const deadline = Date.now() + budgetMs;
  let last = await meta.getContainerStatus(containerId, token);
  while (last.statusCode === 'IN_PROGRESS' && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    last = await meta.getContainerStatus(containerId, token);
  }
  return last;
};

// ─────────────────────────────────────────────────────────────────────
// Avança um post o máximo possível dentro de uma chamada
// ─────────────────────────────────────────────────────────────────────
/**
 * @returns {{ post, done: boolean, pending: boolean, message: string }}
 */
export const advancePost = async postId => {
  let post = await SocialPost.findById(postId);
  if (!post) throw new Error('Post não encontrado');

  if (post.status === 'published') {
    return { post, done: true, pending: false, message: 'Já publicado' };
  }
  if (!['approved', 'scheduled', 'publishing'].includes(post.status)) {
    return {
      post,
      done: false,
      pending: false,
      message: `Post em estado "${post.status}" não pode ser publicado. Aprove primeiro.`,
    };
  }

  const mediaError = validateMediaForType(post.type, post.media);
  if (mediaError) {
    post.status = 'failed';
    post.lastError = mediaError;
    await post.save();
    return { post, done: false, pending: false, message: mediaError };
  }

  // Claim atómico: só um processo (front ou cron) avança o post
  if (post.status !== 'publishing') {
    const claimed = await SocialPost.findOneAndUpdate(
      { _id: post._id, status: { $in: ['approved', 'scheduled'] } },
      {
        $set: {
          status: 'publishing',
          publishingStartedAt: new Date(),
          lastError: null,
        },
      },
      { new: true },
    );
    if (!claimed) {
      post = await SocialPost.findById(postId);
      return { post, done: post.status === 'published', pending: true, message: 'Em processamento' };
    }
    post = claimed;
  }

  let creds;
  try {
    creds = await getCredentials();
  } catch (e) {
    post.status = 'failed';
    post.lastError = e.message;
    await post.save();
    return { post, done: false, pending: false, message: e.message };
  }
  const { igUserId, token, settings } = creds;

  try {
    // 1) Container
    if (!post.igContainerId) {
      const limit = await meta.getPublishingLimit(igUserId, token).catch(() => null);
      if (limit && limit.used >= limit.total) {
        post.lastError = `Limite da Meta atingido (${limit.used}/${limit.total} em ${limit.windowHours}h). Tenta mais tarde.`;
        await post.save();
        return { post, done: false, pending: true, message: post.lastError };
      }
      post.publishAttempts = (post.publishAttempts || 0) + 1;
      const containerId = await createContainerForPost(post, igUserId, token);
      post.igContainerId = containerId;
      post.lastError = null;
      await post.save();
    }

    // 2) Estado do container
    const hasVideo = (post.media || []).some(m => m.kind === 'video');
    const status = await waitForContainer(
      post.igContainerId,
      token,
      hasVideo ? POLL_BUDGET_MS.video : POLL_BUDGET_MS.image,
    );

    if (status.statusCode === 'IN_PROGRESS') {
      return {
        post,
        done: false,
        pending: true,
        message: 'A Meta ainda está a processar o vídeo. Continua automaticamente.',
      };
    }
    if (status.statusCode === 'ERROR' || status.statusCode === 'EXPIRED') {
      post.status = 'failed';
      post.lastError = `Meta rejeitou a media (${status.statusCode}${status.status ? `: ${status.status}` : ''}). Verifique formato/tamanho.`;
      post.igContainerId = null;
      await post.save();
      return { post, done: false, pending: false, message: post.lastError };
    }

    // 3) Publicar (FINISHED) — ou já PUBLISHED por uma chamada concorrente
    let mediaId = post.igMediaId;
    if (status.statusCode === 'FINISHED') {
      const r = await meta.publishContainer(igUserId, token, post.igContainerId);
      mediaId = r.id;
    }
    if (!mediaId) throw new Error('Meta não devolveu o id da publicação');

    const info = await meta.getMedia(mediaId, token).catch(() => null);
    post.status = 'published';
    post.igMediaId = mediaId;
    post.igPermalink = info?.permalink || null;
    post.publishedAt = info?.timestamp ? new Date(info.timestamp) : new Date();
    post.lastError = null;
    await post.save();

    settings.instagram.lastError = null;
    settings.instagram.lastCheckedAt = new Date();
    await settings.save();

    return { post, done: true, pending: false, message: 'Publicado no Instagram' };
  } catch (error) {
    const msg = error?.message || 'Erro ao publicar';
    const transient = !!error?.transient;
    const attemptsLeft = (post.publishAttempts || 0) < MAX_ATTEMPTS;

    if (error?.authProblem) {
      settings.instagram.connected = false;
      settings.instagram.lastError = `Token inválido: ${msg}. Ligue a conta novamente.`;
      await settings.save();
    }

    if (transient && attemptsLeft && !error?.authProblem) {
      post.lastError = `${msg} (tentará de novo)`;
      await post.save();
      return { post, done: false, pending: true, message: post.lastError };
    }

    post.status = 'failed';
    post.lastError = msg;
    // Container só é reutilizável se o erro foi depois de o criar; por
    // segurança limpamos para a próxima tentativa recriar.
    post.igContainerId = null;
    await post.save();
    return { post, done: false, pending: false, message: msg };
  }
};

// ─────────────────────────────────────────────────────────────────────
// Cron: agendados vencidos + posts presos em publishing
// ─────────────────────────────────────────────────────────────────────
export const runScheduledPublishing = async ({ limit = 5 } = {}) => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_PUBLISHING_MINUTES * 60 * 1000);

  // Posts presos há demasiado tempo → failed (evita bloqueio eterno)
  await SocialPost.updateMany(
    { status: 'publishing', publishingStartedAt: { $lt: staleBefore } },
    {
      $set: {
        status: 'failed',
        lastError: 'Publicação excedeu o tempo máximo. Tente novamente.',
        igContainerId: null,
      },
    },
  );

  const candidates = await SocialPost.find({
    $or: [
      { status: 'scheduled', scheduledAt: { $lte: now } },
      { status: 'publishing' },
    ],
  })
    .sort({ scheduledAt: 1, publishingStartedAt: 1 })
    .limit(limit)
    .select('_id');

  const results = [];
  for (const c of candidates) {
    try {
      const r = await advancePost(c._id);
      results.push({ id: String(c._id), status: r.post.status, message: r.message });
    } catch (e) {
      results.push({ id: String(c._id), status: 'error', message: e.message });
    }
  }
  return { checkedAt: now, processed: results.length, results };
};
