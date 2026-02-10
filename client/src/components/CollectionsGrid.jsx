import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { groups } from '../assets/assets';

// Apenas estes 5 grupos, na ordem desejada
const VISIBLE_GROUPS = ['leashes', 'decks', 'capas', 'sarcofagos', 'acessorios'];

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

// Desktop Card - overlay com título e botão VIEW
const DesktopCard = ({ name, slug, image }) => (
  <Link to={`/collections/${slug}`} className="group relative block overflow-hidden aspect-[3/4]">
    {/* Background Image */}
    <div className="absolute inset-0 w-full h-full">
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover:bg-black/50" />
    </div>
    {/* Content */}
    <div className="relative z-10 flex flex-col items-center justify-end h-full p-6 pb-8">
      <h3 className="text-white text-xl lg:text-2xl font-bold tracking-wider text-center uppercase">
        {name}
      </h3>
    </div>
  </Link>
);

const CollectionsGrid = () => {
  return (
    <section className="pt-4 pb-8 md:py-16 px-6 md:px-16 lg:px-24 xl:px-32 bg-white overflow-hidden w-full max-w-full">
      {/* Mobile: Grid 2 colunas + 1 centralizada */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={index === filteredGroups.length - 1 ? 'col-span-2 max-w-[50%] mx-auto' : ''}
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
      
      {/* Desktop: 5 colunas em linha única */}
      <div className="hidden md:block">
        <div className="grid grid-cols-5 gap-4">
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