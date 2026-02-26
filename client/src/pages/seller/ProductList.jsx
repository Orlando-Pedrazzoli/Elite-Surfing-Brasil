import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { groups, getCategoriesByGroup } from '../../assets/assets';
import toast from 'react-hot-toast';
import EditProductModal from '../../components/seller/EditProductModal';
import { Package, Layers, Eye, EyeOff, Search, Filter, X, Grid3X3, List, AlertTriangle, GripVertical, Save, ArrowUpDown } from 'lucide-react';

// 🆕 Componente para renderizar bolinha de cor (simples ou dupla)
const ColorBall = ({ code1, code2, size = 32, selected = false, onClick, title, className = '' }) => {
  const isDual = code2 && code2 !== code1;
  const isLight = (code) => {
    if (!code) return false;
    const lightColors = ['#FFFFFF', '#FFF', '#ffffff', '#fff', '#F5F5F5', '#FAFAFA', '#f5f5f5', '#fafafa'];
    if (lightColors.includes(code)) return true;
    const hex = code.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 200;
  };
  
  const baseClasses = onClick 
    ? `rounded-full transition-all hover:scale-110 cursor-pointer ${
        selected 
          ? 'ring-2 ring-primary ring-offset-2' 
          : 'border-2 border-gray-300'
      }`
    : 'rounded-full';

  const content = isDual ? (
    <div 
      className='w-full h-full rounded-full overflow-hidden'
      style={{
        background: `linear-gradient(135deg, ${code1} 50%, ${code2} 50%)`,
        border: (isLight(code1) || isLight(code2)) ? '1px solid #d1d5db' : 'none'
      }}
    />
  ) : (
    <div 
      className='w-full h-full rounded-full'
      style={{ 
        backgroundColor: code1,
        border: isLight(code1) ? '1px solid #d1d5db' : 'none'
      }}
    />
  );

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className={`${baseClasses} ${className}`}
        style={{ width: size, height: size }}
        title={title}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      {content}
    </div>
  );
};

const ProductList = () => {
  const { products, currency, axios, fetchProducts } = useAppContext();
  const [updatingProducts, setUpdatingProducts] = useState(new Set());
  const [productToEdit, setProductToEdit] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para buscar todos os produtos
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [selectedGroup, setSelectedGroup] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFamily, setFilterFamily] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showOnlyMain, setShowOnlyMain] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');

  // 🆕 REORDENAÇÃO
  const [reorderMode, setReorderMode] = useState(false);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [localOrder, setLocalOrder] = useState([]); // IDs na ordem local
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // 🆕 Auto-scroll durante drag
  const scrollContainerRef = useRef(null);
  const autoScrollRef = useRef(null);

  useEffect(() => {
    fetchAllProducts();
    return () => stopAutoScroll(); // Limpar auto-scroll no unmount
  }, []);

  const fetchAllProducts = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/product/list?all=true');
      if (data.success) {
        setAllProducts(data.products);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllProducts = async () => {
    await fetchAllProducts();
    await fetchProducts();
    setHasOrderChanges(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🔧 FIX: getGroupStats agora suporta tag groups (bodyboard, sup, outlet)
  // ═══════════════════════════════════════════════════════════════
  const getGroupStats = (groupSlug) => {
    const groupDef = groups.find(g => g.slug === groupSlug);

    let groupProducts;

    if (groupDef?.isTagGroup) {
      // 🆕 Tag groups: filtrar por product.tags[]
      const tagKey = groupDef.tagKey;
      groupProducts = allProducts.filter(product => {
        const tags = product.tags || [];
        return tags.includes(tagKey);
      });
    } else {
      // Grupos normais: filtrar por group + category
      const groupCategoryPaths = getCategoriesByGroup(groupSlug).map(cat => cat.path.toLowerCase());
      groupProducts = allProducts.filter(product => {
        if (product.group === groupSlug) return true;
        const productCategory = (product.category || '').toLowerCase();
        return groupCategoryPaths.includes(productCategory);
      });
    }

    return {
      total: groupProducts.length,
      active: groupProducts.filter(p => p.inStock).length,
      inactive: groupProducts.filter(p => !p.inStock).length,
      lowStock: groupProducts.filter(p => p.inStock && (p.stock || 0) <= 3 && (p.stock || 0) > 0).length,
      outOfStock: groupProducts.filter(p => (p.stock || 0) === 0).length,
    };
  };

  const uniqueFamilies = [...new Set(allProducts.filter(p => p.productFamily).map(p => p.productFamily))];

  // ═══════════════════════════════════════════════════════════════
  // 🔧 FIX: Produtos filtrados agora suporta tag groups
  // ═══════════════════════════════════════════════════════════════
  const filteredProducts = (() => {
    let result = allProducts.filter(product => {
      if (selectedGroup) {
        const groupDef = groups.find(g => g.slug === selectedGroup);

        if (groupDef?.isTagGroup) {
          // 🆕 Tag group: verificar se produto tem a tag
          const tags = product.tags || [];
          if (!tags.includes(groupDef.tagKey)) return false;
        } else {
          // Grupo normal: verificar group + category
          const groupCategoryPaths = getCategoriesByGroup(selectedGroup).map(cat => cat.path.toLowerCase());
          const belongsToGroup = product.group === selectedGroup || 
            groupCategoryPaths.includes((product.category || '').toLowerCase());
          if (!belongsToGroup) return false;
        }
      }

      if (filterCategory && (product.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }

      if (filterFamily && product.productFamily !== filterFamily) return false;

      if (filterStatus === 'active' && !product.inStock) return false;
      if (filterStatus === 'inactive' && product.inStock) return false;
      if (filterStatus === 'low-stock' && !((product.stock || 0) <= 3 && (product.stock || 0) > 0)) return false;
      if (filterStatus === 'out-of-stock' && (product.stock || 0) !== 0) return false;

      if (showOnlyMain && product.isMainVariant === false) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = product.name?.toLowerCase().includes(search);
        const matchesCategory = product.category?.toLowerCase().includes(search);
        const matchesColor = product.color?.toLowerCase().includes(search);
        const matchesFamily = product.productFamily?.toLowerCase().includes(search);
        const matchesSku = product.sku?.toLowerCase().includes(search);
        if (!matchesName && !matchesCategory && !matchesColor && !matchesFamily && !matchesSku) return false;
      }

      return true;
    });

    // 🆕 No modo reorder, aplicar a ordem local
    if (reorderMode && localOrder.length > 0) {
      const orderMap = new Map(localOrder.map((id, idx) => [id, idx]));
      result = [...result].sort((a, b) => {
        const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : 99999;
        const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : 99999;
        return orderA - orderB;
      });
    }

    return result;
  })();

  // 🆕 Ao entrar no modo reorder, capturar a ordem atual
  const enterReorderMode = () => {
    setLocalOrder(filteredProducts.map(p => p._id));
    setReorderMode(true);
    setHasOrderChanges(false);
    setViewMode('table'); // Forçar tabela para drag & drop
  };

  const exitReorderMode = () => {
    setReorderMode(false);
    setLocalOrder([]);
    setHasOrderChanges(false);
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  // 🆕 Salvar ordem no backend
  const saveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const orders = localOrder.map((id, index) => ({
        id,
        displayOrder: index,
      }));

      const { data } = await axios.post('/api/product/reorder', { orders });
      if (data.success) {
        toast.success('Ordem salva com sucesso!');
        await refreshAllProducts();
        exitReorderMode();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erro ao salvar ordem');
    } finally {
      setIsSavingOrder(false);
    }
  };

  // 🆕 Auto-scroll: scroll automático quando arrasta perto das bordas
  const startAutoScroll = useCallback((clientY) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeZone = 80; // pixels da borda que ativam scroll
    const maxSpeed = 12; // velocidade máxima de scroll

    const distFromTop = clientY - rect.top;
    const distFromBottom = rect.bottom - clientY;

    let scrollSpeed = 0;
    if (distFromTop < edgeZone) {
      // Scroll para cima — mais perto da borda = mais rápido
      scrollSpeed = -maxSpeed * (1 - distFromTop / edgeZone);
    } else if (distFromBottom < edgeZone) {
      // Scroll para baixo
      scrollSpeed = maxSpeed * (1 - distFromBottom / edgeZone);
    }

    // Parar se não precisa scrollar
    if (scrollSpeed === 0) {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }
      return;
    }

    const doScroll = () => {
      if (!scrollContainerRef.current) return;
      scrollContainerRef.current.scrollTop += scrollSpeed;
      autoScrollRef.current = requestAnimationFrame(doScroll);
    };

    if (!autoScrollRef.current) {
      autoScrollRef.current = requestAnimationFrame(doScroll);
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  // Drag handlers para reordenar
  const handleDragStart = (e, index) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDragSourceIndex(null);
    setDragOverIndex(null);
    stopAutoScroll();
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragSourceIndex !== null && dragSourceIndex !== index) {
      setDragOverIndex(index);
    }
    // 🆕 Auto-scroll baseado na posição do cursor
    startAutoScroll(e.clientY);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    stopAutoScroll();
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;

    setLocalOrder(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(dragSourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
    setHasOrderChanges(true);
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  // 🆕 Mover com botões (up/down)
  const moveProduct = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= localOrder.length) return;
    
    setLocalOrder(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
    setHasOrderChanges(true);
  };

  const clearAllFilters = () => {
    setSelectedGroup('');
    setFilterCategory('');
    setFilterFamily('');
    setFilterStatus('');
    setShowOnlyMain(false);
    setSearchTerm('');
  };

  const hasActiveFilters = selectedGroup || filterCategory || filterFamily || filterStatus || showOnlyMain || searchTerm;

  const toggleStock = async (id, inStock) => {
    if (updatingProducts.has(id)) return;
    setUpdatingProducts(prev => new Set(prev).add(id));

    try {
      const { data } = await axios.post('/api/product/stock', { id, inStock });
      if (data.success) {
        await refreshAllProducts();
        toast.success(inStock ? 'Produto ativado!' : 'Produto desativado');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar');
    } finally {
      setUpdatingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const updateStockQuick = async (productId, newStock) => {
    try {
      const { data } = await axios.post('/api/product/update-stock', {
        productId,
        stock: newStock
      });
      if (data.success) {
        await refreshAllProducts();
        toast.success('Estoque atualizado!');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erro ao atualizar estoque');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const { data } = await axios.post('/api/product/delete', { id: productToDelete._id });
      if (data.success) {
        toast.success(data.message);
        await refreshAllProducts();
        setProductToDelete(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao excluir');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center h-[95vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-gray-600'>Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'
      onDragOver={reorderMode ? (e) => { e.preventDefault(); startAutoScroll(e.clientY); } : undefined}
      onDragLeave={reorderMode ? stopAutoScroll : undefined}
      onDrop={reorderMode ? stopAutoScroll : undefined}
    >
      <div className='w-full md:p-8 p-4'>
        
        {/* HEADER */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900'>Gestão de Produtos</h1>
          <p className='text-gray-500 mt-1'>Gerencie o inventário da sua loja</p>
        </div>

        {/* ESTATÍSTICAS RÁPIDAS */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
          <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-blue-100 rounded-lg'>
                <Package className='w-5 h-5 text-blue-600' />
              </div>
              <div>
                <p className='text-2xl font-bold text-gray-900'>{allProducts.length}</p>
                <p className='text-xs text-gray-500'>Total</p>
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-green-100 rounded-lg'>
                <Eye className='w-5 h-5 text-green-600' />
              </div>
              <div>
                <p className='text-2xl font-bold text-green-600'>{allProducts.filter(p => p.inStock).length}</p>
                <p className='text-xs text-gray-500'>Ativos</p>
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-red-100 rounded-lg'>
                <EyeOff className='w-5 h-5 text-red-600' />
              </div>
              <div>
                <p className='text-2xl font-bold text-red-600'>{allProducts.filter(p => !p.inStock || (p.stock || 0) === 0).length}</p>
                <p className='text-xs text-gray-500'>Esgotados</p>
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-orange-100 rounded-lg'>
                <AlertTriangle className='w-5 h-5 text-orange-600' />
              </div>
              <div>
                <p className='text-2xl font-bold text-orange-600'>
                  {allProducts.filter(p => p.inStock && (p.stock || 0) <= 3 && (p.stock || 0) > 0).length}
                </p>
                <p className='text-xs text-gray-500'>Estoque Baixo</p>
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl p-4 border border-gray-200 shadow-sm'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-purple-100 rounded-lg'>
                <Layers className='w-5 h-5 text-purple-600' />
              </div>
              <div>
                <p className='text-2xl font-bold text-purple-600'>
                  {allProducts.filter(p => p.isMainVariant !== false).length}
                </p>
                <p className='text-xs text-gray-500'>Principais</p>
              </div>
            </div>
          </div>
        </div>

        {/* CARDS DE GROUPS */}
        <div className='mb-6'>
          <h2 className='text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2'>
            <Filter className='w-4 h-4' />
            Filtrar por Coleção
          </h2>
          <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
            {/* Card "Todos" */}
            <button
              onClick={() => { setSelectedGroup(''); setFilterCategory(''); }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                !selectedGroup 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className='flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  !selectedGroup ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Grid3X3 className='w-5 h-5' />
                </div>
                <div>
                  <p className={`font-semibold ${!selectedGroup ? 'text-primary' : 'text-gray-800'}`}>
                    Todos
                  </p>
                  <p className='text-xs text-gray-500'>{allProducts.length} produtos</p>
                </div>
              </div>
              {!selectedGroup && (
                <div className='absolute top-2 right-2 w-2 h-2 bg-primary rounded-full'></div>
              )}
            </button>

            {groups.map(group => {
              const stats = getGroupStats(group.slug);
              const isSelected = selectedGroup === group.slug;
              
              return (
                <button
                  key={group.id}
                  onClick={() => { setSelectedGroup(isSelected ? '' : group.slug); setFilterCategory(''); }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-lg overflow-hidden bg-gray-100'>
                      <img src={group.image} alt={group.name} className='w-full h-full object-cover' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                        {group.name}
                      </p>
                      <div className='flex items-center gap-2 text-xs'>
                        <span className='text-gray-500'>{stats.total}</span>
                        {stats.lowStock > 0 && (
                          <span className='text-orange-500'>• {stats.lowStock} baixo</span>
                        )}
                        {stats.outOfStock > 0 && (
                          <span className='text-red-500'>• {stats.outOfStock} esgotado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className='absolute top-2 right-2 w-2 h-2 bg-primary rounded-full'></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className='bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm'>
          <div className='flex flex-col lg:flex-row gap-4'>
            {/* Busca */}
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por nome, SKU, categoria, cor...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all'
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                >
                  <X className='w-4 h-4' />
                </button>
              )}
            </div>

            {/* Filtros em linha */}
            <div className='flex flex-wrap items-center gap-3'>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white min-w-[150px]'
              >
                <option value=''>Todas Categorias</option>
                {(selectedGroup ? getCategoriesByGroup(selectedGroup) : [...new Set(allProducts.map(p => p.category))].filter(Boolean).map(c => ({ text: c, path: c }))).map(cat => (
                  <option key={cat.path || cat} value={cat.path || cat}>
                    {cat.text || cat}
                  </option>
                ))}
              </select>

              <select
                value={filterFamily}
                onChange={e => setFilterFamily(e.target.value)}
                className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white min-w-[140px]'
              >
                <option value=''>Todas Famílias</option>
                {uniqueFamilies.map(family => (
                  <option key={family} value={family}>{family}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className='px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white min-w-[130px]'
              >
                <option value=''>Todos Status</option>
                <option value='active'>✓ Ativos</option>
                <option value='inactive'>✗ Inativos</option>
                <option value='low-stock'>⚠ Estoque Baixo</option>
                <option value='out-of-stock'>✗ Esgotados</option>
              </select>

              <label className='flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200'>
                <input
                  type='checkbox'
                  checked={showOnlyMain}
                  onChange={e => setShowOnlyMain(e.target.checked)}
                  className='w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary'
                />
                <span className='text-sm text-gray-700 whitespace-nowrap'>Só principais</span>
              </label>

              <div className='flex items-center border border-gray-300 rounded-lg overflow-hidden'>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title='Visualização em tabela'
                >
                  <List className='w-4 h-4' />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title='Visualização em grid'
                >
                  <Grid3X3 className='w-4 h-4' />
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className='px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1'
                >
                  <X className='w-4 h-4' />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tags de filtros ativos */}
          {hasActiveFilters && (
            <div className='flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100'>
              <span className='text-xs text-gray-500'>Filtros ativos:</span>
              {selectedGroup && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full'>
                  {groups.find(g => g.slug === selectedGroup)?.name}
                  <button onClick={() => setSelectedGroup('')}><X className='w-3 h-3' /></button>
                </span>
              )}
              {filterCategory && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full'>
                  {filterCategory}
                  <button onClick={() => setFilterCategory('')}><X className='w-3 h-3' /></button>
                </span>
              )}
              {filterFamily && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full'>
                  {filterFamily}
                  <button onClick={() => setFilterFamily('')}><X className='w-3 h-3' /></button>
                </span>
              )}
              {filterStatus && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full'>
                  {filterStatus === 'active' ? 'Ativos' : filterStatus === 'inactive' ? 'Inativos' : filterStatus === 'low-stock' ? 'Estoque Baixo' : 'Esgotados'}
                  <button onClick={() => setFilterStatus('')}><X className='w-3 h-3' /></button>
                </span>
              )}
              {showOnlyMain && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full'>
                  Só principais
                  <button onClick={() => setShowOnlyMain(false)}><X className='w-3 h-3' /></button>
                </span>
              )}
              {searchTerm && (
                <span className='inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full'>
                  "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}><X className='w-3 h-3' /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* CONTADOR + BOTÃO REORDENAR */}
        <div className='flex items-center justify-between mb-4'>
          <p className='text-sm text-gray-600'>
            Mostrando <span className='font-semibold text-gray-900'>{filteredProducts.length}</span> 
            {hasActiveFilters && ` de ${allProducts.length}`} produtos
          </p>

          {/* 🆕 Botões de reordenação */}
          <div className='flex items-center gap-2'>
            {reorderMode ? (
              <>
                <button
                  onClick={exitReorderMode}
                  className='px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={saveOrder}
                  disabled={!hasOrderChanges || isSavingOrder}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                    hasOrderChanges && !isSavingOrder
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSavingOrder ? (
                    <>
                      <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      Salvar Ordem
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={enterReorderMode}
                disabled={filteredProducts.length < 2}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  filteredProducts.length >= 2
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                title='Arraste os produtos para definir a ordem de exibição na loja'
              >
                <ArrowUpDown className='w-4 h-4' />
                Reordenar
              </button>
            )}
          </div>
        </div>

        {/* 🆕 Banner do modo reorder */}
        {reorderMode && (
          <div className='mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3'>
            <ArrowUpDown className='w-5 h-5 text-amber-600 flex-shrink-0' />
            <div className='flex-1'>
              <p className='text-sm font-medium text-amber-800'>Modo de Reordenação Ativo</p>
              <p className='text-xs text-amber-600'>
                Arraste as linhas pelo ícone ⠿ ou use as setas ↑↓ para definir a ordem. Clique "Salvar Ordem" para aplicar na loja.
              </p>
            </div>
          </div>
        )}

        {/* ═══ TABELA ═══ */}
        {viewMode === 'table' ? (
          <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    {/* 🆕 Coluna de drag handle no modo reorder */}
                    {reorderMode && (
                      <th className='px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16'>
                        #
                      </th>
                    )}
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Produto</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>Cor</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell'>Categoria</th>
                    <th className='px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell'>Preço</th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider'>Estoque</th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider'>Status</th>
                    <th className='px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider'>Ações</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {filteredProducts.map((product, index) => {
                    const isUpdating = updatingProducts.has(product._id);
                    const isActive = product.inStock;
                    const currentStock = product.stock || 0;
                    const isLowStock = currentStock > 0 && currentStock <= 3;
                    const isMainVariant = product.isMainVariant !== false;
                    const hasDualColor = product.colorCode && product.colorCode2 && product.colorCode !== product.colorCode2;
                    const isDragOver = dragOverIndex === index;

                    return (
                      <tr
                        key={product._id}
                        draggable={reorderMode}
                        onDragStart={reorderMode ? (e) => handleDragStart(e, index) : undefined}
                        onDragEnd={reorderMode ? handleDragEnd : undefined}
                        onDragOver={reorderMode ? (e) => handleDragOver(e, index) : undefined}
                        onDrop={reorderMode ? (e) => handleDrop(e, index) : undefined}
                        className={`transition-colors ${
                          isUpdating ? 'opacity-50 pointer-events-none' : ''
                        } ${!isMainVariant ? 'bg-gray-50/50' : ''} ${
                          reorderMode ? 'cursor-grab active:cursor-grabbing' : 'hover:bg-gray-50'
                        } ${isDragOver ? 'border-t-2 !border-t-primary bg-primary/5' : ''}`}
                      >
                        {/* 🆕 Drag handle + posição */}
                        {reorderMode && (
                          <td className='px-2 py-3'>
                            <div className='flex items-center justify-center gap-1'>
                              <div className='flex flex-col gap-0.5'>
                                <button
                                  onClick={() => moveProduct(index, -1)}
                                  disabled={index === 0}
                                  className={`p-0.5 rounded ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                                  title='Mover para cima'
                                >
                                  <svg className='w-3 h-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 15l7-7 7 7' />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => moveProduct(index, 1)}
                                  disabled={index === filteredProducts.length - 1}
                                  className={`p-0.5 rounded ${index === filteredProducts.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                                  title='Mover para baixo'
                                >
                                  <svg className='w-3 h-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                                  </svg>
                                </button>
                              </div>
                              <GripVertical className='w-4 h-4 text-gray-300' />
                              <span className='text-xs text-gray-400 font-mono w-5 text-center'>{index + 1}</span>
                            </div>
                          </td>
                        )}

                        {/* Produto — 🆕 nome completo (sem truncate) */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <div className='relative w-14 h-14 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0'>
                              <img
                                src={product.image[0]}
                                alt={product.name}
                                className='w-full h-full object-contain p-1'
                              />
                              {!isActive && (
                                <div className='absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[9px] font-bold text-center py-0.5'>
                                  INATIVO
                                </div>
                              )}
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2'>
                                {/* 🆕 Nome completo — removido truncate max-w */}
                                <p className='font-medium text-gray-900'>{product.name}</p>
                                {isMainVariant ? (
                                  <span className='px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded flex-shrink-0'>P</span>
                                ) : (
                                  <span className='px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-bold rounded flex-shrink-0'>V</span>
                                )}
                              </div>
                              <div className='flex items-center gap-2 mt-0.5'>
                                {product.sku && (
                                  <span className='text-[11px] text-gray-400 font-mono'>{product.sku}</span>
                                )}
                                {product.sku && product.productFamily && (
                                  <span className='text-gray-300'>·</span>
                                )}
                                {product.productFamily && (
                                  <span className='text-xs text-gray-500'>{product.productFamily}</span>
                                )}
                              </div>
                              {(product.weight || product.dimensions?.length) && (
                                <div className='flex items-center gap-2 mt-0.5'>
                                  {product.weight && (
                                    <span className='text-[10px] text-gray-400'>
                                      {product.weight}g
                                    </span>
                                  )}
                                  {product.dimensions?.length && (
                                    <span className='text-[10px] text-gray-400'>
                                      {product.dimensions.length}×{product.dimensions.width}×{product.dimensions.height}cm
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cor */}
                        <td className='px-4 py-3'>
                          {product.colorCode ? (
                            <div className='flex items-center gap-2'>
                              <ColorBall
                                code1={product.colorCode}
                                code2={product.colorCode2}
                                size={28}
                                title={product.color}
                              />
                              <div className='hidden xl:block'>
                                <span className='text-xs text-gray-600'>{product.color}</span>
                                {hasDualColor && (
                                  <span className='block text-[10px] text-gray-400'>Bicolor</span>
                                )}
                              </div>
                            </div>
                          ) : product.size ? (
                            <span className='inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md'>
                              {product.size}
                            </span>
                          ) : (
                            <span className='text-gray-400 text-xs'>-</span>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className='px-4 py-3 hidden md:table-cell'>
                          <span className='inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md'>
                            {product.category}
                          </span>
                        </td>

                        {/* Preço */}
                        <td className='px-4 py-3 hidden lg:table-cell'>
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {currency}{product.offerPrice.toFixed(2)}
                            </p>
                            {product.offerPrice < product.price && (
                              <p className='text-xs text-gray-400 line-through'>
                                {currency}{product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Estoque */}
                        <td className='px-4 py-3'>
                          <div className='flex flex-col items-center gap-1'>
                            <div className='flex items-center gap-1'>
                              <button
                                onClick={() => updateStockQuick(product._id, Math.max(0, currentStock - 1))}
                                className='w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 font-bold transition-colors text-sm'
                                disabled={currentStock === 0}
                              >
                                -
                              </button>
                              <input
                                type='number'
                                value={currentStock}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val >= 0) updateStockQuick(product._id, val);
                                }}
                                className={`w-12 h-7 text-center border rounded text-sm font-medium ${
                                  currentStock === 0 
                                    ? 'border-red-300 bg-red-50 text-red-600' 
                                    : isLowStock 
                                      ? 'border-orange-300 bg-orange-50 text-orange-600'
                                      : 'border-gray-300 text-gray-700'
                                }`}
                                min='0'
                              />
                              <button
                                onClick={() => updateStockQuick(product._id, currentStock + 1)}
                                className='w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 font-bold transition-colors text-sm'
                              >
                                +
                              </button>
                            </div>
                            {currentStock === 0 && (
                              <span className='text-[10px] text-red-600 font-medium'>Esgotado</span>
                            )}
                            {isLowStock && (
                              <span className='text-[10px] text-orange-600 font-medium'>Baixo</span>
                            )}
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center'>
                            <button
                              onClick={() => toggleStock(product._id, !product.inStock)}
                              disabled={isUpdating}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                isActive ? 'bg-green-500' : 'bg-gray-300'
                              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isActive ? 'left-7' : 'left-1'
                              }`}>
                                {isUpdating && (
                                  <span className='absolute inset-0 flex items-center justify-center'>
                                    <span className='w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin'></span>
                                  </span>
                                )}
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-1'>
                            <button
                              onClick={() => setProductToEdit(product)}
                              className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                              title='Editar'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                              </svg>
                            </button>
                            <button
                              onClick={() => setProductToDelete(product)}
                              className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                              title='Excluir'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className='py-16 text-center'>
                <Package className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                <p className='text-gray-500 font-medium'>Nenhum produto encontrado</p>
                <p className='text-sm text-gray-400 mt-1'>Ajuste os filtros ou adicione novos produtos</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className='mt-4 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors'
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ═══ GRID ═══ */
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
            {filteredProducts.map(product => {
              const isUpdating = updatingProducts.has(product._id);
              const isActive = product.inStock;
              const currentStock = product.stock || 0;
              const isLowStock = currentStock > 0 && currentStock <= 3;
              const isMainVariant = product.isMainVariant !== false;

              return (
                <div
                  key={product._id}
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all ${
                    isUpdating ? 'opacity-50' : ''
                  }`}
                >
                  <div className='relative aspect-square bg-gray-50 p-4'>
                    <img
                      src={product.image[0]}
                      alt={product.name}
                      className='w-full h-full object-contain'
                    />
                    
                    <div className='absolute top-2 left-2 flex flex-col gap-1'>
                      {isMainVariant ? (
                        <span className='px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded'>PRINCIPAL</span>
                      ) : (
                        <span className='px-2 py-0.5 bg-gray-500 text-white text-[10px] font-bold rounded'>VARIANTE</span>
                      )}
                      {!isActive && (
                        <span className='px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded'>INATIVO</span>
                      )}
                      {currentStock === 0 && isActive && (
                        <span className='px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded'>ESGOTADO</span>
                      )}
                      {isLowStock && (
                        <span className='px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded'>BAIXO</span>
                      )}
                    </div>

                    {product.colorCode && (
                      <ColorBall
                        code1={product.colorCode}
                        code2={product.colorCode2}
                        size={24}
                        title={product.color}
                        className='absolute top-2 right-2 shadow-sm border-2 border-white'
                      />
                    )}

                    <button
                      onClick={() => toggleStock(product._id, !product.inStock)}
                      disabled={isUpdating}
                      className={`absolute bottom-2 right-2 w-10 h-5 rounded-full transition-colors ${
                        isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        isActive ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className='p-3'>
                    {/* 🆕 Nome completo no grid também */}
                    <p className='font-medium text-gray-900 text-sm'>{product.name}</p>
                    <div className='flex items-center gap-2 mt-0.5'>
                      {product.sku && (
                        <span className='text-[10px] text-gray-400 font-mono'>{product.sku}</span>
                      )}
                      {!product.sku && (
                        <span className='text-xs text-gray-500 truncate'>{product.category}</span>
                      )}
                    </div>
                    
                    <div className='flex items-center justify-between mt-2'>
                      <p className='font-bold text-primary'>{currency}{product.offerPrice.toFixed(2)}</p>
                      <div className='flex items-center gap-1 text-xs'>
                        <span className={`font-medium ${currentStock === 0 ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-600'}`}>
                          {currentStock}
                        </span>
                        <span className='text-gray-400'>un</span>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 mt-3 pt-3 border-t border-gray-100'>
                      <button
                        onClick={() => setProductToEdit(product)}
                        className='flex-1 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setProductToDelete(product)}
                        className='flex-1 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className='col-span-full py-16 text-center'>
                <Package className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                <p className='text-gray-500 font-medium'>Nenhum produto encontrado</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className='mt-4 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors'
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {productToEdit && (
        <EditProductModal
          product={productToEdit}
          onClose={() => setProductToEdit(null)}
          onSuccess={refreshAllProducts}
          axios={axios}
        />
      )}

      {/* Modal de Exclusão */}
      {productToDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4'>
              <svg className='w-6 h-6 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
              </svg>
            </div>
            <h3 className='text-lg font-bold text-gray-900 text-center mb-2'>Excluir Produto?</h3>
            <p className='text-sm text-gray-600 text-center mb-6'>
              Tem certeza que deseja excluir "<span className='font-medium'>{productToDelete.name}</span>"?
              <br />
              <span className='text-red-500 text-xs'>Esta ação não pode ser desfeita.</span>
            </p>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setProductToDelete(null)}
                className='flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors'
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className='flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'></span>
                    Excluindo...
                  </>
                ) : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;