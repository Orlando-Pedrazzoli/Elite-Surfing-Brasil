import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Percent, Truck } from 'lucide-react';

const benefits = [
  {
    icon: CreditCard,
    title: 'PAGAMENTO FACILITADO',
    subtitle: 'ATÉ 10X SEM JUROS',
    link: null,
  },
  {
    icon: Percent,
    title: '10% DE DESCONTO',
    subtitle: 'À VISTA',
    link: null,
  },
  {
    icon: Truck,
    title: 'FRETE GRÁTIS',
    subtitle: 'CONSULTE CONDIÇÕES',
    link: '/institucional/frete-gratis',
  },
];

const BenefitItem = ({ benefit, className = '' }) => {
  const content = (
    <div className={`flex items-center gap-2 shrink-0 ${benefit.link ? 'cursor-pointer' : ''} ${className}`}>
      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center">
        <benefit.icon className="w-4 h-4 md:w-5 md:h-5 text-black" />
      </div>
      <div className="flex items-center gap-1.5 text-white whitespace-nowrap">
        <span className="text-xs md:text-sm font-bold tracking-wide">{benefit.title}</span>
        <span className="text-gray-400">|</span>
        <span className={`text-xs md:text-sm tracking-wide ${benefit.link ? 'text-gray-200 underline underline-offset-2 decoration-gray-400' : 'text-gray-300'}`}>
          {benefit.subtitle}
        </span>
      </div>
    </div>
  );

  if (benefit.link) {
    return <Link to={benefit.link}>{content}</Link>;
  }
  return content;
};

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
            className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
              index === current
                ? 'opacity-100 translate-y-0'
                : index === (current + 1) % benefits.length
                  ? 'opacity-0 translate-y-8'
                  : 'opacity-0 -translate-y-8'
            }`}
          >
            <BenefitItem benefit={benefit} />
          </div>
        ))}
      </div>

      {/* Desktop: Layout original */}
      <div className="hidden md:flex items-center justify-center gap-12 lg:gap-20">
        {benefits.map((benefit, index) => (
          <BenefitItem key={index} benefit={benefit} />
        ))}
      </div>
    </div>
  );
};

export default BenefitsBar;