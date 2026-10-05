// client/src/components/priceTables/SectionList.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📋 EDITOR DE TABELA — seções e itens com drag and drop
// ═══════════════════════════════════════════════════════════════════════
// • Seções (categorias) e itens são arrastáveis pela alça. Itens podem
//   mudar de seção. A ordem na tela É a ordem da tabela exportada.
// • Cada ação de arrastar tem alternativa sem arrastar (menu ⋯ com
//   subir / descer / mover para seção) — funciona em toque e teclado.
// • % da seção e % / preço fixo do item são editados na própria linha.
// • Com busca ou filtro ativos o arrastar fica desligado (a lista mostrada
//   é parcial e a posição solta não corresponderia à real).
//
// Biblioteca: @hello-pangea/dnd. O estado só muda quando o item é solto
// (onDragEnd devolve origem e destino exatos); durante o arrasto a
// biblioteca só aplica `transform`, sem mexer na ordem do DOM — o React
// continua a ser a única fonte de verdade.
// Teclado: foco na alça → Espaço levanta, ↑/↓ movem dentro da seção,
// Espaço solta, Esc cancela. Para outra seção: menu ⋯ → "Mover para outra
// seção…".
// ═══════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  FolderInput,
  ArrowDownAZ,
  Hash,
  CircleDollarSign,
  Eraser,
  Trash2,
  ImageOff,
  X,
} from 'lucide-react';
import NumberField from './NumberField';
import {
  BASE_LABELS,
  EXCLUSION_LABELS,
  PCT_LIMITS,
  SOURCE_LABELS,
  formatBRL,
  formatPct,
} from '../../utils/priceTableEngine';
import { thumbUrl } from '../../utils/priceTableUtils';

const SECTIONS_DROPPABLE = 'pt-sections';
const TYPE_SECTION = 'SECTION';
const TYPE_ITEM = 'ITEM';

const MISSING_BASE_LABELS = {
  cost: 'Sem custo',
  wholesale: 'Sem preço de tabela',
  sale: 'Sem preço de venda',
};

// ─────────────────────────────────────────────────────────────────────
// Menu suspenso simples (fecha ao clicar fora ou com Esc)
// ─────────────────────────────────────────────────────────────────────
const PopMenu = ({ label, children, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    const onKey = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        aria-haspopup='menu'
        aria-expanded={open}
        className='p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
      >
        <MoreHorizontal className='w-4 h-4' />
      </button>
      {open && (
        <div
          role='menu'
          onClick={() => setOpen(false)}
          className={`absolute z-30 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-lg py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, children, onClick, disabled, danger }) => (
  <button
    type='button'
    role='menuitem'
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left disabled:opacity-40 disabled:cursor-not-allowed ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
    }`}
  >
    {Icon && <Icon className='w-4 h-4 flex-shrink-0 text-gray-400' />}
    <span className='flex-1'>{children}</span>
  </button>
);

const MenuDivider = () => <div className='my-1 border-t border-gray-100' />;

// ─────────────────────────────────────────────────────────────────────
// Linha de um produto
// ─────────────────────────────────────────────────────────────────────
const ItemRowBase = ({
  row,
  index,
  base,
  mode,
  inheritedPct,
  selected,
  isNew,
  dragDisabled,
  isFirst,
  isLast,
  actions,
}) => {
  const { productId, product, item } = row;
  const [imgError, setImgError] = useState(false);
  const hasFixed = row.source === 'fixed';
  const pctMin = mode === 'margin' ? 0 : PCT_LIMITS.min;
  const pctMax = mode === 'margin' ? PCT_LIMITS.marginMax : PCT_LIMITS.max;

  return (
    <Draggable
      draggableId={productId}
      index={index}
      isDragDisabled={dragDisabled}
    >
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-item-id={productId}
          className={`flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-2 px-3 py-2 border-t border-gray-100 ${
            snapshot.isDragging
              ? 'bg-white shadow-xl ring-1 ring-primary/40 rounded-lg'
              : row.excluded
                ? 'bg-gray-50'
                : 'bg-white'
          }`}
        >
          {/* Seleção + alça + imagem + nome */}
          <div className='flex items-center gap-2 flex-1 min-w-0 basis-full md:basis-auto'>
            <input
              type='checkbox'
              checked={selected}
              onChange={() => actions.toggleSelect(productId)}
              aria-label={`Selecionar ${product.name}`}
              className='rounded border-gray-300 text-primary focus:ring-primary/30 flex-shrink-0'
            />
            {/* A alça é um <span> (não <button>): a biblioteca ignora arrastos
                iniciados em elementos interativos. role, tabIndex e teclado
                vêm de dragHandleProps. */}
            <span
              {...provided.dragHandleProps}
              aria-label={`Arrastar ${product.name}`}
              aria-disabled={dragDisabled}
              className={`p-1 rounded flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                dragDisabled
                  ? 'text-gray-200 cursor-not-allowed'
                  : 'text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing'
              }`}
            >
              <GripVertical className='w-4 h-4' />
            </span>

            <div className='w-10 h-10 rounded-lg border border-gray-100 bg-white overflow-hidden flex items-center justify-center flex-shrink-0'>
              {product.image && !imgError ? (
                <img
                  src={thumbUrl(product.image, 96)}
                  alt=''
                  loading='lazy'
                  onError={() => setImgError(true)}
                  className={`w-full h-full object-contain ${row.excluded ? 'opacity-50' : ''}`}
                />
              ) : (
                <ImageOff className='w-4 h-4 text-gray-300' />
              )}
            </div>

            <div
              className={`min-w-0 flex-1 ${row.excluded ? 'opacity-60' : ''}`}
            >
              <p className='text-sm text-gray-900 leading-snug break-words'>
                {product.name}
              </p>
              <div className='flex flex-wrap items-center gap-1.5 mt-0.5'>
                <span className='text-[11px] text-gray-400 font-mono'>
                  {product.sku || 'sem código'}
                </span>
                {isNew && (
                  <span className='text-[10px] font-semibold px-1.5 py-px rounded bg-blue-50 text-blue-700'>
                    Novo
                  </span>
                )}
                {!product.inStock && (
                  <span className='text-[10px] font-semibold px-1.5 py-px rounded bg-gray-100 text-gray-500'>
                    Rascunho
                  </span>
                )}
                {product.inStock && product.stock <= 0 && (
                  <span className='text-[10px] font-semibold px-1.5 py-px rounded bg-orange-50 text-orange-700'>
                    Sem estoque
                  </span>
                )}
                {row.excluded && (
                  <span className='text-[10px] font-semibold px-1.5 py-px rounded bg-amber-50 text-amber-800'>
                    Fora da tabela: {EXCLUSION_LABELS[row.excluded]}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Base */}
          <div className='w-[78px] text-right flex-shrink-0'>
            <p className='text-[10px] uppercase tracking-wide text-gray-400 md:hidden'>
              {BASE_LABELS[base].split(' ')[0]}
            </p>
            <p className='text-sm text-gray-600'>
              {row.base !== null ? formatBRL(row.base) : '—'}
            </p>
            {base !== 'cost' && row.cost !== null && (
              <p className='text-[10px] text-gray-400'>
                custo {formatBRL(row.cost)}
              </p>
            )}
          </div>

          {/* % do item */}
          <NumberField
            className='w-[70px] flex-shrink-0'
            value={item.pct}
            onCommit={value => actions.changeItem(productId, { pct: value })}
            placeholder={formatPct(inheritedPct).replace('%', '')}
            suffix='%'
            min={pctMin}
            max={pctMax}
            disabled={hasFixed}
            highlight={item.pct !== null && !hasFixed}
            ariaLabel={`Porcentagem própria de ${product.name}`}
          />

          {/* Preço fixo */}
          <NumberField
            className='w-[96px] flex-shrink-0'
            value={item.fixedPrice}
            onCommit={value =>
              actions.changeItem(productId, { fixedPrice: value })
            }
            placeholder='fixo'
            prefix='R$'
            min={0}
            highlight={hasFixed}
            ariaLabel={`Preço fixo de ${product.name}`}
          />

          {/* Preço final */}
          <div className='w-[104px] text-right flex-shrink-0'>
            {row.price !== null ? (
              <>
                <p
                  className={`text-sm font-bold ${
                    row.belowCost ? 'text-red-600' : 'text-green-700'
                  }`}
                >
                  {formatBRL(row.price)}
                </p>
                <p className='text-[10px] text-gray-400 leading-tight'>
                  {row.belowCost
                    ? 'abaixo do custo'
                    : row.source !== 'table'
                      ? SOURCE_LABELS[row.source]
                      : row.marginPct !== null && row.marginPct > 0
                        ? `margem ${formatPct(row.marginPct)}`
                        : ' '}
                </p>
              </>
            ) : (
              <>
                <p className='text-xs font-semibold text-amber-700'>
                  {row.missing === 'invalid'
                    ? '% inválida'
                    : MISSING_BASE_LABELS[base]}
                </p>
                <p className='text-[10px] text-gray-400 leading-tight'>
                  complete o cadastro ou use fixo
                </p>
              </>
            )}
          </div>

          {/* Ações */}
          <div className='flex items-center flex-shrink-0'>
            <button
              type='button'
              onClick={() =>
                actions.changeItem(productId, { hidden: !item.hidden })
              }
              aria-label={
                item.hidden
                  ? `Mostrar ${product.name} na tabela`
                  : `Ocultar ${product.name} da tabela`
              }
              aria-pressed={item.hidden}
              title={
                item.hidden
                  ? 'Oculto — clique para mostrar'
                  : 'Ocultar da tabela'
              }
              className={`p-1.5 rounded-lg hover:bg-gray-100 ${
                item.hidden
                  ? 'text-amber-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {item.hidden ? (
                <EyeOff className='w-4 h-4' />
              ) : (
                <Eye className='w-4 h-4' />
              )}
            </button>
            <PopMenu label={`Mais ações para ${product.name}`}>
              <MenuItem
                icon={ArrowUp}
                disabled={isFirst || dragDisabled}
                onClick={() => actions.moveItem(productId, 'up')}
              >
                Subir uma posição
              </MenuItem>
              <MenuItem
                icon={ArrowDown}
                disabled={isLast || dragDisabled}
                onClick={() => actions.moveItem(productId, 'down')}
              >
                Descer uma posição
              </MenuItem>
              <MenuItem
                icon={ArrowUpToLine}
                disabled={isFirst || dragDisabled}
                onClick={() => actions.moveItem(productId, 'top')}
              >
                Mover para o topo da seção
              </MenuItem>
              <MenuItem
                icon={ArrowDownToLine}
                disabled={isLast || dragDisabled}
                onClick={() => actions.moveItem(productId, 'bottom')}
              >
                Mover para o fim da seção
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={FolderInput}
                onClick={() => actions.requestMoveToSection([productId])}
              >
                Mover para outra seção…
              </MenuItem>
              <MenuItem
                icon={Eraser}
                disabled={item.pct === null && item.fixedPrice === null}
                onClick={() =>
                  actions.changeItem(productId, { pct: null, fixedPrice: null })
                }
              >
                Voltar ao preço calculado
              </MenuItem>
            </PopMenu>
          </div>
        </li>
      )}
    </Draggable>
  );
};

const ItemRow = memo(
  ItemRowBase,
  (prev, next) =>
    prev.row.item === next.row.item &&
    prev.row.product === next.row.product &&
    prev.row.priceCents === next.row.priceCents &&
    prev.row.source === next.row.source &&
    prev.row.excluded === next.row.excluded &&
    prev.row.belowCost === next.row.belowCost &&
    prev.row.missing === next.row.missing &&
    prev.index === next.index &&
    prev.base === next.base &&
    prev.mode === next.mode &&
    prev.inheritedPct === next.inheritedPct &&
    prev.selected === next.selected &&
    prev.isNew === next.isNew &&
    prev.dragDisabled === next.dragDisabled &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.actions === next.actions,
);

// ─────────────────────────────────────────────────────────────────────
// Seção (categoria)
// ─────────────────────────────────────────────────────────────────────
const SectionBlock = ({
  section,
  rows,
  totalRows,
  index,
  sectionCount,
  table,
  collapsed,
  dragDisabled,
  filtered,
  selection,
  newIds,
  actions,
}) => {
  const [title, setTitle] = useState(section.title);
  useEffect(() => setTitle(section.title), [section.title]);

  const commitTitle = () => {
    const clean = title.trim();
    if (!clean) return setTitle(section.title);
    if (clean !== section.title)
      actions.changeSection(section.key, { title: clean });
  };

  const inheritedPct = section.pct ?? table.defaultPct ?? 0;
  const visibleCount = rows.filter(r => !r.excluded).length;
  const pctMin = table.mode === 'margin' ? 0 : PCT_LIMITS.min;
  const pctMax =
    table.mode === 'margin' ? PCT_LIMITS.marginMax : PCT_LIMITS.max;
  const allSelected =
    rows.length > 0 && rows.every(r => selection.has(r.productId));

  return (
    <Draggable
      draggableId={section.key}
      index={index}
      isDragDisabled={dragDisabled}
    >
      {(provided, snapshot) => (
        <section
          ref={provided.innerRef}
          {...provided.draggableProps}
          data-section-key={section.key}
          className={`mb-4 bg-white rounded-xl border ${
            snapshot.isDragging ? 'border-primary shadow-xl' : 'border-gray-200'
          }`}
        >
          {/* A seção inteira (cabeçalho + itens) é a área de soltar: dá para
              largar um item em cima do título, mesmo com a seção recolhida
              ou vazia. */}
          <Droppable droppableId={section.key} type={TYPE_ITEM}>
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`rounded-xl ${
                  dropSnapshot.isDraggingOver
                    ? 'ring-2 ring-primary/40 bg-primary/[0.03]'
                    : ''
                }`}
              >
                {/* Cabeçalho da seção */}
                <header className='flex flex-wrap items-center gap-2 px-3 py-2.5 bg-primary/[0.04] rounded-t-xl'>
                  <input
                    type='checkbox'
                    checked={allSelected}
                    disabled={rows.length === 0}
                    onChange={() =>
                      actions.selectMany(
                        rows.map(r => r.productId),
                        !allSelected,
                      )
                    }
                    aria-label={`Selecionar todos os itens de ${section.title}`}
                    className='rounded border-gray-300 text-primary focus:ring-primary/30 flex-shrink-0'
                  />
                  <span
                    {...provided.dragHandleProps}
                    aria-label={`Arrastar a seção ${section.title}`}
                    aria-disabled={dragDisabled}
                    className={`p-1 rounded flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      dragDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <GripVertical className='w-4 h-4' />
                  </span>
                  <button
                    type='button'
                    onClick={() => actions.toggleCollapse(section.key)}
                    aria-expanded={!collapsed}
                    aria-label={
                      collapsed
                        ? `Expandir ${section.title}`
                        : `Recolher ${section.title}`
                    }
                    className='p-1 text-gray-500 hover:text-gray-800 flex-shrink-0'
                  >
                    {collapsed ? (
                      <ChevronRight className='w-4 h-4' />
                    ) : (
                      <ChevronDown className='w-4 h-4' />
                    )}
                  </button>

                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setTitle(section.title);
                    }}
                    maxLength={80}
                    aria-label='Título da seção'
                    className='flex-1 min-w-[140px] bg-transparent text-sm font-bold text-primary uppercase tracking-wide px-1.5 py-1 rounded-md border border-transparent hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none'
                  />

                  <span className='text-xs text-gray-500 flex-shrink-0'>
                    {filtered
                      ? `${rows.length} de ${totalRows}`
                      : visibleCount === totalRows
                        ? `${totalRows} ${totalRows === 1 ? 'item' : 'itens'}`
                        : `${visibleCount} de ${totalRows} na tabela`}
                  </span>

                  <div className='flex items-center gap-1.5 flex-shrink-0'>
                    <label
                      htmlFor={`pct-${section.key}`}
                      className='text-[11px] font-medium text-gray-500'
                    >
                      % da seção
                    </label>
                    <NumberField
                      id={`pct-${section.key}`}
                      className='w-[76px]'
                      value={section.pct}
                      onCommit={value =>
                        actions.changeSection(section.key, { pct: value })
                      }
                      placeholder={formatPct(table.defaultPct ?? 0).replace(
                        '%',
                        '',
                      )}
                      suffix='%'
                      min={pctMin}
                      max={pctMax}
                      highlight={section.pct !== null}
                    />
                  </div>

                  <PopMenu label={`Ações da seção ${section.title}`}>
                    <MenuItem
                      icon={ArrowDownAZ}
                      disabled={totalRows < 2}
                      onClick={() => actions.sortSection(section.key, 'name')}
                    >
                      Ordenar itens por nome
                    </MenuItem>
                    <MenuItem
                      icon={Hash}
                      disabled={totalRows < 2}
                      onClick={() => actions.sortSection(section.key, 'sku')}
                    >
                      Ordenar itens por código
                    </MenuItem>
                    <MenuItem
                      icon={CircleDollarSign}
                      disabled={totalRows < 2}
                      onClick={() => actions.sortSection(section.key, 'price')}
                    >
                      Ordenar itens por preço
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem
                      icon={ArrowUp}
                      disabled={index === 0}
                      onClick={() => actions.moveSection(section.key, -1)}
                    >
                      Mover seção para cima
                    </MenuItem>
                    <MenuItem
                      icon={ArrowDown}
                      disabled={index === sectionCount - 1}
                      onClick={() => actions.moveSection(section.key, 1)}
                    >
                      Mover seção para baixo
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem
                      icon={Eraser}
                      onClick={() => actions.clearSectionOverrides(section.key)}
                    >
                      Limpar % e preços fixos da seção
                    </MenuItem>
                    <MenuItem
                      icon={Trash2}
                      danger
                      disabled={totalRows > 0}
                      onClick={() => actions.deleteSection(section.key)}
                    >
                      {totalRows > 0
                        ? 'Apagar (só seção vazia)'
                        : 'Apagar seção'}
                    </MenuItem>
                  </PopMenu>
                </header>

                <ul
                  className={
                    collapsed || rows.length === 0 ? 'min-h-[6px]' : undefined
                  }
                >
                  {!collapsed &&
                    rows.map((row, rowIndex) => (
                      <ItemRow
                        key={row.productId}
                        row={row}
                        index={rowIndex}
                        base={table.base}
                        mode={table.mode}
                        inheritedPct={inheritedPct}
                        selected={selection.has(row.productId)}
                        isNew={newIds.has(row.productId)}
                        dragDisabled={dragDisabled}
                        isFirst={rowIndex === 0}
                        isLast={rowIndex === rows.length - 1}
                        actions={actions}
                      />
                    ))}
                  {dropProvided.placeholder}
                  {!collapsed &&
                    rows.length === 0 &&
                    !dropSnapshot.isDraggingOver && (
                      <li className='px-4 py-5 text-xs text-gray-400 border-t border-gray-100 text-center list-none'>
                        {filtered
                          ? 'Nenhum item desta seção corresponde ao filtro.'
                          : 'Seção vazia. Arraste itens para cá ou use “Mover para outra seção…”.'}
                      </li>
                    )}
                </ul>
              </div>
            )}
          </Droppable>
        </section>
      )}
    </Draggable>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Diálogo "Mover para outra seção"
// ─────────────────────────────────────────────────────────────────────
export const MoveToSectionDialog = ({
  open,
  count,
  sections,
  onPick,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'
      onClick={onClose}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Mover para outra seção'
        onClick={e => e.stopPropagation()}
        className='bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col'
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
          <h2 className='text-base font-bold text-gray-900'>
            Mover {count} {count === 1 ? 'item' : 'itens'} para…
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
        <ul className='overflow-y-auto py-2'>
          {sections.map(section => (
            <li key={section.key}>
              <button
                type='button'
                onClick={() => onPick(section.key)}
                className='w-full flex items-center justify-between gap-3 px-5 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50'
              >
                <span className='font-medium uppercase tracking-wide text-xs'>
                  {section.title}
                </span>
                <span className='text-xs text-gray-400'>
                  {section.items.length}{' '}
                  {section.items.length === 1 ? 'item' : 'itens'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Lista de seções (contexto do drag and drop)
// ─────────────────────────────────────────────────────────────────────

/** Move um elemento dentro de um array (devolve um array novo). */
const reorder = (list, from, to) => {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const SectionList = ({
  table,
  computed,
  rowFilter, // (row) => boolean, ou null quando não há filtro
  collapsedKeys,
  selection,
  newIds,
  actions,
  onSectionsChange, // (updater: sections => sections) => void
}) => {
  const filtered = !!rowFilter;

  const sectionTitle = key =>
    table.sections.find(s => s.key === key)?.title || 'seção';

  const handleDragEnd = (result, provided) => {
    const { source, destination, type, draggableId } = result;

    if (!destination) {
      provided.announce(
        'Movimento cancelado. O item voltou à posição original.',
      );
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      provided.announce('O item ficou na mesma posição.');
      return;
    }

    if (type === TYPE_SECTION) {
      onSectionsChange(sections =>
        reorder(sections, source.index, destination.index),
      );
      provided.announce(
        `Seção movida para a posição ${destination.index + 1}.`,
      );
      return;
    }

    // Soltar numa seção recolhida: o item entra no fim dela
    const toCollapsed = collapsedKeys.has(destination.droppableId);

    onSectionsChange(sections => {
      const from = sections.find(s => s.key === source.droppableId);
      const to = sections.find(s => s.key === destination.droppableId);
      if (!from || !to) return sections;
      const item = from.items.find(i => String(i.product) === draggableId);
      if (!item) return sections;

      if (from === to) {
        const fromIndex = from.items.indexOf(item);
        const toIndex = toCollapsed ? from.items.length - 1 : destination.index;
        if (fromIndex === toIndex) return sections;
        const items = reorder(from.items, fromIndex, toIndex);
        return sections.map(s => (s === from ? { ...s, items } : s));
      }

      const fromItems = from.items.filter(i => i !== item);
      const toItems = [...to.items];
      toItems.splice(
        toCollapsed
          ? toItems.length
          : Math.min(destination.index, toItems.length),
        0,
        item,
      );
      return sections.map(s =>
        s === from
          ? { ...s, items: fromItems }
          : s === to
            ? { ...s, items: toItems }
            : s,
      );
    });

    provided.announce(
      source.droppableId === destination.droppableId
        ? `Item movido para a posição ${destination.index + 1}.`
        : `Item movido para a seção ${sectionTitle(destination.droppableId)}.`,
    );
  };

  return (
    <DragDropContext
      onDragStart={(start, provided) =>
        provided.announce(
          start.type === TYPE_SECTION
            ? 'Seção levantada. Use as setas para mover, Espaço para soltar, Esc para cancelar.'
            : 'Item levantado. Use as setas para mover, Espaço para soltar, Esc para cancelar.',
        )
      }
      onDragUpdate={(update, provided) => {
        if (!update.destination)
          return provided.announce('Fora de uma área de soltar.');
        return provided.announce(
          update.type === TYPE_SECTION
            ? `Posição ${update.destination.index + 1}.`
            : `Posição ${update.destination.index + 1} em ${sectionTitle(update.destination.droppableId)}.`,
        );
      }}
      onDragEnd={handleDragEnd}
      dragHandleUsageInstructions='Pressione Espaço para levantar. Use as setas para mover, Espaço para soltar e Esc para cancelar.'
    >
      <Droppable droppableId={SECTIONS_DROPPABLE} type={TYPE_SECTION}>
        {listProvided => (
          <div ref={listProvided.innerRef} {...listProvided.droppableProps}>
            {computed.sections.map((computedSection, index) => {
              const section = table.sections[index];
              if (!section) return null;
              const rows = rowFilter
                ? computedSection.rows.filter(rowFilter)
                : computedSection.rows;
              return (
                <div
                  key={section.key}
                  // Com filtro ativo, seções sem resultado somem da vista (continuam
                  // montadas para os índices do drag and drop ficarem contínuos)
                  className={
                    filtered && rows.length === 0 ? 'hidden' : undefined
                  }
                >
                  <SectionBlock
                    section={section}
                    rows={rows}
                    totalRows={computedSection.rows.length}
                    index={index}
                    sectionCount={table.sections.length}
                    table={table}
                    collapsed={!filtered && collapsedKeys.has(section.key)}
                    dragDisabled={filtered}
                    filtered={filtered}
                    selection={selection}
                    newIds={newIds}
                    actions={actions}
                  />
                </div>
              );
            })}
            {listProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default SectionList;
