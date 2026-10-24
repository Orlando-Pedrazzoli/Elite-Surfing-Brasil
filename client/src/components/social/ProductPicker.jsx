// client/src/components/social/ProductPicker.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🧺 SELETOR DE PRODUTOS DO ESTÚDIO INSTAGRAM
// ═══════════════════════════════════════════════════════════════════════
// Mostra o catálogo inteiro agrupado por família (um cartão por produto,
// variantes de cor/tamanho dentro do cartão), com filtros por coleção,
// busca, ocultar rascunhos / sem estoque e paginação "Mostrar mais".
//
// Props:
//   products     → lista crua de /api/social/sources (todas as variantes)
//   selectedIds  → ids selecionados (variantes individuais)
//   onToggle     → (id) => void
//   max          → limite de produtos por conteúdo
// ═══════════════════════════════════════════════════════════════════════
import React, { useMemo, useState, useEffect } from 'react';
import { Search, Check, X, Layers } from 'lucide-react';
import { groups as storeGroups } from '../../assets/assets';

const PAGE_SIZE = 24;

const GROUP_LABELS = Object.fromEntries(
  (storeGroups || []).filter(g => !g.isTagGroup).map(g => [g.id, g.name]),
);

const groupLabel = id => {
  if (!id) return 'Sem coleção';
  if (GROUP_LABELS[id]) return GROUP_LABELS[id];
  return id.charAt(0).toUpperCase() + id.slice(1);
};

const formatPrice = v =>
  `R$ ${Number(v || 0)
    .toFixed(2)
    .replace('.', ',')}`;

// Agrupa variantes em famílias. Produto sem família é família de 1.
const buildFamilies = products => {
  const map = new Map();
  for (const p of products) {
    const key = p.productFamily || `single:${p._id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.values()].map(variants => {
    const main = variants.find(v => v.isMainVariant) || variants[0];
    const published = variants.filter(v => v.inStock);
    const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
    return {
      key: main.productFamily || main._id,
      main,
      variants,
      group: main.group,
      category: main.category,
      published: published.length > 0,
      totalStock,
      // nome da família: nome da variante principal sem o sufixo de cor/tamanho
      name: stripVariantSuffix(main.name, main.color, main.size),
      searchText: variants
        .map(v => [v.name, v.sku, v.category, v.color, v.size].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase(),
    };
  });
};

const stripVariantSuffix = (name = '', color, size) => {
  let n = name;
  for (const suffix of [color, size]) {
    if (!suffix) continue;
    const re = new RegExp(`\\s*[-–|·]?\\s*${escapeRe(suffix)}\\s*$`, 'i');
    n = n.replace(re, '');
  }
  return n.trim() || name;
};

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ProductPicker = ({ products = [], selectedIds = [], onToggle, max = 5 }) => {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [hideDrafts, setHideDrafts] = useState(true);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const families = useMemo(() => buildFamilies(products), [products]);

  // Coleções presentes no catálogo, com contagem de famílias
  const groupChips = useMemo(() => {
    const counts = new Map();
    for (const f of families) {
      const k = f.group || '__none__';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: groupLabel(id === '__none__' ? null : id), count }))
      .sort((a, b) => b.count - a.count);
  }, [families]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return families.filter(f => {
      if (group !== 'all' && (f.group || '__none__') !== group) return false;
      if (hideDrafts && !f.published) return false;
      if (onlyInStock && f.totalStock <= 0) return false;
      if (q && !f.searchText.includes(q)) return false;
      return true;
    });
  }, [families, group, hideDrafts, onlyInStock, search]);

  // Volta à primeira página quando o filtro muda
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [search, group, hideDrafts, onlyInStock]);

  const visible = filtered.slice(0, limit);
  const selectedSet = new Set(selectedIds);
  const selectedProducts = selectedIds.map(id => products.find(p => p._id === id)).filter(Boolean);

  return (
    <div className='space-y-3'>
      {/* Busca + filtros */}
      <div className='flex flex-col md:flex-row gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Buscar por nome, SKU, categoria, cor ou tamanho...'
            className='w-full pl-10 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-primary outline-none'
          />
          {search && (
            <button
              type='button'
              onClick={() => setSearch('')}
              className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700'
              aria-label='Limpar busca'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
        <label className='flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap px-1'>
          <input
            type='checkbox'
            checked={hideDrafts}
            onChange={e => setHideDrafts(e.target.checked)}
            className='accent-pink-500'
          />
          Ocultar rascunhos
        </label>
        <label className='flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap px-1'>
          <input
            type='checkbox'
            checked={onlyInStock}
            onChange={e => setOnlyInStock(e.target.checked)}
            className='accent-pink-500'
          />
          Só com estoque
        </label>
      </div>

      {/* Coleções */}
      <div className='flex flex-wrap gap-1.5'>
        <Chip active={group === 'all'} onClick={() => setGroup('all')}>
          Todas <span className='opacity-60'>· {families.length}</span>
        </Chip>
        {groupChips.map(g => (
          <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
            {g.label} <span className='opacity-60'>· {g.count}</span>
          </Chip>
        ))}
      </div>

      {/* Selecionados */}
      {selectedProducts.length > 0 && (
        <div className='flex flex-wrap gap-1.5 p-2 bg-pink-50 border border-pink-100 rounded-lg'>
          {selectedProducts.map(p => (
            <span
              key={p._id}
              className='inline-flex items-center gap-1.5 bg-white border border-pink-200 rounded-full pl-1 pr-2 py-0.5 text-xs text-gray-800'
            >
              <img src={p.image?.[0]} alt='' className='w-5 h-5 rounded-full object-cover' />
              <span className='max-w-[180px] truncate'>
                {p.name}
                {p.color && !p.name.toLowerCase().includes(p.color.toLowerCase()) ? ` · ${p.color}` : ''}
                {p.size && !p.name.includes(p.size) ? ` · ${p.size}` : ''}
              </span>
              <button
                type='button'
                onClick={() => onToggle(p._id)}
                className='text-gray-400 hover:text-red-500'
                aria-label='Remover'
              >
                <X className='w-3 h-3' />
              </button>
            </span>
          ))}
          <span className='self-center text-[11px] text-pink-700 ml-1'>
            {selectedProducts.length}/{max}
          </span>
        </div>
      )}

      {/* Grelha */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto pr-1'>
        {visible.map(f => (
          <FamilyCard
            key={f.key}
            family={f}
            selectedSet={selectedSet}
            onToggle={onToggle}
          />
        ))}
        {visible.length === 0 && (
          <p className='col-span-full text-sm text-gray-400 py-8 text-center'>
            Nenhum produto com estes filtros
          </p>
        )}
      </div>

      {/* Rodapé: contagem + mostrar mais */}
      <div className='flex items-center justify-between text-xs text-gray-500'>
        <span>
          {visible.length} de {filtered.length} produto{filtered.length === 1 ? '' : 's'}
          {filtered.length !== families.length && (
            <span className='text-gray-400'> · {families.length} no catálogo</span>
          )}
        </span>
        {filtered.length > visible.length && (
          <button
            type='button'
            onClick={() => setLimit(l => l + PAGE_SIZE)}
            className='px-3 py-1.5 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-700'
          >
            Mostrar mais {Math.min(PAGE_SIZE, filtered.length - visible.length)}
          </button>
        )}
      </div>
    </div>
  );
};

const Chip = ({ active, onClick, children }) => (
  <button
    type='button'
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
      active
        ? 'bg-gray-900 text-white border-gray-900'
        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
    }`}
  >
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────
// Cartão de família: clique no cartão seleciona a variante principal;
// clique numa bolinha/badge seleciona essa variante específica.
// ─────────────────────────────────────────────────────────────────────
const FamilyCard = ({ family, selectedSet, onToggle }) => {
  const { main, variants, name, published, totalStock } = family;
  const selectedInFamily = variants.filter(v => selectedSet.has(v._id));
  const anySelected = selectedInFamily.length > 0;
  // imagem: da variante selecionada (se só uma) ou da principal
  const displayed = selectedInFamily.length === 1 ? selectedInFamily[0] : main;
  const hasVariants = variants.length > 1;
  const variantType = main.variantType || (main.size ? 'size' : 'color');

  return (
    <div
      className={`relative rounded-lg border-2 overflow-hidden transition-all bg-white ${
        anySelected ? 'border-pink-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <button
        type='button'
        onClick={() => onToggle(displayed._id)}
        className='w-full text-left'
        title={anySelected ? 'Remover' : 'Selecionar'}
      >
        <div className='aspect-square bg-white'>
          <img
            src={displayed.image?.[0]}
            alt={name}
            loading='lazy'
            className='w-full h-full object-contain p-1'
          />
        </div>
        <div className='p-2'>
          <p className='text-xs font-medium text-gray-900 line-clamp-2 leading-snug'>{name}</p>
          <p className='text-[11px] text-gray-500 mt-0.5'>
            {formatPrice(displayed.offerPrice)}
            <span className={`ml-1 ${totalStock === 0 ? 'text-red-500' : 'text-gray-400'}`}>
              · {totalStock} un
            </span>
          </p>
        </div>
      </button>

      {/* Variantes */}
      {hasVariants && (
        <div className='px-2 pb-2 flex flex-wrap items-center gap-1'>
          {variants.map(v => {
            const sel = selectedSet.has(v._id);
            const label = variantType === 'size' ? v.size || v.color || '?' : v.color || v.size || '?';
            return variantType === 'size' ? (
              <button
                key={v._id}
                type='button'
                onClick={() => onToggle(v._id)}
                title={`${label}${v.inStock ? '' : ' (rascunho)'} · ${v.stock ?? 0} un`}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  sel
                    ? 'bg-pink-500 border-pink-500 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-500'
                } ${!v.inStock ? 'opacity-50' : ''}`}
              >
                {label}
              </button>
            ) : (
              <button
                key={v._id}
                type='button'
                onClick={() => onToggle(v._id)}
                title={`${label}${v.inStock ? '' : ' (rascunho)'} · ${v.stock ?? 0} un`}
                className={`w-4 h-4 rounded-full border-2 ${
                  sel ? 'border-pink-500 ring-2 ring-pink-200' : 'border-white ring-1 ring-gray-300'
                } ${!v.inStock ? 'opacity-50' : ''}`}
                style={{
                  background: v.colorCode2
                    ? `linear-gradient(135deg, ${v.colorCode || '#ccc'} 50%, ${v.colorCode2} 50%)`
                    : v.colorCode || '#ccc',
                }}
              />
            );
          })}
          <span className='ml-auto inline-flex items-center gap-0.5 text-[10px] text-gray-400'>
            <Layers className='w-3 h-3' /> {variants.length}
          </span>
        </div>
      )}

      {anySelected && (
        <span className='absolute top-1.5 right-1.5 min-w-5 h-5 px-1 bg-pink-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold'>
          {selectedInFamily.length > 1 ? selectedInFamily.length : <Check className='w-3 h-3' />}
        </span>
      )}
      {!published && (
        <span className='absolute top-1.5 left-1.5 bg-gray-700 text-white text-[9px] font-bold px-1.5 rounded'>
          RASCUNHO
        </span>
      )}
    </div>
  );
};

export default ProductPicker;
