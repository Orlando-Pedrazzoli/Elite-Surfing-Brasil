import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { groups } from '../assets/assets';

// 6 grupos visíveis, layout 3x2
const VISIBLE_GROUPS = ['leashes', 'decks', 'capas', 'sarcofagos', 'quilhas', 'acessorios'];

const filteredGroups = VISIBLE_GROUPS
  .map(id => groups.find(g => g.id === id))
  .filter(Boolean);

// Mobile Card - imagem + texto abaixo
const MobileCard = ({ name, slug, image }) => (
  <Link to={`/collections/${slug}`} className="group block">
    <div className="overflow-hidden">
      <img
        src={image}
        alt={name}
        className="w-full h-auto aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
    <p className="mt-3 text-center text-sm font-medium tracking-wide text-gray-700 uppercase">
      {name}
    </p>
  </Link>
);

// Desktop Card - Wet Dreams style hover effect (transições lentas e elegantes)
const DesktopCard = ({ name, slug, image }) => (
  <Link to={`/collections/${slug}`} className="group relative block overflow-hidden aspect-[4/3] cursor-pointer">
    {/* Background Image - zoom lento no hover */}
    <img
      src={image}
      alt={name}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
    />

    {/* Overlay gradient - escurece lentamente no hover */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-all duration-700 ease-in-out group-hover:from-black/70 group-hover:via-black/50 group-hover:to-black/30" />

    {/* Content wrapper */}
    <div className="absolute inset-0 flex flex-col items-center justify-end transition-all duration-700 ease-in-out group-hover:justify-center">
      
      {/* Título - sobe suavemente no hover */}
      <h3 className="text-white text-xl lg:text-2xl font-bold tracking-wider text-center uppercase mb-8 transition-all duration-700 ease-in-out group-hover:mb-0 group-hover:-translate-y-2">
        {name}
      </h3>

      {/* Botão VER PRODUTOS - aparece lentamente no hover */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-8 opacity-0 translate-y-5 transition-all duration-700 ease-in-out delay-100 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
        <span className="inline-block px-6 py-2.5 border border-white/80 text-white text-[11px] font-semibold tracking-[0.2em] uppercase backdrop-blur-sm hover:bg-white hover:text-black transition-colors duration-300">
          Ver Produtos
        </span>
      </div>
    </div>
  </Link>
);

const CollectionsGrid = () => {
  return (
    <section className="pt-4 pb-8 md:py-16 px-6 md:px-16 lg:px-24 xl:px-32 bg-white overflow-hidden w-full max-w-full">
      {/* Mobile: Grid 2 colunas */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <MobileCard
                name={group.name}
                slug={group.slug}
                image={group.image}
              />
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Desktop: 3 colunas x 2 linhas */}
      <div className="hidden md:block">
        <div className="grid grid-cols-3 gap-4">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <DesktopCard
                name={group.name}
                slug={group.slug}
                image={group.image}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionsGrid;