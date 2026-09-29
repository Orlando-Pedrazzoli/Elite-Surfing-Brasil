// client/src/utils/attribution.js
// ═══════════════════════════════════════════════════════════════════════
// 🎯 ATRIBUIÇÃO DE ORIGEM — captura UTMs na chegada e leva-os ao pedido
// ═══════════════════════════════════════════════════════════════════════
// Os links gerados no Estúdio Instagram levam:
//   utm_source=instagram&utm_medium=social&utm_campaign=<campanha>&utm_content=<id do SocialPost>
//
// Ao chegar ao site com UTMs (ou fbclid/igshid), guardamos a origem em
// localStorage por 30 dias ("first touch": a primeira origem conhecida
// vence; "last touch" é atualizado sempre). No checkout, o Cart envia
// `attribution` com o pedido e o backend grava em Order.attribution.
// Assim o admin vê "este post vendeu X" no Estúdio e no Dashboard.
//
// Sem dados pessoais: só parâmetros de campanha, caminho e referrer.
// ═══════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'es_attribution';
const TTL_DAYS = 30;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const safeGet = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.expiresAt || Date.now() > data.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const safeSet = data => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* modo privado / quota — atribuição é best-effort */
  }
};

const clip = v => (v ? String(v).trim().slice(0, 120) : '');

/** Lê os parâmetros da URL atual e devolve uma "touch" ou null. */
const readTouchFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  UTM_KEYS.forEach(k => {
    const v = params.get(k);
    if (v) utm[k.replace('utm_', '')] = clip(v).toLowerCase();
  });

  // Cliques vindos do Instagram/Facebook sem UTM ainda são identificáveis
  const fbclid = params.get('fbclid');
  const igshid = params.get('igshid');
  const ref = (document.referrer || '').toLowerCase();
  if (!utm.source) {
    if (igshid || ref.includes('instagram.com')) {
      utm.source = 'instagram';
      utm.medium = utm.medium || 'social';
    } else if (fbclid || ref.includes('facebook.com')) {
      utm.source = 'facebook';
      utm.medium = utm.medium || 'social';
    }
  }

  if (!utm.source) return null;

  return {
    source: utm.source,
    medium: utm.medium || '',
    campaign: utm.campaign || '',
    content: utm.content || '',
    term: utm.term || '',
    landingPath: clip(window.location.pathname),
    referrer: clip(document.referrer),
    at: Date.now(),
  };
};

/**
 * Chamar uma vez ao carregar a app (e a cada navegação inicial com UTMs).
 * Mantém o first touch; atualiza o last touch.
 */
export const captureAttribution = () => {
  const touch = readTouchFromUrl();
  if (!touch) return safeGet();

  const existing = safeGet();
  const data = {
    first: existing?.first || touch,
    last: touch,
    expiresAt: Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  safeSet(data);
  return data;
};

/**
 * Objeto enviado com o pedido. Usa o first touch (quem trouxe o cliente),
 * mas leva também o last touch para análise.
 */
export const getAttributionForOrder = () => {
  const data = safeGet();
  if (!data?.first) return null;
  const f = data.first;
  const l = data.last || f;
  return {
    source: f.source,
    medium: f.medium,
    campaign: f.campaign,
    content: f.content,
    term: f.term,
    landingPath: f.landingPath,
    referrer: f.referrer,
    firstSeenAt: new Date(f.at).toISOString(),
    lastSource: l.source,
    lastCampaign: l.campaign,
    lastContent: l.content,
  };
};

export const clearAttribution = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};
