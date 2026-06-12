// src/components/MercadoPagoCardPayment.jsx
// ═══════════════════════════════════════════════════════════════
// 💳 CARD PAYMENT BRICK — Mercado Pago
// Substitui o antigo CreditCardForm (tokenização Pagar.me).
// O Brick renderiza os campos seguros do MP (PCI minimizado),
// calcula parcelas nativamente e injeta o device fingerprint
// usado pelo motor antifraude. Os dados do cartão NUNCA passam
// pelo nosso DOM controlado nem pelo nosso servidor.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { Lock, Shield, Loader2 } from 'lucide-react';

const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

// Inicializa o SDK uma única vez por sessão
let mpInitialized = false;

const MercadoPagoCardPayment = ({ totalAmount, onSubmit, payerEmail }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mpInitialized && PUBLIC_KEY) {
      initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
      mpInitialized = true;
    }
  }, []);

  if (!PUBLIC_KEY) {
    return (
      <div className='p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700'>
        Chave pública do Mercado Pago não configurada (VITE_MP_PUBLIC_KEY).
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl border-2 border-gray-200 overflow-hidden'>
      <div className='bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3.5 flex items-center justify-between'>
        <div className='flex items-center gap-2 text-white'>
          <Lock className='w-5 h-5' />
          <span className='font-semibold text-sm'>Dados do Cartão</span>
        </div>
        <div className='flex items-center gap-1.5 text-gray-300'>
          <Shield className='w-3.5 h-3.5' />
          <span className='text-xs'>Mercado Pago</span>
        </div>
      </div>

      <div className='p-4'>
        {!ready && (
          <div className='flex items-center justify-center gap-2 py-8 text-gray-500'>
            <Loader2 className='w-5 h-5 animate-spin' />
            <span className='text-sm'>A carregar pagamento seguro...</span>
          </div>
        )}

        <CardPayment
          initialization={{
            amount: Number(totalAmount),
            ...(payerEmail ? { payer: { email: payerEmail } } : {}),
          }}
          customization={{
            paymentMethods: { maxInstallments: 12 },
            visual: {
              style: { theme: 'default' },
              hidePaymentButton: false,
            },
          }}
          /**
           * O Brick chama onSubmit quando o utilizador confirma.
           * Recebe formData: { token, issuer_id, payment_method_id,
           * transaction_amount, installments, payer: { email, identification } }
           * Deve devolver uma Promise: resolve = sucesso, reject = mostra erro no Brick.
           */
          onSubmit={async formData => {
            return onSubmit(formData);
          }}
          onReady={() => setReady(true)}
          onError={error => {
            console.error('❌ Brick error:', error);
          }}
        />
      </div>

      <div className='px-4 pb-4 flex items-center justify-center gap-3 pt-1'>
        <div className='flex items-center gap-1 text-xs text-gray-400'>
          <Shield className='w-3.5 h-3.5' /> <span>Ambiente seguro</span>
        </div>
        <span className='text-gray-300'>•</span>
        <div className='flex items-center gap-1 text-xs text-gray-400'>
          <Lock className='w-3.5 h-3.5' />{' '}
          <span>Criptografia ponta a ponta</span>
        </div>
      </div>
    </div>
  );
};

export default MercadoPagoCardPayment;
