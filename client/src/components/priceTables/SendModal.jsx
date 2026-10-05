// client/src/components/priceTables/SendModal.jsx
// ═══════════════════════════════════════════════════════════════════════
// ✉️ ENVIAR TABELA POR EMAIL
// ═══════════════════════════════════════════════════════════════════════
// Destinatários digitados/colados ou escolhidos em Clientes (Vendas
// Diretas). Cada destinatário recebe um email separado, com a tabela em
// anexo (PDF e/ou Excel). O envio congela uma versão da tabela e fica
// registrado no histórico.
// Tabela de uso interno (com custo) exige confirmação explícita.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Loader2,
  Send,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  API,
  isValidEmail,
  normalizeSearch,
  splitEmails,
} from '../../utils/priceTableUtils';

const MAX_RECIPIENTS = 15;

const IMAGE_MODES = [
  {
    id: 'grid',
    label: 'Catálogo com imagens',
    hint: 'foto grande de cada produto',
  },
  { id: 'list', label: 'Lista com imagens', hint: 'miniatura em cada linha' },
  { id: 'none', label: 'Sem imagens', hint: 'arquivo mais leve' },
];

const DEFAULT_MESSAGE =
  'Olá!\n\nSegue em anexo a nossa tabela de preços atualizada.\n\nQualquer dúvida, é só responder a este email.\n\nAbraço,\nEquipe Elite Surfing';

const clienteName = c =>
  c.nomeFantasia || c.razaoSocial || c.nome || c.responsavel || c.email;

const SendModal = ({
  open,
  onClose,
  axios,
  tableId,
  table,
  visibleCount,
  emailConfigured,
  flush,
  onSent,
}) => {
  const [recipients, setRecipients] = useState([]);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [formats, setFormats] = useState({ pdf: true, xlsx: false });
  const [imageMode, setImageMode] = useState('grid');
  const [confirmInternal, setConfirmInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientes, setClientes] = useState(null);
  const [clienteSearch, setClienteSearch] = useState('');

  const internal = table.kind === 'interna';

  // O resultado do envio aparece no fim do formulário: rola até ele
  const resultsRef = useRef(null);
  useEffect(() => {
    if (results) resultsRef.current?.scrollIntoView({ block: 'nearest' });
  }, [results]);

  useEffect(() => {
    if (!open) return;
    setRecipients([]);
    setDraft('');
    setSubject(
      `${table.header.title || 'Tabela de Preços'} — Elite Surfing`.slice(
        0,
        150,
      ),
    );
    setMessage(DEFAULT_MESSAGE);
    setFormats({ pdf: true, xlsx: false });
    setImageMode(
      internal
        ? 'none'
        : table.options.showImages
          ? table.options.imageLayout || 'grid'
          : 'none',
    );
    setConfirmInternal(false);
    setError('');
    setResults(null);
    setPickerOpen(false);
    setClienteSearch('');
    // Só ao abrir: mudanças na tabela com o modal aberto não devem apagar o que foi digitado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clientes com email (carrega ao abrir o seletor)
  useEffect(() => {
    if (!open || !pickerOpen || clientes !== null) return;
    let cancelled = false;
    axios
      .get('/api/clientes')
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data?.clientes || []).filter(c => isValidEmail(c.email));
        setClientes(list);
      })
      .catch(() => !cancelled && setClientes([]));
    return () => {
      cancelled = true;
    };
  }, [open, pickerOpen, clientes, axios]);

  const filteredClientes = useMemo(() => {
    const q = normalizeSearch(clienteSearch);
    const list = clientes || [];
    if (!q) return list;
    return list.filter(c =>
      normalizeSearch(`${clienteName(c)} ${c.email} ${c.cnpj || ''}`).includes(
        q,
      ),
    );
  }, [clientes, clienteSearch]);

  if (!open) return null;

  const addEmails = text => {
    const incoming = splitEmails(text);
    if (!incoming.length) return true;
    const invalid = incoming.filter(email => !isValidEmail(email));
    if (invalid.length) {
      setError(
        `Email inválido: ${invalid.map(e => e.slice(0, 60)).join(', ')}`,
      );
      return false;
    }
    const next = [...new Set([...recipients, ...incoming])];
    if (next.length > MAX_RECIPIENTS) {
      setError(`Envie para no máximo ${MAX_RECIPIENTS} emails de cada vez.`);
      return false;
    }
    setRecipients(next);
    setError('');
    return true;
  };

  const commitDraft = () => {
    if (!draft.trim()) return true;
    const ok = addEmails(draft);
    if (ok) setDraft('');
    return ok;
  };

  const toggleCliente = email => {
    const clean = String(email).trim().toLowerCase();
    if (recipients.includes(clean))
      setRecipients(recipients.filter(r => r !== clean));
    else addEmails(clean);
  };

  const submit = async e => {
    e.preventDefault();
    if (sending) return;

    // Junta o que ainda está no campo de digitação
    const pending = splitEmails(draft);
    const invalid = pending.filter(email => !isValidEmail(email));
    if (invalid.length)
      return setError(
        `Email inválido: ${invalid.map(e => e.slice(0, 60)).join(', ')}`,
      );
    const all = [...new Set([...recipients, ...pending])];

    if (!all.length) return setError('Informe ao menos um email.');
    if (all.length > MAX_RECIPIENTS)
      return setError(
        `Envie para no máximo ${MAX_RECIPIENTS} emails de cada vez.`,
      );
    const chosen = Object.keys(formats).filter(f => formats[f]);
    if (!chosen.length) return setError('Escolha ao menos um anexo.');
    if (!subject.trim()) return setError('Informe o assunto.');
    if (!message.trim()) return setError('Escreva uma mensagem.');
    if (internal && !confirmInternal)
      return setError('Confirme o envio da tabela de uso interno.');

    setRecipients(all);
    setDraft('');
    setSending(true);
    setError('');
    setResults(null);
    try {
      const saved = await flush();
      if (!saved)
        throw new Error('Não foi possível salvar a tabela antes de enviar.');

      const { data } = await axios.post(
        `${API}/${tableId}/send`,
        {
          recipients: all,
          subject: subject.trim(),
          message: message.trim(),
          formats: chosen,
          images: imageMode !== 'none',
          layout: imageMode === 'grid' ? 'grid' : 'list',
          confirmInternal: internal ? confirmInternal : undefined,
        },
        { timeout: 70000 },
      );
      setResults(data);
      // Ficam na lista só os que falharam, prontos para reenviar
      const failed = (data.results || [])
        .filter(r => r.status !== 'sent')
        .map(r => r.to);
      setRecipients(failed);
      if (data.success) onSent?.(data);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Erro ao enviar a tabela',
      );
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  return (
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'>
      <form
        onSubmit={submit}
        className='bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[94vh] flex flex-col'
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
          <div>
            <h2 className='text-lg font-bold text-gray-900'>
              Enviar por email
            </h2>
            <p className='text-xs text-gray-500 mt-0.5'>
              {table.name} · {visibleCount}{' '}
              {visibleCount === 1 ? 'produto' : 'produtos'}
            </p>
          </div>
          <button
            type='button'
            onClick={() => !sending && onClose()}
            aria-label='Fechar'
            className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='overflow-y-auto px-6 py-5 space-y-5'>
          {!emailConfigured && (
            <div className='flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5'>
              <AlertTriangle className='w-4 h-4 mt-0.5 flex-shrink-0' />
              <span>
                O envio de email não está configurado no servidor (variáveis
                GMAIL_USER e GMAIL_APP_PASSWORD). Enquanto isso, baixe o PDF e
                envie manualmente.
              </span>
            </div>
          )}

          {internal && (
            <div className='text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-3'>
              <p className='font-semibold flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4' />
                Tabela de uso interno
              </p>
              <p className='mt-1 text-xs leading-relaxed'>
                Esta tabela contém o custo do fornecedor. Envie apenas para
                pessoas da sua equipe.
              </p>
              <label className='flex items-start gap-2 mt-2.5 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={confirmInternal}
                  onChange={e => setConfirmInternal(e.target.checked)}
                  className='mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-300'
                />
                <span className='text-xs font-medium'>
                  Entendo e quero enviar esta tabela com custos.
                </span>
              </label>
            </div>
          )}

          {/* Destinatários */}
          <div>
            <div className='flex items-center justify-between mb-1'>
              <label
                htmlFor='pt-send-to'
                className='text-xs font-semibold text-gray-600'
              >
                Para ({recipients.length}/{MAX_RECIPIENTS})
              </label>
              <button
                type='button'
                onClick={() => setPickerOpen(o => !o)}
                className='flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline'
              >
                <UserPlus className='w-3.5 h-3.5' />
                {pickerOpen ? 'Fechar clientes' : 'Escolher em Clientes'}
              </button>
            </div>
            <div className='flex flex-wrap items-center gap-1.5 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary'>
              {recipients.map(email => (
                <span
                  key={email}
                  className='inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full'
                >
                  {email}
                  <button
                    type='button'
                    onClick={() =>
                      setRecipients(recipients.filter(r => r !== email))
                    }
                    aria-label={`Remover ${email}`}
                    className='p-0.5 hover:bg-primary/20 rounded-full'
                  >
                    <X className='w-3 h-3' />
                  </button>
                </span>
              ))}
              <input
                id='pt-send-to'
                value={draft}
                onChange={e => {
                  const value = e.target.value;
                  // vírgula, ponto e vírgula ou espaço fecham o email atual
                  if (/[\s,;]$/.test(value)) {
                    if (addEmails(value)) setDraft('');
                    else setDraft(value.replace(/[\s,;]+$/, ''));
                  } else setDraft(value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitDraft();
                  }
                  if (e.key === 'Backspace' && !draft && recipients.length)
                    setRecipients(recipients.slice(0, -1));
                }}
                onBlur={commitDraft}
                onPaste={e => {
                  const text = e.clipboardData.getData('text');
                  if (/[\s,;]/.test(text.trim())) {
                    e.preventDefault();
                    addEmails(text);
                  }
                }}
                placeholder={
                  recipients.length
                    ? ''
                    : 'email@loja.com.br, outro@loja.com.br'
                }
                className='flex-1 min-w-[180px] px-1 py-1 text-sm focus:outline-none'
              />
            </div>
            <p className='text-[11px] text-gray-400 mt-1'>
              Cada pessoa recebe um email separado — ninguém vê o endereço dos
              outros.
            </p>

            {pickerOpen && (
              <div className='mt-2 border border-gray-200 rounded-lg'>
                <div className='relative border-b border-gray-100'>
                  <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
                  <input
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                    placeholder='Buscar cliente por nome, CNPJ ou email'
                    aria-label='Buscar cliente'
                    className='w-full pl-9 pr-3 py-2 text-sm rounded-t-lg focus:outline-none'
                  />
                </div>
                <div className='max-h-44 overflow-y-auto'>
                  {clientes === null ? (
                    <div className='flex justify-center py-5 text-gray-400'>
                      <Loader2 className='w-4 h-4 animate-spin' />
                    </div>
                  ) : filteredClientes.length === 0 ? (
                    <p className='text-xs text-gray-400 text-center py-5'>
                      {clientes.length === 0
                        ? 'Nenhum cliente com email cadastrado.'
                        : 'Nenhum cliente encontrado.'}
                    </p>
                  ) : (
                    filteredClientes.map(cliente => {
                      const email = String(cliente.email).trim().toLowerCase();
                      const checked = recipients.includes(email);
                      return (
                        <label
                          key={cliente._id}
                          className='flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer'
                        >
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={() => toggleCliente(email)}
                            className='rounded border-gray-300 text-primary focus:ring-primary/30'
                          />
                          <span className='flex-1 min-w-0'>
                            <span className='block text-gray-800 truncate'>
                              {clienteName(cliente)}
                            </span>
                            <span className='block text-xs text-gray-400 truncate'>
                              {email}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor='pt-send-subject'
              className='block text-xs font-semibold text-gray-600 mb-1'
            >
              Assunto
            </label>
            <input
              id='pt-send-subject'
              value={subject}
              onChange={e => setSubject(e.target.value)}
              maxLength={150}
              className={inputCls}
            />
          </div>

          <div>
            <label
              htmlFor='pt-send-message'
              className='block text-xs font-semibold text-gray-600 mb-1'
            >
              Mensagem
            </label>
            <textarea
              id='pt-send-message'
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={3000}
              rows={6}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
            <fieldset>
              <legend className='text-xs font-semibold text-gray-600 mb-1.5'>
                Anexos
              </legend>
              <div className='space-y-1.5'>
                {[
                  { id: 'pdf', label: 'PDF' },
                  { id: 'xlsx', label: 'Excel (.xlsx)' },
                ].map(format => (
                  <label
                    key={format.id}
                    className='flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={formats[format.id]}
                      onChange={e =>
                        setFormats(f => ({
                          ...f,
                          [format.id]: e.target.checked,
                        }))
                      }
                      className='rounded border-gray-300 text-primary focus:ring-primary/30'
                    />
                    {format.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className='text-xs font-semibold text-gray-600 mb-1.5'>
                Imagens dos produtos
              </legend>
              <div className='space-y-1.5'>
                {IMAGE_MODES.map(option => (
                  <label
                    key={option.id}
                    className='flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer'
                  >
                    <input
                      type='radio'
                      name='pt-send-images'
                      checked={imageMode === option.id}
                      onChange={() => setImageMode(option.id)}
                      className='border-gray-300 text-primary focus:ring-primary/30'
                    />
                    <span>
                      {option.label}{' '}
                      <span className='text-xs text-gray-400'>
                        — {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {results && (
            <div
              ref={resultsRef}
              role='status'
              className='border border-gray-200 rounded-lg divide-y divide-gray-100'
            >
              <p className='px-3 py-2 text-sm font-semibold text-gray-800'>
                {results.message}
                {results.version ? ` (versão ${results.version})` : ''}
              </p>
              {(results.results || []).map(result => (
                <div
                  key={result.to}
                  className='flex items-start gap-2 px-3 py-2 text-sm'
                >
                  {result.status === 'sent' ? (
                    <CheckCircle2 className='w-4 h-4 text-green-600 mt-0.5 flex-shrink-0' />
                  ) : (
                    <XCircle className='w-4 h-4 text-red-600 mt-0.5 flex-shrink-0' />
                  )}
                  <span className='min-w-0'>
                    <span className='block text-gray-800 truncate'>
                      {result.to}
                    </span>
                    {result.error && (
                      <span className='block text-xs text-red-600'>
                        {result.error}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {results.imageStats &&
                results.imageStats.loaded < results.imageStats.requested && (
                  <p className='px-3 py-2 text-xs text-amber-700'>
                    {results.imageStats.requested - results.imageStats.loaded}{' '}
                    imagens não puderam ser carregadas e saíram em branco.
                  </p>
                )}
            </div>
          )}

          {error && (
            <p role='alert' className='text-sm text-red-600'>
              {error}
            </p>
          )}
        </div>

        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100'>
          <button
            type='button'
            onClick={() => !sending && onClose()}
            className='px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg'
          >
            {results?.success ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type='submit'
            disabled={sending || !emailConfigured}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60'
          >
            {sending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Send className='w-4 h-4' />
            )}
            {sending
              ? 'Enviando…'
              : results && recipients.length > 0
                ? 'Reenviar para os que falharam'
                : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendModal;
