import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const announcements = [
  {
    bold: 'FRETE GRÁTIS',
    text: 'A PARTIR DE R$ 199',
    link: '/institucional/frete-gratis',
  },
  {
    bold: '10% DE DESCONTO',
    text: 'NO PIX À VISTA',
    link: '/products',
  },
  {
    bold: 'ATÉ 10X SEM JUROS',
    text: 'NO CARTÃO DE CRÉDITO',
    link: '/products',
  },
  {
    bold: 'ENTREGA NO MESMO DIA',
    text: 'GRANDE RIO — R$ 9,99',
    link: '/institucional/frete-gratis',
  },
];

const regions = [
  { value: 'br', label: '🇧🇷 Brasil', url: null },
  { value: 'eu', label: '🇵🇹 Europa', url: 'https://www.elitesurfing.pt/' },
];

// ═══ ÍCONES SVG INLINE (sem dependência extra) ═══
const InstagramIcon = () => (
  <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 24 24'>
    <path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' />
  </svg>
);

const FacebookIcon = () => (
  <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 24 24'>
    <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className='w-3 h-3' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
    <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' />
  </svg>
);

const GlobeIcon = () => (
  <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.8}>
    <path strokeLinecap='round' strokeLinejoin='round' d='M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-4.247m0 0A8.966 8.966 0 013 12c0-1.528.38-2.967 1.05-4.228' />
  </svg>
);

const AnnouncementBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ═══ ROTAÇÃO DOS ANÚNCIOS ═══
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
        setIsAnimating(false);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // ═══ FECHAR DROPDOWN AO CLICAR FORA ═══
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowRegionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegionChange = (region) => {
    setShowRegionDropdown(false);
    if (region.url) {
      window.location.href = region.url;
    }
  };

  const current = announcements[currentIndex];

  return (
    <div className='bg-gray-900 relative z-[60]'>
      <div className='max-w-7xl mx-auto px-4 py-2'>
        <div className='flex items-center justify-between'>

          {/* ═══ ESQUERDA — Seletor de Região ═══ */}
          <div className='hidden sm:flex items-center flex-shrink-0' ref={dropdownRef}>
            <div className='relative'>
              <button
                onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                className='flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-[11px] tracking-wide uppercase cursor-pointer group'
              >
                <GlobeIcon />
                <span>
                  Região: <span className='font-semibold text-white'>Brasil</span>
                </span>
                <ChevronDownIcon />
              </button>

              {/* Dropdown */}
              {showRegionDropdown && (
                <div className='absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-[100] min-w-[160px]'>
                  {regions.map((region) => (
                    <button
                      key={region.value}
                      onClick={() => handleRegionChange(region)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                        region.value === 'br'
                          ? 'bg-primary/5 text-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className='text-base'>{region.label.slice(0, 4)}</span>
                      <span>{region.label.slice(4)}</span>
                      {region.value === 'br' && (
                        <svg className='w-3.5 h-3.5 ml-auto text-primary' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ CENTRO — Anúncios Rotativos ═══ */}
          <div className='flex-1 flex items-center justify-center'>
            <Link
              to={current.link}
              className='flex items-center justify-center h-5 overflow-hidden'
            >
              <div
                className={`transition-all duration-400 ease-in-out ${
                  isAnimating
                    ? 'opacity-0 -translate-y-full'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                <p className='text-[11px] sm:text-xs tracking-widest uppercase text-zinc-300 hover:text-white transition-colors text-center whitespace-nowrap'>
                  <span className='font-bold text-white'>{current.bold}</span>
                  {'  |  '}
                  <span>{current.text}</span>
                </p>
              </div>
            </Link>
          </div>

          {/* ═══ DIREITA — Redes Sociais ═══ */}
          <div className='hidden sm:flex items-center gap-3 flex-shrink-0'>
            <span className='text-[11px] text-zinc-500 tracking-wide uppercase'>Siga-nos:</span>
            <div className='flex items-center gap-2.5'>
              <a
                href='https://www.instagram.com/elitesurfing'
                target='_blank'
                rel='noopener noreferrer'
                className='text-zinc-400 hover:text-pink-400 transition-colors duration-200'
                title='Instagram'
              >
                <InstagramIcon />
              </a>
              <a
                href='https://www.facebook.com/elitesurfing.com.br'
                target='_blank'
                rel='noopener noreferrer'
                className='text-zinc-400 hover:text-blue-400 transition-colors duration-200'
                title='Facebook'
              >
                <FacebookIcon />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnnouncementBar;