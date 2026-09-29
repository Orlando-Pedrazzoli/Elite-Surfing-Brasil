// server/models/SocialSettings.js
// ═══════════════════════════════════════════════════════════════════════
// ⚙️ SOCIAL SETTINGS — singleton com a voz da marca e a ligação ao Instagram
// ═══════════════════════════════════════════════════════════════════════
// • brandVoice alimenta TODOS os prompts do gerador (tom, pilares, público,
//   palavras proibidas, nível de emoji, estilo de CTA, hashtags base).
// • instagram guarda a ligação à Meta (Fase 2). O accessToken NUNCA sai
//   da API: `select: false` + método toSafeJSON().
// • Existe sempre exatamente um documento — usar SocialSettings.getSingleton().
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';

export const EMOJI_LEVELS = ['none', 'low', 'medium'];
export const CTA_STYLES = ['direct', 'soft', 'question'];

const socialSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },

    brandVoice: {
      // Como a marca fala — frase curta, ex: "Direto, de surfista para surfista"
      tone: {
        type: String,
        default:
          'Direto e próximo, de surfista para surfista. Confiante sem ser arrogante. Zero jargão corporativo.',
        maxlength: 400,
      },
      // Pilares de conteúdo (temas recorrentes)
      pillars: {
        type: [String],
        default: [
          'Produto em uso no mar',
          'Dica técnica (leash, deck, quilha, capa)',
          'Bastidores da marca',
          'Circuito WSL e cultura do surf',
        ],
      },
      audience: {
        type: String,
        default:
          'Surfistas brasileiros, iniciantes a avançados, 18–45 anos, que compram acessórios online e valorizam durabilidade e preço justo.',
        maxlength: 500,
      },
      bannedWords: {
        type: [String],
        default: ['imperdível', 'incrível', 'revolucionário', 'elevar', 'mergulhe'],
      },
      emojiLevel: { type: String, enum: EMOJI_LEVELS, default: 'low' },
      ctaStyle: { type: String, enum: CTA_STYLES, default: 'direct' },
      // Hashtags de marca sempre elegíveis (a IA escolhe 1–2 destas + nicho)
      baseHashtags: {
        type: [String],
        default: ['elitesurfing', 'surfbrasil', 'acessoriosdesurf'],
      },
      // Assinatura/handle
      handle: { type: String, default: '@elitesurfing' },
    },

    defaults: {
      timezone: { type: String, default: 'America/Sao_Paulo' },
      // Horários sugeridos (HH:mm) — usados pelo agendamento na Fase 2
      postingTimes: { type: [String], default: ['08:00', '12:30', '19:00'] },
      variantCount: { type: Number, default: 3, min: 1, max: 3 },
    },

    // ─── Ligação Meta / Instagram (Fase 2) ───────────────────────
    instagram: {
      connected: { type: Boolean, default: false },
      igUserId: { type: String, default: null },
      username: { type: String, default: null },
      pageId: { type: String, default: null },
      pageName: { type: String, default: null },
      accessToken: { type: String, default: null, select: false }, // encriptado
      connectedAt: { type: Date, default: null },
      lastCheckedAt: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

// Sempre o mesmo documento
socialSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({ key: 'default' });
  }
  return doc;
};

// Nunca expor o token, mesmo que alguém faça select('+accessToken')
socialSettingsSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  if (obj.instagram) {
    obj.instagram.hasToken = !!obj.instagram.accessToken;
    delete obj.instagram.accessToken;
  }
  return obj;
};

const SocialSettings = mongoose.model('SocialSettings', socialSettingsSchema);
export default SocialSettings;
