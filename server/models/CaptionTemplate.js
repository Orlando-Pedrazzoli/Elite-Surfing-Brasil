// server/models/CaptionTemplate.js
// ═══════════════════════════════════════════════════════════════════════
// ✍️ CAPTION TEMPLATE — legendas pré-definidas pelo admin
// ═══════════════════════════════════════════════════════════════════════
// Biblioteca de legendas aprovadas, por coleção (decks, leashes, ...).
// Têm dois papéis no Estúdio:
//   1. Criar um post diretamente com a legenda (sem IA) — o admin escolhe
//      o ângulo, o produto, e vai direto para o editor.
//   2. Servir de referência de tom para a IA: as legendas ativas da
//      coleção do produto entram no prompt como exemplos aprovados.
//
// Placeholders aceites na legenda: {produto} (nome), {preco}, {link}
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';

export const CAPTION_ANGLES = ['performance', 'design', 'lifestyle', 'sell', 'launch', 'education', 'other'];

export const CAPTION_ANGLE_LABELS = {
  performance: 'Performance e controle',
  design: 'Design e estilo',
  lifestyle: 'Lifestyle',
  sell: 'Produto e venda',
  launch: 'Lançamento',
  education: 'Educativo',
  other: 'Outro',
};

const captionTemplateSchema = new mongoose.Schema(
  {
    // Coleção a que se aplica (product.group). 'all' = qualquer produto.
    group: { type: String, required: true, default: 'all', index: true },
    angle: { type: String, enum: CAPTION_ANGLES, default: 'other' },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Quando usar (mostrado ao admin no seletor)
    usage: { type: String, default: '', maxlength: 300 },
    caption: { type: String, required: true, maxlength: 2200 },
    // Hashtags de nicho (sem #). O bloco fixo da marca é acrescentado
    // pelo hashtagPolicy na criação/publicação.
    hashtags: { type: [String], default: [] },
    // Formatos/objetivos onde encaixa melhor (só sugestão na UI)
    suggestedTypes: { type: [String], default: [] },
    suggestedGoals: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

captionTemplateSchema.index({ group: 1, isActive: 1, order: 1 });

const CaptionTemplate =
  mongoose.models.CaptionTemplate || mongoose.model('CaptionTemplate', captionTemplateSchema);

export default CaptionTemplate;
