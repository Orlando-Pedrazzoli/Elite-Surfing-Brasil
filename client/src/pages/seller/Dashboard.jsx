import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
  Box,
  DollarSign,
  BarChart3,
  Eye,
} from 'lucide-react';

const Dashboard = () => {
  const { axios, products } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    monthRevenue: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [products]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar pedidos
      const { data } = await axios.get('/api/order/seller');
      const allOrders = data.success ? data.orders : [];
      setOrders(allOrders.slice(0, 8));

      // Calcular stats dos produtos
      const allProducts = products || [];
      const activeProducts = allProducts.filter(p => p.inStock);
      const outOfStock = allProducts.filter(p => !p.inStock || p.stock === 0);
      const lowStock = allProducts.filter(p => p.stock > 0 && p.stock <= 5);

      // Calcular receita do mês
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthOrders = allOrders.filter(
        o => new Date(o.createdAt) >= startOfMonth && o.status !== 'Cancelled'
      );
      const monthRevenue = monthOrders.reduce(
        (sum, o) => sum + (o.amount || 0),
        0
      );

      // Pedidos pendentes
      const pendingOrders = allOrders.filter(
        o => o.status === 'Order Placed' || o.status === 'Processing'
      );

      setStats({
        totalProducts: allProducts.length,
        activeProducts: activeProducts.length,
        outOfStock: outOfStock.length,
        lowStock: lowStock.length,
        totalOrders: allOrders.length,
        pendingOrders: pendingOrders.length,
        monthRevenue,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = status => {
    const colors = {
      'Order Placed': 'bg-blue-100 text-blue-700',
      Processing: 'bg-yellow-100 text-yellow-700',
      Shipped: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
      Cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = status => {
    const labels = {
      'Order Placed': 'Novo',
      Processing: 'Processando',
      Shipped: 'Enviado',
      Delivered: 'Entregue',
      Cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  // Produtos com estoque baixo
  const lowStockProducts = (products || [])
    .filter(p => p.stock > 0 && p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  // Produtos sem estoque
  const outOfStockProducts = (products || [])
    .filter(p => !p.inStock || p.stock === 0)
    .slice(0, 4);

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center h-[80vh]'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto'>
      <div className='p-6 md:p-8 max-w-7xl mx-auto space-y-8'>
        {/* Header */}
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Visão geral da sua loja Elite Surfing Brasil
          </p>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Produtos Ativos */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center'>
                <Package className='w-5 h-5 text-blue-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>PRODUTOS</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>{stats.activeProducts}</p>
            <p className='text-xs text-gray-500 mt-1'>
              {stats.totalProducts} total · {stats.outOfStock} esgotados
            </p>
          </div>

          {/* Pedidos Pendentes */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center'>
                <Clock className='w-5 h-5 text-amber-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>PENDENTES</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>{stats.pendingOrders}</p>
            <p className='text-xs text-gray-500 mt-1'>
              {stats.totalOrders} pedidos total
            </p>
          </div>

          {/* Estoque Baixo */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stats.lowStock > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  stats.lowStock > 0 ? 'text-red-500' : 'text-green-500'
                }`} />
              </div>
              <span className='text-xs font-medium text-gray-400'>ESTOQUE BAIXO</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>{stats.lowStock}</p>
            <p className='text-xs text-gray-500 mt-1'>
              Produtos com ≤ 5 unidades
            </p>
          </div>

          {/* Receita do Mês */}
          <div className='bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow'>
            <div className='flex items-center justify-between mb-3'>
              <div className='w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center'>
                <TrendingUp className='w-5 h-5 text-green-600' />
              </div>
              <span className='text-xs font-medium text-gray-400'>RECEITA MÊS</span>
            </div>
            <p className='text-2xl font-bold text-gray-900'>
              {formatCurrency(stats.monthRevenue)}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Pedidos Recentes (2/3) */}
          <div className='lg:col-span-2 bg-white border border-gray-200 rounded-xl'>
            <div className='flex items-center justify-between p-5 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                <ShoppingCart className='w-5 h-5 text-gray-400' />
                <h2 className='text-base font-semibold text-gray-900'>Pedidos Recentes</h2>
              </div>
              <Link
                to='/seller/orders'
                className='text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1'
              >
                Ver todos <ChevronRight className='w-4 h-4' />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className='p-8 text-center text-gray-400'>
                <ShoppingCart className='w-10 h-10 mx-auto mb-3 opacity-40' />
                <p className='text-sm'>Nenhum pedido ainda</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-50'>
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className='flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0'>
                        <Box className='w-4 h-4 text-gray-400' />
                      </div>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {order.address?.firstName || order.guestName || 'Cliente'}{' '}
                          {order.address?.lastName || ''}
                        </p>
                        <p className='text-xs text-gray-400'>
                          {formatDate(order.createdAt)} · {order.items?.length || 0} item(s)
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3 flex-shrink-0'>
                      <span className='text-sm font-semibold text-gray-900'>
                        {formatCurrency(order.amount)}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas de Estoque (1/3) */}
          <div className='bg-white border border-gray-200 rounded-xl'>
            <div className='flex items-center justify-between p-5 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='w-5 h-5 text-amber-500' />
                <h2 className='text-base font-semibold text-gray-900'>Alertas de Estoque</h2>
              </div>
              <Link
                to='/seller/product-list'
                className='text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1'
              >
                Gerir <ChevronRight className='w-4 h-4' />
              </Link>
            </div>

            {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
              <div className='p-8 text-center text-gray-400'>
                <Package className='w-10 h-10 mx-auto mb-3 opacity-40' />
                <p className='text-sm'>Estoque em dia!</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-50'>
                {/* Estoque Baixo */}
                {lowStockProducts.map((product) => (
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
                          <span className='text-xs text-gray-400 font-mono'>{product.sku}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Sem Estoque */}
                {outOfStockProducts.map((product) => (
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

        {/* Quick Actions */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          <Link
            to='/seller/add-product'
            className='flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors'
          >
            <div className='w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center'>
              <Package className='w-4 h-4 text-primary' />
            </div>
            <span className='text-sm font-medium text-primary'>Novo Produto</span>
          </Link>
          <Link
            to='/seller/orders'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <ShoppingCart className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>Ver Pedidos</span>
          </Link>
          <Link
            to='/seller/product-list'
            className='flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors'
          >
            <div className='w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center'>
              <BarChart3 className='w-4 h-4 text-gray-600' />
            </div>
            <span className='text-sm font-medium text-gray-700'>Gerir Produtos</span>
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