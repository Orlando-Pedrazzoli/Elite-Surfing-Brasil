import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const banners = [
  {
    id: 1,
    heading: 'SARCÓFAGOS',
    description:
      'Tivemos a grande honra de receber um review sobre essa lenda do surf elogiando e recomendando nosso sarcófago.',
    ctaText: 'VER COLEÇÃO',
    ctaLink: '/collections/sarcofagos',
    media: {
      type: 'video',
      src: 'https://www.youtube.com/embed/iQTmZACDRNA?si=5rT5E19EOgQmEyYH&modestbranding=1&rel=0&showinfo=0',
    },
    imagePosition: 'right',
  },
  {
    id: 2,
    heading: 'LEASHES',
    description:
      'Projetados para funcionar em ondas pequenas ou condições mais exigentes, contam com construção em peça única, sem emendas, para máxima segurança e performance.',
    ctaText: 'VER COLEÇÃO DE LEASHES',
    ctaLink: '/collections/leashes',
    media: {
      type: 'image',
      src: '/leash-tech.png',
      fit: 'contain',
    },
    imagePosition: 'left',
  },
];

const FeatureBanner = ({ heading, description, ctaText, ctaLink, media, imagePosition }) => {
  const isImageRight = imagePosition === 'right';

  return (
    <div
      className={`flex flex-col ${isImageRight ? 'lg:flex-row' : 'lg:flex-row-reverse'} min-h-[400px] lg:min-h-[500px]`}
    >
      {/* Content Block */}
      <motion.div
        initial={{ opacity: 0, x: isImageRight ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col justify-center items-center lg:items-start p-8 md:p-12 lg:p-16 bg-neutral-900 text-white"
      >
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-wider mb-4 md:mb-6 text-center lg:text-left">
          {heading}
        </h2>
        <p className="text-neutral-300 text-base md:text-lg leading-relaxed mb-6 md:mb-8 max-w-md text-center lg:text-left">
          {description}
        </p>
        <Link
          to={ctaLink}
          className="inline-block px-8 py-3 bg-white text-black font-semibold tracking-wider text-sm hover:bg-neutral-200 transition-colors duration-300"
        >
          {ctaText}
        </Link>
      </motion.div>

      {/* Media Block */}
      <motion.div
        initial={{ opacity: 0, x: isImageRight ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex-1 relative overflow-hidden min-h-[300px] lg:min-h-full"
      >
        {media.type === 'video' ? (
          <iframe
            src={media.src}
            title={heading}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-4 border-neutral-700"
          />
        ) : (
          <img
            src={media.src}
            alt={heading}
            className={`w-full h-full ${media.fit === 'contain' ? 'object-contain bg-neutral-900' : 'object-cover'} absolute inset-0`}
          />
        )}
      </motion.div>
    </div>
  );
};

const FeatureBanners = () => {
  return (
    <section className="w-full">
      {banners.map((banner) => (
        <FeatureBanner
          key={banner.id}
          heading={banner.heading}
          description={banner.description}
          ctaText={banner.ctaText}
          ctaLink={banner.ctaLink}
          media={banner.media}
          imagePosition={banner.imagePosition}
        />
      ))}
    </section>
  );
};

export default FeatureBanners;