// client/src/components/AnnouncementBar.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📣 BARRA DE ANÚNCIOS (topo do site)
// ═══════════════════════════════════════════════════════════════════════
//   Esquerda : CTA "Seja um revendedor" → /revendedores (pedido do admin em
//              31/10/2026; substitui o antigo seletor de região, que era
//              irrelevante para a loja brasileira)
//   Centro   : anúncios rotativos (frete, PIX, parcelamento)
//   Direita  : redes sociais
//
// No celular o CTA aparece em versão compacta ("Revenda") para não
// disputar espaço com o anúncio rotativo.
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';

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
    bold: 'ATÉ 6X SEM JUROS',
    text: 'NO CARTÃO DE CRÉDITO',
    link: '/products',
  },
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

const AnnouncementBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // ═══ ROTAÇÃO DOS ANÚNCIOS ═══
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % announcements.length);
        setIsAnimating(false);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const current = announcements[currentIndex];

  return (
    <div className='bg-gray-900 relative z-[60]'>
      <div className='max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2'>
        <div className='flex items-center justify-between gap-2'>
          {/* ═══ ESQUERDA — CTA Seja um revendedor ═══ */}
          <div className='flex items-center flex-shrink-0'>
            <Link
              to='/revendedores'
              title='Programa de revendedores Elite Surfing'
              className='group inline-flex items-center gap-1.5 rounded-full bg-sky-400 text-gray-900 text-[10px] sm:text-[11px] font-black tracking-widest uppercase pl-2.5 pr-3 py-1 sm:py-1.5 shadow-[0_0_0_2px_rgba(56,189,248,0.25)] hover:bg-sky-300 hover:shadow-[0_0_0_4px_rgba(56,189,248,0.35)] transition-all duration-200 whitespace-nowrap'
            >
              <Store className='w-3.5 h-3.5 group-hover:-rotate-6 transition-transform' />
              <span className='hidden sm:inline'>Seja um revendedor</span>
              <span className='sm:hidden'>Revenda</span>
            </Link>
          </div>

          {/* ═══ CENTRO — Anúncios Rotativos ═══ */}
          <div className='flex-1 min-w-0 flex items-center justify-center'>
            <Link
              to={current.link}
              className='flex items-center justify-center h-5 overflow-hidden max-w-full'
            >
              <div
                className={`transition-all duration-400 ease-in-out ${
                  isAnimating
                    ? 'opacity-0 -translate-y-full'
                    : 'opacity-100 translate-y-0'
                }`}
              >
                <p className='text-[10px] sm:text-xs tracking-wider sm:tracking-widest uppercase text-zinc-300 hover:text-white transition-colors text-center whitespace-nowrap truncate'>
                  <span className='font-bold text-white'>{current.bold}</span>
                  {'  |  '}
                  <span>{current.text}</span>
                </p>
              </div>
            </Link>
          </div>

          {/* ═══ DIREITA — Redes Sociais ═══ */}
          <div className='hidden sm:flex items-center gap-3 flex-shrink-0'>
            <span className='text-[11px] text-zinc-500 tracking-wide uppercase'>
              Siga-nos:
            </span>
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
