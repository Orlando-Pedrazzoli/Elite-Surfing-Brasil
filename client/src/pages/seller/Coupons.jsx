// client/src/pages/seller/Coupons.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🎫 CUPONS DE DESCONTO — painel admin
// ═══════════════════════════════════════════════════════════════════════
// Lista com métricas, criação/edição em modal, ativar/desativar, excluir,
// histórico de resgates. Regras suportadas: percentual/fixo, teto,
// pedido mínimo, validade (início/fim), limite global e por cliente,
// escopo por categoria (group) ou subcategoria (category), acumular
// com PIX, apenas primeira compra.
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { groups, categories } from '../../assets/assets';
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Percent,
  BadgeDollarSign,
  CalendarClock,
  Users,
  Power,
  History,
  Sparkles,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatBRL } from '../../utils/installmentUtils';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const STATUS_META = {
  active: { label: 'Ativo', cls: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Agendado', cls: 'bg-blue-100 text-blue-700' },
  expired: { label: 'Expirado', cls: 'bg-gray-100 text-gray-500' },
  exhausted: { label: 'Esgotado', cls: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inativo', cls: 'bg-red-100 text-red-600' },
};

const toInputDateTime = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDate = iso =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const emptyForm = () => ({
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscount: '',
  minOrderValue: '',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perCustomerLimit: '',
  scope: 'all',
  groups: [],
  categories: [],
  stackWithPix: true,
  firstOrderOnly: false,
  isActive: true,
});

const generateCode = (prefix = 'ELITE') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${s}`;
};

const scopeLabel = c => {
  if (c.scope === 'groups') {
    const names = c.groups.map(g => groups.find(x => x.slug === g)?.name || g);
    return names.join(', ');
  }
  if (c.scope === 'categories') {
    const names = c.categories.map(
      p => categories.find(x => x.path === p)?.text || p,
    );
    return names.join(', ');
  }
  return 'Todos os produtos';
};

// ─────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────
const Coupons = () => {
  const { axios } = useAppContext();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [historyFor, setHistoryFor] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [copied, setCopied] = useState('');

  // ─── Fetch ───
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/coupon');
      if (data.success) setCoupons(data.coupons);
      else toast.error(data.message || 'Erro ao carregar cupons');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derivados ───
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    });
  }, [coupons, search, statusFilter]);

  const totals = useMemo(() => {
    const active = coupons.filter(c => c.status === 'active').length;
    const redemptions = coupons.reduce(
      (a, c) => a + (c.stats?.confirmed || 0),
      0,
    );
    const discount = coupons.reduce(
      (a, c) => a + (c.stats?.totalDiscount || 0),
      0,
    );
    return { active, redemptions, discount };
  }, [coupons]);

  // ─── Modal ───
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = c => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || '',
      discountType: c.discountType,
      discountValue: String(c.discountValue ?? ''),
      maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
      minOrderValue: c.minOrderValue ? String(c.minOrderValue) : '',
      startsAt: toInputDateTime(c.startsAt),
      expiresAt: toInputDateTime(c.expiresAt),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      perCustomerLimit:
        c.perCustomerLimit != null ? String(c.perCustomerLimit) : '',
      scope: c.scope || 'all',
      groups: c.groups || [],
      categories: c.categories || [],
      stackWithPix: c.stackWithPix !== false,
      firstOrderOnly: !!c.firstOrderOnly,
      isActive: c.isActive !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleInList = (key, value) =>
    setForm(f => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter(v => v !== value)
        : [...f[key], value],
    }));

  const handleSave = async () => {
    // validação rápida no client (o servidor valida de novo)
    if (!form.code.trim()) return toast.error('Informe o código do cupom.');
    if (!form.discountValue || Number(form.discountValue) <= 0)
      return toast.error('Informe o valor do desconto.');
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100)
      return toast.error('Percentual máximo é 100%.');
    if (form.scope === 'groups' && form.groups.length === 0)
      return toast.error('Selecione pelo menos uma categoria.');
    if (form.scope === 'categories' && form.categories.length === 0)
      return toast.error('Selecione pelo menos uma subcategoria.');
    if (form.startsAt && form.expiresAt && form.expiresAt <= form.startsAt)
      return toast.error('Expiração deve ser posterior ao início.');

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      discountValue: Number(form.discountValue),
      maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
      minOrderValue: form.minOrderValue === '' ? 0 : Number(form.minOrderValue),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
      perCustomerLimit:
        form.perCustomerLimit === '' ? null : Number(form.perCustomerLimit),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    try {
      setSaving(true);
      const { data } = editing
        ? await axios.put(`/api/coupon/${editing._id}`, payload)
        : await axios.post('/api/coupon', payload);
      if (data.success) {
        toast.success(data.message);
        setModalOpen(false);
        setEditing(null);
        fetchCoupons();
      } else {
        toast.error(data.message || 'Erro ao salvar');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar cupom');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async c => {
    try {
      const { data } = await axios.patch(`/api/coupon/${c._id}/toggle`);
      if (data.success) {
        toast.success(data.message);
        fetchCoupons();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao alterar cupom');
    }
  };

  const handleDelete = async c => {
    const used = (c.stats?.redemptions || 0) > 0;
    const msg = used
      ? `O cupom ${c.code} já foi utilizado em pedidos e será apenas DESATIVADO (histórico preservado). Continuar?`
      : `Excluir definitivamente o cupom ${c.code}?`;
    if (!window.confirm(msg)) return;
    try {
      const { data } = await axios.delete(`/api/coupon/${c._id}`);
      if (data.success) {
        toast.success(data.message);
        fetchCoupons();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao excluir cupom');
    }
  };

  const openHistory = async c => {
    setHistoryFor(c);
    setRedemptions([]);
    try {
      setHistoryLoading(true);
      const { data } = await axios.get(`/api/coupon/${c._id}/redemptions`);
      if (data.success) setRedemptions(data.redemptions);
      else toast.error(data.message);
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyCode = async code => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Cupons de Desconto
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              Crie e gerencie cupons aplicados no checkout
            </p>
          </div>
          <button
            onClick={openCreate}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
          >
            <Plus className='w-5 h-5' />
            Novo Cupom
          </button>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
          {[
            {
              label: 'Cupons ativos',
              value: totals.active,
              icon: Ticket,
              cls: 'bg-green-50 text-green-600',
            },
            {
              label: 'Resgates confirmados',
              value: totals.redemptions,
              icon: Users,
              cls: 'bg-blue-50 text-blue-600',
            },
            {
              label: 'Desconto concedido',
              value: formatBRL(totals.discount),
              icon: BadgeDollarSign,
              cls: 'bg-amber-50 text-amber-600',
            },
          ].map(s => (
            <div
              key={s.label}
              className='bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4'
            >
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.cls}`}
              >
                <s.icon className='w-5 h-5' />
              </div>
              <div>
                <p className='text-xs text-gray-500'>{s.label}</p>
                <p className='text-xl font-bold text-gray-900'>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className='flex flex-col sm:flex-row gap-3 mb-4'>
          <div className='relative flex-1'>
            <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar por código ou descrição...'
              className='w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
          >
            <option value='all'>Todos os status</option>
            <option value='active'>Ativos</option>
            <option value='scheduled'>Agendados</option>
            <option value='expired'>Expirados</option>
            <option value='exhausted'>Esgotados</option>
            <option value='inactive'>Inativos</option>
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div className='flex items-center justify-center py-20 text-gray-400'>
            <Loader2 className='w-6 h-6 animate-spin mr-2' /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className='bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center'>
            <Ticket className='w-10 h-10 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-600 font-medium'>Nenhum cupom encontrado</p>
            <p className='text-sm text-gray-400 mt-1'>
              Crie o primeiro cupom clicando em “Novo Cupom”.
            </p>
          </div>
        ) : (
          <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-gray-50 text-gray-500 text-xs uppercase tracking-wider'>
                  <tr>
                    <th className='text-left px-4 py-3 font-semibold'>Cupom</th>
                    <th className='text-left px-4 py-3 font-semibold'>
                      Desconto
                    </th>
                    <th className='text-left px-4 py-3 font-semibold'>
                      Aplica-se a
                    </th>
                    <th className='text-left px-4 py-3 font-semibold'>
                      Validade
                    </th>
                    <th className='text-left px-4 py-3 font-semibold'>Uso</th>
                    <th className='text-left px-4 py-3 font-semibold'>
                      Status
                    </th>
                    <th className='text-right px-4 py-3 font-semibold'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {filtered.map(c => {
                    const st = STATUS_META[c.status] || STATUS_META.inactive;
                    return (
                      <tr key={c._id} className='hover:bg-gray-50/60'>
                        <td className='px-4 py-3 align-top'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-bold text-gray-900 tracking-wide'>
                              {c.code}
                            </span>
                            <button
                              onClick={() => copyCode(c.code)}
                              className='text-gray-400 hover:text-primary'
                              title='Copiar código'
                            >
                              {copied === c.code ? (
                                <Check className='w-3.5 h-3.5 text-green-600' />
                              ) : (
                                <Copy className='w-3.5 h-3.5' />
                              )}
                            </button>
                          </div>
                          {c.description && (
                            <p className='text-xs text-gray-500 mt-0.5 max-w-[220px] truncate'>
                              {c.description}
                            </p>
                          )}
                          <div className='flex flex-wrap gap-1 mt-1.5'>
                            {!c.stackWithPix && (
                              <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500'>
                                não acumula c/ PIX
                              </span>
                            )}
                            {c.firstOrderOnly && (
                              <span className='text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600'>
                                1ª compra
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3 align-top'>
                          <p className='font-semibold text-gray-900'>
                            {c.discountType === 'percentage'
                              ? `${c.discountValue}%`
                              : formatBRL(c.discountValue)}
                          </p>
                          {c.discountType === 'percentage' && c.maxDiscount && (
                            <p className='text-xs text-gray-500'>
                              até {formatBRL(c.maxDiscount)}
                            </p>
                          )}
                          {c.minOrderValue > 0 && (
                            <p className='text-xs text-gray-500'>
                              mín. {formatBRL(c.minOrderValue)}
                            </p>
                          )}
                        </td>
                        <td className='px-4 py-3 align-top'>
                          <p className='text-gray-700 max-w-[200px] line-clamp-2'>
                            {scopeLabel(c)}
                          </p>
                          {c.scope !== 'all' && (
                            <p className='text-[11px] text-gray-400 mt-0.5'>
                              {c.scope === 'groups'
                                ? 'categorias'
                                : 'subcategorias'}
                            </p>
                          )}
                        </td>
                        <td className='px-4 py-3 align-top text-gray-600 text-xs whitespace-nowrap'>
                          <p>
                            <span className='text-gray-400'>de </span>
                            {c.startsAt ? fmtDate(c.startsAt) : 'agora'}
                          </p>
                          <p>
                            <span className='text-gray-400'>até </span>
                            {c.expiresAt ? fmtDate(c.expiresAt) : 'sem limite'}
                          </p>
                        </td>
                        <td className='px-4 py-3 align-top text-xs text-gray-600 whitespace-nowrap'>
                          <p className='font-semibold text-gray-900'>
                            {c.usageCount}
                            {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                          </p>
                          {c.usageLimit && (
                            <div className='w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden'>
                              <div
                                className='h-full bg-primary rounded-full'
                                style={{
                                  width: `${Math.min(100, (c.usageCount / c.usageLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                          {c.perCustomerLimit && (
                            <p className='text-gray-400 mt-0.5'>
                              {c.perCustomerLimit}× por cliente
                            </p>
                          )}
                          {c.stats?.totalDiscount > 0 && (
                            <p className='text-gray-400 mt-0.5'>
                              {formatBRL(c.stats.totalDiscount)} concedidos
                            </p>
                          )}
                        </td>
                        <td className='px-4 py-3 align-top'>
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-1 rounded-full ${st.cls}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className='px-4 py-3 align-top'>
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              onClick={() => openHistory(c)}
                              className='p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg'
                              title='Histórico de uso'
                            >
                              <History className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleToggle(c)}
                              className={`p-2 rounded-lg ${
                                c.isActive
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-100'
                              }`}
                              title={c.isActive ? 'Desativar' : 'Ativar'}
                            >
                              <Power className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              className='p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg'
                              title='Editar'
                            >
                              <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg'
                              title='Excluir'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL — Criar / Editar ═══ */}
      {modalOpen && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'>
          <div className='bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <h2 className='text-lg font-bold text-gray-900'>
                {editing ? `Editar ${editing.code}` : 'Novo Cupom'}
              </h2>
              <button
                onClick={closeModal}
                className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='overflow-y-auto px-6 py-5 space-y-6'>
              {/* Código + descrição */}
              <section className='space-y-3'>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1'>
                    Código *
                  </label>
                  <div className='flex gap-2'>
                    <input
                      value={form.code}
                      onChange={e =>
                        setField(
                          'code',
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9_-]/g, ''),
                        )
                      }
                      placeholder='EX: VERAO15'
                      maxLength={30}
                      className='flex-1 px-3 py-2.5 border border-gray-200 rounded-xl font-mono tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                    />
                    <button
                      type='button'
                      onClick={() => setField('code', generateCode())}
                      className='flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50'
                      title='Gerar código aleatório'
                    >
                      <Sparkles className='w-4 h-4' /> Gerar
                    </button>
                  </div>
                  <p className='text-[11px] text-gray-400 mt-1'>
                    3–30 caracteres. Letras, números, “-” e “_”. Não diferencia
                    maiúsculas.
                  </p>
                </div>
                <div>
                  <label className='block text-xs font-semibold text-gray-600 mb-1'>
                    Descrição interna
                  </label>
                  <input
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    placeholder='Ex: Campanha Black Friday — Instagram'
                    maxLength={200}
                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                  />
                </div>
              </section>

              {/* Desconto */}
              <section>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mb-3'>
                  Desconto
                </p>
                <div className='grid grid-cols-2 gap-2 mb-3'>
                  {[
                    { v: 'percentage', label: 'Percentual (%)', icon: Percent },
                    {
                      v: 'fixed',
                      label: 'Valor fixo (R$)',
                      icon: BadgeDollarSign,
                    },
                  ].map(o => (
                    <button
                      key={o.v}
                      type='button'
                      onClick={() => setField('discountType', o.v)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.discountType === o.v
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <o.icon className='w-4 h-4' /> {o.label}
                    </button>
                  ))}
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      {form.discountType === 'percentage'
                        ? 'Percentual *'
                        : 'Valor (R$) *'}
                    </label>
                    <input
                      type='number'
                      min='0'
                      step={form.discountType === 'percentage' ? '1' : '0.01'}
                      value={form.discountValue}
                      onChange={e => setField('discountValue', e.target.value)}
                      placeholder={
                        form.discountType === 'percentage' ? '10' : '20.00'
                      }
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                    />
                  </div>
                  {form.discountType === 'percentage' && (
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Desconto máximo (R$)
                      </label>
                      <input
                        type='number'
                        min='0'
                        step='0.01'
                        value={form.maxDiscount}
                        onChange={e => setField('maxDiscount', e.target.value)}
                        placeholder='sem teto'
                        className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                      />
                    </div>
                  )}
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      Pedido mínimo (R$)
                    </label>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      value={form.minOrderValue}
                      onChange={e => setField('minOrderValue', e.target.value)}
                      placeholder='sem mínimo'
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                    />
                  </div>
                </div>
              </section>

              {/* Escopo */}
              <section>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mb-3'>
                  Aplica-se a
                </p>
                <div className='grid grid-cols-3 gap-2 mb-3'>
                  {[
                    { v: 'all', label: 'Todos os produtos' },
                    { v: 'groups', label: 'Categorias' },
                    { v: 'categories', label: 'Subcategorias' },
                  ].map(o => (
                    <button
                      key={o.v}
                      type='button'
                      onClick={() => setField('scope', o.v)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        form.scope === o.v
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {form.scope === 'groups' && (
                  <div className='flex flex-wrap gap-2'>
                    {groups.map(g => {
                      const on = form.groups.includes(g.slug);
                      return (
                        <button
                          key={g.slug}
                          type='button'
                          onClick={() => toggleInList('groups', g.slug)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            on
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {form.scope === 'categories' && (
                  <div className='space-y-3 max-h-64 overflow-y-auto pr-1'>
                    {groups
                      .filter(g => categories.some(c => c.group === g.slug))
                      .map(g => (
                        <div key={g.slug}>
                          <p className='text-[11px] font-semibold text-gray-500 uppercase mb-1.5'>
                            {g.name}
                          </p>
                          <div className='flex flex-wrap gap-1.5'>
                            {categories
                              .filter(c => c.group === g.slug)
                              .map(c => {
                                const on = form.categories.includes(c.path);
                                return (
                                  <button
                                    key={c.path}
                                    type='button'
                                    onClick={() =>
                                      toggleInList('categories', c.path)
                                    }
                                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                                      on
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {c.text}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {form.scope !== 'all' && (
                  <p className='flex items-start gap-1.5 text-[11px] text-gray-500 mt-3'>
                    <Info className='w-3.5 h-3.5 mt-0.5 flex-shrink-0' />O
                    desconto incide apenas sobre os itens elegíveis do carrinho.
                    Os demais produtos pagam preço normal.
                  </p>
                )}
              </section>

              {/* Validade e limites */}
              <section>
                <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mb-3'>
                  Validade e limites
                </p>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      <CalendarClock className='w-3.5 h-3.5 inline mr-1' />
                      Válido a partir de
                    </label>
                    <input
                      type='datetime-local'
                      value={form.startsAt}
                      onChange={e => setField('startsAt', e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      <CalendarClock className='w-3.5 h-3.5 inline mr-1' />
                      Expira em
                    </label>
                    <input
                      type='datetime-local'
                      value={form.expiresAt}
                      onChange={e => setField('expiresAt', e.target.value)}
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      Limite total de usos
                    </label>
                    <input
                      type='number'
                      min='1'
                      step='1'
                      value={form.usageLimit}
                      onChange={e => setField('usageLimit', e.target.value)}
                      placeholder='ilimitado'
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-gray-600 mb-1'>
                      Limite por cliente
                    </label>
                    <input
                      type='number'
                      min='1'
                      step='1'
                      value={form.perCustomerLimit}
                      onChange={e =>
                        setField('perCustomerLimit', e.target.value)
                      }
                      placeholder='ilimitado'
                      className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
                    />
                  </div>
                </div>
              </section>

              {/* Opções */}
              <section className='space-y-2'>
                {[
                  {
                    k: 'stackWithPix',
                    label: 'Acumular com desconto PIX (10%)',
                    hint: 'Desligado: quem usar o cupom não recebe o desconto PIX.',
                  },
                  {
                    k: 'firstOrderOnly',
                    label: 'Apenas primeira compra',
                    hint: 'Bloqueia clientes (login ou email) que já têm pedido pago.',
                  },
                  {
                    k: 'isActive',
                    label: 'Cupom ativo',
                    hint: 'Desligado: o cupom não é aceito no checkout.',
                  },
                ].map(o => (
                  <label
                    key={o.k}
                    className='flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer'
                  >
                    <input
                      type='checkbox'
                      checked={!!form[o.k]}
                      onChange={e => setField(o.k, e.target.checked)}
                      className='mt-0.5 w-4 h-4 accent-primary'
                    />
                    <div>
                      <p className='text-sm font-medium text-gray-800'>
                        {o.label}
                      </p>
                      <p className='text-[11px] text-gray-500'>{o.hint}</p>
                    </div>
                  </label>
                ))}
              </section>
            </div>

            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100'>
              <button
                onClick={closeModal}
                disabled={saving}
                className='px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100'
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60'
              >
                {saving && <Loader2 className='w-4 h-4 animate-spin' />}
                {editing ? 'Salvar alterações' : 'Criar cupom'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL — Histórico ═══ */}
      {historyFor && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'>
          <div className='bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <div>
                <h2 className='text-lg font-bold text-gray-900'>
                  Histórico — {historyFor.code}
                </h2>
                <p className='text-xs text-gray-500'>
                  {historyFor.stats?.confirmed || 0} confirmados ·{' '}
                  {formatBRL(historyFor.stats?.totalDiscount || 0)} em descontos
                  · {formatBRL(historyFor.stats?.totalRevenue || 0)} em vendas
                  pagas
                </p>
              </div>
              <button
                onClick={() => setHistoryFor(null)}
                className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='overflow-y-auto'>
              {historyLoading ? (
                <div className='flex items-center justify-center py-12 text-gray-400'>
                  <Loader2 className='w-5 h-5 animate-spin mr-2' />{' '}
                  Carregando...
                </div>
              ) : redemptions.length === 0 ? (
                <p className='text-center text-sm text-gray-400 py-12'>
                  Este cupom ainda não foi utilizado.
                </p>
              ) : (
                <table className='w-full text-sm'>
                  <thead className='bg-gray-50 text-gray-500 text-xs uppercase'>
                    <tr>
                      <th className='text-left px-4 py-2'>Data</th>
                      <th className='text-left px-4 py-2'>Cliente</th>
                      <th className='text-left px-4 py-2'>Pedido</th>
                      <th className='text-right px-4 py-2'>Desconto</th>
                      <th className='text-left px-4 py-2'>Status</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {redemptions.map(r => (
                      <tr key={r._id}>
                        <td className='px-4 py-2 text-gray-600 whitespace-nowrap'>
                          {fmtDate(r.createdAt)}
                        </td>
                        <td className='px-4 py-2 text-gray-700 truncate max-w-[200px]'>
                          {r.customerEmail || r.userId || '—'}
                        </td>
                        <td className='px-4 py-2 font-mono text-xs text-gray-500'>
                          #{String(r.order).slice(-8).toUpperCase()}
                        </td>
                        <td className='px-4 py-2 text-right font-medium text-green-700'>
                          -{formatBRL(r.discountAmount)}
                        </td>
                        <td className='px-4 py-2'>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full ${
                              r.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : r.status === 'reserved'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {r.status === 'confirmed'
                              ? 'Pago'
                              : r.status === 'reserved'
                                ? 'Aguardando'
                                : 'Cancelado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
