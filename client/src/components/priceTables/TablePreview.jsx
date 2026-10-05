// client/src/components/priceTables/TablePreview.jsx
// ═══════════════════════════════════════════════════════════════════════
// 👁️ VISUALIZAÇÃO DA TABELA — o que o lojista vai receber
// ═══════════════════════════════════════════════════════════════════════
// Mostra só as linhas que saem na exportação, na ordem da tabela, em três
// formatos que correspondem aos PDFs: só texto, lista com imagens e
// catálogo (grade). Em tabela `cliente` nunca aparece custo nem %.
// ═══════════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { formatBRL, formatPct } from '../../utils/priceTableEngine';
import { fmtDate, thumbUrl } from '../../utils/priceTableUtils';

const Thumb = ({ src, size, className = '' }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}
      >
        <ImageOff className='w-5 h-5' />
      </div>
    );
  return (
    <img
      src={thumbUrl(src, size)}
      alt=''
      loading='lazy'
      onError={() => setFailed(true)}
      className={`object-contain bg-white ${className}`}
    />
  );
};

const TablePreview = ({ table, computed, mode }) => {
  const internal = table.kind === 'interna';
  const showSku = table.options.showSku !== false;

  const sections = useMemo(
    () =>
      computed.sections
        .map(section => ({
          key: section.key,
          title: section.title,
          rows: section.rows.filter(row => !row.excluded),
        }))
        .filter(section => section.rows.length > 0),
    [computed],
  );

  // Tabela interna em que o preço é o próprio custo: uma coluna só, "Custo"
  const pureCost =
    internal &&
    sections.every(s =>
      s.rows.every(r => r.cost !== null && r.cost === r.price),
    );
  const internalColumns = internal && !pureCost;
  const priceLabel = pureCost ? 'Custo' : 'Preço';
  const total = sections.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='relative px-5 sm:px-10 py-8 max-w-4xl mx-auto'>
        {/* Cabeçalho */}
        <div className='text-center mb-7'>
          <p className='text-2xl font-bold text-primary tracking-wide'>
            ELITE SURFING
          </p>
          <p className='text-base text-gray-500 mt-1'>
            {table.header.title || 'Tabela de Preços'}
          </p>
          {table.header.subtitle && (
            <p className='text-sm text-gray-500 mt-0.5'>
              {table.header.subtitle}
            </p>
          )}
          <p className='text-xs text-gray-400 mt-1'>
            Atualizada em: {fmtDate(new Date().toISOString())}
            {table.header.validUntil &&
              `   ·   Válida até: ${fmtDate(table.header.validUntil)}`}
          </p>
          {internal && (
            <p className='text-xs font-bold text-red-700 mt-2'>
              USO INTERNO — CONFIDENCIAL · NÃO COMPARTILHAR
            </p>
          )}
        </div>

        {total === 0 && (
          <p className='text-center text-sm text-gray-500 py-12'>
            Nenhum produto com preço nesta tabela. Confira o custo dos produtos
            e as opções em “Produtos incluídos”.
          </p>
        )}

        {sections.map(section => (
          <div key={section.key} className='mb-6'>
            <h3 className='bg-primary text-white text-sm font-bold uppercase tracking-wide px-3 py-1.5'>
              {section.title}
            </h3>

            {mode === 'grid' ? (
              <div className='grid grid-cols-2 sm:grid-cols-3 border-l border-gray-200'>
                {section.rows.map(row => (
                  <div
                    key={row.productId}
                    className='border-r border-b border-gray-200 p-3 text-center'
                  >
                    <Thumb
                      src={row.product.image}
                      size={320}
                      className='w-full aspect-square'
                    />
                    {showSku && row.product.sku && (
                      <p className='text-[11px] text-gray-400 mt-2'>
                        {row.product.sku}
                      </p>
                    )}
                    <p className='text-sm font-semibold text-gray-900 mt-0.5 leading-snug'>
                      {row.product.name}
                    </p>
                    <p className='text-base font-bold text-green-700 mt-1'>
                      {formatBRL(row.price)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-gray-100 text-xs text-gray-500'>
                      {mode === 'list' && <th className='w-14 px-2 py-1.5' />}
                      {showSku && (
                        <th className='text-left font-semibold px-2 py-1.5 w-28'>
                          Código
                        </th>
                      )}
                      <th className='text-left font-semibold px-2 py-1.5'>
                        Produto
                      </th>
                      {internalColumns && (
                        <>
                          <th className='text-right font-semibold px-2 py-1.5 w-24'>
                            Custo
                          </th>
                          <th className='text-right font-semibold px-2 py-1.5 w-16'>
                            %
                          </th>
                        </>
                      )}
                      <th className='text-right font-semibold px-2 py-1.5 w-28'>
                        {priceLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, index) => (
                      <tr
                        key={row.productId}
                        className={`border-b border-gray-100 ${
                          index % 2 === 1 ? 'bg-gray-50/60' : ''
                        }`}
                      >
                        {mode === 'list' && (
                          <td className='px-2 py-1'>
                            <Thumb
                              src={row.product.image}
                              size={120}
                              className='w-10 h-10 rounded'
                            />
                          </td>
                        )}
                        {showSku && (
                          <td className='px-2 py-1.5 text-gray-500 whitespace-nowrap'>
                            {row.product.sku || '—'}
                          </td>
                        )}
                        <td className='px-2 py-1.5 text-gray-900'>
                          {row.product.name}
                        </td>
                        {internalColumns && (
                          <>
                            <td className='px-2 py-1.5 text-right text-gray-500 whitespace-nowrap'>
                              {row.cost !== null ? formatBRL(row.cost) : '—'}
                            </td>
                            <td className='px-2 py-1.5 text-right text-gray-500 whitespace-nowrap'>
                              {row.source === 'fixed'
                                ? 'fixo'
                                : formatPct(row.pct)}
                            </td>
                          </>
                        )}
                        <td className='px-2 py-1.5 text-right font-bold text-green-700 whitespace-nowrap'>
                          {formatBRL(row.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {(table.header.paymentTerms || table.header.notes) && total > 0 && (
          <div className='border border-gray-200 rounded-lg p-4 text-sm space-y-3'>
            {table.header.paymentTerms && (
              <div>
                <p className='font-semibold text-primary'>
                  Condições de pagamento
                </p>
                <p className='text-gray-700 whitespace-pre-line'>
                  {table.header.paymentTerms}
                </p>
              </div>
            )}
            {table.header.notes && (
              <div>
                <p className='font-semibold text-primary'>Observações</p>
                <p className='text-gray-700 whitespace-pre-line'>
                  {table.header.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TablePreview;
