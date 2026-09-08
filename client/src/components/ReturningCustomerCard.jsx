// client/src/components/ReturningCustomerCard.jsx
// ═══════════════════════════════════════════════════════════════
// 🔑 CLIENTE RECORRENTE — Login sem senha no carrinho
// ═══════════════════════════════════════════════════════════════
// Padrão "email-first" (Shopify/Amazon): o cliente informa só o
// email; se já tem conta, recebe um código de 6 dígitos e entra
// sem lembrar senha. Endereços e histórico carregam na hora.
//
// Regra de OURO ao logar a partir do carrinho: MERGE dos carrinhos
// (itens da sessão atual PREVALECEM sobre o carrinho antigo do
// servidor) — nunca apagar o que o cliente acabou de escolher.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { Mail, KeyRound, Loader2, ArrowLeft, UserCheck } from 'lucide-react';

const RESEND_COOLDOWN = 60; // segundos (igual ao rate limit do backend)

const ReturningCustomerCard = () => {
  const {
    axios,
    setUser,
    setAuthToken,
    saveUserToStorage,
    cartItems,
    setCartItems,
    saveCartToStorage,
    setShowUserLogin,
  } = useAppContext();

  // step: 'email' → 'otp' | 'noAccount'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputRef = useRef(null);

  // Countdown do reenvio
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Foco automático no campo do código
  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ─── Passo 1: verificar email + enviar código ──────────────────
  const handleEmailSubmit = async e => {
    e?.preventDefault();
    const clean = email.toLowerCase().trim();
    if (!isValidEmail(clean)) {
      toast.error('Digite um email válido.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/user/check-email', {
        email: clean,
      });

      if (!data.success) {
        toast.error(data.message || 'Erro ao verificar email.');
        return;
      }

      if (!data.exists) {
        setStep('noAccount');
        return;
      }

      // Conta existe → enviar OTP (mesma infra do guest checkout)
      setUserName(data.userName);
      const sendRes = await axios.post('/api/otp/send', { email: clean });
      if (sendRes.data.success) {
        setStep('otp');
        setCountdown(RESEND_COOLDOWN);
        toast.success('Código enviado! Confira seu email.', { icon: '📧' });
      } else {
        toast.error(sendRes.data.message || 'Erro ao enviar código.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao verificar email.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reenviar código ───────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/otp/send', {
        email: email.toLowerCase().trim(),
      });
      if (data.success) {
        setCountdown(RESEND_COOLDOWN);
        toast.success('Novo código enviado!', { icon: '📧' });
      } else {
        toast.error(data.message || 'Erro ao reenviar código.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao reenviar.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Passo 2: verificar código + login + MERGE do carrinho ─────
  const handleOtpSubmit = async e => {
    e?.preventDefault();
    const cleanOtp = otp.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      toast.error('O código tem 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/user/login-otp', {
        email: email.toLowerCase().trim(),
        otp: cleanOtp,
      });

      if (!data.success) {
        if (data.noAccount) {
          setStep('noAccount');
        } else {
          toast.error(data.message || 'Código inválido.');
        }
        return;
      }

      // ═══ MERGE DE CARRINHOS ═══
      // Itens escolhidos AGORA (local) prevalecem sobre o carrinho
      // antigo do servidor. O efeito de auto-sync do AppContext
      // envia o carrinho unificado ao servidor após o setUser.
      const serverCart = data.user.cartItems || {};
      const mergedCart = { ...serverCart, ...cartItems };
      setCartItems(mergedCart);
      saveCartToStorage(mergedCart);

      // Sessão (mesmo mecanismo do login por senha)
      if (data.token) setAuthToken(data.token);
      saveUserToStorage(data.user);
      setUser(data.user);

      const firstName = data.user.name?.split(' ')[0] || '';
      toast.success(
        `Bem-vindo de volta, ${firstName}! Seus endereços foram carregados.`,
        { icon: '👋', duration: 4000 },
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep('email');
    setOtp('');
    setUserName(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className='mb-6 border border-primary/30 bg-primary/5 rounded-xl p-4'>
      {/* ─── PASSO: EMAIL ─── */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit}>
          <div className='flex items-center gap-2 mb-1'>
            <UserCheck className='w-5 h-5 text-primary flex-shrink-0' />
            <p className='font-semibold text-gray-800'>
              Já comprou na Elite Surfing?
            </p>
          </div>
          <p className='text-sm text-gray-500 mb-3'>
            Entre com seu email — sem senha. Enviamos um código e seus endereços
            carregam automaticamente.
          </p>
          <div className='flex flex-col sm:flex-row gap-2'>
            <div className='relative flex-1'>
              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='seu@email.com'
                autoComplete='email'
                className='w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm'
              />
            </div>
            <button
              type='submit'
              disabled={loading || !isValidEmail(email.trim())}
              className='px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2 whitespace-nowrap'
            >
              {loading ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── PASSO: CÓDIGO OTP ─── */}
      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit}>
          <div className='flex items-center gap-2 mb-1'>
            <KeyRound className='w-5 h-5 text-primary flex-shrink-0' />
            <p className='font-semibold text-gray-800'>
              {userName ? `Olá, ${userName}!` : 'Quase lá!'}
            </p>
          </div>
          <p className='text-sm text-gray-500 mb-3'>
            Enviamos um código de 6 dígitos para{' '}
            <span className='font-medium text-gray-700'>{email}</span>
          </p>
          <div className='flex flex-col sm:flex-row gap-2'>
            <input
              ref={otpInputRef}
              type='text'
              inputMode='numeric'
              value={otp}
              onChange={e =>
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder='000000'
              maxLength={6}
              className='flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-center text-lg font-mono tracking-[0.4em]'
            />
            <button
              type='submit'
              disabled={loading || otp.length !== 6}
              className='px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2 whitespace-nowrap'
            >
              {loading ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                'Entrar'
              )}
            </button>
          </div>
          <div className='flex items-center justify-between mt-3 text-xs'>
            <button
              type='button'
              onClick={resetToEmail}
              className='flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors'
            >
              <ArrowLeft className='w-3.5 h-3.5' />
              Trocar email
            </button>
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className='text-primary hover:underline disabled:text-gray-400 disabled:no-underline'
              >
                {countdown > 0
                  ? `Reenviar em ${countdown}s`
                  : 'Reenviar código'}
              </button>
              <button
                type='button'
                onClick={() => setShowUserLogin(true)}
                className='text-gray-500 hover:text-gray-700 hover:underline'
              >
                Entrar com senha
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─── PASSO: SEM CADASTRO ─── */}
      {step === 'noAccount' && (
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Mail className='w-5 h-5 text-primary flex-shrink-0' />
            <p className='font-semibold text-gray-800'>
              Não encontramos cadastro com este email
            </p>
          </div>
          <p className='text-sm text-gray-500 mb-3'>
            Sem problema! Continue a compra normalmente abaixo — é rápido e você
            pode criar sua conta depois do pedido.
          </p>
          <button
            type='button'
            onClick={resetToEmail}
            className='flex items-center gap-1 text-xs text-primary hover:underline'
          >
            <ArrowLeft className='w-3.5 h-3.5' />
            Tentar outro email
          </button>
        </div>
      )}
    </div>
  );
};

export default ReturningCustomerCard;
