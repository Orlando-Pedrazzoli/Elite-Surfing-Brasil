// client/src/pages/seller/Resellers.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🏪 REVENDEDORES — painel admin (/seller/revendedores)
// ═══════════════════════════════════════════════════════════════════════
// Candidaturas enviadas pelo formulário público /revendedores.
//   • resumo por status (em análise / aprovados / recusados);
//   • filtro por status + busca (empresa, responsável, e-mail, CNPJ,
//     cidade);
//   • painel lateral com os dados completos, anotações internas e as
//     ações: aprovar (e-mail ao lojista, com recado opcional), recusar
//     (motivo opcional), excluir (permite nova candidatura com o mesmo
//     CNPJ), WhatsApp / e-mail direto e atalho para "Tabelas de Preço"
//     (é por lá que a tabela é enviada ao lojista aprovado).
//
// O e-mail de nova candidatura traz um link com ?id=<candidatura>: a
// página abre direto nesse registo.
//
// API: /api/seller/resellers (ver resellerController.js).
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Store,
  Search,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  ExternalLink,
  StickyNote,
  AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const API = '/api/seller/resellers';

const STATUS = {
  pending: {
    label: 'Em análise',
    icon: Clock,
    chip: 'bg-amber-100 text-amber-800 border-amber-200',
    tile: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    chip: 'bg-green-100 text-green-800 border-green-200',
    tile: 'border-green-200 bg-green-50 text-green-800',
  },
  rejected: {
    label: 'Recusado',
    icon: XCircle,
    chip: 'bg-red-100 text-red-700 border-red-200',
    tile: 'border-red-200 bg-red-50 text-red-700',
  },
};

const STORE_TYPE_LABEL = {
  fisica: 'Loja física',
  online: 'Loja online',
  ambas: 'Física + online',
};

const formatCNPJ = cnpj => {
  const d = String(cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj || '';
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const formatPhone = phone => {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return phone || '';
};

const formatDate = value =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const formatAddress = a => {
  if (!a) return '—';
  const line1 = [a.street, a.number].filter(Boolean).join(', ');
  const full = [
    line1 + (a.complement ? ` - ${a.complement}` : ''),
    a.neighborhood,
    [a.city, a.state].filter(Boolean).join(' - '),
    a.cep ? `CEP ${a.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}` : '',
  ].filter(Boolean);
  return full.length ? full.join(' · ') : '—';
};

const StatusChip = ({ status }) => {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.chip}`}
    >
      <Icon className='w-3 h-3' />
      {s.label}
    </span>
  );
};

const copy = async (text, label = 'Copiado') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Não foi possível copiar');
  }
};

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────
const Resellers = () => {
  const { axios } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API);
      if (data?.success) {
        setItems(data.resellers || []);
        setSummary(data.summary || { pending: 0, approved: 0, rejected: 0 });
      } else {
        toast.error(data?.message || 'Erro ao carregar revendedores');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erro ao carregar revendedores');
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Abrir direto um registo vindo do link do e-mail (?id=)
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && items.length) {
      const found = items.find(r => r._id === id);
      if (found) {
        setStatusFilter(found.status);
        setSelectedId(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return items.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        r.companyName,
        r.tradeName,
        r.contactName,
        r.email,
        r.address?.city,
        r.address?.state,
        r.website,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) return true;
      if (qDigits && (r.cnpj?.includes(qDigits) || r.phone?.includes(qDigits)))
        return true;
      return false;
    });
  }, [items, statusFilter, search]);

  const selected = useMemo(
    () => items.find(r => r._id === selectedId) || null,
    [items, selectedId],
  );

  const openItem = id => {
    setSelectedId(id);
    setSearchParams(id ? { id } : {});
  };

  const recountSummary = list => {
    const s = { pending: 0, approved: 0, rejected: 0 };
    for (const r of list) if (r.status in s) s[r.status] += 1;
    setSummary(s);
  };

  // ─── Ações ───
  const [acting, setActing] = useState(false);

  const act = async (id, payload, successMsg) => {
    setActing(true);
    try {
      const { data } = await axios.patch(`${API}/${id}`, payload);
      if (!data?.success) {
        toast.error(data?.message || 'Erro ao atualizar');
        return false;
      }
      setItems(prev => {
        const next = prev.map(r => (r._id === data.reseller._id ? { ...r, ...data.reseller } : r));
        recountSummary(next);
        return next;
      });
      if (successMsg) toast.success(successMsg);
      if (data.emailSent === false) {
        toast.error('A ação foi gravada, mas o e-mail ao lojista falhou. Avise-o manualmente.', {
          duration: 6000,
        });
      }
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar');
      return false;
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async r => {
    if (
      !window.confirm(
        `Excluir a candidatura da ${r.tradeName}? O lojista poderá cadastrar-se de novo com o mesmo CNPJ.`,
      )
    )
      return;
    setActing(true);
    try {
      const { data } = await axios.delete(`${API}/${r._id}`);
      if (!data?.success) return toast.error(data?.message || 'Erro ao excluir');
      setItems(prev => {
        const next = prev.filter(x => x._id !== r._id);
        recountSummary(next);
        return next;
      });
      openItem(null);
      toast.success('Candidatura excluída');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erro ao excluir');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-6xl mx-auto'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
              <Store className='w-6 h-6 text-primary' />
              Revendedores
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              Candidaturas enviadas pela página{' '}
              <a
                href='/revendedores'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline inline-flex items-center gap-1'
              >
                /revendedores <ExternalLink className='w-3 h-3' />
              </a>
              . Aprove, recuse e envie a tabela de preços pelo painel de tabelas.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={fetchAll}
              disabled={loading}
              className='flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all disabled:opacity-60'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <Link
              to='/seller/tabelas'
              className='flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dull transition-all'
            >
              <FileSpreadsheet className='w-4 h-4' />
              Tabelas de Preço
            </Link>
          </div>
        </div>

        {/* Resumo */}
        <div className='grid grid-cols-3 gap-3 mb-6'>
          {Object.entries(STATUS).map(([key, s]) => {
            const Icon = s.icon;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(active ? 'all' : key)}
                className={`text-left rounded-xl border p-4 transition-all ${s.tile} ${
                  active ? 'ring-2 ring-offset-1 ring-primary/40' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide'>
                  <Icon className='w-4 h-4' />
                  {s.label}
                </div>
                <div className='text-2xl font-black mt-1'>{summary[key] ?? 0}</div>
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className='flex flex-col sm:flex-row gap-3 mb-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar por loja, responsável, e-mail, CNPJ ou cidade…'
              className='w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
          >
            <option value='all'>Todos os status</option>
            <option value='pending'>Em análise</option>
            <option value='approved'>Aprovados</option>
            <option value='rejected'>Recusados</option>
          </select>
        </div>

        {/* Lista */}
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          {loading ? (
            <div className='p-12 flex items-center justify-center text-gray-400 gap-2'>
              <Loader2 className='w-5 h-5 animate-spin' /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className='p-12 text-center text-gray-400'>
              <Store className='w-10 h-10 mx-auto mb-3 opacity-40' />
              <p className='font-medium text-gray-500'>Nenhuma candidatura aqui</p>
              <p className='text-sm mt-1'>
                {items.length === 0
                  ? 'Quando um lojista preencher o formulário em /revendedores, ele aparece nesta lista.'
                  : 'Experimente outro filtro ou termo de busca.'}
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-xs uppercase tracking-wide text-gray-500'>
                  <tr>
                    <th className='text-left px-4 py-3 font-semibold'>Loja</th>
                    <th className='text-left px-4 py-3 font-semibold hidden md:table-cell'>Responsável</th>
                    <th className='text-left px-4 py-3 font-semibold hidden lg:table-cell'>Cidade</th>
                    <th className='text-left px-4 py-3 font-semibold hidden sm:table-cell'>Recebido</th>
                    <th className='text-left px-4 py-3 font-semibold'>Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {filtered.map(r => (
                    <tr
                      key={r._id}
                      onClick={() => openItem(r._id)}
                      className={`cursor-pointer hover:bg-gray-50/80 transition-colors ${
                        selectedId === r._id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className='px-4 py-3 align-top'>
                        <div className='font-semibold text-gray-900'>{r.tradeName}</div>
                        <div className='text-xs text-gray-500'>
                          {formatCNPJ(r.cnpj)} · {STORE_TYPE_LABEL[r.storeType] || r.storeType}
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top hidden md:table-cell'>
                        <div className='text-gray-800'>{r.contactName}</div>
                        <div className='text-xs text-gray-500'>{r.email}</div>
                      </td>
                      <td className='px-4 py-3 align-top hidden lg:table-cell text-gray-700'>
                        {[r.address?.city, r.address?.state].filter(Boolean).join(' - ') || '—'}
                      </td>
                      <td className='px-4 py-3 align-top hidden sm:table-cell text-gray-600 whitespace-nowrap'>
                        {formatDate(r.createdAt)}
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <StatusChip status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Painel lateral */}
      {selected && (
        <ResellerDrawer
          reseller={selected}
          acting={acting}
          onClose={() => openItem(null)}
          onApprove={(note, notify) =>
            act(selected._id, { action: 'approve', note, notify }, 'Revendedor aprovado')
          }
          onReject={(reason, notify) =>
            act(selected._id, { action: 'reject', reason, notify }, 'Candidatura recusada')
          }
          onNotes={notes => act(selected._id, { action: 'notes', notes }, 'Anotações gravadas')}
          onDelete={() => handleDelete(selected)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Painel lateral com os dados e as ações
// ─────────────────────────────────────────────────────────────────────
const ResellerDrawer = ({
  reseller: r,
  acting,
  onClose,
  onApprove,
  onReject,
  onNotes,
  onDelete,
}) => {
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [text, setText] = useState('');
  const [notify, setNotify] = useState(true);
  const [notes, setNotes] = useState(r.adminNotes || '');

  useEffect(() => {
    setMode(null);
    setText('');
    setNotify(true);
    setNotes(r.adminNotes || '');
  }, [r._id, r.adminNotes]);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const whatsappUrl = `https://wa.me/55${String(r.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá, ${r.contactName?.split(' ')[0] || ''}! Aqui é da Elite Surfing, sobre o cadastro de revendedor da ${r.tradeName}.`,
  )}`;

  const confirm = async () => {
    const ok = mode === 'approve' ? await onApprove(text, notify) : await onReject(text, notify);
    if (ok) {
      setMode(null);
      setText('');
    }
  };

  const Row = ({ label, children }) => (
    <div className='grid grid-cols-[120px_1fr] gap-2 py-1.5 text-sm'>
      <span className='text-gray-500'>{label}</span>
      <span className='text-gray-900 break-words'>{children || '—'}</span>
    </div>
  );

  return (
    <div className='fixed inset-0 z-[70] flex justify-end'>
      <div className='absolute inset-0 bg-black/40' onClick={onClose} />
      <aside className='relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col'>
        {/* Topo */}
        <div className='sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4 z-10'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h2 className='text-lg font-bold text-gray-900 truncate'>{r.tradeName}</h2>
              <StatusChip status={r.status} />
            </div>
            <p className='text-xs text-gray-500 mt-0.5'>
              Recebido em {formatDate(r.createdAt)}
              {r.reviewedAt ? ` · analisado em ${formatDate(r.reviewedAt)}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-lg hover:bg-gray-100 text-gray-500'
            aria-label='Fechar'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='px-6 py-5 space-y-6 flex-1'>
          {/* Contato rápido */}
          <div className='flex flex-wrap gap-2'>
            <a
              href={whatsappUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:bg-[#1ebe5b]'
            >
              <MessageCircle className='w-4 h-4' /> WhatsApp
            </a>
            <a
              href={`mailto:${r.email}`}
              className='inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-200'
            >
              <Mail className='w-4 h-4' /> E-mail
            </a>
            <button
              onClick={() => copy(r.email, 'E-mail copiado')}
              className='inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-200'
            >
              <Copy className='w-4 h-4' /> Copiar e-mail
            </button>
            {r.status === 'approved' && (
              <Link
                to='/seller/tabelas'
                className='inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dull'
              >
                <FileSpreadsheet className='w-4 h-4' /> Enviar tabela de preços
              </Link>
            )}
          </div>

          {/* Empresa */}
          <section>
            <h3 className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>Empresa</h3>
            <Row label='Razão social'>{r.companyName}</Row>
            <Row label='Nome fantasia'>{r.tradeName}</Row>
            <Row label='CNPJ'>
              <button
                onClick={() => copy(formatCNPJ(r.cnpj), 'CNPJ copiado')}
                className='font-mono hover:text-primary inline-flex items-center gap-1'
                title='Copiar'
              >
                {formatCNPJ(r.cnpj)} <Copy className='w-3 h-3 opacity-60' />
              </button>
            </Row>
            <Row label='Inscr. estadual'>{r.stateRegistration}</Row>
            <Row label='Tipo de loja'>{STORE_TYPE_LABEL[r.storeType] || r.storeType}</Row>
            <Row label='Site / Instagram'>
              {r.website ? (
                <a
                  href={
                    /^https?:\/\//i.test(r.website)
                      ? r.website
                      : r.website.startsWith('@')
                        ? `https://instagram.com/${r.website.slice(1)}`
                        : `https://${r.website}`
                  }
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary underline inline-flex items-center gap-1'
                >
                  {r.website} <ExternalLink className='w-3 h-3' />
                </a>
              ) : null}
            </Row>
            <Row label='Endereço'>{formatAddress(r.address)}</Row>
          </section>

          {/* Contato */}
          <section>
            <h3 className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2'>Responsável</h3>
            <Row label='Nome'>{r.contactName}</Row>
            <Row label='E-mail'>{r.email}</Row>
            <Row label='WhatsApp'>{formatPhone(r.phone)}</Row>
            {r.message && (
              <div className='mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap'>
                {r.message}
              </div>
            )}
          </section>

          {r.status === 'rejected' && r.rejectionReason && (
            <div className='flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800'>
              <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
              <div>
                <p className='font-semibold'>Motivo da recusa enviado ao lojista</p>
                <p className='whitespace-pre-wrap'>{r.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Anotações internas */}
          <section>
            <h3 className='text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1'>
              <StickyNote className='w-3.5 h-3.5' /> Anotações internas
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={2000}
              placeholder='Só a equipe vê. Ex.: ligou dia 02/11, pediu catálogo de decks…'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none'
            />
            {notes !== (r.adminNotes || '') && (
              <button
                onClick={() => onNotes(notes)}
                disabled={acting}
                className='mt-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-60'
              >
                Gravar anotações
              </button>
            )}
          </section>

          {/* Ação em curso */}
          {mode && (
            <section
              className={`rounded-xl border p-4 ${
                mode === 'approve' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <h3 className='font-bold text-gray-900 mb-1'>
                {mode === 'approve' ? 'Aprovar revendedor' : 'Recusar candidatura'}
              </h3>
              <p className='text-xs text-gray-600 mb-3'>
                {mode === 'approve'
                  ? 'O lojista recebe um e-mail de boas-vindas. Depois, envie a tabela de preços pelo painel "Tabelas de Preço".'
                  : 'O lojista recebe um e-mail com a resposta (e o motivo, se preenchido).'}
              </p>
              <textarea
                rows={3}
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={mode === 'approve' ? 2000 : 1000}
                placeholder={
                  mode === 'approve'
                    ? 'Recado opcional para o e-mail (ex.: condições, primeiro pedido, contato do representante)…'
                    : 'Motivo opcional (vai no e-mail ao lojista)…'
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none'
              />
              <label className='flex items-center gap-2 mt-2 text-sm text-gray-700'>
                <input
                  type='checkbox'
                  checked={notify}
                  onChange={e => setNotify(e.target.checked)}
                  className='rounded'
                />
                Enviar e-mail ao lojista
              </label>
              <div className='flex gap-2 mt-3'>
                <button
                  onClick={confirm}
                  disabled={acting}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 ${
                    mode === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {acting ? <Loader2 className='w-4 h-4 animate-spin' /> : null}
                  Confirmar
                </button>
                <button
                  onClick={() => setMode(null)}
                  disabled={acting}
                  className='px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                >
                  Cancelar
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Rodapé com ações */}
        {!mode && (
          <div className='sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex flex-wrap gap-2 justify-between'>
            <div className='flex gap-2'>
              {r.status !== 'approved' && (
                <button
                  onClick={() => setMode('approve')}
                  disabled={acting}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-60'
                >
                  <CheckCircle2 className='w-4 h-4' /> Aprovar
                </button>
              )}
              {r.status !== 'rejected' && (
                <button
                  onClick={() => setMode('reject')}
                  disabled={acting}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-60'
                >
                  <XCircle className='w-4 h-4' /> Recusar
                </button>
              )}
            </div>
            <button
              onClick={onDelete}
              disabled={acting}
              className='inline-flex items-center gap-2 px-3 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100 hover:text-red-600 disabled:opacity-60'
              title='Excluir candidatura'
            >
              <Trash2 className='w-4 h-4' /> Excluir
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Resellers;
