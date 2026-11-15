import React, {
  useState,
  useEffect,
  useLayoutEffect,
  memo,
} from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  ShoppingBag,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { calculateInstallments, formatBRL } from '../utils/installmentUtils';

// Componente para renderizar bolinha de cor (simples ou dupla)
const ColorBall = ({
  code1,
  code2,
  size = 20,
  selected = false,
  onClick,
  onMouseEnter,
  title,
  outOfStock = false,
}) => {
  const isDual = code2 && code2 !== code1;
  const isLight = code =>
    ['#FFFFFF', '#FFF', '#ffffff', '#fff', '#F5F5F5', '#FAFAFA'].includes(code);

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
            border:
              isLight(code1) || isLight(code2) ? '1px solid #d1d5db' : 'none',
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
          <svg
            className='w-2.5 h-2.5 text-gray-600'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
          >
            <path d='M18 6L6 18M6 6l12 12' />
          </svg>
        </span>
      )}
    </button>
  );
};

// ─── Miniaturas de cor: quantas cabem numa linha ───
// A quantidade é calculada pela largura REAL da linha (ResizeObserver),
// não por breakpoint: o mesmo card aparece em grelhas de 1–4 colunas
// e no carrossel de novidades, com larguras muito diferentes.
const THUMB_GAP = 6; // px — igual ao gap-1.5 da linha
const THUMB_SIZE_SMALL = 28; // cards estreitos (mobile 2 colunas)
const THUMB_SIZE = 36; // cards normais
const THUMB_SIZE_LARGE = 44; // grelha mobile de 1 coluna (largeSwatches)
const NARROW_CARD_WIDTH = 200; // abaixo disto usa a miniatura pequena
const DEFAULT_SLOTS = 5; // antes da 1ª medição (evita "salto" no render inicial)

// Callback ref: funciona mesmo que a linha só monte depois (família carregada
// de forma assíncrona). Um único ResizeObserver por elemento.
const useElementWidth = () => {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      setWidth(prev => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return [setEl, width];
};

// Decide que variantes mostrar e quantas ficam no "+N".
// Regras: se todas cabem, mostra todas; senão mostra (slots - 1) + o bloco "+N".
// A variante selecionada fica sempre visível (substitui a última, se preciso).
const getVisibleVariants = (items, selectedId, slots) => {
  if (items.length <= slots) return { visible: items, hidden: 0 };
  const count = Math.max(1, slots - 1);
  let visible = items.slice(0, count);
  const selectedIndex = items.findIndex(i => i._id === selectedId);
  if (selectedIndex >= count) {
    visible = [...items.slice(0, count - 1), items[selectedIndex]];
  }
  return { visible, hidden: items.length - visible.length };
};

// Bloco "+N" — mesmo tamanho das miniaturas, leva à página do produto
const MoreVariantsTile = ({ count, size, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    title={`Ver mais ${count} ${count === 1 ? 'cor' : 'cores'}`}
    aria-label={`Ver mais ${count} ${count === 1 ? 'cor' : 'cores'}`}
    style={{ width: size, height: size }}
    className='shrink-0 rounded-md border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-semibold flex items-center justify-center transition-colors hover:border-gray-500 hover:text-gray-900'
  >
    +{count}
  </button>
);

// Gera uma versão reduzida da imagem para a miniatura.
// Se for Cloudinary, injeta transformação (80x80, formato/qualidade auto);
// caso contrário devolve a URL original.
const getThumbUrl = url => {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace(
      '/upload/',
      '/upload/w_80,h_80,c_pad,b_white,f_auto,q_auto/',
    );
  }
  return url;
};

// Miniatura (avatar) da variante — mostra a foto do produto em vez da cor
const VariantThumb = ({
  image,
  alt,
  size = 36,
  selected = false,
  onClick,
  onMouseEnter,
  title,
  outOfStock = false,
}) => {
  return (
    <button
      type='button'
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      style={{ width: size, height: size }}
      className={`
        relative shrink-0 rounded-md overflow-hidden bg-white transition-all duration-200
        ${
          selected
            ? 'border-2 border-gray-900'
            : 'border border-gray-200 hover:border-gray-500'
        }
      `}
    >
      <img
        src={getThumbUrl(image)}
        alt={alt}
        loading='lazy'
        draggable={false}
        className={`w-full h-full object-contain p-0.5 ${outOfStock ? 'opacity-40' : ''}`}
      />

      {/* Esgotado: risco diagonal sobre a miniatura */}
      {outOfStock && (
        <span
          className='absolute inset-0 pointer-events-none'
          style={{
            background:
              'linear-gradient(to top right, transparent calc(50% - 0.75px), #9ca3af calc(50% - 0.75px), #9ca3af calc(50% + 0.75px), transparent calc(50% + 0.75px))',
          }}
        />
      )}
    </button>
  );
};

// Componente SizeBadge para variantes por tamanho
const SizeBadge = ({
  label,
  selected = false,
  onClick,
  onMouseEnter,
  title,
  outOfStock = false,
}) => {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={title}
      className={`
        relative text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all duration-200
        ${
          selected
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
  const {
    currency,
    addToCart,
    removeFromCart,
    cartItems,
    navigate,
    getProductFamily,
  } = useAppContext();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [familyProducts, setFamilyProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(product);
  const [isColorTransitioning, setIsColorTransitioning] = useState(false);
  const [swatchRowRef, swatchRowWidth] = useElementWidth();

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

  const familyVariantType =
    familyProducts.length > 0
      ? familyProducts[0].variantType || 'color'
      : 'color';

  // Cálculo de parcelas e preço PIX
  const installmentData = calculateInstallments(displayProduct.offerPrice);

  // Tags e badges
  const tags = displayProduct.tags || [];
  const hasFreeShipping = displayProduct.freeShipping === true;
  const isOutlet = tags.includes('outlet');
  const isLancamento = tags.includes('lancamento');
  const isBestseller = tags.includes('bestseller');

  // Percentagem de desconto
  const discountPercent =
    displayProduct.price > displayProduct.offerPrice
      ? Math.round(
          ((displayProduct.price - displayProduct.offerPrice) /
            displayProduct.price) *
            100,
        )
      : 0;

  /* =====================================================
     SEO FIX: URL do produto para o <Link> semântico.
     
     ANTES: <div onClick={() => navigate(`/products/${cat}/${id}`)}>
     - Crawlers NÃO seguem onClick (é JavaScript puro)
     - Resultado: produtos não são linkados internamente
     
     DEPOIS: <Link to={`/products/${cat}/${id}`}>
     - Crawlers SEGUEM <a href=""> (HTML semântico)
     - Resultado: cada produto é um link crawlável
     ===================================================== */
  const productUrl = `/products/${displayProduct.category.toLowerCase()}/${displayProduct._id}`;

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

  const handleColorHover = familyProduct => {
    if (familyProduct._id === displayProduct._id) return;
    setIsColorTransitioning(true);
    setTimeout(() => {
      setSelectedProduct(familyProduct);
      setCurrentImageIndex(0);
      setTimeout(() => setIsColorTransitioning(false), 50);
    }, 100);
  };

  // ─── Miniaturas: tamanho e quantidade conforme a largura do card ───
  const thumbSize = largeSwatches
    ? THUMB_SIZE_LARGE
    : swatchRowWidth > 0 && swatchRowWidth < NARROW_CARD_WIDTH
      ? THUMB_SIZE_SMALL
      : THUMB_SIZE;
  const thumbSlots =
    swatchRowWidth > 0
      ? Math.max(
          2,
          Math.floor((swatchRowWidth + THUMB_GAP) / (thumbSize + THUMB_GAP)),
        )
      : DEFAULT_SLOTS;
  const { visible: visibleVariants, hidden: hiddenVariantsCount } =
    getVisibleVariants(familyProducts, displayProduct._id, thumbSlots);

  const handleMoreVariantsClick = e => {
    e.stopPropagation();
    e.preventDefault();
    window.scrollTo(0, 0);
    navigate(productUrl);
  };

  const nextImage = e => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex(prev => (prev + 1) % displayProduct.image.length);
  };

  const prevImage = e => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex(
      prev =>
        (prev - 1 + displayProduct.image.length) % displayProduct.image.length,
    );
  };

  const handleAddToCart = e => {
    e.stopPropagation();
    e.preventDefault();
    if (isInactive) return;
    const currentInCart = cartItems[displayProduct._id] || 0;
    if (currentInCart >= displayProduct.stock) return;
    addToCart(displayProduct._id);
  };

  const handleRemoveFromCart = e => {
    e.stopPropagation();
    e.preventDefault();
    removeFromCart(displayProduct._id);
  };

  // Imagem exibida no hover: a 2ª foto do produto/variante ativa.
  // Só quando o utilizador está na 1ª imagem (se navegou pelas setas,
  // respeita a escolha dele e não troca).
  const hoverImage =
    currentImageIndex === 0 && displayProduct.image.length > 1
      ? displayProduct.image[1]
      : null;

  const cartQuantity = cartItems[displayProduct._id] || 0;
  const canAddMore = cartQuantity < displayProduct.stock;

  return (
    <Link
      to={productUrl}
      onClick={() => window.scrollTo(0, 0)}
      className='bg-white w-full transition-all duration-300 flex flex-col h-full relative group'
    >
      {/* ═══ IMAGEM ═══ */}
      <div className='group/image relative flex items-center justify-center bg-gray-50/50 rounded-lg overflow-hidden aspect-square'>
        <div
          className={`
          relative w-full h-full flex items-center justify-center p-2
          transition-all duration-150 ease-out
          ${isColorTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        >
          <img
            className={`max-w-full max-h-full object-contain transition-all duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none ${
              hoverImage ? 'group-hover/image:opacity-0' : ''
            }`}
            src={displayProduct.image[currentImageIndex]}
            alt={displayProduct.name}
            loading='lazy'
            decoding='async'
          />

          {/* Segunda imagem — crossfade no hover (só em dispositivos com hover real) */}
          {hoverImage && (
            <span className='absolute inset-0 p-2 flex items-center justify-center pointer-events-none'>
              <img
                className='max-w-full max-h-full object-contain opacity-0 transition-all duration-300 ease-out group-hover/image:opacity-100 group-hover:scale-105 motion-reduce:transition-none'
                src={hoverImage}
                alt=''
                aria-hidden='true'
                loading='lazy'
                decoding='async'
                draggable={false}
              />
            </span>
          )}
        </div>

        {/* ═══ BADGES CANTO SUPERIOR ESQUERDO ═══ */}
        <div className='absolute top-2 left-2 flex flex-col gap-1 z-10'>
          {/* Badge Esgotado */}
          {isInactive && (
            <span className='bg-gray-900/80 text-white text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider'>
              Esgotado
            </span>
          )}

          {/* Badge Outlet com % */}
          {isOutlet && discountPercent > 0 && !isInactive && (
            <span className='bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider'>
              -{discountPercent}%
            </span>
          )}

          {/* Badge Lançamento */}
          {isLancamento && !isInactive && (
            <span className='bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider'>
              Novo
            </span>
          )}

          {/* Badge Bestseller */}
          {isBestseller && !isInactive && (
            <span className='bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider'>
              ⭐ Top
            </span>
          )}
        </div>

        {/* Badge Frete Grátis — canto superior direito */}
        {hasFreeShipping && !isInactive && (
          <div className='absolute top-2 right-2 z-10'>
            <span className='inline-flex items-center gap-0.5 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider'>
              <Truck className='w-3 h-3' />
              Free
            </span>
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
        <div
          className='absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200'
          onClick={e => e.stopPropagation()}
        >
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
                  canAddMore
                    ? 'hover:bg-gray-100'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <Plus className='w-3 h-3 text-gray-600' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ INFORMAÇÕES DO PRODUTO ═══ */}
      <div
        className={`pt-3 pb-2 px-1 flex flex-col flex-grow text-center transition-opacity duration-150 ${isColorTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* Variantes — Cor ou Tamanho */}
        {familyProducts.length >= 1 ? (
          <div
            ref={familyVariantType === 'size' ? undefined : swatchRowRef}
            className={`flex items-center justify-center mb-2 gap-1.5 ${
              familyVariantType === 'size' ? 'flex-wrap' : 'flex-nowrap'
            }`}
          >
            {familyVariantType === 'size' ? (
              <>
                {familyProducts.slice(0, 6).map(fp => (
                  <SizeBadge
                    key={fp._id}
                    label={fp.size || '?'}
                    selected={fp._id === displayProduct._id}
                    outOfStock={(fp.stock || 0) <= 0}
                    onClick={e => handleColorClick(fp, e)}
                    onMouseEnter={() => handleColorHover(fp)}
                    title={`${fp.size || fp.name}${(fp.stock || 0) <= 0 ? ' (Esgotado)' : ''}`}
                  />
                ))}
                {familyProducts.length > 6 && (
                  <span className='text-xs text-gray-400'>
                    +{familyProducts.length - 6}
                  </span>
                )}
              </>
            ) : (
              <>
                {visibleVariants.map(fp => {
                  const outOfStock = (fp.stock || 0) <= 0;
                  const title = `${fp.color || fp.name}${outOfStock ? ' (Esgotado)' : ''}`;
                  const selected = fp._id === displayProduct._id;
                  const thumb = fp.image?.[0];

                  // Variante sem imagem → mantém a bolinha de cor como fallback
                  return thumb ? (
                    <VariantThumb
                      key={fp._id}
                      image={thumb}
                      alt={fp.color || fp.name}
                      size={thumbSize}
                      selected={selected}
                      outOfStock={outOfStock}
                      onClick={e => handleColorClick(fp, e)}
                      onMouseEnter={() => handleColorHover(fp)}
                      title={title}
                    />
                  ) : (
                    <ColorBall
                      key={fp._id}
                      code1={fp.colorCode || '#ccc'}
                      code2={fp.colorCode2}
                      size={largeSwatches ? 26 : 20}
                      selected={selected}
                      outOfStock={outOfStock}
                      onClick={e => handleColorClick(fp, e)}
                      onMouseEnter={() => handleColorHover(fp)}
                      title={title}
                    />
                  );
                })}
                {hiddenVariantsCount > 0 && (
                  <MoreVariantsTile
                    count={hiddenVariantsCount}
                    size={thumbSize}
                    onClick={handleMoreVariantsClick}
                  />
                )}
              </>
            )}
          </div>
        ) : /* Produto sem família mas com cor ou tamanho — mostra 1 swatch avulso */
        displayProduct.variantType === 'size' && displayProduct.size ? (
          <div className='flex items-center justify-center mb-2'>
            <SizeBadge
              label={displayProduct.size}
              selected={true}
              title={displayProduct.size}
            />
          </div>
        ) : displayProduct.colorCode ? (
          <div className='flex items-center justify-center mb-2'>
            <ColorBall
              code1={displayProduct.colorCode}
              code2={displayProduct.colorCode2}
              size={largeSwatches ? 26 : 20}
              selected={true}
              title={displayProduct.color || ''}
            />
          </div>
        ) : null}

        {/* Nome do Produto */}
        <h3 className='text-gray-900 font-medium text-sm leading-snug line-clamp-2 mb-3'>
          {displayProduct.name}
        </h3>

        {/* ═══ BLOCO DE PREÇOS ═══ */}
        <div className='mt-auto'>
          {/* PREÇO PIX / BOLETO */}
          <p className='text-green-700 font-extrabold text-[15px] leading-tight'>
            {formatBRL(installmentData.pixPrice)}
            <span className='text-[11px] font-bold ml-1'>PIX / BOLETO</span>
          </p>

          {/* PREÇO CARTÃO */}
          <p className='text-gray-600 text-[13px] font-medium mt-1.5 leading-tight'>
            {formatBRL(displayProduct.offerPrice)}
          </p>

          {/* PARCELAMENTO */}
          {installmentData.maxInstallments > 1 && (
            <p className='text-gray-500 text-[11px] font-bold mt-0.5 leading-tight uppercase tracking-wide'>
              EM {installmentData.maxInstallments}X DE{' '}
              {formatBRL(installmentData.installmentValue)} SEM JUROS
            </p>
          )}
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
