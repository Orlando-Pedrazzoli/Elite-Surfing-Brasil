// client/src/components/priceTables/HistoryDrawer.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🧊 HISTÓRICO DE VERSÕES E ENVIOS
// ═══════════════════════════════════════════════════════════════════════
// Cada exportação ou envio congela uma versão da tabela. Aqui o admin vê
// o que saiu, quando, para quem — e pode baixar de novo exatamente o
// mesmo arquivo, mesmo que os custos tenham mudado depois.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Loader2,
  History,
  FileText,
  FileSpreadsheet,
  Images,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { describeRule } from '../../utils/priceTableEngine';
import {
  API,
  downloadExport,
  fmtDateTime,
  readBlobError,
} from '../../utils/priceTableUtils';

const DOWNLOADS = [
  {
    id: 'pdf-grid',
    label: 'Catálogo',
    icon: Images,
    body: { format: 'pdf', images: true, layout: 'grid' },
    ext: 'pdf',
  },
  {
    id: 'pdf',
    label: 'PDF',
    icon: FileText,
    body: { format: 'pdf' },
    ext: 'pdf',
  },
  {
    id: 'xlsx',
    label: 'Excel',
    icon: FileSpreadsheet,
    body: { format: 'xlsx' },
    ext: 'xlsx',
  },
];

const HistoryDrawer = ({ open, onClose, axios, tableId, currentVersion }) => {
  const [versions, setVersions] = useState(null);
  const [downloading, setDownloading] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/${tableId}/versions`);
      setVersions(data.success ? data.versions : []);
    } catch {
      setVersions([]);
      toast.error('Erro ao carregar o histórico');
    }
  }, [axios, tableId]);

  // Recarrega ao abrir e sempre que uma nova versão é criada
  useEffect(() => {
    if (!open) return;
    setVersions(null);
    load();
  }, [open, load, currentVersion]);

  // Esc fecha (onClose fica num ref para não refazer o efeito a cada render)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const download = async (version, option) => {
    const key = `${version._id}:${option.id}`;
    setDownloading(key);
    try {
      await downloadExport(
        axios,
        `${API}/versions/${version._id}/export`,
        option.body,
        `tabela-v${version.number}.${option.ext}`,
      );
    } catch (err) {
      toast.error((await readBlobError(err)) || 'Erro ao gerar o arquivo');
    } finally {
      setDownloading('');
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex justify-end bg-black/40'
      onClick={onClose}
    >
      <aside
        role='dialog'
        aria-modal='true'
        aria-label='Histórico de versões'
        onClick={e => e.stopPropagation()}
        className='bg-white w-full max-w-md h-full shadow-xl flex flex-col'
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-gray-900'>
            <History className='w-5 h-5 text-primary' />
            Histórico
          </h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Fechar'
            className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {versions === null ? (
            <div className='flex justify-center py-16 text-gray-400'>
              <Loader2 className='w-5 h-5 animate-spin' />
            </div>
          ) : versions.length === 0 ? (
            <div className='text-center py-16'>
              <p className='text-sm font-medium text-gray-700'>
                Nenhuma versão ainda
              </p>
              <p className='text-xs text-gray-500 mt-1 max-w-xs mx-auto'>
                A primeira versão é criada quando você exporta ou envia a
                tabela. Ela guarda os preços daquele momento.
              </p>
            </div>
          ) : (
            <ol className='space-y-4'>
              {versions.map(version => (
                <li
                  key={version._id}
                  className='border border-gray-200 rounded-xl overflow-hidden'
                >
                  <div className='px-4 py-3 bg-gray-50'>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='text-sm font-bold text-gray-900'>
                        Versão {version.number}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {fmtDateTime(version.createdAt)}
                      </p>
                    </div>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      {version.rowCount}{' '}
                      {version.rowCount === 1 ? 'produto' : 'produtos'} ·{' '}
                      {describeRule(version.settings)}
                    </p>
                    <div className='flex flex-wrap gap-1.5 mt-2.5'>
                      {DOWNLOADS.map(option => {
                        const key = `${version._id}:${option.id}`;
                        const busy = downloading === key;
                        return (
                          <button
                            key={option.id}
                            type='button'
                            onClick={() => download(version, option)}
                            disabled={!!downloading}
                            className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
                          >
                            {busy ? (
                              <Loader2 className='w-3.5 h-3.5 animate-spin' />
                            ) : (
                              <option.icon className='w-3.5 h-3.5' />
                            )}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {version.sends?.length > 0 ? (
                    <ul className='divide-y divide-gray-100'>
                      {version.sends
                        .slice()
                        .reverse()
                        .map((send, index) => (
                          <li
                            key={`${send.to}-${send.sentAt}-${index}`}
                            className='flex items-start gap-2 px-4 py-2 text-xs'
                          >
                            {send.status === 'sent' ? (
                              <CheckCircle2 className='w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0' />
                            ) : (
                              <XCircle className='w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0' />
                            )}
                            <span className='flex-1 min-w-0'>
                              <span className='block text-gray-800 truncate'>
                                {send.to}
                              </span>
                              <span className='block text-gray-400'>
                                {fmtDateTime(send.sentAt)} ·{' '}
                                {(send.formats || [])
                                  .map(f => (f === 'xlsx' ? 'Excel' : 'PDF'))
                                  .join(' + ')}
                                {send.images ? ' · com imagens' : ''}
                              </span>
                              {send.error && (
                                <span className='block text-red-600'>
                                  {send.error}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className='px-4 py-2.5 text-xs text-gray-400'>
                      Exportada, não enviada por email.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
};

export default HistoryDrawer;
