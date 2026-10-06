// client/src/components/MainBanner.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ HERO DA PÁGINA INICIAL — carrossel de banners
// ═══════════════════════════════════════════════════════════════════════
// Os banners deixaram de estar fixos no código: são geridos pelo admin em
// /seller/banners (imagem desktop, imagem mobile, textos, link e ordem).
// A leitura e a reserva (banners originais) estão em utils/heroBanners.js.
//
// O que mudou em relação à versão com banners fixos:
//   • cada slide usa <picture>: o browser descarrega SÓ a imagem do seu
//     tamanho de ecrã (antes descarregava a de desktop e a de mobile);
//   • o banner pode ter link — o slide inteiro fica clicável;
//   • textos opcionais: sem texto, a imagem não é escurecida;
//   • com um único banner não há setas, pontos nem rotação automática.
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_SLIDES,
  FALLBACK_AFTER_MS,
  getCachedHeroSlides,
  fetchHeroSlides,
  sameSlides,
} from '../utils/heroBanners';

const AUTOPLAY_INTERVAL = 5000;
const TRANSITION_DURATION = 700;

// Altura da hero (igual em todos os estados → a página não "salta")
const HERO_HEIGHT =
  'h-[75vh] min-h-[500px] md:h-[85vh] md:min-h-[600px]';

const isExternalLink = link => /^https?:\/\//i.test(link);

const MainBanner = () => {
  // null = primeira visita, ainda à espera do servidor
  const [slides, setSlides] = useState(() => getCachedHeroSlides());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const timerRef = useRef(null);
  const lockRef = useRef(false);

  const count = slides?.length || 0;
  const countRef = useRef(count);
  countRef.current = count;

  // ─── Banners do admin ───
  useEffect(() => {
    let active = true;

    // Servidor lento na primeira visita → mostra os banners originais
    const fallbackTimer = setTimeout(() => {
      if (active) setSlides(current => current || DEFAULT_SLIDES);
    }, FALLBACK_AFTER_MS);

    fetchHeroSlides().then(list => {
      if (!active) return;
      clearTimeout(fallbackTimer);
      setSlides(current =>
        current && sameSlides(current, list) ? current : list,
      );
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Lista nova (ex.: o admin alterou os banners) → volta ao primeiro
  useEffect(() => {
    setCurrentSlide(0);
  }, [slides]);

  // ─── Navegação ───
  const move = useCallback(target => {
    const total = countRef.current;
    if (total < 2 || lockRef.current) return;
    lockRef.current = true;
    setCurrentSlide(prev => {
      if (target === 'next') return (prev + 1) % total;
      if (target === 'prev') return (prev - 1 + total) % total;
      return Math.max(0, Math.min(total - 1, target));
    });
    setTimeout(() => {
      lockRef.current = false;
    }, TRANSITION_DURATION);
  }, []);

  // ─── Autoplay (só com 2 ou mais banners) ───
  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (countRef.current < 2) return;
    timerRef.current = setInterval(() => move('next'), AUTOPLAY_INTERVAL);
  }, [move, stopAutoplay]);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [count, startAutoplay, stopAutoplay]);

  const handlePrev = () => {
    move('prev');
    startAutoplay();
  };

  const handleNext = () => {
    move('next');
    startAutoplay();
  };

  const goToIndex = index => {
    if (index === currentSlide) return;
    move(index);
    startAutoplay();
  };

  // ─── Teclado ───
  const handleKeyDown = e => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  // ─── Toque / swipe ───
  const handleTouchStart = e => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = e => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStart(null);
  };

  // ═══ A carregar (primeira visita): mesma altura, sem imagem ═══
  if (!slides) {
    return (
      <div
        className={`relative -mt-[72px] w-full max-w-full bg-primary-dark ${HERO_HEIGHT}`}
        aria-hidden='true'
      />
    );
  }

  const safeIndex = Math.min(currentSlide, count - 1);
  const active = slides[safeIndex];
  const hasMany = count > 1;

  // O slide inteiro é clicável quando o banner tem link
  const contentClass =
    'text-white absolute inset-0 flex flex-col items-start justify-end pb-16 md:pb-24 px-4 md:px-16 lg:px-24 xl:px-32 z-[3]';
  const content = (
    <>
      {/* =====================================================
          SEO: os textos da hero são <p> decorativos. O H1 real
          está no Home.jsx (sr-only) — cada página tem 1 só H1.
          ===================================================== */}
      <div className='relative w-full min-h-[64px] md:min-h-[120px]'>
        {slides.map((slide, index) =>
          slide.heading ? (
            <p
              key={slide.id}
              className='text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-semibold italic text-left leading-tight md:leading-none whitespace-pre-line transition-all ease-in-out absolute inset-x-0 bottom-0'
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                transitionDuration: `${TRANSITION_DURATION}ms`,
                opacity: index === safeIndex ? 1 : 0,
                transform:
                  index === safeIndex ? 'translateY(0)' : 'translateY(12px)',
              }}
              aria-hidden={index !== safeIndex}
            >
              {slide.heading}
            </p>
          ) : null,
        )}
      </div>

      {/* Texto secundário */}
      <div className='flex items-center gap-2 md:gap-3 mt-3 md:mt-6 min-h-[16px] md:min-h-[24px]'>
        {active.subtitle && (
          <>
            <span className='w-6 md:w-12 h-[1px] bg-white/60'></span>
            <p
              className='text-xs md:text-base tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-white/90'
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
            >
              {active.subtitle}
            </p>
          </>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`relative -mt-[72px] overflow-hidden w-full max-w-full group bg-primary-dark ${HERO_HEIGHT}`}
      role='region'
      aria-roledescription='carousel'
      aria-label='Banner principal Elite Surfing'
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ═══ SLIDES ═══ */}
      {slides.map((slide, index) => {
        const hasText = !!(slide.heading || slide.subtitle);
        return (
          <div
            key={slide.id}
            role='group'
            aria-roledescription='slide'
            aria-label={`Slide ${index + 1} de ${count}`}
            aria-hidden={index !== safeIndex}
            className='absolute inset-0 transition-opacity ease-in-out'
            style={{
              transitionDuration: `${TRANSITION_DURATION}ms`,
              opacity: index === safeIndex ? 1 : 0,
              zIndex: index === safeIndex ? 1 : 0,
            }}
          >
            {/* <picture>: só é descarregada a imagem do tamanho do ecrã */}
            <picture>
              <source media='(min-width: 768px)' srcSet={slide.desktop} />
              <img
                src={slide.mobile}
                alt={slide.alt}
                className='w-full h-full object-cover object-center'
                loading='eager'
                decoding={index === 0 ? 'sync' : 'async'}
                fetchPriority={index === 0 ? 'high' : 'low'}
              />
            </picture>

            {/* Escurecimento: forte só quando há texto por cima; sem
                texto, apenas o topo (para o menu continuar legível) */}
            <div
              className={`absolute inset-0 ${
                hasText
                  ? 'bg-gradient-to-t from-black/70 via-black/20 to-black/30'
                  : 'bg-gradient-to-b from-black/35 via-black/5 to-transparent'
              }`}
            />
          </div>
        );
      })}

      {/* ═══ Conteúdo (clicável quando o banner tem link) ═══ */}
      {!active.link ? (
        <div className={contentClass}>{content}</div>
      ) : isExternalLink(active.link) ? (
        <a
          href={active.link}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={active.alt}
          className={contentClass}
        >
          {content}
        </a>
      ) : (
        <Link to={active.link} aria-label={active.alt} className={contentClass}>
          {content}
        </Link>
      )}

      {hasMany && (
        <>
          {/* ═══ Setas ═══ */}
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
            <svg
              className='w-5 h-5 md:w-6 md:h-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15 19l-7-7 7-7'
              />
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
            <svg
              className='w-5 h-5 md:w-6 md:h-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 5l7 7-7 7'
              />
            </svg>
          </button>

          {/* ═══ Pontos ═══ */}
          <div
            className='absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2'
            role='tablist'
            aria-label='Slides do banner'
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                role='tab'
                aria-selected={index === safeIndex}
                aria-label={`Ir para slide ${index + 1}`}
                onClick={() => goToIndex(index)}
                className={`
                  rounded-full transition-all duration-300
                  focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-transparent
                  ${
                    index === safeIndex
                      ? 'w-8 h-2 bg-white'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  }
                `}
              />
            ))}
          </div>

          {/* ═══ Barra de progresso ═══ */}
          <div className='absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-[4]'>
            <div
              className='h-full bg-white/40'
              style={{
                animation: `progressBar ${AUTOPLAY_INTERVAL}ms linear`,
                animationIterationCount: 1,
              }}
              key={`progress-${safeIndex}`}
            />
          </div>

          <style>{`
            @keyframes progressBar {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default MainBanner;
