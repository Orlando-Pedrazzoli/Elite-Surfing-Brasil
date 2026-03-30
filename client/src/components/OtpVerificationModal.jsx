// client/src/components/OtpVerificationModal.jsx
// ═══════════════════════════════════════════════════════════════
// MODAL DE VERIFICAÇÃO DE EMAIL (OTP)
// Elite Surfing Brasil — Guest Checkout Anti-Fraude
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Shield,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const OtpVerificationModal = ({ isOpen, onClose, email, onVerified }) => {
  const { axios } = useAppContext();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVisible, setIsVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hasSentInitial, setHasSentInitial] = useState(false);

  const inputRefs = useRef([]);

  // Animação de entrada
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 50);
      document.body.style.overflow = 'hidden';

      // Enviar OTP automaticamente quando o modal abre (primeira vez)
      if (!hasSentInitial && email) {
        handleSendOtp();
        setHasSentInitial(true);
      }
    } else {
      setIsVisible(false);
      // Reset estados ao fechar
      setOtp(['', '', '', '', '', '']);
      setIsVerified(false);
      setHasSentInitial(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // ═══════════════════════════════════════════════
  // ENVIAR OTP
  // ═══════════════════════════════════════════════
  const handleSendOtp = async () => {
    if (isSending || cooldown > 0) return;

    setIsSending(true);

    try {
      const { data } = await axios.post('/api/otp/send', { email });

      if (data.success) {
        toast.success('Código enviado para ' + email);
        setCooldown(60); // 60 segundos de cooldown
        // Focar no primeiro input
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 100);
      } else {
        toast.error(data.message || 'Erro ao enviar código.');
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        'Erro ao enviar código de verificação.';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  // ═══════════════════════════════════════════════
  // VERIFICAR OTP
  // ═══════════════════════════════════════════════
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      toast.error('Digite o código completo de 6 dígitos.');
      return;
    }

    setIsVerifying(true);

    try {
      const { data } = await axios.post('/api/otp/verify', {
        email,
        otp: otpString,
      });

      if (data.success && data.verificationToken) {
        setIsVerified(true);
        toast.success('Email verificado com sucesso!');

        // Aguardar animação de sucesso e fechar
        setTimeout(() => {
          onVerified(data.verificationToken);
          onClose();
        }, 1200);
      } else {
        toast.error(data.message || 'Código inválido.');
        // Limpar inputs em caso de erro
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
          }
        }, 100);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Erro ao verificar código.';
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    } finally {
      setIsVerifying(false);
    }
  };

  // ═══════════════════════════════════════════════
  // HANDLERS DOS INPUTS OTP
  // ═══════════════════════════════════════════════
  const handleOtpChange = (index, value) => {
    // Aceitar apenas dígitos
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-avançar para o próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar quando todos os 6 dígitos forem preenchidos
    if (value && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        // Pequeno delay para UX
        setTimeout(() => handleVerifyOtp(), 300);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Backspace: voltar para input anterior
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Enter: verificar
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = e => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtp(newOtp);

      // Focar no último dígito preenchido ou verificar se completo
      const lastIndex = Math.min(pastedData.length, 6) - 1;
      if (pastedData.length >= 6) {
        setTimeout(() => handleVerifyOtp(), 300);
      } else {
        inputRefs.current[lastIndex + 1]?.focus();
      }
    }
  };

  const handleClose = () => {
    if (isVerifying) return; // Não fechar enquanto verifica
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className='bg-gradient-to-r from-primary to-primary/80 p-5 text-white'>
          <button
            onClick={handleClose}
            disabled={isVerifying}
            className='absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>

          <div className='flex items-center gap-3'>
            <img
              src='/logo.png'
              alt='Elite Surfing'
              className='w-12 h-12 object-contain'
            />
            <div>
              <h2 className='text-xl font-bold'>Verificação de Email</h2>
              <p className='text-white/80 text-sm'>
                Proteção anti-fraude para sua compra
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className='p-6'>
          {isVerified ? (
            /* ── Estado: Verificado ── */
            <div className='text-center py-8'>
              <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounceIn_0.5s_ease-out]'>
                <CheckCircle2 className='w-10 h-10 text-green-600' />
              </div>
              <h3 className='text-xl font-bold text-gray-800 mb-2'>
                Email Verificado!
              </h3>
              <p className='text-gray-500 text-sm'>
                Continuando com a sua compra...
              </p>
            </div>
          ) : (
            /* ── Estado: Aguardando verificação ── */
            <>
              <div className='text-center mb-6'>
                <div className='w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3'>
                  <Mail className='w-7 h-7 text-primary' />
                </div>
                <p className='text-gray-600 text-sm leading-relaxed'>
                  Enviamos um código de 6 dígitos para
                </p>
                <p className='font-semibold text-gray-800 mt-1'>{email}</p>
              </div>

              {/* OTP Inputs */}
              <div className='flex justify-center gap-2.5 mb-6'>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => (inputRefs.current[index] = el)}
                    type='text'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    disabled={isVerifying}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
                      ${
                        digit
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 bg-gray-50 text-gray-900'
                      }
                      focus:border-primary focus:bg-primary/5 focus:shadow-lg focus:shadow-primary/10
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  />
                ))}
              </div>

              {/* Botão Verificar */}
              <button
                onClick={handleVerifyOtp}
                disabled={otp.join('').length !== 6 || isVerifying}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition-all duration-300 flex items-center justify-center gap-2 mb-4
                  ${
                    otp.join('').length !== 6 || isVerifying
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dull active:scale-[0.98] shadow-md'
                  }
                `}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Shield className='w-5 h-5' />
                    <span>Verificar Código</span>
                  </>
                )}
              </button>

              {/* Reenviar */}
              <div className='text-center'>
                <p className='text-sm text-gray-500 mb-2'>
                  Não recebeu o código?
                </p>
                <button
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || isSending}
                  className={`text-sm font-medium flex items-center gap-1.5 mx-auto transition-colors
                    ${
                      cooldown > 0 || isSending
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-primary hover:text-primary-dull cursor-pointer'
                    }
                  `}
                >
                  {isSending ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>Enviando...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <span>Reenviar em {cooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className='w-4 h-4' />
                      <span>Reenviar código</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info */}
              <div className='mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl'>
                <p className='text-xs text-amber-800 leading-relaxed'>
                  <strong>💡 Dica:</strong> Verifique a caixa de spam ou lixo
                  eletrônico. O código é válido por 10 minutos.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
