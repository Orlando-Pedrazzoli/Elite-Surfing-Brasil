import React from 'react';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import { useAppContext } from './context/AppContext';
import Login from './components/Login';
import AllProducts from './pages/AllProducts';
import ProductCategory from './pages/ProductCategory';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import AddAddress from './pages/AddAddress';
import MyOrders from './pages/MyOrders';
import OrderSuccess from './pages/OrderSuccess';
import WriteReview from './pages/WriteReview';
import SellerLogin from './components/seller/SellerLogin';
import SellerLayout from './pages/seller/SellerLayout';
import Dashboard from './pages/seller/Dashboard';
import AddProduct from './pages/seller/AddProduct';
import ProductList from './pages/seller/ProductList';
import Orders from './pages/seller/Orders';
import Loading from './components/Loading';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import RefundPolicy from './pages/RefundPolicy';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import ScrollToTop from './components/ScrollToTop';
import HealthCheck from './components/HealthCheck';
import WhatsAppButton from './components/WhatsAppButton';
import CartSidebar from './components/CartSidebar';
import GroupPage from './pages/GroupPage';
import InstitucionalPage from './pages/InstitucionalPage';
import PixPayment from './pages/PixPayment';

// ✅ Blog
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import BlogManager from './pages/seller/BlogManager';

// ✅ Importa o CookieConsent
import CookieConsent from 'react-cookie-consent';

const App = () => {
  const location = useLocation();
  const isSellerPath = location.pathname.includes('seller');
  const isHomepage = location.pathname === '/';
  const isCollectionPage = location.pathname.startsWith('/collections/');
  const isInstitucional = location.pathname.startsWith('/institucional');
  const isBlogPage = location.pathname.startsWith('/blog');
  const { showUserLogin, isSeller, isSellerLoading } = useAppContext();

  // Loading APENAS na área de seller
  if (isSellerPath && isSellerLoading) {
    return (
      <div className='flex justify-center items-center h-screen bg-white'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-primary mx-auto'></div>
          <p className='mt-4 text-gray-600'>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='text-default min-h-screen text-gray-700 bg-white'>
      {/* AnnouncementBar + Navbar - apenas fora do seller */}
      {!isSellerPath && (
        <>
          <div className="fixed top-0 left-0 right-0 z-50">
            <AnnouncementBar />
            <Navbar />
          </div>
          <div className="h-[104px]" />
        </>
      )}
     
      {showUserLogin ? <Login /> : null}

      <Toaster
        position='top-center'
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#358f61',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#f87171',
              secondary: '#fff',
            },
          },
        }}
      />
      <ScrollToTop />
      
      {/* Condicional: Homepage, Collections, Institucional e Blog sem padding lateral */}
      <div
        className={`${
          isSellerPath 
            ? '' 
            : (isHomepage || isCollectionPage || isInstitucional || isBlogPage)
              ? '' 
              : 'px-4 md:px-16 lg:px-24 xl:px-32'
        }`}
      >
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/collections/:group' element={<GroupPage />} />
          <Route path='/products' element={<AllProducts />} />
          <Route path='/products/:category' element={<ProductCategory />} />
          <Route path='/products/:category/:id' element={<ProductDetails />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/add-address' element={<AddAddress />} />
          <Route path='/order-success/:orderId' element={<OrderSuccess />} />
          <Route path='/my-orders' element={<MyOrders />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/privacy' element={<Privacy />} />
          <Route path='/refund-policy' element={<RefundPolicy />} />
          <Route path='/faq' element={<FAQ />} />
          <Route path='/terms' element={<Terms />} />
          <Route path='/write-review' element={<WriteReview />} />
          <Route path='/institucional' element={<InstitucionalPage />} />
          <Route path='/institucional/:section' element={<InstitucionalPage />} />
          <Route path='/loader' element={<Loading />} />
          <Route path="/pix-payment/:orderId" element={<PixPayment />} />

          {/* ═══ BLOG ROUTES ═══ */}
          <Route path='/blog' element={<Blog />} />
          <Route path='/blog/:slug' element={<BlogPostDetail />} />

          {/* ═══ SELLER ROUTES ═══ */}
          <Route
            path='/seller'
            element={isSeller ? <SellerLayout /> : <SellerLogin />}
          >
            <Route index element={isSeller ? <Dashboard /> : null} />
            <Route path='add-product' element={<AddProduct />} />
            <Route path='product-list' element={<ProductList />} />
            <Route path='orders' element={<Orders />} />
            <Route path='blog' element={<BlogManager />} />
          </Route>
        </Routes>
      </div>
      {!isSellerPath && <Footer />}
      <HealthCheck />

      {!isSellerPath && <WhatsAppButton />}
      {!isSellerPath && <CartSidebar />}

      {/* ═══════════════════════════════════════════════════════════
          COOKIE CONSENT — LGPD (Lei nº 13.709/2018)
          ═══════════════════════════════════════════════════════════ */}
      <CookieConsent
        location='bottom'
        cookieName='elitesurfingCookieConsent'
        containerClasses='cookie-banner'
        style={{
          background: '#1e293b',
          color: '#f1f5f9',
          fontSize: '14px',
          padding: '0',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 9999,
          borderTop: '3px solid #358f61',
        }}
        contentStyle={{
          flex: '1',
          padding: '20px 24px',
          margin: '0',
        }}
        buttonWrapperClasses='cookie-banner-buttons'
        buttonText='Aceitar Cookies'
        declineButtonText='Apenas Essenciais'
        enableDeclineButton
        buttonStyle={{
          background: '#358f61',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          border: 'none',
          padding: '12px 28px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          margin: '0',
          whiteSpace: 'nowrap',
        }}
        declineButtonStyle={{
          background: 'transparent',
          color: '#94a3b8',
          fontSize: '13px',
          fontWeight: '500',
          border: '1px solid #475569',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          margin: '0',
          whiteSpace: 'nowrap',
        }}
        expires={365}
        overlay={false}
      >
        <div className='cookie-content'>
          <div className='cookie-icon'>
            <svg width='28' height='28' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 11.46 21.95 10.93 21.85 10.42C20.92 10.83 19.89 11.07 18.81 11.07C14.77 11.07 11.5 7.8 11.5 3.76C11.5 3.17 11.57 2.6 11.7 2.06C11.8 2.02 11.9 2 12 2Z' fill='#fbbf24'/>
              <circle cx='8.5' cy='11.5' r='1.5' fill='#92400e'/>
              <circle cx='12.5' cy='16' r='1' fill='#92400e'/>
              <circle cx='15' cy='11' r='1' fill='#92400e'/>
              <circle cx='10' cy='7.5' r='0.8' fill='#92400e'/>
            </svg>
          </div>
          <div className='cookie-text'>
            <p className='cookie-title'>
              Nós valorizamos sua privacidade
            </p>
            <p className='cookie-description'>
              Utilizamos cookies essenciais para o funcionamento do site e cookies de 
              análise para melhorar sua experiência de navegação. Ao clicar em 
              "Aceitar Cookies", você consente com o uso de todos os cookies conforme 
              a <a href='/privacy' className='cookie-link'>Lei Geral de Proteção de Dados (LGPD)</a> e 
              nossa <a href='/privacy' className='cookie-link'>Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </CookieConsent>

      <style>{`
        /* ═══ Cookie Banner Styles ═══ */
        .cookie-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .cookie-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background: rgba(251, 191, 36, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cookie-title {
          margin: 0 0 4px 0;
          font-weight: 700;
          color: #f8fafc;
          font-size: 15px;
          letter-spacing: -0.01em;
        }

        .cookie-description {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }

        .cookie-link {
          color: #34d399;
          text-decoration: underline;
          text-underline-offset: 2px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .cookie-link:hover {
          color: #6ee7b7;
        }

        /* Buttons container */
        .cookie-banner-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 24px;
          flex-shrink: 0;
        }

        .cookie-banner button:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .cookie-banner button:active {
          transform: translateY(0);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .cookie-banner > div:first-child {
            padding: 16px 16px 8px !important;
          }

          .cookie-content {
            gap: 12px;
          }

          .cookie-icon {
            width: 36px;
            height: 36px;
          }

          .cookie-icon svg {
            width: 22px;
            height: 22px;
          }

          .cookie-title {
            font-size: 14px;
          }

          .cookie-description {
            font-size: 12px;
          }

          .cookie-banner-buttons {
            padding: 8px 16px 16px !important;
            width: 100%;
            justify-content: stretch;
          }

          .cookie-banner-buttons button {
            flex: 1;
            padding: 12px 16px !important;
            font-size: 13px !important;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .cookie-banner-buttons {
            flex-direction: column;
            gap: 8px;
          }

          .cookie-banner-buttons button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default App;