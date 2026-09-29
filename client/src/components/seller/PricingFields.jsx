// client/src/components/seller/PricingFields.jsx
import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Info } from 'lucide-react';
import {
  calcMargin,
  getMarginTone,
  MARGIN_TONE_CLASSES,
  MARGIN_TONE_LABELS,
  MARGIN_THRESHOLDS,
  priceForTargetMargin,
  formatBRL,
  formatPct,
  toNumberOrNull,
} from '../../utils/pricingUtils';

// Atalhos de margem alvo (padrão varejo de acessórios: 40–60%)
const TARGET_MARGINS = [30, 40, 50, 60];

const inputBase =
  'outline-none py-2.5 px-3 rounded-lg border transition-colors bg-white ' +
  'focus:border-primary disabled:bg-gray-50 disabled:text-gray-400';

/**
 * Bloco "Precificação" partilhado por AddProduct e EditProductModal.
 *
 * Controlado pelo pai (os states vivem lá para o submit continuar igual).
 * Todos os valores são strings (como os inputs), convertidos só no cálculo.
 *
 * Props:
 *  - costPrice / setCostPrice   → custo real pago ao fornecedor (opcional)
 *  - price / setPrice           → preço original ("de")
 *  - offerPrice / setOfferPrice → preço de venda ("por")
 *  - idPrefix                   → evita colisão de ids entre Add e Edit
 *  - disabled                   → durante submit
 */
const PricingFields = ({
  costPrice,
  setCostPrice,
  price,
  setPrice,
  offerPrice,
  setOfferPrice,
  idPrefix = 'product',
  disabled = false,
}) => {
  const margin = useMemo(
    () => calcMargin(costPrice, offerPrice),
    [costPrice, offerPrice],
  );
  const tone = getMarginTone(margin?.marginPct ?? null);
  const hasCost = toNumberOrNull(costPrice) !== null;

  // Aviso de consistência já existente no backend (venda > original)
  const saleAboveOriginal =
    toNumberOrNull(price) !== null &&
    toNumberOrNull(offerPrice) !== null &&
    Number(offerPrice) > Number(price);

  // Aplica preço de venda para uma margem alvo.
  // Se o preço original ficar abaixo do novo preço de venda, sobe junto
  // (o backend rejeita venda > original).
  const applyTargetMargin = target => {
    const suggested = priceForTargetMargin(costPrice, target);
    if (suggested === null) return;
    const suggestedStr = suggested.toFixed(2);
    setOfferPrice(suggestedStr);
    const currentPrice = toNumberOrNull(price);
    if (currentPrice === null || currentPrice < suggested) {
      setPrice(suggestedStr);
    }
  };

  return (
    <div className='border border-emerald-200 bg-emerald-50/40 rounded-lg p-4 space-y-4'>
      {/* Cabeçalho */}
      <div>
        <div className='flex items-center gap-2'>
          <DollarSign className='w-5 h-5 text-emerald-600' />
          <h3 className='text-base font-semibold text-emerald-900'>
            Precificação
          </h3>
        </div>
        <p className='text-xs text-emerald-700 mt-1'>
          O custo é privado (só o admin vê). Margem e lucro são calculados
          automaticamente a partir do custo e do preço de venda.
        </p>
      </div>

      {/* Inputs */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* Custo */}
        <div className='flex flex-col gap-1'>
          <label
            className='text-sm font-medium text-gray-700'
            htmlFor={`${idPrefix}-cost-price`}
          >
            Custo do Fornecedor (R$)
          </label>
          <input
            id={`${idPrefix}-cost-price`}
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            placeholder='0.00'
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
            disabled={disabled}
            className={`${inputBase} border-emerald-300 font-medium`}
          />
          <p className='text-[11px] text-gray-500'>
            Quanto você paga por unidade
          </p>
        </div>

        {/* Preço original */}
        <div className='flex flex-col gap-1'>
          <label
            className='text-sm font-medium text-gray-700'
            htmlFor={`${idPrefix}-price`}
          >
            Preço Original (R$)
          </label>
          <input
            id={`${idPrefix}-price`}
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            placeholder='0.00'
            value={price}
            onChange={e => setPrice(e.target.value)}
            disabled={disabled}
            required
            className={`${inputBase} border-gray-300`}
          />
          <p className='text-[11px] text-gray-500'>
            Preço "de" (aparece riscado)
          </p>
        </div>

        {/* Preço de venda */}
        <div className='flex flex-col gap-1'>
          <label
            className='text-sm font-medium text-gray-700'
            htmlFor={`${idPrefix}-offer-price`}
          >
            Preço de Venda (R$)
          </label>
          <input
            id={`${idPrefix}-offer-price`}
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            placeholder='0.00'
            value={offerPrice}
            onChange={e => setOfferPrice(e.target.value)}
            disabled={disabled}
            required
            className={`${inputBase} border-gray-300 font-semibold`}
          />
          <p className='text-[11px] text-gray-500'>
            Preço "por" (o que o cliente paga)
          </p>
        </div>
      </div>

      {saleAboveOriginal && (
        <p className='text-xs text-red-600 font-medium -mt-2'>
          O preço de venda não pode ser maior que o preço original.
        </p>
      )}

      {/* Painel de margem */}
      {margin ? (
        <div
          className={`rounded-lg border p-3 ${
            tone === 'negative'
              ? 'bg-red-50 border-red-200'
              : tone === 'low'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-white border-emerald-200'
          }`}
        >
          <div className='flex items-center justify-between flex-wrap gap-2 mb-3'>
            <div className='flex items-center gap-2'>
              {tone === 'negative' ? (
                <TrendingDown className='w-4 h-4 text-red-600' />
              ) : (
                <TrendingUp className='w-4 h-4 text-emerald-600' />
              )}
              <span className='text-sm font-semibold text-gray-800'>
                Resultado por unidade
              </span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${MARGIN_TONE_CLASSES[tone]}`}
            >
              {MARGIN_TONE_LABELS[tone]}
            </span>
          </div>

          <div className='grid grid-cols-3 gap-3'>
            <div>
              <p className='text-[11px] uppercase tracking-wide text-gray-500'>
                Lucro bruto
              </p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  margin.profit < 0 ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {formatBRL(margin.profit)}
              </p>
            </div>
            <div>
              <p className='text-[11px] uppercase tracking-wide text-gray-500'>
                Margem
              </p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  margin.marginPct < 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {formatPct(margin.marginPct)}
              </p>
              <p className='text-[10px] text-gray-400'>sobre a venda</p>
            </div>
            <div>
              <p className='text-[11px] uppercase tracking-wide text-gray-500'>
                Markup
              </p>
              <p className='text-lg font-bold tabular-nums text-gray-900'>
                {margin.markupPct === null ? '—' : formatPct(margin.markupPct)}
              </p>
              <p className='text-[10px] text-gray-400'>sobre o custo</p>
            </div>
          </div>

          {tone === 'negative' && (
            <p className='text-xs text-red-700 mt-3'>
              Vendendo abaixo do custo: prejuízo de{' '}
              <strong>{formatBRL(Math.abs(margin.profit))}</strong> por
              unidade. Permitido (ex: queima de estoque), mas confirme que é
              intencional.
            </p>
          )}
          {tone === 'low' && (
            <p className='text-xs text-orange-700 mt-3'>
              Margem abaixo de {MARGIN_THRESHOLDS.LOW}%. Considere que frete,
              taxas de pagamento e impostos ainda saem daqui.
            </p>
          )}
        </div>
      ) : (
        <div className='flex items-start gap-2 text-xs text-gray-500 bg-white/70 border border-dashed border-emerald-200 rounded-lg p-3'>
          <Info className='w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500' />
          <span>
            Preencha o <strong>custo</strong> e o <strong>preço de venda</strong>{' '}
            para ver lucro, margem e markup em tempo real.
          </span>
        </div>
      )}

      {/* Atalhos de margem alvo */}
      {hasCost && Number(costPrice) > 0 && (
        <div>
          <p className='text-xs font-medium text-gray-600 mb-2'>
            Definir preço de venda por margem alvo:
          </p>
          <div className='flex flex-wrap gap-2'>
            {TARGET_MARGINS.map(target => {
              const suggested = priceForTargetMargin(costPrice, target);
              const isCurrent =
                margin && Math.abs(margin.marginPct - target) < 0.05;
              return (
                <button
                  key={target}
                  type='button'
                  disabled={disabled || suggested === null}
                  onClick={() => applyTargetMargin(target)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    isCurrent
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                  } disabled:opacity-50`}
                  title={`Preço de venda para ${target}% de margem`}
                >
                  {target}% → {formatBRL(suggested)}
                </button>
              );
            })}
          </div>
          <p className='text-[11px] text-gray-400 mt-1.5'>
            Se o preço original estiver abaixo do sugerido, ele sobe junto.
          </p>
        </div>
      )}
    </div>
  );
};

export default PricingFields;
