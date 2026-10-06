// client/src/components/WelcomeOfferModal.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🎁 MODAL DE BOAS-VINDAS — "Cadastre-se e ganhe X% OFF na primeira compra"
// ═══════════════════════════════════════════════════════════════════════
// Dois momentos, no mesmo cupom recortado:
//   1. 'offer'   → convite ao cadastro (visitante novo, não logado)
//   2. 'success' → cadastro concluído: mostra o código do cupom
//
// 🏷️ ABA LATERAL: enquanto o visitante NÃO está logado, fica uma aba
// sempre visível (borda esquerda no desktop, etiqueta no canto inferior
// esquerdo no telemóvel) que reabre o modal. Quem está logado não vê
// nem a aba nem o modal.
//
// O desconto e o código vêm do cupom marcado como "boas-vindas" no admin
// (/seller/cupons). Sem cupom ativo, este componente não mostra nada.
//
// Quando o modal abre SOZINHO (regras em utils/welcomeOffer.js):
//   • alguns segundos depois de o visitante chegar (WELCOME_DELAY_MS)
//   • uma vez por sessão; se fechar, só volta passados WELCOME_SNOOZE_DAYS
//   • nunca para quem está logado ou já tem conta neste dispositivo
//   • nunca no carrinho/checkout nem com o modal de login aberto
//
// Acessibilidade: role="dialog" + aria-modal, foco preso dentro do modal
// e devolvido ao fechar, ESC e clique fora fecham, respeita
// prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Check, Copy, Gift } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PIX_DISCOUNT, formatBRL } from '../utils/installmentUtils';
import {
  WELCOME_DELAY_MS,
  WELCOME_REGISTERED_EVENT,
  fetchWelcomeOffer,
  welcomeOfferAmount,
  getFirstSeenAt,
  canShowWelcomeModal,
  markWelcomeShown,
  snoozeWelcomeModal,
  markWelcomeKnownCustomer,
  setPendingWelcomeCoupon,
} from '../utils/welcomeOffer';

// Páginas onde o modal nunca interrompe (compra em curso / área do cliente)
const EXCLUDED_PATHS = [
  '/cart',
  '/add-address',
  '/order-success',
  '/pix-payment',
  '/boleto-payment',
  '/minha-conta',
  '/my-orders',
  '/write-review',
  '/loader',
  '/seller',
];

// Páginas sem a aba lateral: pedido já feito (pagamento/confirmação) e admin
const TAB_EXCLUDED_PATHS = [
  '/order-success',
  '/pix-payment',
  '/boleto-payment',
  '/loader',
  '/seller',
];

const ANIMATION_MS = 280;

// Eventos de medição — no-op se o Pixel/GA não estiverem carregados
const track = (name, params = {}) => {
  try {
    if (typeof window.fbq === 'function')
      window.fbq('trackCustom', name, params);
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  } catch {
    /* ignora */
  }
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WelcomeOfferModal = () => {
  const {
    user,
    isSeller,
    showUserLogin,
    setShowUserLogin,
    navigate,
    getCartCount,
  } = useAppContext();
  const location = useLocation();

  const [offer, setOffer] = useState(null);
  const [view, setView] = useState(null); // null | 'offer' | 'success'
  const [visible, setVisible] = useState(false); // controla a animação
  const [copied, setCopied] = useState(false);

  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const openedFromTabRef = useRef(false);
  const closeTimerRef = useRef(null);

  const isExcludedPath = EXCLUDED_PATHS.some(p =>
    location.pathname.startsWith(p),
  );
  const isTabExcludedPath = TAB_EXCLUDED_PATHS.some(p =>
    location.pathname.startsWith(p),
  );

  // Valores mais recentes, para decidir no momento em que o temporizador
  // dispara (e não com o que era verdade quando foi agendado)
  const latest = useRef({});
  // (o admin logado a ver a loja também não recebe o convite)
  const isKnown = !!user || !!isSeller;
  latest.current = { isKnown, showUserLogin, isExcludedPath, view };

  // ─── Abrir / fechar (com animação) ───
  const open = useCallback((nextView, nextOffer) => {
    clearTimeout(closeTimerRef.current);
    returnFocusRef.current = document.activeElement;
    setOffer(nextOffer);
    setCopied(false);
    setView(nextView);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setView(null);
      // devolve o foco a quem abriu o modal. A aba lateral sai do ecrã
      // enquanto o modal está aberto, por isso é procurada de novo depois
      // de o React voltar a mostrá-la.
      const el = returnFocusRef.current;
      const fromTab = openedFromTabRef.current;
      openedFromTabRef.current = false;
      setTimeout(() => {
        const target = fromTab
          ? document.querySelector('.es-welcome-tab')
          : el && document.contains(el)
            ? el
            : null;
        if (target && typeof target.focus === 'function')
          target.focus({ preventScroll: true });
      }, 60);
    }, ANIMATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // ─── Quem já é cliente não volta a ver o convite ───
  useEffect(() => {
    if (!user) return;
    markWelcomeKnownCustomer();
    if (latest.current.view === 'offer') close();
  }, [user, close]);

  // ─── Oferta em vigor (para a aba lateral) ───
  // Pedida pouco depois de a página abrir, só para quem não está logado.
  // A resposta vem do CDN e fica guardada na sessão.
  useEffect(() => {
    if (isKnown || isTabExcludedPath) return;
    let active = true;
    const timer = setTimeout(async () => {
      const activeOffer = await fetchWelcomeOffer();
      if (active && activeOffer) setOffer(current => current || activeOffer);
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isKnown, isTabExcludedPath]);

  // ─── 1. Convite: abre depois de WELCOME_DELAY_MS no site ───
  useEffect(() => {
    if (isKnown || isExcludedPath || showUserLogin || view) return;
    if (!canShowWelcomeModal()) return;

    let cancelled = false;
    const wait = Math.max(0, WELCOME_DELAY_MS - (Date.now() - getFirstSeenAt()));
    const timer = setTimeout(async () => {
      const activeOffer = await fetchWelcomeOffer();
      const now = latest.current;
      if (cancelled || !activeOffer) return;
      if (now.isKnown || now.showUserLogin || now.isExcludedPath || now.view)
        return;
      if (!canShowWelcomeModal()) return;
      markWelcomeShown();
      open('offer', activeOffer);
      track('WelcomeOfferView', { coupon: activeOffer.code });
    }, wait);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isKnown, isExcludedPath, showUserLogin, view, open]);

  // ─── 2. Cadastro concluído (em qualquer ponto do site) → cupom ───
  useEffect(() => {
    const onRegistered = async event => {
      const registered = event.detail?.user;
      markWelcomeKnownCustomer();
      try {
        if (typeof window.fbq === 'function')
          window.fbq('track', 'CompleteRegistration');
      } catch {
        /* ignora */
      }
      const activeOffer = await fetchWelcomeOffer();
      if (!activeOffer || !registered?._id) return;
      setPendingWelcomeCoupon(activeOffer.code, registered._id);
      track('WelcomeOfferRegistered', { coupon: activeOffer.code });
      // espera o modal de login terminar de fechar
      setTimeout(() => open('success', activeOffer), 350);
    };
    window.addEventListener(WELCOME_REGISTERED_EVENT, onRegistered);
    return () =>
      window.removeEventListener(WELCOME_REGISTERED_EVENT, onRegistered);
  }, [open]);

  // ─── Enquanto aberto: animação, scroll travado, ESC, foco ───
  useEffect(() => {
    if (!view) return;

    const raf = requestAnimationFrame(() => {
      setVisible(true);
      panelRef.current?.focus({ preventScroll: true });
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
    };
  }, [view]);

  if (!offer) return null;

  // ─── Texto (sempre a partir do cupom real) ───
  const amount = welcomeOfferAmount(offer); // "5%"

  // ═══ 🏷️ ABA LATERAL — sempre disponível para quem não está logado ═══
  if (!view) {
    if (isKnown || isTabExcludedPath || showUserLogin) return null;
    return (
      <>
        <style>{STYLES}</style>
        <button
          type='button'
          className='es-welcome-tab'
          aria-haspopup='dialog'
          aria-label={`Abrir oferta: cadastre-se e ganhe ${amount} OFF na primeira compra`}
          onClick={() => {
            track('WelcomeOfferTabClick', { coupon: offer.code });
            markWelcomeShown(); // já viu nesta visita: não reabre sozinho
            open('offer', offer);
            openedFromTabRef.current = true;
          }}
        >
          <Gift className='es-welcome-tab-icon' aria-hidden='true' />
          <span className='es-welcome-tab-text'>
            <strong>{amount} OFF</strong>
            <span>no cadastro</span>
          </span>
        </button>
      </>
    );
  }

  // ─── Ações ───
  const handleDismiss = () => {
    if (view === 'offer') {
      snoozeWelcomeModal();
      track('WelcomeOfferDismiss', { coupon: offer.code });
    }
    close();
  };

  const handleRegister = () => {
    track('WelcomeOfferClick', { coupon: offer.code });
    returnFocusRef.current = null; // o foco segue para o cadastro
    openedFromTabRef.current = false;
    setVisible(false);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setView(null);
      setShowUserLogin('register'); // abre o modal de login já em "Criar Conta"
    }, ANIMATION_MS);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sem permissão de clipboard: o código continua visível para copiar */
    }
  };

  const hasCartItems = getCartCount() > 0;
  const isOnCart = location.pathname.startsWith('/cart');
  const handleContinue = () => {
    if (hasCartItems && !isOnCart) {
      returnFocusRef.current = null;
      navigate('/cart');
    }
    close();
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleDismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const pixPercent = Math.round(PIX_DISCOUNT * 100);
  const isSuccess = view === 'success';

  const conditions = [
    'Válido uma vez, na primeira compra de novos cadastros.',
    offer.minOrderValue > 0
      ? `Pedido mínimo de ${formatBRL(offer.minOrderValue)}.`
      : '',
    offer.partial ? 'Aplicado aos produtos participantes.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`es-welcome-backdrop ${visible ? 'is-visible' : ''}`}
      onMouseDown={event => {
        if (event.target === event.currentTarget) handleDismiss();
      }}
    >
      <style>{STYLES}</style>

      <div className={`es-welcome-lift ${visible ? 'is-visible' : ''}`}>
        <div
          ref={panelRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby='es-welcome-title'
          aria-describedby='es-welcome-text'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className='es-welcome-ticket'
        >
          {/* ═══ CANHOTO — o valor do cupom ═══ */}
          <div className='es-welcome-stub'>
            <img
              src='/logo-branco.png'
              alt='Elite Surfing'
              width='86'
              height='36'
              className='es-welcome-logo'
            />
            <p className='es-welcome-value' aria-hidden='true'>
              <span className='es-welcome-amount'>{amount}</span>
              <span className='es-welcome-off'>
                <strong>OFF</strong>
                <span>
                  {isSuccess ? 'cupom liberado' : 'na primeira compra'}
                </span>
              </span>
            </p>
          </div>

          {/* ═══ CORPO ═══ */}
          <div className='es-welcome-body'>
            <button
              type='button'
              onClick={handleDismiss}
              aria-label='Fechar'
              className='es-welcome-close'
            >
              <X className='w-5 h-5' aria-hidden='true' />
            </button>

            {isSuccess ? (
              <>
                <h2 id='es-welcome-title' className='es-welcome-title'>
                  Cadastro concluído. Seu cupom de {amount}&nbsp;OFF está
                  liberado.
                </h2>
                <p id='es-welcome-text' className='es-welcome-text'>
                  Ele entra sozinho no carrinho na sua primeira compra. Se
                  preferir, guarde o código:
                </p>

                <div className='es-welcome-code'>
                  <span className='es-welcome-code-value'>{offer.code}</span>
                  <button
                    type='button'
                    onClick={handleCopy}
                    className='es-welcome-copy'
                  >
                    {copied ? (
                      <Check className='w-4 h-4' aria-hidden='true' />
                    ) : (
                      <Copy className='w-4 h-4' aria-hidden='true' />
                    )}
                    <span aria-live='polite'>
                      {copied ? 'Copiado' : 'Copiar'}
                    </span>
                  </button>
                </div>

                {offer.stackWithPix && (
                  <p className='es-welcome-perk'>
                    <Check className='w-4 h-4' aria-hidden='true' />
                    Acumula com os {pixPercent}% de desconto no PIX
                  </p>
                )}

                <button
                  type='button'
                  onClick={handleContinue}
                  className='es-welcome-cta'
                >
                  {!hasCartItems
                    ? 'Continuar comprando'
                    : isOnCart
                      ? 'Continuar a compra'
                      : 'Ir para o carrinho'}
                </button>
              </>
            ) : (
              <>
                <h2 id='es-welcome-title' className='es-welcome-title'>
                  Cadastre-se e ganhe {amount}&nbsp;OFF na primeira compra
                </h2>
                <p id='es-welcome-text' className='es-welcome-text'>
                  Não perca nossas ofertas especiais.
                </p>

                {offer.stackWithPix && (
                  <p className='es-welcome-perk'>
                    <Check className='w-4 h-4' aria-hidden='true' />
                    Acumula com os {pixPercent}% de desconto no PIX
                  </p>
                )}

                <button
                  type='button'
                  onClick={handleRegister}
                  className='es-welcome-cta'
                >
                  Cadastrar
                </button>
                <button
                  type='button'
                  onClick={handleDismiss}
                  className='es-welcome-decline'
                >
                  Agora não
                </button>
              </>
            )}

            <p className='es-welcome-conditions'>{conditions}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// ESTILOS — o modal é um cupom: canhoto azul com o valor, linha
// picotada e dois recortes na junção. No telemóvel o canhoto fica em
// cima (sem fotografia, para não pesar); a partir de 640px fica à
// esquerda, sobre a fotografia da onda.
// ═══════════════════════════════════════════════════════════════════════
const STYLES = `
.es-welcome-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000; /* acima do aviso de cookies (9999): uma coisa de cada vez */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(7, 26, 48, 0);
  transition: background-color ${ANIMATION_MS}ms ease,
    backdrop-filter ${ANIMATION_MS}ms ease;
}
.es-welcome-backdrop.is-visible {
  background: rgba(7, 26, 48, 0.66);
  backdrop-filter: blur(3px);
}

.es-welcome-lift {
  width: 100%;
  max-width: 400px;
  opacity: 0;
  transform: translateY(14px) scale(0.97);
  filter: drop-shadow(0 28px 48px rgba(3, 12, 24, 0.45));
  transition: opacity ${ANIMATION_MS}ms ease,
    transform ${ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.es-welcome-lift.is-visible {
  opacity: 1;
  transform: none;
}

.es-welcome-ticket {
  --notch: 11px;
  --stub: 128px; /* altura do canhoto no telemóvel */
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  background: #fff;
  border-radius: 18px;
  outline: none;
  -webkit-mask-image:
    radial-gradient(circle var(--notch) at 0 var(--stub), transparent 97%, #000),
    radial-gradient(circle var(--notch) at 100% var(--stub), transparent 97%, #000);
  -webkit-mask-composite: source-in;
  mask-image:
    radial-gradient(circle var(--notch) at 0 var(--stub), transparent 97%, #000),
    radial-gradient(circle var(--notch) at 100% var(--stub), transparent 97%, #000);
  mask-composite: intersect;
}

/* ── Canhoto ── */
.es-welcome-stub {
  flex: none;
  height: var(--stub);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 24px 16px;
  color: #fff;
  background: linear-gradient(160deg, #1a4a7a 0%, #0f3057 45%, #071a30 100%);
}
.es-welcome-logo {
  width: auto;
  height: 20px;
  object-fit: contain;
  align-self: flex-start;
}
.es-welcome-value {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin: 0;
  line-height: 1;
}
.es-welcome-amount {
  font-size: 58px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.82;
}
.es-welcome-off {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 1px;
}
.es-welcome-off strong {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
}
.es-welcome-off span {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.82);
}

/* ── Corpo ── */
.es-welcome-body {
  position: relative;
  padding: 26px 24px 22px;
}
/* linha picotada na junção */
.es-welcome-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(var(--notch) + 8px);
  right: calc(var(--notch) + 8px);
  border-top: 2px dashed #cbd5e1;
}
.es-welcome-close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  color: #64748b;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;
}
.es-welcome-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.es-welcome-title {
  margin: 0;
  padding-right: 32px;
  font-size: 23px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: #0b1b2b;
  text-wrap: balance;
}
.es-welcome-text {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: #475569;
}
.es-welcome-perk {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 500;
  color: #15803d; /* o mesmo verde do preço PIX no site */
}
.es-welcome-perk svg {
  flex: none;
}
.es-welcome-cta {
  display: block;
  width: 100%;
  margin-top: 22px;
  padding: 15px 20px;
  border-radius: 10px;
  background: #0f3057;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease;
}
.es-welcome-cta:hover {
  background: #0a2240;
}
.es-welcome-cta:active {
  transform: scale(0.985);
}
.es-welcome-decline {
  display: block;
  margin: 6px auto 0;
  padding: 10px 14px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition: color 150ms ease, text-decoration-color 150ms ease;
}
.es-welcome-decline:hover {
  color: #0f172a;
  text-decoration-color: currentColor;
}
.es-welcome-conditions {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: #94a3b8;
}
.es-welcome-decline + .es-welcome-conditions {
  margin-top: 6px;
  text-align: center;
}

/* ── Código do cupom (passo de sucesso) ── */
.es-welcome-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 8px 8px 8px 18px;
  border: 2px dashed #94a3b8;
  border-radius: 12px;
  background: #f8fafc;
}
.es-welcome-code-value {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #0f3057;
  user-select: all;
}
.es-welcome-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 600;
  color: #0f3057;
  cursor: pointer;
  transition: background-color 150ms ease;
}
.es-welcome-copy:hover {
  background: #eef3f8;
}

/* ── 🏷️ Aba lateral (telemóvel: etiqueta no canto inferior esquerdo) ── */
.es-welcome-tab {
  position: fixed;
  left: 12px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 40; /* abaixo da navbar, do carrinho lateral e dos modais */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px 0 13px;
  border-radius: 999px;
  background: #0f3057;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(7, 26, 48, 0.34);
  outline: 1px dashed rgba(255, 255, 255, 0.42);
  outline-offset: -5px;
  animation: es-welcome-tab-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  transition: background-color 150ms ease, transform 150ms ease;
}
.es-welcome-tab:hover {
  background: #0a2240;
}
.es-welcome-tab:active {
  transform: scale(0.97);
}
.es-welcome-tab:focus-visible {
  outline: 3px solid #7fb0e0;
  outline-offset: 2px;
}
.es-welcome-tab-icon {
  flex: none;
  width: 18px;
  height: 18px;
}
.es-welcome-tab-text {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
  line-height: 1;
}
.es-welcome-tab-text strong {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.es-welcome-tab-text span {
  display: none; /* no telemóvel só o valor, para ocupar pouco */
  font-size: 13px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.82);
}
@keyframes es-welcome-tab-in {
  from {
    opacity: 0;
    translate: -16px 0;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

.es-welcome-ticket :is(button):focus-visible {
  outline: 3px solid #1a4a7a;
  outline-offset: 2px;
}
.es-welcome-cta:focus-visible {
  outline-color: #7fb0e0;
}

/* ── A partir de 640px: canhoto à esquerda, sobre a fotografia ── */
@media (min-width: 640px) {
  .es-welcome-lift {
    max-width: 760px;
  }
  .es-welcome-ticket {
    --notch: 13px;
    --stub: 268px; /* largura do canhoto */
    flex-direction: row;
    min-height: 400px;
    -webkit-mask-image:
      radial-gradient(circle var(--notch) at var(--stub) 0, transparent 97%, #000),
      radial-gradient(circle var(--notch) at var(--stub) 100%, transparent 97%, #000);
    mask-image:
      radial-gradient(circle var(--notch) at var(--stub) 0, transparent 97%, #000),
      radial-gradient(circle var(--notch) at var(--stub) 100%, transparent 97%, #000);
  }
  .es-welcome-stub {
    width: var(--stub);
    height: auto;
    padding: 28px 28px 30px;
    background:
      linear-gradient(180deg, rgba(7, 26, 48, 0.42) 0%, rgba(7, 26, 48, 0.18) 34%, rgba(7, 26, 48, 0.9) 78%, #071a30 100%),
      url('/raglan-bay-wave.jpg') 24% 30% / cover no-repeat,
      #0f3057;
  }
  .es-welcome-logo {
    height: 26px;
  }
  .es-welcome-value {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .es-welcome-amount {
    font-size: 112px;
  }
  .es-welcome-off {
    gap: 6px;
  }
  .es-welcome-off strong {
    font-size: 34px;
  }
  .es-welcome-off span {
    font-size: 15px;
  }
  .es-welcome-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 52px 40px 34px;
  }
  .es-welcome-body::before {
    top: calc(var(--notch) + 10px);
    bottom: calc(var(--notch) + 10px);
    left: 0;
    right: auto;
    border-top: 0;
    border-left: 2px dashed #cbd5e1;
  }
  .es-welcome-close {
    top: 12px;
    right: 12px;
  }
  .es-welcome-title {
    padding-right: 0;
    font-size: 28px;
    line-height: 1.14;
  }
  .es-welcome-text {
    font-size: 16px;
  }

  /* aba vertical colada à borda esquerda, a meio da altura */
  .es-welcome-tab {
    left: 0;
    bottom: auto;
    top: 50%;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
    padding: 18px 13px 20px;
    border-radius: 0 14px 14px 0;
    transform: translateY(-50%);
    transition: background-color 150ms ease, padding 150ms ease;
  }
  .es-welcome-tab:hover {
    padding-left: 17px;
  }
  .es-welcome-tab:active {
    transform: translateY(-50%);
  }
  .es-welcome-tab-text {
    writing-mode: vertical-rl;
    rotate: 180deg; /* lê-se de baixo para cima */
    gap: 8px;
  }
  .es-welcome-tab-text strong {
    font-size: 16px;
  }
  .es-welcome-tab-text span {
    display: inline;
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .es-welcome-tab {
    animation: none;
  }
  .es-welcome-backdrop,
  .es-welcome-lift,
  .es-welcome-cta {
    transition: none;
  }
  .es-welcome-lift {
    transform: none;
  }
}
`;

export default WelcomeOfferModal;
