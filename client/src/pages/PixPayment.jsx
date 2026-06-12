// ═══════════════════════════════════════════════════════════════
// src/pages/PixPayment.jsx
// PIX NATIVO MERCADO PAGO — QR dinâmico + Copia e Cola + polling
// O QR vem do backend (mpPixQrCodeBase64 / mpPixQrCode). A página
// faz polling do status e avança sozinha quando o webhook confirma.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const IconQR = () => (
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
    <rect width='5' height='5' x='3' y='3' rx='1' />
    <rect width='5' height='5' x='16' y='3' rx='1' />
    <rect width='5' height='5' x='3' y='16' rx='1' />
    <path d='M21 16h-3a2 2 0 0 0-2 2v3' />
    <path d='M21 21v.01' />
    <path d='M12 7v3a2 2 0 0 1-2 2H7' />
    <path d='M3 12h.01' />
    <path d='M12 3h.01' />
    <path d='M12 16v.01' />
    <path d='M16 12h1' />
    <path d='M21 12v.01' />
    <path d='M12 21v-1' />
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
const IconClock = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <polyline points='12 6 12 12 16 14' />
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

const PixPayment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { axios, user } = useAppContext();

  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const countdownRef = useRef(null);
  const pollRef = useRef(null);

  // ═══ CARREGAR DADOS DO PIX (gerados no backend) ═══
  useEffect(() => {
    const saved = localStorage.getItem('pix_payment_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.orderId === orderId) {
          setPixData(parsed);
          if (parsed.expiresAt) {
            const remaining = Math.max(
              0,
              Math.floor(
                (new Date(parsed.expiresAt).getTime() - Date.now()) / 1000,
              ),
            );
            setTimeLeft(remaining);
            if (remaining <= 0) setIsExpired(true);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar dados PIX:', e);
      }
    }
    setIsLoading(false);
  }, [orderId]);

  // ═══ COUNTDOWN ═══
  useEffect(() => {
    if (isExpired || isPaid || timeLeft <= 0) return;
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [isExpired, isPaid, timeLeft]);

  // ═══ POLLING DE STATUS (a cada 5s) ═══
  useEffect(() => {
    if (!pixData || isPaid || isExpired) return;

    const check = async () => {
      try {
        const { data } = await axios.get(
          `/api/mercadopago/payment-status/${orderId}`,
        );
        if (data.success && data.isPaid) {
          setIsPaid(true);
          clearInterval(pollRef.current);
          clearInterval(countdownRef.current);
          localStorage.removeItem('pix_payment_data');
          toast.success('Pagamento confirmado!');
          setTimeout(() => {
            navigate(
              `/order-success/${orderId}?payment=mercadopago&method=pix${!user ? '&guest=true' : ''}`,
            );
          }, 1200);
        }
      } catch (e) {
        // silencioso — tenta de novo no próximo ciclo
      }
    };

    pollRef.current = setInterval(check, 5000);
    check();
    return () => clearInterval(pollRef.current);
  }, [pixData, isPaid, isExpired, orderId, axios, navigate, user]);

  // ═══ COPIAR ═══
  const handleCopy = async () => {
    const code = pixData?.pix?.qrCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const fmtTime = s => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };
  const fmtBRL = v =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(v);

  // ─── ESTADOS DE TELA ───
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
            borderTopColor: '#16a34a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isPaid) {
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
        <div
          style={{
            width: 70,
            height: 70,
            background: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a',
          }}
        >
          <IconCheck />
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#15803d',
            margin: '16px 0 8px',
          }}
        >
          Pagamento confirmado!
        </h2>
        <p style={{ color: '#6b7280' }}>A redirecionar para o seu pedido...</p>
      </div>
    );
  }

  if (!pixData) {
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
          Dados do pagamento não encontrados
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          O link pode ter expirado ou já foi processado.
        </p>
        <button
          onClick={() => navigate('/products')}
          style={{
            background: '#16a34a',
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

  if (isExpired) {
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
        <div style={{ color: '#f59e0b' }}>
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
          Tempo Expirado
        </h2>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          O prazo para pagamento expirou. Faça o pedido novamente.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('pix_payment_data');
            navigate('/cart');
          }}
          style={{
            background: '#16a34a',
            color: '#fff',
            padding: '12px 28px',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Voltar ao Carrinho
        </button>
      </div>
    );
  }

  const qrImg = pixData.pix?.qrCodeBase64
    ? `data:image/png;base64,${pixData.pix.qrCodeBase64}`
    : '';

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 60,
            height: 60,
            background: '#dcfce7',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#16a34a',
          }}
        >
          <IconQR />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#111827',
            margin: '0 0 4px',
          }}
        >
          Pagamento via PIX
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
          Pedido #{orderId.slice(-8).toUpperCase()}
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: '#f0fdf4',
            padding: '20px 24px',
            borderBottom: '1px solid #bbf7d0',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 4px' }}>
            Valor a pagar:
          </p>
          <p
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#15803d',
              margin: '0 0 4px',
            }}
          >
            {fmtBRL(pixData.amount)}
          </p>
          <p
            style={{
              color: '#16a34a',
              fontSize: 12,
              fontWeight: 600,
              margin: 0,
            }}
          >
            ✓ Desconto de 10% no PIX já aplicado
          </p>
        </div>

        <div
          style={{
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: timeLeft < 300 ? '#fef2f2' : '#fffbeb',
            color: timeLeft < 300 ? '#b91c1c' : '#b45309',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <IconClock />
          <span>
            Pague em até:{' '}
            <b style={{ fontFamily: 'monospace' }}>{fmtTime(timeLeft)}</b>
          </span>
        </div>

        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {qrImg && (
            <div
              style={{
                padding: 10,
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
              }}
            >
              <img
                src={qrImg}
                alt='QR Code PIX'
                width={260}
                height={260}
                style={{ display: 'block' }}
              />
            </div>
          )}
          <p
            style={{
              color: '#9ca3af',
              fontSize: 13,
              margin: '12px 0 0',
              textAlign: 'center',
            }}
          >
            Abra o app do banco → PIX → <b>Escanear QR Code</b>
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              margin: '20px 0',
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
              OU PIX COPIA E COLA
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
                  fontSize: 11,
                  color: '#6b7280',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                  margin: 0,
                  userSelect: 'all',
                }}
              >
                {pixData.pix?.qrCode}
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
                  <IconCopy /> Copiar Código PIX
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: '14px 20px',
          background: '#eff6ff',
          borderRadius: 12,
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            border: '2px solid #bfdbfe',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <p style={{ fontSize: 13, color: '#1e40af', margin: 0 }}>
          Aguardando confirmação automática do pagamento. Esta página atualiza
          sozinha. 📧
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

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

export default PixPayment;
