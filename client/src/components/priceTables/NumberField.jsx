// client/src/components/priceTables/NumberField.jsx
// ═══════════════════════════════════════════════════════════════════════
// Campo numérico do editor de tabelas (% ou R$).
// ═══════════════════════════════════════════════════════════════════════
// Aceita vírgula ou ponto. Só confirma o valor ao sair do campo ou com
// Enter — assim a tabela inteira não é recalculada a cada tecla, e
// valores a meio ("12,") nunca chegam ao cálculo. Esc desfaz.
// Campo vazio = null (herda a regra de cima). Texto que não é número
// (ex.: "abc") é descartado e o valor anterior fica.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { parseDecimal, toInputNumber } from '../../utils/priceTableUtils';

const NumberField = ({
  value,
  onCommit,
  placeholder = '',
  prefix = '',
  suffix = '',
  min = null,
  max = null,
  ariaLabel,
  disabled = false,
  highlight = false,
  className = '',
  inputClassName = '',
  id,
}) => {
  const [text, setText] = useState(toInputNumber(value));
  const focused = useRef(false);

  // Valor mudou por fora (ex.: "limpar exceções") → reflete no campo
  useEffect(() => {
    if (!focused.current) setText(toInputNumber(value));
  }, [value]);

  const commit = () => {
    let next = parseDecimal(text);
    // Texto que não é número: volta ao valor anterior em vez de apagá-lo
    if (next === undefined) return setText(toInputNumber(value));
    if (next !== null) {
      if (min !== null && next < min) next = min;
      if (max !== null && next > max) next = max;
      next = Math.round((next + Number.EPSILON) * 100) / 100;
    }
    setText(toInputNumber(next));
    if (next !== (value ?? null)) onCommit(next);
  };

  return (
    <div className={`relative ${className}`}>
      {prefix && (
        <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none'>
          {prefix}
        </span>
      )}
      <input
        id={id}
        type='text'
        inputMode='decimal'
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={e => setText(e.target.value.replace(/[^\d.,-]/g, ''))}
        onFocus={e => {
          focused.current = true;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') {
            setText(toInputNumber(value));
            focused.current = false;
            // blur sem confirmar: o texto já voltou ao valor original
            setTimeout(() => e.target.blur(), 0);
          }
        }}
        className={`w-full py-1.5 text-sm text-right rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400 ${
          prefix ? 'pl-7' : 'pl-2'
        } ${suffix ? 'pr-6' : 'pr-2'} ${
          highlight
            ? 'border-primary/50 bg-primary/5 font-semibold text-gray-900'
            : 'border-gray-200 bg-white text-gray-700'
        } ${inputClassName}`}
      />
      {suffix && (
        <span className='absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none'>
          {suffix}
        </span>
      )}
    </div>
  );
};

export default NumberField;
