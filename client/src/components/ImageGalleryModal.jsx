// ImageGalleryModal.jsx - E-commerce grade image gallery with professional zoom
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { assets } from '../assets/assets';
import '../styles/ProductDetails.css';

/**
 * Clamp helper
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * ImageGalleryModal — Layout premium e-commerce
 *
 * DESKTOP (md+): hidden md:flex div handles mouse events
 *   - Scroll wheel progressive zoom (1x → 5x), zoom-to-cursor
 *   - Click zoom toggle (1x ↔ 2.5x) no ponto do clique
 *   - Double-click reset a 1x
 *   - Drag pan com clamping de limites
 *   - Keyboard: 0 reset, arrows navigate, Esc close/reset
 *
 * MOBILE (<md): md:hidden div handles touch events
 *   - Swipe horizontal (loop infinito)
 *   - Pinch-to-zoom progressivo (1x → 4x)
 *   - Double-tap zoom no ponto tocado
 *   - Pan com clamping
 *
 * NOTA: Desktop e mobile são divs separados via CSS breakpoint (hidden md:flex / md:hidden).
 *       NÃO usamos isTouchDevice como guard nos handlers porque
 *       muitos laptops modernos (touchscreen) retornam true para
 *       'ontouchstart' in window, o que bloqueava totalmente o zoom desktop.
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
  const modalRef = useRef(null);
  const topBarRef = useRef(null);
  const imageContainerRef = useRef(null);
  const desktopImageRef = useRef(null);
  const desktopWrapperRef = useRef(null);
  const thumbnailContainerRef = useRef(null);

  // ─── Core state ───
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // ─── Desktop zoom state ───
  const [dZoom, setDZoom] = useState(1);
  const [dPan, setDPan] = useState({ x: 0, y: 0 });
  const [isDPanning, setIsDPanning] = useState(false);
  const dPanStartMouse = useRef({ x: 0, y: 0 });
  const dPanStartOffset = useRef({ x: 0, y: 0 });
  const dDragMoved = useRef(false);
  const dLastClickTime = useRef(0);
  const clickTimeoutRef = useRef(null);

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 5;
  const ZOOM_CLICK_LEVEL = 2.5;
  const ZOOM_WHEEL_FACTOR = 1.15;

  // ─── Mobile zoom/pan state ───
  const [mobileZoomLevel, setMobileZoomLevel] = useState(1);
  const [mobilePan, setMobilePan] = useState({ x: 0, y: 0 });
  const [isMobilePanning, setIsMobilePanning] = useState(false);
  const mobilePanStart = useRef({ x: 0, y: 0 });
  const mobilePanOffset = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  const pinchStartZoom = useRef(1);
  const lastTap = useRef(0);
  const maxMobileZoom = 4;

  // ─── Touch swipe state ───
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const minSwipeDistance = 50;

  const isDesktopZoomed = dZoom > 1.05;
  const isMobileZoomed = mobileZoomLevel > 1.05;

  // ═══════════════════════════════════════════
  // PAN BOUNDS
  // ═══════════════════════════════════════════

  const getDesktopPanBounds = useCallback(() => {
    if (!desktopImageRef.current || !desktopWrapperRef.current) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const img = desktopImageRef.current;
    const wrapper = desktopWrapperRef.current;
    const wrapperRect = wrapper.getBoundingClientRect();

    const imgDisplayW = img.naturalWidth > 0
      ? Math.min(img.naturalWidth, wrapperRect.width, img.clientWidth)
      : img.clientWidth;
    const imgDisplayH = img.naturalHeight > 0
      ? Math.min(img.naturalHeight, wrapperRect.height, img.clientHeight)
      : img.clientHeight;

    const scaledW = imgDisplayW * dZoom;
    const scaledH = imgDisplayH * dZoom;

    const overflowX = Math.max(0, (scaledW - wrapperRect.width) / 2);
    const overflowY = Math.max(0, (scaledH - wrapperRect.height) / 2);

    return { minX: -overflowX, maxX: overflowX, minY: -overflowY, maxY: overflowY };
  }, [dZoom]);

  const clampDesktopPan = useCallback(
    (x, y) => {
      const b = getDesktopPanBounds();
      return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
    },
    [getDesktopPanBounds]
  );

  const getMobilePanBounds = useCallback(() => {
    if (!imageContainerRef.current) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const rect = imageContainerRef.current.getBoundingClientRect();
    const scaledW = rect.width * mobileZoomLevel;
    const scaledH = rect.height * mobileZoomLevel;
    const overflowX = Math.max(0, (scaledW - rect.width) / 2);
    const overflowY = Math.max(0, (scaledH - rect.height) / 2);
    return { minX: -overflowX, maxX: overflowX, minY: -overflowY, maxY: overflowY };
  }, [mobileZoomLevel]);

  const clampMobilePan = useCallback(
    (x, y) => {
      const b = getMobilePanBounds();
      return { x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) };
    },
    [getMobilePanBounds]
  );

  // ═══════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════

  const resetAllZoom = useCallback(() => {
    setDZoom(1);
    setDPan({ x: 0, y: 0 });
    setIsDPanning(false);
    setMobileZoomLevel(1);
    setMobilePan({ x: 0, y: 0 });
    setIsMobilePanning(false);
  }, []);

  // ═══════════════════════════════════════════
  // NAVIGATION (loop)
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
  // DESKTOP ZOOM — sem guards de isTouchDevice
  // O div desktop já é `hidden md:flex`, não renderiza em mobile
  // ═══════════════════════════════════════════

  const getCursorRelativeToWrapper = useCallback((e) => {
    if (!desktopWrapperRef.current) return { cx: 0, cy: 0 };
    const rect = desktopWrapperRef.current.getBoundingClientRect();
    return {
      cx: e.clientX - rect.left - rect.width / 2,
      cy: e.clientY - rect.top - rect.height / 2,
    };
  }, []);

  // ── Scroll wheel: zoom progressivo, zoom-to-cursor ──
  const handleDesktopWheel = useCallback(
    (e) => {
      if (!enableZoom) return;
      e.preventDefault();

      const { cx, cy } = getCursorRelativeToWrapper(e);
      const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;

      setDZoom((prevZoom) => {
        const newZoom = clamp(prevZoom * factor, ZOOM_MIN, ZOOM_MAX);
        if (newZoom === prevZoom) return prevZoom;

        const ratio = newZoom / prevZoom;
        setDPan((prevPan) => ({
          x: cx - (cx - prevPan.x) * ratio,
          y: cy - (cy - prevPan.y) * ratio,
        }));
        return newZoom;
      });
    },
    [enableZoom, getCursorRelativeToWrapper]
  );

  // ── Click: single = toggle zoom, double = reset ──
  const handleDesktopClick = useCallback(
    (e) => {
      if (!enableZoom) return;

      // Arrastou durante pan → não é click
      if (dDragMoved.current) {
        dDragMoved.current = false;
        return;
      }

      const { cx, cy } = getCursorRelativeToWrapper(e);
      const now = Date.now();
      const isDoubleClick = now - dLastClickTime.current < 350;
      dLastClickTime.current = now;

      // Double-click → reset
      if (isDoubleClick) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        setDZoom(1);
        setDPan({ x: 0, y: 0 });
        return;
      }

      // Single-click (com delay para distinguir de double)
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        setDZoom((prevZoom) => {
          if (prevZoom > 1.05) {
            setDPan({ x: 0, y: 0 });
            return 1;
          }
          const ratio = ZOOM_CLICK_LEVEL / prevZoom;
          setDPan((prevPan) => ({
            x: cx - (cx - prevPan.x) * ratio,
            y: cy - (cy - prevPan.y) * ratio,
          }));
          return ZOOM_CLICK_LEVEL;
        });
      }, 250);
    },
    [enableZoom, getCursorRelativeToWrapper]
  );

  // ── Drag/Pan (só quando zoomed) ──
  const handleDesktopMouseDown = useCallback(
    (e) => {
      if (!enableZoom) return;

      // SEMPRE resetar — sem isto, clicks futuros ficam bloqueados
      dDragMoved.current = false;

      if (dZoom <= 1.05) return;

      e.preventDefault();
      setIsDPanning(true);
      dPanStartMouse.current = { x: e.clientX, y: e.clientY };
      dPanStartOffset.current = { ...dPan };
    },
    [enableZoom, dZoom, dPan]
  );

  const handleDesktopMouseMove = useCallback(
    (e) => {
      if (!isDPanning) return;

      const dx = e.clientX - dPanStartMouse.current.x;
      const dy = e.clientY - dPanStartMouse.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dDragMoved.current = true;
      }

      const clamped = clampDesktopPan(
        dPanStartOffset.current.x + dx,
        dPanStartOffset.current.y + dy
      );
      setDPan(clamped);
    },
    [isDPanning, clampDesktopPan]
  );

  const handleDesktopMouseUp = useCallback(() => {
    if (isDPanning) {
      setIsDPanning(false);
      setDPan((prev) => clampDesktopPan(prev.x, prev.y));
    }
  }, [isDPanning, clampDesktopPan]);

  // Clamp pan after zoom changes
  useEffect(() => {
    if (dZoom <= 1.05) {
      setDPan({ x: 0, y: 0 });
      return;
    }
    const t = requestAnimationFrame(() => {
      setDPan((prev) => clampDesktopPan(prev.x, prev.y));
    });
    return () => cancelAnimationFrame(t);
  }, [dZoom, clampDesktopPan, imageDimensions]);

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
          const newZoom = clamp(pinchStartZoom.current * scale, 1, maxMobileZoom);
          setMobileZoomLevel(newZoom);
          if (newZoom <= 1.05) setMobilePan({ x: 0, y: 0 });
        }
        return;
      }

      if (e.touches.length === 1) {
        if (isMobileZoomed && isMobilePanning) {
          const dx = e.touches[0].clientX - mobilePanStart.current.x;
          const dy = e.touches[0].clientY - mobilePanStart.current.y;
          const clamped = clampMobilePan(
            mobilePanOffset.current.x + dx,
            mobilePanOffset.current.y + dy
          );
          setMobilePan(clamped);
        } else if (!isMobileZoomed && enableSwipe) {
          setTouchEndX(e.touches[0].clientX);
        }
      }
    },
    [isMobileZoomed, isMobilePanning, enableSwipe, enableZoom, clampMobilePan]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStartDistance.current = 0;
    setIsMobilePanning(false);

    if (mobileZoomLevel > 0.9 && mobileZoomLevel < 1.1) {
      setMobileZoomLevel(1);
      setMobilePan({ x: 0, y: 0 });
    }

    if (!isMobileZoomed && touchStartX !== null && touchEndX !== null && enableSwipe) {
      const distance = touchStartX - touchEndX;
      if (distance > minSwipeDistance) goToNext();
      else if (distance < -minSwipeDistance) goToPrevious();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }, [touchStartX, touchEndX, isMobileZoomed, mobileZoomLevel, enableSwipe, goToNext, goToPrevious]);

  // Double tap zoom (mobile)
  const handleMobileDoubleTap = useCallback(
    (e) => {
      if (!enableZoom) return;

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
    [enableZoom, isMobileZoomed]
  );

  // ═══════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════

  // Auto-scroll thumbnail
  useEffect(() => {
    if (!thumbnailContainerRef.current) return;
    const activeThumb = thumbnailContainerRef.current.children[currentIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
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
          if (isDesktopZoomed || isMobileZoomed) {
            resetAllZoom();
          } else {
            onClose?.();
          }
          break;
        case '0':
          if (enableZoom) {
            e.preventDefault();
            resetAllZoom();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, resetAllZoom, isDesktopZoomed, isMobileZoomed, onClose, enableZoom]);

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

  // Cleanup click timeout
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // Prevent scroll on touch — EXCLUI top bar para não bloquear o close button
  useEffect(() => {
    if (!isOpen) return;
    const preventScroll = (e) => {
      if (topBarRef.current?.contains(e.target)) return;
      if (modalRef.current?.contains(e.target)) e.preventDefault();
    };
    document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventScroll);
  }, [isOpen]);

  // Global mouse events para pan desktop
  useEffect(() => {
    if (!isDPanning) return;

    const onMove = (e) => handleDesktopMouseMove(e);
    const onUp = () => handleDesktopMouseUp();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDPanning, handleDesktopMouseMove, handleDesktopMouseUp]);

  const handleImageLoad = useCallback((e) => {
    setIsImageLoading(false);
    setImageDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight });
  }, []);

  const handleImageError = useCallback((e) => {
    e.target.src = assets.placeholder_image || '/placeholder.jpg';
    setIsImageLoading(false);
  }, []);

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !isDesktopZoomed && !isMobileZoomed) {
        onClose?.();
      }
    },
    [isDesktopZoomed, isMobileZoomed, onClose]
  );

  // Close handler robusto — funciona com touch e mouse
  const handleCloseClick = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      onClose?.();
    },
    [onClose]
  );

  if (!isOpen || !images.length) return null;

  const currentImage = images[currentIndex] || '';
  const hasMultipleImages = images.length > 1;

  const getDesktopCursor = () => {
    if (!enableZoom) return 'default';
    if (isDPanning) return 'grabbing';
    if (isDesktopZoomed) return 'grab';
    return 'zoom-in';
  };

  const desktopTransform =
    dZoom === 1 && dPan.x === 0 && dPan.y === 0
      ? 'none'
      : `scale(${dZoom}) translate(${dPan.x / dZoom}px, ${dPan.y / dZoom}px)`;

  const desktopTransition = isDPanning
    ? 'none'
    : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

  return (
    <div
      ref={modalRef}
      className='fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm'
      onClick={handleBackdropClick}
      style={{ touchAction: isMobileZoomed ? 'none' : 'pan-y' }}
    >
      {/* ═══ TOP BAR ═══ */}
      <div
        ref={topBarRef}
        className='absolute top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 py-3 sm:px-6'
        style={{ pointerEvents: 'auto' }}
      >
        {showCounter && hasMultipleImages ? (
          <span className='text-white/70 text-sm font-medium tracking-wide'>
            {currentIndex + 1} / {images.length}
          </span>
        ) : (
          <span />
        )}

        {enableZoom && (
          <span className='text-white/40 text-xs hidden md:block'>
            {isDesktopZoomed
              ? 'Arraste para explorar • Clique ou Esc para sair • Scroll para ajustar'
              : 'Clique ou scroll para zoom'}
          </span>
        )}

        {/* CLOSE BUTTON — 48x48 touch target, z acima de tudo, onTouchEnd como fallback */}
        <button
          onClick={handleCloseClick}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose?.();
          }}
          className='relative z-[70] text-white/80 hover:text-white transition-colors duration-200
            w-12 h-12 flex items-center justify-center rounded-full
            hover:bg-white/10 active:bg-white/20
            focus:outline-none focus:ring-2 focus:ring-white/30'
          aria-label='Fechar galeria'
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg className='w-7 h-7' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
          </svg>
        </button>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className='h-full flex flex-col md:flex-row items-center justify-center pt-16 pb-4 md:py-16 md:px-6 lg:px-12'>

        {/* DESKTOP VERTICAL THUMBNAILS */}
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

        {/* MAIN IMAGE AREA */}
        <div
          ref={imageContainerRef}
          className='relative flex-1 flex items-center justify-center w-full h-full max-w-5xl'
        >
          {isImageLoading && (
            <div className='absolute inset-0 flex items-center justify-center z-40'>
              <div className='animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white/80' />
            </div>
          )}

          {/* DESKTOP IMAGE */}
          <div
            ref={desktopWrapperRef}
            className='hidden md:flex items-center justify-center w-full h-full relative overflow-hidden'
            onClick={handleDesktopClick}
            onMouseDown={handleDesktopMouseDown}
            onWheel={handleDesktopWheel}
            style={{ cursor: getDesktopCursor() }}
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
                transform: desktopTransform,
                transition: desktopTransition,
                willChange: isDesktopZoomed ? 'transform' : 'auto',
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>

          {/* MOBILE IMAGE */}
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

          {/* NAVIGATION ARROWS */}
          {!isDesktopZoomed && !isMobileZoomed && hasMultipleImages && (
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

      {/* MOBILE BOTTOM */}
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

      {/* ZOOM INDICATORS */}
      {isMobileZoomed && (
        <div className='md:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-50
          text-white/70 text-xs bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm'>
          {Math.round(mobileZoomLevel * 100)}% • Toque duplo para sair
        </div>
      )}

      {isDesktopZoomed && (
        <div className='hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-50
          text-white/50 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm'>
          {Math.round(dZoom * 100)}% • Arraste para explorar • Clique para sair • Scroll para ajustar
        </div>
      )}
    </div>
  );
};

export default ImageGalleryModal;