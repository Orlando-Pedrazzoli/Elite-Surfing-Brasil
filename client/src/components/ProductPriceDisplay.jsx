// client/src/components/ProductPriceDisplay.jsx
import { useState } from 'react';
import { calculateInstallments, formatBRL } from '../utils/installmentUtils';

const ProductPriceDisplay = ({ price, offerPrice, currency }) => {
  const [showAllInstallments, setShowAllInstallments] = useState(false);
  
  const installmentData = calculateInstallments(offerPrice);
  const hasOriginalDiscount = price > offerPrice;
  const discountPercent = hasOriginalDiscount 
    ? Math.round(((price - offerPrice) / price) * 100) 
    : 0;

  return (
    <div className='bg-gray-50 p-4 md:p-5 rounded-lg space-y-3'>
      
      {/* 💰 PREÇO PIX — Destaque principal (🆕 Verde) */}
      <div>
        <p className='text-xl md:text-2xl font-extrabold text-green-700'>
          {formatBRL(installmentData.pixPrice)}
          <span className='text-base font-bold ml-2'>NO PIX</span>
        </p>
        <p className='text-xs text-gray-500 mt-0.5'>
          10% de desconto no pagamento à vista via PIX
        </p>
      </div>

      {/* Separador */}
      <div className='border-t border-gray-200' />

      {/* 💳 PREÇO CARTÃO — Preço normal e parcelamento */}
      <div className='space-y-1'>
        {/* Preço original riscado (se tiver desconto no offerPrice) */}
        {hasOriginalDiscount && (
          <p className='text-sm text-gray-400 line-through'>
            De: {formatBRL(price)}
            <span className='ml-2 text-xs text-green-600 font-semibold no-underline inline-block'>
              -{discountPercent}%
            </span>
          </p>
        )}

        {/* Preço do cartão */}
        <p className='text-base md:text-lg font-bold text-gray-800'>
          {formatBRL(offerPrice)}
          <span className='text-sm font-normal text-gray-500 ml-1.5'>no cartão</span>
        </p>

        {/* Parcelamento principal */}
        {installmentData.maxInstallments > 1 && (
          <p className='text-sm text-gray-600'>
            <span className='font-semibold text-gray-700'>
              {installmentData.maxInstallments}x
            </span>
            {' de '}
            <span className='font-semibold text-gray-700'>
              {formatBRL(installmentData.installmentValue)}
            </span>
            {' sem juros'}
          </p>
        )}

        {/* Parcelamento com juros (7x a 12x) */}
        {installmentData.hasInterestOptions && (
          <p className='text-xs text-gray-500'>
            ou em até {installmentData.maxInstallmentsWithInterest}x com juros
            do cartão
          </p>
        )}

        {/* Link para ver todas as parcelas */}
        {installmentData.allInstallments.length > 2 && (
          <button
            type='button'
            onClick={() => setShowAllInstallments(!showAllInstallments)}
            className='text-xs text-primary hover:underline font-medium mt-1'
          >
            {showAllInstallments ? 'Ocultar parcelas ▲' : 'Ver todas as parcelas ▼'}
          </button>
        )}

        {/* Tabela de todas as parcelas */}
        {showAllInstallments && (
          <div className='mt-2 p-3 bg-white rounded-lg border border-gray-200 space-y-1.5'>
            {installmentData.allInstallments.map((inst) => (
              <div key={inst.times} className='flex justify-between text-xs text-gray-600'>
                <span>{inst.times}x de {formatBRL(inst.value)}</span>
                <span className='text-green-600 font-medium'>sem juros</span>
              </div>
            ))}
            {/* 7x a 12x — com juros, valor exato calculado no checkout */}
            {installmentData.hasInterestOptions && (
              <div className='flex justify-between gap-3 text-xs text-gray-500'>
                <span>
                  {installmentData.maxInstallments + 1}x a{' '}
                  {installmentData.maxInstallmentsWithInterest}x
                </span>
                <span className='text-right'>
                  com juros — valor exibido no checkout
                </span>
              </div>
            )}
            {/* PIX na tabela (🆕 Verde) */}
            <div className='border-t border-gray-100 pt-1.5 mt-1.5'>
              <div className='flex justify-between text-xs'>
                <span className='text-green-700 font-medium'>PIX à vista</span>
                <span className='text-green-700 font-bold'>{formatBRL(installmentData.pixPrice)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Impostos */}
      <p className='text-xs text-gray-500'>(Impostos incluídos)</p>
    </div>
  );
};

export default ProductPriceDisplay;