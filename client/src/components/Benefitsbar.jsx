import React from 'react';
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
  return (
    <div className="w-full bg-gray-900 py-3 px-4 md:px-16 lg:px-24 xl:px-32 overflow-x-auto scrollbar-hide">
      <div className="flex items-center justify-start md:justify-center gap-6 md:gap-12 lg:gap-20 min-w-max md:min-w-0">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-2 shrink-0">
            <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center">
              <benefit.icon className="w-4 h-4 md:w-5 md:h-5 text-black" />
            </div>
            <div className="flex items-center gap-1.5 text-white whitespace-nowrap">
              <span className="text-xs md:text-sm font-bold tracking-wide">{benefit.title}</span>
              <span className="text-gray-400">|</span>
              <span className="text-xs md:text-sm text-gray-300 tracking-wide">{benefit.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BenefitsBar;