import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import toast from 'react-hot-toast';
import { SEO } from '../components/seo';
import seoConfig from '../components/seo/seoConfig';
import AddressFormModal from '../components/AddressFormModal';
import ShippingCalculator from '../components/ShippingCalculator';
import { MapPin, Plus, Edit3, ChevronDown, ChevronUp, Truck, Shield, CreditCard, User, QrCode, FileText, Clock, Package } from 'lucide-react';
import { PIX_DISCOUNT, formatBRL } from '../utils/installmentUtils';

const Cart = () => {
  const {
    products,
    currency,
    cartItems,
    removeFromCart,
    getCartCount,
    updateCartItem,
    navigate,
    getCartAmount,
    axios,
    user,
    setCartItems,
    setShowUserLogin,
    isMobile,
    saveCartToStorage,
    findProduct,
  } = useAppContext();

  const [cartArray, setCartArray] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddressList, setShowAddressList] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stockWarnings, setStockWarnings] = useState({});
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [guestAddress, setGuestAddress] = useState(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [guestAddressId, setGuestAddressId] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // ═══ FRETE — Melhor Envio ═══
  const [selectedShipping, setSelectedShipping] = useState(null);

  const validPromoCodes = ['ELITE10', 'RIOSURFCHECK10', 'RAY10'];
  const [appliedPromoCode, setAppliedPromoCode] = useState('');

  const isCartEmpty = !products.length || !cartItems || Object.keys(cartItems).length === 0;

  // Redirecionamento automático quando carrinho está vazio
  useEffect(() => {
    if (isCartEmpty) {
      const timer = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/products');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setRedirectCountdown(3);
    }
  }, [isCartEmpty, navigate]);

  // Carregar endereço de guest do localStorage
  useEffect(() => {
    const savedGuestAddress = localStorage.getItem('guest_checkout_address');
    if (savedGuestAddress && !user) {
      setGuestAddress(JSON.parse(savedGuestAddress));
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (products.length > 0 && cartItems) {
      updateCartArray();
    }
    if (user) {
      loadUserAddresses();
    }
  }, [products, cartItems, user]);

  // Resetar frete quando carrinho muda
  useEffect(() => {
    setSelectedShipping(null);
  }, [cartItems]);

  // Resetar frete quando cupom é aplicado/removido (threshold pode mudar)
  useEffect(() => {
    setSelectedShipping(null);
  }, [discountApplied]);

  const updateCartArray = () => {
    const tempArray = Object.keys(cartItems)
      .map(key => {
        const product = findProduct(key);
        return product ? { ...product, quantity: cartItems[key] } : null;
      })
      .filter(Boolean);
    setCartArray(tempArray);

    const warnings = {};
    tempArray.forEach(product => {
      const availableStock = product.stock || 0;
      if (product.quantity > availableStock) {
        warnings[product._id] = `Apenas ${availableStock} disponível(eis)`;
      }
    });
    setStockWarnings(warnings);
  };

  const loadUserAddresses = async () => {
    try {
      const { data } = await axios.post('/api/address/get', {}, { withCredentials: true });
      if (data.success) {
        setAddresses(data.addresses);
        if (data.addresses.length > 0) {
          const savedGuestAddress = localStorage.getItem('guest_checkout_address');
          if (savedGuestAddress) {
            const guestAddr = JSON.parse(savedGuestAddress);
            const existingMatch = data.addresses.find(a =>
              a.street === guestAddr.street &&
              a.zipcode === guestAddr.zipcode
            );
            if (existingMatch) {
              setSelectedAddress(existingMatch);
              localStorage.removeItem('guest_checkout_address');
            } else {
              saveGuestAddressToServer(guestAddr);
            }
          } else {
            setSelectedAddress(prev => prev || data.addresses[0]);
          }
        } else if (guestAddress) {
          saveGuestAddressToServer(guestAddress);
        }
      }
    } catch (error) {
      console.error('Falha ao carregar os endereços:', error);
    }
  };

  const saveGuestAddressToServer = async (address) => {
    try {
      const { data } = await axios.post('/api/address/add', { address: addressData });
      if (data.success) {
        localStorage.removeItem('guest_checkout_address');
        setGuestAddress(null);
        loadUserAddresses();
        toast.success('Endereço salvo na sua conta!');
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  };

  // ═══════════════════════════════════════════════
  // CÁLCULOS DE TOTAL — com PIX 10%, cupom e FRETE
  // ═══════════════════════════════════════════════
  const getSubtotal = () => parseFloat(getCartAmount());

  const getPromoDiscount = () => {
    if (!discountApplied) return 0;
    return getSubtotal() * 0.1;
  };

  const getPixDiscount = () => {
    if (paymentMethod !== 'pix') return 0;
    const afterPromo = getSubtotal() - getPromoDiscount();
    return afterPromo * PIX_DISCOUNT;
  };

  const getShippingCost = () => {
    return selectedShipping ? Number(selectedShipping.price) : 0;
  };

  const calculateTotal = () => {
    const subtotal = getSubtotal();
    const promoDisc = getPromoDiscount();
    const pixDisc = getPixDiscount();
    const shipping = getShippingCost();
    return Math.max(0, subtotal - promoDisc - pixDisc + shipping).toFixed(2);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    const product = findProduct(productId);
    if (!product) return;

    const availableStock = product.stock || 0;

    if (newQuantity > availableStock) {
      toast.error(`Apenas ${availableStock} unidade(s) disponível(eis) para ${product.name}`);
      if (availableStock > 0) {
        updateCartItem(productId, availableStock);
      }
      return;
    }

    updateCartItem(productId, newQuantity);
  };

  const validateStockBeforeCheckout = () => {
    const errors = [];

    for (const product of cartArray) {
      const availableStock = product.stock || 0;

      if (availableStock === 0) {
        errors.push(`${product.name} está esgotado`);
      } else if (product.quantity > availableStock) {
        errors.push(`${product.name}: apenas ${availableStock} disponível(eis)`);
      }
    }

    return errors;
  };

  const getCurrentAddress = () => {
    if (user && selectedAddress) return selectedAddress;
    if (guestAddress) return guestAddress;
    return null;
  };

  const hasAddress = () => {
    return !!(user ? selectedAddress : guestAddress);
  };

  // Callback do ShippingCalculator
  const handleShippingSelect = (option) => {
    setSelectedShipping(option);
  };

  // =============================================================================
  // HANDLE PLACE ORDER
  // =============================================================================
  // ═══════════════════════════════════════════════════════════════
  // handlePlaceOrder — ATUALIZADO COM PIX MANUAL
  // ═══════════════════════════════════════════════════════════════
  const handlePlaceOrder = async () => {
    const currentAddress = getCurrentAddress();
    if (!currentAddress) {
      return toast.error('Por favor, adicione um endereço de entrega.');
    }
    if (cartArray.length === 0) {
      return toast.error('Seu carrinho está vazio.');
    }
    if (!selectedShipping) {
      return toast.error('Por favor, calcule e selecione uma opção de frete.');
    }
    const stockErrors = validateStockBeforeCheckout();
    if (stockErrors.length > 0) {
      toast.error('Estoque insuficiente:\n' + stockErrors.join('\n'));
      return;
    }

    setIsProcessing(true);

    try {
      const subtotal = getSubtotal();
      const promoDisc = getPromoDiscount();
      const pixDisc = getPixDiscount();
      const shipping = getShippingCost();
      const finalAmount = Math.max(0, subtotal - promoDisc - pixDisc + shipping);

      // ═══════════════════════════════════════════════════════════
      // 💰 FLUXO PIX MANUAL
      // ═══════════════════════════════════════════════════════════
      if (paymentMethod === 'pix') {

        const pixPayload = {
          items: cartArray.map(item => ({
            product: item._id,
            quantity: item.quantity,
          })),
          shippingCost: shipping,
          shippingMethod: selectedShipping.name,
          shippingCarrier: selectedShipping.carrier,
          shippingDeliveryDays: selectedShipping.deliveryDays,
          shippingServiceId: selectedShipping.serviceId || selectedShipping.id,
          promoCode: discountApplied ? appliedPromoCode : null,
          discountAmount: promoDisc,
          discountPercentage: discountApplied ? 10 : 0,
        };

        let pixEndpoint;

        if (user) {
          // ─── User logado ───
          pixPayload.address = selectedAddress._id;
          pixEndpoint = '/api/pix/create';
        } else {
          // ─── Guest checkout ───
          const addressResponse = await axios.post('/api/address/guest', {
            address: currentAddress,
          });
          if (!addressResponse.data.success) {
            throw new Error(addressResponse.data.message || 'Erro ao salvar endereço');
          }

          pixPayload.address = addressResponse.data.addressId;
          pixPayload.guestName = `${currentAddress.firstName} ${currentAddress.lastName}`;
          pixPayload.guestEmail = currentAddress.email;
          pixPayload.guestPhone = currentAddress.phone || '';
          pixEndpoint = '/api/pix/guest/create';
        }

        const { data } = await axios.post(pixEndpoint, pixPayload);

        if (data.success) {
          // Salvar dados para a página PixPayment.jsx ler
          localStorage.setItem('pix_manual_data', JSON.stringify({
            orderId: data.order.orderId,
            amount: data.order.amount,
            originalAmount: data.order.originalAmount,
            pixDiscount: data.order.pixDiscount,
            createdAt: data.order.createdAt,
          }));

          // Limpar carrinho
          const emptyCart = {};
          setCartItems(emptyCart);
          saveCartToStorage(emptyCart);

          // Guardar email guest (para tracking depois)
          if (!user && currentAddress.email) {
            localStorage.setItem('guest_checkout_email', currentAddress.email);
          }

          // Navegar para página de pagamento PIX
          navigate(`/pix-payment/${data.order.orderId}`);
        } else {
          toast.error(data.message || 'Erro ao criar pedido PIX.');
        }

        return; // Sai da função — não continua para Stripe
      }

      // ═══════════════════════════════════════════════════════════
      // 💳 FLUXO STRIPE (código existente, sem alterações)
      // ═══════════════════════════════════════════════════════════
      const orderData = {
        items: cartArray.map(item => ({
          product: item._id,
          quantity: item.quantity,
        })),
        originalAmount: subtotal,
        amount: finalAmount,
        discountAmount: promoDisc + pixDisc,
        discountPercentage: discountApplied ? 10 : 0,
        pixDiscountAmount: pixDisc,
        pixDiscountPercentage: paymentMethod === 'pix' ? PIX_DISCOUNT * 100 : 0,
        promoCode: discountApplied ? appliedPromoCode : '',
        paymentType: 'Online',
        paymentMethod: paymentMethod,
        isPaid: false,
        // ═══ DADOS DE FRETE ═══
        shippingCost: shipping,
        shippingMethod: selectedShipping.name,
        shippingCarrier: selectedShipping.carrier,
        shippingDeliveryDays: selectedShipping.deliveryDays,
        shippingServiceId: selectedShipping.serviceId || selectedShipping.id,
      };

      let endpoint;

      if (user) {
        orderData.userId = user._id;
        orderData.address = selectedAddress._id;
        orderData.isGuestOrder = false;
        endpoint = '/api/order/stripe';
      } else {
        const addressResponse = await axios.post('/api/address/guest', {
          address: currentAddress,
        });
        if (!addressResponse.data.success) {
          throw new Error(addressResponse.data.message || 'Erro ao salvar endereço');
        }
        const addressId = addressResponse.data.addressId;
        orderData.isGuestOrder = true;
        orderData.guestEmail = currentAddress.email;
        orderData.guestName = `${currentAddress.firstName} ${currentAddress.lastName}`;
        orderData.guestPhone = currentAddress.phone;
        orderData.address = addressId;
        endpoint = '/api/order/guest/stripe';
      }

      const response = await axios.post(endpoint, orderData);

      if (response.data.success && response.data.url) {
        const emptyCart = {};
        setCartItems(emptyCart);
        saveCartToStorage(emptyCart);
        if (!user && currentAddress.email) {
          localStorage.setItem('guest_checkout_email', currentAddress.email);
        }
        window.location.replace(response.data.url);
      } else {
        toast.error(response.data.message || 'Falha ao iniciar o pagamento.');
      }
    } catch (error) {
      console.error('Erro no pedido:', error);
      if (error.response?.status === 401 && user) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        if (isMobile) localStorage.removeItem('mobile_auth_token');
        setShowUserLogin(true);
      } else if (error.response?.status === 404) {
        console.error('❌ Endpoint não encontrado:', error.response?.config?.url);
        toast.error('Erro no servidor. Tente novamente ou entre em contato.');
      } else {
        toast.error(error.response?.data?.message || 'Falha ao processar o pedido.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromoCode = () => {
    const inputCode = promoCode.trim().toUpperCase();
    if (validPromoCodes.includes(inputCode)) {
      setDiscountApplied(true);
      setAppliedPromoCode(inputCode);
      toast.success('Desconto de 10% aplicado!');
    } else {
      toast.error('Cupom inválido.');
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setDiscountApplied(false);
    setAppliedPromoCode('');
    toast('Cupom removido.');
  };

  const getPaymentButtonText = () => {
    if (isProcessing) return 'Processando...';
    switch (paymentMethod) {
      case 'pix': return 'Pagar com PIX';
      case 'boleto': return 'Gerar Boleto';
      case 'card': return 'Pagar com Cartão';
      default: return 'Finalizar Compra';
    }
  };

  const getPaymentButtonIcon = () => {
    switch (paymentMethod) {
      case 'pix': return <QrCode className='w-5 h-5' />;
      case 'boleto': return <FileText className='w-5 h-5' />;
      case 'card': return <CreditCard className='w-5 h-5' />;
      default: return null;
    }
  };

  const handleSaveAddress = async (addressData) => {
    setIsAddressLoading(true);

    try {
      if (user) {
        if (editingAddress) {
          const { data } = await axios.put(`/api/address/update/${editingAddress._id}`, { address: addressData });
          if (data.success) {
            toast.success('Endereço atualizado!');
            loadUserAddresses();
          }
        } else {
          const { data } = await axios.post('/api/address/add', { address: addressData });
          if (data.success) {
            toast.success('Endereço adicionado!');
            loadUserAddresses();
          }
        }
      } else {
        setGuestAddress(addressData);
        localStorage.setItem('guest_checkout_address', JSON.stringify(addressData));
        toast.success('Endereço adicionado!');
      }

      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast.error('Erro ao salvar endereço. Tente novamente.');
    } finally {
      setIsAddressLoading(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const isLightColor = (color) => {
    if (!color) return false;
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 200;
  };

  const ColorBall = ({ code1, code2, size = 24, title }) => {
    const isDual = code2 && code2 !== code1;
    const isLight1 = isLightColor(code1);
    const isLight2 = isLightColor(code2);
    const needsBorder = isLight1 || (isDual && isLight2);

    return (
      <div
        className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white shadow-sm ${
          needsBorder ? 'ring-1 ring-gray-300' : ''
        }`}
        style={{ width: size, height: size }}
        title={title}
      >
        {isDual ? (
          <div
            className='w-full h-full rounded-full overflow-hidden'
            style={{
              background: `linear-gradient(135deg, ${code1} 50%, ${code2} 50%)`,
            }}
          />
        ) : (
          <div
            className='w-full h-full rounded-full'
            style={{ backgroundColor: code1 || '#ccc' }}
          />
        )}
      </div>
    );
  };

  // Carrinho vazio
  if (isCartEmpty) {
    return (
      <>
        <SEO title={seoConfig.cart.title} description={seoConfig.cart.description} url={seoConfig.cart.url} noindex={true} />
        <div className='flex flex-col items-center justify-center min-h-[70vh] px-4 text-center bg-gray-50'>
          <img src={assets.empty_cart} alt='Carrinho vazio' className='w-56 sm:w-64 md:w-72 mb-6 max-w-full' />
          <h3 className='text-xl sm:text-2xl font-semibold mb-3 text-gray-700'>Seu carrinho está vazio!</h3>
          <p className='text-gray-600 mb-4 max-w-md'>Você ainda não adicionou produtos ao carrinho.</p>

          <div className='mb-6 flex items-center gap-2 text-gray-500'>
            <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
            </svg>
            <span className='text-sm'>Redirecionando em {redirectCountdown}s...</span>
          </div>

          <button onClick={() => navigate('/products')} className='bg-primary text-white px-7 py-3 rounded-lg shadow-md hover:bg-primary-dull transition-all duration-300 text-base font-medium active:scale-95'>
            Explorar produtos agora
          </button>
        </div>
      </>
    );
  }

  const currentAddress = getCurrentAddress();

  const formatBrazilianAddress = (addr) => {
    if (!addr) return null;
    return (
      <div className='text-sm text-gray-700'>
        <p className='font-semibold text-gray-800'>
          {addr.firstName} {addr.lastName}
        </p>
        <p className='mt-1'>
          {addr.street}{addr.number ? `, ${addr.number}` : ''}
        </p>
        {addr.complement && <p>{addr.complement}</p>}
        {addr.neighborhood && <p>{addr.neighborhood}</p>}
        <p>CEP: {addr.zipcode} - {addr.city}/{addr.state}</p>
        <p>{addr.country || 'Brasil'}</p>
        {addr.cpf && <p className='mt-1 text-gray-500'>CPF: {addr.cpf}</p>}
        <p className='mt-1 text-gray-500'>{addr.phone}</p>
        {!user && addr.email && (
          <p className='mt-1 text-primary font-medium'>{addr.email}</p>
        )}
      </div>
    );
  };

  return (
    <>
      <SEO title={seoConfig.cart.title} description={seoConfig.cart.description} url={seoConfig.cart.url} noindex={true} />

      <AddressFormModal
        isOpen={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        initialAddress={editingAddress || (user?.email ? { email: user.email } : null)}
        isGuest={!user}
        isLoading={isAddressLoading}
      />

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 min-h-[calc(100vh-60px)]'>
        {/* Progress Steps */}
        <div className='max-w-2xl mx-auto mb-8'>
          <div className='flex items-center justify-center'>
            <div className='flex items-center'>
              <div className='flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold'>1</div>
              <span className='ml-2 text-sm font-medium text-primary'>Carrinho</span>
            </div>
            <div className={`w-16 h-1 mx-3 rounded ${hasAddress() ? 'bg-primary' : 'bg-gray-300'}`}></div>
            <div className='flex items-center'>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${hasAddress() ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'}`}>2</div>
              <span className={`ml-2 text-sm font-medium ${hasAddress() ? 'text-primary' : 'text-gray-500'}`}>Endereço</span>
            </div>
            <div className={`w-16 h-1 mx-3 rounded ${selectedShipping ? 'bg-primary' : 'bg-gray-300'}`}></div>
            <div className='flex items-center'>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${selectedShipping ? 'bg-primary text-white' : 'bg-gray-300 text-gray-500'}`}>3</div>
              <span className={`ml-2 text-sm font-medium ${selectedShipping ? 'text-primary' : 'text-gray-500'}`}>Pagamento</span>
            </div>
          </div>
        </div>

        <div className='flex flex-col lg:flex-row gap-8'>
          {/* Cart Items Section */}
          <div className='lg:w-2/3'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6'>
              <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0'>
                Carrinho de Compras ({getCartCount()} {getCartCount() === 1 ? 'item' : 'itens'})
              </h1>
              <button onClick={() => navigate('/products')} className='flex items-center text-primary-dark hover:underline text-sm sm:text-base font-medium'>
                Continuar Comprando
                <img src={assets.arrow_right_icon_colored} alt='>' className='ml-1 h-4 w-4' />
              </button>
            </div>

            <div className='bg-white rounded-xl shadow-lg overflow-hidden divide-y divide-gray-200'>
              {cartArray.map(product => {
                const availableStock = product.stock || 0;
                const hasStockWarning = stockWarnings[product._id];
                const isLowStock = availableStock > 0 && availableStock <= 3;

                return (
                  <div key={product._id} className={`flex flex-col sm:flex-row items-center p-4 sm:p-6 ${hasStockWarning ? 'bg-red-50' : ''}`}>
                    <div className='flex items-center w-full sm:w-2/3 mb-4 sm:mb-0'>
                      <div className='relative'>
                        <img
                          src={product.image[0]}
                          alt={product.name}
                          className='w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer transition-transform duration-200 hover:scale-[1.02]'
                          onClick={() => navigate(`/products/${product.category.toLowerCase()}/${product._id}`)}
                        />
                        {product.colorCode && (
                          <ColorBall
                            code1={product.colorCode}
                            code2={product.colorCode2}
                            size={24}
                            title={product.color || 'Cor'}
                          />
                        )}
                      </div>

                      <div className='ml-4 flex-grow'>
                        <h3 className='font-semibold text-lg text-gray-800'>{product.name}</h3>

                        {product.color && (
                          <p className='text-sm text-gray-500 mt-0.5'>Cor: {product.color}</p>
                        )}

                        <p className='text-sm text-gray-500 mt-1'>Peso: {product.weight || 'N/A'}g</p>

                        {isLowStock && !hasStockWarning && (
                          <p className='text-xs text-orange-600 font-medium mt-1'>Últimas {availableStock} unidades!</p>
                        )}

                        {hasStockWarning && (
                          <p className='text-xs text-red-600 font-medium mt-1 bg-red-100 px-2 py-1 rounded'>
                            {hasStockWarning}
                          </p>
                        )}

                        <p className='font-medium text-gray-700 mt-2 text-base sm:hidden'>
                          {formatBRL(product.offerPrice * product.quantity)}
                        </p>
                      </div>
                    </div>

                    <div className='flex justify-between items-center w-full sm:w-1/3 sm:justify-end sm:gap-8'>
                      <div className='flex items-center'>
                        <span className='mr-2 text-gray-600'>Qtd:</span>
                        <select
                          value={cartItems[product._id]}
                          onChange={e => handleQuantityChange(product._id, Number(e.target.value))}
                          className={`border rounded-md p-1 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none cursor-pointer ${
                            hasStockWarning ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          {[...Array(Math.max(availableStock, product.quantity, 1)).keys()].map(num => (
                            <option
                              key={num + 1}
                              value={num + 1}
                              disabled={num + 1 > availableStock}
                            >
                              {num + 1}{num + 1 > availableStock ? ' (indisponível)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className='text-right hidden sm:block'>
                        <p className='font-bold text-lg text-gray-800 flex items-baseline justify-end'>
                          <span>{formatBRL(product.offerPrice * product.quantity)}</span>
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(product._id)} className='text-red-500 hover:text-red-700 text-sm font-medium transition-colors duration-200 ml-4 cursor-pointer'>
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(stockWarnings).length > 0 && (
              <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                <p className='text-red-700 font-medium'>Alguns produtos excedem o estoque disponível. Por favor, ajuste as quantidades antes de finalizar.</p>
              </div>
            )}
          </div>

          {/* Checkout Section */}
          <div className='lg:w-1/3'>
            <div className='bg-white rounded-xl shadow-lg p-6 sticky lg:top-8'>
              <h2 className='text-2xl font-bold mb-5 text-gray-800'>Finalizar Compra</h2>

              {/* Guest Checkout Banner */}
              {!user && (
                <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
                  <div className='flex items-center gap-2 text-green-800'>
                    <Shield className='w-5 h-5' />
                    <span className='font-medium text-sm'>Compre sem criar conta!</span>
                  </div>
                  <p className='text-xs text-green-700 mt-1'>
                    Finalize sua compra rapidamente. Você pode criar conta depois.
                  </p>
                </div>
              )}

              {/* Address Section */}
              <div className='mb-6 border-b pb-6 border-gray-200'>
                <div className='flex items-center gap-2 mb-4'>
                  <MapPin className='w-5 h-5 text-primary' />
                  <h3 className='font-semibold text-gray-700'>Endereço de Entrega</h3>
                </div>

                {currentAddress ? (
                  <div className='space-y-3'>
                    <div className='bg-primary/5 border-2 border-primary/20 p-4 rounded-xl'>
                      <div className='flex justify-between items-start'>
                        {formatBrazilianAddress(currentAddress)}
                        <button
                          onClick={() => handleEditAddress(currentAddress)}
                          className='p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors'
                          title='Editar endereço'
                        >
                          <Edit3 className='w-4 h-4' />
                        </button>
                      </div>
                    </div>

                    {user && addresses.length > 1 && (
                      <div>
                        <button
                          onClick={() => setShowAddressList(!showAddressList)}
                          className='w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors'
                        >
                          <span>Escolher outro endereço ({addresses.length})</span>
                          {showAddressList ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
                        </button>

                        {showAddressList && (
                          <div className='mt-2 border border-gray-200 rounded-lg overflow-hidden'>
                            {addresses.map(address => (
                              <div
                                key={address._id}
                                onClick={() => {
                                  setSelectedAddress(address);
                                  setShowAddressList(false);
                                  setSelectedShipping(null);
                                }}
                                className={`p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${
                                  selectedAddress?._id === address._id ? 'bg-primary/5' : ''
                                }`}
                              >
                                <p className='font-medium'>{address.firstName} {address.lastName}</p>
                                <p className='text-gray-600'>{address.street}{address.number ? `, ${address.number}` : ''}</p>
                                <p className='text-gray-500'>{address.neighborhood ? `${address.neighborhood} - ` : ''}{address.city}/{address.state}</p>
                              </div>
                            ))}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddAddress();
                                setShowAddressList(false);
                              }}
                              className='w-full p-3 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 font-medium'
                            >
                              <Plus className='w-4 h-4' />
                              Novo endereço
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='text-center py-4'>
                    <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3'>
                      <MapPin className='w-8 h-8 text-gray-400' />
                    </div>
                    <p className='text-gray-600 mb-4'>
                      {user
                        ? 'Adicione um endereço para continuar'
                        : 'Adicione seus dados de entrega'
                      }
                    </p>
                    <button
                      onClick={handleAddAddress}
                      className='w-full py-3 px-4 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2'
                    >
                      <Plus className='w-5 h-5' />
                      Adicionar Endereço
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* FRETE — Melhor Envio                            */}
              {/* ═══════════════════════════════════════════════ */}
              {hasAddress() && (
                <div className='mb-6 border-b pb-6 border-gray-200'>
                  <div className='flex items-center gap-2 mb-4'>
                    <Package className='w-5 h-5 text-primary' />
                    <h3 className='font-semibold text-gray-700'>Frete</h3>
                  </div>

                  <ShippingCalculator
                    cartProducts={cartArray}
                    onShippingSelect={handleShippingSelect}
                    subtotal={getSubtotal()}
                  />

                  {selectedShipping && (
                    <div className='mt-3 p-3 bg-green-50 border border-green-200 rounded-lg'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span>{selectedShipping.icon}</span>
                          <div>
                            <p className='text-sm font-medium text-green-800'>
                              {selectedShipping.carrier} — {selectedShipping.name}
                              {selectedShipping.freeShipping && (
                                <span className='ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800'>
                                  🎉 FRETE GRÁTIS
                                </span>
                              )}
                            </p>
                            <p className='text-xs text-green-600'>{selectedShipping.deliveryText}</p>
                          </div>
                        </div>
                        {selectedShipping.freeShipping ? (
                          <div className='flex flex-col items-end'>
                            <span className='text-xs text-gray-400 line-through'>
                              {formatBRL(selectedShipping.originalPrice)}
                            </span>
                            <span className='text-sm font-bold text-green-700'>GRÁTIS</span>
                          </div>
                        ) : (
                          <span className='text-sm font-bold text-green-800'>
                            {formatBRL(selectedShipping.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Promo Code */}
              <div className='mb-6 border-b pb-6 border-gray-200'>
                <h3 className='font-semibold text-gray-700 mb-3'>Cupom de Desconto</h3>
                <div className='flex w-full'>
                  <input
                    type='text'
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                    placeholder='Digite o cupom'
                    disabled={discountApplied}
                    className='flex-1 min-w-0 border border-gray-300 rounded-l-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-700 disabled:bg-gray-100'
                  />
                  {discountApplied ? (
                    <button onClick={handleRemovePromo} className='bg-red-500 text-white px-5 py-2.5 rounded-r-lg hover:bg-red-600 transition-all duration-300 font-medium active:scale-95 flex-shrink-0'>
                      Remover
                    </button>
                  ) : (
                    <button onClick={handlePromoCode} className='bg-primary text-white px-5 py-2.5 rounded-r-lg hover:bg-primary-dull transition-all duration-300 font-medium active:scale-95 flex-shrink-0'>
                      Aplicar
                    </button>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* FORMA DE PAGAMENTO                              */}
              {/* ═══════════════════════════════════════════════ */}
              {hasAddress() && selectedShipping && (
                <div className='mb-6 border-b pb-6 border-gray-200'>
                  <h3 className='font-semibold text-gray-700 mb-3'>Forma de Pagamento</h3>
                  <div className='space-y-3'>

                    {/* PIX */}
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${paymentMethod === 'pix' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <input type='radio' name='paymentMethod' value='pix' checked={paymentMethod === 'pix'} onChange={e => setPaymentMethod(e.target.value)} className='sr-only' />
                      <div className='flex items-center flex-1'>
                        <div className='w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg mr-3'>
                          <QrCode className='w-5 h-5 text-primary' />
                        </div>
                        <div>
                          <span className='font-medium text-gray-800'>PIX</span>
                          <p className='text-xs text-gray-500'>Aprovação instantânea</p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold'>10% OFF</span>
                        {paymentMethod === 'pix' && (
                          <div className='w-5 h-5 bg-primary rounded-full flex items-center justify-center'>
                            <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                            </svg>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* CARTÃO */}
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <input type='radio' name='paymentMethod' value='card' checked={paymentMethod === 'card'} onChange={e => setPaymentMethod(e.target.value)} className='sr-only' />
                      <div className='flex items-center flex-1'>
                        <div className='w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg mr-3'>
                          <CreditCard className='w-5 h-5 text-primary' />
                        </div>
                        <div>
                          <span className='font-medium text-gray-800'>Cartão de Crédito</span>
                          <div className='flex gap-1 mt-0.5'>
                            <span className='text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded'>Visa</span>
                            <span className='text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded'>MC</span>
                            <span className='text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded'>Elo</span>
                            <span className='text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded'>até 10x</span>
                          </div>
                        </div>
                      </div>
                      {paymentMethod === 'card' && (
                        <div className='w-5 h-5 bg-primary rounded-full flex items-center justify-center'>
                          <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        </div>
                      )}
                    </label>

                    {/* BOLETO */}
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${paymentMethod === 'boleto' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                      <input type='radio' name='paymentMethod' value='boleto' checked={paymentMethod === 'boleto'} onChange={e => setPaymentMethod(e.target.value)} className='sr-only' />
                      <div className='flex items-center flex-1'>
                        <div className='w-10 h-10 flex items-center justify-center bg-primary/10 rounded-lg mr-3'>
                          <FileText className='w-5 h-5 text-primary' />
                        </div>
                        <div>
                          <span className='font-medium text-gray-800'>Boleto Bancário</span>
                          <p className='text-xs text-gray-500'>Vencimento em 3 dias úteis</p>
                        </div>
                      </div>
                      {paymentMethod === 'boleto' && (
                        <div className='w-5 h-5 bg-primary rounded-full flex items-center justify-center'>
                          <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        </div>
                      )}
                    </label>

                    {paymentMethod === 'boleto' && (
                      <div className='flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800'>
                        <Clock className='w-4 h-4 mt-0.5 flex-shrink-0' />
                        <div>
                          <p className='font-medium'>Atenção:</p>
                          <p className='text-xs mt-0.5'>O pedido será confirmado após a compensação do boleto (1-3 dias úteis). O boleto será gerado pelo Stripe.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* RESUMO DO PEDIDO                                */}
              {/* ═══════════════════════════════════════════════ */}
              <div className='pt-4'>
                <div className='flex justify-between items-center mb-3 text-gray-700'>
                  <span>Subtotal ({getCartCount()} {getCartCount() === 1 ? 'item' : 'itens'}):</span>
                  <span className='font-medium text-lg'>
                    {formatBRL(getSubtotal())}
                  </span>
                </div>

                {discountApplied && (
                  <div className='flex justify-between items-center text-green-600 mb-3'>
                    <span>Cupom ({appliedPromoCode} -10%):</span>
                    <span className='font-medium text-lg'>
                      -{formatBRL(getPromoDiscount())}
                    </span>
                  </div>
                )}

                {paymentMethod === 'pix' && (
                  <div className='flex justify-between items-center text-primary mb-3'>
                    <span className='flex items-center gap-1'>
                      <QrCode className='w-4 h-4' />
                      Desconto PIX (10%):
                    </span>
                    <span className='font-medium text-lg'>
                      -{formatBRL(getPixDiscount())}
                    </span>
                  </div>
                )}

                {selectedShipping && (
                  <div className={`flex justify-between items-center mb-3 ${selectedShipping.freeShipping ? 'text-green-600' : 'text-gray-700'}`}>
                    <span className='flex items-center gap-1'>
                      <Truck className='w-4 h-4' />
                      Frete ({selectedShipping.carrier}):
                    </span>
                    {selectedShipping.freeShipping ? (
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-400 line-through'>
                          {formatBRL(selectedShipping.originalPrice)}
                        </span>
                        <span className='font-bold text-lg text-green-600'>GRÁTIS</span>
                      </div>
                    ) : (
                      <span className='font-medium text-lg'>
                        {formatBRL(getShippingCost())}
                      </span>
                    )}
                  </div>
                )}

                <div className='flex justify-between font-bold text-xl mt-5 pt-3 border-t border-gray-200'>
                  <span>Total:</span>
                  <span className='text-primary-dark'>
                    {formatBRL(parseFloat(calculateTotal()))}
                  </span>
                </div>

                {paymentMethod === 'card' && (
                  <p className='text-xs text-gray-500 mt-1 text-right'>
                    ou até 10x de {formatBRL(parseFloat(calculateTotal()) / 10)} sem juros
                  </p>
                )}

                {paymentMethod === 'pix' && (
                  <p className='text-xs text-green-600 mt-1 text-right font-medium'>
                    Você economiza {formatBRL(getPixDiscount())} com PIX!
                  </p>
                )}

                {paymentMethod === 'boleto' && (
                  <p className='text-xs text-gray-500 mt-1 text-right'>
                    Pagamento via boleto bancário • Vence em 3 dias
                  </p>
                )}
              </div>

              {/* Checkout Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing || !hasAddress() || !selectedShipping || cartArray.length === 0 || Object.keys(stockWarnings).length > 0}
                className={`w-full mt-8 py-3.5 rounded-xl font-bold text-white text-lg shadow-md transition-all duration-300 flex items-center justify-center gap-2
                  ${isProcessing || !hasAddress() || !selectedShipping || cartArray.length === 0 || Object.keys(stockWarnings).length > 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dull active:scale-[0.98]'
                  }`}
              >
                {isProcessing ? (
                  <>
                    <svg className='animate-spin h-5 w-5' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                    </svg>
                    <span>Processando...</span>
                  </>
                ) : !hasAddress() ? (
                  <span>Adicione um endereço</span>
                ) : !selectedShipping ? (
                  <span>Calcule o frete acima</span>
                ) : (
                  <>
                    {getPaymentButtonIcon()}
                    <span>{getPaymentButtonText()}</span>
                  </>
                )}
              </button>

              {/* Login prompt para guests */}
              {!user && hasAddress() && (
                <div className='mt-4 text-center'>
                  <p className='text-sm text-gray-500 mb-2'>Já tem conta?</p>
                  <button
                    onClick={() => setShowUserLogin(true)}
                    className='text-primary font-medium hover:underline flex items-center justify-center gap-1 mx-auto'
                  >
                    <User className='w-4 h-4' />
                    Fazer login
                  </button>
                </div>
              )}

              {/* Trust Badges */}
              <div className='mt-6 pt-4 border-t border-gray-200'>
                <div className='flex items-center justify-center gap-4 text-xs text-gray-500'>
                  <div className='flex items-center gap-1'>
                    <Shield className='w-4 h-4 text-green-500' />
                    <span>Compra Segura</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Truck className='w-4 h-4 text-blue-500' />
                    <span>Entrega em todo Brasil</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;