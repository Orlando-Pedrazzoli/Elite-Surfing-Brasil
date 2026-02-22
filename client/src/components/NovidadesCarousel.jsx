import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProductCard from './ProductCard';

// ═══════════════════════════════════════════════════════════════
// IDs DOS PRODUTOS SELECIONADOS PARA "NOVIDADES"
// ═══════════════════════════════════════════════════════════════
const NOVIDADES_PRODUCT_IDS = [
  // Substitua pelos IDs reais dos seus produtos
];

const NovidadesCarousel = () => {
  const { axios, products } = useAppContext();
  const [novidadesProducts, setNovidadesProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchNovidades();
  }, [products]);

  const fetchNovidades = async () => {
    try {
      if (NOVIDADES_PRODUCT_IDS.length > 0) {
        const { data } = await axios.post('/api/product/by-ids', {
          ids: NOVIDADES_PRODUCT_IDS,
        });
        if (data.success && data.products.length > 0) {
          const ordered = NOVIDADES_PRODUCT_IDS
            .map(id => data.products.find(p => p._id === id))
            .filter(Boolean);
          setNovidadesProducts(ordered);
          setIsLoading(false);
          return;
        }
      }
      if (products && products.length > 0) {
        const recent = [...products]
          .filter(p => p.isMainVariant !== false && p.inStock)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8);
        setNovidadesProducts(recent);
      }
    } catch (error) {
      console.error('Erro ao buscar novidades:', error);
      if (products && products.length > 0) {
        const recent = [...products]
          .filter(p => p.isMainVariant !== false && p.inStock)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8);
        setNovidadesProducts(recent);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkScrollability = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [novidadesProducts]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-novidade-card]')?.offsetWidth || 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 2;
    el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  if (!isLoading && novidadesProducts.length === 0) return null;

  return (
    <section className='py-12 md:py-16'>
      <div className='px-6 md:px-16 lg:px-24 xl:px-32'>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='flex items-center justify-between mb-8'
        >
          <div className='flex items-center gap-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10'>
              <Sparkles className='w-5 h-5 text-primary' />
            </div>
            <div>
              <h2 className='text-2xl md:text-3xl font-bold text-gray-900'>
                Novidades
              </h2>
              <p className='text-sm text-gray-500 mt-0.5'>
                Produtos selecionados para você
              </p>
            </div>
          </div>

          <div className='hidden md:flex items-center gap-2'>
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className={`p-2.5 rounded-full border transition-all duration-200 ${
                canScrollLeft
                  ? 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className='w-5 h-5' />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className={`p-2.5 rounded-full border transition-all duration-200 ${
                canScrollRight
                  ? 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
            >
              <ChevronRight className='w-5 h-5' />
            </button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className='flex gap-4 overflow-hidden'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex-shrink-0 w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px]'>
                <div className='bg-gray-100 rounded-xl animate-pulse'>
                  <div className='aspect-square rounded-t-xl bg-gray-200' />
                  <div className='p-4 space-y-3'>
                    <div className='h-4 bg-gray-200 rounded w-3/4' />
                    <div className='h-3 bg-gray-200 rounded w-1/2' />
                    <div className='h-5 bg-gray-200 rounded w-1/3' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='relative'>
            {canScrollLeft && (
              <div className='absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none' />
            )}
            {canScrollRight && (
              <div className='absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none' />
            )}

            <div
              ref={scrollRef}
              className='flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory'
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {novidadesProducts.map((product, index) => (
                <motion.div
                  key={product._id}
                  data-novidade-card
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className='flex-shrink-0 w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px] snap-start'
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default NovidadesCarousel;