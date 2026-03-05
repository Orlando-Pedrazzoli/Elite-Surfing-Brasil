import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../assets/assets';
import { useAppContext } from '../context/AppContext';

const Categories = () => {
  const { products } = useAppContext();

  // Calcular contagem de produtos por categoria (apenas principais e em stock)
  const categoryCounts = useMemo(() => {
    const counts = {};

    products.forEach(product => {
      if (product.isMainVariant !== false && product.inStock) {
        const categoryKey = product.category?.toLowerCase();
        if (categoryKey) {
          counts[categoryKey] = (counts[categoryKey] || 0) + 1;
        }
      }
    });

    return counts;
  }, [products]);

  // Ordenar categorias: primeiro as que têm produtos, depois por quantidade
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = categoryCounts[a.path.toLowerCase()] || 0;
      const countB = categoryCounts[b.path.toLowerCase()] || 0;
      return countB - countA;
    });
  }, [categoryCounts]);

  return (
    <div className='mt-16 hidden md:block px-6 md:px-16 lg:px-24 xl:px-32'>
      {/* =====================================================
          SEO: Usar H2 semântico em vez de <p> genérico.
          Headings ajudam crawlers a entender a hierarquia do conteúdo.
          ===================================================== */}
      <h2 className='text-2xl md:text-3xl font-medium'>Modelos</h2>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 mt-6 gap-6'>
        {sortedCategories.map((category, index) => {
          const count = categoryCounts[category.path.toLowerCase()] || 0;
          const hasProducts = count > 0;

          return (
            /* =====================================================
               SEO FIX: Trocado <div onClick={navigate}> por <Link to="">
               
               ANTES: <div onClick={() => navigate(`/products/${path}`)}>
               - Crawlers NÃO seguem onClick (é JavaScript)
               - Resultado: 0 internal links detectados pelo auditor
               
               DEPOIS: <Link to={`/products/${path}`}>
               - Crawlers SEGUEM <a href=""> (HTML semântico)
               - Resultado: links internos indexados corretamente
               ===================================================== */
            <Link
              key={index}
              to={`/products/${category.path.toLowerCase()}`}
              className={`group py-5 px-3 gap-2 rounded-lg flex flex-col justify-center items-center relative overflow-hidden transition-all duration-300 ${
                hasProducts
                  ? 'hover:shadow-lg hover:scale-[1.02]'
                  : 'opacity-50 grayscale hover:opacity-70 hover:grayscale-0'
              }`}
              style={{ backgroundColor: category.bgColor }}
              onClick={() => scrollTo(0, 0)}
            >
              {/* Badge com contagem de produtos */}
              {hasProducts && (
                <span className='absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm'>
                  {count}
                </span>
              )}

              <img
                src={category.image}
                alt={category.text}
                className='group-hover:scale-108 transition-transform duration-300 max-w-28'
              />
              <span className='text-sm font-medium text-center'>
                {category.text}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;
