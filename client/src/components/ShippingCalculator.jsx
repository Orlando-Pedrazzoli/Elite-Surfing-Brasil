import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatBRL } from '../utils/installmentUtils';
import { formatCep, isValidCep } from '../utils/shippingUtils';

const ShippingCalculator = ({ product, cartProducts, onShippingSelect }) => {
  const { axios } = useAppContext();
  const [cep, setCep] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

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

    try {
      // Montar body da requisição
      let body = { cep };

      if (cartProducts && cartProducts.length > 0) {
        // Modo carrinho — envia IDs + quantidades
        body.products = cartProducts.map((p) => ({
          productId: p._id,
          quantity: p.quantity || 1,
        }));
      } else if (product) {
        // Modo produto individual
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
  }, [cep, product, cartProducts, axios]);

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
          {/* Opções de frete */}
          {results.options.map((option) => {
            const isSelected = selectedOption?.id === option.id;

            return (
              <div
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/5 border-primary ring-1 ring-primary'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <span className='text-lg'>{option.icon}</span>
                  <div>
                    <p className='text-sm font-medium text-gray-900'>
                      {option.carrier} — {option.name}
                    </p>
                    <p className='text-xs text-gray-500'>{option.deliveryText}</p>
                  </div>
                </div>
                <div className='text-right flex items-center gap-2'>
                  <span className='text-sm font-bold text-gray-900'>
                    {formatBRL(option.price)}
                  </span>
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