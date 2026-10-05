// client/src/pages/seller/PriceTableEditor.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 EDITOR DE TABELA DE PREÇOS (/seller/tabelas/:id)
// ═══════════════════════════════════════════════════════════════════════
// • Regras: base, markup/margem, % geral, arredondamento (RulesPanel).
// • Organização: seções e itens com drag and drop, % por seção, % ou preço
//   fixo por item, ações em massa (SectionList + barra de seleção).
// • Visualização: como o lojista vai ver (TablePreview).
// • Saída: PDF (texto, lista com imagens, catálogo), Excel, email e
//   histórico de versões.
//
// Os preços são calculados ao vivo pelo priceTableEngine (espelho do
// motor do servidor). Nada é gravado como preço: só regras e ordem.
//
// Salvamento automático: cada alteração agenda um PUT (1,2 s). O servidor
// só aceita se o `rev` enviado ainda for o atual — se a tabela foi mudada
// noutra aba, aparece o aviso para recarregar. Exportar e enviar sempre
// salvam antes (flush), porque o servidor gera o arquivo a partir do que
// está gravado.
// ═══════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Loader2,
  Check,
  CloudOff,
  AlertTriangle,
  Download,
  ChevronDown,
  Send,
  History,
  Search,
  X,
  Pencil,
  Eye,
  EyeOff,
  Plus,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowDownAZ,
  SlidersHorizontal,
  FolderInput,
  Eraser,
  RefreshCw,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  PCT_LIMITS,
  computeTable,
  normalizePct,
  resolveItemPrice,
} from '../../utils/priceTableEngine';
import {
  API,
  EXPORT_OPTIONS,
  KIND_META,
  PREVIEW_MODES,
  compareText,
  downloadExport,
  newSectionKey,
  normalizeSearch,
  readBlobError,
} from '../../utils/priceTableUtils';
import RulesPanel from '../../components/priceTables/RulesPanel';
import SectionList, {
  MoveToSectionDialog,
} from '../../components/priceTables/SectionList';
import TablePreview from '../../components/priceTables/TablePreview';
import NumberField from '../../components/priceTables/NumberField';
import SendModal from '../../components/priceTables/SendModal';
import HistoryDrawer from '../../components/priceTables/HistoryDrawer';

const AUTOSAVE_DELAY_MS = 1200;

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Garante o formato esperado pelo editor (ids como string, nulls explícitos). */
const normalizeTable = raw => ({
  ...raw,
  description: raw.description || '',
  defaultPct: raw.defaultPct ?? 0,
  header: {
    title: raw.header?.title || 'Tabela de Preços',
    subtitle: raw.header?.subtitle || '',
    validUntil: raw.header?.validUntil || null,
    paymentTerms: raw.header?.paymentTerms || '',
    notes: raw.header?.notes || '',
  },
  options: {
    showSku: raw.options?.showSku !== false,
    showImages: !!raw.options?.showImages,
    imageLayout: raw.options?.imageLayout || 'list',
    includeUnpublished: !!raw.options?.includeUnpublished,
    hideOutOfStock: !!raw.options?.hideOutOfStock,
  },
  sections: (raw.sections || []).map(section => ({
    key: section.key,
    title: section.title,
    categoryPath: section.categoryPath || null,
    pct: section.pct ?? null,
    items: (section.items || []).map(item => ({
      product: String(item.product),
      pct: item.pct ?? null,
      fixedPrice: item.fixedPrice ?? null,
      hidden: !!item.hidden,
    })),
  })),
});

const toPayload = table => ({
  // Nome a meio de ser reescrito (campo vazio) não pode travar o salvamento
  name: table.name.trim() || 'Tabela sem nome',
  description: table.description,
  kind: table.kind,
  base: table.base,
  mode: table.mode,
  defaultPct: table.defaultPct,
  rounding: table.rounding,
  header: table.header,
  options: table.options,
  sections: table.sections,
});

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'overrides', label: 'Com exceção' },
  { id: 'noPrice', label: 'Sem preço' },
  { id: 'belowCost', label: 'Abaixo do custo' },
  { id: 'excluded', label: 'Fora da tabela' },
];

const SAVE_META = {
  saved: { label: 'Salvo', icon: Check, cls: 'text-green-600' },
  dirty: {
    label: 'Alterações por salvar…',
    icon: Loader2,
    cls: 'text-gray-400',
  },
  saving: {
    label: 'Salvando…',
    icon: Loader2,
    cls: 'text-gray-500',
    spin: true,
  },
  error: { label: 'Erro ao salvar', icon: CloudOff, cls: 'text-red-600' },
  conflict: {
    label: 'Desatualizada',
    icon: AlertTriangle,
    cls: 'text-amber-600',
  },
};

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────
const PriceTableEditor = () => {
  const { id } = useParams();
  const { axios } = useAppContext();

  const [table, setTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [newIds, setNewIds] = useState(() => new Set());
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [versionCount, setVersionCount] = useState(0);

  const [saveState, setSaveState] = useState('saved');
  const [saveError, setSaveError] = useState('');
  const [view, setView] = useState('edit');
  const [previewMode, setPreviewMode] = useState('grid');
  const [rulesOpen, setRulesOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());
  const [selection, setSelection] = useState(() => new Set());
  const [bulkPct, setBulkPct] = useState(null);
  const [moveRequest, setMoveRequest] = useState(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ─── Refs do salvamento automático ───
  const tableRef = useRef(null);
  const revRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(null); // Promise do save em andamento
  const blockedRef = useRef(false); // conflito: não tenta mais salvar
  const failuresRef = useRef(0); // falhas de rede seguidas (espera crescente)
  const timerRef = useRef(null);
  const exportMenuRef = useRef(null);
  tableRef.current = table;

  const productsById = useMemo(
    () => Object.fromEntries(products.map(p => [p._id, p])),
    [products],
  );
  const productsRef = useRef(productsById);
  productsRef.current = productsById;

  // ─── Carregar ───
  const load = useCallback(async () => {
    setLoadError('');
    setTable(null);
    try {
      const { data } = await axios.get(`${API}/${id}`);
      if (!data.success) throw new Error(data.message);
      const normalized = normalizeTable(data.table);
      revRef.current = data.table.rev ?? 0;
      dirtyRef.current = false;
      blockedRef.current = false;
      failuresRef.current = 0;
      setSaveError('');
      setProducts(data.products || []);
      setTable(normalized);
      setVersionCount(data.table.versionCount || 0);
      setEmailConfigured(data.emailConfigured !== false);
      setPreviewMode(
        normalized.kind === 'interna'
          ? 'text'
          : normalized.options.showImages
            ? normalized.options.imageLayout
            : 'text',
      );
      setSelection(new Set());
      setSaveState('saved');

      const added = data.sync?.addedIds || [];
      setNewIds(new Set(added));
      if (added.length > 0)
        toast(
          `${added.length} ${added.length === 1 ? 'produto novo entrou' : 'produtos novos entraram'} na tabela (marcados como “Novo”).`,
          { icon: '🆕', duration: 6000 },
        );
    } catch (err) {
      setLoadError(
        err.response?.data?.message ||
          err.message ||
          'Erro ao carregar a tabela',
      );
    }
  }, [axios, id]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Salvar ───
  // save() devolve:
  //   'ok'       gravado
  //   'conflict' a tabela mudou noutra aba (para de salvar até recarregar)
  //   'rejected' o servidor recusou (4xx): repetir sozinho não adianta
  //   'retry'    rede ou servidor fora do ar: tenta de novo com espera crescente
  const save = useCallback(() => {
    if (blockedRef.current) return Promise.resolve('conflict');
    if (savingRef.current) return savingRef.current;

    const run = (async () => {
      setSaveState('saving');
      dirtyRef.current = false;
      const payload = toPayload(tableRef.current);
      const sent = JSON.stringify(payload);
      const stillDirty = () =>
        dirtyRef.current ||
        JSON.stringify(toPayload(tableRef.current)) !== sent;

      try {
        const { data } = await axios.put(`${API}/${id}`, {
          rev: revRef.current,
          ...payload,
        });
        if (!data.success) throw new Error(data.message);
        revRef.current = data.rev;
        failuresRef.current = 0;
        setSaveError('');
        setSaveState(dirtyRef.current ? 'dirty' : 'saved');
        return 'ok';
      } catch (err) {
        const status = err.response?.status;

        if (status === 409) {
          // Pode ser um falso conflito: o PUT anterior foi gravado e só a
          // resposta se perdeu. Se o servidor tem exatamente o que acabamos
          // de enviar, adotamos o rev dele e seguimos.
          try {
            const { data } = await axios.get(`${API}/${id}`);
            const onServer = JSON.stringify(
              toPayload(normalizeTable(data.table)),
            );
            if (data.success && onServer === sent) {
              revRef.current = data.table.rev ?? 0;
              failuresRef.current = 0;
              dirtyRef.current = stillDirty();
              setSaveError('');
              setSaveState(dirtyRef.current ? 'dirty' : 'saved');
              return 'ok';
            }
          } catch {
            /* sem rede para conferir: trata como conflito */
          }
          dirtyRef.current = true;
          blockedRef.current = true;
          setSaveState('conflict');
          return 'conflict';
        }

        dirtyRef.current = true;
        setSaveState('error');
        const rejected =
          status >= 400 && status < 500 && status !== 408 && status !== 429;
        setSaveError(
          rejected
            ? err.response?.data?.message || 'O servidor recusou as alterações.'
            : 'Sem ligação ao servidor. Nova tentativa automática em instantes.',
        );
        return rejected ? 'rejected' : 'retry';
      } finally {
        savingRef.current = null;
      }
    })();

    savingRef.current = run;
    return run;
  }, [axios, id]);

  const scheduleSave = useCallback(
    (delay = AUTOSAVE_DELAY_MS) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const outcome = await save();
        if (outcome === 'ok') {
          // Mudou de novo enquanto salvava → salva outra vez
          if (dirtyRef.current) scheduleSave();
        } else if (outcome === 'retry') {
          // 3 s, 6 s, 12 s… até 60 s — nunca um PUT por segundo sem fim
          failuresRef.current += 1;
          scheduleSave(Math.min(60000, 3000 * 2 ** (failuresRef.current - 1)));
        }
        // 'rejected' e 'conflict' não repetem sozinhos: a próxima edição
        // (ou o botão "Tentar salvar de novo") tenta outra vez
      }, delay);
    },
    [save],
  );

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (blockedRef.current) return;
    setSaveState(state => (state === 'saving' ? state : 'dirty'));
    scheduleSave();
  }, [scheduleSave]);

  /** Garante que tudo o que está na tela está gravado. */
  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (savingRef.current) await savingRef.current;
      if (!dirtyRef.current) return true;
      if (blockedRef.current) return false;
      // O estado do React pode ainda não ter chegado ao ref: espera um tick
      await new Promise(resolve => setTimeout(resolve, 0));
      const outcome = await save();
      if (outcome !== 'ok') return false;
    }
    return !dirtyRef.current;
  }, [save]);

  // Aviso ao fechar a aba com alterações por salvar + salva ao sair da página
  useEffect(() => {
    const onBeforeUnload = e => {
      if (!dirtyRef.current && !savingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      clearTimeout(timerRef.current);
      if (dirtyRef.current && !blockedRef.current) save();
    };
  }, [save]);

  // ─── Mutação do estado ───
  const mutate = useCallback(
    fn => {
      setTable(prev => (prev ? fn(prev) : prev));
      markDirty();
    },
    [markDirty],
  );

  const mutateSections = useCallback(
    fn =>
      mutate(prev => {
        const sections = fn(prev.sections);
        return sections === prev.sections ? prev : { ...prev, sections };
      }),
    [mutate],
  );

  const patchItems = useCallback(
    (ids, patchFn) => {
      const set = new Set(ids);
      mutateSections(sections =>
        sections.map(section => {
          if (!section.items.some(item => set.has(item.product)))
            return section;
          return {
            ...section,
            items: section.items.map(item =>
              set.has(item.product) ? { ...item, ...patchFn(item) } : item,
            ),
          };
        }),
      );
    },
    [mutateSections],
  );

  // Ações passadas à lista — objeto ESTÁVEL (as linhas são memoizadas)
  const actions = useMemo(
    () => ({
      toggleSelect: productId =>
        setSelection(prev => {
          const next = new Set(prev);
          if (next.has(productId)) next.delete(productId);
          else next.add(productId);
          return next;
        }),

      selectMany: (ids, select) =>
        setSelection(prev => {
          const next = new Set(prev);
          ids.forEach(pid => (select ? next.add(pid) : next.delete(pid)));
          return next;
        }),

      toggleCollapse: key =>
        setCollapsedKeys(prev => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        }),

      changeItem: (productId, patch) => patchItems([productId], () => patch),

      changeSection: (key, patch) =>
        mutateSections(sections =>
          sections.map(section =>
            section.key === key ? { ...section, ...patch } : section,
          ),
        ),

      moveItem: (productId, how) =>
        mutateSections(sections =>
          sections.map(section => {
            const from = section.items.findIndex(i => i.product === productId);
            if (from < 0) return section;
            const last = section.items.length - 1;
            const to =
              how === 'up'
                ? Math.max(0, from - 1)
                : how === 'down'
                  ? Math.min(last, from + 1)
                  : how === 'top'
                    ? 0
                    : last;
            if (to === from) return section;
            const items = [...section.items];
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);
            return { ...section, items };
          }),
        ),

      moveItemsToSection: (ids, targetKey) => {
        const set = new Set(ids);
        mutateSections(sections => {
          const moving = [];
          const stripped = sections.map(section => {
            if (section.key === targetKey) return section;
            const staying = [];
            section.items.forEach(item =>
              (set.has(item.product) ? moving : staying).push(item),
            );
            return staying.length === section.items.length
              ? section
              : { ...section, items: staying };
          });
          if (!moving.length) return sections;
          return stripped.map(section =>
            section.key === targetKey
              ? { ...section, items: [...section.items, ...moving] }
              : section,
          );
        });
      },

      requestMoveToSection: ids => setMoveRequest(ids),

      sortSection: (key, by) =>
        mutate(prev => {
          const byId = productsRef.current;
          const sections = prev.sections.map(section => {
            if (section.key !== key) return section;
            const priceOf = item =>
              resolveItemPrice({
                product: byId[item.product],
                item,
                section,
                table: prev,
              }).priceCents ?? Number.MAX_SAFE_INTEGER;
            const items = [...section.items].sort((a, b) => {
              const pa = byId[a.product];
              const pb = byId[b.product];
              if (by === 'price') {
                const diff = priceOf(a) - priceOf(b);
                if (diff !== 0) return diff;
              }
              if (by === 'sku') {
                const diff = compareText(pa?.sku, pb?.sku);
                if (diff !== 0) return diff;
              }
              return compareText(pa?.name, pb?.name);
            });
            return { ...section, items };
          });
          return { ...prev, sections };
        }),

      moveSection: (key, step) =>
        mutateSections(sections => {
          const from = sections.findIndex(s => s.key === key);
          const to = from + step;
          if (from < 0 || to < 0 || to >= sections.length) return sections;
          const next = [...sections];
          [next[from], next[to]] = [next[to], next[from]];
          return next;
        }),

      clearSectionOverrides: key =>
        mutateSections(sections =>
          sections.map(section =>
            section.key === key
              ? {
                  ...section,
                  pct: null,
                  items: section.items.map(item =>
                    item.pct === null && item.fixedPrice === null
                      ? item
                      : { ...item, pct: null, fixedPrice: null },
                  ),
                }
              : section,
          ),
        ),

      deleteSection: key =>
        mutateSections(sections => {
          const target = sections.find(s => s.key === key);
          if (!target || target.items.length > 0) return sections;
          return sections.filter(s => s.key !== key);
        }),
    }),
    [mutate, mutateSections, patchItems],
  );

  // ─── Regras ───
  const onSetting = useCallback(
    (key, value) => {
      if (key === 'mode') {
        const hasOverrides = (tableRef.current?.sections || []).some(
          section =>
            section.pct !== null || section.items.some(i => i.pct !== null),
        );
        if (hasOverrides)
          toast(
            'As % por seção e por item foram mantidas. Confira se continuam certas no novo modo — as que ficarem impossíveis aparecem em “Sem preço”.',
            { icon: '⚠️', duration: 8000 },
          );
      }
      mutate(prev => {
        const next = { ...prev, [key]: value };
        // Margem só faz sentido sobre o custo; fora disso volta a markup
        if (key === 'base' && value !== 'cost') next.mode = 'markup';
        if (key === 'mode' || key === 'base')
          next.defaultPct = normalizePct(next.defaultPct, next.mode) ?? 0;
        return next;
      });
    },
    [mutate],
  );
  const onHeader = useCallback(
    (key, value) =>
      mutate(prev => ({ ...prev, header: { ...prev.header, [key]: value } })),
    [mutate],
  );
  const onOption = useCallback(
    (key, value) =>
      mutate(prev => ({ ...prev, options: { ...prev.options, [key]: value } })),
    [mutate],
  );

  const clearAllOverrides = () => {
    if (
      !window.confirm(
        'Aplicar a % geral à tabela inteira?\n\nTodas as % por seção, % por item e preços fixos serão apagados.',
      )
    )
      return;
    mutateSections(sections =>
      sections.map(section => ({
        ...section,
        pct: null,
        items: section.items.map(item =>
          item.pct === null && item.fixedPrice === null
            ? item
            : { ...item, pct: null, fixedPrice: null },
        ),
      })),
    );
  };

  // ─── Cálculo ───
  // Só recalcula quando muda algo que afeta preço (não a cada letra do cabeçalho)
  const computed = useMemo(
    () => (table ? computeTable(table, productsById) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      table?.sections,
      table?.base,
      table?.mode,
      table?.defaultPct,
      table?.rounding,
      table?.options,
      productsById,
    ],
  );

  const rowFilter = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q && filter === 'all') return null;
    return row => {
      if (q) {
        const haystack = normalizeSearch(
          `${row.product.name} ${row.product.sku}`,
        );
        if (!haystack.includes(q)) return false;
      }
      switch (filter) {
        case 'overrides':
          return row.item.pct !== null || row.item.fixedPrice !== null;
        case 'noPrice':
          return row.price === null;
        case 'belowCost':
          return row.belowCost;
        case 'excluded':
          return !!row.excluded;
        default:
          return true;
      }
    };
  }, [search, filter]);

  // Fecha o menu de exportação ao clicar fora
  useEffect(() => {
    if (!exportOpen) return undefined;
    const onDown = e => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target))
        setExportOpen(false);
    };
    const onKey = e => e.key === 'Escape' && setExportOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportOpen]);

  const closeMoveDialog = useCallback(() => setMoveRequest(null), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  // ─── Estados de carregamento ───
  if (loadError)
    return (
      <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50 flex items-center justify-center p-6'>
        <div className='text-center'>
          <p className='text-sm text-gray-700 mb-4'>{loadError}</p>
          <div className='flex items-center justify-center gap-3'>
            <Link
              to='/seller/tabelas'
              className='px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg'
            >
              Voltar às tabelas
            </Link>
            <button
              onClick={load}
              className='px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90'
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );

  if (!table || !computed)
    return (
      <div className='flex-1 h-[95vh] bg-gray-50 flex items-center justify-center text-gray-400'>
        <Loader2 className='w-6 h-6 animate-spin' />
      </div>
    );

  const { stats } = computed;
  const kind = KIND_META[table.kind] || KIND_META.cliente;
  const saveMeta = SAVE_META[saveState];
  const allCollapsed =
    table.sections.length > 0 &&
    table.sections.every(s => collapsedKeys.has(s.key));
  const nothingToExport = stats.visible === 0;
  const selectedIds = [...selection];

  const filterCounts = {
    overrides: stats.itemPct + stats.fixed,
    noPrice: stats.noPrice,
    belowCost: stats.belowCost,
    excluded: stats.total - stats.visible,
  };

  // ─── Exportar ───
  const runExport = async option => {
    setExportOpen(false);
    if (exporting) return;
    setExporting(option.id);
    const toastId = toast.loading('Gerando o arquivo…');
    try {
      const saved = await flush();
      if (!saved)
        throw new Error('Não foi possível salvar a tabela antes de exportar.');
      const result = await downloadExport(
        axios,
        `${API}/${id}/export`,
        option.body,
        `tabela-de-precos.${option.ext}`,
      );
      if (result.version) setVersionCount(v => Math.max(v, result.version));
      const missing = result.imagesRequested - result.imagesLoaded;
      toast.success(
        missing > 0
          ? `Arquivo gerado (versão ${result.version}). ${missing} ${missing === 1 ? 'imagem não carregou' : 'imagens não carregaram'} e ${missing === 1 ? 'saiu' : 'saíram'} em branco.`
          : `Arquivo gerado (versão ${result.version}).`,
        { id: toastId, duration: missing > 0 ? 7000 : 3000 },
      );
    } catch (err) {
      toast.error(
        (await readBlobError(err)) || err.message || 'Erro ao gerar o arquivo',
        { id: toastId },
      );
    } finally {
      setExporting('');
    }
  };

  // ─── Ações em massa ───
  const applyBulkPct = () => {
    if (bulkPct === null) return toast.error('Informe a porcentagem.');
    patchItems(selectedIds, () => ({ pct: bulkPct, fixedPrice: null }));
    toast.success(
      `% aplicada a ${selectedIds.length} ${selectedIds.length === 1 ? 'item' : 'itens'}`,
    );
  };

  const addSection = () => {
    const key = newSectionKey();
    mutateSections(sections => [
      ...sections,
      { key, title: 'Nova seção', categoryPath: null, pct: null, items: [] },
    ]);
    toast.success(
      'Seção criada no fim da tabela. Renomeie e arraste itens para ela.',
    );
    setTimeout(() => {
      document
        .querySelector(`[data-section-key="${key}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const sortSectionsAZ = () =>
    mutateSections(sections =>
      [...sections].sort((a, b) => compareText(a.title, b.title)),
    );

  const toggleCollapseAll = () =>
    setCollapsedKeys(
      allCollapsed ? new Set() : new Set(table.sections.map(s => s.key)),
    );

  const summary = [
    `${stats.visible} ${stats.visible === 1 ? 'produto' : 'produtos'} na tabela`,
    stats.noPrice > 0 && `${stats.noPrice} sem preço`,
    stats.belowCost > 0 && `${stats.belowCost} abaixo do custo`,
    stats.unpublished > 0 &&
      `${stats.unpublished} ${stats.unpublished === 1 ? 'rascunho' : 'rascunhos'} fora`,
    stats.outOfStock > 0 && `${stats.outOfStock} sem estoque fora`,
    stats.hidden > 0 &&
      `${stats.hidden} ${stats.hidden === 1 ? 'oculto' : 'ocultos'}`,
  ].filter(Boolean);

  const pctMin = table.mode === 'margin' ? 0 : PCT_LIMITS.min;
  const pctMax =
    table.mode === 'margin' ? PCT_LIMITS.marginMax : PCT_LIMITS.max;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      {/* ═══ Barra superior ═══ */}
      <div className='sticky top-0 z-20 bg-white border-b border-gray-200'>
        <div className='px-4 md:px-6 py-3 max-w-[1400px] mx-auto'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            <Link
              to='/seller/tabelas'
              aria-label='Voltar às tabelas'
              className='p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg'
            >
              <ArrowLeft className='w-5 h-5' />
            </Link>

            <input
              value={table.name}
              onChange={e =>
                mutate(prev => ({ ...prev, name: e.target.value }))
              }
              onBlur={e => {
                if (!e.target.value.trim())
                  mutate(prev => ({ ...prev, name: 'Tabela sem nome' }));
              }}
              maxLength={80}
              aria-label='Nome da tabela'
              className='flex-1 min-w-[180px] text-lg font-bold text-gray-900 bg-transparent px-2 py-1 rounded-lg border border-transparent hover:border-gray-200 focus:border-primary focus:outline-none'
            />

            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${kind.cls}`}
            >
              {kind.label}
            </span>

            <span
              role='status'
              className={`flex items-center gap-1.5 text-xs font-medium ${saveMeta.cls}`}
            >
              <saveMeta.icon
                className={`w-3.5 h-3.5 ${saveMeta.spin ? 'animate-spin' : ''}`}
              />
              {saveMeta.label}
            </span>

            <div className='flex items-center gap-2 ml-auto'>
              <button
                type='button'
                onClick={() => setHistoryOpen(true)}
                className='flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg'
              >
                <History className='w-4 h-4' />
                <span className='hidden sm:inline'>
                  Histórico{versionCount > 0 ? ` (v${versionCount})` : ''}
                </span>
              </button>

              <button
                type='button'
                onClick={() => setSendOpen(true)}
                disabled={nothingToExport}
                title={nothingToExport ? 'Nenhum produto com preço' : undefined}
                className='flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg disabled:opacity-50'
              >
                <Send className='w-4 h-4' />
                <span className='hidden sm:inline'>Enviar</span>
              </button>

              <div className='relative' ref={exportMenuRef}>
                <button
                  type='button'
                  onClick={() => setExportOpen(o => !o)}
                  disabled={nothingToExport || !!exporting}
                  aria-haspopup='menu'
                  aria-expanded={exportOpen}
                  title={
                    nothingToExport ? 'Nenhum produto com preço' : undefined
                  }
                  className='flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60'
                >
                  {exporting ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Download className='w-4 h-4' />
                  )}
                  Baixar
                  <ChevronDown className='w-4 h-4' />
                </button>
                {exportOpen && (
                  <div
                    role='menu'
                    className='absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30'
                  >
                    {EXPORT_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type='button'
                        role='menuitem'
                        onClick={() => runExport(option)}
                        className='w-full text-left px-4 py-2.5 hover:bg-gray-50'
                      >
                        <span className='block text-sm font-medium text-gray-800'>
                          {option.label}
                        </span>
                        <span className='block text-xs text-gray-400'>
                          {option.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-2.5'>
            <div
              role='tablist'
              aria-label='Modo de exibição'
              className='inline-flex p-1 bg-gray-100 rounded-lg'
            >
              {[
                { id: 'edit', label: 'Editar', icon: Pencil },
                { id: 'preview', label: 'Visualizar', icon: Eye },
              ].map(tab => (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={view === tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    view === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <tab.icon className='w-4 h-4' />
                  {tab.label}
                </button>
              ))}
            </div>
            <p className='text-xs text-gray-500'>{summary.join(' · ')}</p>
          </div>
        </div>

        {saveState === 'conflict' && (
          <div className='bg-amber-50 border-t border-amber-200 px-4 md:px-6 py-2.5'>
            <div className='max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900'>
              <span className='flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4' />
                Esta tabela foi alterada em outra aba ou dispositivo. As
                mudanças feitas aqui desde então não foram salvas.
              </span>
              <button
                type='button'
                onClick={load}
                className='flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700'
              >
                <RefreshCw className='w-3.5 h-3.5' />
                Recarregar a tabela
              </button>
            </div>
          </div>
        )}
        {saveState === 'error' && (
          <div className='bg-red-50 border-t border-red-200 px-4 md:px-6 py-2.5'>
            <div className='max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 text-sm text-red-800'>
              <span>
                Não foi possível salvar. {saveError || 'Verifique a conexão.'}
              </span>
              <button
                type='button'
                onClick={() => flush()}
                className='px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700'
              >
                Tentar salvar de novo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Conteúdo ═══ */}
      <div className='p-4 md:p-6 max-w-[1400px] mx-auto pb-28'>
        {view === 'preview' ? (
          <>
            <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
              <div
                role='group'
                aria-label='Formato da visualização'
                className='inline-flex p-1 bg-white border border-gray-200 rounded-lg'
              >
                {PREVIEW_MODES.map(mode => (
                  <button
                    key={mode.id}
                    type='button'
                    aria-pressed={previewMode === mode.id}
                    onClick={() => setPreviewMode(mode.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      previewMode === mode.id
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className='text-xs text-gray-500'>
                É assim que a tabela sai no PDF. Use “Baixar” ou “Enviar” no
                topo.
              </p>
            </div>
            <TablePreview
              table={table}
              computed={computed}
              mode={previewMode}
            />
          </>
        ) : (
          <div className='grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start'>
            {/* Regras */}
            <aside className='xl:sticky xl:top-[124px] xl:max-h-[calc(95vh-140px)] xl:overflow-y-auto xl:pr-1'>
              <button
                type='button'
                onClick={() => setRulesOpen(o => !o)}
                aria-expanded={rulesOpen}
                className='xl:hidden w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 mb-3'
              >
                <span className='flex items-center gap-2'>
                  <SlidersHorizontal className='w-4 h-4 text-primary' />
                  Regras e cabeçalho da tabela
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${rulesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div className={rulesOpen ? 'block' : 'hidden xl:block'}>
                <RulesPanel
                  table={table}
                  stats={stats}
                  onSetting={onSetting}
                  onHeader={onHeader}
                  onOption={onOption}
                  onClearAllOverrides={clearAllOverrides}
                />
              </div>
            </aside>

            {/* Seções e itens */}
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2 mb-3'>
                <div className='relative flex-1 min-w-[220px]'>
                  <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder='Buscar por nome ou código'
                    aria-label='Buscar produto na tabela'
                    className='w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                  />
                  {search && (
                    <button
                      type='button'
                      onClick={() => setSearch('')}
                      aria-label='Limpar busca'
                      className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>
                <button
                  type='button'
                  onClick={toggleCollapseAll}
                  className='flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50'
                >
                  {allCollapsed ? (
                    <ChevronsUpDown className='w-4 h-4' />
                  ) : (
                    <ChevronsDownUp className='w-4 h-4' />
                  )}
                  {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
                </button>
                <button
                  type='button'
                  onClick={sortSectionsAZ}
                  className='flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50'
                >
                  <ArrowDownAZ className='w-4 h-4' />
                  Seções A–Z
                </button>
                <button
                  type='button'
                  onClick={addSection}
                  className='flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50'
                >
                  <Plus className='w-4 h-4' />
                  Nova seção
                </button>
              </div>

              <div className='flex flex-wrap items-center gap-1.5 mb-3'>
                {FILTERS.map(option => {
                  const count = filterCounts[option.id];
                  if (option.id !== 'all' && !count && filter !== option.id)
                    return null;
                  const active = filter === option.id;
                  return (
                    <button
                      key={option.id}
                      type='button'
                      aria-pressed={active}
                      onClick={() => setFilter(option.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                      {option.id !== 'all' && ` (${count || 0})`}
                    </button>
                  );
                })}
                {rowFilter && (
                  <span className='text-xs text-gray-400 ml-1'>
                    Arrastar fica desligado enquanto há busca ou filtro.
                  </span>
                )}
              </div>

              {/* Legenda das colunas (desktop) */}
              <div className='hidden md:flex items-center gap-3 px-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider'>
                <span className='flex-1'>Produto</span>
                <span className='w-[78px] text-right'>
                  {table.base === 'cost'
                    ? 'Custo'
                    : table.base === 'wholesale'
                      ? 'Tabela'
                      : 'Venda'}
                </span>
                <span className='w-[70px] text-right'>% própria</span>
                <span className='w-[96px] text-right'>Preço fixo</span>
                <span className='w-[104px] text-right'>Preço na tabela</span>
                <span className='w-[60px]' />
              </div>

              {table.sections.length === 0 ? (
                <div className='bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500'>
                  Nenhum produto cadastrado ainda. Assim que houver produtos no
                  site, eles aparecem aqui automaticamente.
                </div>
              ) : (
                <SectionList
                  table={table}
                  computed={computed}
                  rowFilter={rowFilter}
                  collapsedKeys={collapsedKeys}
                  selection={selection}
                  newIds={newIds}
                  actions={actions}
                  onSectionsChange={mutateSections}
                />
              )}

              {rowFilter &&
                computed.sections.every(
                  s => s.rows.filter(rowFilter).length === 0,
                ) && (
                  <div className='bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500'>
                    Nenhum produto corresponde à busca ou ao filtro.
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Barra de ações em massa ═══ */}
      {view === 'edit' && selection.size > 0 && (
        <div className='fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-3xl'>
          <div className='bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2'>
            <span className='text-sm font-semibold'>
              {selection.size}{' '}
              {selection.size === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <div className='flex items-center gap-1.5'>
              <NumberField
                className='w-[84px]'
                value={bulkPct}
                onCommit={setBulkPct}
                placeholder='%'
                suffix='%'
                min={pctMin}
                max={pctMax}
                ariaLabel='Porcentagem para os itens selecionados'
              />
              <button
                type='button'
                onClick={applyBulkPct}
                className='px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100'
              >
                Aplicar %
              </button>
            </div>
            <div className='flex flex-wrap items-center gap-1 ml-auto'>
              <button
                type='button'
                onClick={() =>
                  patchItems(selectedIds, () => ({
                    pct: null,
                    fixedPrice: null,
                  }))
                }
                title='Voltar ao preço calculado pela seção/tabela'
                className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 rounded-lg'
              >
                <Eraser className='w-3.5 h-3.5' />
                Limpar exceções
              </button>
              <button
                type='button'
                onClick={() =>
                  patchItems(selectedIds, () => ({ hidden: true }))
                }
                className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 rounded-lg'
              >
                <EyeOff className='w-3.5 h-3.5' />
                Ocultar
              </button>
              <button
                type='button'
                onClick={() =>
                  patchItems(selectedIds, () => ({ hidden: false }))
                }
                className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 rounded-lg'
              >
                <Eye className='w-3.5 h-3.5' />
                Mostrar
              </button>
              <button
                type='button'
                onClick={() => setMoveRequest(selectedIds)}
                className='flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 rounded-lg'
              >
                <FolderInput className='w-3.5 h-3.5' />
                Mover para…
              </button>
              <button
                type='button'
                onClick={() => setSelection(new Set())}
                aria-label='Limpar seleção'
                className='p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Diálogos ═══ */}
      <MoveToSectionDialog
        open={!!moveRequest}
        count={moveRequest?.length || 0}
        sections={table.sections}
        onClose={closeMoveDialog}
        onPick={sectionKey => {
          actions.moveItemsToSection(moveRequest, sectionKey);
          setMoveRequest(null);
        }}
      />

      <SendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        axios={axios}
        tableId={id}
        table={table}
        visibleCount={stats.visible}
        emailConfigured={emailConfigured}
        flush={flush}
        onSent={data => {
          if (data.version) setVersionCount(v => Math.max(v, data.version));
          toast.success(data.message);
        }}
      />

      <HistoryDrawer
        open={historyOpen}
        onClose={closeHistory}
        axios={axios}
        tableId={id}
        currentVersion={versionCount}
      />
    </div>
  );
};

export default PriceTableEditor;
