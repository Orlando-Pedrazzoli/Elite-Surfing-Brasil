import React, { useState, useEffect, useCallback, useRef } from 'react';

const slides = [
  {
    id: 1,
    desktop: '/hero-new.jpg',
    mobile: '/hero-new.jpg',
    alt: 'Elite Surfing - Surf Hard, Make History',
    title: <>Precision Meets <br/>Performance</>,
    subtitle: 'Elite Surfing',
    objectPosition: 'center',
  },
  {
    id: 2,
    desktop: '/banner-novo2.png',
    mobile: '/banner-carlos-mobile.jpg',
    alt: 'Surfer riding a powerful wave',
    subtitle: 'Premium Surf Accessories',
    objectPosition: 'center',
  },
];

const AUTOPLAY_INTERVAL = 5000; // 5s — mais dinâmico
const TRANSITION_DURATION = 700; // ms

const MainBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const timerRef = useRef(null);
  const bannerRef = useRef(null);

  // ─── Autoplay ───
  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      goToSlide('next');
    }, AUTOPLAY_INTERVAL);
  }, []);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  // ─── Navigation ───
  const goToSlide = useCallback((direction) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setCurrentSlide((prev) => {
      if (direction === 'next') return (prev + 1) % slides.length;
      if (direction === 'prev') return (prev - 1 + slides.length) % slides.length;
      return direction; // direct index
    });

    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
  }, [isTransitioning]);

  const goToIndex = useCallback((index) => {
    if (index === currentSlide || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    stopAutoplay();
    startAutoplay();
  }, [currentSlide, isTransitioning, stopAutoplay, startAutoplay]);

  const handlePrev = () => {
    goToSlide('prev');
    stopAutoplay(); startAutoplay();
  };

  const handleNext = () => {
    goToSlide('next');
    stopAutoplay(); startAutoplay();
  };

  // ─── Keyboard Navigation ───
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
  };

  // ─── Touch/Swipe Support ───
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  };

  // ─── Preload images ───
  useEffect(() => {
    slides.forEach((slide) => {
      const imgDesktop = new Image();
      imgDesktop.src = slide.desktop;
      const imgMobile = new Image();
      imgMobile.src = slide.mobile;
    });
  }, []);

  return (
    <div
      ref={bannerRef}
      className='relative -mt-[72px] overflow-hidden w-full max-w-full group'
      role='region'
      aria-roledescription='carousel'
      aria-label='Banner principal Elite Surfing'
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ═══ SLIDES ═══ */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          role='group'
          aria-roledescription='slide'
          aria-label={`Slide ${index + 1} de ${slides.length}`}
          aria-hidden={index !== currentSlide}
          className='absolute inset-0 transition-opacity ease-in-out'
          style={{
            transitionDuration: `${TRANSITION_DURATION}ms`,
            opacity: index === currentSlide ? 1 : 0,
            zIndex: index === currentSlide ? 1 : 0,
          }}
        >
          {/* Desktop Image */}
          <img
            src={slide.desktop}
            alt={slide.alt}
            className='w-full h-[85vh] min-h-[600px] hidden md:block object-cover'
            style={{ objectPosition: slide.objectPosition }}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
          
          {/* Mobile Image */}
          <img
            src={slide.mobile}
            alt={slide.alt}
            className='w-full h-[75vh] min-h-[500px] md:hidden object-cover'
            style={{ objectPosition: slide.objectPosition }}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
          />
        </div>
      ))}

      {/* ═══ First slide placeholder for height ═══ */}
      <div className='relative invisible' aria-hidden='true'>
        <img
          src={slides[0].desktop}
          alt=''
          className='w-full h-[85vh] min-h-[600px] hidden md:block object-cover'
        />
        <img
          src={slides[0].mobile}
          alt=''
          className='w-full h-[75vh] min-h-[500px] md:hidden object-cover'
        />
      </div>

      {/* ═══ Overlay ═══ */}
      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 z-[2]' />

      {/* ═══ Content ═══ */}
      <div className='text-white absolute inset-0 flex flex-col items-start justify-end pb-16 md:pb-24 px-4 md:px-16 lg:px-24 xl:px-32 z-[3]'>
        
        {/* Title com crossfade */}
        <div className='relative w-full min-h-[64px] md:min-h-[120px]'>
          {slides.map((slide, index) => (
            <h1
              key={slide.id}
              className='text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold italic text-left leading-tight md:leading-none transition-all ease-in-out absolute inset-x-0 top-0'
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                transitionDuration: `${TRANSITION_DURATION}ms`,
                opacity: index === currentSlide ? 1 : 0,
                transform: index === currentSlide 
                  ? 'translateY(0)' 
                  : 'translateY(12px)',
              }}
              aria-hidden={index !== currentSlide}
            >
              {slide.title}
            </h1>
          ))}
        </div>

        {/* Subtitle */}
        <div className='flex items-center gap-2 md:gap-3 mt-3 md:mt-6'>
          <span className='w-6 md:w-12 h-[1px] bg-white/60'></span>
          <p
            className='text-xs md:text-base tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-white/90'
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {slides[currentSlide].subtitle}
          </p>
        </div>
      </div>

      {/* ═══ Arrow Controls ═══ */}
      <button
        onClick={handlePrev}
        aria-label='Slide anterior'
        className='absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[4]
          w-10 h-10 md:w-12 md:h-12 rounded-full 
          bg-black/20 backdrop-blur-sm border border-white/20
          flex items-center justify-center
          text-white/70 hover:text-white hover:bg-black/40
          transition-all duration-200
          md:opacity-0 md:group-hover:opacity-100
          focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50'
      >
        <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' />
        </svg>
      </button>

      <button
        onClick={handleNext}
        aria-label='Próximo slide'
        className='absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[4]
          w-10 h-10 md:w-12 md:h-12 rounded-full
          bg-black/20 backdrop-blur-sm border border-white/20
          flex items-center justify-center
          text-white/70 hover:text-white hover:bg-black/40
          transition-all duration-200
          md:opacity-0 md:group-hover:opacity-100
          focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50'
      >
        <svg className='w-5 h-5 md:w-6 md:h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
        </svg>
      </button>

      {/* ═══ Dots ═══ */}
      <div className='absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2' role='tablist' aria-label='Slides do banner'>
        {slides.map((_, index) => (
          <button
            key={index}
            role='tab'
            aria-selected={index === currentSlide}
            aria-label={`Ir para slide ${index + 1}`}
            onClick={() => goToIndex(index)}
            className={`
              rounded-full transition-all duration-300 
              focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-transparent
              ${index === currentSlide 
                ? 'w-8 h-2 bg-white' 
                : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }
            `}
          />
        ))}
      </div>

      {/* ═══ Progress bar ═══ */}
      <div className='absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-[4]'>
        <div
          className='h-full bg-white/40'
          style={{
            animation: `progressBar ${AUTOPLAY_INTERVAL}ms linear`,
            animationIterationCount: 1,
          }}
          key={`progress-${currentSlide}`}
        />
      </div>

      {/* ═══ CSS for progress bar animation ═══ */}
      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default MainBanner;