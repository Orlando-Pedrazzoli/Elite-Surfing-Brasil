// client/src/components/SearchBar.jsx
// ═══════════════════════════════════════════════════════════════
// Busca da navbar com autocomplete (nome + imagem do produto).
//
// Padrões seguidos (Amazon, Nike, Mercado Livre, Netshoes):
//  • resultados instantâneos ao escrever (debounce curto, sem pedidos
//    extra ao servidor: o catálogo já está no AppContext)
//  • ignora acentos/maiúsculas e aceita sinónimos ("cordinha" → leash)
//  • cada resultado mostra imagem, nome realçado, categoria e preço
//  • sugestões de coleções antes dos produtos
//  • buscas recentes e buscas populares com o campo vazio
//  • navegação por teclado (↑ ↓ Enter Esc) e ARIA combobox
//  • Enter ou "Ver todos" → /products?q=termo (URL partilhável)
//  • desktop: ícone que expande num campo + dropdown
//  • mobile: ecrã inteiro com teclado aberto de imediato
// ═══════════════════════════════════════════════════════════════

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowUpLeft,
  ChevronRight,
  PackageX,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatBRL } from '../utils/installmentUtils';
import {
  searchProducts,
  searchCollections,
  highlightParts,
  searchThumbnail,
  productUrl,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  POPULAR_SEARCHES,
  MIN_QUERY_LENGTH,
  SUGGESTION_LIMIT,
} from '../utils/productSearch';

const DEBOUNCE_MS = 120;

// ───────────────────────────────────────────────────────────────
// Texto com o termo realçado
// ───────────────────────────────────────────────────────────────
const Highlight = ({ text, query }) => (
  <>
    {highlightParts(text, query).map((part, i) =>
      part.match ? (
        <mark key={i} className='bg-transparent text-primary font-semibold'>
          {part.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

// ───────────────────────────────────────────────────────────────
// Hook com toda a lógica (partilhado entre desktop e mobile)
// ───────────────────────────────────────────────────────────────
const useProductSearch = ({ onClose }) => {
  const { products, fetchProducts, setSearchQuery, navigate } = useAppContext();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState([]);

  useEffect(() => {
    setRecents(getRecentSearches());
    if (!products || products.length === 0) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = debounced.trim().length >= MIN_QUERY_LENGTH;

  const allMatches = useMemo(
    () => (hasQuery ? searchProducts(products, debounced) : []),
    [products, debounced, hasQuery],
  );
  const productResults = allMatches.slice(0, SUGGESTION_LIMIT);
  const collectionResults = useMemo(
    () => (hasQuery ? searchCollections(debounced, 3) : []),
    [debounced, hasQuery],
  );
  const totalCount = allMatches.length;

  // Lista plana para a navegação por teclado
  const items = useMemo(() => {
    if (hasQuery) {
      const list = [
        ...collectionResults.map(c => ({ type: 'collection', data: c })),
        ...productResults.map(p => ({ type: 'product', data: p })),
      ];
      if (totalCount > 0) list.push({ type: 'all', data: debounced.trim() });
      return list;
    }
    return [
      ...recents.map(t => ({ type: 'recent', data: t })),
      ...POPULAR_SEARCHES.map(t => ({ type: 'popular', data: t })),
    ];
  }, [
    hasQuery,
    collectionResults,
    productResults,
    totalCount,
    debounced,
    recents,
  ]);

  useEffect(() => setActiveIndex(-1), [items.length, debounced]);

  const submit = useCallback(
    term => {
      const clean = String(term ?? query).trim();
      if (clean.length < MIN_QUERY_LENGTH) return;
      addRecentSearch(clean);
      setSearchQuery(clean);
      onClose?.();
      navigate(`/products?q=${encodeURIComponent(clean)}`);
    },
    [query, setSearchQuery, navigate, onClose],
  );

  const go = useCallback(
    path => {
      if (query.trim().length >= MIN_QUERY_LENGTH)
        addRecentSearch(query.trim());
      onClose?.();
      navigate(path);
      window.scrollTo(0, 0);
    },
    [query, navigate, onClose],
  );

  const selectItem = useCallback(
    item => {
      if (!item) return;
      if (item.type === 'product') go(productUrl(item.data));
      else if (item.type === 'collection') go(item.data.path);
      else if (item.type === 'all') submit(item.data);
      else submit(item.data); // recent / popular
    },
    [go, submit],
  );

  const onKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (items.length ? (i + 1) % items.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i =>
        items.length ? (i - 1 + items.length) % items.length : -1,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex])
        selectItem(items[activeIndex]);
      else submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  const clearRecents = () => {
    clearRecentSearches();
    setRecents([]);
  };

  return {
    query,
    setQuery,
    debounced,
    hasQuery,
    items,
    activeIndex,
    setActiveIndex,
    productResults,
    collectionResults,
    totalCount,
    recents,
    clearRecents,
    submit,
    selectItem,
    onKeyDown,
    productsLoaded: Array.isArray(products) && products.length > 0,
  };
};

// ───────────────────────────────────────────────────────────────
// Painel de resultados (igual em desktop e mobile)
// ───────────────────────────────────────────────────────────────
const SearchResults = ({ search, listboxId, compact = false }) => {
  const {
    debounced,
    hasQuery,
    items,
    activeIndex,
    setActiveIndex,
    totalCount,
    recents,
    clearRecents,
    selectItem,
    productsLoaded,
  } = search;

  const rowClass = (index, extra = '') =>
    `flex items-center gap-3 w-full text-left transition-colors ${
      activeIndex === index ? 'bg-primary/5' : 'hover:bg-gray-50'
    } ${extra}`;

  // Campo vazio: recentes + populares
  if (!hasQuery) {
    let index = -1;
    return (
      <div id={listboxId} role='listbox' className='py-2'>
        {recents.length > 0 && (
          <div className='pb-2'>
            <div className='flex items-center justify-between px-4 py-1.5'>
              <span className='text-[11px] font-semibold tracking-wider uppercase text-gray-400'>
                Buscas recentes
              </span>
              <button
                type='button'
                onMouseDown={e => e.preventDefault()}
                onClick={clearRecents}
                className='text-[11px] text-gray-400 hover:text-primary transition-colors'
              >
                Limpar
              </button>
            </div>
            {recents.map(term => {
              index += 1;
              const i = index;
              return (
                <button
                  key={`r-${term}`}
                  type='button'
                  id={`${listboxId}-opt-${i}`}
                  role='option'
                  aria-selected={activeIndex === i}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectItem(items[i])}
                  className={rowClass(i, 'px-4 py-2.5 text-sm text-gray-700')}
                >
                  <Clock className='w-4 h-4 text-gray-400 flex-shrink-0' />
                  <span className='flex-1 truncate'>{term}</span>
                  <ArrowUpLeft className='w-4 h-4 text-gray-300 flex-shrink-0' />
                </button>
              );
            })}
          </div>
        )}
        <div>
          <div className='px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-400'>
            Mais buscados
          </div>
          <div className='flex flex-wrap gap-2 px-4 py-2'>
            {POPULAR_SEARCHES.map(term => {
              index += 1;
              const i = index;
              return (
                <button
                  key={`p-${term}`}
                  type='button'
                  id={`${listboxId}-opt-${i}`}
                  role='option'
                  aria-selected={activeIndex === i}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => selectItem(items[i])}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    activeIndex === i
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                  }`}
                >
                  <TrendingUp className='w-3.5 h-3.5' />
                  {term}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Com termo mas catálogo ainda a carregar
  if (!productsLoaded) {
    return (
      <div
        id={listboxId}
        role='listbox'
        className='px-4 py-6 text-sm text-gray-500'
      >
        Carregando produtos…
      </div>
    );
  }

  // Sem resultados
  if (items.length === 0) {
    return (
      <div id={listboxId} role='listbox' className='px-4 py-8 text-center'>
        <PackageX className='w-8 h-8 text-gray-300 mx-auto mb-2' />
        <p className='text-sm font-medium text-gray-700'>
          Nenhum produto para “{debounced.trim()}”
        </p>
        <p className='text-xs text-gray-500 mt-1'>
          Confira a ortografia ou tente um termo mais curto, como “deck” ou
          “leash”.
        </p>
      </div>
    );
  }

  return (
    <div id={listboxId} role='listbox' className='py-1'>
      {items.map((item, i) => {
        if (item.type === 'collection') {
          const c = item.data;
          return (
            <Link
              key={`c-${c.path}`}
              to={c.path}
              id={`${listboxId}-opt-${i}`}
              role='option'
              aria-selected={activeIndex === i}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={e => {
                e.preventDefault();
                selectItem(item);
              }}
              className={rowClass(i, 'px-4 py-2.5')}
            >
              <span className='w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden'>
                {c.image ? (
                  <img
                    src={c.image}
                    alt=''
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <Search className='w-4 h-4 text-gray-400' />
                )}
              </span>
              <span className='flex-1 min-w-0'>
                <span className='block text-sm text-gray-800 truncate'>
                  <Highlight text={c.label} query={debounced} />
                </span>
                <span className='block text-[11px] text-gray-400'>
                  {c.kind === 'group'
                    ? 'Coleção'
                    : `Categoria${c.groupLabel ? ` · ${c.groupLabel}` : ''}`}
                </span>
              </span>
              <ChevronRight className='w-4 h-4 text-gray-300 flex-shrink-0' />
            </Link>
          );
        }

        if (item.type === 'product') {
          const p = item.data;
          const available = p.inStock && p.stock > 0;
          const hasDiscount = p.price > p.offerPrice;
          const catLabel = String(p.category || '').replace(/-/g, ' ');
          return (
            <Link
              key={`p-${p._id}`}
              to={productUrl(p)}
              id={`${listboxId}-opt-${i}`}
              role='option'
              aria-selected={activeIndex === i}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={e => {
                e.preventDefault();
                selectItem(item);
              }}
              className={rowClass(i, `px-4 ${compact ? 'py-2' : 'py-2.5'}`)}
            >
              <span className='w-14 h-14 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden'>
                <img
                  src={searchThumbnail(p.image?.[0], 112)}
                  alt={p.name}
                  loading='lazy'
                  width={56}
                  height={56}
                  className={`w-full h-full object-contain p-1 ${available ? '' : 'opacity-50 grayscale'}`}
                />
              </span>
              <span className='flex-1 min-w-0'>
                <span className='block text-sm text-gray-800 leading-snug line-clamp-2'>
                  <Highlight text={p.name} query={debounced} />
                </span>
                <span className='block text-[11px] text-gray-400 capitalize truncate mt-0.5'>
                  {catLabel}
                  {p.color ? ` · ${p.color}` : ''}
                </span>
              </span>
              <span className='text-right flex-shrink-0'>
                {available ? (
                  <>
                    {hasDiscount && (
                      <span className='block text-[11px] text-gray-400 line-through'>
                        {formatBRL(p.price)}
                      </span>
                    )}
                    <span className='block text-sm font-semibold text-gray-900'>
                      {formatBRL(p.offerPrice)}
                    </span>
                  </>
                ) : (
                  <span className='text-[11px] font-medium text-gray-400'>
                    Esgotado
                  </span>
                )}
              </span>
            </Link>
          );
        }

        if (item.type === 'all') {
          return (
            <button
              key='all'
              type='button'
              id={`${listboxId}-opt-${i}`}
              role='option'
              aria-selected={activeIndex === i}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectItem(item)}
              className={rowClass(
                i,
                'px-4 py-3 mt-1 border-t border-gray-100 text-sm font-semibold text-primary justify-center',
              )}
            >
              Ver todos os {totalCount} resultado{totalCount === 1 ? '' : 's'}
              <ChevronRight className='w-4 h-4' />
            </button>
          );
        }
        return null;
      })}
    </div>
  );
};

// ───────────────────────────────────────────────────────────────
// Campo de texto (partilhado)
// ───────────────────────────────────────────────────────────────
const SearchInput = React.forwardRef(
  (
    { search, listboxId, autoFocus, onClear, className = '', inputClass = '' },
    ref,
  ) => {
    const { query, setQuery, onKeyDown, activeIndex, items, hasQuery } = search;
    const activeId =
      activeIndex >= 0 && items[activeIndex]
        ? `${listboxId}-opt-${activeIndex}`
        : undefined;
    return (
      <div className={`relative flex items-center ${className}`}>
        <Search className='absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none' />
        <input
          ref={ref}
          type='search'
          role='combobox'
          aria-expanded='true'
          aria-controls={listboxId}
          aria-autocomplete='list'
          aria-activedescendant={activeId}
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          enterKeyHint='search'
          autoFocus={autoFocus}
          placeholder='Buscar decks, leashes, capas…'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className={`w-full pl-10 pr-9 text-sm text-gray-800 placeholder:text-gray-400 outline-none appearance-none [&::-webkit-search-cancel-button]:hidden ${inputClass}`}
        />
        {(query.length > 0 || hasQuery) && (
          <button
            type='button'
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              setQuery('');
              onClear?.();
            }}
            aria-label='Limpar busca'
            className='absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

// ═══════════════════════════════════════════════════════════════
// DESKTOP: ícone → campo expandido + dropdown
// ═══════════════════════════════════════════════════════════════
export const DesktopSearch = ({ isTransparent }) => {
  const [openState, setOpenState] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = `search-listbox-${useId().replace(/[:]/g, '')}`;

  const close = useCallback(() => setOpenState(false), []);
  const search = useProductSearch({ onClose: close });

  // Fecha ao clicar fora
  useEffect(() => {
    if (!openState) return undefined;
    const onDown = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openState, close]);

  // Atalho "/" abre a busca (como no GitHub/YouTube)
  useEffect(() => {
    const onKey = e => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        tag !== 'input' &&
        tag !== 'textarea' &&
        !e.target?.isContentEditable
      ) {
        e.preventDefault();
        setOpenState(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (openState) inputRef.current?.focus();
  }, [openState]);

  if (!openState) {
    return (
      <button
        type='button'
        onClick={() => setOpenState(true)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isTransparent ? 'hover:bg-white/10' : 'hover:bg-gray-100'
        }`}
        title='Buscar produtos (atalho: /)'
        aria-label='Buscar produtos'
      >
        <Search
          className={`w-5 h-5 transition-colors ${
            isTransparent ? 'text-white' : 'text-gray-600 hover:text-primary'
          }`}
        />
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className='relative'>
      <form
        onSubmit={e => {
          e.preventDefault();
          search.submit();
        }}
        role='search'
      >
        <SearchInput
          ref={inputRef}
          search={search}
          listboxId={listboxId}
          onClear={() => inputRef.current?.focus()}
          className='w-72 xl:w-80 animate-[searchIn_.18s_ease-out]'
          inputClass='h-10 rounded-full bg-white border border-gray-200 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition'
        />
      </form>

      <div className='absolute right-0 top-full mt-2 w-[26rem] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[70] max-h-[70vh] overflow-y-auto'>
        <SearchResults search={search} listboxId={listboxId} />
      </div>

      <style>{`@keyframes searchIn{from{opacity:0;transform:scaleX(.85);transform-origin:right}to{opacity:1;transform:scaleX(1)}}`}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MOBILE: ícone na barra → overlay a ecrã inteiro
// ═══════════════════════════════════════════════════════════════
export const MobileSearch = ({ isTransparent, open, onOpen, onClose }) => {
  const listboxId = `search-listbox-m-${useId().replace(/[:]/g, '')}`;
  const inputRef = useRef(null);

  const close = useCallback(() => onClose?.(), [onClose]);
  const search = useProductSearch({ onClose: close });

  // Bloqueia o scroll do fundo enquanto o overlay está aberto
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // foco com pequeno atraso para o iOS abrir o teclado
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  return (
    <>
      <button
        type='button'
        onClick={onOpen}
        aria-label='Buscar produtos'
        className='p-1'
      >
        <Search
          className={`w-6 h-6 transition-colors ${isTransparent ? 'text-white' : 'text-gray-700'}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          className='fixed inset-0 z-[80] bg-white flex flex-col lg:hidden'
          role='dialog'
          aria-modal='true'
          aria-label='Buscar produtos'
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              search.submit();
            }}
            role='search'
            className='flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white'
            style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
          >
            <SearchInput
              ref={inputRef}
              search={search}
              listboxId={listboxId}
              autoFocus
              className='flex-1'
              inputClass='h-11 rounded-full bg-gray-100 border border-transparent focus:bg-white focus:border-primary transition'
            />
            <button
              type='button'
              onClick={close}
              className='px-2 py-2 text-sm font-medium text-gray-700'
            >
              Cancelar
            </button>
          </form>

          <div className='flex-1 overflow-y-auto overscroll-contain'>
            <SearchResults search={search} listboxId={listboxId} />
          </div>
        </div>
      )}
    </>
  );
};

export default DesktopSearch;
