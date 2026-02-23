import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { assets, categories, groups, getCategoriesByGroup, getFiltersByGroup, AVAILABLE_TAGS } from '../../assets/assets';
import toast from 'react-hot-toast';
import { Upload, X, GripVertical, Image as ImageIcon } from 'lucide-react';

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

// 🆕 TAMANHOS PRÉ-DEFINIDOS (para capas, sarcófagos e acessórios)
const PRESET_SIZES = [
  "P", "M", "G", "GG",
  "5'10", "6'0", "6'2", "6'3", "6'4", "6'6", "6'8",
  "7'0", "7'2", "7'6",
  "8'0", "8'5",
  "9'2", "9'6", "9'8",
  "10'0", "10'5",
  "11'0", "11'6",
  "12'6", "14'0",
];

const MAX_IMAGES = 8;

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

// 🆕 Componente SizeBadge para preview de tamanho
const SizeBadge = ({ label, size = 'md', selected = false, onClick, title, disabled = false }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded-lg font-medium transition-all duration-200 hover:scale-105 ${sizeClasses[size]} ${
        selected
          ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🆕 EDIT IMAGE ZONE — Imagens atuais + Novas com Drag & Drop
// ═══════════════════════════════════════════════════════════════
// Cada item no array `images` é:
//   { type: 'existing', url: '...' }   ← imagem já salva no servidor
//   { type: 'new', file: File }        ← imagem nova (upload)
// ═══════════════════════════════════════════════════════════════
const EditImageZone = ({ images, setImages, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

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

    setImages(prev => {
      const available = MAX_IMAGES - prev.length;
      if (available <= 0) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        return prev;
      }
      const toAdd = imageFiles.slice(0, available).map(file => ({ type: 'new', file }));
      if (imageFiles.length > available) {
        toast(`Apenas ${available} imagem(ns) adicionada(s) (limite: ${MAX_IMAGES})`, { icon: 'ℹ️' });
      }
      return [...prev, ...toAdd];
    });
  }, [setImages]);

  const removeImage = useCallback((index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, [setImages]);

  // Drag & Drop — zona de upload
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
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

  const handleClickUpload = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Drag & Drop — reordenar thumbnails
  const handleThumbDragStart = (e, index) => {
    if (disabled) return;
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
      setImages(prev => {
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

  const slotsLeft = MAX_IMAGES - images.length;

  const getImageSrc = (img) => {
    return img.type === 'existing' ? img.url : URL.createObjectURL(img.file);
  };

  return (
    <div>
      <p className='text-base font-medium mb-2'>Imagens do Produto</p>

      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <p className='text-sm font-medium text-gray-600'>
              {images.length} imagem{images.length !== 1 ? 's' : ''}
            </p>
            {images.length > 1 && (
              <p className='text-xs text-gray-400'>Arraste para reordenar • A primeira é a imagem principal</p>
            )}
          </div>

          <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3'>
            {images.map((img, index) => (
              <div
                key={`${img.type}-${img.type === 'existing' ? img.url : img.file.name}-${index}`}
                draggable={!disabled}
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
                  src={getImageSrc(img)}
                  alt={`Imagem ${index + 1}`}
                  className='w-full h-full object-cover'
                />

                {/* Overlay com ações */}
                <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150'>
                  {/* Botão remover */}
                  {!disabled && (
                    <button
                      type='button'
                      onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                      className='absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm'
                      title='Remover imagem'
                    >
                      <X className='w-3.5 h-3.5' />
                    </button>
                  )}

                  {/* Indicador drag */}
                  {!disabled && (
                    <div className='absolute bottom-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing'>
                      <GripVertical className='w-4 h-4 text-white drop-shadow' />
                    </div>
                  )}
                </div>

                {/* Badge principal */}
                {index === 0 && (
                  <div className='absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm'>
                    Principal
                  </div>
                )}

                {/* Badge tipo */}
                {img.type === 'new' && (
                  <div className='absolute bottom-1 right-1 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm'>
                    Nova
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone para adicionar mais */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={slotsLeft > 0 && !disabled ? handleClickUpload : undefined}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
          slotsLeft <= 0 || disabled
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
          disabled={disabled}
        />

        {isDragging ? (
          <div className='py-2'>
            <Upload className='w-8 h-8 text-primary mx-auto mb-1 animate-bounce' />
            <p className='text-primary font-semibold'>Solte as imagens aqui</p>
          </div>
        ) : slotsLeft > 0 && !disabled ? (
          <div className='py-1'>
            <div className='flex items-center justify-center gap-2 mb-1'>
              <ImageIcon className='w-5 h-5 text-gray-400' />
              <p className='text-gray-700 font-medium text-sm'>
                Arraste ou <span className='text-primary underline'>clique para adicionar</span>
              </p>
            </div>
            <p className='text-xs text-gray-400'>
              PNG, JPG ou WEBP • Máx. 10MB • {slotsLeft} de {MAX_IMAGES} disponíveis
            </p>
          </div>
        ) : (
          <p className='text-gray-500 text-sm py-1'>
            {disabled ? 'Enviando...' : `Limite de ${MAX_IMAGES} imagens atingido`}
          </p>
        )}
      </div>

      {/* Ação limpar todas */}
      {images.length > 1 && !disabled && (
        <button
          type='button'
          onClick={() => setImages([])}
          className='mt-2 text-xs text-red-500 hover:text-red-700 transition-colors font-medium'
        >
          Remover todas as imagens
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const EditProductModal = ({ product, onClose, onSuccess, axios }) => {
  // 🆕 Sistema de imagens unificado: [{ type: 'existing', url }, { type: 'new', file }]
  const [images, setImages] = useState([]);
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

  // SKU + PESO + DIMENSÕES
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });

  // FILTROS DINÂMICOS
  const [productFilters, setProductFilters] = useState({});

  // SISTEMA DE FAMÍLIA
  const [productFamily, setProductFamily] = useState('');
  const [isMainVariant, setIsMainVariant] = useState(true);

  // 🆕 TIPO DE VARIANTE
  const [variantType, setVariantType] = useState('color');

  // VARIANTE POR COR
  const [hasColor, setHasColor] = useState(false);
  const [color, setColor] = useState('');
  const [colorCode, setColorCode] = useState('#000000');
  const [isDualColor, setIsDualColor] = useState(false);
  const [colorCode2, setColorCode2] = useState('#2563EB');

  // 🆕 VARIANTE POR TAMANHO
  const [hasSize, setHasSize] = useState(false);
  const [sizeValue, setSizeValue] = useState('');

  // ═══════════════════════════════════════════════════════════════
  // 🆕 TAGS TRANSVERSAIS + FRETE GRÁTIS
  // ═══════════════════════════════════════════════════════════════
  const [selectedTags, setSelectedTags] = useState([]);
  const [freeShipping, setFreeShipping] = useState(false);

  // Filtrar categorias baseado no grupo selecionado
  const filteredCategories = useMemo(() => {
    if (!selectedGroup) return [];
    return getCategoriesByGroup(selectedGroup);
  }, [selectedGroup]);

  // Obter filtros disponíveis para o grupo selecionado
  const groupFilterDefs = useMemo(() => {
    if (!selectedGroup) return [];
    return getFiltersByGroup(selectedGroup);
  }, [selectedGroup]);

  // Filtros visíveis (respeita parent-child)
  const visibleFilters = useMemo(() => {
    return groupFilterDefs.filter(filterDef => {
      if (!filterDef.parentKey) return true;
      return productFilters[filterDef.parentKey] === filterDef.parentValue;
    });
  }, [groupFilterDefs, productFilters]);

  // 🆕 Sugerir tags automaticamente baseado nos filtros preenchidos
  const suggestedTags = useMemo(() => {
    const suggestions = [];
    const filters = productFilters || {};

    // SUP: se boardType contém 'standup' ou tipo contém 'sup'
    if (filters.boardType === 'standup' || filters.tipo === 'sup') {
      if (!selectedTags.includes('sup')) suggestions.push('sup');
    }

    // Bodyboard: se boardType contém 'bodyboard'
    if (filters.boardType === 'bodyboard') {
      if (!selectedTags.includes('bodyboard')) suggestions.push('bodyboard');
    }

    // Outlet: se tem desconto significativo (15%+)
    if (price && offerPrice && Number(offerPrice) < Number(price) * 0.85) {
      if (!selectedTags.includes('outlet')) suggestions.push('outlet');
    }

    return suggestions;
  }, [productFilters, selectedTags, price, offerPrice]);

  // 🆕 Toggle de tag
  const toggleTag = (tagValue) => {
    setSelectedTags(prev => 
      prev.includes(tagValue) 
        ? prev.filter(t => t !== tagValue) 
        : [...prev, tagValue]
    );
  };

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
      
      // SKU + Peso + Dimensões
      setSku(product.sku || '');
      setWeight(product.weight ? product.weight.toString() : '');
      setDimensions({
        length: product.dimensions?.length ? product.dimensions.length.toString() : '',
        width: product.dimensions?.width ? product.dimensions.width.toString() : '',
        height: product.dimensions?.height ? product.dimensions.height.toString() : '',
      });

      // Filtros do produto
      if (product.filters) {
        const filters = product.filters instanceof Map 
          ? Object.fromEntries(product.filters) 
          : (product.filters || {});
        setProductFilters(filters);
      } else {
        setProductFilters({});
      }
      
      // Família
      setProductFamily(product.productFamily || '');
      setIsMainVariant(product.isMainVariant !== false);
      
      // 🆕 Tipo de variante + dados
      const vType = product.variantType || 'color';
      setVariantType(vType);

      if (vType === 'size' && product.size) {
        setHasSize(true);
        setSizeValue(product.size || '');
        setHasColor(false);
        setColor('');
        setColorCode('#000000');
        setIsDualColor(false);
        setColorCode2('#2563EB');
      } else if (product.color || product.colorCode) {
        setHasColor(true);
        setColor(product.color || '');
        setColorCode(product.colorCode || '#000000');
        setHasSize(false);
        setSizeValue('');
        
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
        setHasSize(false);
        setSizeValue('');
      }

      // 🆕 Tags e Frete Grátis
      setSelectedTags(product.tags || []);
      setFreeShipping(product.freeShipping || false);

      // 🆕 Imagens existentes
      if (product.image && product.image.length > 0) {
        setImages(product.image.map(url => ({ type: 'existing', url })));
      } else {
        setImages([]);
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

  // Atualizar valor de um filtro
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

  // GERAR SLUG PARA FAMÍLIA
  const generateFamilySlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // GERAR SKU AUTOMÁTICO
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

  // 🆕 Handler para trocar tipo de variante
  const handleVariantTypeChange = (type) => {
    setVariantType(type);
    if (type === 'color') {
      setHasSize(false);
      setSizeValue('');
    } else {
      setHasColor(false);
      setColor('');
      setColorCode('#000000');
      setColorCode2('#2563EB');
      setIsDualColor(false);
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (images.length === 0) {
        toast.error('Adicione pelo menos uma imagem');
        setIsSubmitting(false);
        return;
      }

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

      // 🆕 Validação de tamanho
      if (hasSize && !sizeValue.trim()) {
        toast.error('Defina o tamanho do produto');
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
        sku: sku.trim() || null,
        weight: weight ? Number(weight) : null,
        dimensions: (dimensions.length || dimensions.width || dimensions.height)
          ? {
              length: Number(dimensions.length) || 0,
              width: Number(dimensions.width) || 0,
              height: Number(dimensions.height) || 0,
            }
          : null,
        // 🆕 Tags transversais + Frete grátis
        tags: selectedTags,
        freeShipping,
      };

      // Filtros
      const filledFilters = {};
      Object.entries(productFilters).forEach(([key, value]) => {
        if (value) filledFilters[key] = value;
      });
      productData.filters = Object.keys(filledFilters).length > 0 ? filledFilters : {};

      // Dados de família
      if (productFamily.trim()) {
        productData.productFamily = generateFamilySlug(productFamily);
      } else {
        productData.productFamily = null;
      }
      
      // 🆕 Variante por cor
      if (hasColor && color.trim()) {
        productData.variantType = 'color';
        productData.color = color;
        productData.colorCode = colorCode;
        productData.colorCode2 = (isDualColor && colorCode2) ? colorCode2 : null;
        productData.size = null;
        
        if (!productFamily.trim()) {
          const baseName = name.replace(new RegExp(color, 'gi'), '').trim();
          if (baseName) {
            productData.productFamily = generateFamilySlug(baseName);
          }
        }
      // 🆕 Variante por tamanho
      } else if (hasSize && sizeValue.trim()) {
        productData.variantType = 'size';
        productData.size = sizeValue.trim();
        productData.color = null;
        productData.colorCode = null;
        productData.colorCode2 = null;

        if (!productFamily.trim()) {
          const baseName = name.replace(new RegExp(sizeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
          if (baseName) {
            productData.productFamily = generateFamilySlug(baseName);
          }
        }
      } else {
        productData.variantType = 'color';
        productData.color = null;
        productData.colorCode = null;
        productData.colorCode2 = null;
        productData.size = null;
      }

      // 🆕 Separar imagens existentes (URLs) e novas (Files)
      const existingImageUrls = images
        .filter(img => img.type === 'existing')
        .map(img => img.url);

      const newImageFiles = images
        .filter(img => img.type === 'new')
        .map(img => img.file);

      // Passar a ordem completa das imagens para o backend
      const imageOrder = images.map((img, index) => ({
        index,
        type: img.type,
        url: img.type === 'existing' ? img.url : null,
      }));

      productData.existingImages = existingImageUrls;
      productData.imageOrder = imageOrder;

      const formData = new FormData();
      formData.append('id', product._id);
      formData.append('productData', JSON.stringify(productData));

      for (let i = 0; i < newImageFiles.length; i++) {
        formData.append('images', newImageFiles[i]);
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
          
          {/* ═══════════════════════════════════════════════════════ */}
          {/* 🆕 IMAGENS — Drag & Drop + Reordenar                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          <EditImageZone images={images} setImages={setImages} disabled={isSubmitting} />

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
            <label className='text-base font-medium' htmlFor='edit-product-description'>Descrição / Especificações</label>
            <textarea
              onChange={e => setDescription(e.target.value)}
              value={description}
              id='edit-product-description'
              rows={4}
              className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors resize-none'
              placeholder='Escreva cada especificação numa linha separada'
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
                {groups.filter(g => !g.isTagGroup).map((group) => (
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
          {/* FILTROS DINÂMICOS                                          */}
          {/* 🆕 Filtros com fieldPath (sourceGroup) são ignorados aqui  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {selectedGroup && visibleFilters.filter(fd => !fd.fieldPath).length > 0 && (
            <div className='border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-4'>
              <div className='flex items-center gap-2 mb-1'>
                <svg className='w-5 h-5 text-blue-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
                </svg>
                <h3 className='text-base font-semibold text-blue-800'>Filtros do Produto</h3>
              </div>
              <p className='text-xs text-blue-600 -mt-2'>
                Esses filtros permitem que o cliente encontre o produto na página da coleção
              </p>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {visibleFilters.map((filterDef) => {
                  // 🆕 Não mostrar filtros com fieldPath no Edit (sourceGroup é automático)
                  if (filterDef.fieldPath) return null;
                  return (
                    <div key={filterDef.key} className='flex flex-col gap-1'>
                      <label className='text-sm font-medium text-gray-700'>{filterDef.label}</label>
                      <select
                        value={productFilters[filterDef.key] || ''}
                        onChange={e => handleFilterChange(filterDef.key, e.target.value)}
                        className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors text-sm bg-white'
                        disabled={isSubmitting}
                      >
                        <option value=''>— Selecionar —</option>
                        {filterDef.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Preview dos filtros preenchidos */}
              {Object.keys(productFilters).filter(k => productFilters[k]).length > 0 && (
                <div className='flex flex-wrap gap-2 pt-2 border-t border-blue-200'>
                  {Object.entries(productFilters).map(([key, value]) => {
                    if (!value) return null;
                    const filterDef = groupFilterDefs.find(f => f.key === key);
                    if (filterDef?.fieldPath) return null; // 🆕 Skip fieldPath filters
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
          {/* 🆕 TAGS TRANSVERSAIS + FRETE GRÁTIS                       */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className='border border-green-200 bg-green-50/50 rounded-lg p-4 space-y-4'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-5 h-5 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' />
              </svg>
              <h3 className='text-base font-semibold text-green-800'>
                Tags e Destaques
              </h3>
            </div>
            <p className='text-xs text-green-600 -mt-2'>
              Tags permitem que o produto apareça em coleções transversais (SUP, Bodyboard, Outlet)
            </p>

            {/* Frete Grátis — Toggle destacado */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              freeShipping ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'
            }`}>
              <input
                type='checkbox'
                id='edit-freeShipping'
                checked={freeShipping}
                onChange={e => setFreeShipping(e.target.checked)}
                className='w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer'
                disabled={isSubmitting}
              />
              <div className='flex items-center gap-2'>
                <svg className={`w-5 h-5 ${freeShipping ? 'text-green-600' : 'text-gray-400'}`} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' />
                </svg>
                <label htmlFor='edit-freeShipping' className='cursor-pointer'>
                  <span className={`text-base font-medium ${freeShipping ? 'text-green-700' : 'text-gray-700'}`}>
                    Frete Grátis
                  </span>
                  <p className='text-xs text-gray-500'>
                    Produto com frete grátis para todo o Brasil
                  </p>
                </label>
              </div>
            </div>

            {/* Tags de Coleção */}
            <div>
              <p className='text-sm font-medium text-gray-700 mb-2'>Tags de Coleção:</p>
              <div className='flex flex-wrap gap-2'>
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.value);
                  const isSuggested = suggestedTags.includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      type='button'
                      onClick={() => !isSubmitting && toggleTag(tag.value)}
                      disabled={isSubmitting}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? 'bg-green-600 text-white shadow-sm'
                          : isSuggested
                            ? 'bg-green-100 text-green-700 border-2 border-green-400 border-dashed animate-pulse'
                            : 'bg-white text-gray-700 border border-gray-300 hover:border-green-400 hover:bg-green-50'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={tag.description}
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                      {isSelected && <span className='ml-1'>✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Sugestão automática */}
              {suggestedTags.length > 0 && (
                <div className='mt-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg'>
                  <span className='text-amber-600 text-xs'>💡</span>
                  <p className='text-xs text-amber-700'>
                    Sugestão baseada nos filtros: <strong>{suggestedTags.map(t => 
                      AVAILABLE_TAGS.find(at => at.value === t)?.label
                    ).join(', ')}</strong>
                  </p>
                  <button
                    type='button'
                    onClick={() => setSelectedTags(prev => [...new Set([...prev, ...suggestedTags])])}
                    disabled={isSubmitting}
                    className='ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap'
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </div>

            {/* Preview das tags selecionadas */}
            {(selectedTags.length > 0 || freeShipping) && (
              <div className='flex flex-wrap gap-2 pt-2 border-t border-green-200'>
                {freeShipping && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium'>
                    🚚 Frete Grátis
                  </span>
                )}
                {selectedTags.map(tagValue => {
                  const tag = AVAILABLE_TAGS.find(t => t.value === tagValue);
                  return (
                    <span 
                      key={tagValue}
                      className='inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium'
                    >
                      {tag?.icon} {tag?.label || tagValue}
                      <button
                        type='button'
                        onClick={() => toggleTag(tagValue)}
                        className='ml-0.5 hover:text-green-600'
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* CÓDIGO, PESO E DIMENSÕES                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className='border border-gray-200 bg-gray-50/50 rounded-lg p-4 space-y-5'>
            <div className='flex items-center gap-2'>
              <svg className='w-5 h-5 text-gray-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' />
              </svg>
              <h3 className='text-base font-semibold text-gray-800'>Código, Peso e Dimensões</h3>
            </div>
            <p className='text-xs text-gray-500 -mt-3'>Informações para identificação e cálculo de frete</p>

            {/* SKU + Peso */}
            <div className='flex items-start gap-4 flex-wrap'>
              <div className='flex-1 flex flex-col gap-1 min-w-[200px]'>
                <label className='text-sm font-medium text-gray-700' htmlFor='edit-sku'>Código do Produto (SKU)</label>
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

              <div className='flex flex-col gap-1 min-w-[160px]'>
                <label className='text-sm font-medium text-gray-700' htmlFor='edit-weight'>Peso Líquido (gramas)</label>
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
              <label className='text-sm font-medium text-gray-700'>Dimensões da Embalagem (cm)</label>
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* FAMÍLIA DE PRODUTOS (Variantes)                            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className='border-t border-gray-200 pt-5 mt-5'>
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>Família de Produtos (Variantes)</h3>
            <p className='text-sm text-gray-600 mb-4'>
              Se este produto faz parte de uma família com várias cores ou tamanhos, 
              defina a família abaixo. Produtos da mesma família permitem alternar entre variantes na página do produto.
            </p>

            {/* Nome da Família */}
            <div className='flex flex-col gap-1 mb-4'>
              <label className='text-base font-medium' htmlFor='edit-product-family'>Nome da Família</label>
              <input
                onChange={e => setProductFamily(e.target.value)}
                value={productFamily}
                id='edit-product-family'
                type='text'
                placeholder='Ex: Deck J-Bay ou Capa Refletiva Combate Shortboard'
                className='outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors'
                disabled={isSubmitting}
              />
              <p className='text-xs text-gray-500'>Produtos com o mesmo nome de família serão agrupados</p>
            </div>

            {/* 🆕 Toggle Tipo de Variante */}
            <div className='flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4'>
              <span className='text-sm font-medium text-gray-700'>Tipo de Variante:</span>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='editVariantType'
                  checked={variantType === 'color'}
                  onChange={() => handleVariantTypeChange('color')}
                  className='w-4 h-4 text-primary focus:ring-primary'
                  disabled={isSubmitting}
                />
                <span className='text-sm font-medium'>Cor</span>
                <div className='w-4 h-4 rounded-full bg-primary'></div>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='editVariantType'
                  checked={variantType === 'size'}
                  onChange={() => handleVariantTypeChange('size')}
                  className='w-4 h-4 text-primary focus:ring-primary'
                  disabled={isSubmitting}
                />
                <span className='text-sm font-medium'>Tamanho</span>
                <span className='text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium'>6'0</span>
              </label>
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* VARIANTE POR COR                               */}
            {/* ═══════════════════════════════════════════════ */}
            {variantType === 'color' && (
              <>
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
                    id='edit-hasSize'
                    checked={hasSize}
                    onChange={e => setHasSize(e.target.checked)}
                    className='w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer'
                    disabled={isSubmitting}
                  />
                  <label htmlFor='edit-hasSize' className='text-base font-medium cursor-pointer'>
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
                        placeholder="Ex: 6'0, 7'2, 10'0, P, M, G"
                        className='outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors max-w-[200px]'
                        disabled={isSubmitting}
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
                            disabled={isSubmitting}
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