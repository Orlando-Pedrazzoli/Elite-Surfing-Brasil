// server/services/instagram/contentGenerator.js
// ═══════════════════════════════════════════════════════════════════════
// 🤖 GERADOR DE CONTEÚDO — Claude API (Anthropic)
// ═══════════════════════════════════════════════════════════════════════
// • generateContent(input, settings) → JSON estruturado (tool-use forçado)
// • rewriteText(text, mode, settings) → reescrita rápida (humanizar,
//   encurtar, mudar tom) com o modelo económico
//
// Modelos por env (com defaults):
//   ANTHROPIC_MODEL       → geração principal (default: claude-sonnet-5-5)
//   ANTHROPIC_MODEL_FAST  → reescritas (default: claude-haiku-4-5-20251001)
//
// A chave ANTHROPIC_API_KEY é lida pelo SDK automaticamente.
// ═══════════════════════════════════════════════════════════════════════
import Anthropic from '@anthropic-ai/sdk';
import {
  buildSystemPrompt,
  buildUserPrompt,
  OUTPUT_TOOL,
  PROMPT_VERSION,
} from '../../prompts/instagram/index.js';
import { HUMANIZER } from '../../prompts/instagram/knowledge.js';

const MODEL_MAIN = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001';

let client = null;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error(
      'ANTHROPIC_API_KEY não configurada no servidor. Adicione a variável de ambiente na Vercel.',
    );
    err.code = 'NO_API_KEY';
    throw err;
  }
  if (!client) client = new Anthropic();
  return client;
};

export const isGeneratorConfigured = () => !!process.env.ANTHROPIC_API_KEY;
export const getModelInfo = () => ({
  main: MODEL_MAIN,
  fast: MODEL_FAST,
  promptVersion: PROMPT_VERSION,
});

// ─────────────────────────────────────────────────────────────────────
// Normalização da saída — a IA é boa, mas o front merece dados limpos
// ─────────────────────────────────────────────────────────────────────
const cleanHashtag = tag =>
  String(tag || '')
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase();

const normalizeOutput = raw => {
  const variants = (raw.variants || []).map(v => {
    const caption = String(v.caption || '').trim();
    let hook = String(v.hook || '').trim();
    // Se a IA não deu hook, usa o início da legenda
    if (!hook) hook = caption.slice(0, 125);
    const hashtags = [...new Set((v.hashtags || []).map(cleanHashtag))]
      .filter(Boolean)
      .slice(0, 5);
    return {
      hook,
      caption,
      cta: String(v.cta || '').trim(),
      hashtags,
      whyItWorks: String(v.whyItWorks || '').trim(),
      hookLength: hook.length,
      hookOverLimit: hook.length > 125,
      captionLength: caption.length,
    };
  });

  const slides = (raw.slides || [])
    .map((s, i) => ({
      order: Number(s.order) || i + 1,
      headline: String(s.headline || '').trim(),
      body: String(s.body || '').trim(),
      visualNote: String(s.visualNote || '').trim(),
    }))
    .sort((a, b) => a.order - b.order);

  const stories = (raw.stories || [])
    .map((s, i) => ({
      order: Number(s.order) || i + 1,
      text: String(s.text || '').trim(),
      sticker: s.sticker || 'nenhum',
      visualNote: String(s.visualNote || '').trim(),
      linkLabel: String(s.linkLabel || '').trim(),
    }))
    .sort((a, b) => a.order - b.order);

  const rs = raw.reelScript || {};
  const reelScript = {
    hook: String(rs.hook || '').trim(),
    durationSeconds: Number(rs.durationSeconds) || null,
    shots: (rs.shots || []).map(sh => ({
      t: String(sh.t || '').trim(),
      action: String(sh.action || '').trim(),
      onScreenText: String(sh.onScreenText || '').trim(),
      voiceover: String(sh.voiceover || '').trim(),
    })),
    audioSuggestion: String(rs.audioSuggestion || '').trim(),
    coverText: String(rs.coverText || '').trim(),
  };

  return {
    formula: String(raw.formula || '').trim(),
    variants,
    slides,
    reelScript,
    stories,
    mediaGuidance: String(raw.mediaGuidance || '').trim(),
  };
};

// ─────────────────────────────────────────────────────────────────────
// Geração principal
// ─────────────────────────────────────────────────────────────────────
/**
 * @param {object} input  { type, goal, products[], coupon, wslEvent, context, variantCount }
 * @param {object} settings  documento SocialSettings (brandVoice, defaults)
 * @returns {{ content, generation }}
 */
export const generateContent = async (input, settings) => {
  const anthropic = getClient();

  const system = buildSystemPrompt(settings, input.type, input.goal);
  const user = buildUserPrompt(input);

  const response = await anthropic.messages.create({
    model: MODEL_MAIN,
    max_tokens: 4000,
    temperature: 0.8,
    system,
    tools: [OUTPUT_TOOL],
    tool_choice: { type: 'tool', name: OUTPUT_TOOL.name },
    messages: [{ role: 'user', content: user }],
  });

  const toolBlock = response.content.find(
    b => b.type === 'tool_use' && b.name === OUTPUT_TOOL.name,
  );
  if (!toolBlock) {
    throw new Error('A IA não devolveu conteúdo estruturado. Tente novamente.');
  }

  return {
    content: normalizeOutput(toolBlock.input),
    generation: {
      model: MODEL_MAIN,
      promptVersion: PROMPT_VERSION,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      generatedAt: new Date(),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────
// Reescrita rápida (Haiku) — humanizar / encurtar / mais direto
// ─────────────────────────────────────────────────────────────────────
const REWRITE_MODES = {
  humanize:
    'Reescreva o texto aplicando as regras do humanizer: remova aglomerados de vocabulário de IA, pontes de revelação, tríades empilhadas e sinceridade performada. Mantenha o sentido, os números e o registo do autor. Não encurte nem alongue de forma relevante.',
  shorten:
    'Reescreva o texto com no máximo 60% do comprimento original, mantendo o gancho nos primeiros 125 caracteres, o sentido, os números e UM CTA.',
  punchier:
    'Reescreva o texto mais direto e concreto: frases curtas, verbos fortes, números específicos onde já existem, sem adjetivos vazios. Mantenha o sentido e o comprimento aproximado.',
  hook: 'Reescreva APENAS de forma a que os primeiros 125 caracteres funcionem sozinhos como gancho forte. O resto do texto pode ser ajustado minimamente para encaixar.',
};

export const rewriteText = async (text, mode = 'humanize', settings) => {
  const anthropic = getClient();
  const instruction = REWRITE_MODES[mode] || REWRITE_MODES.humanize;
  const voice = settings?.brandVoice || {};

  const response = await anthropic.messages.create({
    model: MODEL_FAST,
    max_tokens: 1500,
    temperature: 0.4,
    system: `Você edita legendas de Instagram da Elite Surfing (acessórios de surf, Brasil), em português do Brasil.
Tom da marca: ${voice.tone || 'direto, de surfista para surfista'}.
Palavras proibidas: ${(voice.bannedWords || []).join(', ') || '—'}.
Nível de emoji: ${voice.emojiLevel || 'low'}.

${HUMANIZER}

Responda SOMENTE com o texto reescrito, sem aspas, sem comentários, sem markdown.`,
    messages: [
      {
        role: 'user',
        content: `${instruction}\n\nTEXTO:\n${text}`,
      },
    ],
  });

  const out = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  return {
    text: out,
    generation: {
      model: MODEL_FAST,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  };
};

export const REWRITE_MODE_KEYS = Object.keys(REWRITE_MODES);
