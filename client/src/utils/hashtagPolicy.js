// client/src/utils/hashtagPolicy.js
// ═══════════════════════════════════════════════════════════════════════
// #️⃣ POLÍTICA DE HASHTAGS DO ESTÚDIO — espelho do servidor
// ═══════════════════════════════════════════════════════════════════════
// Bloco fixo da marca que entra em TODAS as publicações (decisão do admin,
// 2026-10-24). O servidor garante o bloco na geração e na publicação; aqui
// serve para o editor mostrar as fixas bloqueadas e contar as vagas livres.
//
// ESPELHADO em server/services/instagram/hashtagPolicy.js — ao mudar a
// lista, copiar para o outro ficheiro.
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
export const NICHE_SLOTS = INSTAGRAM_HASHTAG_LIMIT - MANDATORY_HASHTAGS.length;

const normalize = tag =>
  String(tag || '')
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/gi, '');

const mandatoryKeys = new Set(MANDATORY_HASHTAGS.map(t => t.toLowerCase()));

export const isMandatoryHashtag = tag => mandatoryKeys.has(normalize(tag).toLowerCase());

/** [nicho (sem repetir o bloco), ...bloco fixo], máximo 30. */
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

export const nicheOnly = (tags = []) => tags.filter(t => !isMandatoryHashtag(t));
