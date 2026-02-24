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
 * Desktop: thumbnails verticais à esquerda + click-to-zoom com pan livre
 * Mobile: swipe horizontal (loop) + pinch-to-zoom + double-tap + pan
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
  const desktopImageRef = useRef(null);
  const thumbnailContainerRef = useRef(null);

  // ─── Estados principais ───
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // ─── Desktop zoom state ───
  const [desktopZoomed, setDesktopZoomed] = useState(false);
  const [desktopZoomOrigin, setDesktopZoomOrigin] = useState({ x: 50, y: 50 });
  const [desktopPan, setDesktopPan] = useState({ x: 0, y: 0 });
  const [isDesktopPanning, setIsDesktopPanning] = useState(false);
  const desktopPanStart = useRef({ x: 0, y: 0 });
  const desktopPanOffset = useRef({ x: 0, y: 0, moved: false });
  const DESKTOP_ZOOM_SCALE = 2.8;

  // ─── Mobile zoom/pan state ───
  const [mobileZoomLevel, setMobileZoomLevel] = useState(1);
  const [mobilePan, setMobilePan] = useState({ x: 0, y: 0 });
  const [isMobilePanning, setIsMobilePanning] = useState(false);
  const mobilePanStart = useRef({ x: 0, y: 0 });
  const mobilePanOffset = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const lastTap = useRef(0);
  const maxZoomLevel = 4;

  // ─── Touch swipe state ───
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const minSwipeDistance = 50;

  const isMobileZoomed = mobileZoomLevel > 1;

  // ═══════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════

  const resetAllZoom = useCallback(() => {
    setDesktopZoomed(false);
    setDesktopPan({ x: 0, y: 0 });
    setDesktopZoomOrigin({ x: 50, y: 50 });
    setMobileZoomLevel(1);
    setMobilePan({ x: 0, y: 0 });
    setIsDesktopPanning(false);
    setIsMobilePanning(false);
  }, []);

  // ═══════════════════════════════════════════
  // NAVIGATION (loop infinito)
  // ═══════════════════════════════════════════

  const goToNext = useCallback(() => {
    setIsImageLoading(true);
    resetAllZoom();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length, resetAllZoom]);

  const goToPrevious = useCallback(() => {
    setIsImageLoading(true);
    resetAllZoom();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length, resetAllZoom]);

  const goToImage = useCallback(
    (index) => {
      if (index >= 0 && index < images.length) {
        setIsImageLoading(true);
        resetAllZoom();
        setCurrentIndex(index);
      }
    },
    [images.length, resetAllZoom]
  );

  // ═══════════════════════════════════════════
  // DESKTOP: Click-to-zoom + Pan livre
  // ═══════════════════════════════════════════

  const handleDesktopClick = useCallback(
    (e) => {
      if (!enableZoom || isTouchDevice) return;

      // Se fez pan real, ignora o click
      if (desktopPanOffset.current.moved) {
        desktopPanOffset.current.moved = false;
        return;
      }

      if (desktopZoomed) {
        // Zoom out
        setDesktopZoomed(false);
        setDesktopPan({ x: 0, y: 0 });
      } else {
        // Zoom in no ponto exato do clique
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDesktopZoomOrigin({ x, y });
        setDesktopPan({ x: 0, y: 0 });
        setDesktopZoomed(true);
      }
    },
    [enableZoom, isTouchDevice, desktopZoomed]
  );

  const handleDesktopMouseDown = useCallback(
    (e) => {
      if (!desktopZoomed || !enableZoom || isTouchDevice) return;
      e.preventDefault();
      setIsDesktopPanning(true);
      desktopPanStart.current = { x: e.clientX, y: e.clientY };
      desktopPanOffset.current = { x: desktopPan.x, y: desktopPan.y, moved: false };
    },
    [desktopZoomed, enableZoom, isTouchDevice, desktopPan]
  );

  const handleDesktopMouseMove = useCallback(
    (e) => {
      if (!isDesktopPanning || !desktopZoomed) return;

      const dx = e.clientX - desktopPanStart.current.x;
      const dy = e.clientY - desktopPanStart.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        desktopPanOffset.current.moved = true;
      }

      setDesktopPan({
        x: desktopPanOffset.current.x + dx,
        y: desktopPanOffset.current.y + dy,
      });
    },
    [isDesktopPanning, desktopZoomed]
  );

  const handleDesktopMouseUp = useCallback(() => {
    setIsDesktopPanning(false);
  }, []);

  // Desktop scroll zoom
  const handleDesktopWheel = useCallback(
    (e) => {
      if (!enableZoom || isTouchDevice) return;
      e.preventDefault();

      if (e.deltaY < 0 && !desktopZoomed) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDesktopZoomOrigin({ x, y });
        setDesktopPan({ x: 0, y: 0 });
        setDesktopZoomed(true);
      } else if (e.deltaY > 0 && desktopZoomed) {
        setDesktopZoomed(false);
        setDesktopPan({ x: 0, y: 0 });
      }
    },
    [enableZoom, isTouchDevice, desktopZoomed]
  );

  // ═══════════════════════════════════════════
  // MOBILE: Swipe + Pinch + Double-tap + Pan
  // ═══════════════════════════════════════════

  const handleTouchStart = useCallback(
    (e) => {
      if (e.touches.length === 2 && enableZoom) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDistance.current = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY
        );
        pinchStartZoom.current = mobileZoomLevel;
        return;
      }

      if (e.touches.length === 1) {
        if (isMobileZoomed) {
          setIsMobilePanning(true);
          mobilePanStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
          mobilePanOffset.current = { ...mobilePan };
        } else if (enableSwipe) {
          setTouchEndX(null);
          setTouchStartX(e.touches[0].clientX);
        }
      }
    },
    [isMobileZoomed, mobileZoomLevel, mobilePan, enableSwipe, enableZoom]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 2 && enableZoom) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = Math.hypot(
          t2.clientX - t1.clientX,
          t2.clientY - t1.clientY
        );

        if (pinchStartDistance.current > 0) {
          const scale = distance / pinchStartDistance.current;
          const newZoom = Math.min(
            Math.max(1, pinchStartZoom.current * scale),
            maxZoomLevel
          );
          setMobileZoomLevel(newZoom);
          if (newZoom === 1) setMobilePan({ x: 0, y: 0 });
        }
        return;
      }

      if (e.touches.length === 1) {
        if (isMobileZoomed && isMobilePanning) {
          const dx = e.touches[0].clientX - mobilePanStart.current.x;
          const dy = e.touches[0].clientY - mobilePanStart.current.y;
          setMobilePan({
            x: mobilePanOffset.current.x + dx,
            y: mobilePanOffset.current.y + dy,
          });
        } else if (!isMobileZoomed && enableSwipe) {
          setTouchEndX(e.touches[0].clientX);
        }
      }
    },
    [isMobileZoomed, isMobilePanning, enableSwipe, enableZoom]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStartDistance.current = 0;
    setIsMobilePanning(false);

    // Snap to 1 if near
    if (mobileZoomLevel > 0.9 && mobileZoomLevel < 1.1) {
      setMobileZoomLevel(1);
      setMobilePan({ x: 0, y: 0 });
    }

    // Handle swipe (loop)
    if (!isMobileZoomed && touchStartX !== null && touchEndX !== null && enableSwipe) {
      const distance = touchStartX - touchEndX;
      if (distance > minSwipeDistance) {
        goToNext();
      } else if (distance < -minSwipeDistance) {
        goToPrevious();
      }
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }, [touchStartX, touchEndX, isMobileZoomed, mobileZoomLevel, enableSwipe, goToNext, goToPrevious]);

  // Double tap zoom (mobile) — zoom no ponto tocado
  const handleMobileDoubleTap = useCallback(
    (e) => {
      if (!enableZoom || !isTouchDevice) return;

      const now = Date.now();
      const tapGap = now - lastTap.current;

      if (tapGap < 300 && tapGap > 0) {
        e.preventDefault();
        if (isMobileZoomed) {
          setMobileZoomLevel(1);
          setMobilePan({ x: 0, y: 0 });
        } else {
          setMobileZoomLevel(2.5);
          const rect = e.currentTarget.getBoundingClientRect();
          const touch = e.changedTouches?.[0] || e;
          const touchX = (touch.clientX || 0) - rect.left;
          const touchY = (touch.clientY || 0) - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          setMobilePan({
            x: (centerX - touchX) * 1.5,
            y: (centerY - touchY) * 1.5,
          });
        }
      }

      lastTap.current = now;
    },
    [enableZoom, isTouchDevice, isMobileZoomed]
  );

  // ═══════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════

  // Auto-scroll thumbnail
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

  // Keyboard
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
          if (desktopZoomed || isMobileZoomed) {
            resetAllZoom();
          } else {
            onClose?.();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, resetAllZoom, desktopZoomed, isMobileZoomed, onClose]);

  // Init / Cleanup
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
      resetAllZoom();
    } else {
      document.body.style.overflow = 'auto';
      resetAllZoom();
    }
  }, [isOpen, initialIndex, resetAllZoom]);

  // Prevent scroll on touch
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
      if (e.target === e.currentTarget && !desktopZoomed && !isMobileZoomed) {
        onClose?.();
      }
    },
    [desktopZoomed, isMobileZoomed, onClose]
  );

  if (!isOpen || !images.length) return null;

  const currentImage = images[currentIndex] || '';
  const hasMultipleImages = images.length > 1;

  return (
    <div
      ref={modalRef}
      className='fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm'
      onClick={handleBackdropClick}
      style={{ touchAction: isMobileZoomed ? 'none' : 'pan-y' }}
    >
      {/* ═══ TOP BAR ═══ */}
      <div className='absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 sm:px-6'>
        {showCounter && hasMultipleImages && (
          <span className='text-white/70 text-sm font-medium tracking-wide'>
            {currentIndex + 1} / {images.length}
          </span>
        )}
        {!showCounter && <span />}

        {enableZoom && !isTouchDevice && (
          <span className='text-white/40 text-xs hidden md:block'>
            {desktopZoomed
              ? 'Arraste para explorar • Clique para sair do zoom'
              : 'Clique na imagem para zoom • Scroll para zoom'}
          </span>
        )}

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
      <div className='h-full flex flex-col md:flex-row items-center justify-center pt-14 pb-4 md:py-16 md:px-6 lg:px-12'>

        {/* ─── DESKTOP VERTICAL THUMBNAILS ─── */}
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
        >
          {isImageLoading && (
            <div className='absolute inset-0 flex items-center justify-center z-40'>
              <div className='animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white/80' />
            </div>
          )}

          {/* ═══ DESKTOP IMAGE ═══ */}
          <div
            className='hidden md:flex items-center justify-center w-full h-full relative overflow-hidden'
            onClick={handleDesktopClick}
            onMouseDown={handleDesktopMouseDown}
            onMouseMove={handleDesktopMouseMove}
            onMouseUp={handleDesktopMouseUp}
            onMouseLeave={handleDesktopMouseUp}
            onWheel={handleDesktopWheel}
            style={{
              cursor: desktopZoomed
                ? isDesktopPanning ? 'grabbing' : 'grab'
                : enableZoom ? 'zoom-in' : 'default',
            }}
          >
            <img
              ref={desktopImageRef}
              src={currentImage}
              alt={`${productName} - Imagem ${currentIndex + 1}`}
              className={`
                max-w-full max-h-[75vh] object-contain select-none
                ${isImageLoading ? 'opacity-0' : 'opacity-100'}
              `}
              style={{
                transformOrigin: `${desktopZoomOrigin.x}% ${desktopZoomOrigin.y}%`,
                transform: desktopZoomed
                  ? `scale(${DESKTOP_ZOOM_SCALE}) translate(${desktopPan.x / DESKTOP_ZOOM_SCALE}px, ${desktopPan.y / DESKTOP_ZOOM_SCALE}px)`
                  : 'scale(1)',
                transition: isDesktopPanning
                  ? 'none'
                  : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>

          {/* ═══ MOBILE IMAGE ═══ */}
          <div
            className='md:hidden flex items-center justify-center w-full h-full overflow-hidden'
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleMobileDoubleTap}
          >
            <img
              src={currentImage}
              alt={`${productName} - Imagem ${currentIndex + 1}`}
              className={`
                max-w-full max-h-[65vh] object-contain select-none
                ${isImageLoading ? 'opacity-0' : 'opacity-100'}
              `}
              style={{
                transform: `scale(${mobileZoomLevel}) translate(${mobilePan.x / mobileZoomLevel}px, ${mobilePan.y / mobileZoomLevel}px)`,
                transition: isMobilePanning ? 'none' : 'transform 0.3s ease-out',
                touchAction: 'none',
                willChange: isMobileZoomed ? 'transform' : 'auto',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>

          {/* ═══ NAVIGATION ARROWS (sempre visíveis, loop) ═══ */}
          {!desktopZoomed && !isMobileZoomed && hasMultipleImages && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                className='absolute left-2 sm:left-3 md:left-[-52px] top-1/2 -translate-y-1/2
                  w-10 h-10 md:w-11 md:h-11 rounded-full
                  flex items-center justify-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/40
                  bg-white/10 md:bg-white/5 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-sm'
                aria-label='Imagem anterior'
              >
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
                </svg>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className='absolute right-2 sm:right-3 md:right-[-52px] top-1/2 -translate-y-1/2
                  w-10 h-10 md:w-11 md:h-11 rounded-full
                  flex items-center justify-center transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/40
                  bg-white/10 md:bg-white/5 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-sm'
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

      {/* ═══ MOBILE BOTTOM ═══ */}
      {hasMultipleImages && !isMobileZoomed && (
        <div className='md:hidden absolute bottom-0 left-0 right-0 pb-5 safe-area-padding'>
          <div className='flex items-center justify-center gap-2 mb-3' role='tablist'>
            {images.map((_, index) => (
              <button
                key={`dot-${index}`}
                role='tab'
                aria-selected={currentIndex === index}
                onClick={() => goToImage(index)}
                className={`
                  rounded-full transition-all duration-300 focus:outline-none
                  ${currentIndex === index
                    ? 'w-6 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40'
                  }
                `}
                aria-label={`Imagem ${index + 1}`}
              />
            ))}
          </div>

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

      {/* ═══ ZOOM INDICATORS ═══ */}
      {isMobileZoomed && isTouchDevice && (
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-50
          text-white/70 text-xs bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm'>
          {Math.round(mobileZoomLevel * 100)}% • Toque duplo para sair
        </div>
      )}

      {desktopZoomed && !isTouchDevice && (
        <div className='hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-50
          text-white/50 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm'>
          {Math.round(DESKTOP_ZOOM_SCALE * 100)}% • Arraste para explorar • Clique para sair
        </div>
      )}
    </div>
  );
};

export default ImageGalleryModal;