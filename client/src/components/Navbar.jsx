import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { Lock, LogOut, Menu, ChevronDown, ChevronRight, User, Package, Star, Search } from 'lucide-react';
import { assets, groups, categories } from '../assets/assets';
import { useAppContext } from '../context/AppContext';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DOS LINKS DA NAVBAR
// ═══════════════════════════════════════════════════════════════
const NAV_DEPARTMENTS = [
  { label: 'TODOS OS DEPARTAMENTOS', slug: null },
  { label: 'ACESSÓRIOS', slug: 'acessorios' },
  { label: 'LEASHES', slug: 'leashes' },
  { label: 'DECKS', slug: 'decks' },
  { label: 'CAPAS', slug: 'capas' },
  { label: 'SARCÓFAGOS', slug: 'sarcofagos' },
];

const sarcofagoSublinks = [
  { text: 'Sarcófago Combate', path: 'Sarcofago-Combate' },
  { text: 'Sarcófago Premium', path: 'Sarcofago-Premium' },
  { text: 'Sarcófago Combate c/ Rodas', path: 'Sarcofago-Combate-Rodas' },
  { text: 'Sarcófago Premium c/ Rodas', path: 'Sarcofago-Premium-Rodas' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);

  const location = useLocation();
  const isHomepage = location.pathname === '/';

  const {
    user,
    setShowUserLogin,
    navigate,
    setSearchQuery,
    searchQuery,
    getCartCount,
    logoutUser,
    logoutSeller,
    isSeller,
    setShowCartSidebar,
  } = useAppContext();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    if (isHomepage) {
      window.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomepage]);

  // Limpar search ao sair de /products
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== '/products' && !currentPath.startsWith('/products/')) {
      if (searchQuery && searchQuery.length > 0) {
        setSearchQuery('');
      }
    } else if (currentPath.includes('/products/') && currentPath.split('/').length > 2) {
      if (searchQuery && searchQuery.length > 0) {
        setSearchQuery('');
      }
    }
  }, [window.location.pathname]);

  const handleLogout = async () => {
    setOpen(false);
    await logoutUser();
  };

  const handleSellerLogout = () => {
    setOpen(false);
    logoutSeller();
  };

  const handleNavLinkClick = path => {
    setOpen(false);
    setMobileExpanded(null);
    navigate(path);
  };

  const handleAdminAccess = () => {
    setOpen(false);
    navigate('/seller');
  };

  const handleCartClick = () => setShowCartSidebar(true);

  const handleSearchClick = () => navigate('/products');

  const isTransparent = isHomepage && !scrolled;

  const getSublinks = (slug) => {
    if (slug === 'sarcofagos') return sarcofagoSublinks;
    return categories.filter(cat => cat.group === slug);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          SINGLE LINE NAVBAR: Logo | Links | Icons
          ═══════════════════════════════════════════════════════════════ */}
      <nav
        className={`z-50 left-0 right-0 border-b transition-[background-color,border-color,box-shadow] duration-300
          ${isTransparent ? 'bg-transparent border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}
      >
        <div className='flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-3'>

          {/* ===== MOBILE: Hamburger (Left) ===== */}
          <button
            onClick={() => setOpen(!open)}
            aria-label='Menu de navegação'
            className='lg:hidden focus:outline-none p-1'
          >
            <Menu
              className={`w-6 h-6 transition-all duration-300 ${isTransparent ? 'text-white' : 'text-gray-700'}`}
              strokeWidth={2}
            />
          </button>

          {/* ===== Logo (Left) ===== */}
          <NavLink
            to='/'
            onClick={() => setOpen(false)}
            aria-label='Elite Surfing Brasil - Página Inicial'
            className='flex-shrink-0'
          >
            <img
              className={`h-9 transition-all duration-300 ${isTransparent ? 'brightness-0 invert' : ''}`}
              src={assets.logo_es}
              alt='Elite Surfing Brasil'
            />
          </NavLink>

          {/* ===== DESKTOP: Department Links (Center) ===== */}
          <div className='hidden lg:flex items-center justify-center gap-6 xl:gap-8 flex-1 mx-8'>
            {NAV_DEPARTMENTS.map((dept) => {
              const isAllDepts = dept.slug === null;
              const sublinks = isAllDepts ? null : getSublinks(dept.slug);
              const collectionPath = dept.slug ? `/collections/${dept.slug}` : null;

              return (
                <div key={dept.label} className='relative group'>
                  {isAllDepts ? (
                    <button
                      className={`flex items-center gap-1 text-xs font-semibold tracking-wider uppercase py-1 transition-colors cursor-pointer whitespace-nowrap ${
                        isTransparent ? 'text-white/90 hover:text-white' : 'text-gray-700 hover:text-primary'
                      }`}
                    >
                      {dept.label}
                      <ChevronDown className='w-3.5 h-3.5 transition-transform group-hover:rotate-180' />
                    </button>
                  ) : (
                    <Link
                      to={collectionPath}
                      className={`flex items-center gap-1 text-xs font-semibold tracking-wider uppercase py-1 transition-colors whitespace-nowrap ${
                        isTransparent ? 'text-white/90 hover:text-white' : 'text-gray-700 hover:text-primary'
                      }`}
                    >
                      {dept.label}
                      {sublinks && sublinks.length > 0 && (
                        <ChevronDown className='w-3.5 h-3.5 transition-transform group-hover:rotate-180' />
                      )}
                    </Link>
                  )}

                  {/* Dropdown: TODOS OS DEPARTAMENTOS */}
                  {isAllDepts && (
                    <div className='invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute top-full left-0 pt-2 transition-all duration-200 z-50'>
                      <div className='bg-white shadow-xl border border-gray-200 rounded-lg py-2 min-w-[220px]'>
                        {groups.map((group) => (
                          <Link
                            key={group.id}
                            to={`/collections/${group.slug}`}
                            className='flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors'
                          >
                            <img src={group.image} alt={group.name} className='w-8 h-8 rounded object-cover' />
                            <span>{group.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dropdown: Subcategorias */}
                  {!isAllDepts && sublinks && sublinks.length > 0 && (
                    <div className='invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute top-full left-0 pt-2 transition-all duration-200 z-50'>
                      <div className='bg-white shadow-xl border border-gray-200 rounded-lg py-2 min-w-[220px]'>
                        <Link
                          to={collectionPath}
                          className='block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors border-b border-gray-100'
                        >
                          Ver Todos
                        </Link>
                        {sublinks.map((sub) => (
                          <Link
                            key={sub.path}
                            to={`/products/${sub.path}`}
                            className='block px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors'
                          >
                            {sub.text}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== DESKTOP: Icons (Right) ===== */}
          <div className='hidden lg:flex items-center gap-4 flex-shrink-0'>
            {/* Search Icon */}
            <button
              onClick={handleSearchClick}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isTransparent ? 'hover:bg-white/10' : 'hover:bg-gray-100'
              }`}
              title='Buscar produtos'
            >
              <Search className={`w-5 h-5 transition-colors ${
                isTransparent ? 'text-white' : 'text-gray-600 hover:text-primary'
              }`} />
            </button>

            {/* Admin */}
            <div className='relative group'>
              <button
                onClick={handleAdminAccess}
                className={`relative cursor-pointer p-2 rounded-lg transition-all duration-200 ${
                  isTransparent ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                title='Área de Administração'
              >
                <Lock className={`w-5 h-5 transition-colors ${
                  isTransparent ? 'text-white' : 'text-gray-600 group-hover:text-primary'
                }`} />
                {isSeller && (
                  <span className='absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white'></span>
                )}
              </button>
              {isSeller && (
                <div className='hidden group-hover:block absolute top-full right-0 pt-2 z-50'>
                  <div className='bg-white shadow-lg border border-gray-200 py-2 w-48 rounded-md text-sm'>
                    <div className='px-4 py-2 border-b border-gray-100'>
                      <p className='font-semibold text-gray-800'>Painel Admin</p>
                      <p className='text-xs text-gray-500'>Sessão ativa</p>
                    </div>
                    <button
                      onClick={handleSellerLogout}
                      className='w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors'
                    >
                      <LogOut className='w-4 h-4' />
                      Sair do Admin
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cart */}
            <div onClick={handleCartClick} className='relative cursor-pointer p-2'>
              <img
                src={assets.nav_cart_icon}
                alt='Carrinho de compras'
                className={`w-6 transition-all duration-300 ${
                  isTransparent ? 'invert brightness-0 opacity-100' : 'opacity-80'
                }`}
              />
              {getCartCount() > 0 && (
                <span className='absolute -top-1 -right-1 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full flex items-center justify-center'>
                  {getCartCount()}
                </span>
              )}
            </div>

            {/* User */}
            <div className='relative group'>
              <button
                onClick={() => !user && setShowUserLogin(true)}
                className={`relative p-2 rounded-full transition-all duration-200 cursor-pointer ${
                  isTransparent ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                }`}
                aria-label={user ? 'Minha conta' : 'Entrar'}
              >
                <User
                  className={`w-6 h-6 transition-colors ${isTransparent ? 'text-white' : 'text-gray-700'}`}
                  fill={user ? (isTransparent ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)') : 'none'}
                />
                {user && (
                  <span className='absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white'></span>
                )}
              </button>
              {user && (
                <div className='hidden group-hover:block absolute top-full right-0 pt-2 z-50'>
                  <div className='bg-white shadow-xl border border-gray-200 rounded-xl py-2 w-52 text-sm'>
                    <div className='px-4 py-3 border-b border-gray-100'>
                      <p className='font-semibold text-gray-800 truncate'>{user.name}</p>
                      <p className='text-xs text-gray-400 mt-0.5'>Minha conta</p>
                    </div>
                    <div className='py-1'>
                      <button
                        onClick={() => navigate('/my-orders')}
                        className='w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors'
                      >
                        <Package className='w-4 h-4 text-gray-400' />
                        <span>Meus Pedidos</span>
                      </button>
                      <button
                        onClick={() => navigate('/write-review')}
                        className='w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors'
                      >
                        <Star className='w-4 h-4 text-gray-400' />
                        <span>Escrever Avaliações</span>
                      </button>
                    </div>
                    <div className='border-t border-gray-100 pt-1'>
                      <button
                        onClick={handleLogout}
                        className='w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors'
                      >
                        <LogOut className='w-4 h-4' />
                        <span>Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== MOBILE: Cart (Right) ===== */}
          <div className='flex items-center gap-4 lg:hidden'>
            <div onClick={handleCartClick} className='relative cursor-pointer'>
              <img
                src={assets.nav_cart_icon}
                alt='Carrinho de compras'
                className={`w-6 transition-all duration-300 ${
                  isTransparent ? 'invert brightness-0 opacity-100' : 'opacity-80'
                }`}
              />
              {getCartCount() > 0 && (
                <span className='absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full flex items-center justify-center'>
                  {getCartCount()}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE MENU DRAWER
          ═══════════════════════════════════════════════════════════════ */}
      {open && (
        <div
          className='fixed inset-0 bg-black/50 z-[60] lg:hidden'
          onClick={() => setOpen(false)}
        >
          <div
            className='absolute top-0 right-0 h-full w-[80%] max-w-[320px] bg-white shadow-2xl flex flex-col'
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50'>
              <span className='text-lg font-semibold text-gray-800'>Menu</span>
              <button
                onClick={() => setOpen(false)}
                className='p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors'
                aria-label='Fechar menu'
              >
                <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>

            {/* Search Mobile */}
            <div className='p-4 border-b border-gray-100'>
              <button
                onClick={() => { setOpen(false); navigate('/products'); }}
                className='w-full flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-full text-gray-500 hover:border-primary transition-colors'
              >
                <Search className='w-5 h-5' />
                <span className='text-sm'>Buscar produtos</span>
              </button>
            </div>

            {/* Navigation */}
            <div className='flex-1 overflow-y-auto'>
              <nav className='p-4'>
                <NavLink
                  to='/'
                  className={({ isActive }) =>
                    `block py-3 px-2 text-base font-medium border-b border-gray-100 transition-colors ${
                      isActive ? 'text-primary' : 'text-gray-700 hover:text-primary'
                    }`
                  }
                  onClick={() => handleNavLinkClick('/')}
                >
                  Home
                </NavLink>

                {/* Departamentos */}
                {NAV_DEPARTMENTS.map((dept) => {
                  const isAllDepts = dept.slug === null;
                  const sublinks = isAllDepts ? null : getSublinks(dept.slug);
                  const isExpanded = mobileExpanded === dept.label;

                  return (
                    <div key={dept.label} className='border-b border-gray-100'>
                      <button
                        onClick={() => setMobileExpanded(isExpanded ? null : dept.label)}
                        className='flex items-center justify-between w-full py-3 px-2 text-base font-medium text-gray-700 hover:text-primary transition-colors'
                      >
                        <span>{dept.label.charAt(0) + dept.label.slice(1).toLowerCase()}</span>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className='pl-4 pb-3 space-y-1'>
                          {isAllDepts ? (
                            groups.map((group) => (
                              <Link
                                key={group.id}
                                to={`/collections/${group.slug}`}
                                onClick={() => handleNavLinkClick(`/collections/${group.slug}`)}
                                className='flex items-center gap-3 py-2 px-3 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors'
                              >
                                <img src={group.image} alt={group.name} className='w-8 h-8 rounded object-cover' />
                                <span>{group.name}</span>
                              </Link>
                            ))
                          ) : (
                            <>
                              <Link
                                to={`/collections/${dept.slug}`}
                                onClick={() => handleNavLinkClick(`/collections/${dept.slug}`)}
                                className='flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors'
                              >
                                <ChevronRight className='w-4 h-4' />
                                <span>Ver Todos</span>
                              </Link>
                              {sublinks && sublinks.map((sub) => (
                                <Link
                                  key={sub.path}
                                  to={`/products/${sub.path}`}
                                  onClick={() => handleNavLinkClick(`/products/${sub.path}`)}
                                  className='flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors'
                                >
                                  <ChevronRight className='w-4 h-4' />
                                  <span>{sub.text}</span>
                                </Link>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <NavLink
                  to='/contact'
                  className={({ isActive }) =>
                    `block py-3 px-2 text-base font-medium border-b border-gray-100 transition-colors ${
                      isActive ? 'text-primary' : 'text-gray-700 hover:text-primary'
                    }`
                  }
                  onClick={() => handleNavLinkClick('/contact')}
                >
                  Contato
                </NavLink>

                <button
                  onClick={handleAdminAccess}
                  className='flex items-center gap-3 w-full py-3 px-2 text-base font-medium border-b border-gray-100 text-gray-700 hover:text-primary transition-colors'
                >
                  <Lock className='w-5 h-5' />
                  <span>Área Admin</span>
                  {isSeller && (
                    <span className='ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full'>Ativo</span>
                  )}
                </button>

                {isSeller && (
                  <button
                    onClick={handleSellerLogout}
                    className='flex items-center gap-2 w-full mt-3 py-3 px-3 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-lg border border-red-200 transition-colors'
                  >
                    <LogOut className='w-4 h-4' />
                    <span>Sair do Admin</span>
                  </button>
                )}
              </nav>

              {/* User Section */}
              <div className='p-4 border-t border-gray-100'>
                {user ? (
                  <div className='space-y-3'>
                    <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                      <div className='relative'>
                        <div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                          <User className='w-5 h-5 text-gray-500' />
                        </div>
                        <span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white'></span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium text-gray-800 text-sm truncate'>{user.name}</p>
                        <p className='text-xs text-gray-400'>Conta ativa</p>
                      </div>
                    </div>

                    <NavLink
                      to='/my-orders'
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                          isActive ? 'text-primary bg-primary/10' : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                        }`
                      }
                      onClick={() => handleNavLinkClick('/my-orders')}
                    >
                      <Package className='w-4 h-4 text-gray-400' />
                      Meus Pedidos
                    </NavLink>

                    <NavLink
                      to='/write-review'
                      className={({ isActive }) =>
                        `flex items-center gap-3 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                          isActive ? 'text-primary bg-primary/10' : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                        }`
                      }
                      onClick={() => handleNavLinkClick('/write-review')}
                    >
                      <Star className='w-4 h-4 text-gray-400' />
                      Escrever Avaliações
                    </NavLink>

                    <button
                      onClick={handleLogout}
                      className='w-full flex items-center justify-center gap-2 py-3 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors'
                    >
                      <LogOut className='w-4 h-4' />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setOpen(false); setShowUserLogin(true); }}
                    className='w-full py-3 bg-primary hover:bg-primary-dull text-white rounded-lg text-base font-semibold transition-colors'
                  >
                    Entrar / Cadastrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;