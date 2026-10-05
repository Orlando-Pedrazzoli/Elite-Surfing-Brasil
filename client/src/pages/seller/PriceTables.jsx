// client/src/pages/seller/PriceTables.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 TABELAS DE PREÇO — lista (/seller/tabelas)
// ═══════════════════════════════════════════════════════════════════════
// Todas as tabelas do admin num só lugar: custo do fornecedor, tabelas de
// lojista com markup, catálogo com imagens. Aqui cria, duplica, arquiva,
// apaga e ORDENA (arrastar pela alça ou setas). Abrir uma tabela leva ao
// editor, onde ficam as regras, a visualização, o PDF/Excel e o envio.
// ═══════════════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import {
  Plus,
  Loader2,
  GripVertical,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronUp,
  ChevronDown,
  Package,
  CircleDollarSign,
  Tags,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Lock,
  Store,
  BookOpen,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { describeRule } from '../../utils/priceTableEngine';
import {
  API,
  KIND_META,
  TABLE_PRESETS,
  fmtDate,
} from '../../utils/priceTableUtils';
import NewTableModal from '../../components/priceTables/NewTableModal';

const PRESET_ICONS = { cost: Lock, markup: Store, wholesale: BookOpen };

// ─────────────────────────────────────────────────────────────────────
// Cartão de uma tabela (arrastável pela alça)
// ─────────────────────────────────────────────────────────────────────
const TableCard = ({
  table,
  index,
  total,
  sortable,
  busy,
  onMove,
  onDuplicate,
  onArchive,
  onDelete,
}) => {
  const kind = KIND_META[table.kind] || KIND_META.cliente;
  const { stats } = table;
  const warnings = [];
  if (stats.noPrice > 0) warnings.push(`${stats.noPrice} sem preço`);
  if (stats.belowCost > 0) warnings.push(`${stats.belowCost} abaixo do custo`);

  return (
    <Draggable draggableId={table._id} index={index} isDragDisabled={!sortable}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-3 bg-white rounded-xl border ${
            snapshot.isDragging ? 'border-primary shadow-xl' : 'border-gray-200'
          } ${table.archived ? 'opacity-70' : ''}`}
        >
          <div className='flex items-stretch'>
            {/* Alça + setas (alternativa sem arrastar) */}
            <div className='flex flex-col items-center justify-center gap-0.5 px-1.5 border-r border-gray-100'>
              <button
                type='button'
                onClick={() => onMove(index, -1)}
                disabled={!sortable || index === 0}
                aria-label={`Mover ${table.name} para cima`}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300'
              >
                <ChevronUp className='w-4 h-4' />
              </button>
              {/* <span> e não <button>: a biblioteca ignora arrastos iniciados
                  em elementos interativos. role/tabIndex vêm de dragHandleProps. */}
              <span
                {...provided.dragHandleProps}
                aria-label={`Arrastar ${table.name}`}
                aria-disabled={!sortable}
                className={`p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  sortable
                    ? 'text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'
                    : 'text-gray-200 cursor-not-allowed'
                }`}
              >
                <GripVertical className='w-5 h-5' />
              </span>
              <button
                type='button'
                onClick={() => onMove(index, 1)}
                disabled={!sortable || index === total - 1}
                aria-label={`Mover ${table.name} para baixo`}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300'
              >
                <ChevronDown className='w-4 h-4' />
              </button>
            </div>

            <div className='flex-1 min-w-0 p-4 flex flex-col md:flex-row md:items-center gap-4'>
              <Link
                to={`/seller/tabelas/${table._id}`}
                className='flex-1 min-w-0 group'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <h3 className='text-base font-semibold text-gray-900 group-hover:text-primary truncate'>
                    {table.name}
                  </h3>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${kind.cls}`}
                  >
                    {kind.label}
                  </span>
                  {table.archived && (
                    <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>
                      Arquivada
                    </span>
                  )}
                </div>
                <p className='text-sm text-gray-500 mt-1'>
                  {describeRule(table)}
                </p>
                <div className='flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500'>
                  <span>
                    <strong className='text-gray-700'>{stats.visible}</strong>{' '}
                    {stats.visible === 1 ? 'produto' : 'produtos'} na tabela
                  </span>
                  {warnings.length > 0 && (
                    <span className='inline-flex items-center gap-1 text-amber-700'>
                      <AlertTriangle className='w-3.5 h-3.5' />
                      {warnings.join(' · ')}
                    </span>
                  )}
                  <span>
                    {table.versionCount > 0
                      ? `Versão ${table.versionCount} · exportada em ${fmtDate(table.lastExportedAt)}`
                      : 'Ainda não exportada'}
                  </span>
                  {table.lastSentAt && (
                    <span>Enviada em {fmtDate(table.lastSentAt)}</span>
                  )}
                </div>
              </Link>

              <div className='flex items-center gap-1 flex-shrink-0'>
                <Link
                  to={`/seller/tabelas/${table._id}`}
                  className='flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90'
                >
                  Abrir
                  <ArrowRight className='w-4 h-4' />
                </Link>
                <button
                  type='button'
                  onClick={() => onDuplicate(table)}
                  disabled={busy}
                  title='Duplicar'
                  aria-label={`Duplicar ${table.name}`}
                  className='p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50'
                >
                  <Copy className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => onArchive(table)}
                  disabled={busy}
                  title={table.archived ? 'Restaurar' : 'Arquivar'}
                  aria-label={`${table.archived ? 'Restaurar' : 'Arquivar'} ${table.name}`}
                  className='p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50'
                >
                  {table.archived ? (
                    <ArchiveRestore className='w-4 h-4' />
                  ) : (
                    <Archive className='w-4 h-4' />
                  )}
                </button>
                <button
                  type='button'
                  onClick={() => onDelete(table)}
                  disabled={busy}
                  title='Apagar'
                  aria-label={`Apagar ${table.name}`}
                  className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>
        </li>
      )}
    </Draggable>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────
const PriceTables = () => {
  const { axios, navigate } = useAppContext();

  const [tables, setTables] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState({ open: false, preset: 'markup' });

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await axios.get(API);
      if (data.success) {
        setTables(data.tables);
        setCatalog(data.catalog);
      } else toast.error(data.message || 'Erro ao carregar as tabelas');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao carregar as tabelas');
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const archivedCount = useMemo(
    () => tables.filter(t => t.archived).length,
    [tables],
  );
  const visible = useMemo(
    () => tables.filter(t => showArchived || !t.archived),
    [tables, showArchived],
  );

  // ─── Ordenação ───
  // `nextVisible` é a nova ordem das tabelas visíveis; as ocultas
  // (arquivadas) mantêm a posição relativa, no fim.
  const applyOrder = async nextVisible => {
    const previous = tablesRef.current;
    const visibleIds = new Set(nextVisible.map(t => t._id));
    const next = [
      ...nextVisible,
      ...previous.filter(t => !visibleIds.has(t._id)),
    ];
    setTables(next);
    try {
      const { data } = await axios.put(`${API}/reorder`, {
        ids: next.map(t => t._id),
      });
      if (!data.success) throw new Error(data.message);
    } catch (err) {
      setTables(previous);
      toast.error(
        err.response?.data?.message || 'Não foi possível salvar a ordem',
      );
    }
  };

  const handleDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const next = [...visible];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    applyOrder(next);
  };

  const moveByStep = (index, step) => {
    const target = index + step;
    if (target < 0 || target >= visible.length) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    applyOrder(next);
  };

  // ─── Ações ───
  const createTable = async settings => {
    try {
      const { data } = await axios.post(API, settings);
      if (!data.success) return data.message || 'Erro ao criar a tabela';
      toast.success('Tabela criada com todos os produtos');
      navigate(`/seller/tabelas/${data.id}`);
      return null;
    } catch (err) {
      return err.response?.data?.message || 'Erro ao criar a tabela';
    }
  };

  const withBusy = async fn => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível concluir');
    } finally {
      setBusy(false);
    }
  };

  const duplicateTable = table =>
    withBusy(async () => {
      const { data } = await axios.post(`${API}/${table._id}/duplicate`, {});
      if (!data.success) throw new Error(data.message);
      toast.success('Tabela duplicada');
      await fetchTables();
    });

  const archiveTable = table =>
    withBusy(async () => {
      const { data } = await axios.post(`${API}/${table._id}/archive`, {
        archived: !table.archived,
      });
      if (!data.success) throw new Error(data.message);
      toast.success(table.archived ? 'Tabela restaurada' : 'Tabela arquivada');
      await fetchTables();
    });

  const deleteTable = table => {
    const msg = `Apagar a tabela "${table.name}"?\n\nO histórico de versões e de envios desta tabela também será apagado. Esta ação não pode ser desfeita.`;
    if (!window.confirm(msg)) return;
    withBusy(async () => {
      const { data } = await axios.delete(`${API}/${table._id}`);
      if (!data.success) throw new Error(data.message);
      toast.success('Tabela apagada');
      await fetchTables();
    });
  };

  const tiles = catalog
    ? [
        {
          label: 'Produtos cadastrados',
          value: catalog.total,
          hint:
            catalog.total - catalog.published > 0
              ? `${catalog.total - catalog.published} em rascunho`
              : 'todos publicados',
          icon: Package,
          cls: 'bg-blue-50 text-blue-600',
        },
        {
          label: 'Sem Custo do Fornecedor',
          value: catalog.withoutCost,
          hint: catalog.withoutCost
            ? 'ficam sem preço nas tabelas de custo'
            : 'tudo preenchido',
          icon: CircleDollarSign,
          cls: catalog.withoutCost
            ? 'bg-amber-50 text-amber-600'
            : 'bg-green-50 text-green-600',
        },
        {
          label: 'Sem Preço de Tabela',
          value: catalog.withoutWholesale,
          hint: catalog.withoutWholesale
            ? 'só afeta tabelas baseadas nele'
            : 'tudo preenchido',
          icon: Tags,
          cls: catalog.withoutWholesale
            ? 'bg-amber-50 text-amber-600'
            : 'bg-green-50 text-green-600',
        },
      ]
    : [];

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Tabelas de Preço
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              Custo do fornecedor, tabelas para lojistas e catálogo com imagens
              — em PDF, Excel ou por email
            </p>
          </div>
          <button
            onClick={() => setModal({ open: true, preset: 'markup' })}
            className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
          >
            <Plus className='w-5 h-5' />
            Nova Tabela
          </button>
        </div>

        {/* Números do catálogo */}
        {tiles.length > 0 && (
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
            {tiles.map(tile => (
              <div
                key={tile.label}
                className='bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4'
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center ${tile.cls}`}
                >
                  <tile.icon className='w-5 h-5' />
                </div>
                <div className='min-w-0'>
                  <p className='text-xs text-gray-500'>{tile.label}</p>
                  <p className='text-xl font-bold text-gray-900 leading-tight'>
                    {tile.value}
                  </p>
                  <p className='text-[11px] text-gray-400 truncate'>
                    {tile.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {catalog &&
          (catalog.withoutCost > 0 || catalog.withoutWholesale > 0) && (
            <p className='text-xs text-gray-500 -mt-3 mb-6'>
              Para completar os valores que faltam, abra a{' '}
              <Link
                to='/seller/product-list'
                className='text-primary font-medium hover:underline'
              >
                Lista de Produtos
              </Link>{' '}
              e edite a Precificação de cada um.
            </p>
          )}

        {/* Lista */}
        {loading ? (
          <div className='flex items-center justify-center py-24 text-gray-400'>
            <Loader2 className='w-6 h-6 animate-spin' />
          </div>
        ) : tables.length === 0 ? (
          <div className='bg-white rounded-2xl border border-gray-200 p-8'>
            <div className='flex items-center gap-3 mb-1'>
              <FileSpreadsheet className='w-6 h-6 text-primary' />
              <h2 className='text-lg font-bold text-gray-900'>
                Crie a sua primeira tabela
              </h2>
            </div>
            <p className='text-sm text-gray-500 mb-6'>
              Cada tabela já nasce com todos os produtos cadastrados,
              organizados por categoria. Escolha por onde começar:
            </p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {TABLE_PRESETS.map(preset => {
                const Icon = PRESET_ICONS[preset.id] || Store;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setModal({ open: true, preset: preset.id })}
                    className='text-left p-5 rounded-xl border border-gray-200 hover:border-primary hover:shadow-sm transition-all'
                  >
                    <span className='w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3'>
                      <Icon className='w-5 h-5' />
                    </span>
                    <span className='block text-sm font-semibold text-gray-900'>
                      {preset.title}
                    </span>
                    <span className='block text-xs text-gray-500 mt-1 leading-relaxed'>
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-xs text-gray-500'>
                Arraste pela alça (ou use as setas) para organizar as tabelas.
              </p>
              {archivedCount > 0 && (
                <label className='flex items-center gap-2 text-xs text-gray-600 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={showArchived}
                    onChange={e => setShowArchived(e.target.checked)}
                    className='rounded border-gray-300 text-primary focus:ring-primary/30'
                  />
                  Mostrar arquivadas ({archivedCount})
                </label>
              )}
            </div>

            {visible.length === 0 ? (
              <div className='bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500'>
                Todas as tabelas estão arquivadas. Marque “Mostrar arquivadas”
                para vê-las.
              </div>
            ) : (
              <DragDropContext
                onDragEnd={handleDragEnd}
                dragHandleUsageInstructions='Pressione Espaço para levantar. Use as setas para mover, Espaço para soltar e Esc para cancelar.'
              >
                <Droppable droppableId='price-tables'>
                  {provided => (
                    <ul ref={provided.innerRef} {...provided.droppableProps}>
                      {visible.map((table, index) => (
                        <TableCard
                          key={table._id}
                          table={table}
                          index={index}
                          total={visible.length}
                          sortable={!busy}
                          busy={busy}
                          onMove={moveByStep}
                          onDuplicate={duplicateTable}
                          onArchive={archiveTable}
                          onDelete={deleteTable}
                        />
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </>
        )}
      </div>

      <NewTableModal
        open={modal.open}
        initialPreset={modal.preset}
        catalog={catalog}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onCreate={createTable}
      />
    </div>
  );
};

export default PriceTables;
