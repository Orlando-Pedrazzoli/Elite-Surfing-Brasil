import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { assets } from '../../assets/assets';
import { useAppContext } from '../../context/AppContext';
import {
  LayoutDashboard,
  PackagePlus,
  PackageSearch,
  ShoppingCart,
  LogOut,
  ChevronLeft,
  Menu,
  Store,
  X,
} from 'lucide-react';

const SellerLayout = () => {
  const { logoutSeller } = useAppContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarLinks = [
    {
      name: 'Dashboard',
      path: '/seller',
      icon: LayoutDashboard,
      end: true,
    },
    {
      name: 'Adicionar Produto',
      path: '/seller/add-product',
      icon: PackagePlus,
    },
    {
      name: 'Lista de Produtos',
      path: '/seller/product-list',
      icon: PackageSearch,
    },
    {
      name: 'Pedidos',
      path: '/seller/orders',
      icon: ShoppingCart,
    },
  ];

  // Obter título da página atual
  const currentPage = sidebarLinks.find(link => {
    if (link.end) return location.pathname === link.path;
    return location.pathname.startsWith(link.path);
  });

  return (
    <div className='h-screen flex flex-col bg-gray-50'>
      {/* ═══ HEADER ═══ */}
      <header className='h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-30'>
        <div className='flex items-center gap-4'>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <Menu className='w-5 h-5' />
          </button>

          {/* Logo */}
          <Link to='/' className='flex items-center gap-3'>
            <img
              src={assets.logo_es}
              alt='Elite Surfing Brasil'
              className='h-8'
            />
          </Link>

          {/* Separator + Badge */}
          <div className='hidden md:flex items-center gap-3'>
            <div className='w-px h-6 bg-gray-200'></div>
            <span className='text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider'>
              Admin
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className='flex items-center gap-3'>
          <Link
            to='/'
            target='_blank'
            className='hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-primary px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors'
          >
            <Store className='w-4 h-4' />
            <span>Ver Loja</span>
          </Link>

          <button
            onClick={logoutSeller}
            className='flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors'
          >
            <LogOut className='w-4 h-4' />
            <span className='hidden sm:inline'>Sair</span>
          </button>
        </div>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        {/* ═══ SIDEBAR — Desktop ═══ */}
        <aside className='hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col flex-shrink-0'>
          <nav className='flex-1 p-3 space-y-1'>
            {sidebarLinks.map(item => (
              <NavLink
                to={item.path}
                key={item.name}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className='w-5 h-5 flex-shrink-0' />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className='p-3 border-t border-gray-100'>
            <div className='px-3 py-2'>
              <p className='text-xs text-gray-400'>Elite Surfing Brasil</p>
              <p className='text-xs text-gray-300'>Painel Administrativo v2.0</p>
            </div>
          </div>
        </aside>

        {/* ═══ SIDEBAR — Mobile (overlay) ═══ */}
        {sidebarOpen && (
          <div className='fixed inset-0 z-40 lg:hidden'>
            {/* Backdrop */}
            <div
              className='absolute inset-0 bg-black/40'
              onClick={() => setSidebarOpen(false)}
            />

            {/* Drawer */}
            <aside className='absolute top-0 left-0 h-full w-64 bg-white shadow-xl flex flex-col'>
              <div className='flex items-center justify-between p-4 border-b border-gray-100'>
                <span className='text-sm font-semibold text-gray-800'>Menu Admin</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <nav className='flex-1 p-3 space-y-1'>
                {sidebarLinks.map(item => (
                  <NavLink
                    to={item.path}
                    key={item.name}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon className='w-5 h-5 flex-shrink-0' />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main className='flex-1 overflow-hidden'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;