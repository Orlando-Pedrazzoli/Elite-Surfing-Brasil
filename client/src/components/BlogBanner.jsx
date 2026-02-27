import React from 'react';
import { Link } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════
// BLOG BANNER — CTA para a pagina do Blog na Homepage
// Posicao: entre <Novidades/> e <ReviewsCarousel/>
// ═══════════════════════════════════════════════════════════════

const blogPosts = [
  {
    tag: 'Dicas',
    title: 'Como escolher o deck ideal para sua prancha',
    image: 'https://images.unsplash.com/photo-1502680390548-bdbac40a4e2a?w=600&h=400&fit=crop&q=80',
  },
  {
    tag: 'Destinos',
    title: 'Os melhores picos de surf no litoral brasileiro',
    image: 'https://images.unsplash.com/photo-1455729552457-5c322b29433e?w=600&h=400&fit=crop&q=80',
  },
  {
    tag: 'Equipamento',
    title: 'Guia completo: cuidados com sua prancha de surf',
    image: 'https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=600&h=400&fit=crop&q=80',
  },
];

const BlogBanner = () => {
  return (
    <section className='relative overflow-hidden bg-[#0a1628] py-16 md:py-20'>
      {/* Textura de fundo sutil */}
      <div
        className='absolute inset-0 opacity-[0.03]'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradiente decorativo lateral */}
      <div className='absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#358f61]/10 to-transparent' />
      <div className='absolute bottom-0 left-0 w-64 h-64 bg-[#358f61]/5 rounded-full blur-[100px]' />

      <div className='relative z-10 px-6 md:px-16 lg:px-24 xl:px-32'>

        {/* Header da secao */}
        <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14'>
          <div>
            <div className='flex items-center gap-3 mb-3'>
              <div className='w-8 h-[2px] bg-[#358f61]' />
              <span className='text-[#358f61] text-xs font-semibold tracking-[0.2em] uppercase'>
                Blog Elite Surfing
              </span>
            </div>
            <h2 className='text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight'>
              Mergulhe no universo
              <br />
              <span className='text-[#358f61]'>do surf</span>
            </h2>
          </div>

          <Link
            to='/blog'
            className='group hidden md:flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-[#358f61] transition-colors duration-300'
          >
            <span>Ver todos os artigos</span>
            <svg
              className='w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M17 8l4 4m0 0l-4 4m4-4H3' />
            </svg>
          </Link>
        </div>

        {/* Grid de conteudo */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>

          {/* Card principal grande */}
          <Link
            to='/blog'
            className='group lg:col-span-7 relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-[420px]'
          >
            <img
              src='https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop&q=80'
              alt='Surf lifestyle e cultura'
              className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
              loading='lazy'
            />
            {/* Overlay gradiente */}
            <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent' />

            {/* Badge NOVO */}
            <div className='absolute top-5 left-5'>
              <span className='inline-flex items-center gap-1.5 bg-[#358f61] text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full'>
                <span className='w-1.5 h-1.5 bg-white rounded-full animate-pulse' />
                Novo
              </span>
            </div>

            {/* Conteudo do card */}
            <div className='absolute bottom-0 left-0 right-0 p-6 md:p-8'>
              <span className='inline-block bg-white/10 backdrop-blur-sm text-white/90 text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full mb-3 border border-white/10'>
                Lifestyle
              </span>
              <h3 className='text-xl md:text-2xl lg:text-3xl font-bold text-white leading-snug mb-3 max-w-lg'>
                Dicas, cultura e tudo sobre o mundo do surf em um so lugar
              </h3>
              <p className='text-white/60 text-sm md:text-base max-w-md mb-5 hidden md:block'>
                Artigos exclusivos sobre equipamentos, destinos, tecnicas e muito mais para elevar sua experiencia nas ondas.
              </p>
              <div className='inline-flex items-center gap-2 bg-[#358f61] hover:bg-[#2d7a53] text-white text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300 group-hover:gap-3'>
                <span>Acessar o Blog</span>
                <svg
                  className='w-4 h-4 transform group-hover:translate-x-0.5 transition-transform'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth={2.5}
                >
                  <path strokeLinecap='round' strokeLinejoin='round' d='M13 7l5 5m0 0l-5 5m5-5H6' />
                </svg>
              </div>
            </div>
          </Link>

          {/* Cards menores laterais */}
          <div className='lg:col-span-5 flex flex-col gap-5'>
            {blogPosts.map((post, index) => (
              <Link
                key={index}
                to='/blog'
                className='group relative flex items-center gap-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#358f61]/30 rounded-xl p-3 md:p-4 transition-all duration-300'
              >
                {/* Thumbnail */}
                <div className='relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden'>
                  <img
                    src={post.image}
                    alt={post.title}
                    className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                    loading='lazy'
                  />
                  <div className='absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors' />
                </div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <span className='inline-block text-[#358f61] text-[10px] md:text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5'>
                    {post.tag}
                  </span>
                  <h4 className='text-white text-sm md:text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-[#358f61] transition-colors duration-300'>
                    {post.title}
                  </h4>
                </div>

                {/* Seta */}
                <div className='flex-shrink-0 w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#358f61]/20 flex items-center justify-center transition-all duration-300'>
                  <svg
                    className='w-4 h-4 text-white/30 group-hover:text-[#358f61] transform group-hover:translate-x-0.5 transition-all duration-300'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </Link>
            ))}

            {/* Botao "Ver Todos" desktop */}
            <Link
              to='/blog'
              className='group flex items-center justify-center gap-2 bg-[#358f61]/10 hover:bg-[#358f61] border border-[#358f61]/30 hover:border-[#358f61] text-[#358f61] hover:text-white text-sm font-semibold rounded-xl py-4 transition-all duration-300'
            >
              <span>Explorar todos os artigos</span>
              <svg
                className='w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path strokeLinecap='round' strokeLinejoin='round' d='M17 8l4 4m0 0l-4 4m4-4H3' />
              </svg>
            </Link>
          </div>
        </div>

        {/* Botao mobile */}
        <Link
          to='/blog'
          className='group flex md:hidden items-center justify-center gap-2 mt-8 bg-[#358f61] hover:bg-[#2d7a53] text-white text-sm font-semibold rounded-full py-4 w-full transition-all duration-300'
        >
          <span>Ver todos os artigos</span>
          <svg
            className='w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M17 8l4 4m0 0l-4 4m4-4H3' />
          </svg>
        </Link>
      </div>
    </section>
  );
};

export default BlogBanner;