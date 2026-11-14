// client/src/components/priceTables/OrderImportModal.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 COLAR PEDIDO DO WHATSAPP
// ═══════════════════════════════════════════════════════════════════════
// O vendedor cola a mensagem do lojista (uma linha por produto) e o painel
// reconhece os produtos pelo código (SKU) e a quantidade. Mostra o que
// reconheceu e o que não reconheceu ANTES de aplicar.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import { X, ClipboardPaste, CheckCircle2, HelpCircle } from 'lucide-react';
import { parseOrderText } from '../../utils/priceTableOrderUtils';

const OrderImportModal = ({ open, onClose, rows, onApply }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  const parsed = useMemo(() => parseOrderText(text, rows), [text, rows]);

  if (!open) return null;

  const apply = mode => {
    onApply(parsed.matches, mode);
    onClose();
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4'
      onClick={onClose}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='order-import-title'
        className='bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200'>
          <div className='flex items-center gap-2'>
            <ClipboardPaste className='w-5 h-5 text-primary' />
            <h2
              id='order-import-title'
              className='text-lg font-bold text-gray-900'
            >
              Colar pedido do WhatsApp
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Fechar'
            className='p-2 text-gray-400 hover:text-gray-700 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-5 overflow-y-auto space-y-4'>
          <p className='text-sm text-gray-500'>
            Cole a mensagem do cliente, uma linha por produto. Os produtos são
            reconhecidos pelo <strong>código</strong> (ex.: <code>ES-402</code>,{' '}
            <code>ES402</code>) e a quantidade por “3x”, “3 un”, “qtd 3” ou um
            número na linha.
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={7}
            autoFocus
            placeholder={'ES-402 3x\n2 un ES101\nqtd 5 - ES-230'}
            className='w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
          />

          {text.trim() && (
            <div className='space-y-3'>
              {parsed.matches.length > 0 && (
                <div>
                  <p className='flex items-center gap-1.5 text-sm font-semibold text-green-700 mb-1.5'>
                    <CheckCircle2 className='w-4 h-4' />
                    Reconhecidos ({parsed.matches.length})
                  </p>
                  <ul className='divide-y divide-gray-100 border border-gray-200 rounded-xl'>
                    {parsed.matches.map((m, i) => (
                      <li
                        key={`${m.productId}-${i}`}
                        className='flex items-center justify-between gap-3 px-3 py-2 text-sm'
                      >
                        <span className='min-w-0'>
                          <span className='block font-medium text-gray-900 truncate'>
                            {m.name}
                          </span>
                          <span className='block text-xs text-gray-400 truncate'>
                            {m.sku} · “{m.line}”
                          </span>
                        </span>
                        <span className='flex-shrink-0 font-bold text-gray-900'>
                          {m.qty} un
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {parsed.unmatched.length > 0 && (
                <div>
                  <p className='flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-1.5'>
                    <HelpCircle className='w-4 h-4' />
                    Não reconhecidos ({parsed.unmatched.length}) — adicione pela
                    busca
                  </p>
                  <ul className='text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 space-y-1'>
                    {parsed.unmatched.map((line, i) => (
                      <li key={i} className='truncate'>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-gray-200'>
          <button
            type='button'
            onClick={() => apply('replace')}
            disabled={!parsed.matches.length}
            className='px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40'
          >
            Substituir o pedido atual
          </button>
          <button
            type='button'
            onClick={() => apply('add')}
            disabled={!parsed.matches.length}
            className='px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-40'
          >
            Somar ao pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderImportModal;
