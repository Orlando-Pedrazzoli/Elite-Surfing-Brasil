import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Search,
  TrendingUp,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Eye,
  Trash2,
  ChevronDown,
  RefreshCw,
  Building2,
  User,
  Package,
  DollarSign,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import NovoRomaneio from './NovoRomaneio';
import RomaneioImpressao from './RomaneioImpressao';

const statusConfig = {
  Rascunho: { label: 'Rascunho', color: 'gray', icon: Clock },
  Confirmado: { label: 'Confirmado', color: 'blue', icon: CheckCircle },
  Faturado: { label: 'Faturado', color: 'green', icon: FileText },
  Cancelado: { label: 'Cancelado', color: 'red', icon: XCircle },
};

const badgeCls = {
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

const VendasDiretas = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const [romaneios, setRomaneios] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    rascunhos: 0,
    confirmados: 0,
    faturados: 0,
    cancelados: 0,
    receitaMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState('all');
  const [busca, setBusca] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [editandoRomaneio, setEditandoRomaneio] = useState(null);
  const [acaoId, setAcaoId] = useState(null);
  const [imprimirId, setImprimirId] = useState(null);

  const fetchTudo = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFiltro !== 'all') params.append('status', statusFiltro);
      if (busca.trim()) params.append('q', busca);

      const [romRes, statsRes] = await Promise.all([
        axios.get(`/api/romaneios?${params}`),
        axios.get('/api/romaneios/stats'),
      ]);

      if (romRes.data.success) setRomaneios(romRes.data.romaneios);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [statusFiltro, busca]);

  useEffect(() => {
    fetchTudo();
  }, [fetchTudo]);

  const confirmar = async id => {
    if (
      !window.confirm(
        'Confirmar este pedido?\n\nO estoque será decrementado automaticamente.',
      )
    )
      return;
    setAcaoId(id);
    try {
      const { data } = await axios.put(`/api/romaneios/${id}/confirmar`);
      if (data.success) {
        toast.success(data.message);
        fetchTudo();
      } else {
        toast.error(data.message);
        if (data.erros) data.erros.forEach(e => toast.error(e));
      }
    } catch {
      toast.error('Erro ao confirmar');
    } finally {
      setAcaoId(null);
    }
  };

  const cancelar = async id => {
    if (
      !window.confirm(
        'Cancelar este pedido?\n\nSe o estoque foi decrementado, será restaurado.',
      )
    )
      return;
    setAcaoId(id);
    try {
      const { data } = await axios.put(`/api/romaneios/${id}/cancelar`);
      if (data.success) {
        toast.success(data.message);
        fetchTudo();
      } else toast.error(data.message);
    } catch {
      toast.error('Erro ao cancelar');
    } finally {
      setAcaoId(null);
    }
  };

  const faturar = async id => {
    if (!window.confirm('Marcar como Faturado?')) return;
    setAcaoId(id);
    try {
      const { data } = await axios.put(`/api/romaneios/${id}/faturar`);
      if (data.success) {
        toast.success(data.message);
        fetchTudo();
      } else toast.error(data.message);
    } catch {
      toast.error('Erro ao faturar');
    } finally {
      setAcaoId(null);
    }
  };

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
    });

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Vendas Diretas</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Romaneios para lojas e clientes presenciais
            </p>
          </div>
          <div className='flex gap-3'>
            <button
              onClick={fetchTudo}
              className='flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors shadow-sm text-sm'
            >
              <RefreshCw className='w-4 h-4' />
              Atualizar
            </button>
            <button
              onClick={() => {
                setEditandoRomaneio(null);
                setNovoOpen(true);
              }}
              className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
            >
              <Plus className='w-5 h-5' />
              Novo Pedido
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8'>
          {[
            {
              label: 'Total',
              value: stats.total,
              icon: ClipboardList,
              color: 'gray',
            },
            {
              label: 'Rascunhos',
              value: stats.rascunhos,
              icon: Clock,
              color: 'gray',
            },
            {
              label: 'Confirmados',
              value: stats.confirmados,
              icon: CheckCircle,
              color: 'blue',
            },
            {
              label: 'Faturados',
              value: stats.faturados,
              icon: FileText,
              color: 'green',
            },
            {
              label: 'Cancelados',
              value: stats.cancelados,
              icon: XCircle,
              color: 'red',
            },
            {
              label: 'Receita Mês',
              value: formatCurrency(stats.receitaMes),
              icon: TrendingUp,
              color: 'green',
              isValue: true,
            },
          ].map(s => (
            <div
              key={s.label}
              className={`bg-white border rounded-xl p-4 border-gray-200`}
            >
              <div className='flex items-center gap-2 mb-2'>
                <div
                  className={`w-8 h-8 bg-${s.color}-50 rounded-lg flex items-center justify-center`}
                >
                  <s.icon className={`w-4 h-4 text-${s.color}-600`} />
                </div>
                <span className='text-xs text-gray-500'>{s.label}</span>
              </div>
              <p
                className={`font-bold text-gray-900 ${s.isValue ? 'text-sm' : 'text-2xl'}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className='bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-3'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder='Buscar por cliente ou CNPJ/CPF...'
              className='w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-primary outline-none'
            />
          </div>
          <div className='flex gap-2 flex-wrap'>
            {['all', 'Rascunho', 'Confirmado', 'Faturado', 'Cancelado'].map(
              s => (
                <button
                  key={s}
                  onClick={() => setStatusFiltro(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${statusFiltro === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {s === 'all' ? 'Todos' : s}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className='flex justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-primary' />
          </div>
        ) : romaneios.length === 0 ? (
          <div className='bg-white border border-gray-200 rounded-xl p-12 text-center'>
            <ClipboardList className='w-12 h-12 text-gray-300 mx-auto mb-3' />
            <p className='text-gray-500 mb-4'>Nenhum pedido encontrado</p>
            <button
              onClick={() => {
                setEditandoRomaneio(null);
                setNovoOpen(true);
              }}
              className='px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm'
            >
              Criar primeiro pedido
            </button>
          </div>
        ) : (
          <div className='space-y-3'>
            {romaneios.map(r => {
              const sc = statusConfig[r.status] || statusConfig.Rascunho;
              const StatusIcon = sc.icon;
              const isLoading = acaoId === r._id;

              return (
                <div
                  key={r._id}
                  className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${r.status === 'Cancelado' ? 'opacity-60' : 'border-gray-200'}`}
                >
                  {/* Header do card */}
                  <div className='p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${badgeCls[sc.color]}`}
                      >
                        <StatusIcon className='w-5 h-5' />
                      </div>
                      <div>
                        <p className='font-bold text-gray-900'>
                          Pedido #{r.numero}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3 flex-wrap'>
                      {/* Badge tipo cliente */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.clienteTipo === 'PJ' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}
                      >
                        {r.clienteTipo === 'PJ' ? (
                          <Building2 className='w-3 h-3 inline mr-1' />
                        ) : (
                          <User className='w-3 h-3 inline mr-1' />
                        )}
                        {r.clienteTipo}
                      </span>

                      {/* Status badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badgeCls[sc.color]}`}
                      >
                        {sc.label}
                      </span>

                      {/* Ações */}
                      {r.status === 'Rascunho' && (
                        <button
                          onClick={() => {
                            setEditandoRomaneio(r);
                            setNovoOpen(true);
                          }}
                          className='px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1'
                        >
                          <Eye className='w-3.5 h-3.5' /> Editar
                        </button>
                      )}
                      {/* ── Botão Imprimir — sempre visível ── */}
                      <button
                        onClick={() => setImprimirId(r._id)}
                        className='px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1'
                      >
                        <Printer className='w-3.5 h-3.5' /> Imprimir
                      </button>
                      {r.status === 'Rascunho' && (
                        <button
                          onClick={() => confirmar(r._id)}
                          disabled={isLoading}
                          className='px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1 disabled:opacity-50'
                        >
                          {isLoading ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : (
                            <CheckCircle className='w-3.5 h-3.5' />
                          )}
                          Confirmar
                        </button>
                      )}
                      {r.status === 'Confirmado' && (
                        <button
                          onClick={() => faturar(r._id)}
                          disabled={isLoading}
                          className='px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-1 disabled:opacity-50'
                        >
                          {isLoading ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : (
                            <FileText className='w-3.5 h-3.5' />
                          )}
                          Faturar
                        </button>
                      )}
                      {(r.status === 'Rascunho' ||
                        r.status === 'Confirmado') && (
                        <button
                          onClick={() => cancelar(r._id)}
                          disabled={isLoading}
                          className='px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 disabled:opacity-50'
                        >
                          <XCircle className='w-3.5 h-3.5' /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Corpo do card */}
                  <div className='p-4 flex flex-col md:flex-row gap-4'>
                    {/* Cliente */}
                    <div className='flex-1'>
                      <p className='text-xs text-gray-400 font-medium mb-1'>
                        CLIENTE
                      </p>
                      <p className='font-semibold text-gray-900'>
                        {r.clienteNome}
                      </p>
                      {r.clienteCpfCnpj && (
                        <p className='text-xs text-gray-500'>
                          {r.clienteCpfCnpj}
                        </p>
                      )}
                      {r.clienteEmail && (
                        <p className='text-xs text-gray-400'>
                          {r.clienteEmail}
                        </p>
                      )}
                    </div>

                    {/* Itens */}
                    <div className='flex-1'>
                      <p className='text-xs text-gray-400 font-medium mb-1'>
                        ITENS
                      </p>
                      <p className='text-sm text-gray-700'>
                        {r.itens.length} produto(s) ·{' '}
                        {r.itens.reduce((s, i) => s + i.quantidade, 0)} unidades
                      </p>
                      <p className='text-xs text-gray-400 truncate'>
                        {r.itens
                          .slice(0, 2)
                          .map(i => i.nome)
                          .join(', ')}
                        {r.itens.length > 2 ? ` +${r.itens.length - 2}` : ''}
                      </p>
                    </div>

                    {/* Pagamento */}
                    <div className='flex-1'>
                      <p className='text-xs text-gray-400 font-medium mb-1'>
                        PAGAMENTO
                      </p>
                      <p className='text-sm text-gray-700'>
                        {r.condicaoPagamento || 'À Vista'}
                      </p>
                      {r.parcelas?.length > 0 && (
                        <p className='text-xs text-gray-400'>
                          {r.parcelas.length} parcela(s)
                        </p>
                      )}
                    </div>

                    {/* Total */}
                    <div className='text-right'>
                      <p className='text-xs text-gray-400 font-medium mb-1'>
                        TOTAL
                      </p>
                      <p className='text-xl font-bold text-gray-900'>
                        {formatCurrency(r.totalVenda)}
                      </p>
                      {r.estoqueDecrementado && (
                        <span className='text-xs text-green-600 font-medium'>
                          ✅ Estoque baixado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Romaneio */}
      {novoOpen && (
        <NovoRomaneio
          isOpen={novoOpen}
          onClose={() => {
            setNovoOpen(false);
            setEditandoRomaneio(null);
          }}
          onSaved={() => {
            fetchTudo();
            setNovoOpen(false);
            setEditandoRomaneio(null);
          }}
          romaneioEditando={editandoRomaneio}
        />
      )}

      {/* Modal Impressão */}
      {imprimirId && (
        <RomaneioImpressao
          romaneioId={imprimirId}
          onClose={() => setImprimirId(null)}
        />
      )}
    </div>
  );
};

export default VendasDiretas;
