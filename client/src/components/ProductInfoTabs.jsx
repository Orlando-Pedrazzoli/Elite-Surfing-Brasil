import { useState } from 'react';

const ProductInfoTabs = ({ product }) => {
  const [activeTab, setActiveTab] = useState('specs');
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640;
    }
    return true;
  });

  const hasWeight = product?.weight && product.weight > 0;
  const hasDimensions = product?.dimensions && 
    (product.dimensions.length > 0 || product.dimensions.width > 0 || product.dimensions.height > 0);
  const hasSku = product?.sku;
  const hasProductInfo = hasWeight || hasDimensions || hasSku;

  const tabs = [
    { id: 'specs', label: 'Especificações Técnicas' },
    ...(hasProductInfo ? [{ id: 'info', label: 'Informações do Produto' }] : []),
  ];

  const formatWeight = (grams) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2).replace('.', ',')} kg`;
    }
    return `${grams} g`;
  };

  return (
    <div>
      {/* Toggle (mobile-friendly) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200'
      >
        <div className='flex items-center gap-1'>
          {tabs.map((tab, index) => (
            <span key={tab.id}>
              <span
                className={`text-sm md:text-base font-semibold cursor-pointer transition-colors ${
                  activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(tab.id);
                  if (!isOpen) setIsOpen(true);
                }}
              >
                {tab.label}
              </span>
              {index < tabs.length - 1 && (
                <span className='text-gray-300 mx-2'>|</span>
              )}
            </span>
          ))}
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
      </button>

      {/* Conteúdo */}
      {isOpen && (
        <div className='mt-3 p-3 border border-gray-200 rounded-lg bg-white'>
          
          {/* Tab: Especificações Técnicas */}
          {activeTab === 'specs' && (
            <div>
              {product?.description && product.description.length > 0 ? (
                <ul className='space-y-2'>
                  {product.description.map((desc, index) => (
                    <li key={index} className='flex items-start gap-2 text-gray-700 text-sm'>
                      <span className='text-primary mt-1 text-xs'>●</span>
                      <span className='leading-relaxed'>{desc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-sm text-gray-400 italic'>Sem especificações disponíveis</p>
              )}
            </div>
          )}

          {/* Tab: Informações do Produto */}
          {activeTab === 'info' && hasProductInfo && (
            <div className='space-y-3'>
              <table className='w-full text-sm'>
                <tbody>
                  {hasSku && (
                    <tr className='border-b border-gray-100'>
                      <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap w-40'>
                        Código (SKU)
                      </td>
                      <td className='py-2.5 text-gray-800 font-mono text-xs'>
                        {product.sku}
                      </td>
                    </tr>
                  )}
                  {hasWeight && (
                    <tr className='border-b border-gray-100'>
                      <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap'>
                        Peso
                      </td>
                      <td className='py-2.5 text-gray-800'>
                        {formatWeight(product.weight)}
                      </td>
                    </tr>
                  )}
                  {hasDimensions && (
                    <>
                      {product.dimensions.length > 0 && (
                        <tr className='border-b border-gray-100'>
                          <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap'>
                            Comprimento
                          </td>
                          <td className='py-2.5 text-gray-800'>
                            {product.dimensions.length} cm
                          </td>
                        </tr>
                      )}
                      {product.dimensions.width > 0 && (
                        <tr className='border-b border-gray-100'>
                          <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap'>
                            Largura
                          </td>
                          <td className='py-2.5 text-gray-800'>
                            {product.dimensions.width} cm
                          </td>
                        </tr>
                      )}
                      {product.dimensions.height > 0 && (
                        <tr className='border-b border-gray-100'>
                          <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap'>
                            Altura
                          </td>
                          <td className='py-2.5 text-gray-800'>
                            {product.dimensions.height} cm
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className='py-2.5 pr-4 text-gray-500 font-medium whitespace-nowrap'>
                          Dimensões (C×L×A)
                        </td>
                        <td className='py-2.5 text-gray-800'>
                          {product.dimensions.length || 0} × {product.dimensions.width || 0} × {product.dimensions.height || 0} cm
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductInfoTabs;