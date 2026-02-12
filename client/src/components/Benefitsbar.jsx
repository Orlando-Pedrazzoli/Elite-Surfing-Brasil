import React, { useState, useEffect } from 'react';
import { CreditCard, Percent, Truck } from 'lucide-react';

const benefits = [
  {
    icon: CreditCard,
    title: 'PAGAMENTO FACILITADO',
    subtitle: 'ATÉ 10X SEM JUROS',
  },
  {
    icon: Percent,
    title: '10% DE DESCONTO',
    subtitle: 'À VISTA',
  },
  {
    icon: Truck,
    title: 'FRETE GRÁTIS',
    subtitle: 'CONSULTE CONDIÇÕES',
  },
];

const BenefitsBar = () => {
  const [current, setCurrent] = useState(0);

  // Auto-rotate a cada 3 segundos (mobile)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % benefits.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-gray-900 py-3 px-4 md:px-16 lg:px-24 xl:px-32">
      
      {/* Mobile: Carousel automático */}
      <div className="md:hidden relative h-10 overflow-hidden">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500 ease-in-out ${
              index === current
                ? 'opacity-100 translate-y-0'
                : index === (current + 1) % benefits.length
                  ? 'opacity-0 translate-y-8'
                  : 'opacity-0 -translate-y-8'
            }`}
          >
            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <benefit.icon className="w-4 h-4 text-black" />
            </div>
            <div className="flex items-center gap-1.5 text-white whitespace-nowrap">
              <span className="text-xs font-bold tracking-wide">{benefit.title}</span>
              <span className="text-gray-400">|</span>
              <span className="text-xs text-gray-300 tracking-wide">{benefit.subtitle}</span>
            </div>
          </div>
        ))}


      </div>

      {/* Desktop: Layout original */}
      <div className="hidden md:flex items-center justify-center gap-12 lg:gap-20">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-2 shrink-0">
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <benefit.icon className="w-5 h-5 text-black" />
            </div>
            <div className="flex items-center gap-1.5 text-white whitespace-nowrap">
              <span className="text-sm font-bold tracking-wide">{benefit.title}</span>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-300 tracking-wide">{benefit.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BenefitsBar;