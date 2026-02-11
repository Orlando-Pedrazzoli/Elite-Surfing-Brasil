import { useState, useCallback } from 'react';
import { calculateShipping, formatCep, isValidCep } from '../utils/shippingUtils';
import { formatBRL } from '../utils/installmentUtils';

const ShippingCalculator = ({ product, orderTotal = 0 }) => {
  const [cep, setCep] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCepChange = (e) => {
    const formatted = formatCep(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 8) {
      setCep(formatted);
      setError('');
    }
  };

  const handleCalculate = useCallback(() => {
    if (!isValidCep(cep)) {
      setError('Digite um CEP válido com 8 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    // Simular delay de API para UX
    setTimeout(() => {
      const result = calculateShipping(cep, product, orderTotal);
      
      if (result.error) {
        setError(result.error);
        setResults(null);
      } else {
        setResults(result);
      }
      setLoading(false);
    }, 600);
  }, [cep, product, orderTotal]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
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
      {results && !error && (
        <div className='mt-3 space-y-2'>
          {/* Destino */}
          <p className='text-xs text-gray-500'>
            Entrega para: <span className='font-medium text-gray-700'>{results.state} — Região {results.regionName}</span>
          </p>

          {/* Opções de frete */}
          {results.options.map((option) => (
            <div
              key={option.type}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                option.isFree
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className='flex items-center gap-3'>
                <span className='text-lg'>{option.icon}</span>
                <div>
                  <p className='text-sm font-medium text-gray-900'>{option.name}</p>
                  <p className='text-xs text-gray-500'>{option.deadlineText}</p>
                </div>
              </div>
              <div className='text-right'>
                {option.isFree ? (
                  <div>
                    <span className='text-sm font-bold text-green-600'>Grátis</span>
                    <p className='text-xs text-gray-400 line-through'>
                      {formatBRL(option.originalPrice)}
                    </p>
                  </div>
                ) : (
                  <span className='text-sm font-bold text-gray-900'>
                    {formatBRL(option.price)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Mensagem frete grátis */}
          {results.freeShippingMessage && (
            <p className='text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200'>
              💡 {results.freeShippingMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;