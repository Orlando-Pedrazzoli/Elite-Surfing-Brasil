import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, SlidersHorizontal, LayoutGrid, Rows3, X, Truck, Package } from 'lucide-react';
import { getGroupBySlug, getFiltersByGroup, filterDefinitions, filterProductsByFilters, getFilterLabel } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { SEO, getCollectionSEO, BreadcrumbSchema, OrganizationSchema, CollectionSchema } from '../components/seo';

// ═══════════════════════════════════════════════════════════════
// 🆕 Componente Accordion de Filtro Individual
// ═══════════════════════════════════════════════════════════════
const FilterAccordion = ({ filterDef, activeValues, onToggleValue, productCounts, isMobile = false }) => {
  const [isOpen, setIsOpen] = useState(true);
  const selectedCount = activeValues.length;

  return (
    <div className='border-b border-gray-200 last:border-b-0'>
      {/* Header do Accordion */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between py-3 text-left group'
      >
        <span className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold text-gray-800 group-hover:text-primary transition-colors`}>
          {filterDef.label}
          {selectedCount > 0 && (
            <span className='ml-2 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full'>
              {selectedCount}
            </span>
          )}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Opções */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='overflow-hidden'
          >
            <div className='pb-3 flex flex-col gap-1.5'>
              {filterDef.options.map((option) => {
                const isSelected = activeValues.includes(option.value);
                const count = productCounts[option.value] ?? 0;

                return (
                  <label
                    key={option.value}
                    className={`flex items-center cursor-pointer py-1 px-1 rounded-md transition-colors duration-150 ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type='checkbox'
                      checked={isSelected}
                      onChange={() => onToggleValue(filterDef.key, option.value)}
                      className={`form-checkbox ${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-primary rounded border-gray-300 focus:ring-primary transition-colors duration-150`}
                    />
                    <span className={`ml-2.5 ${isMobile ? 'text-base' : 'text-sm'} ${
                      isSelected ? 'font-medium text-primary' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                    <span className='ml-auto text-xs text-gray-400'>
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🆕 Componente de Filtros Globais (Frete Grátis, Disponibilidade, Preço)
// ═══════════════════════════════════════════════════════════════
const GlobalFiltersPanel = ({ globalFilters, setGlobalFilters, productStats, isMobile = false }) => {
  const [priceOpen, setPriceOpen] = useState(false);

  const toggleFilter = (key) => {
    setGlobalFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updatePrice = (key, value) => {
    setGlobalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className='flex flex-col gap-1'>
      {/* Frete Grátis */}
      {productStats.freeShippingCount > 0 && (
        <label
          className={`flex items-center cursor-pointer py-2 px-2 rounded-lg transition-colors duration-150 ${
            globalFilters.freeShipping ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
          }`}
        >
          <input
            type='checkbox'
            checked={globalFilters.freeShipping}
            onChange={() => toggleFilter('freeShipping')}
            className={`form-checkbox ${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-green-600 rounded border-gray-300 focus:ring-green-500 transition-colors duration-150`}
          />
          <Truck className={`ml-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} ${
            globalFilters.freeShipping ? 'text-green-600' : 'text-gray-400'
          }`} />
          <span className={`ml-2 ${isMobile ? 'text-base' : 'text-sm'} ${
            globalFilters.freeShipping ? 'font-semibold text-green-700' : 'font-medium text-gray-700'
          }`}>
            Frete Grátis
          </span>
          <span className='ml-auto text-xs text-gray-400'>
            ({productStats.freeShippingCount})
          </span>
        </label>
      )}

      {/* Disponibilidade */}
      <label
        className={`flex items-center cursor-pointer py-2 px-2 rounded-lg transition-colors duration-150 ${
          globalFilters.inStockOnly ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
      >
        <input
          type='checkbox'
          checked={globalFilters.inStockOnly}
          onChange={() => toggleFilter('inStockOnly')}
          className={`form-checkbox ${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-colors duration-150`}
        />
        <Package className={`ml-2 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} ${
          globalFilters.inStockOnly ? 'text-blue-600' : 'text-gray-400'
        }`} />
        <span className={`ml-2 ${isMobile ? 'text-base' : 'text-sm'} ${
          globalFilters.inStockOnly ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'
        }`}>
          Em Estoque
        </span>
        <span className='ml-auto text-xs text-gray-400'>
          ({productStats.inStockCount})
        </span>
      </label>

      {/* Faixa de Preço */}
      <div className='border-b border-gray-200 last:border-b-0'>
        <button
          type='button'
          onClick={() => setPriceOpen(!priceOpen)}
          className='w-full flex items-center justify-between py-3 text-left group'
        >
          <span className={`${isMobile ? 'text-base' : 'text-sm'} font-semibold text-gray-800 group-hover:text-primary transition-colors`}>
            Faixa de Preço
            {(globalFilters.minPrice || globalFilters.maxPrice) && (
              <span className='ml-2 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full'>
                1
              </span>
            )}
          </span>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${priceOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {priceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='overflow-hidden'
            >
              <div className='pb-3 flex items-center gap-2'>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>Mínimo</label>
                  <div className='relative'>
                    <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400'>R$</span>
                    <input
                      type='number'
                      min='0'
                      step='1'
                      value={globalFilters.minPrice}
                      onChange={e => updatePrice('minPrice', e.target.value)}
                      placeholder={String(productStats.minPrice || 0)}
                      className={`w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none transition-colors ${isMobile ? 'text-base' : 'text-sm'}`}
                    />
                  </div>
                </div>
                <span className='text-gray-300 mt-5'>—</span>
                <div className='flex-1'>
                  <label className='text-xs text-gray-500 mb-1 block'>Máximo</label>
                  <div className='relative'>
                    <span className='absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400'>R$</span>
                    <input
                      type='number'
                      min='0'
                      step='1'
                      value={globalFilters.maxPrice}
                      onChange={e => updatePrice('maxPrice', e.target.value)}
                      placeholder={String(productStats.maxPrice || 0)}
                      className={`w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none transition-colors ${isMobile ? 'text-base' : 'text-sm'}`}
                    />
                  </div>
                </div>
              </div>
              {(globalFilters.minPrice || globalFilters.maxPrice) && (
                <button
                  type='button'
                  onClick={() => setGlobalFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))}
                  className='text-xs text-gray-500 hover:text-primary mb-2 transition-colors'
                >
                  Limpar preço
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 📄 GROUPPAGE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const GroupPage = () => {
  const { group: groupSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, navigate } = useAppContext();

  // Obter dados do grupo
  const group = getGroupBySlug(groupSlug);

  // Obter definições de filtros deste grupo
  const filterDefs = useMemo(() => {
    return getFiltersByGroup(groupSlug);
  }, [groupSlug]);

  // ═══════════════════════════════════════════════════════════════
  // STATE: Filtros do grupo (acordeões checkbox)
  // ═══════════════════════════════════════════════════════════════
  const [activeFilters, setActiveFilters] = useState(() => {
    const initial = {};
    const defs = filterDefinitions[groupSlug] || [];
    defs.forEach(fd => {
      const paramValue = searchParams.get(fd.key);
      if (paramValue) {
        const values = paramValue.split(',').filter(v =>
          fd.options.some(o => o.value === v)
        );
        if (values.length > 0) initial[fd.key] = values;
      }
    });
    return initial;
  });

  // ═══════════════════════════════════════════════════════════════
  // 🆕 STATE: Filtros globais (frete grátis, disponibilidade, preço)
  // ═══════════════════════════════════════════════════════════════
  const [globalFilters, setGlobalFilters] = useState(() => ({
    freeShipping: searchParams.get('freeShipping') === 'true',
    inStockOnly: searchParams.get('inStock') === 'true',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
  }));

  // Sincronizar filtros do grupo quando searchParams mudam
  useEffect(() => {
    const defs = filterDefinitions[groupSlug] || [];
    const fromUrl = {};
    defs.forEach(fd => {
      const paramValue = searchParams.get(fd.key);
      if (paramValue) {
        const values = paramValue.split(',').filter(v => {
          return fd.options.some(o => o.value === v);
        });
        if (values.length > 0) fromUrl[fd.key] = values;
      }
    });
    setActiveFilters(fromUrl);

    // Sincronizar filtros globais também
    setGlobalFilters({
      freeShipping: searchParams.get('freeShipping') === 'true',
      inStockOnly: searchParams.get('inStock') === 'true',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
    });
  }, [searchParams, groupSlug]);

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileGridCols, setMobileGridCols] = useState(2);

  // SEO
  const seoData = getCollectionSEO(groupSlug);

  // Breadcrumbs
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: group?.name || groupSlug, url: `/collections/${groupSlug}` }
  ];

  // Filtros visíveis (respeita parent-child)
  const visibleFilterDefs = useMemo(() => {
    return filterDefs.filter(fd => {
      if (!fd.parentKey) return true;
      const parentValues = activeFilters[fd.parentKey] || [];
      return parentValues.includes(fd.parentValue);
    });
  }, [filterDefs, activeFilters]);

  // ═══════════════════════════════════════════════════════════════
  // 🆕 PRODUTOS DO GRUPO — suporta tag groups e grupos normais
  // ═══════════════════════════════════════════════════════════════
  const allGroupProducts = useMemo(() => {
    if (!group) return [];

    // 🆕 TAG GROUP: buscar produtos por tag (cross-category)
    if (group.isTagGroup) {
      return products.filter(product => {
        const tags = product.tags || [];
        return tags.includes(group.tagKey) && product.isMainVariant !== false;
      });
    }

    // GRUPO NORMAL: buscar por campo group
    return products.filter(product => {
      if (product.group && product.group === groupSlug) {
        return product.isMainVariant !== false;
      }
      return false;
    });
  }, [products, groupSlug, group]);

  // ═══════════════════════════════════════════════════════════════
  // 🆕 ESTATÍSTICAS dos produtos (para contagens nos filtros globais)
  // ═══════════════════════════════════════════════════════════════
  const productStats = useMemo(() => {
    let minPrice = Infinity;
    let maxPrice = 0;
    let freeShippingCount = 0;
    let inStockCount = 0;

    allGroupProducts.forEach(p => {
      const price = p.offerPrice || p.price;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
      if (p.freeShipping) freeShippingCount++;
      if (p.inStock && (p.stock || 0) > 0) inStockCount++;
    });

    return {
      minPrice: minPrice === Infinity ? 0 : Math.floor(minPrice),
      maxPrice: Math.ceil(maxPrice),
      freeShippingCount,
      inStockCount,
    };
  }, [allGroupProducts]);

  // ═══════════════════════════════════════════════════════════════
  // PRODUTOS FILTRADOS (filtros do grupo + filtros globais)
  // ═══════════════════════════════════════════════════════════════
  const groupProducts = useMemo(() => {
    // 1. Aplicar filtros do grupo (acordeões)
    let filtered = filterProductsByFilters(allGroupProducts, activeFilters, groupSlug);

    // 2. 🆕 Aplicar filtros globais
    if (globalFilters.freeShipping) {
      filtered = filtered.filter(p => p.freeShipping === true);
    }

    if (globalFilters.inStockOnly) {
      filtered = filtered.filter(p => p.inStock && (p.stock || 0) > 0);
    }

    if (globalFilters.minPrice) {
      const min = Number(globalFilters.minPrice);
      filtered = filtered.filter(p => (p.offerPrice || p.price) >= min);
    }

    if (globalFilters.maxPrice) {
      const max = Number(globalFilters.maxPrice);
      filtered = filtered.filter(p => (p.offerPrice || p.price) <= max);
    }

    // 3. Ordenar: disponíveis primeiro, esgotados no final
    return filtered.sort((a, b) => {
      const aIsInactive = !a.inStock || (a.stock || 0) <= 0;
      const bIsInactive = !b.inStock || (b.stock || 0) <= 0;
      
      if (aIsInactive && !bIsInactive) return 1;
      if (!aIsInactive && bIsInactive) return -1;
      return 0;
    });
  }, [allGroupProducts, activeFilters, globalFilters, groupSlug]);

  // ═══════════════════════════════════════════════════════════════
  // CONTAGEM de produtos por filtro
  // 🆕 Suporta fieldPath para filtros que mapeiam campos diretos
  // ═══════════════════════════════════════════════════════════════
  const getProductCountsForFilter = useCallback((filterKey) => {
    const counts = {};
    const filterDef = filterDefs.find(f => f.key === filterKey);
    if (!filterDef) return counts;

    // Base: outros filtros ativos (excluindo o filtro atual)
    const otherFilters = {};
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (key !== filterKey && values.length > 0) {
        otherFilters[key] = values;
      }
    });

    let baseProducts = filterProductsByFilters(allGroupProducts, otherFilters, groupSlug);

    // 🆕 Aplicar filtros globais na contagem também
    if (globalFilters.freeShipping) {
      baseProducts = baseProducts.filter(p => p.freeShipping === true);
    }
    if (globalFilters.inStockOnly) {
      baseProducts = baseProducts.filter(p => p.inStock && (p.stock || 0) > 0);
    }
    if (globalFilters.minPrice) {
      const min = Number(globalFilters.minPrice);
      baseProducts = baseProducts.filter(p => (p.offerPrice || p.price) >= min);
    }
    if (globalFilters.maxPrice) {
      const max = Number(globalFilters.maxPrice);
      baseProducts = baseProducts.filter(p => (p.offerPrice || p.price) <= max);
    }

    filterDef.options.forEach(option => {
      counts[option.value] = baseProducts.filter(product => {
        // 🆕 fieldPath: contar usando campo direto do produto
        if (filterDef.fieldPath) {
          return product[filterDef.fieldPath] === option.value;
        }

        const productFilters = product.filters instanceof Map
          ? Object.fromEntries(product.filters)
          : (product.filters || {});
        return productFilters[filterKey] === option.value;
      }).length;
    });

    return counts;
  }, [filterDefs, activeFilters, allGroupProducts, globalFilters, groupSlug]);

  // ═══════════════════════════════════════════════════════════════
  // 🆕 Sincronizar TODOS os filtros com a URL
  // ═══════════════════════════════════════════════════════════════
  const syncFiltersToUrl = useCallback((groupFilters, globals) => {
    const params = new URLSearchParams();

    // Filtros do grupo
    Object.entries(groupFilters).forEach(([k, values]) => {
      if (values.length === 1) {
        params.set(k, values[0]);
      } else if (values.length > 1) {
        params.set(k, values.join(','));
      }
    });

    // Filtros globais
    if (globals.freeShipping) params.set('freeShipping', 'true');
    if (globals.inStockOnly) params.set('inStock', 'true');
    if (globals.minPrice) params.set('minPrice', globals.minPrice);
    if (globals.maxPrice) params.set('maxPrice', globals.maxPrice);

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Toggle filtro do grupo + sincronizar URL
  const toggleFilterValue = useCallback((filterKey, value) => {
    setActiveFilters(prev => {
      const currentValues = prev[filterKey] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      const updated = { ...prev, [filterKey]: newValues };

      // Se desmarcou um parent, limpar filhos dependentes
      if (newValues.length === 0 || !currentValues.includes(value)) {
        filterDefs.forEach(fd => {
          if (fd.parentKey === filterKey) {
            if (!newValues.includes(fd.parentValue)) {
              delete updated[fd.key];
            }
          }
        });
      }

      // Limpar keys vazias
      Object.keys(updated).forEach(key => {
        if (updated[key].length === 0) delete updated[key];
      });

      syncFiltersToUrl(updated, globalFilters);
      return updated;
    });
  }, [filterDefs, globalFilters, syncFiltersToUrl]);

  // 🆕 Handler para filtros globais com sync à URL
  const handleSetGlobalFilters = useCallback((updater) => {
    setGlobalFilters(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncFiltersToUrl(activeFilters, next);
      return next;
    });
  }, [activeFilters, syncFiltersToUrl]);

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setActiveFilters({});
    setGlobalFilters({
      freeShipping: false,
      inStockOnly: false,
      minPrice: '',
      maxPrice: '',
    });
    setSearchParams({}, { replace: true });
    setShowFilterPanel(false);
  };

  // Total de filtros ativos (grupo + globais)
  const totalActiveGroupFilters = Object.values(activeFilters).reduce(
    (sum, values) => sum + values.length, 0
  );
  const totalActiveGlobalFilters = 
    (globalFilters.freeShipping ? 1 : 0) +
    (globalFilters.inStockOnly ? 1 : 0) +
    (globalFilters.minPrice || globalFilters.maxPrice ? 1 : 0);
  const totalActiveFilters = totalActiveGroupFilters + totalActiveGlobalFilters;

  // Verificar se tem filtros disponíveis
  const hasFilters = filterDefs.length > 0;
  // 🆕 Sempre mostrar sidebar se há filtros do grupo OU se há produtos com frete grátis
  const showSidebar = hasFilters || productStats.freeShippingCount > 0 || allGroupProducts.length > 0;

  // Se grupo não existe
  if (!group) {
    return (
      <>
        <SEO
          title="Coleção não encontrada"
          description="A coleção que procura não existe na Elite Surfing Brasil."
          url={`/collections/${groupSlug}`}
          noindex={true}
        />
        <div className='min-h-[60vh] flex flex-col items-center justify-center px-6'>
          <h1 className='text-2xl font-bold text-gray-800 mb-4'>Coleção não encontrada</h1>
          <p className='text-gray-600 mb-6'>A coleção que procuras não existe.</p>
          <Link 
            to='/'
            className='px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
          >
            Voltar à Home
          </Link>
        </div>
      </>
    );
  }

  // Dados da collection para o schema
  const collectionData = {
    name: seoData.title,
    description: seoData.description,
    slug: groupSlug
  };

  // ═══════════════════════════════════════════════════════════════
  // Componente de Filtros (Desktop e Mobile usam o mesmo)
  // ═══════════════════════════════════════════════════════════════
  const FilterPanel = ({ isMobile = false }) => (
    <div className='flex flex-col'>
      {/* 🆕 Filtros Globais (Frete Grátis, Disponibilidade, Preço) */}
      <GlobalFiltersPanel
        globalFilters={globalFilters}
        setGlobalFilters={handleSetGlobalFilters}
        productStats={productStats}
        isMobile={isMobile}
      />

      {/* Separador entre globais e filtros do grupo */}
      {visibleFilterDefs.length > 0 && (
        <div className='border-b border-gray-200 my-1' />
      )}

      {/* Filtros específicos do grupo (acordeões) */}
      {visibleFilterDefs.map((filterDef) => (
        <FilterAccordion
          key={filterDef.key}
          filterDef={filterDef}
          activeValues={activeFilters[filterDef.key] || []}
          onToggleValue={toggleFilterValue}
          productCounts={getProductCountsForFilter(filterDef.key)}
          isMobile={isMobile}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* SEO */}
      <SEO
        title={seoData.title}
        description={seoData.description}
        url={seoData.url}
        image={group.bannerImage || '/og-image.jpg'}
        type="website"
      >
        <OrganizationSchema />
        <BreadcrumbSchema items={breadcrumbItems} />
        <CollectionSchema collection={collectionData} products={groupProducts} />
      </SEO>

      <div className='min-h-screen'>
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-6 md:py-8'>
          
          {/* Breadcrumbs - Mobile */}
          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className='flex sm:hidden items-center gap-2 text-gray-500 text-sm mb-4'
            aria-label="Breadcrumb"
          >
            <Link to='/' className='hover:text-primary transition-colors'>Home</Link>
            <span>/</span>
            <span className='text-gray-800 font-medium' aria-current="page">{group.name}</span>
          </motion.nav>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Mobile Controls Bar - STICKY no scroll                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className='sm:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-sm -mx-6 px-6 py-3 border-b border-gray-100 shadow-sm'>
            <div className='flex items-center justify-between'>
              {showSidebar ? (
                <button
                  onClick={() => setShowFilterPanel(true)}
                  className='flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-200'
                >
                  <SlidersHorizontal className='w-4 h-4' />
                  <span>Filtro</span>
                  {totalActiveFilters > 0 && (
                    <span className='ml-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full'>
                      {totalActiveFilters}
                    </span>
                  )}
                </button>
              ) : (
                <div />
              )}

              {/* Toggle 1/2 colunas */}
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setMobileGridCols(1)}
                  className={`p-2.5 rounded-lg transition-colors duration-200 ${
                    mobileGridCols === 1 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label='Ver em 1 coluna'
                >
                  <Rows3 className='w-5 h-5' />
                </button>
                <button
                  onClick={() => setMobileGridCols(2)}
                  className={`p-2.5 rounded-lg transition-colors duration-200 ${
                    mobileGridCols === 2 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label='Ver em 2 colunas'
                >
                  <LayoutGrid className='w-5 h-5' />
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Mobile Filter Panel - Fullscreen com Acordeões         */}
          {/* ═══════════════════════════════════════════════════════ */}
          {showFilterPanel && (
            <div className='fixed inset-0 bg-white z-50 flex flex-col sm:hidden'>
              {/* Header */}
              <div className='flex justify-between items-center p-4 border-b'>
                <h3 className='text-xl font-semibold text-gray-800'>
                  Filtrar {group.name}
                </h3>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className='p-2 text-gray-500 hover:text-gray-800 transition-colors duration-200'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              {/* Filtros em Acordeão */}
              <div className='flex-1 overflow-y-auto px-4 py-2'>
                <FilterPanel isMobile={true} />
              </div>

              {/* Footer com botões */}
              <div className='p-4 border-t bg-white'>
                <div className='flex flex-col gap-3'>
                  {totalActiveFilters > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className='w-full py-3 px-6 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors duration-200'
                    >
                      Limpar Filtros ({totalActiveFilters})
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className='w-full py-3 px-6 bg-primary text-white font-semibold rounded-lg shadow-md hover:brightness-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  >
                    Ver {groupProducts.length} {groupProducts.length === 1 ? 'Produto' : 'Produtos'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* Layout Principal: Sidebar + Grid                       */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className='flex flex-col md:flex-row gap-8 mt-4 sm:mt-0'>
            
            {/* Coluna Esquerda: Filtros Desktop */}
            {showSidebar && (
              <div className='hidden sm:block md:w-1/4 lg:w-1/5 flex-shrink-0'>
                {/* Breadcrumb Desktop */}
                <motion.nav
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className='flex items-center gap-2 text-gray-500 text-sm mb-4'
                  aria-label="Breadcrumb"
                >
                  <Link to='/' className='hover:text-primary transition-colors'>Home</Link>
                  <span>/</span>
                  <span className='text-gray-800 font-medium' aria-current="page">{group.name}</span>
                </motion.nav>

                {/* Sidebar de Filtros */}
                <div className='bg-white rounded-lg shadow-md p-5 sticky top-32'>
                  <h3 className='text-lg font-semibold text-gray-800 mb-3'>
                    Filtros
                  </h3>
                  
                  <FilterPanel />

                  {totalActiveFilters > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className='mt-4 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm w-full'
                    >
                      Limpar Filtros ({totalActiveFilters})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Grid de Produtos */}
            <div className='flex-grow'>
              {/* Desktop: Voltar + Contagem */}
              <div className='hidden sm:flex items-center justify-between mb-6'>
                <button
                  onClick={() => navigate(-1)}
                  className='flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group'
                >
                  <ChevronLeft className='w-5 h-5 transition-transform group-hover:-translate-x-1' />
                  <span>Voltar</span>
                </button>
                
                {/* Breadcrumb Desktop (quando não há sidebar) */}
                {!showSidebar && (
                  <motion.nav
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='flex items-center gap-2 text-gray-500 text-sm'
                    aria-label="Breadcrumb"
                  >
                    <Link to='/' className='hover:text-primary transition-colors'>Home</Link>
                    <span>/</span>
                    <span className='text-gray-800 font-medium'>{group.name}</span>
                  </motion.nav>
                )}

                <p className='text-gray-500 text-sm'>
                  {groupProducts.length} {groupProducts.length === 1 ? 'produto' : 'produtos'}
                </p>
              </div>

              {/* Tags de Filtros Ativos */}
              {totalActiveFilters > 0 && (
                <div className='flex flex-wrap gap-2 mb-4'>
                  {/* Tags dos filtros do grupo */}
                  {Object.entries(activeFilters).map(([filterKey, values]) =>
                    values.map(value => {
                      const label = getFilterLabel(groupSlug, filterKey, value);
                      return (
                        <span 
                          key={`${filterKey}-${value}`}
                          className='inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full'
                        >
                          {label}
                          <button 
                            onClick={() => toggleFilterValue(filterKey, value)}
                            className='ml-1 hover:text-primary-dull'
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })
                  )}
                  {/* 🆕 Tags dos filtros globais */}
                  {globalFilters.freeShipping && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full'>
                      <Truck className='w-3.5 h-3.5' />
                      Frete Grátis
                      <button 
                        onClick={() => handleSetGlobalFilters(prev => ({ ...prev, freeShipping: false }))}
                        className='ml-1 hover:text-green-900'
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {globalFilters.inStockOnly && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full'>
                      Em Estoque
                      <button 
                        onClick={() => handleSetGlobalFilters(prev => ({ ...prev, inStockOnly: false }))}
                        className='ml-1 hover:text-blue-900'
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {(globalFilters.minPrice || globalFilters.maxPrice) && (
                    <span className='inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full'>
                      R$ {globalFilters.minPrice || '0'} — R$ {globalFilters.maxPrice || '∞'}
                      <button 
                        onClick={() => handleSetGlobalFilters(prev => ({ ...prev, minPrice: '', maxPrice: '' }))}
                        className='ml-1 hover:text-amber-900'
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className='inline-flex items-center px-3 py-1 text-gray-500 text-sm rounded-full hover:bg-gray-100 transition-colors'
                  >
                    Limpar tudo
                  </button>
                </div>
              )}

              {/* Mobile: Contagem */}
              <p className='sm:hidden text-gray-500 text-sm mb-4'>
                {groupProducts.length} {groupProducts.length === 1 ? 'produto' : 'produtos'}
              </p>

              {/* Produtos ou Empty State */}
              {groupProducts.length === 0 ? (
                <div className='text-center py-16 bg-gray-50 rounded-lg'>
                  <p className='text-gray-500 text-lg mb-4'>
                    {totalActiveFilters > 0 
                      ? 'Nenhum produto encontrado para os filtros selecionados.'
                      : 'Ainda não há produtos nesta coleção.'
                    }
                  </p>
                  {totalActiveFilters > 0 ? (
                    <button
                      onClick={clearAllFilters}
                      className='inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
                    >
                      Limpar Filtros
                    </button>
                  ) : (
                    <Link 
                      to='/products'
                      className='inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
                    >
                      Ver Todos os Produtos
                    </Link>
                  )}
                </div>
              ) : (
                <div className={`grid gap-4 md:gap-6 ${
                  mobileGridCols === 1 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : 'grid-cols-2'
                } md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4`}>
                  {groupProducts.map((product, index) => (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <ProductCard 
                        product={product} 
                        largeSwatches={mobileGridCols === 1}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupPage;