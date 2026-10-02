// client/src/components/seller/PricingFields.jsx
import React, { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  Store,
  ShoppingCart,
} from 'lucide-react';
import {
  calcMargin,
  calcTableVsSale,
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
 * Resultado por unidade de UM canal (e-commerce ou lojistas).
 * `margin` vem de calcMargin(custo, preço do canal) — nunca null aqui.
 * `icon` é o elemento já renderizado (ex: <Store className='...' />).
 */
const ChannelResult = ({ icon, title, priceLabel, margin, lossHint }) => {
  const tone = getMarginTone(margin.marginPct);

  return (
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
        <div className='flex items-center gap-2 min-w-0'>
          {tone === 'negative' ? (
            <TrendingDown className='w-4 h-4 flex-shrink-0 text-red-600' />
          ) : (
            icon
          )}
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-gray-800 leading-tight'>
              {title}
            </p>
            <p className='text-[11px] text-gray-500 tabular-nums'>
              {priceLabel}: {formatBRL(margin.sale)}
            </p>
          </div>
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
          <p className='text-[10px] text-gray-400'>sobre o preço</p>
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
          {lossHint}: prejuízo de{' '}
          <strong>{formatBRL(Math.abs(margin.profit))}</strong> por unidade.
          Permitido (ex: queima de estoque), mas confirme que é intencional.
        </p>
      )}
      {tone === 'low' && (
        <p className='text-xs text-orange-700 mt-3'>
          Margem abaixo de {MARGIN_THRESHOLDS.LOW}%. Considere que frete, taxas
          de pagamento e impostos ainda saem daqui.
        </p>
      )}
    </div>
  );
};

/**
 * Bloco "Precificação" partilhado por AddProduct e EditProductModal.
 *
 * Os três preços que dão a visão real do negócio:
 *   1. Custo do Fornecedor → preço real de custo do produto
 *   2. Preço de Tabela     → o que o lojista paga (tabela de preços da marca)
 *   3. Preço de Venda      → o que o cliente paga no e-commerce
 *
 * O preço "de" (riscado na loja) continua disponível, mas como campo
 * opcional de promoção: vazio = produto vendido sem preço riscado.
 *
 * Controlado pelo pai (os states vivem lá para o submit continuar igual).
 * Todos os valores são strings (como os inputs), convertidos só no cálculo.
 *
 * Props:
 *  - costPrice / setCostPrice           → custo real (opcional, privado)
 *  - wholesalePrice / setWholesalePrice → preço de tabela (opcional, privado)
 *  - offerPrice / setOfferPrice         → preço de venda no e-commerce
 *  - price / setPrice                   → preço "de" riscado (opcional)
 *  - idPrefix                           → evita colisão de ids entre Add e Edit
 *  - disabled                           → durante submit
 */
const PricingFields = ({
  costPrice,
  setCostPrice,
  wholesalePrice,
  setWholesalePrice,
  price,
  setPrice,
  offerPrice,
  setOfferPrice,
  idPrefix = 'product',
  disabled = false,
}) => {
  // Margem por canal — mesma fórmula, preço diferente
  const saleMargin = useMemo(
    () => calcMargin(costPrice, offerPrice),
    [costPrice, offerPrice],
  );
  const tableMargin = useMemo(
    () => calcMargin(costPrice, wholesalePrice),
    [costPrice, wholesalePrice],
  );
  const tableVsSale = useMemo(
    () => calcTableVsSale(wholesalePrice, offerPrice),
    [wholesalePrice, offerPrice],
  );

  const hasCost = toNumberOrNull(costPrice) !== null;

  // Tabela acima do site: o lojista pagaria mais que o consumidor final
  const tableAboveSale =
    !!tableVsSale && tableVsSale.wholesale > tableVsSale.sale;

  // Preço "de" preenchido e abaixo do preço de venda (o backend rejeita)
  const saleAboveOriginal =
    toNumberOrNull(price) !== null &&
    toNumberOrNull(offerPrice) !== null &&
    Number(offerPrice) > Number(price);

  // Aplica preço de venda para uma margem alvo.
  // Se houver preço "de" preenchido abaixo do novo preço de venda, sobe
  // junto (o backend rejeita venda > "de"). Vazio continua vazio.
  const applyTargetMargin = target => {
    const suggested = priceForTargetMargin(costPrice, target);
    if (suggested === null) return;
    const suggestedStr = suggested.toFixed(2);
    setOfferPrice(suggestedStr);
    const currentPrice = toNumberOrNull(price);
    if (currentPrice !== null && currentPrice < suggested) {
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
          O custo e o preço de tabela são privados (só o admin vê). Lucro e
          margem são calculados automaticamente para o e-commerce e para a
          tabela de lojistas.
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
            Preço real de custo do produto (por unidade)
          </p>
        </div>

        {/* Preço de tabela */}
        <div className='flex flex-col gap-1'>
          <label
            className='text-sm font-medium text-gray-700'
            htmlFor={`${idPrefix}-wholesale-price`}
          >
            Preço de Tabela (R$)
          </label>
          <input
            id={`${idPrefix}-wholesale-price`}
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            placeholder='0.00'
            value={wholesalePrice}
            onChange={e => setWholesalePrice(e.target.value)}
            disabled={disabled}
            className={`${inputBase} border-emerald-300 font-medium`}
          />
          <p className='text-[11px] text-gray-500'>
            Preço pago pelos lojistas na tabela de preços da marca
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
            Preço vendido no e-commerce (o que o cliente paga)
          </p>
        </div>
      </div>

      {tableAboveSale && (
        <p className='text-xs text-orange-700 font-medium -mt-2'>
          O preço de tabela está acima do preço de venda do site: o lojista
          pagaria mais que o cliente final. Confirme os valores.
        </p>
      )}

      {/* Painel de resultado — um bloco por canal */}
      {saleMargin || tableMargin ? (
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <TrendingUp className='w-4 h-4 text-emerald-600' />
            <span className='text-sm font-semibold text-gray-800'>
              Resultado por unidade
            </span>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            {saleMargin && (
              <ChannelResult
                icon={
                  <ShoppingCart className='w-4 h-4 flex-shrink-0 text-emerald-600' />
                }
                title='E-commerce'
                priceLabel='Preço de venda'
                margin={saleMargin}
                lossHint='Vendendo no site abaixo do custo'
              />
            )}
            {tableMargin && (
              <ChannelResult
                icon={
                  <Store className='w-4 h-4 flex-shrink-0 text-emerald-600' />
                }
                title='Lojistas (tabela)'
                priceLabel='Preço de tabela'
                margin={tableMargin}
                lossHint='Preço de tabela abaixo do custo'
              />
            )}
          </div>

          {tableVsSale && !tableAboveSale && (
            <p className='text-xs text-gray-600 bg-white/70 border border-emerald-100 rounded-lg px-3 py-2'>
              A tabela equivale a{' '}
              <strong className='tabular-nums'>
                {formatPct(tableVsSale.pctOfSale)}
              </strong>{' '}
              do preço do site — o lojista paga{' '}
              <strong className='tabular-nums'>
                {formatPct(tableVsSale.discountPct)}
              </strong>{' '}
              a menos que o cliente final
              {tableVsSale.resellerMarkupPct !== null && (
                <>
                  {' '}
                  e, revendendo pelo preço do site, tem markup de{' '}
                  <strong className='tabular-nums'>
                    {formatPct(tableVsSale.resellerMarkupPct)}
                  </strong>
                </>
              )}
              .
            </p>
          )}

          {hasCost && !tableMargin && (
            <p className='text-[11px] text-gray-500'>
              Preencha o <strong>preço de tabela</strong> para ver também o
              resultado nas vendas para lojistas.
            </p>
          )}
        </div>
      ) : (
        <div className='flex items-start gap-2 text-xs text-gray-500 bg-white/70 border border-dashed border-emerald-200 rounded-lg p-3'>
          <Info className='w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500' />
          <span>
            Preencha o <strong>custo</strong>, o{' '}
            <strong>preço de tabela</strong> e o <strong>preço de venda</strong>{' '}
            para ver lucro, margem e markup de cada canal em tempo real.
          </span>
        </div>
      )}

      {/* Atalhos de margem alvo (preço de venda do e-commerce) */}
      {hasCost && Number(costPrice) > 0 && (
        <div>
          <p className='text-xs font-medium text-gray-600 mb-2'>
            Definir preço de venda (e-commerce) por margem alvo:
          </p>
          <div className='flex flex-wrap gap-2'>
            {TARGET_MARGINS.map(target => {
              const suggested = priceForTargetMargin(costPrice, target);
              const isCurrent =
                saleMargin && Math.abs(saleMargin.marginPct - target) < 0.05;
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
        </div>
      )}

      {/* Preço "de" (riscado) — opcional, só para promoção na loja */}
      <div className='border-t border-emerald-100 pt-3'>
        <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3'>
          <label
            className='text-xs font-medium text-gray-600 sm:w-64'
            htmlFor={`${idPrefix}-price`}
          >
            Preço "de" riscado na loja (R$){' '}
            <span className='font-normal text-gray-400'>— opcional</span>
          </label>
          <input
            id={`${idPrefix}-price`}
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            placeholder='Sem promoção'
            value={price}
            onChange={e => setPrice(e.target.value)}
            disabled={disabled}
            className={`${inputBase} border-gray-300 text-sm py-2 sm:w-40`}
          />
        </div>
        <p className='text-[11px] text-gray-500 mt-1'>
          Só para promoções: aparece riscado ao lado do preço de venda ("de" /
          "por"). Deixe vazio para vender sem preço riscado.
        </p>
        {saleAboveOriginal && (
          <p className='text-xs text-red-600 font-medium mt-1'>
            O preço "de" não pode ser menor que o preço de venda. Corrija o
            valor ou deixe o campo vazio.
          </p>
        )}
      </div>
    </div>
  );
};

export default PricingFields;
