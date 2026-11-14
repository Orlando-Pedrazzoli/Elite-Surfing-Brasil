// client/src/pages/seller/PriceTableOrder.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🧾 GERAR PEDIDO PELA TABELA DE LOJISTA
//    /seller/tabelas/:id/pedido            → pedido novo
//    /seller/tabelas/:id/pedido?pedido=ID  → pedido já salvo
// ═══════════════════════════════════════════════════════════════════════
// Caso de uso diário: o lojista manda o pedido pelo WhatsApp e pede o
// valor. O vendedor preenche as quantidades sobre a tabela de lojista (ou
// cola a mensagem do cliente) e devolve o pedido por WhatsApp, email ou
// PDF. Só os itens preenchidos entram no pedido.
//
// • Cliente, prazo de pagamento e condições são OPCIONAIS.
// • Os preços mostrados aqui vêm do mesmo motor da tabela; ao salvar, o
//   servidor recalcula tudo (o browser só manda produto + quantidade).
// • Qualquer saída (WhatsApp, PDF, email, compartilhar) salva antes.
// • Pedido novo ainda não salvo fica como rascunho neste aparelho.
// ═══════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Loader2,
  Search,
  X,
  Minus,
  Plus,
  ClipboardPaste,
  FileDown,
  Mail,
  Share2,
  Save,
  AlertTriangle,
  UserRound,
  ListChecks,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { computeTable, formatBRL } from '../../utils/priceTableEngine';
import {
  API,
  normalizeSearch,
  readBlobError,
  thumbUrl,
} from '../../utils/priceTableUtils';
import {
  CONDITION_PRESETS,
  ORDER_API,
  ORDER_STATUS_META,
  PAYMENT_PRESETS,
  appendPreset,
  buildWhatsAppText,
  canShareFiles,
  clearDraft,
  downloadBlob,
  fetchOrderPdf,
  formatOrderNumber,
  normalizePhoneBR,
  readDraft,
  whatsappUrl,
  writeDraft,
} from '../../utils/priceTableOrderUtils';
import OrderImportModal from '../../components/priceTables/OrderImportModal';
import OrderEmailModal from '../../components/priceTables/OrderEmailModal';

const EMPTY_CUSTOMER = { name: '', phone: '', email: '', cliente: null };
const MAX_QTY = 99999;

const toQty = text => {
  const digits = String(text ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  return Math.min(MAX_QTY, parseInt(digits, 10));
};

// ─────────────────────────────────────────────────────────────────────
// Quantidade (− campo +)
// ─────────────────────────────────────────────────────────────────────
const QtyStepper = ({ value, onChange, label }) => (
  <div className='flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden'>
    <button
      type='button'
      onClick={() => onChange(Math.max(0, value - 1))}
      disabled={value <= 0}
      aria-label={`Diminuir ${label}`}
      className='w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30'
    >
      <Minus className='w-4 h-4' />
    </button>
    <input
      type='text'
      inputMode='numeric'
      value={value > 0 ? String(value) : ''}
      placeholder='0'
      onChange={e => onChange(toQty(e.target.value))}
      onFocus={e => e.target.select()}
      aria-label={`Quantidade de ${label}`}
      className='w-12 h-9 text-center text-sm font-semibold text-gray-900 border-x border-gray-200 focus:outline-none focus:bg-primary/5'
    />
    <button
      type='button'
      onClick={() => onChange(Math.min(MAX_QTY, value + 1))}
      aria-label={`Aumentar ${label}`}
      className='w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100'
    >
      <Plus className='w-4 h-4' />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Cliente (opcional) com busca nos Clientes das Vendas Diretas
// ─────────────────────────────────────────────────────────────────────
const CustomerFields = ({ axios, customer, onChange }) => {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const close = e => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      clearTimeout(timer.current);
    };
  }, []);

  const search = text => {
    clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get('/api/clientes/busca', {
          params: { q: text.trim() },
        });
        if (data.success) {
          setResults(
            (data.resultado || []).filter(r => r.origem === 'Cliente'),
          );
          setOpen(true);
        }
      } catch {
        setResults([]);
      }
    }, 300);
  };

  const field =
    'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

  return (
    <div className='space-y-2.5'>
      <div className='relative' ref={boxRef}>
        <input
          type='text'
          value={customer.name}
          onChange={e => {
            onChange({ ...customer, name: e.target.value, cliente: null });
            search(e.target.value);
          }}
          onFocus={() => results.length && setOpen(true)}
          placeholder='Nome da loja ou do cliente'
          maxLength={120}
          autoComplete='off'
          className={field}
        />
        {open && results.length > 0 && (
          <ul className='absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto'>
            {results.map(r => (
              <li key={r._id}>
                <button
                  type='button'
                  onClick={() => {
                    onChange({
                      name: r.nome || r.razaoSocial || '',
                      phone: r.telefone || customer.phone,
                      email: r.email || customer.email,
                      cliente: r._id,
                    });
                    setOpen(false);
                  }}
                  className='w-full text-left px-3 py-2 hover:bg-gray-50'
                >
                  <span className='block text-sm font-medium text-gray-900 truncate'>
                    {r.nome || r.razaoSocial}
                  </span>
                  <span className='block text-xs text-gray-500 truncate'>
                    {[r.cpfCnpj, r.telefone, r.email]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5'>
        <input
          type='tel'
          inputMode='tel'
          value={customer.phone}
          onChange={e => onChange({ ...customer, phone: e.target.value })}
          placeholder='WhatsApp (com DDD)'
          maxLength={30}
          className={field}
        />
        <input
          type='email'
          inputMode='email'
          value={customer.email}
          onChange={e => onChange({ ...customer, email: e.target.value })}
          placeholder='Email'
          maxLength={254}
          className={field}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Texto opcional com atalhos
// ─────────────────────────────────────────────────────────────────────
const PresetTextarea = ({
  label,
  value,
  onChange,
  presets,
  placeholder,
  maxLength,
}) => (
  <div>
    <p className='text-sm font-semibold text-gray-800 mb-1.5'>
      {label} <span className='font-normal text-gray-400'>(opcional)</span>
    </p>
    <div className='flex flex-wrap gap-1.5 mb-2'>
      {presets.map(preset => (
        <button
          key={preset}
          type='button'
          onClick={() => onChange(appendPreset(value, preset))}
          className='text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
        >
          + {preset}
        </button>
      ))}
    </div>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={2}
      maxLength={maxLength}
      placeholder={placeholder}
      className='w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────
const PriceTableOrder = () => {
  const { axios, navigate } = useAppContext();
  const { id: tableId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdParam = searchParams.get('pedido');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);

  const [order, setOrder] = useState(null); // último estado salvo no servidor
  const [qty, setQty] = useState({}); // productId → quantidade
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [conditions, setConditions] = useState('');
  const [withImages, setWithImages] = useState(true);
  const [dirty, setDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // 'whatsapp' | 'pdf' | 'share'
  const [sharePdf, setSharePdf] = useState(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [onlySelected, setOnlySelected] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const summaryRef = useRef(null);
  const loadedOrderRef = useRef(null);
  const shareSupported = useMemo(() => canShareFiles(), []);

  // ─── Carregar tabela (+ pedido salvo) ───
  const hydrate = useCallback(saved => {
    loadedOrderRef.current = saved._id;
    setOrder(saved);
    setQty(
      Object.fromEntries(saved.items.map(i => [String(i.product), i.qty])),
    );
    setCustomer({ ...EMPTY_CUSTOMER, ...saved.customer });
    setPaymentTerms(saved.paymentTerms || '');
    setConditions(saved.conditions || '');
    setDirty(false);
    setSharePdf(null);
  }, []);

  useEffect(() => {
    // Acabamos de salvar este pedido e só a URL mudou: nada a recarregar
    if (orderIdParam && orderIdParam === loadedOrderRef.current) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        let saved = null;
        if (orderIdParam) {
          const { data } = await axios.get(`${ORDER_API}/${orderIdParam}`);
          if (!data.success) throw new Error(data.message);
          saved = data.order;
          if (String(saved.table) !== tableId) {
            navigate(
              `/seller/tabelas/${saved.table}/pedido?pedido=${saved._id}`,
              { replace: true },
            );
            return;
          }
        }

        const { data } = await axios.get(`${API}/${tableId}`);
        if (!data.success) throw new Error(data.message);
        if (cancelled) return;

        setTable(data.table);
        setProducts(data.products);
        setEmailConfigured(!!data.emailConfigured);

        if (saved) hydrate(saved);
        else {
          loadedOrderRef.current = null;
          setOrder(null);
          const draft = readDraft(tableId);
          if (draft && Object.values(draft.qty || {}).some(n => n > 0)) {
            setQty(draft.qty);
            setCustomer({ ...EMPTY_CUSTOMER, ...draft.customer });
            setPaymentTerms(draft.paymentTerms || '');
            setConditions(draft.conditions || '');
            setDirty(true);
            toast('Rascunho deste pedido recuperado', { icon: '📝' });
          } else {
            setQty({});
            setCustomer(EMPTY_CUSTOMER);
            setPaymentTerms('');
            setConditions('');
            setDirty(false);
          }
        }
      } catch (err) {
        if (!cancelled)
          setLoadError(
            err.response?.data?.message ||
              err.message ||
              'Não foi possível abrir o pedido',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [axios, tableId, orderIdParam, hydrate, navigate]);

  // ─── Preços (mesmo motor da tabela) ───
  const computed = useMemo(() => {
    if (!table) return null;
    const byId = Object.fromEntries(products.map(p => [p._id, p]));
    return computeTable(table, byId);
  }, [table, products]);

  const sections = useMemo(
    () =>
      (computed?.sections || [])
        .map(section => ({
          key: section.key,
          title: section.title,
          rows: section.rows.filter(r => !r.excluded),
        }))
        .filter(section => section.rows.length > 0),
    [computed],
  );

  const rows = useMemo(() => sections.flatMap(s => s.rows), [sections]);
  const rowsById = useMemo(
    () => new Map(rows.map(r => [r.productId, r])),
    [rows],
  );

  const selected = useMemo(
    () => rows.filter(r => (qty[r.productId] || 0) > 0),
    [rows, qty],
  );
  const unavailable = useMemo(
    () =>
      Object.entries(qty)
        .filter(([id, n]) => n > 0 && !rowsById.has(id))
        .map(([id]) => ({
          id,
          name: products.find(p => p._id === id)?.name || 'Produto removido',
        })),
    [qty, rowsById, products],
  );

  const totals = useMemo(() => {
    let cents = 0;
    let pieces = 0;
    selected.forEach(r => {
      const n = qty[r.productId];
      cents += r.priceCents * n;
      pieces += n;
    });
    return { subtotal: cents / 100, pieces, count: selected.length };
  }, [selected, qty]);

  // ─── Rascunho local e aviso ao sair ───
  useEffect(() => {
    if (!table || order || !dirty) return;
    writeDraft(tableId, { qty, customer, paymentTerms, conditions });
  }, [table, order, dirty, tableId, qty, customer, paymentTerms, conditions]);

  useEffect(() => {
    if (!dirty) return;
    const warn = e => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ─── Edição ───
  const touch = () => {
    setDirty(true);
    setSharePdf(null);
  };
  const setItemQty = (productId, value) => {
    setQty(prev => ({ ...prev, [productId]: value }));
    touch();
  };
  const changeCustomer = next => {
    setCustomer(next);
    touch();
  };
  const changePayment = text => {
    setPaymentTerms(text);
    touch();
  };
  const changeConditions = text => {
    setConditions(text);
    touch();
  };

  const clearOrder = () => {
    if (!window.confirm('Zerar todas as quantidades deste pedido?')) return;
    setQty({});
    touch();
  };

  const applyImport = (matches, mode) => {
    setQty(prev => {
      const next = mode === 'replace' ? {} : { ...prev };
      matches.forEach(m => {
        next[m.productId] = Math.min(MAX_QTY, (next[m.productId] || 0) + m.qty);
      });
      return next;
    });
    touch();
    setOnlySelected(true);
    toast.success(
      `${matches.length} ${matches.length === 1 ? 'produto adicionado' : 'produtos adicionados'} ao pedido`,
    );
  };

  // ─── Salvar ───
  const save = async () => {
    if (unavailable.length) {
      toast.error(
        'Há produtos que não estão mais disponíveis nesta tabela. Remova-os do pedido.',
      );
      return null;
    }
    if (!selected.length) {
      toast.error('Preencha a quantidade de ao menos um produto.');
      return null;
    }
    if (order && !dirty) return order;

    const payload = {
      items: selected.map(r => ({
        product: r.productId,
        qty: qty[r.productId],
      })),
      customer,
      paymentTerms,
      conditions,
    };

    setSaving(true);
    try {
      const { data } = order
        ? await axios.put(`${ORDER_API}/${order._id}`, payload)
        : await axios.post(ORDER_API, { ...payload, table: tableId });
      if (!data.success) throw new Error(data.message);

      const isNew = !order;
      hydrate(data.order);
      if (data.priceChanges > 0)
        toast(
          `${data.priceChanges} ${data.priceChanges === 1 ? 'preço foi atualizado' : 'preços foram atualizados'} com a tabela atual.`,
          { icon: 'ℹ️' },
        );
      if (isNew) {
        clearDraft(tableId);
        setSearchParams({ pedido: data.order._id }, { replace: true });
        toast.success(
          `Pedido nº ${formatOrderNumber(data.order.number)} criado`,
        );
      }
      return data.order;
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Não foi possível salvar o pedido',
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const wasDirty = dirty;
    const saved = await save();
    if (saved && wasDirty && order) toast.success('Pedido salvo');
  };

  // ─── Saídas ───
  const recordShare = async (saved, channel, to = '') => {
    try {
      const { data } = await axios.post(`${ORDER_API}/${saved._id}/shared`, {
        channel,
        to,
      });
      if (data.success) {
        setOrder(data.order);
        loadedOrderRef.current = data.order._id;
      }
    } catch {
      /* o envio já aconteceu; só o histórico não foi gravado */
    }
  };

  const handleWhatsApp = async () => {
    // A aba abre JÁ no toque: depois de um await o iPhone bloqueia popups
    const win = window.open('', '_blank');
    setBusy('whatsapp');
    try {
      const saved = await save();
      if (!saved) {
        win?.close();
        return;
      }
      const url = whatsappUrl(saved.customer?.phone, buildWhatsAppText(saved));
      if (win) win.location.href = url;
      else window.location.href = url;
      recordShare(saved, 'whatsapp', normalizePhoneBR(saved.customer?.phone));
    } finally {
      setBusy(null);
    }
  };

  const warnImages = info => {
    const missing = info.imagesRequested - info.imagesLoaded;
    if (withImages && missing > 0)
      toast(
        `${missing} ${missing === 1 ? 'imagem não carregou' : 'imagens não carregaram'} e ficaram em branco no PDF.`,
        { icon: '⚠️' },
      );
  };

  const handlePdf = async () => {
    setBusy('pdf');
    try {
      const saved = await save();
      if (!saved) return;
      const file = await fetchOrderPdf(axios, saved, withImages);
      downloadBlob(file.blob, file.filename);
      warnImages(file);
    } catch (err) {
      toast.error((await readBlobError(err)) || 'Não foi possível gerar o PDF');
    } finally {
      setBusy(null);
    }
  };

  const shareFile = async (file, saved) => {
    await navigator.share({
      files: [file],
      title: `Pedido nº ${formatOrderNumber(saved.number)} — Elite Surfing`,
    });
    recordShare(saved, 'share');
  };

  const handleShare = async () => {
    // PDF já preparado para este estado do pedido: compartilha direto,
    // ainda dentro do toque (exigência do Safari)
    if (
      sharePdf &&
      order &&
      !dirty &&
      sharePdf.orderId === order._id &&
      sharePdf.updatedAt === order.updatedAt &&
      sharePdf.images === withImages
    ) {
      try {
        await shareFile(sharePdf.file, order);
      } catch (err) {
        if (err?.name !== 'AbortError')
          toast.error('Não foi possível compartilhar o PDF');
      }
      return;
    }

    setBusy('share');
    try {
      const saved = await save();
      if (!saved) return;
      const info = await fetchOrderPdf(axios, saved, withImages);
      const file = new File([info.blob], info.filename, {
        type: 'application/pdf',
      });
      setSharePdf({
        file,
        orderId: saved._id,
        updatedAt: saved.updatedAt,
        images: withImages,
      });
      warnImages(info);
      try {
        await shareFile(file, saved);
      } catch (err) {
        if (err?.name === 'NotAllowedError')
          toast('PDF pronto. Toque em “Compartilhar PDF” de novo.', {
            icon: '📄',
          });
        else if (err?.name !== 'AbortError')
          toast.error('Não foi possível compartilhar o PDF');
      }
    } catch (err) {
      toast.error((await readBlobError(err)) || 'Não foi possível gerar o PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    const saved = await save();
    if (saved) setEmailOpen(true);
  };

  const changeStatus = async status => {
    if (!order) return;
    try {
      const { data } = await axios.post(`${ORDER_API}/${order._id}/status`, {
        status,
      });
      if (!data.success) throw new Error(data.message);
      setOrder(data.order);
      toast.success(
        `Pedido marcado como ${ORDER_STATUS_META[status].label.toLowerCase()}`,
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Não foi possível mudar a situação',
      );
    }
  };

  // ─── Lista filtrada ───
  const visibleSections = useMemo(() => {
    const term = normalizeSearch(search);
    return sections
      .filter(s => sectionFilter === 'all' || s.key === sectionFilter)
      .map(s => ({
        ...s,
        rows: s.rows.filter(r => {
          if (onlySelected && !(qty[r.productId] > 0)) return false;
          if (!term) return true;
          return normalizeSearch(`${r.product.name} ${r.product.sku}`).includes(
            term,
          );
        }),
      }))
      .filter(s => s.rows.length > 0);
  }, [sections, sectionFilter, search, onlySelected, qty]);

  // ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className='flex-1 h-[95vh] flex items-center justify-center bg-gray-50 text-gray-400'>
        <Loader2 className='w-6 h-6 animate-spin' />
      </div>
    );

  if (loadError || !table)
    return (
      <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
        <div className='p-6 md:p-8 max-w-3xl mx-auto'>
          <Link
            to='/seller/tabelas'
            className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6'
          >
            <ArrowLeft className='w-4 h-4' />
            Tabelas de Preço
          </Link>
          <div className='bg-white rounded-2xl border border-gray-200 p-8 text-center'>
            <AlertTriangle className='w-8 h-8 text-amber-500 mx-auto mb-3' />
            <p className='text-gray-700'>
              {loadError || 'Tabela não encontrada.'}
            </p>
          </div>
        </div>
      </div>
    );

  if (table.kind !== 'cliente')
    return (
      <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
        <div className='p-6 md:p-8 max-w-3xl mx-auto'>
          <Link
            to='/seller/tabelas'
            className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6'
          >
            <ArrowLeft className='w-4 h-4' />
            Tabelas de Preço
          </Link>
          <div className='bg-white rounded-2xl border border-gray-200 p-8 text-center'>
            <AlertTriangle className='w-8 h-8 text-red-500 mx-auto mb-3' />
            <p className='text-gray-800 font-semibold'>
              “{table.name}” é uma tabela de uso interno.
            </p>
            <p className='text-sm text-gray-500 mt-1'>
              Pedidos para clientes só podem ser gerados a partir de uma tabela
              “Para lojistas”.
            </p>
          </div>
        </div>
      </div>
    );

  const status = order ? ORDER_STATUS_META[order.status] : null;
  const working = saving || !!busy;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-4 md:p-8 pb-28 lg:pb-8 max-w-7xl mx-auto'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6'>
          <div className='min-w-0'>
            <Link
              to='/seller/tabelas/pedidos'
              onClick={e => {
                if (
                  dirty &&
                  order &&
                  !window.confirm('Sair sem salvar as alterações deste pedido?')
                )
                  e.preventDefault();
              }}
              className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2'
            >
              <ArrowLeft className='w-4 h-4' />
              Pedidos
            </Link>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-2xl font-bold text-gray-900'>
                {order
                  ? `Pedido nº ${formatOrderNumber(order.number)}`
                  : 'Novo pedido'}
              </h1>
              {status && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}
                >
                  {status.label}
                </span>
              )}
              {dirty && order && (
                <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200'>
                  Alterações não salvas
                </span>
              )}
            </div>
            <p className='text-sm text-gray-500 mt-1 truncate'>
              Preços da tabela{' '}
              <strong className='text-gray-700'>{table.name}</strong>
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => setImportOpen(true)}
              className='flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50'
            >
              <ClipboardPaste className='w-4 h-4' />
              Colar pedido do WhatsApp
            </button>
            {order && (
              <Link
                to={`/seller/tabelas/${tableId}/pedido`}
                onClick={e => {
                  if (
                    dirty &&
                    !window.confirm(
                      'Sair sem salvar as alterações deste pedido?',
                    )
                  )
                    e.preventDefault();
                }}
                className='flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50'
              >
                <Plus className='w-4 h-4' />
                Novo pedido
              </Link>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start'>
          {/* ═══ Produtos ═══ */}
          <section className='bg-white rounded-2xl border border-gray-200 min-w-0'>
            <div className='p-4 border-b border-gray-100 space-y-3'>
              <div className='relative'>
                <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
                <input
                  type='search'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder='Buscar por nome ou código'
                  className='w-full rounded-xl border border-gray-300 pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                />
                {search && (
                  <button
                    type='button'
                    onClick={() => setSearch('')}
                    aria-label='Limpar busca'
                    className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className='rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30'
                >
                  <option value='all'>Todas as categorias</option>
                  {sections.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.title} ({s.rows.length})
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => setOnlySelected(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium ${
                    onlySelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <ListChecks className='w-4 h-4' />
                  Só os do pedido ({totals.count})
                </button>
              </div>
            </div>

            {visibleSections.length === 0 ? (
              <p className='p-8 text-center text-sm text-gray-500'>
                {onlySelected && !totals.count
                  ? 'Nenhum produto no pedido ainda.'
                  : 'Nenhum produto encontrado.'}
              </p>
            ) : (
              visibleSections.map(section => (
                <div key={section.key}>
                  <h2 className='sticky top-0 z-10 px-4 py-2 text-xs font-bold tracking-wide uppercase text-white bg-primary'>
                    {section.title}
                  </h2>
                  <ul className='divide-y divide-gray-100'>
                    {section.rows.map(row => {
                      const n = qty[row.productId] || 0;
                      const outOfStock = (Number(row.product.stock) || 0) <= 0;
                      return (
                        <li
                          key={row.productId}
                          className={`flex items-center gap-3 px-4 py-2.5 ${
                            n > 0 ? 'bg-primary/5' : ''
                          }`}
                        >
                          {row.product.image ? (
                            <img
                              src={thumbUrl(row.product.image, 96)}
                              alt=''
                              loading='lazy'
                              className='w-12 h-12 rounded-lg object-contain bg-white border border-gray-100 flex-shrink-0'
                            />
                          ) : (
                            <span className='w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0' />
                          )}
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 leading-snug line-clamp-2'>
                              {row.product.name}
                            </p>
                            <p className='text-xs text-gray-400 truncate'>
                              {row.product.sku || 'sem código'}
                              {outOfStock && (
                                <span className='ml-2 text-amber-600 font-medium'>
                                  sem estoque
                                </span>
                              )}
                            </p>
                            <p className='text-sm font-bold text-green-700 sm:hidden'>
                              {formatBRL(row.price)}
                            </p>
                          </div>
                          <div className='hidden sm:block text-right w-24 flex-shrink-0'>
                            <p className='text-sm font-bold text-green-700'>
                              {formatBRL(row.price)}
                            </p>
                            {n > 0 && (
                              <p className='text-xs text-gray-500'>
                                {formatBRL((row.priceCents * n) / 100)}
                              </p>
                            )}
                          </div>
                          <QtyStepper
                            value={n}
                            label={row.product.name}
                            onChange={value => setItemQty(row.productId, value)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>

          {/* ═══ Resumo do pedido ═══ */}
          <aside
            ref={summaryRef}
            className='bg-white rounded-2xl border border-gray-200 lg:sticky lg:top-4 lg:max-h-[calc(95vh-2rem)] lg:overflow-y-auto'
          >
            <div className='p-5 space-y-5'>
              {/* Cliente */}
              <div>
                <p className='flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1.5'>
                  <UserRound className='w-4 h-4' />
                  Cliente{' '}
                  <span className='font-normal text-gray-400'>(opcional)</span>
                </p>
                <CustomerFields
                  axios={axios}
                  customer={customer}
                  onChange={changeCustomer}
                />
              </div>

              {/* Itens */}
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <p className='text-sm font-semibold text-gray-800'>
                    Itens do pedido
                  </p>
                  {totals.count > 0 && (
                    <button
                      type='button'
                      onClick={clearOrder}
                      className='text-xs text-gray-400 hover:text-red-600'
                    >
                      Zerar
                    </button>
                  )}
                </div>
                {unavailable.length > 0 && (
                  <div className='mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 space-y-1'>
                    <p className='font-semibold'>
                      Não estão mais disponíveis nesta tabela:
                    </p>
                    {unavailable.map(u => (
                      <p
                        key={u.id}
                        className='flex items-center justify-between gap-2'
                      >
                        <span className='truncate'>{u.name}</span>
                        <button
                          type='button'
                          onClick={() => setItemQty(u.id, 0)}
                          className='flex-shrink-0 underline'
                        >
                          remover
                        </button>
                      </p>
                    ))}
                  </div>
                )}
                {selected.length === 0 ? (
                  <p className='text-sm text-gray-400 bg-gray-50 rounded-xl px-3 py-4 text-center'>
                    Preencha a quantidade dos produtos na lista ou cole o pedido
                    do WhatsApp.
                  </p>
                ) : (
                  <ul className='divide-y divide-gray-100 border border-gray-200 rounded-xl max-h-72 overflow-y-auto'>
                    {selected.map(row => {
                      const n = qty[row.productId];
                      return (
                        <li
                          key={row.productId}
                          className='flex items-start gap-2 px-3 py-2 text-sm'
                        >
                          <span className='font-bold text-gray-900 w-8 flex-shrink-0'>
                            {n}×
                          </span>
                          <span className='flex-1 min-w-0'>
                            <span className='block text-gray-800 leading-snug'>
                              {row.product.name}
                            </span>
                            <span className='block text-xs text-gray-400'>
                              {formatBRL(row.price)} cada
                            </span>
                          </span>
                          <span className='font-semibold text-gray-900 whitespace-nowrap'>
                            {formatBRL((row.priceCents * n) / 100)}
                          </span>
                          <button
                            type='button'
                            onClick={() => setItemQty(row.productId, 0)}
                            aria-label={`Tirar ${row.product.name} do pedido`}
                            className='p-0.5 text-gray-300 hover:text-red-600'
                          >
                            <X className='w-4 h-4' />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className='flex items-end justify-between mt-3 px-1'>
                  <p className='text-xs text-gray-500'>
                    {totals.count} {totals.count === 1 ? 'produto' : 'produtos'}{' '}
                    · {totals.pieces} {totals.pieces === 1 ? 'peça' : 'peças'}
                  </p>
                  <p className='text-right'>
                    <span className='block text-[11px] uppercase tracking-wide text-gray-400'>
                      Total
                    </span>
                    <span className='text-2xl font-bold text-primary'>
                      {formatBRL(totals.subtotal)}
                    </span>
                  </p>
                </div>
              </div>

              <PresetTextarea
                label='Prazo de pagamento'
                value={paymentTerms}
                onChange={changePayment}
                presets={PAYMENT_PRESETS}
                placeholder='Ex.: PIX à vista ou boleto 30/60 dias'
                maxLength={500}
              />
              <PresetTextarea
                label='Condições'
                value={conditions}
                onChange={changeConditions}
                presets={CONDITION_PRESETS}
                placeholder='Ex.: frete, prazo de entrega, observações'
                maxLength={1000}
              />

              <label className='flex items-center gap-2 text-sm text-gray-700 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={withImages}
                  onChange={e => {
                    setWithImages(e.target.checked);
                    setSharePdf(null);
                  }}
                  className='rounded border-gray-300 text-primary focus:ring-primary/30'
                />
                Fotos dos produtos no PDF
              </label>

              {/* Ações */}
              <div className='space-y-2'>
                <button
                  type='button'
                  onClick={handleWhatsApp}
                  disabled={working || !totals.count}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:brightness-95 disabled:opacity-50'
                >
                  {busy === 'whatsapp' ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <MessageCircle className='w-5 h-5' />
                  )}
                  Enviar pelo WhatsApp
                </button>
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    type='button'
                    onClick={handlePdf}
                    disabled={working || !totals.count}
                    className='flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    {busy === 'pdf' ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <FileDown className='w-4 h-4' />
                    )}
                    Baixar PDF
                  </button>
                  <button
                    type='button'
                    onClick={handleEmail}
                    disabled={working || !totals.count}
                    className='flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    <Mail className='w-4 h-4' />
                    Email
                  </button>
                </div>
                {shareSupported && (
                  <button
                    type='button'
                    onClick={handleShare}
                    disabled={working || !totals.count}
                    className='w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    {busy === 'share' ? (
                      <Loader2 className='w-4 h-4 animate-spin' />
                    ) : (
                      <Share2 className='w-4 h-4' />
                    )}
                    Compartilhar PDF
                  </button>
                )}
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={working || !totals.count || (order && !dirty)}
                  className='w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-40'
                >
                  {saving && !busy ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Save className='w-4 h-4' />
                  )}
                  {order
                    ? dirty
                      ? 'Salvar alterações'
                      : 'Pedido salvo'
                    : 'Salvar pedido'}
                </button>
                <p className='text-[11px] text-gray-400 text-center'>
                  WhatsApp leva o pedido em texto.
                  {shareSupported
                    ? ' “Compartilhar PDF” manda o arquivo pelo app que você escolher.'
                    : ' Para mandar o arquivo, baixe o PDF e anexe na conversa.'}
                </p>
              </div>

              {/* Situação */}
              {order && (
                <div className='pt-4 border-t border-gray-100'>
                  <p className='text-sm font-semibold text-gray-800 mb-2'>
                    Situação
                  </p>
                  <div className='grid grid-cols-2 gap-1.5'>
                    {Object.entries(ORDER_STATUS_META).map(([key, meta]) => (
                      <button
                        key={key}
                        type='button'
                        onClick={() =>
                          key !== order.status && changeStatus(key)
                        }
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                          order.status === key
                            ? meta.cls
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                  {order.sends?.length > 0 && (
                    <p className='text-xs text-gray-400 mt-2'>
                      Último envio:{' '}
                      {new Date(order.lastSentAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {order.sends.length}{' '}
                      {order.sends.length === 1 ? 'envio' : 'envios'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Barra fixa no celular */}
      <div className='lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]'>
        <div className='flex-1 min-w-0'>
          <p className='text-xs text-gray-500'>
            {totals.count} {totals.count === 1 ? 'produto' : 'produtos'} ·{' '}
            {totals.pieces} {totals.pieces === 1 ? 'peça' : 'peças'}
          </p>
          <p className='text-lg font-bold text-primary leading-tight'>
            {formatBRL(totals.subtotal)}
          </p>
        </div>
        <button
          type='button'
          onClick={() =>
            summaryRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
          className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold'
        >
          <ChevronDown className='w-4 h-4' />
          Finalizar
        </button>
      </div>

      <OrderImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        rows={rows}
        onApply={applyImport}
      />
      <OrderEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        axios={axios}
        order={order}
        withImages={withImages}
        emailConfigured={emailConfigured}
        onSent={updated => {
          if (updated) {
            setOrder(updated);
            loadedOrderRef.current = updated._id;
          }
        }}
      />
    </div>
  );
};

export default PriceTableOrder;
