import { useState, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatBRL } from '../utils/installmentUtils';
import { formatCep, isValidCep } from '../utils/shippingUtils';
import { Truck, Gift, Package } from 'lucide-react';

const ShippingCalculator = ({ product, cartProducts, onShippingSelect, subtotal = 0 }) => {
  const { axios } = useAppContext();
  const [cep, setCep] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  // ═══════════════════════════════════════════════════════════════
  // FRETE GRÁTIS — thresholds e progresso (antes do cálculo)
  // ═══════════════════════════════════════════════════════════════
  const FREE_THRESHOLD_SUL_SUDESTE = 199;
  const FREE_THRESHOLD_DEMAIS = 299;

  // Info de frete grátis retornada pelo backend (após cálculo)
  const freeShippingInfo = results?.freeShippingInfo || null;

  // Progresso genérico (antes de saber o CEP/região)
  const genericProgress = useMemo(() => {
    if (subtotal >= FREE_THRESHOLD_DEMAIS) {
      return { qualifies: true, message: 'Você tem frete grátis para todo o Brasil!' };
    }
    if (subtotal >= FREE_THRESHOLD_SUL_SUDESTE) {
      const remaining = FREE_THRESHOLD_DEMAIS - subtotal;
      return {
        qualifies: 'partial',
        message: `Frete grátis para Sul e Sudeste! Faltam ${formatBRL(remaining)} para frete grátis em todo o Brasil.`,
      };
    }
    // Abaixo de 199 — mostrar o mais próximo
    const remaining = FREE_THRESHOLD_SUL_SUDESTE - subtotal;
    return {
      qualifies: false,
      remaining,
      message: `Faltam ${formatBRL(remaining)} para frete grátis (Sul/Sudeste)`,
      percentage: Math.min(100, (subtotal / FREE_THRESHOLD_SUL_SUDESTE) * 100),
    };
  }, [subtotal]);

  // Progresso específico (após saber a região via backend)
  const regionProgress = useMemo(() => {
    if (!freeShippingInfo) return null;
    const { qualifies, amountRemaining, threshold, region } = freeShippingInfo;
    const regionLabel = region === 'sul_sudeste' ? 'Sul/Sudeste' : 'sua região';

    if (qualifies) {
      return { qualifies: true, message: `Frete grátis para ${regionLabel}!` };
    }
    return {
      qualifies: false,
      remaining: amountRemaining,
      message: `Faltam ${formatBRL(amountRemaining)} para frete grátis para ${regionLabel}`,
      percentage: Math.min(100, (subtotal / threshold) * 100),
    };
  }, [freeShippingInfo, subtotal]);

  const handleCepChange = (e) => {
    const formatted = formatCep(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 8) {
      setCep(formatted);
      setError('');
    }
  };

  const handleCalculate = useCallback(async () => {
    if (!isValidCep(cep)) {
      setError('Digite um CEP válido com 8 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setSelectedOption(null);
    if (onShippingSelect) onShippingSelect(null);

    try {
      let body = { cep };

      if (cartProducts && cartProducts.length > 0) {
        body.products = cartProducts.map((p) => ({
          productId: p._id,
          quantity: p.quantity || 1,
        }));
      } else if (product) {
        body.product = {
          _id: product._id,
          weight: product.weight,
          dimensions: product.dimensions,
          offerPrice: product.offerPrice,
          quantity: 1,
        };
      }

      const { data } = await axios.post('/api/shipping/calculate', body);

      if (data.success) {
        setResults(data);
      } else {
        setError(data.message || 'Erro ao calcular frete.');
      }
    } catch (err) {
      console.error('Erro no cálculo de frete:', err);
      setError('Erro ao calcular frete. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [cep, product, cartProducts, axios, onShippingSelect]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    if (onShippingSelect) {
      onShippingSelect(option);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // FILTRAR TOP 5 + IDENTIFICAR MAIS BARATA E MAIS RÁPIDA
  // ═══════════════════════════════════════════════════════════════
  const { filteredOptions, cheapestId, fastestId } = useMemo(() => {
    if (!results?.options || results.options.length === 0) {
      return { filteredOptions: [], cheapestId: null, fastestId: null };
    }

    const regularOptions = [...results.options];

    // Remover duplicatas por transportadora (manter a mais barata de cada)
    const uniqueByCarrier = new Map();
    for (const opt of regularOptions) {
      const key = opt.carrier;
      if (!uniqueByCarrier.has(key) || opt.price < uniqueByCarrier.get(key).price) {
        uniqueByCarrier.set(key, opt);
      }
    }
    let unique = Array.from(uniqueByCarrier.values());

    // Ordenar por preço (mais barata primeiro)
    unique.sort((a, b) => a.price - b.price);

    // Pegar top 5
    const top5 = unique.slice(0, 5);

    // Identificar mais barata e mais rápida (entre as regulares)
    const cheapest = top5.length > 0
      ? top5.reduce((min, opt) => (opt.price < min.price ? opt : min), top5[0])
      : null;
    const fastest = top5.length > 0
      ? top5.reduce((min, opt) => (opt.deliveryDays < min.deliveryDays ? opt : min), top5[0])
      : null;

    // Montar lista final
    const finalOptions = top5;

    return {
      filteredOptions: finalOptions,
      cheapestId: cheapest?.id,
      fastestId: fastest?.id,
    };
  }, [results]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER — Progress Bar de Frete Grátis
  // ═══════════════════════════════════════════════════════════════
  const renderFreeShippingProgress = () => {
    // Se já tem resultado do backend, usar info específica da região
    const progress = regionProgress || genericProgress;
    if (!progress) return null;

    // Já qualifica para frete grátis completo
    if (progress.qualifies === true) {
      return (
        <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <Gift className='w-4 h-4 text-green-600' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-semibold text-green-800'>
                🎉 {progress.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Qualifica parcial (Sul/Sudeste sim, demais não)
    if (progress.qualifies === 'partial') {
      return (
        <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
              <Truck className='w-4 h-4 text-blue-600' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium text-blue-800'>
                ✅ {progress.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Não qualifica — mostrar barra de progresso
    const percentage = progress.percentage || 0;
    return (
      <div className='mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg'>
        <div className='flex items-center gap-2 mb-2'>
          <div className='w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0'>
            <Truck className='w-4 h-4 text-amber-600' />
          </div>
          <div className='flex-1'>
            <p className='text-sm font-medium text-amber-800'>
              {progress.message}
            </p>
          </div>
        </div>
        {/* Barra de Progresso */}
        <div className='w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden'>
          <div
            className='h-full rounded-full transition-all duration-500 ease-out'
            style={{
              width: `${percentage}%`,
              background: percentage >= 80
                ? 'linear-gradient(90deg, #f59e0b, #22c55e)'
                : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            }}
          />
        </div>
        <div className='flex justify-between mt-1'>
          <span className='text-[10px] text-amber-600'>{formatBRL(subtotal)}</span>
          <span className='text-[10px] text-amber-600 font-semibold'>
            {formatBRL(freeShippingInfo?.threshold || FREE_THRESHOLD_SUL_SUDESTE)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className='bg-white border border-gray-200 rounded-lg p-4'>
      <h3 className='text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2'>
        <svg className='w-4 h-4 text-gray-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
        </svg>
        Calcular Frete e Prazo
      </h3>

      {/* ═══ BARRA DE PROGRESSO FRETE GRÁTIS ═══ */}
      {subtotal > 0 && renderFreeShippingProgress()}

      {/* Input CEP */}
      <div className='flex gap-2'>
        <input
          type='text'
          value={cep}
          onChange={handleCepChange}
          onKeyDown={handleKeyDown}
          placeholder='00000-000'
          maxLength={9}
          className='flex-1 py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary focus:outline-none transition-colors text-sm font-mono'
        />
        <button
          onClick={handleCalculate}
          disabled={loading || cep.replace(/\D/g, '').length < 8}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
            loading || cep.replace(/\D/g, '').length < 8
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dull active:scale-95'
          }`}
        >
          {loading ? (
            <div className='flex items-center gap-2'>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              <span>Calculando</span>
            </div>
          ) : (
            'Calcular'
          )}
        </button>
      </div>

      {/* Link Busca CEP */}
      <a
        href='https://buscacepinter.correios.com.br/app/endereco/index.php'
        target='_blank'
        rel='noopener noreferrer'
        className='text-xs text-primary hover:underline mt-1.5 inline-block'
      >
        Não sei meu CEP
      </a>

      {/* Erro */}
      {error && (
        <div className='mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-sm text-red-700'>{error}</p>
        </div>
      )}

      {/* Resultados */}
      {results && !error && filteredOptions.length > 0 && (
        <div className='mt-3 space-y-2'>
          {filteredOptions.map((option) => {
            const isSelected = selectedOption?.id === option.id;
            const isFree = option.freeShipping && option.price === 0;
            const isCheapest = option.id === cheapestId && !isFree;
            const isFastest = option.id === fastestId && fastestId !== cheapestId && !isFree;

            return (
              <div
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className={`relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/5 border-primary ring-1 ring-primary'
                    : isFree
                    ? 'bg-green-50 border-green-300 hover:border-green-400'
                    : isCheapest
                    ? 'bg-green-50/50 border-green-200 hover:border-green-300'
                    : isFastest
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <span className='text-lg'>{option.icon}</span>
                  <div>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-sm font-medium text-gray-900'>
                        {option.carrier} — {option.name}
                      </p>
                      {/* ═══ BADGE FRETE GRÁTIS ═══ */}
                      {isFree && (
                        <span className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800 border border-green-300 animate-pulse'>
                          🎉 FRETE GRÁTIS
                        </span>
                      )}
                      {isCheapest && !isFree && (
                        <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200'>
                          💰 Mais barata
                        </span>
                      )}
                      {isFastest && !isFree && (
                        <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200'>
                          ⚡ Mais rápida
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-gray-500'>{option.deliveryText}</p>
                  </div>
                </div>
                <div className='text-right flex items-center gap-2'>
                  {/* Preço riscado + GRÁTIS */}
                  {isFree ? (
                    <div className='flex flex-col items-end'>
                      <span className='text-[11px] text-gray-400 line-through'>
                        {formatBRL(option.originalPrice)}
                      </span>
                      <span className='text-sm font-bold text-green-700'>GRÁTIS</span>
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${
                      isCheapest && !isSelected ? 'text-green-700' : 'text-gray-900'
                    }`}>
                      {formatBRL(option.price)}
                    </span>
                  )}
                  {isSelected && (
                    <div className='w-5 h-5 bg-primary rounded-full flex items-center justify-center'>
                      <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Powered by */}
          <p className='text-xs text-gray-400 text-center mt-2'>
            Cotação via Melhor Envio • Preços e prazos em tempo real
          </p>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;