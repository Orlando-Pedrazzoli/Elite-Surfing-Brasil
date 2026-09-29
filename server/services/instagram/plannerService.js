// server/services/instagram/plannerService.js
// ═══════════════════════════════════════════════════════════════════════
// 🗓️ PLANEJADOR SEMANAL — a IA monta 3–5 conteúdos para a semana
// ═══════════════════════════════════════════════════════════════════════
// Entrada (calculada aqui, não pela IA):
//   • candidatos a produto com PONTUAÇÃO = margem boa + estoque alto +
//     sem post recente (+ frete grátis, + desconto real)
//   • eventos WSL da semana
//   • horários sugeridos e mix de formatos
//   • dicas de desempenho recente (analyticsService)
// Saída: SocialPlan com itens; cada item vira rascunho no Estúdio com
// um clique (postFactory.createGeneratedPost).
// ═══════════════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import Product from '../../models/Product.js';
import WslEvent from '../../models/WslEvent.js';
import SocialPost from '../../models/SocialPost.js';
import SocialPlan from '../../models/SocialPlan.js';
import SocialSettings from '../../models/SocialSettings.js';
import { getPerformanceHints } from './analyticsService.js';
import { HOOK_FORMULAS, ALGORITHM } from '../../prompts/instagram/knowledge.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const DAY = 24 * 60 * 60 * 1000;

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ─────────────────────────────────────────────────────────────────────
// Pontuação de produtos — o que vale a pena empurrar esta semana
// ─────────────────────────────────────────────────────────────────────
export const scoreProducts = async ({ limit = 12 } = {}) => {
  const products = await Product.find({ inStock: { $ne: false }, isMainVariant: { $ne: false } })
    .select('+costPrice name sku category group price offerPrice stock freeShipping tags image productFamily')
    .lean();

  // Último post por produto (para não repetir)
  const recent = await SocialPost.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 45 * DAY) }, status: { $ne: 'failed' } } },
    { $unwind: '$products' },
    { $group: { _id: '$products', last: { $max: '$createdAt' }, n: { $sum: 1 } } },
  ]);
  const recentMap = new Map(recent.map(r => [String(r._id), r]));

  const scored = products
    .map(p => {
      const cost = p.costPrice;
      const margin =
        cost !== null && cost !== undefined && p.offerPrice > 0
          ? ((p.offerPrice - cost) / p.offerPrice) * 100
          : null;
      const stock = Number(p.stock) || 0;
      const r = recentMap.get(String(p._id));
      const daysSincePost = r ? (Date.now() - new Date(r.last).getTime()) / DAY : 999;
      const discountPct = p.price > p.offerPrice ? Math.round((1 - p.offerPrice / p.price) * 100) : 0;

      let score = 0;
      if (margin !== null) score += Math.min(40, Math.max(0, margin)); // até 40 pts
      else score += 10; // sem custo cadastrado: neutro
      score += Math.min(25, stock * 2); // estoque até 25 pts
      score += Math.min(20, daysSincePost / 2); // frescura até 20 pts
      if (p.freeShipping) score += 5;
      if (discountPct >= 10) score += 5;
      if (stock === 0) score = -1; // esgotado não entra

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku || '',
        category: p.category,
        group: p.group || '',
        offerPrice: p.offerPrice,
        price: p.price,
        discountPct,
        stock,
        freeShipping: !!p.freeShipping,
        marginPct: margin === null ? null : round2(margin),
        daysSincePost: r ? Math.round(daysSincePost) : null,
        score: round2(score),
      };
    })
    .filter(p => p.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
};

// ─────────────────────────────────────────────────────────────────────
// Semana alvo (segunda a domingo) a partir de uma data
// ─────────────────────────────────────────────────────────────────────
export const weekBoundsFor = (dateLike = new Date()) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // segunda = 0
  const start = new Date(d.getTime() - dow * DAY);
  const end = new Date(start.getTime() + 7 * DAY - 1);
  return { start, end };
};

// ─────────────────────────────────────────────────────────────────────
// Tool de saída
// ─────────────────────────────────────────────────────────────────────
const PLAN_TOOL = {
  name: 'entregar_plano_semanal',
  description: 'Plano de conteúdo da semana para o Instagram da Elite Surfing.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'items'],
    properties: {
      summary: { type: 'string', description: 'Estratégia da semana em 2–3 frases.' },
      items: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dayOffset', 'time', 'type', 'goal', 'productId', 'wslEventId', 'formula', 'angle', 'rationale'],
          properties: {
            dayOffset: { type: 'integer', minimum: 0, maximum: 6, description: '0 = segunda … 6 = domingo' },
            time: { type: 'string', description: 'HH:mm, escolhido entre os horários sugeridos' },
            type: { type: 'string', enum: ['post', 'carousel', 'reel', 'story'] },
            goal: { type: 'string', enum: ['sell', 'launch', 'clearance', 'engage', 'wsl'] },
            productId: { type: 'string', description: 'id do produto da lista, ou "" se for conteúdo de marca/WSL' },
            wslEventId: { type: 'string', description: 'id do evento WSL, ou ""' },
            formula: { type: 'string', description: 'IG1..IG10 ou STORY' },
            angle: { type: 'string', description: 'A ideia do conteúdo em 1–2 frases (vira o briefing da geração).' },
            rationale: { type: 'string', description: 'Porquê este produto/formato/dia, em 1 frase.' },
          },
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────
// Gera e guarda o plano
// ─────────────────────────────────────────────────────────────────────
export const generateWeekPlan = async ({ weekStart, postsPerWeek = 4 } = {}) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY não configurada no servidor.');
    err.status = 503;
    throw err;
  }
  const settings = await SocialSettings.getSingleton();
  const { start, end } = weekBoundsFor(weekStart || new Date(Date.now() + DAY));

  const [candidates, wsl, hints] = await Promise.all([
    scoreProducts({ limit: 12 }),
    WslEvent.find({ status: { $in: ['upcoming', 'live'] } }).sort({ season: -1, stop: 1 }).limit(8).lean(),
    getPerformanceHints().catch(() => ''),
  ]);

  if (candidates.length === 0) {
    throw new Error('Nenhum produto publicado com estoque para planejar.');
  }

  const voice = settings.brandVoice || {};
  const times = settings.defaults?.postingTimes?.length ? settings.defaults.postingTimes : ['08:00', '12:30', '19:00'];
  const n = Math.min(6, Math.max(3, parseInt(postsPerWeek) || 4));

  const system = `Você é o estrategista de Instagram da Elite Surfing (acessórios de surf, Brasil).
Monte o plano da semana com ${n} conteúdos, escolhendo produto, formato, objetivo, fórmula de gancho, dia e horário.

Regras:
- Mix de formatos: pelo menos 1 carrossel e 1 reel na semana; stories no máximo 1 (não alcançam não seguidores).
- Priorize produtos com pontuação alta (margem + estoque + sem post recente). Não repita o mesmo produto na semana.
- Se houver evento WSL na semana, um conteúdo pode ligar o evento a um produto (objetivo "wsl").
- Distribua pelos dias (sem dois no mesmo dia), nos horários sugeridos: ${times.join(', ')}.
- Objetivo "clearance" só para produto com desconto real ou estoque alto e margem baixa.
- angle tem de ser concreto e específico ao produto (não "mostrar o produto").
- Voz da marca: ${voice.tone || 'direto, de surfista para surfista'}. Pilares: ${(voice.pillars || []).join(' · ')}.

${HOOK_FORMULAS}

${ALGORITHM}

${hints}

Responda APENAS pela ferramenta entregar_plano_semanal.`;

  const user = `# Semana
${start.toLocaleDateString('pt-BR')} (segunda) a ${new Date(end).toLocaleDateString('pt-BR')} (domingo)

# Produtos candidatos (ordenados por pontuação)
${candidates
  .map(
    p =>
      `- id=${p._id} · ${p.name} · ${p.category} · R$ ${p.offerPrice.toFixed(2)}${p.discountPct ? ` (−${p.discountPct}%)` : ''} · estoque ${p.stock}${p.marginPct !== null ? ` · margem ${p.marginPct}%` : ' · margem desconhecida'}${p.freeShipping ? ' · frete grátis' : ''}${p.daysSincePost !== null ? ` · último post há ${p.daysSincePost} dias` : ' · nunca postado'} · score ${p.score}`,
  )
  .join('\n')}

# Eventos WSL
${wsl.length ? wsl.map(e => `- id=${e._id} · Etapa ${e.stop} ${e.event} (${e.location}) · ${e.dates} · ${e.status}`).join('\n') : '- nenhum'}`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    temperature: 0.7,
    system,
    tools: [PLAN_TOOL],
    tool_choice: { type: 'tool', name: PLAN_TOOL.name },
    messages: [{ role: 'user', content: user }],
  });
  const block = response.content.find(b => b.type === 'tool_use' && b.name === PLAN_TOOL.name);
  if (!block) throw new Error('A IA não devolveu um plano estruturado.');

  const candidateMap = new Map(candidates.map(c => [String(c._id), c]));
  const wslIds = new Set(wsl.map(e => String(e._id)));

  const items = (block.input.items || [])
    .map(it => {
      const [h, m] = String(it.time || times[0]).split(':').map(Number);
      const date = new Date(start.getTime() + (Number(it.dayOffset) || 0) * DAY);
      date.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);
      const prod = candidateMap.get(String(it.productId || ''));
      return {
        date,
        type: it.type,
        goal: it.goal,
        product: prod ? prod._id : null,
        productName: prod ? prod.name : '',
        wslEvent: wslIds.has(String(it.wslEventId || '')) ? it.wslEventId : null,
        formula: String(it.formula || ''),
        angle: String(it.angle || ''),
        rationale: String(it.rationale || ''),
        post: null,
      };
    })
    .filter(it => it.product || it.wslEvent || it.angle)
    .sort((a, b) => a.date - b.date);

  const plan = await SocialPlan.create({
    weekStart: start,
    weekEnd: end,
    summary: String(block.input.summary || ''),
    items,
    generation: {
      model: MODEL,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  });

  return plan.toObject();
};
