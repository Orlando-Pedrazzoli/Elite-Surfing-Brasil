// server/prompts/instagram/index.js
// ═══════════════════════════════════════════════════════════════════════
// 🧠 MONTAGEM DOS PROMPTS + SCHEMA DE SAÍDA (tool-use)
// ═══════════════════════════════════════════════════════════════════════
// • buildSystemPrompt(settings, type, goal) → system prompt completo
// • buildUserPrompt(input)                 → briefing com dados reais
// • OUTPUT_TOOL                            → schema JSON que a IA preenche
//
// Usamos tool-use com tool_choice forçado: a resposta chega como JSON
// validado pelo schema, sem markdown, sem "Aqui está a sua legenda:".
// ═══════════════════════════════════════════════════════════════════════
import { HOOK_FORMULAS, ALGORITHM, HASHTAGS, HUMANIZER } from './knowledge.js';
import { FORMAT_INSTRUCTIONS, GOAL_INSTRUCTIONS } from './formats.js';

// Subir quando o conteúdo dos prompts muda de forma relevante
export const PROMPT_VERSION = 'ig-v1.0';

const formatBRL = value =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
    // toLocaleString usa espaço inseparável (U+00A0); normalizar para espaço
    .replace(/\u00a0/g, ' ');

// ─────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────
export const buildSystemPrompt = (settings, type, goal) => {
  const voice = settings?.brandVoice || {};
  const emojiLevel = voice.emojiLevel || 'low';
  const ctaStyle = voice.ctaStyle || 'direct';

  const ctaStyleText = {
    direct: 'CTA direto e imperativo ("salva", "manda", "link na bio").',
    soft: 'CTA suave, convidativo, sem imperativo seco.',
    question: 'CTA em forma de pergunta real que puxa resposta nos comentários.',
  }[ctaStyle];

  return `Você é o redator de Instagram da Elite Surfing, loja brasileira de
acessórios de surf (leashes, decks, capas, sarcófagos, quilhas, bodyboard, SUP
e acessórios) que vende online em elitesurfing.com.br. Escreve em português do
Brasil, para surfistas, e cada conteúdo tem de ser publicável sem edição.

# Voz da marca
- Tom: ${voice.tone || 'direto, de surfista para surfista'}
- Handle: ${voice.handle || '@elitesurfing'}
- Público: ${voice.audience || 'surfistas brasileiros que compram acessórios online'}
- Pilares de conteúdo: ${(voice.pillars || []).join(' · ') || '—'}
- Palavras proibidas (nunca usar): ${(voice.bannedWords || []).join(', ') || '—'}
- Nível de emoji: ${emojiLevel}
- Estilo de CTA: ${ctaStyleText}
- Hashtags de marca elegíveis (usar 1–2 como vaga de nicho): ${(voice.baseHashtags || []).map(h => `#${h}`).join(' ') || '—'}

${HOOK_FORMULAS}

${ALGORITHM}

${HASHTAGS}

${HUMANIZER}

${FORMAT_INSTRUCTIONS[type] || FORMAT_INSTRUCTIONS.post}

${GOAL_INSTRUCTIONS[goal] || GOAL_INSTRUCTIONS.sell}

# Regras finais
- Usar SOMENTE os dados fornecidos no briefing (nome, preço, características,
  cupom, evento). Nada de inventar materiais, garantias, números ou prazos.
- Cada variante tem de usar uma fórmula/ângulo DIFERENTE das outras, para o
  admin ter escolha real (não três versões da mesma frase).
- whyItWorks: uma frase explicando a escolha da fórmula e o sinal que ela mira.
- Responder APENAS através da ferramenta entregar_conteudo_instagram.`;
};

// ─────────────────────────────────────────────────────────────────────
// USER PROMPT (briefing com dados reais)
// ─────────────────────────────────────────────────────────────────────
const describeProduct = p => {
  const lines = [];
  lines.push(`• Nome: ${p.name}`);
  if (p.sku) lines.push(`  SKU: ${p.sku}`);
  lines.push(`  Categoria: ${p.category}${p.group ? ` (grupo ${p.group})` : ''}`);
  if (p.color) lines.push(`  Cor: ${p.color}`);
  if (p.size) lines.push(`  Tamanho: ${p.size}`);
  const hasDiscount = Number(p.offerPrice) < Number(p.price);
  lines.push(
    `  Preço de venda: ${formatBRL(p.offerPrice)}${
      hasDiscount
        ? ` (de ${formatBRL(p.price)} — desconto real de ${Math.round(
            (1 - p.offerPrice / p.price) * 100,
          )}%)`
        : ''
    }`,
  );
  if (p.freeShipping) lines.push('  Frete grátis: sim');
  if (typeof p.stock === 'number') {
    lines.push(
      `  Estoque: ${p.stock} unidade(s)${p.stock <= 5 ? ' (baixo — pode citar escassez real)' : ''}`,
    );
  }
  if (Array.isArray(p.tags) && p.tags.length) {
    lines.push(`  Tags: ${p.tags.join(', ')}`);
  }
  if (p.filters && typeof p.filters === 'object') {
    const entries = Object.entries(p.filters).filter(([, v]) => v);
    if (entries.length) {
      lines.push(
        `  Atributos: ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`,
      );
    }
  }
  if (Array.isArray(p.description) && p.description.length) {
    lines.push('  Especificações:');
    p.description.slice(0, 12).forEach(d => lines.push(`    - ${d}`));
  }
  if (p.url) lines.push(`  Link: ${p.url}`);
  return lines.join('\n');
};

const describeCoupon = c => {
  if (!c) return '';
  const value =
    c.discountType === 'percentage'
      ? `${c.discountValue}%${c.maxDiscount ? ` (teto ${formatBRL(c.maxDiscount)})` : ''}`
      : formatBRL(c.discountValue);
  const parts = [`• Código: ${c.code}`, `  Desconto: ${value}`];
  if (c.minOrderValue > 0) parts.push(`  Pedido mínimo: ${formatBRL(c.minOrderValue)}`);
  if (c.expiresAt)
    parts.push(
      `  Válido até: ${new Date(c.expiresAt).toLocaleDateString('pt-BR')}`,
    );
  if (c.firstOrderOnly) parts.push('  Apenas primeira compra');
  if (c.description) parts.push(`  Descrição interna: ${c.description}`);
  return parts.join('\n');
};

const describeWsl = e => {
  if (!e) return '';
  const parts = [
    `• Etapa ${e.stop} — ${e.event} (${e.location})`,
    `  Datas: ${e.dates} · Temporada ${e.season} · Tour ${e.tour}`,
    `  Status: ${e.status}`,
  ];
  if (e.winner) parts.push(`  Vencedor: ${e.winner}`);
  if (e.note) parts.push(`  Nota: ${e.note}`);
  return parts.join('\n');
};

const TYPE_LABEL = {
  post: 'post único',
  carousel: 'carrossel',
  reel: 'reel',
  story: 'sequência de stories',
};

export const buildUserPrompt = ({
  type,
  goal,
  products = [],
  coupon = null,
  wslEvent = null,
  context = '',
  variantCount = 3,
}) => {
  const sections = [];

  sections.push(
    `Crie um ${TYPE_LABEL[type] || 'post'} para o Instagram da Elite Surfing com objetivo "${goal}". Gere ${variantCount} variante(s) de legenda com ângulos diferentes.`,
  );

  if (products.length) {
    sections.push(`# Produto(s)\n${products.map(describeProduct).join('\n\n')}`);
  } else {
    sections.push('# Produto(s)\nNenhum produto específico — conteúdo de marca/tema.');
  }

  if (coupon) sections.push(`# Cupom ativo\n${describeCoupon(coupon)}`);
  if (wslEvent) sections.push(`# Evento WSL\n${describeWsl(wslEvent)}`);
  if (context && context.trim()) {
    sections.push(`# Briefing do admin\n${context.trim()}`);
  }

  return sections.join('\n\n');
};

// ─────────────────────────────────────────────────────────────────────
// TOOL DE SAÍDA — schema único para todos os formatos
// ─────────────────────────────────────────────────────────────────────
export const OUTPUT_TOOL = {
  name: 'entregar_conteudo_instagram',
  description:
    'Entrega o conteúdo final do Instagram, estruturado. Preencher apenas as secções pedidas pelo formato; as restantes ficam como arrays vazios.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['formula', 'variants', 'slides', 'reelScript', 'stories', 'mediaGuidance'],
    properties: {
      formula: {
        type: 'string',
        description: 'Código da fórmula principal usada (IG1..IG10 ou STORY).',
      },
      variants: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['hook', 'caption', 'cta', 'hashtags', 'whyItWorks'],
          properties: {
            hook: {
              type: 'string',
              description: 'Primeiros ~125 caracteres da legenda. Faz sentido sozinho.',
            },
            caption: {
              type: 'string',
              description: 'Legenda completa (começa com o hook). Sem hashtags.',
            },
            cta: { type: 'string', description: 'O CTA usado na legenda.' },
            hashtags: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string' },
              description: '3–5 hashtags sem "#", minúsculas, sem acento.',
            },
            whyItWorks: { type: 'string' },
          },
        },
      },
      slides: {
        type: 'array',
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['order', 'headline', 'body', 'visualNote'],
          properties: {
            order: { type: 'integer', minimum: 1 },
            headline: { type: 'string' },
            body: { type: 'string' },
            visualNote: { type: 'string' },
          },
        },
      },
      reelScript: {
        type: 'object',
        additionalProperties: false,
        required: ['hook', 'durationSeconds', 'shots', 'audioSuggestion', 'coverText'],
        properties: {
          hook: { type: 'string' },
          durationSeconds: { type: 'integer', minimum: 0 },
          shots: {
            type: 'array',
            maxItems: 10,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['t', 'action', 'onScreenText', 'voiceover'],
              properties: {
                t: { type: 'string' },
                action: { type: 'string' },
                onScreenText: { type: 'string' },
                voiceover: { type: 'string' },
              },
            },
          },
          audioSuggestion: { type: 'string' },
          coverText: { type: 'string' },
        },
      },
      stories: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['order', 'text', 'sticker', 'visualNote', 'linkLabel'],
          properties: {
            order: { type: 'integer', minimum: 1 },
            text: { type: 'string' },
            sticker: {
              type: 'string',
              enum: ['enquete', 'pergunta', 'quiz', 'slider', 'link', 'countdown', 'nenhum'],
            },
            visualNote: { type: 'string' },
            linkLabel: { type: 'string' },
          },
        },
      },
      mediaGuidance: {
        type: 'string',
        description: 'Uma frase sobre a foto/vídeo ideal para este conteúdo.',
      },
    },
  },
};
