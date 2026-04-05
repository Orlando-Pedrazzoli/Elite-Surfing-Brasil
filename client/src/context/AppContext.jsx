import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

// DEBUG - Apenas em desenvolvimento
if (import.meta.env.DEV) {
  console.log('🔧 Backend URL:', import.meta.env.VITE_BACKEND_URL);
}

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;

  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [products, setProducts] = useState([]);
  const [familyCache, setFamilyCache] = useState({});
  const [cartItems, setCartItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartSidebar, setShowCartSidebar] = useState(false);

  // OTIMIZADO: isLoading começa false - site carrega imediato
  const [isLoading, setIsLoading] = useState(false);
  const [isSellerLoading, setIsSellerLoading] = useState(true);

  // ✅ FIX: Ref para evitar chamadas duplicadas de fetchSeller
  const sellerFetchInProgress = useRef(false);
  const sellerInitialized = useRef(false);

  // Token management functions
  const setAuthToken = token => {
    if (token) {
      localStorage.setItem('auth_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('auth_token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const getStoredToken = () => {
    return localStorage.getItem('auth_token');
  };

  // ✅ FIX IPHONE: Limpar seller token
  const clearSellerToken = () => {
    localStorage.removeItem('sellerToken');
  };

  // ✅ FIX IPHONE: Verificar se uma URL é rota protegida por authSeller
  const isSellerRoute = url => {
    if (!url) return false;
    return (
      url.includes('/api/seller') ||
      url.includes('/api/order/seller') ||
      url.includes('/api/order/status') ||
      url.includes('/api/pix/confirm') ||
      url.includes('/api/clientes') ||
      url.includes('/api/romaneios') ||
      url.includes('/api/product/add') ||
      url.includes('/api/product/update') ||
      url.includes('/api/product/delete') ||
      url.includes('/api/product/stock') ||
      url.includes('/api/wsl/admin') ||
      url.includes('/api/blog/admin')
    );
  };

  // Save cart to localStorage
  const saveCartToStorage = cartData => {
    try {
      localStorage.setItem('cart_items', JSON.stringify(cartData));
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  };

  // Load cart from localStorage
  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart_items');
      return savedCart ? JSON.parse(savedCart) : {};
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
      return {};
    }
  };

  // Clear all stored data
  const clearStoredData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('guest_checkout_email');
    localStorage.removeItem('guest_checkout_address');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Save user data to localStorage
  const saveUserToStorage = userData => {
    try {
      if (userData) {
        localStorage.setItem('user_data', JSON.stringify(userData));
      } else {
        localStorage.removeItem('user_data');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário no localStorage:', error);
    }
  };

  // Load user data from localStorage
  const loadUserFromStorage = () => {
    try {
      const savedUser = localStorage.getItem('user_data');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Erro ao carregar usuário do localStorage:', error);
      return null;
    }
  };

  // 🆕 Detectar se é mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  // OTIMIZADO: fetchUser sem setIsLoading global
  const fetchUser = async () => {
    try {
      let response = await axios.get('/api/user/is-auth');

      if (response.data.success) {
        setUser(response.data.user);
        setCartItems(response.data.user.cartItems || {});
        saveUserToStorage(response.data.user);
        saveCartToStorage(response.data.user.cartItems || {});

        const token = getStoredToken();
        if (token && !axios.defaults.headers.common['Authorization']) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        return;
      }

      const storedToken = getStoredToken();
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] =
          `Bearer ${storedToken}`;

        try {
          response = await axios.get('/api/user/is-auth');

          if (response.data.success) {
            setUser(response.data.user);
            setCartItems(response.data.user.cartItems || {});
            saveUserToStorage(response.data.user);
            saveCartToStorage(response.data.user.cartItems || {});
            return;
          }
        } catch (tokenError) {
          console.log('Validação de token falhou');
        }
      }

      const savedUser = loadUserFromStorage();
      const savedCart = loadCartFromStorage();

      if (savedUser) {
        setUser(savedUser);
        setCartItems(savedCart);
      } else {
        setUser(null);
        setCartItems({});
        clearStoredData();
      }
    } catch (error) {
      console.error('❌ Erro no fetchUser:', error);

      const savedUser = loadUserFromStorage();
      const savedCart = loadCartFromStorage();

      if (savedUser) {
        setUser(savedUser);
        setCartItems(savedCart);
      } else {
        setUser(null);
        setCartItems({});
        clearStoredData();
      }
    }
  };

  // Enhanced logout function
  const logoutUser = async () => {
    try {
      await axios.get('/api/user/logout');
    } catch (error) {
      console.log('Logout no servidor falhou:', error);
    } finally {
      setUser(null);
      setCartItems({});
      clearStoredData();
      navigate('/');
      toast.success('Você saiu da sua conta com sucesso');
    }
  };

  // ✅ FIX: Logout do Seller — agora também limpa token do localStorage
  const logoutSeller = async () => {
    try {
      await axios.get('/api/seller/logout');
    } catch (error) {
      console.log('Logout do seller falhou:', error);
    } finally {
      setIsSeller(false);
      clearSellerToken();
      sellerInitialized.current = false;
      sessionStorage.removeItem('seller_just_logged_in');
      sessionStorage.removeItem('seller_authenticated');
      navigate('/');
      toast.success('Logout do Admin realizado com sucesso');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX PRINCIPAL: fetchSeller simplificado e robusto
  // ═══════════════════════════════════════════════════════════
  // PROBLEMA ANTERIOR: fetchSeller verificava window.location.pathname
  // e sessionStorage para decidir se deveria aceitar o token válido.
  // Isso causava race conditions onde um token válido era rejeitado
  // porque o pathname ainda não tinha mudado, ou porque justLoggedIn
  // já tinha sido limpo por uma chamada anterior.
  //
  // FIX: Se o servidor confirma que o token é válido (is-auth retorna
  // success:true), o seller ESTÁ autenticado. Ponto final.
  // A decisão de mostrar ou não o painel é responsabilidade do ROUTER
  // (App.jsx), não do fetchSeller.
  // ═══════════════════════════════════════════════════════════
  const fetchSeller = async () => {
    // Evitar chamadas duplicadas simultâneas
    if (sellerFetchInProgress.current) return;
    sellerFetchInProgress.current = true;

    try {
      // ✅ FIX: Só setar loading se ainda não foi inicializado
      // Evita flash de loading quando já está autenticado
      if (!sellerInitialized.current) {
        setIsSellerLoading(true);
      }

      const { data } = await axios.get('/api/seller/is-auth');

      if (data.success) {
        // ✅ FIX: Token válido = seller autenticado. Sem condições extras.
        setIsSeller(true);
        sessionStorage.setItem('seller_authenticated', 'true');
        sessionStorage.removeItem('seller_just_logged_in');
      } else {
        setIsSeller(false);
        clearSellerToken();
        sessionStorage.removeItem('seller_authenticated');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar seller:', error.message);

      if (error.response?.status === 401) {
        setIsSeller(false);
        clearSellerToken();
        sessionStorage.removeItem('seller_authenticated');
        sessionStorage.removeItem('seller_just_logged_in');
      }
      // ✅ FIX: Em caso de erro de rede (não 401), manter estado atual
      // se já estava autenticado (permite trabalhar offline brevemente)
    } finally {
      setIsSellerLoading(false);
      sellerFetchInProgress.current = false;
      sellerInitialized.current = true;
    }
  };

  // Fetch All Products
  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/api/product/list');
      if (data.success) {
        setProducts(data.products);
        setFamilyCache({});
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  // =============================================================================
  // FUNÇÕES DE ESTOQUE
  // =============================================================================

  // Função auxiliar para encontrar produto
  const findProduct = productId => {
    let product = products.find(p => p._id === productId);

    if (!product) {
      for (const familySlug in familyCache) {
        const familyProduct = familyCache[familySlug].find(
          p => p._id === productId,
        );
        if (familyProduct) {
          product = familyProduct;
          break;
        }
      }
    }

    return product;
  };

  // Obter estoque disponível de um produto
  const getAvailableStock = productId => {
    const product = findProduct(productId);
    return product?.stock || 0;
  };

  // Validar se pode adicionar ao carrinho
  const canAddToCart = (productId, quantityToAdd = 1) => {
    const product = findProduct(productId);

    if (!product) {
      return { can: false, reason: 'Produto não encontrado' };
    }

    const currentInCart = cartItems[productId] || 0;
    const availableStock = product.stock !== undefined ? product.stock : 999;

    if (availableStock === 0) {
      return { can: false, reason: 'Produto esgotado' };
    }

    if (currentInCart + quantityToAdd > availableStock) {
      return {
        can: false,
        reason: `Apenas ${availableStock} unidade(s) disponível(eis). Você já tem ${currentInCart} no carrinho.`,
      };
    }

    return { can: true };
  };

  // =============================================================================
  // FUNÇÕES DE FAMÍLIA/VARIANTES
  // =============================================================================

  // Buscar todos os produtos de uma família (com cache)
  const getProductFamily = async familySlug => {
    if (!familySlug) return [];

    if (familyCache[familySlug]) {
      return familyCache[familySlug];
    }

    try {
      const { data } = await axios.post('/api/product/family', { familySlug });

      if (data.success && data.products) {
        setFamilyCache(prev => ({
          ...prev,
          [familySlug]: data.products,
        }));
        return data.products;
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar família:', error);
      return [];
    }
  };

  // Limpar cache de uma família
  const clearFamilyCache = familySlug => {
    if (familySlug) {
      setFamilyCache(prev => {
        const newCache = { ...prev };
        delete newCache[familySlug];
        return newCache;
      });
    } else {
      setFamilyCache({});
    }
  };

  // =============================================================================
  // OPERAÇÕES DO CARRINHO COM VALIDAÇÃO DE ESTOQUE
  // =============================================================================

  const addToCart = async itemId => {
    const validation = canAddToCart(itemId, 1);

    if (!validation.can) {
      toast.error(validation.reason);
      return false;
    }

    const newCartItems = { ...cartItems };

    if (newCartItems[itemId]) {
      newCartItems[itemId] += 1;
    } else {
      newCartItems[itemId] = 1;
    }

    setCartItems(newCartItems);
    saveCartToStorage(newCartItems);
    toast.success('Adicionado ao carrinho');

    // Meta Pixel — AddToCart
    if (typeof window.fbq === 'function') {
      const product = findProduct(itemId);
      if (product) {
        window.fbq('track', 'AddToCart', {
          content_name: product.name,
          content_ids: [product._id],
          content_type: 'product',
          value: product.offerPrice || product.price || 0,
          currency: 'BRL',
          num_items: 1,
        });
      }
    }

    setShowCartSidebar(true);

    if (user) {
      try {
        await axios.post('/api/cart/update', { cartItems: newCartItems });
      } catch (error) {
        console.error('Erro ao sincronizar carrinho com o servidor:', error);
      }
    }

    return true;
  };

  const updateCartItem = async (itemId, quantity) => {
    const newCartItems = { ...cartItems };

    if (quantity <= 0) {
      delete newCartItems[itemId];
      toast.success('Produto removido do carrinho');
    } else {
      const availableStock = getAvailableStock(itemId);

      if (availableStock > 0 && quantity > availableStock) {
        toast.error(`Apenas ${availableStock} unidade(s) disponível(eis)`);
        return false;
      }

      newCartItems[itemId] = quantity;
      toast.success('Carrinho atualizado');
    }

    setCartItems(newCartItems);
    saveCartToStorage(newCartItems);

    if (user) {
      try {
        await axios.post('/api/cart/update', { cartItems: newCartItems });
      } catch (error) {
        console.error('Erro ao sincronizar carrinho com o servidor:', error);
      }
    }

    return true;
  };

  const removeFromCart = async itemId => {
    const newCartItems = { ...cartItems };

    if (newCartItems[itemId]) {
      newCartItems[itemId] -= 1;
      if (newCartItems[itemId] === 0) {
        delete newCartItems[itemId];
      }
    }

    setCartItems(newCartItems);
    saveCartToStorage(newCartItems);
    toast.success('Removido do carrinho');

    if (user) {
      try {
        await axios.post('/api/cart/update', { cartItems: newCartItems });
      } catch (error) {
        console.error('Erro ao sincronizar carrinho com o servidor:', error);
      }
    }
  };

  const clearSearchQuery = () => {
    setSearchQuery('');
  };

  const getCartCount = () => {
    let totalCount = 0;
    for (const item in cartItems) {
      totalCount += cartItems[item];
    }
    return totalCount;
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      let itemInfo = findProduct(items);
      if (itemInfo && cartItems[items] > 0) {
        totalAmount += itemInfo.offerPrice * cartItems[items];
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  // Axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      config => {
        // User auth token — todas as requests
        const token = getStoredToken();
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // ✅ FIX: Seller token — APENAS em rotas protegidas por authSeller
        const sellerToken = localStorage.getItem('sellerToken');
        if (sellerToken && isSellerRoute(config.url)) {
          config.headers['x-seller-token'] = sellerToken;
        }

        return config;
      },
      error => Promise.reject(error),
    );

    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          const requestUrl = error.config?.url || '';

          // ✅ FIX: Tratar 401 de rotas seller separadamente
          if (
            isSellerRoute(requestUrl) ||
            requestUrl.includes('/api/seller/')
          ) {
            // Não limpar dados do user — é um 401 do seller
            // O fetchSeller já trata isso
          } else {
            // 401 de rota de user — limpar sessão do user
            setUser(null);
            setCartItems(loadCartFromStorage());
            clearStoredData();
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // ✅ FIX: Inicialização simplificada
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Restaurar token do user
      const token = getStoredToken();
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // 2. Restaurar cart e user do localStorage (instantâneo)
      const savedCart = loadCartFromStorage();
      setCartItems(savedCart);

      const savedUser = loadUserFromStorage();
      if (savedUser) {
        setUser(savedUser);
      }

      // 3. Fetch produtos e user em paralelo
      fetchProducts();
      fetchUser();

      // 4. ✅ FIX: Lógica de seller simplificada
      const hasSellerToken = !!localStorage.getItem('sellerToken');
      const isInSellerArea = window.location.pathname.startsWith('/seller');

      if (hasSellerToken) {
        // Tem token — confiar optimisticamente e validar em background
        if (isInSellerArea) {
          // Estamos na área seller: mostrar UI optimisticamente
          setIsSeller(true);
          setIsSellerLoading(false);
          // Validar em background (se falhar, fetchSeller limpa tudo)
          fetchSeller();
        } else {
          // Não estamos na área seller: validar silenciosamente
          // para ter o estado pronto quando navegar
          setIsSellerLoading(false);
          fetchSeller();
        }
      } else if (isInSellerArea) {
        // Na área seller sem token: precisa de login
        // fetchSeller vai confirmar e setar loading=false
        fetchSeller();
      } else {
        // Fora da área seller, sem token: nada a fazer
        setIsSellerLoading(false);
      }
    };

    initializeApp();
  }, []);

  // ✅ FIX: Verificar seller quando navega para /seller pela primeira vez
  // Agora usa ref para evitar chamadas duplicadas
  useEffect(() => {
    if (
      location.pathname.startsWith('/seller') &&
      !isSeller &&
      !sellerInitialized.current &&
      !sellerFetchInProgress.current
    ) {
      fetchSeller();
    }
  }, [location.pathname]);

  // Auto-sync cart with server when user changes
  useEffect(() => {
    const syncCartWithServer = async () => {
      if (user && Object.keys(cartItems).length > 0) {
        try {
          await axios.post('/api/cart/update', { cartItems });
        } catch (error) {
          console.error('Erro ao sincronizar carrinho com o servidor:', error);
        }
      }
    };

    syncCartWithServer();
  }, [user]);

  const value = {
    navigate,
    user,
    setUser,
    isSeller,
    setIsSeller,
    showUserLogin,
    setShowUserLogin,
    showCartSidebar,
    setShowCartSidebar,
    products,
    currency,
    addToCart,
    updateCartItem,
    removeFromCart,
    cartItems,
    searchQuery,
    setSearchQuery,
    clearSearchQuery,
    getCartAmount,
    getCartCount,
    axios,
    fetchProducts,
    fetchSeller,
    setCartItems,
    logoutUser,
    logoutSeller,
    setAuthToken,
    isLoading,
    isSellerLoading,
    isMobile,
    saveCartToStorage,
    loadCartFromStorage,
    saveUserToStorage,
    // Funções de estoque
    getAvailableStock,
    canAddToCart,
    findProduct,
    // Funções de família/variantes
    getProductFamily,
    clearFamilyCache,
    familyCache,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  return useContext(AppContext);
};
