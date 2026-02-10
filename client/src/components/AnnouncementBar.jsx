import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const announcements = [
  { text: 'FRETE GRÁTIS  |  CONSULTE CONDIÇÕES', bold: 'FRETE GRÁTIS' },
  { text: '10% DE DESCONTO  |  À VISTA', bold: '10% DE DESCONTO' },
  { text: 'PAGAMENTO FACILITADO  |  ATÉ 10X SEM JUROS', bold: 'PAGAMENTO FACILITADO' },
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
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='bg-gray-900 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 py-2.5'>
        <Link 
          to='/products'
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
                {announcements[currentIndex].bold}
              </span>
              {'  |  '}
              <span>
                {announcements[currentIndex].text.split('|')[1]?.trim()}
              </span>
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AnnouncementBar;