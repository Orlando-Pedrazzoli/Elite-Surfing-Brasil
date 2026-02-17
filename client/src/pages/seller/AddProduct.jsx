import React, { useState, useMemo, useRef, useCallback } from 'react';
import { assets, categories, groups, getCategoriesByGroup, getFiltersByGroup } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { Upload, X, GripVertical, Image as ImageIcon } from 'lucide-react';

// 🎯 CORES PRÉ-DEFINIDAS (SIMPLES)
const PRESET_COLORS = [
  { name: 'Preto', code: '#000000' },
  { name: 'Branco', code: '#FFFFFF' },
  { name: 'Cinza', code: '#6B7280' },
  { name: 'Vermelho', code: '#DC2626' },
  { name: 'Azul', code: '#2563EB' },
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

// 🆕 TAMANHOS PRÉ-DEFINIDOS (para capas e sarcófagos)
const PRESET_SIZES = [
  "5'10", "6'0", "6'2", "6'3", "6'4", "6'6", "6'8",
  "7'0", "7'2", "7'6",
  "8'0", "8'5",
  "9'2", "9'6", "9'8",
  "10'0", "10'5",
  "11'0", "11'6",
  "12'6", "14'0",
];

const MAX_IMAGES = 8;

// 🆕 Componente para renderizar bolinha de cor (simples ou dupla)
const ColorBall = ({ code1, code2, size = 32, selected = false, onClick, title }) => {
  const isDual = code2 && code2 !== code1;
  const isLight = (code) => ['#FFFFFF', '#FFF', '#ffffff', '#fff', '#F5F5F5', '#FAFAFA'].includes(code);
  
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

// 🆕 Componente SizeBadge para preview de tamanho
const SizeBadge = ({ label, size = 'md', selected = false, onClick, title }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      className={`rounded-lg font-medium transition-all duration-200 hover:scale-105 ${sizeClasses[size]} ${
        selected
          ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🆕 IMAGE UPLOAD COMPONENT — Drag & Drop + Multi-select
// ═══════════════════════════════════════════════════════════════
const ImageUploadZone = ({ files, setFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Adicionar ficheiros (validação + limite)
  const addFiles = useCallback((newFiles) => {
    const imageFiles = Array.from(newFiles).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" não é uma imagem`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" excede 10MB`);
        return false;
      }
      return true;
    });

    if (imageFiles.length === 0) return;

    setFiles(prev => {
      const current = prev.filter(Boolean);
      const available = MAX_IMAGES - current.length;

      if (available <= 0) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        return prev;
      }

      const toAdd = imageFiles.slice(0, available);
      if (imageFiles.length > available) {
        toast(`Apenas ${available} imagem(ns) adicionada(s) (limite: ${MAX_IMAGES})`, { icon: 'ℹ️' });
      }

      const updated = [...current, ...toAdd];
      return updated;
    });
  }, [setFiles]);

  // Remover imagem
  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, [setFiles]);

  // Drag & Drop — zona de upload
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  // Click para abrir file picker
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Drag & Drop — reordenar thumbnails
  const handleThumbDragStart = (e, index) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleThumbDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceIndex !== null && dragSourceIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleThumbDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
      setFiles(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(dragSourceIndex, 1);
        updated.splice(targetIndex, 0, moved);
        return updated;
      });
    }
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const handleThumbDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const activeFiles = files.filter(Boolean);
  const slotsLeft = MAX_IMAGES - activeFiles.length;

  return (
    <div>
      <p className='text-base font-medium mb-2'>Imagens do Produto</p>

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={slotsLeft > 0 ? handleClickUpload : undefined}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          slotsLeft <= 0
            ? 'border-gray-200 bg-gray-50 cursor-default'
            : isDragging
              ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg'
              : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          multiple
          onChange={handleFileInput}
          className='hidden'
        />

        {isDragging ? (
          <div className='py-4'>
            <Upload className='w-10 h-10 text-primary mx-auto mb-2 animate-bounce' />
            <p className='text-primary font-semibold text-lg'>Solte as imagens aqui</p>
          </div>
        ) : slotsLeft > 0 ? (
          <div className='py-2'>
            <div className='flex items-center justify-center gap-3 mb-3'>
              <div className='w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center'>
                <ImageIcon className='w-6 h-6 text-gray-400' />
              </div>
            </div>
            <p className='text-gray-700 font-medium'>
              Arraste imagens aqui ou <span className='text-primary underline'>clique para selecionar</span>
            </p>
            <p className='text-xs text-gray-400 mt-1.5'>
              PNG, JPG ou WEBP • Máx. 10MB por imagem • {slotsLeft} de {MAX_IMAGES} disponíveis
            </p>
          </div>
        ) : (
          <div className='py-2'>
            <p className='text-gray-500 font-medium'>Limite de {MAX_IMAGES} imagens atingido</p>
            <p className='text-xs text-gray-400 mt-1'>Remova uma imagem para adicionar outra</p>
          </div>
        )}
      </div>

      {/* Thumbnails grid */}
      {activeFiles.length > 0 && (
        <div className='mt-4'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-sm font-medium text-gray-600'>
              {activeFiles.length} imagem{activeFiles.length !== 1 ? 's' : ''} adicionada{activeFiles.length !== 1 ? 's' : ''}
            </p>
            {activeFiles.length > 1 && (
              <p className='text-xs text-gray-400'>Arraste para reordenar • A primeira é a imagem principal</p>
            )}
          </div>

          <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3'>
            {activeFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                draggable
                onDragStart={(e) => handleThumbDragStart(e, index)}
                onDragOver={(e) => handleThumbDragOver(e, index)}
                onDrop={(e) => handleThumbDrop(e, index)}
                onDragEnd={handleThumbDragEnd}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-150 aspect-square ${
                  dragOverIndex === index
                    ? 'border-primary scale-105 shadow-md'
                    : dragSourceIndex === index
                      ? 'border-gray-300 opacity-40'
                      : index === 0
                        ? 'border-primary/50 ring-1 ring-primary/20'
                        : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Imagem ${index + 1}`}
                  className='w-full h-full object-cover'
                />

                {/* Overlay com ações */}
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150'>
                  {/* Botão remover */}
                  <button
                    type='button'
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className='absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm'
                    title='Remover imagem'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>

                  {/* Indicador drag */}
                  <div className='absolute bottom-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing'>
                    <GripVertical className='w-4 h-4 text-white drop-shadow' />
                  </div>
                </div>

                {/* Badge principal */}
                {index === 0 && (
                  <div className='absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm'>
                    Principal
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Ação limpar todas */}
          {activeFiles.length > 1 && (
            <button
              type='button'
              onClick={() => setFiles([])}
              className='mt-3 text-xs text-red-500 hover:text-red-700 transition-colors font-medium'
            >
              Remover todas as imagens
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const AddProduct = () => {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // GROUP + CATEGORY
  const [selectedGroup, setSelectedGroup] = useState('');
  const [category, setCategory] = useState('');
  
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  
  // STOCK
  const [stock, setStock] = useState('');

  // 🆕 SKU + PESO + DIMENSÕES
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  
  // 🆕 FILTROS DINÂMICOS (baseados no grupo selecionado)
  const [productFilters, setProductFilters] = useState({});

  // SISTEMA DE FAMÍLIA/COR
  const [productFamily, setProductFamily] = useState('');
  const [hasColor, setHasColor] = useState(false);
  const [color, setColor] = useState('');
  const [colorCode, setColorCode] = useState('#000000');
  
  // COR DUPLA
  const [isDualColor, setIsDualColor] = useState(false);
  const [colorCode2, setColorCode2] = useState('#2563EB');
  
  const [isMainVariant, setIsMainVariant] = useState(true);

  // 🆕 SISTEMA DE VARIANTE POR TAMANHO
  const [variantType, setVariantType] = useState('color'); // 'color' ou 'size'
  const [hasSize, setHasSize] = useState(false);
  const [sizeValue, setSizeValue] = useState('');

  const { axios, fetchProducts } = useAppContext();

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
      groupFilterDefs.forEach(fd => {
        if (fd.parentKey === filterKey && fd.parentValue !== value) {
          delete updated[fd.key];
        }
      });
      return updated;
    });
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
    const generated = `ES-${prefix}-${random}`;
    setSku(generated);
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

  // 🆕 Handler para trocar tipo de variante
  const handleVariantTypeChange = (type) => {
    setVariantType(type);
    if (type === 'color') {
      // Limpar dados de tamanho
      setHasSize(false);
      setSizeValue('');
    } else {
      // Limpar dados de cor
      setHasColor(false);
      setColor('');
      setColorCode('#000000');
      setColorCode2('#2563EB');
      setIsDualColor(false);
    }
  };

  const onSubmitHandler = async event => {
    try {
      event.preventDefault();

      const activeFiles = files.filter(Boolean);

      if (activeFiles.length === 0) {
        toast.error('Adicione pelo menos uma imagem');
        return;
      }

      if (!selectedGroup) {
        toast.error('Selecione um grupo');
        return;
      }

      if (!category) {
        toast.error('Selecione uma categoria');
        return;
      }

      if (stock === '' || parseInt(stock) < 0) {
        toast.error('Defina a quantidade em estoque');
        return;
      }

      if (hasColor && !color.trim()) {
        toast.error('Defina o nome da cor');
        return;
      }

      // 🆕 Validação de tamanho
      if (hasSize && !sizeValue.trim()) {
        toast.error('Defina o tamanho do produto');
        return;
      }

      const productData = {
        name,
        description: description.split('\n').filter(line => line.trim()),
        group: selectedGroup,
        category,
        price: Number(price),
        offerPrice: Number(offerPrice),
        stock: parseInt(stock) || 0,
        isMainVariant,
        // 🆕 SKU
        sku: sku.trim() || undefined,
        // 🆕 Peso
        weight: weight ? Number(weight) : undefined,
        // 🆕 Dimensões
        dimensions: (dimensions.length || dimensions.width || dimensions.height)
          ? {
              length: Number(dimensions.length) || 0,
              width: Number(dimensions.width) || 0,
              height: Number(dimensions.height) || 0,
            }
          : undefined,
      };

      // Adicionar filtros se algum foi preenchido
      const filledFilters = {};
      Object.entries(productFilters).forEach(([key, value]) => {
        if (value) filledFilters[key] = value;
      });
      if (Object.keys(filledFilters).length > 0) {
        productData.filters = filledFilters;
      }

      // Adicionar dados de família/cor se definidos
      if (productFamily.trim()) {
        productData.productFamily = generateFamilySlug(productFamily);
      }
      
      if (hasColor && color.trim()) {
        productData.variantType = 'color';
        productData.color = color;
        productData.colorCode = colorCode;
        
        if (isDualColor && colorCode2) {
          productData.colorCode2 = colorCode2;
        }
        
        if (!productFamily.trim()) {
          const baseName = name.replace(new RegExp(color, 'gi'), '').trim();
          if (baseName) {
            productData.productFamily = generateFamilySlug(baseName);
          }
        }
      }

      // 🆕 Adicionar dados de tamanho se definidos
      if (hasSize && sizeValue.trim()) {
        productData.variantType = 'size';
        productData.size = sizeValue.trim();
        
        if (!productFamily.trim()) {
          // Gerar família automaticamente removendo o tamanho do nome
          const baseName = name.replace(new RegExp(sizeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
          if (baseName) {
            productData.productFamily = generateFamilySlug(baseName);
          }
        }
      }

      const formData = new FormData();
      formData.append('productData', JSON.stringify(productData));
      for (let i = 0; i < activeFiles.length; i++) {
        formData.append('images', activeFiles[i]);
      }

      const { data } = await axios.post('/api/product/add', formData);

      if (data.success) {
        toast.success('Produto adicionado com sucesso!');
        
        await fetchProducts();
        
        // Reset form
        setName('');
        setDescription('');
        setSelectedGroup('');
        setCategory('');
        setPrice('');
        setOfferPrice('');
        setStock('');
        setSku('');
        setWeight('');
        setDimensions({ length: '', width: '', height: '' });
        setFiles([]);
        setProductFilters({});
        setProductFamily('');
        setVariantType('color');
        setHasColor(false);
        setColor('');
        setColorCode('#000000');
        setColorCode2('#2563EB');
        setIsDualColor(false);
        setHasSize(false);
        setSizeValue('');
        setIsMainVariant(true);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto'>
      <form onSubmit={onSubmitHandler} className='p-6 md:p-8 space-y-5 max-w-2xl'>
        
        <h2 className='text-2xl font-bold text-gray-800 mb-6'>Adicionar Produto</h2>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* 🆕 DRAG & DROP IMAGE UPLOAD                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        <ImageUploadZone files={files} setFiles={setFiles} />

        {/* Nome */}
        <div className='flex flex-col gap-1'>
          <label className='text-base font-medium' htmlFor='product-name'>
            Nome do Produto
          </label>
          <input
            onChange={e => setName(e.target.value)}
            value={name}
            id='product-name'
            type='text'
            placeholder='Ex: Deck J-Bay Preto'
            className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
            required
          />
        </div>

        {/* Descrição */}
        <div className='flex flex-col gap-1'>
          <label className='text-base font-medium' htmlFor='product-description'>
            Descrição / Especificações
          </label>
          <textarea
            onChange={e => setDescription(e.target.value)}
            value={description}
            id='product-description'
            rows={4}
            className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors resize-none'
            placeholder='Escreva cada especificação numa linha separada'
          ></textarea>
          <p className='text-xs text-gray-500'>Cada linha será um item da lista</p>
        </div>

        {/* GROUP + CATEGORIA em linha */}
        <div className='flex items-start gap-4 flex-wrap'>
          {/* Grupo */}
          <div className='flex-1 flex flex-col gap-1 min-w-[180px]'>
            <label className='text-base font-medium' htmlFor='group'>
              Grupo
            </label>
            <select
              onChange={handleGroupChange}
              value={selectedGroup}
              id='group'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
              required
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
            <label className='text-base font-medium' htmlFor='category'>
              Categoria
            </label>
            <select
              onChange={e => setCategory(e.target.value)}
              value={category}
              id='category'
              className={`outline-none py-2.5 px-3 rounded-lg border transition-colors ${
                !selectedGroup 
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                  : 'border-gray-300 focus:border-primary'
              }`}
              disabled={!selectedGroup}
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
          <div className='flex-1 flex flex-col gap-1 min-w-[140px]'>
            <label className='text-base font-medium' htmlFor='product-price'>
              Preço Original (R$)
            </label>
            <input
              onChange={e => setPrice(e.target.value)}
              value={price}
              id='product-price'
              type='number'
              step='0.01'
              placeholder='0.00'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
              required
            />
          </div>
          <div className='flex-1 flex flex-col gap-1 min-w-[140px]'>
            <label className='text-base font-medium' htmlFor='offer-price'>
              Preço de Venda (R$)
            </label>
            <input
              onChange={e => setOfferPrice(e.target.value)}
              value={offerPrice}
              id='offer-price'
              type='number'
              step='0.01'
              placeholder='0.00'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
              required
            />
          </div>
        </div>

        {/* STOCK */}
        <div className='flex flex-col gap-1'>
          <label className='text-base font-medium' htmlFor='stock'>
            Quantidade em Estoque
          </label>
          <input
            onChange={e => setStock(e.target.value)}
            value={stock}
            id='stock'
            type='number'
            min='0'
            placeholder='0'
            className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors max-w-[200px]'
            required
          />
          <p className='text-xs text-gray-500'>Defina 0 para produto esgotado</p>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 🆕 SKU + PESO + DIMENSÕES — Dados para Frete              */}
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
            Informações necessárias para identificação e cálculo de frete
          </p>

          {/* SKU + Peso em linha */}
          <div className='flex items-start gap-4 flex-wrap'>
            {/* SKU */}
            <div className='flex-1 flex flex-col gap-1 min-w-[200px]'>
              <label className='text-sm font-medium text-gray-700' htmlFor='sku'>
                Código do Produto (SKU)
              </label>
              <div className='flex gap-2'>
                <input
                  onChange={e => setSku(e.target.value.toUpperCase())}
                  value={sku}
                  id='sku'
                  type='text'
                  placeholder='ES-DK-1234'
                  className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono uppercase bg-white'
                />
                <button
                  type='button'
                  onClick={generateSku}
                  disabled={!selectedGroup}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedGroup
                      ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                  title='Gerar código automático'
                >
                  Gerar
                </button>
              </div>
              <p className='text-xs text-gray-500'>
                Código único — gerado automaticamente ou personalizado
              </p>
            </div>

            {/* Peso */}
            <div className='flex flex-col gap-1 min-w-[160px]'>
              <label className='text-sm font-medium text-gray-700' htmlFor='weight'>
                Peso Líquido (gramas)
              </label>
              <input
                onChange={e => setWeight(e.target.value)}
                value={weight}
                id='weight'
                type='number'
                min='0'
                step='1'
                placeholder='0'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
              />
              {weight && Number(weight) > 0 ? (
                <p className='text-xs text-gray-500'>
                  = {(Number(weight) / 1000).toFixed(2)} kg
                </p>
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
                  type='number'
                  min='0'
                  step='0.1'
                  value={dimensions.length}
                  onChange={e => setDimensions(prev => ({ ...prev, length: e.target.value }))}
                  placeholder='0'
                  className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                />
                <p className='text-xs text-gray-400 mt-1 text-center'>Comprimento</p>
              </div>
              <span className='text-gray-300 font-bold text-lg'>×</span>
              <div className='flex-1'>
                <input
                  type='number'
                  min='0'
                  step='0.1'
                  value={dimensions.width}
                  onChange={e => setDimensions(prev => ({ ...prev, width: e.target.value }))}
                  placeholder='0'
                  className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                />
                <p className='text-xs text-gray-400 mt-1 text-center'>Largura</p>
              </div>
              <span className='text-gray-300 font-bold text-lg'>×</span>
              <div className='flex-1'>
                <input
                  type='number'
                  min='0'
                  step='0.1'
                  value={dimensions.height}
                  onChange={e => setDimensions(prev => ({ ...prev, height: e.target.value }))}
                  placeholder='0'
                  className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors bg-white'
                />
                <p className='text-xs text-gray-400 mt-1 text-center'>Altura</p>
              </div>
            </div>
            <p className='text-xs text-gray-500'>Necessário para cálculo de frete (Correios / transportadoras)</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FAMÍLIA DE PRODUTOS (Variantes de Cor ou Tamanho)          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className='border-t border-gray-200 pt-6 mt-6'>
          <h3 className='text-lg font-semibold text-gray-800 mb-4'>
            Família de Produtos (Variantes)
          </h3>
          <p className='text-sm text-gray-600 mb-4'>
            Se este produto faz parte de uma família com várias cores ou tamanhos, 
            defina a família abaixo. Produtos da mesma família permitem alternar entre variantes na página do produto.
          </p>

          {/* Nome da Família */}
          <div className='flex flex-col gap-1 mb-4'>
            <label className='text-base font-medium' htmlFor='product-family'>
              Nome da Família
            </label>
            <input
              onChange={e => setProductFamily(e.target.value)}
              value={productFamily}
              id='product-family'
              type='text'
              placeholder='Ex: Deck J-Bay ou Capa Refletiva Combate Shortboard (deixe em branco se não aplicável)'
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
            />
            <p className='text-xs text-gray-500'>
              Produtos com o mesmo nome de família serão agrupados (gera slug automático)
            </p>
          </div>

          {/* 🆕 Toggle Tipo de Variante */}
          <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4'>
            <span className='text-sm font-medium text-gray-700'>Tipo de Variante:</span>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='radio'
                name='variantType'
                checked={variantType === 'color'}
                onChange={() => handleVariantTypeChange('color')}
                className='w-4 h-4 text-primary focus:ring-primary'
              />
              <span className='text-sm font-medium'>Cor</span>
              <div className='w-4 h-4 rounded-full bg-primary'></div>
            </label>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='radio'
                name='variantType'
                checked={variantType === 'size'}
                onChange={() => handleVariantTypeChange('size')}
                className='w-4 h-4 text-primary focus:ring-primary'
              />
              <span className='text-sm font-medium'>Tamanho</span>
              <span className='text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium'>6'0</span>
            </label>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* VARIANTE POR COR (existente — sem alterações)  */}
          {/* ═══════════════════════════════════════════════ */}
          {variantType === 'color' && (
            <>
              {/* Toggle Cor */}
              <div className='flex items-center gap-3 mb-4'>
                <input
                  type='checkbox'
                  id='hasColor'
                  checked={hasColor}
                  onChange={e => setHasColor(e.target.checked)}
                  className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
                />
                <label htmlFor='hasColor' className='text-base font-medium cursor-pointer'>
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
                        name='colorType'
                        checked={!isDualColor}
                        onChange={() => setIsDualColor(false)}
                        className='w-4 h-4 text-primary focus:ring-primary'
                      />
                      <span className='text-sm font-medium'>Cor Única</span>
                      <div className='w-5 h-5 rounded-full bg-primary'></div>
                    </label>
                    <label className='flex items-center gap-2 cursor-pointer'>
                      <input
                        type='radio'
                        name='colorType'
                        checked={isDualColor}
                        onChange={() => setIsDualColor(true)}
                        className='w-4 h-4 text-primary focus:ring-primary'
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
                    />
                  </div>

                  {/* Seletor de Cores - Simples ou Dupla */}
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
                          />
                          <input
                            type='text'
                            value={colorCode}
                            onChange={e => setColorCode(e.target.value)}
                            placeholder='#000000'
                            className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono'
                          />
                        </div>
                      </div>

                      {/* Cores Rápidas - Simples */}
                      <div>
                        <p className='text-sm font-medium mb-2'>Cores Rápidas:</p>
                        <div className='flex flex-wrap gap-2'>
                          {PRESET_COLORS.map((preset, index) => (
                            <ColorBall
                              key={index}
                              code1={preset.code}
                              size={32}
                              selected={colorCode === preset.code && !isDualColor}
                              onClick={() => selectPresetColor(preset)}
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
                              type='color'
                              value={colorCode}
                              onChange={e => setColorCode(e.target.value)}
                              className='w-10 h-10 rounded border border-gray-300 cursor-pointer'
                            />
                            <input
                              type='text'
                              value={colorCode}
                              onChange={e => setColorCode(e.target.value)}
                              placeholder='#000000'
                              className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono text-sm'
                            />
                          </div>
                        </div>
                        
                        <div className='flex flex-col gap-1'>
                          <label className='text-sm font-medium'>Cor 2 (Direita)</label>
                          <div className='flex items-center gap-2'>
                            <input
                              type='color'
                              value={colorCode2}
                              onChange={e => setColorCode2(e.target.value)}
                              className='w-10 h-10 rounded border border-gray-300 cursor-pointer'
                            />
                            <input
                              type='text'
                              value={colorCode2}
                              onChange={e => setColorCode2(e.target.value)}
                              placeholder='#2563EB'
                              className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors flex-1 font-mono text-sm'
                            />
                          </div>
                        </div>
                      </div>

                      {/* Cores Rápidas - Duplas */}
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
                              onClick={() => selectPresetDualColor(preset)}
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
            </>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* 🆕 VARIANTE POR TAMANHO                        */}
          {/* ═══════════════════════════════════════════════ */}
          {variantType === 'size' && (
            <>
              {/* Toggle Tamanho */}
              <div className='flex items-center gap-3 mb-4'>
                <input
                  type='checkbox'
                  id='hasSize'
                  checked={hasSize}
                  onChange={e => setHasSize(e.target.checked)}
                  className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
                />
                <label htmlFor='hasSize' className='text-base font-medium cursor-pointer'>
                  Este produto tem um tamanho específico
                </label>
              </div>

              {/* Campos de Tamanho */}
              {hasSize && (
                <div className='bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200'>
                  
                  {/* Input Manual */}
                  <div className='flex flex-col gap-1'>
                    <label className='text-sm font-medium'>Tamanho</label>
                    <input
                      type='text'
                      value={sizeValue}
                      onChange={e => setSizeValue(e.target.value)}
                      placeholder="Ex: 6'0, 7'2, 10'0"
                      className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors max-w-[200px]'
                    />
                  </div>

                  {/* Tamanhos Rápidos */}
                  <div>
                    <p className='text-sm font-medium mb-2'>Tamanhos Rápidos:</p>
                    <div className='flex flex-wrap gap-2'>
                      {PRESET_SIZES.map((preset) => (
                        <SizeBadge
                          key={preset}
                          label={preset}
                          size='sm'
                          selected={sizeValue === preset}
                          onClick={() => setSizeValue(preset)}
                          title={`Selecionar ${preset}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview do Tamanho */}
                  {sizeValue && (
                    <div className='flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200'>
                      <span className='bg-primary text-white text-sm font-semibold px-3 py-1.5 rounded-lg'>
                        {sizeValue}
                      </span>
                      <div>
                        <p className='font-medium'>Tamanho: {sizeValue}</p>
                        <p className='text-xs text-gray-500'>
                          Este tamanho será exibido como badge na página do produto
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Produto Principal */}
          <div className='flex items-center gap-3 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
            <input
              type='checkbox'
              id='isMainVariant'
              checked={isMainVariant}
              onChange={e => setIsMainVariant(e.target.checked)}
              className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
            />
            <div>
              <label htmlFor='isMainVariant' className='text-base font-medium cursor-pointer'>
                Produto Principal da Família
              </label>
              <p className='text-xs text-gray-600 mt-0.5'>
                Se marcado, este produto aparece na listagem. Apenas um por família deve ser principal.
              </p>
            </div>
          </div>
        </div>

        {/* Botão Submit */}
        <button 
          type='submit'
          className='w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dull transition-colors mt-6'
        >
          Adicionar Produto
        </button>
      </form>
    </div>
  );
};

export default AddProduct;