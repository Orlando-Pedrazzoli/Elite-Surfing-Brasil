// server/services/instagram/hashtagPolicy.js
// ═══════════════════════════════════════════════════════════════════════
// #️⃣ POLÍTICA DE HASHTAGS DO ESTÚDIO
// ═══════════════════════════════════════════════════════════════════════
// Decisão do admin (2026-10-24): um bloco fixo de hashtags da marca entra
// em TODAS as publicações. A IA acrescenta 3–5 hashtags de nicho específicas
// do conteúdo; o bloco é garantido aqui (geração) e no publishService
// (publicação), para valer mesmo em posts editados à mão.
//
// ESPELHADO em client/src/utils/hashtagPolicy.js — ao mudar a lista,
// copiar para o outro ficheiro.
//
// Limite do Instagram: 30 hashtags por legenda.
// ═══════════════════════════════════════════════════════════════════════

export const MANDATORY_HASHTAGS = [
  'EliteSurfing',
  'surfequipment',
  'surfaccessories',
  'surfgear',
  'surfshop',
  'surfboard',
  'surfboards',
  'surfboardbag',
  'surftravel',
  'surfhardware',
  'surfbrand',
  'surf',
  'surfing',
  'surfer',
  'surflife',
  'surfista',
  'surfbrasil',
  'surfinglife',
  'surfculture',
  'surfstyle',
  'surftrip',
];

export const INSTAGRAM_HASHTAG_LIMIT = 30;

/** Vagas que sobram para hashtags de nicho escolhidas pela IA/admin. */
export const NICHE_SLOTS = INSTAGRAM_HASHTAG_LIMIT - MANDATORY_HASHTAGS.length;

const normalize = tag =>
  String(tag || '')
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/gi, '');

const mandatoryKeys = new Set(MANDATORY_HASHTAGS.map(t => t.toLowerCase()));

export const isMandatoryHashtag = tag => mandatoryKeys.has(normalize(tag).toLowerCase());

/**
 * Junta as hashtags de nicho ao bloco fixo:
 *   [nicho (sem repetir o bloco), ...bloco fixo]
 * Respeita o limite de 30 (o bloco nunca é cortado; o nicho é).
 */
export const withMandatoryHashtags = (tags = []) => {
  const seen = new Set(mandatoryKeys);
  const niche = [];
  for (const raw of tags) {
    const clean = normalize(raw);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    niche.push(clean.toLowerCase());
    if (niche.length >= NICHE_SLOTS) break;
  }
  return [...niche, ...MANDATORY_HASHTAGS];
};

/** Só as hashtags que NÃO fazem parte do bloco fixo. */
export const nicheOnly = (tags = []) => tags.filter(t => !isMandatoryHashtag(t));
