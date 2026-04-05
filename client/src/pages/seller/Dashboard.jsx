import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
  ChevronLeft,
  Box,
  BarChart3,
  Eye,
  CreditCard,
  QrCode,
  FileText,
  MapPin,
  Receipt,
  Award,
  RefreshCw,
  Calendar,
} from 'lucide-react';

const Dashboard = () => {
  const { axios, isSeller } = useAppContext();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allProductsForAlerts, setAllProductsForAlerts] = useState([]);

  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const isCurrentMonth =
    selectedPeriod.year === now.getFullYear() &&
    selectedPeriod.month === now.getMonth();

  const goToPreviousMonth = () => {
    setSelectedPeriod(prev =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 },
    );
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedPeriod(prev =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 },
    );
  };

  const goToCurrentMonth = () => {
    setSelectedPeriod({ year: now.getFullYear(), month: now.getMonth() });
  };

  const selectedMonthLabel = new Date(
    selectedPeriod.year,
    selectedPeriod.month,
  ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const selectedMonthShort = new Date(
    selectedPeriod.year,
    selectedPeriod.month,
  ).toLocaleDateString('pt-BR', { month: 'short' });

  // Pedidos filtrados pelo periodo
  const periodOrders = useMemo(() => {
    const start = new Date(selectedPeriod.year, selectedPeriod.month, 1);
    const end = new Date(
      selectedPeriod.year,
      selectedPeriod.month + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return allOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
  }, [allOrders, selectedPeriod]);

  const periodActiveOrders = useMemo(
    () =>
      periodOrders.filter(
        o => o.status !== 'Cancelado' && o.status !== 'Cancelled',
      ),
    [periodOrders],
  );

  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  const periodStats = useMemo(() => {
    const revenue = periodActiveOrders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0,
    );
    const count = periodActiveOrders.length;
    const pending = periodOrders.filter(o =>
      [
        'Pedido Confirmado',
        'Order Placed',
        'Processing',
        'Aguardando Pagamento',
        'Aguardando Pagamento PIX',
      ].includes(o.status),
    );
    return {
      totalOrders: periodOrders.length,
      pendingOrders: pending.length,
      monthRevenue: revenue,
      monthOrders: count,
      avgTicket: count > 0 ? revenue / count : 0,
    };
  }, [periodOrders, periodActiveOrders]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, productsRes] = await Promise.all([
        axios.get('/api/order/seller'),
        axios.get('/api/product/list?all=true'),
      ]);
      if (!ordersRes.data.success)
        throw new Error(ordersRes.data.message || 'Erro ao carregar pedidos');
      setAllOrders(ordersRes.data.orders || []);
      const allProducts = productsRes.data.success
        ? productsRes.data.products
        : [];
      setProductStats({
        totalProducts: allProducts.length,
        activeProducts: allProducts.filter(p => p.inStock).length,
        outOfStock: allProducts.filter(p => !p.inStock || p.stock === 0).length,
        lowStock: allProducts.filter(p => p.stock > 0 && p.stock <= 5).length,
      });
      setAllProductsForAlerts(allProducts);
    } catch (err) {
      console.error('Dashboard error:', err);
      if (err.response?.status === 401)
        setError('Sessão expirada. Faça login novamente.');
      else if (err.response?.status >= 500)
        setError('Erro no servidor. Tente novamente em instantes.');
      else if (!navigator.onLine) setError('Sem conexão com a internet.');
      else setError(err.message || 'Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    if (isSeller) fetchDashboardData();
  }, [isSeller, fetchDashboardData]);

  const canGoBack = useMemo(() => {
    if (allOrders.length === 0) return false;
    const oldest = new Date(
      Math.min(...allOrders.map(o => new Date(o.createdAt))),
    );
    const prev =
      selectedPeriod.month === 0
        ? { year: selectedPeriod.year - 1, month: 11 }
        : { year: selectedPeriod.year, month: selectedPeriod.month - 1 };
    return (
      new Date(prev.year, prev.month, 1) >=
      new Date(oldest.getFullYear(), oldest.getMonth(), 1)
    );
  }, [allOrders, selectedPeriod]);

  const formatCurrency = v =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(v);
  const formatDate = d =>
    new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusMapping = {
    'Aguardando Pagamento PIX': 'Aguardando Pagamento',
    'Order Placed': 'Pedido Confirmado',
    Processing: 'Pedido Confirmado',
    Shipped: 'Enviado',
    'Out for Delivery': 'Enviado',
    Delivered: 'Entregue',
    Cancelled: 'Cancelado',
  };

  const ordersByStatus = useMemo(() => {
    const map = {
      'Aguardando Pagamento': {
        count: 0,
        color: 'bg-amber-500',
        label: 'Aguardando',
      },
      'Pedido Confirmado': {
        count: 0,
        color: 'bg-blue-500',
        label: 'Confirmado',
      },
      Enviado: { count: 0, color: 'bg-purple-500', label: 'Enviado' },
      Entregue: { count: 0, color: 'bg-green-500', label: 'Entregue' },
      Cancelado: { count: 0, color: 'bg-red-500', label: 'Cancelado' },
    };
    periodOrders.forEach(o => {
      const m = statusMapping[o.status] || o.status;
      if (map[m]) map[m].count++;
    });
    return Object.entries(map).map(([k, v]) => ({ status: k, ...v }));
  }, [periodOrders]);

  const revenueByPayment = useMemo(() => {
    const m = {
      pix_manual: {
        label: 'PIX',
        amount: 0,
        count: 0,
        icon: QrCode,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      pagarme_card: {
        label: 'Cartão',
        amount: 0,
        count: 0,
        icon: CreditCard,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      pagarme_boleto: {
        label: 'Boleto',
        amount: 0,
        count: 0,
        icon: FileText,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
    };
    periodActiveOrders.forEach(o => {
      const t = o.paymentType || 'unknown';
      if (m[t]) {
        m[t].amount += o.amount || 0;
        m[t].count++;
      }
    });
    return Object.values(m);
  }, [periodActiveOrders]);

  const topProducts = useMemo(() => {
    const s = {};
    periodActiveOrders.forEach(o => {
      o.items?.forEach(item => {
        const p = item.product;
        if (!p) return;
        const id = p._id || p,
          name = p.name || 'Produto',
          image = p.image?.[0] || '',
          price = item.price || p.offerPrice || 0;
        if (!s[id]) s[id] = { name, image, quantity: 0, revenue: 0 };
        s[id].quantity += item.quantity || 1;
        s[id].revenue += price * (item.quantity || 1);
      });
    });
    return Object.entries(s)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [periodActiveOrders]);

  const recentOrders = useMemo(
    () =>
      [...periodOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10),
    [periodOrders],
  );

  const getStatusColor = s =>
    ({
      'Aguardando Pagamento': 'bg-amber-100 text-amber-700',
      'Pedido Confirmado': 'bg-blue-100 text-blue-700',
      Enviado: 'bg-purple-100 text-purple-700',
      Entregue: 'bg-green-100 text-green-700',
      Cancelado: 'bg-red-100 text-red-700',
      'Aguardando Pagamento PIX': 'bg-amber-100 text-amber-700',
      'Order Placed': 'bg-blue-100 text-blue-700',
      Processing: 'bg-blue-100 text-blue-700',
      Shipped: 'bg-purple-100 text-purple-700',
      'Out for Delivery': 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
      Cancelled: 'bg-red-100 text-red-700',
    })[s] || 'bg-gray-100 text-gray-700';

  const getStatusLabel = s =>
    ({
      'Aguardando Pagamento': 'Aguardando',
      'Pedido Confirmado': 'Confirmado',
      Enviado: 'Enviado',
      Entregue: 'Entregue',
      Cancelado: 'Cancelado',
      'Aguardando Pagamento PIX': 'Aguardando',
      'Order Placed': 'Confirmado',
      Processing: 'Confirmado',
      Shipped: 'Enviado',
      'Out for Delivery': 'Enviado',
      Delivered: 'Entregue',
      Cancelled: 'Cancelado',
    })[s] || s;

  const getPaymentLabel = t =>
    ({ pix_manual: 'PIX', pagarme_card: 'Cartao', pagarme_boleto: 'Boleto' })[
      t
    ] ||
    t ||
    '—';
  const getPaymentBadgeColor = t =>
    ({
      pix_manual: 'bg-green-50 text-green-700',
      pagarme_card: 'bg-blue-50 text-blue-700',
      pagarme_boleto: 'bg-amber-50 text-amber-700',
    })[t] || 'bg-gray-50 text-gray-700';

  const lowStockProducts = allProductsForAlerts
    .filter(p => p.stock > 0 && p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const outOfStockProducts = allProductsForAlerts
    .filter(p => !p.inStock || p.stock === 0)
    .slice(0, 4);

  if (loading)
    return (
      <div className='flex-1 flex items-center justify-center h-[80vh]'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
      </div>
    );

  if (error)
    return (
      <div className='flex-1 flex items-center justify-center h-[80vh]'>
        <div className='text-center max-w-sm'>
          <div className='w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4'>
            <AlertTriangle className='w-8 h-8 text-red-500' />
          </div>
          <h2 className='text-lg font-semibold text-gray-900 mb-2'>
            Erro ao carregar
          </h2>
          <p className='text-sm text-gray-500 mb-6'>{error}</p>
          <button
            onClick={fetchDashboardData}
            className='inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors'
          >
            <RefreshCw className='w-4 h-4' /> Tentar novamente
          </button>
        </div>
      </div>
    );

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto'>
      <div className='p-6 md:p-8 max-w-7xl mx-auto space-y-8'>
        {/* HEADER + SELETOR DE MÊS */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Visao geral da sua loja Elite Surfing Brasil
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden'>
              <button
                onClick={goToPreviousMonth}
                disabled={!canGoBack}
                className='p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-gray-100'
              >
                <ChevronLeft className='w-4 h-4 text-gray-600' />
              </button>
              <button
                onClick={goToCurrentMonth}
                className='flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors min-w-[180px] justify-center'
              >
                <Calendar className='w-4 h-4 text-gray-400' />
                <span className='text-sm font-medium text-gray-800 capitalize'>
                  {selectedMonthLabel}
                </span>
              </button>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className='p-2.5 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-l border-gray-100'
              >
                <ChevronRight className='w-4 h-4 text-gray-600' />
              </button>
            </div>
            {!isCurrentMonth && (
              <button
                onClick={goToCurrentMonth}
                className='text-xs text-primary hover:text-primary/80 font-medium px-3 py-2 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors whitespace-nowrap'
              >
                Mês atual
              </button>
            )}
          </div>
        </div>

        {/* STATS CARDS */}
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center'>
                <Package className='w-5 h-5 text-blue-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>
                PRODUTOS
              </span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {productStats.activeProducts}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              {productStats.totalProducts} total · {productStats.outOfStock}{' '}
              esgotados
            </p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center'>
                <Clock className='w-5 h-5 text-amber-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>
                PENDENTES
              </span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {periodStats.pendingOrders}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              {periodStats.totalOrders} pedidos no período
            </p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${productStats.lowStock > 0 ? 'bg-red-50' : 'bg-green-50'}`}
              >
                <AlertTriangle
                  className={`w-5 h-5 ${productStats.lowStock > 0 ? 'text-red-500' : 'text-green-500'}`}
                />
              </div>
              <span className='text-xs font-medium text-gray-400'>
                ESTOQUE BAIXO
              </span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {productStats.lowStock}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              Produtos com 5 un. ou menos
            </p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center'>
                <TrendingUp className='w-5 h-5 text-green-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>RECEITA</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(periodStats.monthRevenue)}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              {periodStats.monthOrders} pedidos em{' '}
              <span className='capitalize'>{selectedMonthShort}</span>
            </p>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center'>
                <Receipt className='w-5 h-5 text-purple-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>
                TICKET MEDIO
              </span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(periodStats.avgTicket)}
            </p>
            <p className='text-xs text-gray-500 mt-1'>Valor medio por pedido</p>
          </div>
        </div>

        {/* STATUS + PAGAMENTO */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='bg-white border border-gray-200 rounded-xl p-5'>
            <div className='flex items-center gap-2 mb-4'>
              <BarChart3 className='w-5 h-5 text-gray-400' />
              <h2 className='text-base font-semibold text-gray-900'>
                Pedidos por Status
              </h2>
            </div>
            <div className='space-y-3'>
              {ordersByStatus.map(item => {
                const pct = Math.round(
                  (item.count / (periodOrders.length || 1)) * 100,
                );
                return (
                  <div key={item.status} className='flex items-center gap-3'>
                    <span className='text-sm text-gray-600 w-24 flex-shrink-0'>
                      {item.label}
                    </span>
                    <div className='flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden'>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className='text-sm font-semibold text-gray-700 w-12 text-right'>
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className='bg-white border border-gray-200 rounded-xl p-5'>
            <div className='flex items-center gap-2 mb-4'>
              <CreditCard className='w-5 h-5 text-gray-400' />
              <h2 className='text-base font-semibold text-gray-900'>
                Receita por Pagamento (
                <span className='capitalize'>{selectedMonthShort}</span>)
              </h2>
            </div>
            <div className='space-y-3'>
              {revenueByPayment.map(method => {
                const Icon = method.icon;
                const pct = Math.round(
                  (method.amount / (periodStats.monthRevenue || 1)) * 100,
                );
                return (
                  <div
                    key={method.label}
                    className='flex items-center gap-3 p-3 rounded-lg bg-gray-50'
                  >
                    <div
                      className={`w-10 h-10 ${method.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-5 h-5 ${method.color}`} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium text-gray-800'>
                          {method.label}
                        </span>
                        <span className='text-sm font-bold text-gray-900'>
                          {formatCurrency(method.amount)}
                        </span>
                      </div>
                      <div className='flex items-center justify-between mt-1'>
                        <span className='text-xs text-gray-500'>
                          {method.count} pedidos
                        </span>
                        <span className='text-xs text-gray-500'>
                          {pct || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PEDIDOS + TOP + ESTOQUE */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2 bg-white border border-gray-200 rounded-xl'>
            <div className='flex items-center justify-between p-5 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                <ShoppingCart className='w-5 h-5 text-gray-400' />
                <h2 className='text-base font-semibold text-gray-900'>
                  Pedidos Recentes
                </h2>
              </div>
              <Link
                to='/seller/orders'
                className='text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1'
              >
                Ver todos <ChevronRight className='w-4 h-4' />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className='p-8 text-center text-gray-400'>
                <ShoppingCart className='w-10 h-10 mx-auto mb-3 opacity-40' />
                <p className='text-sm'>
                  Nenhum pedido em{' '}
                  <span className='capitalize'>{selectedMonthLabel}</span>
                </p>
              </div>
            ) : (
              <div className='divide-y divide-gray-50'>
                {recentOrders.map(order => (
                  <div
                    key={order._id}
                    className='flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors'
                  >
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                      <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Box className='w-4 h-4 text-gray-400' />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {order.address?.firstName ||
                              order.guestName ||
                              'Cliente'}{' '}
                            {order.address?.lastName || ''}
                          </p>
                          {order.isGuestOrder && (
                            <span className='text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium flex-shrink-0'>
                              Guest
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='text-xs text-gray-400'>
                            {formatDate(order.createdAt)}
                          </span>
                          {order.address?.city && (
                            <span className='text-xs text-gray-400 flex items-center gap-0.5'>
                              <MapPin className='w-3 h-3' />
                              {order.address.city}/{order.address.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPaymentBadgeColor(order.paymentType)}`}
                      >
                        {getPaymentLabel(order.paymentType)}
                      </span>
                      <span className='text-sm font-semibold text-gray-900 w-20 text-right'>
                        {formatCurrency(order.amount)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='space-y-6'>
            <div className='bg-white border border-gray-200 rounded-xl'>
              <div className='flex items-center justify-between p-5 border-b border-gray-100'>
                <div className='flex items-center gap-2'>
                  <Award className='w-5 h-5 text-amber-500' />
                  <h2 className='text-base font-semibold text-gray-900'>
                    Top Vendidos (
                    <span className='capitalize'>{selectedMonthShort}</span>)
                  </h2>
                </div>
              </div>
              {topProducts.length === 0 ? (
                <div className='p-6 text-center text-gray-400'>
                  <Award className='w-8 h-8 mx-auto mb-2 opacity-40' />
                  <p className='text-sm'>Sem vendas neste período</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {topProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className='flex items-center gap-3 p-3 px-5 hover:bg-gray-50/50 transition-colors'
                    >
                      <span className='text-sm font-bold text-gray-300 w-5 text-center flex-shrink-0'>
                        {index + 1}
                      </span>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className='w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0'
                        />
                      ) : (
                        <div className='w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0'>
                          <Package className='w-4 h-4 text-gray-400' />
                        </div>
                      )}
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-medium text-gray-800 truncate'>
                          {product.name}
                        </p>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='text-xs text-gray-500'>
                            {product.quantity} un.
                          </span>
                          <span className='text-xs font-medium text-green-600'>
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='bg-white border border-gray-200 rounded-xl'>
              <div className='flex items-center justify-between p-5 border-b border-gray-100'>
                <div className='flex items-center gap-2'>
                  <AlertTriangle className='w-5 h-5 text-amber-500' />
                  <h2 className='text-base font-semibold text-gray-900'>
                    Alertas de Estoque
                  </h2>
                </div>
                <Link
                  to='/seller/product-list'
                  className='text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1'
                >
                  Gerir <ChevronRight className='w-4 h-4' />
                </Link>
              </div>
              {lowStockProducts.length === 0 &&
              outOfStockProducts.length === 0 ? (
                <div className='p-6 text-center text-gray-400'>
                  <Package className='w-8 h-8 mx-auto mb-2 opacity-40' />
                  <p className='text-sm'>Estoque em dia!</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {lowStockProducts.map(product => (
                    <div
                      key={product._id}
                      className='flex items-center gap-3 p-3 px-5 hover:bg-gray-50/50 transition-colors'
                    >
                      <img
                        src={product.image?.[0]}
                        alt={product.name}
                        className='w-10 h-10 rounded-lg object-cover border border-gray-100'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-medium text-gray-800 truncate'>
                          {product.name}
                        </p>
                        <div className='flex items-center gap-2 mt-0.5'>
                          <span className='text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full'>
                            {product.stock} un.
                          </span>
                          {product.sku && (
                            <span className='text-xs text-gray-400 font-mono'>
                              {product.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {outOfStockProducts.map(product => (
                    <div
                      key={product._id}
                      className='flex items-center gap-3 p-3 px-5 hover:bg-gray-50/50 transition-colors opacity-60'
                    >
                      <img
                        src={product.image?.[0]}
                        alt={product.name}
                        className='w-10 h-10 rounded-lg object-cover border border-gray-100 grayscale'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-medium text-gray-800 truncate'>
                          {product.name}
                        </p>
                        <span className='text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full'>
                          Esgotado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
          <Link
            to='/seller/add-product'
            className='flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors'
          >
            <div className='w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center'>
              <Package className='w-4 h-4 text-primary' />
            </div>
            <span className='text-sm font-medium text-primary'>
              Novo Produto
            </span>
          </Link>
          <Link
            to='/seller/orders'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <ShoppingCart className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>
              Ver Pedidos
            </span>
          </Link>
          <Link
            to='/seller/product-list'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <BarChart3 className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>
              Gerir Produtos
            </span>
          </Link>
          <Link
            to='/seller/blog'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <FileText className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>
              Gerir Blog
            </span>
          </Link>
          <Link
            to='/'
            target='_blank'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <Eye className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>Ver Loja</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
