import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const announcements = [
  { 
    bold: 'FRETE GRÁTIS', 
    text: 'A PARTIR DE R$ 199', 
    link: '/institucional/frete-gratis' 
  },
  { 
    bold: '10% DE DESCONTO', 
    text: 'NO PIX À VISTA', 
    link: '/products' 
  },
  { 
    bold: 'ATÉ 10X SEM JUROS', 
    text: 'NO CARTÃO DE CRÉDITO', 
    link: '/products' 
  },
  { 
    bold: 'ENTREGA NO MESMO DIA', 
    text: 'GRANDE RIO — R$ 9,99', 
    link: '/institucional/frete-gratis' 
  },
];

const AnnouncementBar = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const current = announcements[currentIndex];

  return (
    <div className='bg-gray-900 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 py-2.5'>
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
            <p className='text-xs tracking-widest uppercase text-zinc-300 hover:text-white transition-colors text-center whitespace-nowrap'>
              <span className='font-bold text-white'>
                {current.bold}
              </span>
              {'  |  '}
              <span>{current.text}</span>
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AnnouncementBar;