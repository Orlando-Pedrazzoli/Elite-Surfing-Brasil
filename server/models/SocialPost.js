// server/models/SocialPost.js
// ═══════════════════════════════════════════════════════════════════════
// 📸 SOCIAL POST — conteúdo gerado para Instagram (post, carrossel, reel, story)
// ═══════════════════════════════════════════════════════════════════════
// Ciclo de vida (máquina de estados):
//   draft      → gerado pela IA, ainda em edição
//   approved   → admin aprovou o texto/media (Fase 1 termina aqui:
//                copia a legenda e baixa as imagens)
//   scheduled  → agendado para publicação automática (Fase 2)
//   publishing → cron pegou o post e está a falar com a Meta (Fase 2)
//   published  → publicado, igMediaId + permalink preenchidos (Fase 2)
//   failed     → erro na publicação, lastError explica (Fase 2)
//
// Tudo o que a IA gera fica guardado (variantes incluídas) para o admin
// poder voltar atrás e para termos histórico do que funciona.
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';

export const SOCIAL_POST_TYPES = ['post', 'carousel', 'reel', 'story'];
export const SOCIAL_POST_GOALS = ['sell', 'launch', 'clearance', 'engage', 'wsl'];
export const SOCIAL_POST_STATUSES = [
  'draft',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'failed',
];

// Uma variante de legenda (a IA devolve 2–3; o admin escolhe uma)
const variantSchema = new mongoose.Schema(
  {
    hook: { type: String, default: '' }, // primeiros ~125 chars
    caption: { type: String, default: '' }, // legenda completa (inclui o hook)
    cta: { type: String, default: '' },
    hashtags: { type: [String], default: [] },
    whyItWorks: { type: String, default: '' }, // justificativa curta da IA
  },
  { _id: false },
);

const slideSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    headline: { type: String, default: '' },
    body: { type: String, default: '' },
    visualNote: { type: String, default: '' }, // o que mostrar na imagem
    imageUrl: { type: String, default: null },
  },
  { _id: false },
);

const shotSchema = new mongoose.Schema(
  {
    t: { type: String, default: '' }, // ex: "0-3s"
    action: { type: String, default: '' },
    onScreenText: { type: String, default: '' },
    voiceover: { type: String, default: '' },
  },
  { _id: false },
);

const storyFrameSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    text: { type: String, default: '' },
    sticker: { type: String, default: '' }, // enquete, link, countdown, pergunta...
    visualNote: { type: String, default: '' },
    linkLabel: { type: String, default: '' },
    imageUrl: { type: String, default: null },
  },
  { _id: false },
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    kind: { type: String, enum: ['image', 'video'], default: 'image' },
    format: { type: String, default: '' }, // feed | portrait | story
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null }, // segundos (vídeo)
    sourceProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  },
  { _id: false },
);

const socialPostSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SOCIAL_POST_TYPES, required: true },
    goal: { type: String, enum: SOCIAL_POST_GOALS, default: 'sell' },

    // ─── Origem do conteúdo ────────────────────────────────────────
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    wslEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WslEvent',
      default: null,
    },
    context: { type: String, default: '', maxlength: 1000 }, // briefing livre

    // ─── Conteúdo escolhido/editado pelo admin ─────────────────────
    formula: { type: String, default: '' }, // IG1..IG10
    hook: { type: String, default: '' },
    caption: { type: String, default: '' },
    cta: { type: String, default: '' },
    hashtags: { type: [String], default: [] },

    // ─── Tudo o que a IA gerou ─────────────────────────────────────
    variants: { type: [variantSchema], default: [] },
    selectedVariant: { type: Number, default: 0 },
    slides: { type: [slideSchema], default: [] }, // carousel
    reelScript: {
      hook: { type: String, default: '' },
      durationSeconds: { type: Number, default: null },
      shots: { type: [shotSchema], default: [] },
      audioSuggestion: { type: String, default: '' },
      coverText: { type: String, default: '' },
    },
    stories: { type: [storyFrameSchema], default: [] }, // story
    mediaGuidance: { type: String, default: '' }, // dica de foto/vídeo

    // ─── Media final (URLs Cloudinary compostas ou upload) ─────────
    media: { type: [mediaSchema], default: [] },

    // ─── Rastreio de vendas ────────────────────────────────────────
    utm: {
      campaign: { type: String, default: '' },
      url: { type: String, default: '' },
    },

    // ─── Estado / publicação (Fase 2 usa os campos ig*) ────────────
    status: { type: String, enum: SOCIAL_POST_STATUSES, default: 'draft' },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    igContainerId: { type: String, default: null },
    igMediaId: { type: String, default: null },
    igPermalink: { type: String, default: null },
    lastError: { type: String, default: null },
    // Controlo do fluxo de publicação (Fase 2)
    publishAttempts: { type: Number, default: 0 },
    publishingStartedAt: { type: Date, default: null },

    // ─── Métricas (Fase 3) ─────────────────────────────────────────
    metrics: {
      reach: { type: Number, default: null },
      impressions: { type: Number, default: null },
      saves: { type: Number, default: null },
      shares: { type: Number, default: null },
      comments: { type: Number, default: null },
      likes: { type: Number, default: null },
      linkClicks: { type: Number, default: null },
      fetchedAt: { type: Date, default: null },
    },

    // ─── Telemetria da geração ─────────────────────────────────────
    generation: {
      model: { type: String, default: '' },
      promptVersion: { type: String, default: '' },
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

socialPostSchema.index({ status: 1, scheduledAt: 1 }); // cron da Fase 2
socialPostSchema.index({ createdAt: -1 });
socialPostSchema.index({ products: 1 });

const SocialPost = mongoose.model('SocialPost', socialPostSchema);
export default SocialPost;
