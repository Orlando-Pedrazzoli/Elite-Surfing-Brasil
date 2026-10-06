// client/src/utils/welcomeOffer.js
// ═══════════════════════════════════════════════════════════════════════
// 🎁 OFERTA DE BOAS-VINDAS — regras e estado partilhados
// ═══════════════════════════════════════════════════════════════════════
// Usado por:
//   • WelcomeOfferModal → modal "Cadastre e ganhe X% OFF" + aba lateral
//   • Login             → avisa quando um cadastro é concluído
//   • Cart              → aplica o cupom de boas-vindas automaticamente
//
// A oferta (código e percentagem) vem SEMPRE do servidor
// (GET /api/coupon/welcome = cupom marcado como "boas-vindas" no admin).
// Sem cupom ativo, não há modal: o site nunca promete um desconto que o
// checkout não vai dar.
//
// O MODAL abre sozinho (boas práticas de pop-ups de e-commerce):
//   • só para visitantes sem conta neste dispositivo e não logados
//   • WELCOME_DELAY_MS depois de a pessoa chegar ao site
//   • no máximo uma vez por sessão; se fechar, só volta em SNOOZE_DAYS
//   • nunca durante o checkout (ver EXCLUDED_PATHS no modal)
//
// A ABA lateral fica SEMPRE visível para quem não está logado e reabre
// o modal com um clique (quem fechou sem querer não perde a oferta).
// Quem está logado nunca vê nem a aba nem o modal.
//
// O cupom vale UMA vez, na PRIMEIRA compra de um cadastro NOVO — a regra
// é imposta no servidor (services/couponService.js), não aqui.
// ═══════════════════════════════════════════════════════════════════════

// ⏱️ Tempo no site antes de abrir o modal. Abrir no primeiro segundo
// aumenta a rejeição e converte menos do que esperar alguns segundos.
// Para abrir de imediato, use 0.
export const WELCOME_DELAY_MS = 6000;

// 🔁 Dias sem voltar a mostrar depois de o visitante fechar o modal
export const WELCOME_SNOOZE_DAYS = 3;

// Evento disparado pelo Login quando um cadastro novo é concluído
export const WELCOME_REGISTERED_EVENT = 'elitesurfing:welcome-registered';
// Evento disparado quando o cupom fica à espera de ser aplicado no carrinho
export const WELCOME_COUPON_READY_EVENT = 'elitesurfing:welcome-coupon-ready';

const KEY_STATE = 'es_welcome_state'; // localStorage: { dismissedAt, known }
const KEY_PENDING = 'es_welcome_coupon'; // localStorage: { code, userId }
const KEY_OFFER = 'es_welcome_offer'; // sessionStorage: { at, offer }
const KEY_FIRST_SEEN = 'es_welcome_first_seen'; // sessionStorage: timestamp
const KEY_SHOWN = 'es_welcome_shown'; // sessionStorage: '1'

const OFFER_CACHE_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Storage tolerante a falhas (Safari privado, storage bloqueado…) ───
const read = (storage, key) => {
  try {
    const raw = window[storage].getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const write = (storage, key, value) => {
  try {
    window[storage].setItem(key, JSON.stringify(value));
  } catch {
    /* sem storage: o modal continua a funcionar, só não memoriza */
  }
};

const remove = (storage, key) => {
  try {
    window[storage].removeItem(key);
  } catch {
    /* ignora */
  }
};

// ═══════════════════════════════════════════════════════════════════════
// Oferta em vigor
// ═══════════════════════════════════════════════════════════════════════
let offerRequest = null;

// Oferta já conhecida nesta sessão (sem ir ao servidor). undefined = ainda
// não foi pedida; null = o servidor disse que não há oferta.
export const getCachedWelcomeOffer = () => {
  const cached = read('sessionStorage', KEY_OFFER);
  if (!cached || Date.now() - cached.at > OFFER_CACHE_MS) return undefined;
  return cached.offer;
};

// Pede a oferta ao servidor. Usa fetch SEM credenciais de propósito: a
// resposta é igual para todos e assim o CDN da Vercel pode servi-la da
// cache (um pedido com Authorization nunca é servido da cache).
export const fetchWelcomeOffer = () => {
  const cached = getCachedWelcomeOffer();
  if (cached !== undefined) return Promise.resolve(cached);
  if (offerRequest) return offerRequest;

  const base = import.meta.env.VITE_BACKEND_URL || '';
  offerRequest = fetch(`${base}/api/coupon/welcome`, { credentials: 'omit' })
    .then(res => (res.ok ? res.json() : null))
    .then(data => {
      if (!data?.success) return null; // erro: não guarda, tenta mais tarde
      const offer = data.offer || null;
      write('sessionStorage', KEY_OFFER, { at: Date.now(), offer });
      return offer;
    })
    .catch(() => null)
    .finally(() => {
      offerRequest = null;
    });
  return offerRequest;
};

// "5%" ou "R$ 20" — o número grande do modal
export const welcomeOfferAmount = offer => {
  if (!offer) return '';
  if (offer.discountType === 'percentage') return `${offer.discountValue}%`;
  return `R$ ${Number(offer.discountValue).toLocaleString('pt-BR')}`;
};

// ═══════════════════════════════════════════════════════════════════════
// Quando mostrar o modal
// ═══════════════════════════════════════════════════════════════════════

// Momento em que o visitante chegou ao site nesta sessão (não reinicia
// ao mudar de página)
export const getFirstSeenAt = () => {
  const saved = read('sessionStorage', KEY_FIRST_SEEN);
  if (typeof saved === 'number') return saved;
  const now = Date.now();
  write('sessionStorage', KEY_FIRST_SEEN, now);
  return now;
};

export const canShowWelcomeModal = () => {
  if (read('sessionStorage', KEY_SHOWN)) return false; // já viu nesta sessão
  const state = read('localStorage', KEY_STATE) || {};
  if (state.known) return false; // já tem conta neste dispositivo
  if (
    state.dismissedAt &&
    Date.now() - state.dismissedAt < WELCOME_SNOOZE_DAYS * DAY_MS
  )
    return false;
  return true;
};

export const markWelcomeShown = () => write('sessionStorage', KEY_SHOWN, 1);

// Visitante fechou o modal → não insistir durante WELCOME_SNOOZE_DAYS
export const snoozeWelcomeModal = () => {
  const state = read('localStorage', KEY_STATE) || {};
  write('localStorage', KEY_STATE, { ...state, dismissedAt: Date.now() });
};

// Já é cliente (fez login ou cadastro) → o modal não volta a aparecer
export const markWelcomeKnownCustomer = () => {
  const state = read('localStorage', KEY_STATE) || {};
  if (!state.known) write('localStorage', KEY_STATE, { ...state, known: true });
};

// ═══════════════════════════════════════════════════════════════════════
// Cadastro concluído → cupom à espera de ser aplicado no carrinho
// ═══════════════════════════════════════════════════════════════════════
export const notifyWelcomeRegistered = user => {
  try {
    window.dispatchEvent(
      new CustomEvent(WELCOME_REGISTERED_EVENT, { detail: { user } }),
    );
  } catch {
    /* ignora */
  }
};

export const setPendingWelcomeCoupon = (code, userId) => {
  if (!code || !userId) return;
  write('localStorage', KEY_PENDING, { code, userId: String(userId) });
  // avisa o carrinho (caso o cadastro tenha sido feito já no checkout)
  try {
    window.dispatchEvent(new CustomEvent(WELCOME_COUPON_READY_EVENT));
  } catch {
    /* ignora */
  }
};

// Só devolve o cupom se pertencer ao cliente que está logado
export const getPendingWelcomeCoupon = userId => {
  const pending = read('localStorage', KEY_PENDING);
  if (!pending?.code || !userId) return null;
  return pending.userId === String(userId) ? pending.code : null;
};

export const clearPendingWelcomeCoupon = () =>
  remove('localStorage', KEY_PENDING);

// Motivos de recusa que não mudam com o tempo: o cupom deixa de ser
// oferecido a este cliente (já comprou, já usou, cupom desativado…)
export const WELCOME_PERMANENT_REJECTIONS = [
  'NOT_FOUND',
  'INACTIVE',
  'EXPIRED',
  'EXHAUSTED',
  'CUSTOMER_LIMIT',
  'FIRST_ORDER_ONLY',
  'NEW_ACCOUNTS_ONLY',
];
