import React, { useState, useEffect, useMemo } from 'react';
import { assets, categories, groups, getCategoriesByGroup, getFiltersByGroup } from '../../assets/assets';
import toast from 'react-hot-toast';

// 🎯 CORES PRÉ-DEFINIDAS (SIMPLES)
const PRESET_COLORS = [
  { name: 'Preto', code: '#000000' },
  { name: 'Branco', code: '#FFFFFF' },
  { name: 'Cinza', code: '#6B7280' },
  { name: 'Vermelho', code: '#DC2626' },
  { name: 'Azul', code: '#2563EB' },
  { name: 'Azul Marinho', code: '#1E3A5F' },
  { name: 'Verde', code: '#16A34A' },
  { name: 'Amarelo', code: '#EAB308' },
  { name: 'Laranja', code: '#EA580C' },
  { name: 'Rosa', code: '#EC4899' },
  { name: 'Roxo', code: '#9333EA' },
  { name: 'Castanho', code: '#78350F' },
  { name: 'Bege', code: '#D4B896' },
  { name: 'Turquesa', code: '#14B8A6' },
];

// 🆕 CORES DUPLAS PRÉ-DEFINIDAS
const PRESET_DUAL_COLORS = [
  { name: 'Preto/Azul', code1: '#000000', code2: '#2096d7' },
  { name: 'Preto/Cinza', code1: '#000000', code2: '#6a727f' },
  { name: 'Preto/Musgo', code1: '#000000', code2: '#3b6343' },
  { name: 'Preto/Verde', code1: '#000000', code2: '#87be47' },
  { name: 'Preto/Amarelo', code1: '#000000', code2: '#d9c214' },
  { name: 'Preto/Rosa', code1: '#000000', code2: '#d2336e' },
  { name: 'Preto/Branco', code1: '#000000', code2: '#dfdfe1' },
  { name: 'Preto/Vermelho', code1: '#000000', code2: '#dc2333' },
];

// Componente para renderizar bolinha de cor
const ColorBall = ({ code1, code2, size = 32, selected = false, onClick, title }) => {
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
  
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full transition-all hover:scale-110 ${
        selected 
          ? 'ring-2 ring-primary ring-offset-2' 
          : 'border-2 border-gray-300'
      }`}
      style={{ width: size, height: size }}
      title={title}
    >
      {isDual ? (
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
      )}
    </button>
  );
};

const EditProductModal = ({ product, onClose, onSuccess, axios }) => {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GROUP + CATEGORY
  const [selectedGroup, setSelectedGroup] = useState('');
  const [category, setCategory] = useState('');

  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');

  // CAMPOS DE STOCK
  const [stock, setStock] = useState('');

  // 🆕 SKU + PESO + DIMENSÕES
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });

  // 🆕 FILTROS DINÂMICOS (baseados no grupo selecionado)
  const [productFilters, setProductFilters] = useState({});

  // CAMPOS DE FAMÍLIA/COR
  const [productFamily, setProductFamily] = useState('');
  const [hasColor, setHasColor] = useState(false);
  const [color, setColor] = useState('');
  const [colorCode, setColorCode] = useState('#000000');
  
  // COR DUPLA
  const [isDualColor, setIsDualColor] = useState(false);
  const [colorCode2, setColorCode2] = useState('#2563EB');
  
  const [isMainVariant, setIsMainVariant] = useState(true);

  // Filtrar categorias baseado no grupo selecionado
  const filteredCategories = useMemo(() => {
    if (!selectedGroup) return [];
    return getCategoriesByGroup(selectedGroup);
  }, [selectedGroup]);

  // 🆕 Obter filtros disponíveis para o grupo selecionado
  const groupFilterDefs = useMemo(() => {
    if (!selectedGroup) return [];
    return getFiltersByGroup(selectedGroup);
  }, [selectedGroup]);

  // 🆕 Filtros visíveis (respeita parent-child)
  const visibleFilters = useMemo(() => {
    return groupFilterDefs.filter(filterDef => {
      if (!filterDef.parentKey) return true;
      return productFilters[filterDef.parentKey] === filterDef.parentValue;
    });
  }, [groupFilterDefs, productFilters]);

  // Carregar dados do produto
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description.join('\n'));
      
      // Group + Category
      setSelectedGroup(product.group || '');
      setCategory(product.category || '');
      
      setPrice(product.price.toString());
      setOfferPrice(product.offerPrice.toString());
      
      // Stock
      setStock((product.stock || 0).toString());
      
      // 🆕 SKU + Peso + Dimensões
      setSku(product.sku || '');
      setWeight(product.weight ? product.weight.toString() : '');
      setDimensions({
        length: product.dimensions?.length ? product.dimensions.length.toString() : '',
        width: product.dimensions?.width ? product.dimensions.width.toString() : '',
        height: product.dimensions?.height ? product.dimensions.height.toString() : '',
      });

      // 🆕 Filtros do produto
      if (product.filters) {
        const filters = product.filters instanceof Map 
          ? Object.fromEntries(product.filters) 
          : (product.filters || {});
        setProductFilters(filters);
      } else {
        setProductFilters({});
      }
      
      // Família/cor
      setProductFamily(product.productFamily || '');
      setIsMainVariant(product.isMainVariant !== false);
      
      if (product.color || product.colorCode) {
        setHasColor(true);
        setColor(product.color || '');
        setColorCode(product.colorCode || '#000000');
        
        if (product.colorCode2 && product.colorCode2 !== product.colorCode) {
          setIsDualColor(true);
          setColorCode2(product.colorCode2);
        } else {
          setIsDualColor(false);
          setColorCode2('#2563EB');
        }
      } else {
        setHasColor(false);
        setColor('');
        setColorCode('#000000');
        setIsDualColor(false);
        setColorCode2('#2563EB');
      }
    }
  }, [product]);

  // Quando o grupo muda, limpar a categoria e filtros
  const handleGroupChange = (e) => {
    const newGroup = e.target.value;
    setSelectedGroup(newGroup);
    setCategory('');
    setProductFilters({});
  };

  // 🆕 Atualizar valor de um filtro
  const handleFilterChange = (filterKey, value) => {
    setProductFilters(prev => {
      const updated = { ...prev, [filterKey]: value };
      // Limpar filtros filhos quando o parent muda
      groupFilterDefs.forEach(fd => {
        if (fd.parentKey === filterKey && fd.parentValue !== value) {
          delete updated[fd.key];
        }
      });
      return updated;
    });
  };

  // GERAR SLUG PARA FAMÍLIA
  const generateFamilySlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // 🆕 GERAR SKU AUTOMÁTICO
  const generateSku = () => {
    const groupPrefix = {
      decks: 'DK',
      leashes: 'LS',
      capas: 'CP',
      sarcofagos: 'SF',
      quilhas: 'QL',
      bodyboard: 'BB',
      sup: 'SP',
      acessorios: 'AC',
      outlet: 'OT',
    };
    const prefix = groupPrefix[selectedGroup] || 'XX';
    const random = Math.floor(1000 + Math.random() * 9000);
    setSku(`ES-${prefix}-${random}`);
  };

  // SELECIONAR COR SIMPLES
  const selectPresetColor = (preset) => {
    setColor(preset.name);
    setColorCode(preset.code);
    setIsDualColor(false);
  };

  // SELECIONAR COR DUPLA
  const selectPresetDualColor = (preset) => {
    setColor(preset.name);
    setColorCode(preset.code1);
    setColorCode2(preset.code2);
    setIsDualColor(true);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedGroup) {
        toast.error('Selecione um grupo');
        setIsSubmitting(false);
        return;
      }

      if (!category) {
        toast.error('Selecione uma categoria');
        setIsSubmitting(false);
        return;
      }

      if (stock === '' || parseInt(stock) < 0) {
        toast.error('Defina a quantidade em estoque');
        setIsSubmitting(false);
        return;
      }

      if (hasColor && !color.trim()) {
        toast.error('Defina o nome da cor');
        setIsSubmitting(false);
        return;
      }

      const productData = {
        name,
        description: description.split('\n').filter(line => line.trim()),
        group: selectedGroup,
        category,
        price: parseFloat(price),
        offerPrice: parseFloat(offerPrice),
        stock: parseInt(stock) || 0,
        isMainVariant,
        // 🆕 SKU
        sku: sku.trim() || null,
        // 🆕 Peso
        weight: weight ? Number(weight) : null,
        // 🆕 Dimensões
        dimensions: (dimensions.length || dimensions.width || dimensions.height)
          ? {
              length: Number(dimensions.length) || 0,
              width: Number(dimensions.width) || 0,
              height: Number(dimensions.height) || 0,
            }
          : null,
      };

      // 🆕 Adicionar filtros se algum foi preenchido
      const filledFilters = {};
      Object.entries(productFilters).forEach(([key, value]) => {
        if (value) filledFilters[key] = value;
      });
      if (Object.keys(filledFilters).length > 0) {
        productData.filters = filledFilters;
      } else {
        productData.filters = {};
      }

      // Dados de família/cor
      if (productFamily.trim()) {
        productData.productFamily = generateFamilySlug(productFamily);
      } else {
        productData.productFamily = null;
      }
      
      if (hasColor && color.trim()) {
        productData.color = color;
        productData.colorCode = colorCode;
        
        if (isDualColor && colorCode2) {
          productData.colorCode2 = colorCode2;
        } else {
          productData.colorCode2 = null;
        }
        
        if (!productFamily.trim()) {
          const baseName = name.replace(new RegExp(color, 'gi'), '').trim();
          if (baseName) {
            productData.productFamily = generateFamilySlug(baseName);
          }
        }
      } else {
        productData.color = null;
        productData.colorCode = null;
        productData.colorCode2 = null;
      }

      const formData = new FormData();
      formData.append('id', product._id);
      formData.append('productData', JSON.stringify(productData));

      for (let i = 0; i < files.length; i++) {
        if (files[i]) {
          formData.append('images', files[i]);
        }
      }

      const { data } = await axios.post('/api/product/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        toast.success(data.message);
        onSuccess();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error(error.response?.data?.message || error.message || 'Erro ao atualizar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl'>
          <div>
            <h2 className='text-xl font-bold text-gray-800'>Editar Produto</h2>
            {product.sku && (
              <p className='text-xs text-gray-400 font-mono mt-0.5'>{product.sku}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-lg'
            disabled={isSubmitting}
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-5'>
          {/* Imagens do Produto */}
          <div>
            <p className='text-base font-medium mb-2'>Imagens do Produto</p>
            <p className='text-sm text-gray-600 mb-3'>
              Imagens atuais serão mantidas se não adicionar novas
            </p>

            {/* Imagens Atuais */}
            <div className='mb-3 flex flex-wrap gap-2'>
              {product.image.map((img, index) => (
                <div key={index} className='relative'>
                  <img
                    src={img}
                    alt={`Atual ${index}`}
                    className='w-20 h-20 object-contain border border-gray-300 rounded-lg p-1'
                  />
                  <div className='absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full'>
                    Atual
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Novas Imagens */}
            <div className='flex flex-wrap items-center gap-3'>
              {Array(8).fill('').map((_, index) => (
                <label key={index} htmlFor={`edit-image${index}`}>
                  <input
                    onChange={e => {
                      const updatedFiles = [...files];
                      updatedFiles[index] = e.target.files[0];
                      setFiles(updatedFiles);
                    }}
                    type='file'
                    id={`edit-image${index}`}
                    hidden
                    accept='image/*'
                    disabled={isSubmitting}
                  />
                  <div className='relative'>
                    <img
                      className='max-w-24 cursor-pointer border border-gray-300 rounded-lg p-2'
                      src={files[index] ? URL.createObjectURL(files[index]) : assets.upload_area}
                      alt='Upload'
                      width={100}
                      height={100}
                    />
                    {files[index] && (
                      <div className='absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full'>
                        Nova
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nome do Produto */}
          <div className='flex flex-col gap-1'>
            <label className='text-base font-medium' htmlFor='edit-product-name'>Nome do Produto</label>
            <input
              onChange={e => setName(e.target.value)}
              value={name}
              id='edit-product-name'
              type='text'
              placeholder='Digite o nome'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Descrição */}
          <div className='flex flex-col gap-1'>
            <label className='text-base font-medium' htmlFor='edit-product-description'>Descrição do Produto</label>
            <textarea
              onChange={e => setDescription(e.target.value)}
              value={description}
              id='edit-product-description'
              rows={4}
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors resize-none'
              placeholder='Digite a descrição'
              disabled={isSubmitting}
            ></textarea>
            <p className='text-xs text-gray-500'>Cada linha será um item da lista</p>
          </div>

          {/* GROUP + CATEGORIA em linha */}
          <div className='flex items-start gap-4 flex-wrap'>
            {/* Grupo */}
            <div className='flex-1 flex flex-col gap-1 min-w-[180px]'>
              <label className='text-base font-medium' htmlFor='edit-group'>Grupo</label>
              <select
                onChange={handleGroupChange}
                value={selectedGroup}
                id='edit-group'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                required
                disabled={isSubmitting}
              >
                <option value=''>Selecionar Grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.slug}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p className='text-xs text-gray-500'>Selecione primeiro o grupo</p>
            </div>

            {/* Categoria */}
            <div className='flex-1 flex flex-col gap-1 min-w-[180px]'>
              <label className='text-base font-medium' htmlFor='edit-category'>Categoria</label>
              <select
                onChange={e => setCategory(e.target.value)}
                value={category}
                id='edit-category'
                className={`outline-none py-2.5 px-3 rounded-lg border transition-colors ${
                  !selectedGroup 
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 focus:border-primary'
                }`}
                disabled={!selectedGroup || isSubmitting}
                required
              >
                <option value=''>
                  {selectedGroup ? 'Selecionar Categoria' : 'Selecione um grupo primeiro'}
                </option>
                {filteredCategories.map((item, index) => (
                  <option key={index} value={item.path}>
                    {item.text}
                  </option>
                ))}
              </select>
              {selectedGroup && filteredCategories.length === 0 && (
                <p className='text-xs text-amber-600'>Nenhuma categoria neste grupo ainda</p>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* 🆕 FILTROS DINÂMICOS                                      */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {selectedGroup && visibleFilters.length > 0 && (
            <div className='border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-4'>
              <div className='flex items-center gap-2 mb-1'>
                <svg className='w-5 h-5 text-blue-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
                </svg>
                <h3 className='text-base font-semibold text-blue-800'>
                  Filtros do Produto
                </h3>
              </div>
              <p className='text-xs text-blue-600 -mt-2'>
                Esses filtros permitem que o cliente encontre o produto na página da coleção
              </p>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {visibleFilters.map((filterDef) => (
                  <div key={filterDef.key} className='flex flex-col gap-1'>
                    <label className='text-sm font-medium text-gray-700'>
                      {filterDef.label}
                    </label>
                    <select
                      value={productFilters[filterDef.key] || ''}
                      onChange={e => handleFilterChange(filterDef.key, e.target.value)}
                      className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors text-sm bg-white'
                      disabled={isSubmitting}
                    >
                      <option value=''>— Selecionar —</option>
                      {filterDef.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview dos filtros preenchidos */}
              {Object.keys(productFilters).filter(k => productFilters[k]).length > 0 && (
                <div className='flex flex-wrap gap-2 pt-2 border-t border-blue-200'>
                  {Object.entries(productFilters).map(([key, value]) => {
                    if (!value) return null;
                    const filterDef = groupFilterDefs.find(f => f.key === key);
                    const option = filterDef?.options.find(o => o.value === value);
                    return (
                      <span 
                        key={key}
                        className='inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium'
                      >
                        {filterDef?.label}: {option?.label || value}
                        <button
                          type='button'
                          onClick={() => handleFilterChange(key, '')}
                          className='ml-0.5 hover:text-blue-600'
                          disabled={isSubmitting}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Preços */}
          <div className='flex items-center gap-5 flex-wrap'>
            <div className='flex-1 flex flex-col gap-1 min-w-[120px]'>
              <label className='text-base font-medium' htmlFor='edit-product-price'>Preço Original (R$)</label>
              <input
                onChange={e => setPrice(e.target.value)}
                value={price}
                id='edit-product-price'
                type='number'
                step='0.01'
                placeholder='0.00'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='flex-1 flex flex-col gap-1 min-w-[120px]'>
              <label className='text-base font-medium' htmlFor='edit-offer-price'>Preço de Venda (R$)</label>
              <input
                onChange={e => setOfferPrice(e.target.value)}
                value={offerPrice}
                id='edit-offer-price'
                type='number'
                step='0.01'
                placeholder='0.00'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Estoque */}
          <div className='flex flex-col gap-1'>
            <label className='text-base font-medium' htmlFor='edit-stock'>Quantidade em Estoque</label>
            <input
              onChange={e => setStock(e.target.value)}
              value={stock}
              id='edit-stock'
              type='number'
              min='0'
              placeholder='0'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors max-w-[200px]'
              required
              disabled={isSubmitting}
            />
            <p className='text-xs text-gray-500'>Defina 0 para produto esgotado</p>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* 🆕 CÓDIGO, PESO E DIMENSÕES                               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className='border border-gray-200 bg-gray-50/50 rounded-lg p-4 space-y-5'>
            <div className='flex items-center gap-2'>
              <svg className='w-5 h-5 text-gray-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' />
              </svg>
              <h3 className='text-base font-semibold text-gray-800'>
                Código, Peso e Dimensões
              </h3>
            </div>
            <p className='text-xs text-gray-500 -mt-3'>
              Informações para identificação e cálculo de frete
            </p>

            {/* SKU + Peso */}
            <div className='flex items-start gap-4 flex-wrap'>
              {/* SKU */}
              <div className='flex-1 flex flex-col gap-1 min-w-[200px]'>
                <label className='text-sm font-medium text-gray-700' htmlFor='edit-sku'>
                  Código do Produto (SKU)
                </label>
                <div className='flex gap-2'>
                  <input
                    onChange={e => setSku(e.target.value.toUpperCase())}
                    value={sku}
                    id='edit-sku'
                    type='text'
                    placeholder='ES-DK-1234'
                    className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono uppercase bg-white'
                    disabled={isSubmitting}
                  />
                  <button
                    type='button'
                    onClick={generateSku}
                    disabled={!selectedGroup || isSubmitting}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedGroup && !isSubmitting
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                    title='Gerar código automático'
                  >
                    Gerar
                  </button>
                </div>
                <p className='text-xs text-gray-500'>Código único do produto</p>
              </div>

              {/* Peso */}
              <div className='flex flex-col gap-1 min-w-[160px]'>
                <label className='text-sm font-medium text-gray-700' htmlFor='edit-weight'>
                  Peso Líquido (gramas)
                </label>
                <input
                  onChange={e => setWeight(e.target.value)}
                  value={weight}
                  id='edit-weight'
                  type='number'
                  min='0'
                  step='1'
                  placeholder='0'
                  className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                  disabled={isSubmitting}
                />
                {weight && Number(weight) > 0 ? (
                  <p className='text-xs text-gray-500'>= {(Number(weight) / 1000).toFixed(2)} kg</p>
                ) : (
                  <p className='text-xs text-gray-500'>Para cálculo de frete</p>
                )}
              </div>
            </div>

            {/* Dimensões */}
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>
                Dimensões da Embalagem (cm)
              </label>
              <div className='flex items-center gap-3'>
                <div className='flex-1'>
                  <input
                    type='number' min='0' step='0.1'
                    value={dimensions.length}
                    onChange={e => setDimensions(prev => ({ ...prev, length: e.target.value }))}
                    placeholder='0'
                    className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                    disabled={isSubmitting}
                  />
                  <p className='text-xs text-gray-400 mt-1 text-center'>Comprimento</p>
                </div>
                <span className='text-gray-300 font-bold text-lg'>×</span>
                <div className='flex-1'>
                  <input
                    type='number' min='0' step='0.1'
                    value={dimensions.width}
                    onChange={e => setDimensions(prev => ({ ...prev, width: e.target.value }))}
                    placeholder='0'
                    className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                    disabled={isSubmitting}
                  />
                  <p className='text-xs text-gray-400 mt-1 text-center'>Largura</p>
                </div>
                <span className='text-gray-300 font-bold text-lg'>×</span>
                <div className='flex-1'>
                  <input
                    type='number' min='0' step='0.1'
                    value={dimensions.height}
                    onChange={e => setDimensions(prev => ({ ...prev, height: e.target.value }))}
                    placeholder='0'
                    className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                    disabled={isSubmitting}
                  />
                  <p className='text-xs text-gray-400 mt-1 text-center'>Altura</p>
                </div>
              </div>
              <p className='text-xs text-gray-500'>Para cálculo de frete (Correios / transportadoras)</p>
            </div>
          </div>

          {/* FAMÍLIA DE PRODUTOS */}
          <div className='border-t border-gray-200 pt-5 mt-5'>
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>Família de Produtos (Variantes de Cor)</h3>

            {/* Nome da Família */}
            <div className='flex flex-col gap-1 mb-4'>
              <label className='text-base font-medium' htmlFor='edit-product-family'>Nome da Família</label>
              <input
                onChange={e => setProductFamily(e.target.value)}
                value={productFamily}
                id='edit-product-family'
                type='text'
                placeholder='Ex: Deck J-Bay (deixe em branco se não aplicável)'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                disabled={isSubmitting}
              />
              <p className='text-xs text-gray-500'>Produtos com o mesmo nome de família serão agrupados</p>
            </div>

            {/* Toggle Cor */}
            <div className='flex items-center gap-3 mb-4'>
              <input
                type='checkbox'
                id='edit-hasColor'
                checked={hasColor}
                onChange={e => setHasColor(e.target.checked)}
                className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
                disabled={isSubmitting}
              />
              <label htmlFor='edit-hasColor' className='text-base font-medium cursor-pointer'>
                Este produto tem uma cor específica
              </label>
            </div>

            {/* Campos de Cor */}
            {hasColor && (
              <div className='bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200'>
                
                {/* Toggle Cor Simples / Dupla */}
                <div className='flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='radio'
                      name='editColorType'
                      checked={!isDualColor}
                      onChange={() => setIsDualColor(false)}
                      className='w-4 h-4 text-primary focus:ring-primary'
                      disabled={isSubmitting}
                    />
                    <span className='text-sm font-medium'>Cor Única</span>
                    <div className='w-5 h-5 rounded-full bg-primary'></div>
                  </label>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='radio'
                      name='editColorType'
                      checked={isDualColor}
                      onChange={() => setIsDualColor(true)}
                      className='w-4 h-4 text-primary focus:ring-primary'
                      disabled={isSubmitting}
                    />
                    <span className='text-sm font-medium'>Duas Cores</span>
                    <div 
                      className='w-5 h-5 rounded-full'
                      style={{ background: 'linear-gradient(135deg, #2563EB 50%, #000000 50%)' }}
                    ></div>
                  </label>
                </div>

                {/* Nome da Cor */}
                <div className='flex flex-col gap-1'>
                  <label className='text-sm font-medium'>Nome da Cor</label>
                  <input
                    type='text'
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder={isDualColor ? 'Ex: Preto/Azul' : 'Ex: Preto, Azul Marinho'}
                    className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                    disabled={isSubmitting}
                  />
                </div>

                {/* Seletor de Cores */}
                {!isDualColor ? (
                  <>
                    <div className='flex flex-col gap-1'>
                      <label className='text-sm font-medium'>Código da Cor</label>
                      <div className='flex items-center gap-3'>
                        <input
                          type='color'
                          value={colorCode}
                          onChange={e => setColorCode(e.target.value)}
                          className='w-12 h-10 rounded border border-gray-300 cursor-pointer'
                          disabled={isSubmitting}
                        />
                        <input
                          type='text'
                          value={colorCode}
                          onChange={e => setColorCode(e.target.value)}
                          placeholder='#000000'
                          className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono'
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div>
                      <p className='text-sm font-medium mb-2'>Cores Rápidas:</p>
                      <div className='flex flex-wrap gap-2'>
                        {PRESET_COLORS.map((preset, index) => (
                          <ColorBall
                            key={index}
                            code1={preset.code}
                            size={32}
                            selected={colorCode === preset.code && !isDualColor}
                            onClick={() => !isSubmitting && selectPresetColor(preset)}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='flex flex-col gap-1'>
                        <label className='text-sm font-medium'>Cor 1 (Esquerda)</label>
                        <div className='flex items-center gap-2'>
                          <input
                            type='color' value={colorCode}
                            onChange={e => setColorCode(e.target.value)}
                            className='w-10 h-10 rounded border border-gray-300 cursor-pointer'
                            disabled={isSubmitting}
                          />
                          <input
                            type='text' value={colorCode}
                            onChange={e => setColorCode(e.target.value)}
                            placeholder='#000000'
                            className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono text-sm'
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <div className='flex flex-col gap-1'>
                        <label className='text-sm font-medium'>Cor 2 (Direita)</label>
                        <div className='flex items-center gap-2'>
                          <input
                            type='color' value={colorCode2}
                            onChange={e => setColorCode2(e.target.value)}
                            className='w-10 h-10 rounded border border-gray-300 cursor-pointer'
                            disabled={isSubmitting}
                          />
                          <input
                            type='text' value={colorCode2}
                            onChange={e => setColorCode2(e.target.value)}
                            placeholder='#2563EB'
                            className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono text-sm'
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className='text-sm font-medium mb-2'>Combinações Rápidas:</p>
                      <div className='flex flex-wrap gap-2'>
                        {PRESET_DUAL_COLORS.map((preset, index) => (
                          <ColorBall
                            key={index}
                            code1={preset.code1}
                            code2={preset.code2}
                            size={32}
                            selected={isDualColor && colorCode === preset.code1 && colorCode2 === preset.code2}
                            onClick={() => !isSubmitting && selectPresetDualColor(preset)}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Preview da Cor */}
                {color && (
                  <div className='flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200'>
                    <ColorBall 
                      code1={colorCode} 
                      code2={isDualColor ? colorCode2 : null} 
                      size={40}
                    />
                    <div>
                      <p className='font-medium'>{color}</p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {isDualColor ? `${colorCode} / ${colorCode2}` : colorCode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Produto Principal */}
            <div className='flex items-center gap-3 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
              <input
                type='checkbox'
                id='edit-isMainVariant'
                checked={isMainVariant}
                onChange={e => setIsMainVariant(e.target.checked)}
                className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
                disabled={isSubmitting}
              />
              <div>
                <label htmlFor='edit-isMainVariant' className='text-base font-medium cursor-pointer'>
                  Produto Principal da Família
                </label>
                <p className='text-xs text-gray-600 mt-0.5'>
                  Se marcado, este produto aparece na listagem. Apenas um por família deve ser principal.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className='flex items-center gap-3 pt-4 border-t border-gray-200'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors'
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type='submit'
              className='flex-1 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className='animate-spin h-5 w-5 text-white' viewBox='0 0 24 24'>
                    <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                    <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                  </svg>
                  Atualizando...
                </>
              ) : (
                'Atualizar Produto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;