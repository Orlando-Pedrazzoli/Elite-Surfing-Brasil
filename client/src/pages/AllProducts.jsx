// client/src/pages/AllProducts.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { searchProducts } from '../utils/productSearch';
import ProductCard from '../components/ProductCard';
import { categories, groups, getCategoriesByGroup } from '../assets/assets.js';
import { SEO, BreadcrumbSchema } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import { ChevronDown, SlidersHorizontal, LayoutGrid, Rows3, X } from 'lucide-react';

const AllProducts = () => {
  const { products, fetchProducts, setSearchQuery } = useAppContext();

  // 🔎 O termo de busca vive na URL (/products?q=termo): dá para partilhar,
  // recarregar e voltar atrás. O contexto é só espelho para quem ainda o lê.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') || '').trim();

  useEffect(() => {
    setSearchQuery(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const clearSearchQuery = () => {
    if (!searchParams.has('q')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileGridCols, setMobileGridCols] = useState(1); // 🆕 1 coluna como padrão em mobile

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products, fetchProducts]);

  useEffect(() => {
    const hasSearch = searchQuery.length > 0;

    // Com busca: o motor partilhado com a navbar devolve os produtos
    // principais já por ordem de relevância (ignora acentos, aceita
    // sinónimos, disponíveis primeiro).
    // Sem busca: lista completa dos produtos principais.
    let currentResult = hasSearch
      ? searchProducts(products, searchQuery)
      : products.filter(product => product.isMainVariant !== false);

    // Apply group filter
    if (selectedGroups.length > 0) {
      const groupCategoryPaths = selectedGroups.flatMap(groupSlug => 
        getCategoriesByGroup(groupSlug).map(cat => cat.path.toLowerCase())
      );
      
      currentResult = currentResult.filter(product => {
        if (product.group && selectedGroups.includes(product.group)) {
          return true;
        }
        const productCategory = (product.category || '').toLowerCase();
        return groupCategoryPaths.includes(productCategory);
      });
    }

    // Apply category filter if categories are selected
    if (selectedCategories.length > 0) {
      currentResult = currentResult.filter(
        product =>
          product.category &&
          typeof product.category === 'string' &&
          selectedCategories.includes(product.category.toLowerCase())
      );
    }

    if (hasSearch) {
      // Mantém a ordem de relevância do motor de busca
      setFilteredProducts(currentResult);
      return;
    }

    // Sem busca: disponíveis primeiro (mais recentes no topo), esgotados no fim
    const availableProducts = currentResult.filter(p => p.inStock && p.stock > 0).reverse();
    const unavailableProducts = currentResult.filter(p => !p.inStock || p.stock <= 0).reverse();
    
    setFilteredProducts([...availableProducts, ...unavailableProducts]);
  }, [products, searchQuery, selectedCategories, selectedGroups]);

  const toggleGroupExpansion = (groupSlug) => {
    setExpandedGroups(prev =>
      prev.includes(groupSlug)
        ? prev.filter(g => g !== groupSlug)
        : [...prev, groupSlug]
    );
  };

  const handleGroupChange = (groupSlug) => {
    const isSelected = selectedGroups.includes(groupSlug);
    
    if (isSelected) {
      setSelectedGroups(prev => prev.filter(g => g !== groupSlug));
      const groupCats = getCategoriesByGroup(groupSlug).map(c => c.path.toLowerCase());
      setSelectedCategories(prev => prev.filter(c => !groupCats.includes(c)));
    } else {
      setSelectedGroups(prev => [...prev, groupSlug]);
      if (!expandedGroups.includes(groupSlug)) {
        setExpandedGroups(prev => [...prev, groupSlug]);
      }
    }
  };

  const handleCategoryChange = (categoryPath, groupSlug) => {
    const lowerCaseCategoryPath = categoryPath.toLowerCase();
    
    setSelectedCategories(prev =>
      prev.includes(lowerCaseCategoryPath)
        ? prev.filter(c => c !== lowerCaseCategoryPath)
        : [...prev, lowerCaseCategoryPath]
    );

    if (!selectedGroups.includes(groupSlug)) {
      setSelectedGroups(prev => [...prev, groupSlug]);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedGroups([]);
    setShowFilterPanel(false);
  };

  const getGroupProductCount = (groupSlug) => {
    const groupCategoryPaths = getCategoriesByGroup(groupSlug).map(cat => cat.path.toLowerCase());
    
    return products.filter(product => {
      if (product.isMainVariant === false) return false;
      
      if (product.group === groupSlug) return true;
      
      const productCategory = (product.category || '').toLowerCase();
      return groupCategoryPaths.includes(productCategory);
    }).length;
  };

  const getCategoryProductCount = (categoryPath) => {
    return products.filter(product => {
      if (product.isMainVariant === false) return false;
      return (product.category || '').toLowerCase() === categoryPath.toLowerCase();
    }).length;
  };

  const totalActiveFilters = selectedGroups.length + selectedCategories.length;

  // Componente de filtro reutilizável
  const FilterSection = ({ isMobile = false }) => (
    <div className={`flex flex-col gap-2 ${isMobile ? '' : ''}`}>
      {groups.map(group => {
        const groupCategories = getCategoriesByGroup(group.slug);
        const isExpanded = expandedGroups.includes(group.slug);
        const isGroupSelected = selectedGroups.includes(group.slug);
        const productCount = getGroupProductCount(group.slug);
        const hasCategories = groupCategories.length > 0;

        return (
          <div key={group.id} className='border-b border-gray-100 pb-2'>
            <div className='flex items-center gap-2'>
              <label className='flex items-center flex-1 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={isGroupSelected}
                  onChange={() => handleGroupChange(group.slug)}
                  className={`form-checkbox ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-primary rounded-md border-gray-300 focus:ring-primary transition-colors duration-200`}
                />
                <span className={`ml-3 font-semibold text-gray-800 ${isMobile ? 'text-base' : 'text-sm'}`}>
                  {group.name}
                </span>
                <span className='ml-2 text-xs text-gray-400'>({productCount})</span>
              </label>
              
              {hasCategories && (
                <button
                  onClick={() => toggleGroupExpansion(group.slug)}
                  className='p-1 hover:bg-gray-100 rounded transition-colors'
                >
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {hasCategories && (
              <div className={`overflow-hidden transition-all duration-300 ${
                isExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}>
                <div className='pl-6 flex flex-col gap-2'>
                  {groupCategories.map(category => {
                    const catCount = getCategoryProductCount(category.path);
                    return (
                      <label
                        key={category.path}
                        className='flex items-center cursor-pointer text-gray-600 hover:text-primary transition-colors duration-200'
                      >
                        <input
                          type='checkbox'
                          checked={selectedCategories.includes(category.path.toLowerCase())}
                          onChange={() => handleCategoryChange(category.path, group.slug)}
                          className={`form-checkbox ${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-primary rounded border-gray-300 focus:ring-primary transition-colors duration-200`}
                        />
                        <span className={`ml-2 ${isMobile ? 'text-base' : 'text-sm'}`}>
                          {category.text}
                        </span>
                        <span className='ml-2 text-xs text-gray-400'>({catCount})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <SEO 
        title={seoConfig.products.title}
        description={seoConfig.products.description}
        url={seoConfig.products.url}
      >
        <BreadcrumbSchema items={[
          { name: 'Home', url: '/' },
          { name: 'Produtos' }
        ]} />
      </SEO>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 mt-10'>
        {/* 🆕 Mobile Controls Bar - Estilo Pipeline */}
        <div className='flex sm:hidden items-center justify-between mb-4'>
          {/* Botão Filtro */}
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

          {/* Toggle Visualização 1/2 colunas */}
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

        {/* Desktop Header - Mantém título apenas em desktop */}
        <div className='hidden sm:flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8'>
          <div className='flex flex-col items-start w-max'>
            <h1 className='text-3xl sm:text-4xl font-bold text-gray-800'>
              {searchQuery ? 'Resultados da busca' : 'Produtos'}
            </h1>
            <div className='w-full h-1 bg-primary rounded-full mt-2'></div>
          </div>
        </div>

        {/* 🔎 Resumo da busca (desktop e mobile) */}
        {searchQuery && (
          <div className='flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 sm:mb-6'>
            <p className='text-sm sm:text-base text-gray-600'>
              {filteredProducts.length === 0
                ? 'Nenhum resultado para '
                : `${filteredProducts.length} resultado${filteredProducts.length === 1 ? '' : 's'} para `}
              <span className='font-semibold text-gray-900'>“{searchQuery}”</span>
            </p>
            <button
              onClick={clearSearchQuery}
              className='inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors'
            >
              <X className='w-3.5 h-3.5' />
              Limpar busca
            </button>
          </div>
        )}

        <div className='flex flex-col md:flex-row gap-8'>
          {/* Filter Section for Desktop */}
          <div className='hidden sm:block md:w-1/4 lg:w-1/5 flex-shrink-0 bg-white rounded-lg shadow-md p-6 h-max sticky top-24'>
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>
              Filtrar por Coleção
            </h3>
            
            <FilterSection />

            {totalActiveFilters > 0 && (
              <button
                onClick={clearAllFilters}
                className='mt-6 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 text-sm w-full'
              >
                Limpar Filtros ({totalActiveFilters})
              </button>
            )}
          </div>

          {/* Filter Panel for Mobile - Fullscreen */}
          {showFilterPanel && (
            <div className='fixed inset-0 bg-white z-50 flex flex-col sm:hidden'>
              {/* Header */}
              <div className='flex justify-between items-center p-4 border-b'>
                <h3 className='text-xl font-semibold text-gray-800'>
                  Filtrar Produtos
                </h3>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className='p-2 text-gray-500 hover:text-gray-800 transition-colors duration-200'
                >
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>

              {/* Filter Content - Scrollable */}
              <div className='flex-1 overflow-y-auto p-4'>
                <h4 className='text-base font-semibold text-gray-700 mb-4'>Coleções</h4>
                <FilterSection isMobile={true} />
              </div>

              {/* Footer Buttons - Fixed at bottom */}
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
                    Ver {filteredProducts.length} Produtos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className='flex-grow'>
            {/* Active Filters Tags */}
            {totalActiveFilters > 0 && (
              <div className='flex flex-wrap gap-2 mb-4 sm:mb-6'>
                {selectedGroups.map(groupSlug => {
                  const group = groups.find(g => g.slug === groupSlug);
                  if (!group) return null;
                  return (
                    <span 
                      key={groupSlug}
                      className='inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full'
                    >
                      {group.name}
                      <button 
                        onClick={() => handleGroupChange(groupSlug)}
                        className='ml-1 hover:text-primary-dull'
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
                {selectedCategories.map(catPath => {
                  const category = categories.find(c => c.path.toLowerCase() === catPath);
                  if (!category) return null;
                  if (selectedGroups.includes(category.group)) return null;
                  return (
                    <span 
                      key={catPath}
                      className='inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full'
                    >
                      {category.text}
                      <button 
                        onClick={() => handleCategoryChange(category.path, category.group)}
                        className='ml-1 hover:text-gray-900'
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 &&
            (searchQuery || totalActiveFilters > 0) ? (
              <div className='py-10 text-center'>
                <p className='text-gray-700 text-lg font-medium'>
                  {searchQuery
                    ? `Nenhum produto encontrado para “${searchQuery}”.`
                    : 'Nenhum produto encontrado para os filtros selecionados.'}
                </p>
                <p className='text-gray-500 text-sm mt-2'>
                  {searchQuery
                    ? 'Confira a ortografia ou tente um termo mais curto, como “deck”, “leash” ou “capa”.'
                    : 'Tente remover alguns filtros.'}
                </p>
                {(searchQuery || totalActiveFilters > 0) && (
                  <button
                    onClick={() => {
                      clearSearchQuery();
                      clearAllFilters();
                    }}
                    className='mt-5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dull transition-colors'
                  >
                    Ver todos os produtos
                  </button>
                )}
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className='text-gray-500 py-8 text-center text-lg'>
                Nenhum produto disponível no momento.
              </p>
            ) : (
              <div className={`grid gap-4 md:gap-6 ${
                mobileGridCols === 1 
                  ? 'grid-cols-1 sm:grid-cols-2' 
                  : 'grid-cols-2'
              } md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4`}>
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product._id} 
                    product={product} 
                    largeSwatches={mobileGridCols === 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllProducts;