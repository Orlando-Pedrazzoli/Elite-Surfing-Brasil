// client/src/components/priceTables/OrderTablePicker.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🧾 NOVO PEDIDO — escolher a tabela de lojista
// ═══════════════════════════════════════════════════════════════════════
// Só tabelas "Para lojistas" (as de uso interno têm custo) e não
// arquivadas. Com uma só, quem chama já navega direto, sem este modal.
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { X, Store, ArrowRight } from 'lucide-react';
import { describeRule } from '../../utils/priceTableEngine';
import { orderableTables } from '../../utils/priceTableOrderUtils';

const OrderTablePicker = ({ open, tables, onClose, onPick }) => {
  if (!open) return null;
  const options = orderableTables(tables);

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4'
      onClick={onClose}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='order-picker-title'
        className='bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
          <h2
            id='order-picker-title'
            className='text-lg font-bold text-gray-900'
          >
            Gerar pedido com qual tabela?
          </h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Fechar'
            className='p-2 text-gray-400 hover:text-gray-700 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
        <div className='p-4 overflow-y-auto'>
          {options.length === 0 ? (
            <p className='text-sm text-gray-500 p-2'>
              Nenhuma tabela “Para lojistas” ativa. Crie uma tabela de lojista
              (ou restaure uma arquivada) para gerar pedidos.
            </p>
          ) : (
            <ul className='space-y-2'>
              {options.map(table => (
                <li key={table._id}>
                  <button
                    type='button'
                    onClick={() => onPick(table)}
                    className='w-full flex items-center gap-3 text-left p-4 rounded-xl border border-gray-200 hover:border-primary hover:shadow-sm transition-all'
                  >
                    <span className='w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0'>
                      <Store className='w-5 h-5' />
                    </span>
                    <span className='flex-1 min-w-0'>
                      <span className='block text-sm font-semibold text-gray-900 truncate'>
                        {table.name}
                      </span>
                      <span className='block text-xs text-gray-500 truncate'>
                        {describeRule(table)} · {table.stats?.visible ?? '—'}{' '}
                        produtos
                      </span>
                    </span>
                    <ArrowRight className='w-4 h-4 text-gray-400' />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTablePicker;
