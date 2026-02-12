import React, { useMemo, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, SlidersHorizontal, LayoutGrid, Rows3, X } from 'lucide-react';
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
// 📄 GROUPPAGE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const GroupPage = () => {
  const { group: groupSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, navigate } = useAppContext();

  // 🆕 Inicializar filtros a partir dos query params da URL
  const [activeFilters, setActiveFilters] = useState(() => {
    const initial = {};
    const defs = filterDefinitions[groupSlug] || [];
    defs.forEach(fd => {
      const paramValue = searchParams.get(fd.key);
      if (paramValue) {
        // Verificar se o valor existe nas options do filtro
        const validOption = fd.options.find(o => o.value === paramValue);
        if (validOption) {
          initial[fd.key] = [paramValue];
        }
      }
    });
    return initial;
  });

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileGridCols, setMobileGridCols] = useState(2);

  // Obter dados do grupo
  const group = getGroupBySlug(groupSlug);

  // SEO
  const seoData = getCollectionSEO(groupSlug);

  // Breadcrumbs
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: group?.name || groupSlug, url: `/collections/${groupSlug}` }
  ];

  // 🆕 Obter definições de filtros deste grupo
  const filterDefs = useMemo(() => {
    return getFiltersByGroup(groupSlug);
  }, [groupSlug]);

  // 🆕 Filtros visíveis (respeita parent-child)
  const visibleFilterDefs = useMemo(() => {
    return filterDefs.filter(fd => {
      if (!fd.parentKey) return true;
      const parentValues = activeFilters[fd.parentKey] || [];
      return parentValues.includes(fd.parentValue);
    });
  }, [filterDefs, activeFilters]);

  // Todos os produtos deste grupo (sem filtros aplicados)
  const allGroupProducts = useMemo(() => {
    return products.filter(product => {
      if (product.group && product.group === groupSlug) {
        return product.isMainVariant !== false;
      }
      return false;
    });
  }, [products, groupSlug]);

  // Produtos filtrados (com filtros aplicados)
  const groupProducts = useMemo(() => {
    let filtered = filterProductsByFilters(allGroupProducts, activeFilters);

    // Ordenar: disponíveis primeiro, esgotados no final
    return filtered.sort((a, b) => {
      const aIsInactive = !a.inStock || (a.stock || 0) <= 0;
      const bIsInactive = !b.inStock || (b.stock || 0) <= 0;
      
      if (aIsInactive && !bIsInactive) return 1;
      if (!aIsInactive && bIsInactive) return -1;
      return 0;
    });
  }, [allGroupProducts, activeFilters]);

  // 🆕 Contagem de produtos por filtro
  const getProductCountsForFilter = useCallback((filterKey) => {
    const counts = {};
    const filterDef = filterDefs.find(f => f.key === filterKey);
    if (!filterDef) return counts;

    const otherFilters = {};
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (key !== filterKey && values.length > 0) {
        otherFilters[key] = values;
      }
    });

    const baseProducts = filterProductsByFilters(allGroupProducts, otherFilters);

    filterDef.options.forEach(option => {
      counts[option.value] = baseProducts.filter(product => {
        const productFilters = product.filters instanceof Map
          ? Object.fromEntries(product.filters)
          : (product.filters || {});
        return productFilters[filterKey] === option.value;
      }).length;
    });

    return counts;
  }, [filterDefs, activeFilters, allGroupProducts]);

  // 🆕 Toggle filtro + sincronizar URL
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

      // 🆕 Sincronizar query params na URL
      const params = new URLSearchParams();
      Object.entries(updated).forEach(([k, values]) => {
        if (values.length === 1) {
          params.set(k, values[0]);
        } else if (values.length > 1) {
          params.set(k, values.join(','));
        }
      });
      setSearchParams(params, { replace: true });

      return updated;
    });
  }, [filterDefs, setSearchParams]);

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchParams({}, { replace: true });
    setShowFilterPanel(false);
  };

  // Total de filtros ativos
  const totalActiveFilters = Object.values(activeFilters).reduce(
    (sum, values) => sum + values.length, 0
  );

  // Verificar se tem filtros disponíveis
  const hasFilters = filterDefs.length > 0;

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
              {hasFilters ? (
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
            {hasFilters && (
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
                
                {/* Breadcrumb Desktop (quando não há filtros laterais) */}
                {!hasFilters && (
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