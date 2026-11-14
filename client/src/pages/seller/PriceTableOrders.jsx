// client/src/pages/seller/PriceTableOrders.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🧾 PEDIDOS GERADOS PELA TABELA DE LOJISTA (/seller/tabelas/pedidos)
// ═══════════════════════════════════════════════════════════════════════
// Lista dos pedidos/orçamentos que os vendedores montaram e enviaram aos
// lojistas: número, cliente, total, situação. Daqui abre, baixa o PDF,
// apaga ou começa um pedido novo.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Search,
  FileDown,
  Trash2,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatBRL } from '../../utils/priceTableEngine';
import { API, fmtDateTime, readBlobError } from '../../utils/priceTableUtils';
import {
  ORDER_API,
  ORDER_STATUS_META,
  downloadBlob,
  fetchOrderPdf,
  formatOrderNumber,
  orderableTables,
} from '../../utils/priceTableOrderUtils';
import OrderTablePicker from '../../components/priceTables/OrderTablePicker';

const STATUS_TABS = [
  { id: '', label: 'Todos' },
  ...Object.entries(ORDER_STATUS_META).map(([id, meta]) => ({
    id,
    label: meta.label,
  })),
];

const PriceTableOrders = () => {
  const { axios, navigate } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [picker, setPicker] = useState({ open: false, tables: [] });
  const [opening, setOpening] = useState(false);
  const timer = useRef(null);

  const fetchOrders = useCallback(
    async (nextStatus, nextQuery) => {
      try {
        const { data } = await axios.get(ORDER_API, {
          params: {
            status: nextStatus || undefined,
            q: nextQuery || undefined,
          },
        });
        if (data.success) setOrders(data.orders);
        else toast.error(data.message || 'Erro ao carregar os pedidos');
      } catch (err) {
        toast.error(
          err.response?.data?.message || 'Erro ao carregar os pedidos',
        );
      } finally {
        setLoading(false);
      }
    },
    [axios],
  );

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchOrders(status, query.trim()), 250);
    return () => clearTimeout(timer.current);
  }, [fetchOrders, status, query]);

  const openOrder = order =>
    navigate(`/seller/tabelas/${order.table}/pedido?pedido=${order._id}`);

  const newOrder = async () => {
    setOpening(true);
    try {
      const { data } = await axios.get(API);
      if (!data.success) throw new Error(data.message);
      const options = orderableTables(data.tables);
      if (options.length === 1)
        navigate(`/seller/tabelas/${options[0]._id}/pedido`);
      else setPicker({ open: true, tables: data.tables });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao carregar as tabelas');
    } finally {
      setOpening(false);
    }
  };

  const downloadPdf = async order => {
    setBusyId(order._id);
    try {
      const file = await fetchOrderPdf(axios, order, true);
      downloadBlob(file.blob, file.filename);
    } catch (err) {
      toast.error((await readBlobError(err)) || 'Não foi possível gerar o PDF');
    } finally {
      setBusyId(null);
    }
  };

  const deleteOrder = async order => {
    if (
      !window.confirm(
        `Apagar o pedido nº ${formatOrderNumber(order.number)}${order.customer?.name ? ` (${order.customer.name})` : ''}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setBusyId(order._id);
    try {
      const { data } = await axios.delete(`${ORDER_API}/${order._id}`);
      if (!data.success) throw new Error(data.message);
      setOrders(list => list.filter(o => o._id !== order._id));
      toast.success('Pedido apagado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Não foi possível apagar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-4 md:p-8 max-w-6xl mx-auto'>
        <Link
          to='/seller/tabelas'
          className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2'
        >
          <ArrowLeft className='w-4 h-4' />
          Tabelas de Preço
        </Link>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Pedidos de lojistas
            </h1>
            <p className='text-sm text-gray-500 mt-1'>
              Pedidos montados sobre a tabela de lojista e enviados ao cliente
              para conferir e confirmar
            </p>
          </div>
          <button
            type='button'
            onClick={newOrder}
            disabled={opening}
            className='flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 shadow-sm disabled:opacity-60'
          >
            {opening ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Plus className='w-5 h-5' />
            )}
            Novo pedido
          </button>
        </div>

        <div className='flex flex-col md:flex-row gap-3 mb-4'>
          <div className='relative flex-1'>
            <Search className='w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='search'
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Buscar por número, cliente, telefone ou email'
              className='w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
            />
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id || 'all'}
                type='button'
                onClick={() => setStatus(tab.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border ${
                  status === tab.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-24 text-gray-400'>
            <Loader2 className='w-6 h-6 animate-spin' />
          </div>
        ) : orders.length === 0 ? (
          <div className='bg-white rounded-2xl border border-gray-200 p-10 text-center'>
            <ClipboardList className='w-8 h-8 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-700 font-medium'>
              {query || status
                ? 'Nenhum pedido encontrado.'
                : 'Nenhum pedido ainda.'}
            </p>
            {!query && !status && (
              <p className='text-sm text-gray-500 mt-1'>
                Clique em “Novo pedido”, preencha as quantidades e envie ao
                cliente pelo WhatsApp ou email.
              </p>
            )}
          </div>
        ) : (
          <ul className='space-y-2'>
            {orders.map(order => {
              const meta =
                ORDER_STATUS_META[order.status] || ORDER_STATUS_META.rascunho;
              return (
                <li
                  key={order._id}
                  className='bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-3'
                >
                  <button
                    type='button'
                    onClick={() => openOrder(order)}
                    className='flex-1 min-w-0 text-left group'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-base font-bold text-gray-900 group-hover:text-primary'>
                        Nº {formatOrderNumber(order.number)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      <span className='text-sm text-gray-700 truncate'>
                        {order.customer?.name || (
                          <em className='text-gray-400 not-italic'>
                            sem cliente
                          </em>
                        )}
                      </span>
                    </div>
                    <p className='text-xs text-gray-500 mt-1'>
                      {fmtDateTime(order.createdAt)} · {order.tableName} ·{' '}
                      {order.itemCount}{' '}
                      {order.itemCount === 1 ? 'produto' : 'produtos'} ·{' '}
                      {order.totalQty} {order.totalQty === 1 ? 'peça' : 'peças'}
                      {order.lastSentAt &&
                        ` · enviado ${fmtDateTime(order.lastSentAt)}`}
                    </p>
                  </button>
                  <div className='flex items-center justify-between md:justify-end gap-3'>
                    <span className='text-lg font-bold text-primary whitespace-nowrap'>
                      {formatBRL(order.subtotal)}
                    </span>
                    <div className='flex items-center gap-1'>
                      <button
                        type='button'
                        onClick={() => downloadPdf(order)}
                        disabled={busyId === order._id}
                        title='Baixar PDF'
                        aria-label={`Baixar PDF do pedido ${formatOrderNumber(order.number)}`}
                        className='p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50'
                      >
                        {busyId === order._id ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <FileDown className='w-4 h-4' />
                        )}
                      </button>
                      <button
                        type='button'
                        onClick={() => deleteOrder(order)}
                        disabled={busyId === order._id}
                        title='Apagar'
                        aria-label={`Apagar o pedido ${formatOrderNumber(order.number)}`}
                        className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                      <button
                        type='button'
                        onClick={() => openOrder(order)}
                        className='flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90'
                      >
                        Abrir
                        <ArrowRight className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <OrderTablePicker
        open={picker.open}
        tables={picker.tables}
        onClose={() => setPicker(p => ({ ...p, open: false }))}
        onPick={table => navigate(`/seller/tabelas/${table._id}/pedido`)}
      />
    </div>
  );
};

export default PriceTableOrders;
