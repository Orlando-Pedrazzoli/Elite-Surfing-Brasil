// server/models/SocialPlan.js
// ═══════════════════════════════════════════════════════════════════════
// 🗓️ SOCIAL PLAN — plano semanal sugerido pela IA
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';

const planItemSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // dia + hora sugeridos
    type: { type: String, enum: ['post', 'carousel', 'reel', 'story'], required: true },
    goal: { type: String, enum: ['sell', 'launch', 'clearance', 'engage', 'wsl'], default: 'sell' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productName: { type: String, default: '' },
    wslEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'WslEvent', default: null },
    formula: { type: String, default: '' },
    angle: { type: String, default: '' }, // a ideia em uma frase (vira briefing)
    rationale: { type: String, default: '' }, // porquê este produto/formato/dia
    // Quando o admin clica "Criar rascunho"
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost', default: null },
  },
  { _id: false },
);

const socialPlanSchema = new mongoose.Schema(
  {
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    summary: { type: String, default: '' },
    items: { type: [planItemSchema], default: [] },
    generation: {
      model: { type: String, default: '' },
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

socialPlanSchema.index({ weekStart: -1 });

const SocialPlan = mongoose.model('SocialPlan', socialPlanSchema);
export default SocialPlan;
