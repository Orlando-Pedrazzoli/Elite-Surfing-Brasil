// client/src/components/priceTables/RulesPanel.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 EDITOR DE TABELA — painel de regras
// ═══════════════════════════════════════════════════════════════════════
// Regra geral da tabela (tipo, base, modo, % e arredondamento), quais
// produtos entram e o cabeçalho do documento exportado.
// A % por seção e por item é editada na própria lista (SectionList).
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { AlertTriangle, Eraser, Info, Lock, Store } from 'lucide-react';
import NumberField from './NumberField';
import {
  BASE_LABELS,
  PCT_LIMITS,
  PRICE_BASES,
  ROUNDINGS,
  ROUNDING_LABELS,
  applyPct,
  applyRounding,
  formatBRL,
  fromCents,
} from '../../utils/priceTableEngine';
import { fromInputDate, toInputDate } from '../../utils/priceTableUtils';

const Card = ({ title, children }) => (
  <section className='bg-white rounded-xl border border-gray-200 p-4'>
    <h2 className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-3'>
      {title}
    </h2>
    <div className='space-y-3.5'>{children}</div>
  </section>
);

const Label = ({ htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className='block text-xs font-semibold text-gray-600 mb-1'
  >
    {children}
  </label>
);

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

const Segmented = ({ options, value, onChange, label }) => (
  <div
    role='group'
    aria-label={label}
    className='grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg'
  >
    {options.map(option => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type='button'
          aria-pressed={active}
          onClick={() => !active && onChange(option.value)}
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            active
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {option.icon && <option.icon className='w-3.5 h-3.5' />}
          {option.label}
        </button>
      );
    })}
  </div>
);

const Check = ({ checked, onChange, children, hint }) => (
  <label className='flex items-start gap-2.5 cursor-pointer'>
    <input
      type='checkbox'
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className='mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30'
    />
    <span>
      <span className='block text-sm text-gray-700'>{children}</span>
      {hint && <span className='block text-xs text-gray-400'>{hint}</span>}
    </span>
  </label>
);

const RulesPanel = ({
  table,
  stats,
  onSetting,
  onHeader,
  onOption,
  onClearAllOverrides,
}) => {
  const isCostBase = table.base === 'cost';
  const isMargin = table.mode === 'margin';
  const pct = table.defaultPct ?? 0;
  const overrides = stats.sectionPct + stats.itemPct + stats.fixed;

  const raw = applyPct(10000, pct, table.mode);
  const example =
    raw !== null && raw > 0 ? applyRounding(raw, table.rounding) : null;
  const baseWord = isCostBase
    ? 'custo'
    : table.base === 'wholesale'
      ? 'preço de tabela'
      : 'preço de venda';

  const exposesCost =
    table.kind === 'cliente' && isCostBase && pct === 0 && overrides === 0;

  return (
    <div className='space-y-4'>
      <Card title='Regra de preço'>
        <div>
          <Label>Tipo de tabela</Label>
          <Segmented
            label='Tipo de tabela'
            value={table.kind}
            onChange={value => onSetting('kind', value)}
            options={[
              { value: 'cliente', label: 'Para lojistas', icon: Store },
              { value: 'interna', label: 'Uso interno', icon: Lock },
            ]}
          />
          <p className='text-xs text-gray-400 mt-1.5'>
            {table.kind === 'interna'
              ? 'Sai com marca-d’água “USO INTERNO” e pede confirmação antes de enviar por email.'
              : 'Pode ser compartilhada. Nunca mostra o custo nem a porcentagem.'}
          </p>
        </div>

        <div>
          <Label htmlFor='pt-base'>Preço calculado a partir de</Label>
          <select
            id='pt-base'
            value={table.base}
            onChange={e => onSetting('base', e.target.value)}
            className={inputCls}
          >
            {PRICE_BASES.map(base => (
              <option key={base} value={base}>
                {BASE_LABELS[base]}
              </option>
            ))}
          </select>
        </div>

        {isCostBase && (
          <div>
            <Label>A porcentagem é</Label>
            <Segmented
              label='Modo da porcentagem'
              value={table.mode}
              onChange={value => onSetting('mode', value)}
              options={[
                { value: 'markup', label: 'Markup' },
                { value: 'margin', label: 'Margem' },
              ]}
            />
            <p className='text-xs text-gray-400 mt-1.5'>
              {isMargin
                ? 'Margem: a % é a parte do preço final que sobra depois do custo.'
                : 'Markup: a % é somada ao custo do fornecedor.'}
            </p>
          </div>
        )}

        <div>
          <Label htmlFor='pt-default-pct'>
            {isCostBase
              ? isMargin
                ? 'Margem geral'
                : 'Markup geral'
              : 'Ajuste geral (negativo = desconto)'}
          </Label>
          <NumberField
            id='pt-default-pct'
            value={pct}
            onCommit={value => onSetting('defaultPct', value ?? 0)}
            suffix='%'
            min={isMargin ? 0 : PCT_LIMITS.min}
            max={isMargin ? PCT_LIMITS.marginMax : PCT_LIMITS.max}
            inputClassName='!py-2 !text-base font-semibold'
          />
          <p className='flex items-start gap-1.5 text-xs text-gray-500 mt-1.5'>
            <Info className='w-3.5 h-3.5 mt-px flex-shrink-0 text-gray-400' />
            <span>
              {example !== null
                ? `Exemplo: ${baseWord} de R$ 100,00 → ${formatBRL(fromCents(example))} na tabela.`
                : 'Porcentagem inválida para este modo.'}
            </span>
          </p>
        </div>

        <div>
          <Label htmlFor='pt-rounding'>Arredondamento</Label>
          <select
            id='pt-rounding'
            value={table.rounding}
            onChange={e => onSetting('rounding', e.target.value)}
            className={inputCls}
          >
            {ROUNDINGS.map(rounding => (
              <option key={rounding} value={rounding}>
                {ROUNDING_LABELS[rounding]}
              </option>
            ))}
          </select>
        </div>

        {overrides > 0 && (
          <div className='pt-1 border-t border-gray-100'>
            <p className='text-xs text-gray-500 mt-2.5'>
              Exceções nesta tabela:{' '}
              {[
                stats.sectionPct &&
                  `${stats.sectionPct} ${stats.sectionPct === 1 ? 'seção' : 'seções'} com % própria`,
                stats.itemPct &&
                  `${stats.itemPct} ${stats.itemPct === 1 ? 'item' : 'itens'} com % própria`,
                stats.fixed && `${stats.fixed} com preço fixo`,
              ]
                .filter(Boolean)
                .join(', ')}
              .
            </p>
            <button
              type='button'
              onClick={onClearAllOverrides}
              className='mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50'
            >
              <Eraser className='w-3.5 h-3.5' />
              Aplicar a % geral à tabela inteira
            </button>
          </div>
        )}

        {exposesCost && (
          <p className='flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
            <AlertTriangle className='w-4 h-4 flex-shrink-0 mt-px' />
            <span>
              Esta tabela está marcada “Para lojistas” mas mostra o custo sem
              acréscimo. Defina o markup ou mude o tipo para “Uso interno”.
            </span>
          </p>
        )}
      </Card>

      <Card title='Produtos incluídos'>
        <Check
          checked={!!table.options.includeUnpublished}
          onChange={value => onOption('includeUnpublished', value)}
          hint='Produtos que ainda não estão publicados no site'
        >
          Incluir rascunhos
        </Check>
        <Check
          checked={!!table.options.hideOutOfStock}
          onChange={value => onOption('hideOutOfStock', value)}
          hint='Tira da tabela o que está com estoque zerado'
        >
          Esconder produtos sem estoque
        </Check>
        <Check
          checked={table.options.showSku !== false}
          onChange={value => onOption('showSku', value)}
        >
          Mostrar o código do produto
        </Check>
      </Card>

      <Card title='Cabeçalho do documento'>
        <div>
          <Label htmlFor='pt-h-title'>Título</Label>
          <input
            id='pt-h-title'
            value={table.header.title || ''}
            onChange={e => onHeader('title', e.target.value)}
            maxLength={80}
            placeholder='Tabela de Preços'
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor='pt-h-subtitle'>Subtítulo</Label>
          <input
            id='pt-h-subtitle'
            value={table.header.subtitle || ''}
            onChange={e => onHeader('subtitle', e.target.value)}
            maxLength={120}
            placeholder='ex.: Lojistas — Verão 2027'
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor='pt-h-valid'>Válida até</Label>
          <input
            id='pt-h-valid'
            type='date'
            value={toInputDate(table.header.validUntil)}
            onChange={e =>
              onHeader('validUntil', fromInputDate(e.target.value))
            }
            className={inputCls}
          />
        </div>
        <div>
          <Label htmlFor='pt-h-terms'>Condições de pagamento</Label>
          <textarea
            id='pt-h-terms'
            value={table.header.paymentTerms || ''}
            onChange={e => onHeader('paymentTerms', e.target.value)}
            maxLength={400}
            rows={3}
            placeholder='ex.: Cartão em até 4x ou PIX à vista com 5% de desconto. Frete por conta do cliente.'
            className={`${inputCls} resize-y`}
          />
        </div>
        <div>
          <Label htmlFor='pt-h-notes'>Observações</Label>
          <textarea
            id='pt-h-notes'
            value={table.header.notes || ''}
            onChange={e => onHeader('notes', e.target.value)}
            maxLength={600}
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </div>
      </Card>
    </div>
  );
};

export default RulesPanel;
