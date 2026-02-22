import React, { useState, useEffect, memo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingBag, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateInstallments, formatBRL } from '../utils/installmentUtils';

// Componente para renderizar bolinha de cor (simples ou dupla)
const ColorBall = ({ code1, code2, size = 20, selected = false, onClick, onMouseEnter, title, outOfStock = false }) => {
  const isDual = code2 && code2 !== code1;
  const isLight = (code) => ['#FFFFFF', '#FFF', '#ffffff', '#fff', '#F5F5F5', '#FAFAFA'].includes(code);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={title}
      className={`
        relative rounded-full transition-all duration-200
        ${selected ? 'ring-2 ring-offset-1 ring-gray-800' : 'hover:scale-110'}
        ${outOfStock ? 'opacity-40' : ''}
        ${!isDual && isLight(code1) ? 'border border-gray-300' : ''}
      `}
      style={{ width: size, height: size }}
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
          style={{ backgroundColor: code1 }}
        />
      )}
      
      {outOfStock && (
        <span className='absolute inset-0 flex items-center justify-center'>
          <svg className='w-2.5 h-2.5 text-gray-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3'>
            <path d='M18 6L6 18M6 6l12 12' />
          </svg>
        </span>
      )}
    </button>
  );
};

// Componente SizeBadge para variantes por tamanho
const SizeBadge = ({ label, selected = false, onClick, onMouseEnter, title, outOfStock = false }) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={title}
      className={`
        relative text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all duration-200
        ${selected 
          ? 'bg-gray-800 text-white ring-1 ring-gray-800' 
          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 hover:scale-105'
        }
        ${outOfStock ? 'opacity-40 line-through' : ''}
      `}
    >
      {label}
    </button>
  );
};

const ProductCard = memo(({ product, largeSwatches = false }) => {
  const { currency, addToCart, removeFromCart, cartItems, navigate, getProductFamily } =
    useAppContext();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [familyProducts, setFamilyProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(product);
  const [isColorTransitioning, setIsColorTransitioning] = useState(false);

  // Buscar produtos da mesma família
  useEffect(() => {
    const fetchFamily = async () => {
      if (product?.productFamily) {
        const family = await getProductFamily(product.productFamily);
        const sorted = [...family].sort((a, b) => {
          if (a._id === product._id) return -1;
          if (b._id === product._id) return 1;
          if (a.variantType === 'size' || b.variantType === 'size') {
            const sizeA = parseFloat((a.size || '0').replace("'", '.'));
            const sizeB = parseFloat((b.size || '0').replace("'", '.'));
            return sizeA - sizeB;
          }
          return (a.color || '').localeCompare(b.color || '');
        });
        setFamilyProducts(sorted);
      } else {
        setFamilyProducts([]);
      }
    };
    fetchFamily();
  }, [product?.productFamily, product?._id, getProductFamily]);

  useEffect(() => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
  }, [product?._id]);

  if (!product || !product.image || product.image.length === 0) return null;

  const displayProduct = selectedProduct || product;
  const isInactive = !displayProduct.inStock || displayProduct.stock <= 0;

  const familyVariantType = familyProducts.length > 0 
    ? (familyProducts[0].variantType || 'color') 
    : 'color';

  // Cálculo de parcelas e preço PIX
  const installmentData = calculateInstallments(displayProduct.offerPrice);

  const handleColorClick = (familyProduct, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (familyProduct._id === displayProduct._id) return;
    setIsColorTransitioning(true);
    setTimeout(() => {
      setSelectedProduct(familyProduct);
      setCurrentImageIndex(0);
      setTimeout(() => setIsColorTransitioning(false), 50);
    }, 150);
  };

  const handleColorHover = (familyProduct) => {
    if (familyProduct._id === displayProduct._id) return;
    setIsColorTransitioning(true);
    setTimeout(() => {
      setSelectedProduct(familyProduct);
      setCurrentImageIndex(0);
      setTimeout(() => setIsColorTransitioning(false), 50);
    }, 100);
  };

  const nextImage = e => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % displayProduct.image.length);
  };

  const prevImage = e => {
    e.stopPropagation();
    setCurrentImageIndex(
      prev => (prev - 1 + displayProduct.image.length) % displayProduct.image.length
    );
  };

  const handleCardClick = () => {
    navigate(`/products/${displayProduct.category.toLowerCase()}/${displayProduct._id}`);
    window.scrollTo(0, 0);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isInactive) return;
    const currentInCart = cartItems[displayProduct._id] || 0;
    if (currentInCart >= displayProduct.stock) return;
    addToCart(displayProduct._id);
  };

  const handleRemoveFromCart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    removeFromCart(displayProduct._id);
  };

  const cartQuantity = cartItems[displayProduct._id] || 0;
  const canAddMore = cartQuantity < displayProduct.stock;

  return (
    <div
      onClick={handleCardClick}
      className='bg-white w-full transition-all duration-300 flex flex-col h-full relative group cursor-pointer'
    >
      {/* ═══ IMAGEM ═══ */}
      <div className='relative flex items-center justify-center bg-gray-50/50 rounded-lg overflow-hidden aspect-square'>
        
        <div className={`
          w-full h-full flex items-center justify-center p-2
          transition-all duration-150 ease-out
          ${isColorTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}>
          <img
            className='max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-105'
            src={displayProduct.image[currentImageIndex]}
            alt={displayProduct.name}
            loading='lazy'
          />
        </div>

        {/* Badge Esgotado */}
        {isInactive && (
          <div className='absolute top-2 left-2 bg-gray-900/80 text-white text-[10px] px-2 py-1 rounded font-medium uppercase tracking-wider'>
            Esgotado
          </div>
        )}

        {/* Setas de navegação */}
        {displayProduct.image.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className='absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white'
            >
              <ChevronLeft className='w-4 h-4 text-gray-700' />
            </button>
            <button
              onClick={nextImage}
              className='absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white'
            >
              <ChevronRight className='w-4 h-4 text-gray-700' />
            </button>
          </>
        )}

        {/* Botão Carrinho — hover sobre a imagem */}
        <div className='absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200' onClick={e => e.stopPropagation()}>
          {isInactive ? null : cartQuantity === 0 ? (
            <button
              onClick={handleAddToCart}
              className='w-9 h-9 rounded-full bg-white/95 border border-gray-200 flex items-center justify-center shadow-md hover:shadow-lg hover:bg-white transition-all active:scale-95'
            >
              <ShoppingBag className='w-4 h-4 text-gray-700' />
            </button>
          ) : (
            <div className='flex items-center gap-0.5 bg-white/95 border border-gray-200 rounded-full shadow-md px-1 py-0.5'>
              <button
                onClick={handleRemoveFromCart}
                className='w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors'
              >
                <Minus className='w-3 h-3 text-gray-600' />
              </button>
              <span className='w-5 text-center text-xs font-semibold text-gray-800'>
                {cartQuantity}
              </span>
              <button
                onClick={handleAddToCart}
                disabled={!canAddMore}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  canAddMore ? 'hover:bg-gray-100' : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <Plus className='w-3 h-3 text-gray-600' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ INFORMAÇÕES DO PRODUTO ═══ */}
      <div className={`pt-3 pb-2 px-1 flex flex-col flex-grow text-center transition-opacity duration-150 ${isColorTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Variantes — Cor ou Tamanho */}
        {familyProducts.length > 1 && (
          <div className={`flex items-center justify-center mb-2 flex-wrap ${
            familyVariantType === 'size' ? 'gap-1.5' : (largeSwatches ? 'gap-2.5' : 'gap-2')
          }`}>
            {familyVariantType === 'size' ? (
              <>
                {familyProducts.slice(0, 6).map((fp) => (
                  <SizeBadge
                    key={fp._id}
                    label={fp.size || '?'}
                    selected={fp._id === displayProduct._id}
                    outOfStock={(fp.stock || 0) <= 0}
                    onClick={(e) => handleColorClick(fp, e)}
                    onMouseEnter={() => handleColorHover(fp)}
                    title={`${fp.size || fp.name}${(fp.stock || 0) <= 0 ? ' (Esgotado)' : ''}`}
                  />
                ))}
                {familyProducts.length > 6 && (
                  <span className='text-xs text-gray-400'>+{familyProducts.length - 6}</span>
                )}
              </>
            ) : (
              <>
                {familyProducts.slice(0, 6).map((fp) => (
                  <ColorBall
                    key={fp._id}
                    code1={fp.colorCode || '#ccc'}
                    code2={fp.colorCode2}
                    size={largeSwatches ? 26 : 20}
                    selected={fp._id === displayProduct._id}
                    outOfStock={(fp.stock || 0) <= 0}
                    onClick={(e) => handleColorClick(fp, e)}
                    onMouseEnter={() => handleColorHover(fp)}
                    title={`${fp.color || fp.name}${(fp.stock || 0) <= 0 ? ' (Esgotado)' : ''}`}
                  />
                ))}
                {familyProducts.length > 6 && (
                  <span className='text-xs text-gray-400'>+{familyProducts.length - 6}</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Nome do Produto */}
        <h3 className='text-gray-900 font-medium text-sm leading-snug line-clamp-2 mb-3'>
          {displayProduct.name}
        </h3>

        {/* ═══ BLOCO DE PREÇOS — Layout da referência ═══ */}
        <div className='mt-auto'>
          
          {/* PREÇO PIX — destaque principal */}
          <p className='text-primary font-bold text-base leading-tight'>
            {formatBRL(installmentData.pixPrice)}
          </p>
          
          {/* % de desconto */}
          <p className='text-[11px] text-primary/80 font-medium mt-0.5 leading-tight'>
            {Math.round(installmentData.pixDiscount * 100)}% de desconto
          </p>
          
          {/* * PIX / Boleto */}
          <p className='text-[10px] text-gray-400 mt-0.5 leading-tight'>
            * PIX / Boleto
          </p>

          {/* PREÇO CARTÃO + PARCELAMENTO */}
          <div className='mt-2'>
            <p className='text-gray-800 font-semibold text-sm leading-tight'>
              {formatBRL(displayProduct.offerPrice)}
            </p>
            
            {installmentData.maxInstallments > 1 && (
              <p className='text-[11px] text-gray-500 mt-0.5 leading-tight'>
                {installmentData.maxInstallments}X DE{' '}
                <span className='font-semibold text-gray-600'>
                  {formatBRL(installmentData.installmentValue)}
                </span>
                {' '}SEM JUROS
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;