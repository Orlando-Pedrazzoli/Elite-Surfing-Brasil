// ═══════════════════════════════════════════════════════════════
// src/pages/BoletoPayment.jsx
// PAGAMENTO BOLETO — ELITE SURFING BRASIL (PAGAR.ME V5)
// Exibe URL do boleto + código de barras + vencimento
// ✅ MIGRAÇÃO 12/03/2026: Criado para substituir fluxo Stripe
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ─── ÍCONES INLINE ───
const IconBoleto = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='32'
    height='32'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M4 7V4h16v3' />
    <path d='M4 20v-3h16v3' />
    <path d='M6 7v10' />
    <path d='M8 7v10' />
    <path d='M11 7v10' />
    <path d='M14 7v10' />
    <path d='M16 7v10' />
    <path d='M18 7v10' />
  </svg>
);
const IconCopy = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
  </svg>
);
const IconCheck = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M20 6 9 17l-5-5' />
  </svg>
);
const IconExternalLink = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M15 3h6v6' />
    <path d='M10 14 21 3' />
    <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' />
  </svg>
);
const IconAlert = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='48'
    height='48'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <line x1='12' x2='12' y1='8' y2='12' />
    <line x1='12' x2='12.01' y1='16' y2='16' />
  </svg>
);

const BoletoPayment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [boletoData, setBoletoData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ═══ CARREGAR DADOS DO BOLETO ═══
  useEffect(() => {
    const savedData = localStorage.getItem('boleto_payment_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.orderId === orderId) {
          setBoletoData(parsed);
        }
      } catch (e) {
        console.error('Erro ao carregar dados do boleto:', e);
      }
    }
    setIsLoading(false);
  }, [orderId]);

  // ═══ COPIAR CÓDIGO DE BARRAS ═══
  const handleCopy = async () => {
    const barcode = boletoData?.boleto?.barcode;
    if (!barcode) return;
    try {
      await navigator.clipboard.writeText(barcode);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = barcode;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success('Código de barras copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  // ═══ FORMATAR BRL ═══
  const fmtBRL = v =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(v);

  // ═══ FORMATAR DATA ═══
  const formatDate = dateStr => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ═══ ORDER ID CURTO ═══
  const shortOrderId = orderId ? orderId.slice(-8).toUpperCase() : '';

  // Loading
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '70vh',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dados não encontrados
  if (!boletoData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: '0 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#ef4444' }}>
          <IconAlert />
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1f2937',
            margin: '16px 0 8px',
          }}
        >
          Dados do boleto não encontrados
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          O link pode ter expirado ou já foi processado.
        </p>
        <button
          onClick={() => navigate('/products')}
          style={{
            background: '#f59e0b',
            color: '#fff',
            padding: '12px 28px',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Voltar para a Loja
        </button>
      </div>
    );
  }

  const { boleto, amount } = boletoData;

  // ═══════════════════════════════════════════════════════════════
  // TELA PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 60,
            height: 60,
            background: '#fef3c7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#d97706',
          }}
        >
          <IconBoleto />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 4px',
          }}
        >
          Boleto Gerado!
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
          Pedido #{shortOrderId}
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Valor */}
        <div
          style={{
            background: '#fffbeb',
            padding: '20px 24px',
            borderBottom: '1px solid #fde68a',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 4px' }}>
            Valor do boleto:
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#b45309',
              margin: '0 0 4px',
            }}
          >
            {fmtBRL(amount)}
          </p>
        </div>

        {/* Vencimento */}
        <div
          style={{
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: '#fff7ed',
            color: '#c2410c',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>Vencimento: {formatDate(boleto?.expiresAt)}</span>
        </div>

        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Botão para abrir o boleto */}
          {boleto?.url && (
            <a
              href={boleto.url}
              target='_blank'
              rel='noopener noreferrer'
              style={{
                width: '100%',
                padding: '16px 0',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#d97706',
                color: '#fff',
                textDecoration: 'none',
                transition: 'all 0.3s',
              }}
            >
              <IconExternalLink />
              Abrir Boleto (PDF)
            </a>
          )}

          {/* Código de barras */}
          {boleto?.barcode && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  margin: '4px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span
                  style={{
                    padding: '0 12px',
                    fontSize: 11,
                    color: '#9ca3af',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  CÓDIGO DE BARRAS
                </span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>

              <div style={{ width: '100%' }}>
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#6b7280',
                      wordBreak: 'break-all',
                      lineHeight: 1.5,
                      margin: 0,
                      userSelect: 'all',
                    }}
                  >
                    {boleto.barcode}
                  </p>
                </div>

                <button
                  onClick={handleCopy}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.3s',
                    background: copied ? '#16a34a' : '#111827',
                    color: '#fff',
                  }}
                >
                  {copied ? (
                    <>
                      <IconCheck /> Código Copiado!
                    </>
                  ) : (
                    <>
                      <IconCopy /> Copiar Código de Barras
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div
        style={{
          marginTop: 20,
          padding: '16px 20px',
          background: '#eff6ff',
          borderRadius: 12,
          border: '1px solid #bfdbfe',
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1e40af',
            margin: '0 0 10px',
          }}
        >
          📋 Como pagar o boleto:
        </p>
        <div style={{ fontSize: 13, color: '#1e3a5f', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 4px' }}>
            1. Clique em "Abrir Boleto" ou copie o código de barras
          </p>
          <p style={{ margin: '0 0 4px' }}>
            2. Abra o app do seu banco ou vá a uma casa lotérica
          </p>
          <p style={{ margin: '0 0 4px' }}>
            3. Escolha pagar com <b>Boleto</b> e cole o código
          </p>
          <p style={{ margin: '0 0 4px' }}>4. Confirme o pagamento</p>
          <p style={{ margin: 0 }}>
            5. A confirmação chegará por e-mail em até 3 dias úteis 📧
          </p>
        </div>
      </div>

      {/* Aviso */}
      <div
        style={{
          marginTop: 12,
          padding: '12px 20px',
          background: '#fefce8',
          borderRadius: 12,
          border: '1px solid #fde68a',
        }}
      >
        <p
          style={{ fontSize: 12, color: '#854d0e', margin: 0, lineHeight: 1.6 }}
        >
          ⚠️ <b>Importante:</b> O boleto vence em{' '}
          <b>{formatDate(boleto?.expiresAt)}</b>. Após o vencimento, o pedido
          será cancelado automaticamente. Também enviamos o boleto para o seu
          e-mail.
        </p>
      </div>

      {/* Aviso de confirmação por email */}
      <div
        style={{
          marginTop: 12,
          padding: '12px 20px',
          background: '#f0fdf4',
          borderRadius: 12,
          border: '1px solid #bbf7d0',
        }}
      >
        <p
          style={{ fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.6 }}
        >
          📧 <b>Verifique seu e-mail!</b> Enviamos os dados do boleto para o
          e-mail cadastrado. Se não encontrar, verifique a pasta de spam.
        </p>
      </div>

      {/* Voltar */}
      <div style={{ textAlign: 'center', marginTop: 20, paddingBottom: 20 }}>
        <button
          onClick={() => navigate('/products')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: 14,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Continuar comprando
        </button>
      </div>
    </div>
  );
};

export default BoletoPayment;
