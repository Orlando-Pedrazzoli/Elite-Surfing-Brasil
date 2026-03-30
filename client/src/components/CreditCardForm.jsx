import { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Lock,
  AlertCircle,
  Shield,
  Loader2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { calculateInstallments, formatBRL } from '../utils/installmentUtils';

// ═══════════════════════════════════════════════════════════════
// 💳 FORMULÁRIO DE CARTÃO — TRANSPARENT CHECKOUT PAGAR.ME V5
// ═══════════════════════════════════════════════════════════════
// Tokeniza os dados do cartão diretamente com a API Pagar.me
// Nunca envia dados do cartão ao nosso servidor
// ═══════════════════════════════════════════════════════════════

const PAGARME_PUBLIC_KEY = import.meta.env.VITE_PAGARME_PUBLIC_KEY;

const CreditCardForm = ({
  totalAmount,
  onSubmit,
  isProcessing,
  customerDocument,
  setCustomerDocument,
}) => {
  // ─── Estado do formulário ─────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [installments, setInstallments] = useState(1);
  const [showInstallments, setShowInstallments] = useState(false);
  const [errors, setErrors] = useState({});
  const [cardBrand, setCardBrand] = useState('');
  const [isTokenizing, setIsTokenizing] = useState(false);

  const installmentRef = useRef(null);

  // Calcular parcelas disponíveis
  const installmentData = calculateInstallments(totalAmount);
  const availableInstallments = installmentData.allInstallments;

  // ─── Detectar bandeira do cartão ────────────────────────────
  useEffect(() => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.startsWith('4')) setCardBrand('visa');
    else if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits))
      setCardBrand('mastercard');
    else if (
      /^636368|438935|504175|451416|636297|5067|4576|4011|506699/.test(digits)
    )
      setCardBrand('elo');
    else if (/^3[47]/.test(digits)) setCardBrand('amex');
    else if (/^606282|384100|384140|384160/.test(digits))
      setCardBrand('hipercard');
    else setCardBrand('');
  }, [cardNumber]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = e => {
      if (
        installmentRef.current &&
        !installmentRef.current.contains(e.target)
      ) {
        setShowInstallments(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Formatação dos campos ──────────────────────────────────
  const formatCardNumber = value => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.substring(0, 16);
    return limited.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = value => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return digits.substring(0, 2) + '/' + digits.substring(2, 4);
    }
    return digits;
  };

  const formatCPF = value => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.substring(0, 11);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6)
      return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9)
      return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  // ─── Validação ──────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    const digits = cardNumber.replace(/\D/g, '');
    const cpfDigits = customerDocument.replace(/\D/g, '');

    if (digits.length < 13 || digits.length > 19) {
      newErrors.cardNumber = 'Número do cartão inválido';
    }
    if (!cardName.trim() || cardName.trim().split(' ').length < 2) {
      newErrors.cardName = 'Nome completo como no cartão';
    }

    const expiryParts = cardExpiry.split('/');
    if (
      expiryParts.length !== 2 ||
      expiryParts[0].length !== 2 ||
      expiryParts[1].length !== 2
    ) {
      newErrors.cardExpiry = 'Data inválida (MM/AA)';
    } else {
      const month = parseInt(expiryParts[0]);
      const year = parseInt('20' + expiryParts[1]);
      const now = new Date();
      if (month < 1 || month > 12) {
        newErrors.cardExpiry = 'Mês inválido';
      } else if (
        year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)
      ) {
        newErrors.cardExpiry = 'Cartão expirado';
      }
    }

    if (cardCVV.length < 3 || cardCVV.length > 4) {
      newErrors.cardCVV = 'CVV inválido';
    }

    if (cpfDigits.length !== 11) {
      newErrors.cpf = 'CPF inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Tokenizar cartão com Pagar.me ─────────────────────────
  const tokenizeCard = async () => {
    const digits = cardNumber.replace(/\D/g, '');
    const expiryParts = cardExpiry.split('/');

    const tokenPayload = {
      card: {
        number: digits,
        holder_name: cardName.trim().toUpperCase(),
        exp_month: parseInt(expiryParts[0]),
        exp_year: parseInt('20' + expiryParts[1]),
        cvv: cardCVV,
        holder_document: customerDocument.replace(/\D/g, ''),
      },
      type: 'card',
    };

    const response = await fetch(
      `https://api.pagar.me/core/v5/tokens?appId=${PAGARME_PUBLIC_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenPayload),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.id) {
      console.error('❌ Tokenização falhou:', data);
      throw new Error(data.message || 'Erro ao processar dados do cartão');
    }

    return data.id; // token_xxxxxxxx
  };

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = async e => {
    e?.preventDefault();

    if (!validate()) return;

    setIsTokenizing(true);

    try {
      // 1. Tokenizar cartão no Pagar.me (client-side)
      const cardToken = await tokenizeCard();
      console.log('✅ Card tokenizado:', cardToken.substring(0, 15) + '...');

      // 2. Enviar token + dados para o nosso backend
      onSubmit({
        cardToken,
        installments,
        customerDocument: customerDocument.replace(/\D/g, ''),
        cardBrand,
      });
    } catch (error) {
      console.error('❌ Erro na tokenização:', error);
      setErrors({
        general:
          error.message ||
          'Erro ao processar o cartão. Verifique os dados e tente novamente.',
      });
    } finally {
      setIsTokenizing(false);
    }
  };

  const getBrandIcon = () => {
    switch (cardBrand) {
      case 'visa':
        return (
          <span className='text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded'>
            VISA
          </span>
        );
      case 'mastercard':
        return (
          <span className='text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded'>
            MC
          </span>
        );
      case 'elo':
        return (
          <span className='text-xs font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded'>
            ELO
          </span>
        );
      case 'amex':
        return (
          <span className='text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded'>
            AMEX
          </span>
        );
      case 'hipercard':
        return (
          <span className='text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded'>
            HIPER
          </span>
        );
      default:
        return <CreditCard className='w-5 h-5 text-gray-400' />;
    }
  };

  const selectedInstallment =
    availableInstallments.find(i => i.times === installments) ||
    availableInstallments[0];

  return (
    <div className='bg-white rounded-xl border-2 border-gray-200 overflow-hidden'>
      {/* Header */}
      <div className='bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3.5 flex items-center justify-between'>
        <div className='flex items-center gap-2 text-white'>
          <CreditCard className='w-5 h-5' />
          <span className='font-semibold text-sm'>Dados do Cartão</span>
        </div>
        <div className='flex items-center gap-1.5 text-gray-300'>
          <Lock className='w-3.5 h-3.5' />
          <span className='text-xs'>Pagamento seguro</span>
        </div>
      </div>

      <div className='p-5 space-y-4'>
        {/* Erro geral */}
        {errors.general && (
          <div className='flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700'>
            <AlertCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Número do cartão */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1.5'>
            Número do Cartão
          </label>
          <div className='relative'>
            <input
              type='text'
              inputMode='numeric'
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder='0000 0000 0000 0000'
              maxLength={19}
              className={`w-full pl-4 pr-16 py-3 border rounded-lg text-base tracking-wider focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ${
                errors.cardNumber
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
              {getBrandIcon()}
            </div>
          </div>
          {errors.cardNumber && (
            <p className='text-xs text-red-600 mt-1'>{errors.cardNumber}</p>
          )}
        </div>

        {/* Nome no cartão */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1.5'>
            Nome no Cartão
          </label>
          <input
            type='text'
            value={cardName}
            onChange={e => setCardName(e.target.value.toUpperCase())}
            placeholder='NOME COMO IMPRESSO NO CARTÃO'
            className={`w-full px-4 py-3 border rounded-lg text-base uppercase focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ${
              errors.cardName ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.cardName && (
            <p className='text-xs text-red-600 mt-1'>{errors.cardName}</p>
          )}
        </div>

        {/* Validade + CVV (lado a lado) */}
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              Validade
            </label>
            <input
              type='text'
              inputMode='numeric'
              value={cardExpiry}
              onChange={e => setCardExpiry(formatExpiry(e.target.value))}
              placeholder='MM/AA'
              maxLength={5}
              className={`w-full px-4 py-3 border rounded-lg text-base text-center tracking-wider focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ${
                errors.cardExpiry
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {errors.cardExpiry && (
              <p className='text-xs text-red-600 mt-1'>{errors.cardExpiry}</p>
            )}
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              CVV
            </label>
            <input
              type='text'
              inputMode='numeric'
              value={cardCVV}
              onChange={e =>
                setCardCVV(e.target.value.replace(/\D/g, '').substring(0, 4))
              }
              placeholder='000'
              maxLength={4}
              className={`w-full px-4 py-3 border rounded-lg text-base text-center tracking-wider focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ${
                errors.cardCVV ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.cardCVV && (
              <p className='text-xs text-red-600 mt-1'>{errors.cardCVV}</p>
            )}
          </div>
        </div>

        {/* CPF do titular */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1.5'>
            CPF do Titular
          </label>
          <input
            type='text'
            inputMode='numeric'
            value={customerDocument}
            onChange={e => setCustomerDocument(formatCPF(e.target.value))}
            placeholder='000.000.000-00'
            maxLength={14}
            className={`w-full px-4 py-3 border rounded-lg text-base tracking-wider focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none ${
              errors.cpf ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.cpf && (
            <p className='text-xs text-red-600 mt-1'>{errors.cpf}</p>
          )}
        </div>

        {/* Selector de Parcelas */}
        {availableInstallments.length > 1 && (
          <div ref={installmentRef}>
            <label className='block text-sm font-medium text-gray-700 mb-1.5'>
              Parcelas
            </label>
            <div className='relative'>
              <button
                type='button'
                onClick={() => setShowInstallments(!showInstallments)}
                className='w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-left'
              >
                <span className='text-base font-medium text-gray-800'>
                  {selectedInstallment.times}x de{' '}
                  {formatBRL(selectedInstallment.value)}
                  <span className='text-green-600 text-sm ml-1.5'>
                    sem juros
                  </span>
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${showInstallments ? 'rotate-180' : ''}`}
                />
              </button>

              {showInstallments && (
                <div className='absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto'>
                  {availableInstallments.map(inst => (
                    <button
                      key={inst.times}
                      type='button'
                      onClick={() => {
                        setInstallments(inst.times);
                        setShowInstallments(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left ${
                        installments === inst.times ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div>
                        <span className='text-sm font-medium text-gray-800'>
                          {inst.times}x de {formatBRL(inst.value)}
                        </span>
                        <span className='text-xs text-green-600 ml-1.5'>
                          sem juros
                        </span>
                        {inst.times === 1 && (
                          <span className='text-xs text-gray-400 ml-1.5'>
                            (total: {formatBRL(totalAmount)})
                          </span>
                        )}
                      </div>
                      {installments === inst.times && (
                        <Check className='w-4 h-4 text-primary' />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo do pagamento */}
        <div className='bg-gray-50 rounded-lg p-3 mt-2'>
          <div className='flex justify-between items-center text-sm'>
            <span className='text-gray-600'>Total no cartão:</span>
            <span className='font-bold text-gray-800 text-base'>
              {formatBRL(totalAmount)}
            </span>
          </div>
          {installments > 1 && (
            <div className='flex justify-between items-center text-sm mt-1'>
              <span className='text-gray-500'>{installments}x de</span>
              <span className='font-semibold text-gray-700'>
                {formatBRL(totalAmount / installments)} sem juros
              </span>
            </div>
          )}
        </div>

        {/* Botão de pagar */}
        <button
          type='button'
          onClick={handleSubmit}
          disabled={isProcessing || isTokenizing}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2
            ${
              isProcessing || isTokenizing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dull active:scale-[0.98]'
            }`}
        >
          {isProcessing || isTokenizing ? (
            <>
              <Loader2 className='w-5 h-5 animate-spin' />
              <span>
                {isTokenizing
                  ? 'Processando cartão...'
                  : 'Finalizando pagamento...'}
              </span>
            </>
          ) : (
            <>
              <Lock className='w-5 h-5' />
              <span>
                Pagar{' '}
                {installments > 1
                  ? `${installments}x de ${formatBRL(totalAmount / installments)}`
                  : formatBRL(totalAmount)}
              </span>
            </>
          )}
        </button>

        {/* Trust badges */}
        <div className='flex items-center justify-center gap-3 pt-2'>
          <div className='flex items-center gap-1 text-xs text-gray-400'>
            <Shield className='w-3.5 h-3.5' />
            <span>Ambiente seguro</span>
          </div>
          <span className='text-gray-300'>•</span>
          <div className='flex items-center gap-1 text-xs text-gray-400'>
            <Lock className='w-3.5 h-3.5' />
            <span>Criptografia SSL</span>
          </div>
          <span className='text-gray-300'>•</span>
          <span className='text-xs text-gray-400'>Pagar.me</span>
        </div>
      </div>
    </div>
  );
};

export default CreditCardForm;
