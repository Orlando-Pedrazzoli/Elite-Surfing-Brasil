// ImageGalleryModal.jsx - E-commerce grade image gallery
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { assets } from '../assets/assets';
import '../styles/ProductDetails.css';

/**
 * Hook para detectar dispositivo touch
 */
const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouchDevice;
};

/**
 * ImageGalleryModal — Layout premium e-commerce
 * Desktop: thumbnails verticais à esquerda + hover zoom (lens)
 * Mobile: swipe horizontal + pinch-to-zoom + dots
 */
const ImageGalleryModal = ({
  images = [],
  isOpen = false,
  onClose,
  initialIndex = 0,
  productName = 'Product',
  showThumbnails = true,
  showCounter = true,
  enableZoom = true,
  enableSwipe = true,
  customStyles = {},
}) => {
  const isTouchDevice = useIsTouchDevice();
  const modalRef = useRef(null);
  const imageContainerRef = useRef(null);
  const mainImageRef = useRef(null);
  const lastTap = useRef(0);
  const pinchStartDistance = useRef(0);
  const thumbnailContainerRef = useRef(null);

  // ─── Estados principais ───
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoading, setIsImageLoading] = useState(false);

  // ─── Desktop hover zoom ───
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [hoverZoomPos, setHoverZoomPos] = useState({ x: 50, y: 50 });

  // ─── Touch states ───
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;
  const maxZoomLevel = 3;
  const DESKTOP_ZOOM_SCALE = 2.5;

  // ─── Reset zoom ───
  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setIsHoverZooming(false);
  }, []);

  // ═══════════════════════════════════════════
  // DESKTOP: Hover Zoom (Lens Effect)
  // ═══════════════════════════════════════════

  const handleMouseEnterImage = useCallback(() => {
    if (!enableZoom || isTouchDevice) return;
    setIsHoverZooming(true);
  }, [enableZoom, isTouchDevice]);

  const handleMouseLeaveImage = useCallback(() => {
    setIsHoverZooming(false);
  }, []);

  const handleMouseMoveImage = useCallback(
    (e) => {
      if (!enableZoom || isTouchDevice || !mainImageRef.current) return;

      const rect = mainImageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setHoverZoomPos({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    },
    [enableZoom, isTouchDevice]
  );

  // ═══════════════════════════════════════════
  // MOBILE: Touch / Swipe / Pinch
  // ═══════════════════════════════════════════

  const handleTouchStart = useCallback(
    (e) => {
      if (isZoomed) return;

      const touch = e.touches[0];
      setTouchEnd(null);
      setTouchStart(touch.clientX);

      // Pinch start
      if (e.touches.length === 2 && enableZoom) {
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch.clientX,
          touch2.clientY - touch.clientY
        );
        pinchStartDistance.current = distance;
      }
    },
    [isZoomed, enableZoom]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 2 && enableZoom) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        if (pinchStartDistance.current > 0) {
          const scale = distance / pinchStartDistance.current;
          const newZoom = Math.min(Math.max(1, zoomLevel * scale), maxZoomLevel);
          setZoomLevel(newZoom);
          setIsZoomed(newZoom > 1);
        }
      } else if (e.touches.length === 1) {
        if (!isZoomed && enableSwipe) {
          setTouchEnd(e.touches[0].clientX);
        }
      }
    },
    [isZoomed, zoomLevel, enableZoom, enableSwipe]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStartDistance.current = 0;

    if (!touchStart || !touchEnd || isZoomed || !enableSwipe) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      goToNext();
    } else if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, isZoomed, currentIndex, images.length, enableSwipe]);

  // Double tap zoom (mobile)
  const handleDoubleTap = useCallback(
    (e) => {
      if (!enableZoom || !isTouchDevice) return;

      const currentTime = Date.now();
      const tapLength = currentTime - lastTap.current;

      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        if (isZoomed) {
          resetZoom();
        } else {
          setIsZoomed(true);
          setZoomLevel(2);
        }
      }

      lastTap.current = currentTime;
    },
    [isZoomed, enableZoom, isTouchDevice, resetZoom]
  );

  // ─── Drag (zoomed state) ───
  const handleDragStart = useCallback(
    (e) => {
      if (!isZoomed || !enableZoom) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setIsDragging(true);
      setDragStart({
        x: clientX - imagePosition.x,
        y: clientY - imagePosition.y,
      });
    },
    [isZoomed, imagePosition, enableZoom]
  );

  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !isZoomed || !enableZoom) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setImagePosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
    },
    [isDragging, isZoomed, dragStart, enableZoom]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─── Wheel zoom ───
  const handleWheel = useCallback(
    (e) => {
      if (!enableZoom || !isTouchDevice) return;
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newZoom = Math.min(Math.max(1, zoomLevel + delta), maxZoomLevel);
      setZoomLevel(newZoom);
      setIsZoomed(newZoom > 1);
      if (newZoom === 1) setImagePosition({ x: 0, y: 0 });
    },
    [zoomLevel, enableZoom, isTouchDevice]
  );

  // ═══════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsImageLoading(true);
      resetZoom();
    }
  }, [currentIndex, images.length, resetZoom]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsImageLoading(true);
      resetZoom();
    }
  }, [currentIndex, resetZoom]);

  const goToImage = useCallback(
    (index) => {
      if (index >= 0 && index < images.length) {
        setCurrentIndex(index);
        setIsImageLoading(true);
        resetZoom();
      }
    },
    [images.length, resetZoom]
  );

  // ─── Auto-scroll thumbnail into view ───
  useEffect(() => {
    if (!thumbnailContainerRef.current) return;
    const activeThumb = thumbnailContainerRef.current.children[currentIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentIndex]);

  // ─── Keyboard ───
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          if (isZoomed) resetZoom();
          else onClose?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, resetZoom, isZoomed, onClose]);

  // ─── Init / Cleanup ───
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      resetZoom();
    }
  }, [isOpen, initialIndex, resetZoom]);

  // Prevent scroll on touch when modal open
  useEffect(() => {
    if (!isOpen) return;
    const preventScroll = (e) => {
      if (modalRef.current?.contains(e.target)) e.preventDefault();
    };
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, [isOpen]);

  const handleImageLoad = useCallback(() => setIsImageLoading(false), []);

  const handleImageError = useCallback((e) => {
    e.target.src = assets.placeholder_image || '/placeholder.jpg';
    setIsImageLoading(false);
  }, []);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !isZoomed) onClose?.();
    },
    [isZoomed, onClose]
  );

  if (!isOpen || !images.length) return null;

  const currentImage = images[currentIndex] || '';
  const hasMultipleImages = images.length > 1;

  return (
    <div
      ref={modalRef}
      className='fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm'
      onClick={handleBackdropClick}
      style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
    >
      {/* ═══ TOP BAR ═══ */}
      <div className='absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6'>
        {/* Counter */}
        {showCounter && hasMultipleImages && (
          <span className='text-white/70 text-sm font-medium tracking-wide'>
            {currentIndex + 1} / {images.length}
          </span>
        )}
        {!showCounter && <span />}

        {/* Zoom hint — desktop only */}
        {enableZoom && !isTouchDevice && (
          <span className='text-white/40 text-xs hidden md:block'>
            Passe o mouse para zoom
          </span>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className='text-white/70 hover:text-white transition-colors duration-200
            w-10 h-10 flex items-center justify-center rounded-full
            hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30'
          aria-label='Fechar galeria'
        >
          <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.5}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      {/* Desktop: flex-row (thumbnails left + image right) */}
      {/* Mobile: flex-col (image + dots bottom) */}
      <div className='h-full flex flex-col md:flex-row items-center justify-center pt-14 pb-4 md:py-16 md:px-6 lg:px-12'>

        {/* ─── DESKTOP VERTICAL THUMBNAILS (left side) ─── */}
        {showThumbnails && hasMultipleImages && (
          <div className='hidden md:flex flex-col items-center mr-4 lg:mr-6'>
            <div
              ref={thumbnailContainerRef}
              className='flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto scrollbar-hide py-1 px-1'
              role='tablist'
              aria-label='Miniaturas do produto'
            >
              {images.map((image, index) => (
                <button
                  key={`thumb-${index}`}
                  role='tab'
                  aria-selected={currentIndex === index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage(index);
                  }}
                  className={`
                    flex-shrink-0 w-16 h-16 lg:w-[72px] lg:h-[72px] rounded-lg overflow-hidden
                    border-2 transition-all duration-200 focus:outline-none
                    focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black
                    ${currentIndex === index
                      ? 'border-white shadow-lg shadow-white/10 scale-105'
                      : 'border-white/15 opacity-50 hover:opacity-90 hover:border-white/40'
                    }
                  `}
                  aria-label={`Imagem ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`Miniatura ${index + 1}`}
                    className='w-full h-full object-cover'
                    loading='lazy'
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── MAIN IMAGE AREA ─── */}
        <div
          ref={imageContainerRef}
          className='relative flex-1 flex items-center justify-center w-full h-full max-w-5xl'
          onTouchStart={enableSwipe ? handleTouchStart : undefined}
          onTouchMove={handleTouchMove}
          onTouchEnd={enableSwipe ? handleTouchEnd : undefined}
          onWheel={enableZoom ? handleWheel : undefined}
        >
          {/* Loading spinner */}
          {isImageLoading && (
            <div className='absolute inset-0 flex items-center justify-center z-40'>
              <div className='animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white/80' />
            </div>
          )}

          {/* ═══ MAIN IMAGE — Desktop (hover zoom) ═══ */}
          <div
            className='hidden md:flex items-center justify-center w-full h-full relative overflow-hidden'
            onMouseEnter={handleMouseEnterImage}
            onMouseLeave={handleMouseLeaveImage}
            onMouseMove={handleMouseMoveImage}
            style={{ cursor: enableZoom ? 'crosshair' : 'default' }}
          >
            <img
              ref={mainImageRef}
              src={currentImage}
              alt={`${productName} - Imagem ${currentIndex + 1}`}
              className={`
                max-w-full max-h-[75vh] object-contain select-none
                transition-opacity duration-300
                ${isImageLoading ? 'opacity-0' : 'opacity-100'}
              `}
              style={{
                transformOrigin: `${hoverZoomPos.x}% ${hoverZoomPos.y}%`,
                transform: isHoverZooming
                  ? `scale(${DESKTOP_ZOOM_SCALE})`
                  : 'scale(1)',
                transition: isHoverZooming
                  ? 'transform 0.1s ease-out'
                  : 'transform 0.3s ease-out',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>

          {/* ═══ MAIN IMAGE — Mobile (pinch + swipe + double-tap) ═══ */}
          <div
            className='md:hidden flex items-center justify-center w-full h-full'
            onMouseDown={enableZoom ? handleDragStart : undefined}
            onMouseMove={enableZoom ? handleDragMove : undefined}
            onMouseUp={enableZoom ? handleDragEnd : undefined}
            onMouseLeave={enableZoom ? handleDragEnd : undefined}
            style={{
              cursor: isZoomed
                ? isDragging ? 'grabbing' : 'grab'
                : 'default',
            }}
          >
            <img
              src={currentImage}
              alt={`${productName} - Imagem ${currentIndex + 1}`}
              className={`
                max-w-full max-h-[65vh] object-contain select-none
                transition-opacity duration-300
                ${isImageLoading ? 'opacity-0' : 'opacity-100'}
              `}
              style={{
                transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                touchAction: 'none',
                willChange: isZoomed ? 'transform' : 'auto',
              }}
              onClick={enableZoom ? handleDoubleTap : undefined}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>

          {/* ═══ NAVIGATION ARROWS ═══ */}
          {!isZoomed && hasMultipleImages && (
            <>
              {/* Previous */}
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                disabled={currentIndex === 0}
                className={`
                  absolute left-2 sm:left-3 md:left-[-52px] top-1/2 -translate-y-1/2
                  w-10 h-10 md:w-11 md:h-11 rounded-full
                  flex items-center justify-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/40
                  ${currentIndex === 0
                    ? 'opacity-0 pointer-events-none'
                    : 'bg-white/10 md:bg-white/5 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-sm'
                  }
                `}
                aria-label='Imagem anterior'
              >
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
                </svg>
              </button>

              {/* Next */}
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                disabled={currentIndex === images.length - 1}
                className={`
                  absolute right-2 sm:right-3 md:right-[-52px] top-1/2 -translate-y-1/2
                  w-10 h-10 md:w-11 md:h-11 rounded-full
                  flex items-center justify-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/40
                  ${currentIndex === images.length - 1
                    ? 'opacity-0 pointer-events-none'
                    : 'bg-white/10 md:bg-white/5 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-sm'
                  }
                `}
                aria-label='Próxima imagem'
              >
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══ MOBILE BOTTOM: Dots + Thumbnails ═══ */}
      {hasMultipleImages && !isZoomed && (
        <div className='md:hidden absolute bottom-0 left-0 right-0 pb-5 safe-area-padding'>
          {/* Dots */}
          <div className='flex items-center justify-center gap-2 mb-3' role='tablist'>
            {images.map((_, index) => (
              <button
                key={`dot-${index}`}
                role='tab'
                aria-selected={currentIndex === index}
                onClick={() => goToImage(index)}
                className={`
                  rounded-full transition-all duration-300
                  focus:outline-none
                  ${currentIndex === index
                    ? 'w-6 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40'
                  }
                `}
                aria-label={`Imagem ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile thumbnails — horizontal strip */}
          {showThumbnails && (
            <div className='flex gap-2 justify-center px-4 overflow-x-auto scrollbar-hide'>
              {images.map((image, index) => (
                <button
                  key={`mobile-thumb-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage(index);
                  }}
                  className={`
                    flex-shrink-0 w-11 h-11 rounded-md overflow-hidden
                    border-2 transition-all duration-200
                    ${currentIndex === index
                      ? 'border-white opacity-100'
                      : 'border-transparent opacity-40'
                    }
                  `}
                  aria-label={`Ir para imagem ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`Miniatura ${index + 1}`}
                    className='w-full h-full object-cover'
                    loading='lazy'
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ MOBILE ZOOM INDICATOR ═══ */}
      {isZoomed && isTouchDevice && (
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-50
          text-white/70 text-xs bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm'>
          {Math.round(zoomLevel * 100)}% • Toque duplo para sair
        </div>
      )}
    </div>
  );
};

export default ImageGalleryModal;