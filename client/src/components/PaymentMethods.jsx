// client/src/components/PaymentMethods.jsx
// ═══════════════════════════════════════════════════════════
// 💳 FORMAS DE PAGAMENTO — bandeiras aceitas via Mercado Pago
// ═══════════════════════════════════════════════════════════
// Ícones oficiais do pacote Shopify payment_icons (licença MIT,
// github.com/activemerchant/payment_icons), sem alterações: formato
// padrão 38×24, mesma moldura e cores das marcas. Ficam em
// src/assets para o Vite os embutir no bundle (< 4 KB) ou servir
// com hash no nome (cache imutável no CDN).
//
// ⚠️ Só listar o que o checkout aceita de facto (Card Payment Brick
// + Pix + Boleto do Mercado Pago). Hipercard NÃO entra: a bandeira
// foi descontinuada em 30/06/2025 e migrou para Mastercard.
// O Mercado Pago aparece como selo "processado por", não como forma
// de pagamento, porque o checkout não oferece saldo da conta MP.

import mercadoPagoIcon from '../assets/payment-icons/mercadopago.svg';
import pixIcon from '../assets/payment-icons/pix.svg';
import visaIcon from '../assets/payment-icons/visa.svg';
import mastercardIcon from '../assets/payment-icons/mastercard.svg';
import eloIcon from '../assets/payment-icons/elo.svg';
import amexIcon from '../assets/payment-icons/amex.svg';
import boletoIcon from '../assets/payment-icons/boleto.svg';
import {
  MAX_INSTALLMENTS,
  MAX_INSTALLMENTS_NO_INTEREST,
  PIX_DISCOUNT,
} from '../utils/installmentUtils';

const PAYMENT_METHODS = [
  { id: 'pix', name: 'Pix', icon: pixIcon },
  { id: 'visa', name: 'Visa', icon: visaIcon },
  { id: 'mastercard', name: 'Mastercard', icon: mastercardIcon },
  { id: 'elo', name: 'Elo', icon: eloIcon },
  { id: 'amex', name: 'American Express', icon: amexIcon },
  { id: 'boleto', name: 'Boleto bancário', icon: boletoIcon },
];

const PaymentIcon = ({ name, icon }) => (
  <img
    src={icon}
    alt={name}
    title={name}
    width={38}
    height={24}
    loading='lazy'
    decoding='async'
    draggable='false'
    className='h-6 w-[38px] select-none'
  />
);

/** Lista das bandeiras e meios aceitos (semântica de lista para leitores de ecrã). */
const PaymentMethods = ({ className = '' }) => (
  <ul
    aria-label='Formas de pagamento aceitas'
    className={`flex flex-wrap items-center gap-2 ${className}`}
  >
    {PAYMENT_METHODS.map(method => (
      <li key={method.id} className='leading-none'>
        <PaymentIcon name={method.name} icon={method.icon} />
      </li>
    ))}
  </ul>
);

/** Condições anunciadas — lidas da mesma fonte que o carrinho usa. */
export const PaymentConditions = ({ className = '' }) => (
  <p className={`text-xs text-gray-500 ${className}`}>
    Até <strong className='font-semibold text-gray-700'>
      {MAX_INSTALLMENTS_NO_INTEREST}x sem juros
    </strong>{' '}
    no cartão (até {MAX_INSTALLMENTS}x) ·{' '}
    <strong className='font-semibold text-[#32BCAD]'>
      {Math.round(PIX_DISCOUNT * 100)}% off
    </strong>{' '}
    no Pix
  </p>
);

/** Selo "Pagamento processado por Mercado Pago". */
export const MercadoPagoSeal = ({ className = '' }) => (
  <div
    className={`flex items-center gap-2 pl-1 pr-3 py-1 bg-sky-50 border border-sky-200 rounded-full ${className}`}
  >
    <img
      src={mercadoPagoIcon}
      alt=''
      aria-hidden='true'
      width={38}
      height={24}
      loading='lazy'
      decoding='async'
      className='h-6 w-[38px] rounded'
    />
    <span className='text-xs font-semibold text-[#0A0080]'>
      Processado por Mercado Pago
    </span>
  </div>
);

export default PaymentMethods;
