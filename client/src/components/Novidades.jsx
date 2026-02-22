import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ProductCard from './ProductCard';

// ═══════════════════════════════════════════════════════════════
// 🆕 IDs DOS PRODUTOS SELECIONADOS PARA "NOVIDADES"
// Cole aqui os IDs dos 8 produtos que quer mostrar na Home.
// ═══════════════════════════════════════════════════════════════
const NOVIDADES_PRODUCT_IDS = [
  // Substitua pelos IDs reais dos seus produtos:
   '698f30626b7abc5b49b5e48c',
   '69903892115d34f67873441c',
   '699473dd1bc634a0077808ed',
   '6995a7134f655bcc30626a36',
   '698c873bf6ffa451f6da7ab5',
   '69932ccdd9799aad2a36209c',
   '69907c7dfeeaff2c69960278',
   '6999c780f050586c18b0aa13',
];

const Novidades = () => {
  const { axios, products } = useAppContext();
  const [novidadesProducts, setNovidadesProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

      // Fallback: 8 produtos mais recentes
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

  if (!isLoading && novidadesProducts.length === 0) return null;

  return (
    <section className='py-12 md:py-16'>
      <div className='px-6 md:px-16 lg:px-24 xl:px-32'>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='flex items-center justify-center mb-8'
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
        </motion.div>

        {/* Grid: 2x2 mobile | 4x2 desktop */}
        {isLoading ? (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6'>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className='bg-gray-100 rounded-xl animate-pulse'>
                <div className='aspect-square rounded-t-xl bg-gray-200' />
                <div className='p-4 space-y-3'>
                  <div className='h-4 bg-gray-200 rounded w-3/4' />
                  <div className='h-3 bg-gray-200 rounded w-1/2' />
                  <div className='h-5 bg-gray-200 rounded w-1/3 mx-auto' />
                  <div className='h-3 bg-gray-200 rounded w-2/3 mx-auto' />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6'>
            {novidadesProducts.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Novidades;