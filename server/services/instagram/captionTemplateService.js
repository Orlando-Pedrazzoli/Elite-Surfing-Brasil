// server/services/instagram/captionTemplateService.js
// ═══════════════════════════════════════════════════════════════════════
// ✍️ LEGENDAS PRÉ-DEFINIDAS — seed, placeholders, referência para a IA
// ═══════════════════════════════════════════════════════════════════════
import CaptionTemplate, { CAPTION_ANGLE_LABELS } from '../../models/CaptionTemplate.js';

// Regras de estilo definidas pelo admin (2026-10-26). Entram no prompt
// da IA para TODAS as coleções.
export const CAPTION_STYLE_RULES = `
# Estilo de legenda da Elite Surfing (definido pelo admin)
- Legendas CURTAS: 2 a 4 linhas, frases curtas, uma ideia por linha.
- Linguagem técnica e visual premium. O produto é EQUIPAMENTO funcional
  (aderência, controle, durabilidade, proteção), não um acessório estético.
- Evitar frases genéricas e adjetivos vazios. Preferir o detalhe concreto.
- Fecho de marca curto quando fizer sentido ("Viva o surf com Elite Surfing",
  "Seu surf começa nos detalhes").
- Só afirmar características ("mais aderência", "mais controle") quando
  forem compatíveis com os dados reais do produto fornecidos no briefing.
`;

// ─────────────────────────────────────────────────────────────────────
// Seed inicial — decks (idempotente: só insere se a coleção estiver vazia)
// ─────────────────────────────────────────────────────────────────────
const SEED = [
  {
    group: 'decks',
    angle: 'performance',
    name: 'Performance e controle',
    usage: 'Deck em uso ou close da textura; foco em aderência e manobra.',
    caption:
      'Mais aderência. Mais controle. Mais confiança em cada manobra.\nSeu surf começa nos detalhes.',
    hashtags: ['surfgrip', 'surfaccessories', 'surfbrasil', 'surfing'],
    suggestedTypes: ['post', 'reel'],
    suggestedGoals: ['sell', 'engage'],
    order: 1,
  },
  {
    group: 'decks',
    angle: 'design',
    name: 'Design e estilo',
    usage: 'Ideal para destacar textura, acabamento e visual.',
    caption:
      'Cada detalhe faz a diferença.\nDesign, aderência e atitude para acompanhar o seu surf.',
    hashtags: ['surfstyle', 'surfgear', 'surfculture', 'surfbrasil'],
    suggestedTypes: ['post', 'carousel'],
    suggestedGoals: ['engage', 'launch'],
    order: 2,
  },
  {
    group: 'decks',
    angle: 'lifestyle',
    name: 'Lifestyle e conexão com o surf',
    usage: 'Para Reels, lifestyle e imagens na praia.',
    caption:
      'Sal na pele, prancha na mão e a próxima onda no pensamento.\nViva o surf com Elite Surfing.',
    hashtags: ['surflife', 'surftrip', 'surfbrasil', 'surfculture'],
    suggestedTypes: ['reel', 'story', 'post'],
    suggestedGoals: ['engage'],
    order: 3,
  },
  {
    group: 'decks',
    angle: 'sell',
    name: 'Produto e venda',
    usage: 'Para apresentar um deck específico e incentivar compras.',
    caption:
      'O contato entre você e a prancha importa.\nConheça os decks Elite Surfing e encontre o modelo ideal para o seu equipamento.\nAcesse elitesurfing.com.br.',
    hashtags: ['surfdeck', 'surfaccessories', 'surfgear', 'surfbrasil'],
    suggestedTypes: ['post', 'carousel'],
    suggestedGoals: ['sell', 'launch', 'clearance'],
    order: 4,
  },
];

let seeded = false;
export const ensureCaptionTemplatesSeeded = async () => {
  if (seeded) return;
  const count = await CaptionTemplate.estimatedDocumentCount();
  if (count === 0) {
    await CaptionTemplate.insertMany(SEED);
    console.log(`[captionTemplates] seed inicial: ${SEED.length} legendas (decks)`);
  }
  seeded = true;
};

// ─────────────────────────────────────────────────────────────────────
// Placeholders: {produto} {preco} {link}
// ─────────────────────────────────────────────────────────────────────
const formatBRL = v =>
  `R$ ${Number(v || 0)
    .toFixed(2)
    .replace('.', ',')}`;

export const fillPlaceholders = (caption, { product, url } = {}) =>
  String(caption || '')
    .replace(/\{produto\}/gi, product?.name || 'nosso produto')
    .replace(/\{preco\}/gi, product ? formatBRL(product.offerPrice ?? product.price) : '')
    .replace(/\{link\}/gi, url || 'elitesurfing.com.br')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

// ─────────────────────────────────────────────────────────────────────
// Referência para a IA: legendas ativas das coleções dos produtos
// ─────────────────────────────────────────────────────────────────────
export const findTemplatesForGroups = async groups => {
  const wanted = [...new Set((groups || []).filter(Boolean))];
  const query = { isActive: true, group: { $in: [...wanted, 'all'] } };
  return CaptionTemplate.find(query).sort({ group: 1, order: 1 }).limit(12).lean();
};

export const buildReferenceSection = templates => {
  if (!templates?.length) return '';
  const lines = templates.map(t => {
    const angle = CAPTION_ANGLE_LABELS[t.angle] || t.angle;
    const tags = (t.hashtags || []).map(h => `#${h}`).join(' ');
    return `— [${t.group} · ${angle}]${t.usage ? ` (${t.usage})` : ''}\n${t.caption}${
      tags ? `\n${tags}` : ''
    }`;
  });
  return `# Legendas aprovadas pelo admin para esta coleção (REFERÊNCIA DE TOM)
Estas legendas foram escritas e aprovadas pelo admin. Imitar o comprimento
(2–4 linhas), a estrutura (frases curtas, uma ideia por linha, fecho de marca),
o vocabulário técnico e o nível de emoji. NÃO copiar literalmente: cada
variante tem de ser nova, adaptada ao produto e ao objetivo do briefing.
Cada variante deve seguir um ângulo diferente (performance, design,
lifestyle, venda).

${lines.join('\n\n')}`;
};
