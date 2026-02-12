import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { institucionalSections, getSectionBySlug, getDefaultSection } from '../data/institucionalData';
import { SEO, BreadcrumbSchema } from '../components/seo';

const InstitucionalPage = () => {
  const { section: sectionSlug } = useParams();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Se não tem slug, usa a primeira seção como default
  const activeSlug = sectionSlug || getDefaultSection();
  const activeSection = getSectionBySlug(activeSlug);

  // Fallback se seção não existe
  if (!activeSection) {
    return (
      <div className='min-h-[60vh] flex flex-col items-center justify-center px-6'>
        <h1 className='text-2xl font-bold text-gray-800 mb-4'>Página não encontrada</h1>
        <p className='text-gray-600 mb-6'>A seção que procura não existe.</p>
        <Link
          to='/institucional'
          className='px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-colors'
        >
          Ver Institucional
        </Link>
      </div>
    );
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Institucional', url: '/institucional' },
    { name: activeSection.title, url: `/institucional/${activeSlug}` },
  ];

  return (
    <>
      <SEO
        title={`${activeSection.title} | Elite Surfing Brasil`}
        description={`${activeSection.title} - Informações institucionais da Elite Surfing Brasil.`}
        url={`/institucional/${activeSlug}`}
      >
        <BreadcrumbSchema items={breadcrumbItems} />
      </SEO>

      <div className='min-h-screen'>
        <div className='px-6 md:px-16 lg:px-24 xl:px-32 py-6 md:py-8'>

          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className='flex items-center gap-2 text-gray-500 text-sm mb-6'
            aria-label="Breadcrumb"
          >
            <Link to='/' className='hover:text-primary transition-colors'>Home</Link>
            <span>/</span>
            <Link to='/institucional' className='hover:text-primary transition-colors'>Institucional</Link>
            <span>/</span>
            <span className='text-gray-800 font-medium' aria-current="page">{activeSection.title}</span>
          </motion.nav>

          {/* ═══════════════════════════════════════════════ */}
          {/* Mobile: Dropdown menu de seções                 */}
          {/* ═══════════════════════════════════════════════ */}
          <div className='md:hidden mb-6'>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='w-full flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg text-gray-800 font-medium'
            >
              <span className='flex items-center gap-2'>
                <span>{activeSection.icon}</span>
                <span>{activeSection.title}</span>
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className='mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden'
              >
                {institucionalSections.map((sec) => (
                  <button
                    key={sec.slug}
                    onClick={() => {
                      navigate(`/institucional/${sec.slug}`);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      sec.slug === activeSlug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{sec.icon}</span>
                    <span className='text-sm'>{sec.title}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* Layout: Sidebar + Conteúdo                      */}
          {/* ═══════════════════════════════════════════════ */}
          <div className='flex flex-col md:flex-row gap-8'>

            {/* Sidebar Desktop */}
            <div className='hidden md:block md:w-1/4 lg:w-1/5 flex-shrink-0'>
              <div className='bg-white rounded-lg shadow-md p-5 sticky top-32'>
                <h3 className='text-lg font-semibold text-gray-800 mb-4'>Institucional</h3>
                <nav className='flex flex-col gap-1'>
                  {institucionalSections.map((sec) => (
                    <Link
                      key={sec.slug}
                      to={`/institucional/${sec.slug}`}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        sec.slug === activeSlug
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                      }`}
                    >
                      <span>{sec.icon}</span>
                      <span>{sec.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Conteúdo */}
            <div className='flex-grow'>
              {/* Desktop: Voltar */}
              <div className='hidden md:flex items-center mb-6'>
                <button
                  onClick={() => navigate(-1)}
                  className='flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group'
                >
                  <ChevronLeft className='w-5 h-5 transition-transform group-hover:-translate-x-1' />
                  <span>Voltar</span>
                </button>
              </div>

              {/* Conteúdo da seção */}
              <motion.div
                key={activeSlug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className='bg-white rounded-lg shadow-md p-6 md:p-8'
              >
                <div
                  className='institucional-content prose prose-gray max-w-none
                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mb-4 [&_h2]:mt-0
                    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-6 [&_h3]:mb-3
                    [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-3
                    [&_strong]:text-gray-800
                  '
                  dangerouslySetInnerHTML={{ __html: activeSection.content }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstitucionalPage;