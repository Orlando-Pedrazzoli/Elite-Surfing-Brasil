// client/src/pages/seller/InstagramAnalytics.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS — alcance, saves + envios, vendas atribuídas por post
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { formatBRL, formatPct } from '../../utils/pricingUtils';
import { typeLabel, formatDateTime, POST_TYPES } from '../../utils/socialUtils';
import {
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  Eye,
  Bookmark,
  ExternalLink,
  Info,
} from 'lucide-react';

const PERIODS = [
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '12 meses' },
  { value: 0, label: 'Tudo' },
];

const num = v => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));

const Tile = ({ icon: Icon, label, value, hint, tone = 'gray' }) => {
  const tones = {
    gray: 'text-gray-900',
    green: 'text-emerald-700',
    pink: 'text-pink-700',
  };
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <div className='flex items-center gap-2 text-xs text-gray-500 mb-1'>
        {Icon && <Icon className='w-3.5 h-3.5' />} {label}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className='text-[11px] text-gray-400 mt-0.5'>{hint}</p>}
    </div>
  );
};

const InstagramAnalytics = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const [days, setDays] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState('publishedAt');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (days > 0) params.from = new Date(Date.now() - days * 86400000).toISOString();
      const { data: d } = await axios.get('/api/social/analytics', { params });
      if (d.success) setData(d);
      else toast.error(d.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  }, [axios, days]);

  useEffect(() => {
    load();
  }, [load]);

  const recompute = async () => {
    setRefreshing(true);
    try {
      const { data: d } = await axios.post('/api/social/analytics/recompute');
      if (d.success) {
        toast.success(
          `Vendas: ${d.sales?.orders ?? 0} pedidos · Insights: ${d.insights?.refreshed ?? 0} posts`,
        );
        await load();
      } else toast.error(d.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const rows = useMemo(() => {
    if (!data?.posts) return [];
    const list = [...data.posts];
    const by = {
      publishedAt: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
      reach: (a, b) => (b.metrics.reach || 0) - (a.metrics.reach || 0),
      engagement: (a, b) => (b.engagementRate || 0) - (a.engagementRate || 0),
      revenue: (a, b) => (b.sales.revenue || 0) - (a.sales.revenue || 0),
    };
    return list.sort(by[sort] || by.publishedAt);
  }, [data, sort]);

  const t = data?.totals;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='w-full md:p-8 p-4'>
        <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Instagram — Análise</h1>
            <p className='text-gray-500 mt-1'>O que alcança, o que é salvo e enviado, e o que vende</p>
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white'>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`px-3 py-2 text-xs font-medium ${
                    days === p.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={recompute}
              disabled={refreshing}
              className='px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50'
              title='Recalcula vendas atribuídas e busca insights na Meta'
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar dados
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className='py-20 text-center text-gray-400'>Carregando...</div>
        ) : (
          <>
            {/* Tiles */}
            <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6'>
              <Tile icon={Eye} label='Publicados' value={t.posts} hint={`${t.withMetrics} com insights`} />
              <Tile icon={Eye} label='Alcance total' value={num(t.reach)} />
              <Tile
                icon={Bookmark}
                label='Saves + envios / alcance'
                value={t.engagementRate === null ? '—' : formatPct(t.engagementRate)}
                hint='o sinal que mais espalha em 2026'
                tone='pink'
              />
              <Tile icon={ShoppingBag} label='Pedidos por post' value={t.orders} hint={`${t.units} unidades`} />
              <Tile icon={TrendingUp} label='Receita atribuída' value={formatBRL(t.revenue)} tone='green' />
              <Tile
                icon={TrendingUp}
                label='Lucro bruto atrib.'
                value={formatBRL(t.grossProfit)}
                hint='usa o custo atual do produto'
              />
            </div>

            <div className='mb-6 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex gap-2'>
              <Info className='w-4 h-4 flex-shrink-0 mt-0.5' />
              <span>
                Pedidos com origem Instagram no período (com ou sem post identificado):{' '}
                <strong>{data.instagramAll.orders}</strong> · {formatBRL(data.instagramAll.revenue)}. A
                atribuição usa o <code className='font-mono'>utm_content</code> dos links gerados no Estúdio;
                cliques pelo link da bio contam aqui mas não num post específico.
              </span>
            </div>

            {/* Por formato + tops */}
            <div className='grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6'>
              <div className='bg-white rounded-xl border border-gray-200 p-4'>
                <p className='text-sm font-semibold text-gray-800 mb-3'>Por formato</p>
                <table className='w-full text-xs'>
                  <thead className='text-gray-500'>
                    <tr>
                      <th className='text-left py-1'>Formato</th>
                      <th className='text-right py-1'>Posts</th>
                      <th className='text-right py-1'>Alcance</th>
                      <th className='text-right py-1'>S+E %</th>
                      <th className='text-right py-1'>Receita</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {POST_TYPES.map(pt => {
                      const r = data.byType.find(x => x.type === pt.value);
                      if (!r) return null;
                      return (
                        <tr key={pt.value}>
                          <td className='py-1.5 font-medium'>{pt.label}</td>
                          <td className='py-1.5 text-right tabular-nums'>{r.posts}</td>
                          <td className='py-1.5 text-right tabular-nums'>{num(r.reach)}</td>
                          <td className='py-1.5 text-right tabular-nums'>
                            {r.engagementRate === null ? '—' : formatPct(r.engagementRate)}
                          </td>
                          <td className='py-1.5 text-right tabular-nums'>{formatBRL(r.revenue)}</td>
                        </tr>
                      );
                    })}
                    {data.byType.length === 0 && (
                      <tr>
                        <td colSpan={5} className='py-4 text-center text-gray-400'>
                          Nada publicado no período
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <TopList
                title='Top vendas'
                rows={data.topBySales}
                render={r => formatBRL(r.sales.revenue)}
                onOpen={id => navigate(`/seller/instagram?post=${id}`)}
              />
              <TopList
                title='Top saves + envios'
                rows={data.topByEngagement}
                render={r => formatPct(r.engagementRate)}
                onOpen={id => navigate(`/seller/instagram?post=${id}`)}
              />
            </div>

            {/* Tabela de posts */}
            <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
              <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100'>
                <p className='text-sm font-semibold text-gray-800'>Todos os posts publicados</p>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className='text-xs py-1.5 px-2 rounded-lg border border-gray-300 bg-white'
                >
                  <option value='publishedAt'>Mais recentes</option>
                  <option value='reach'>Maior alcance</option>
                  <option value='engagement'>Maior saves + envios</option>
                  <option value='revenue'>Maior receita</option>
                </select>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-gray-50 text-xs text-gray-500'>
                    <tr>
                      <th className='text-left px-4 py-2'>Post</th>
                      <th className='text-right px-3 py-2'>Alcance</th>
                      <th className='text-right px-3 py-2'>Saves</th>
                      <th className='text-right px-3 py-2'>Envios</th>
                      <th className='text-right px-3 py-2'>Coment.</th>
                      <th className='text-right px-3 py-2'>S+E %</th>
                      <th className='text-right px-3 py-2'>Pedidos</th>
                      <th className='text-right px-3 py-2'>Receita</th>
                      <th className='text-right px-3 py-2'>Lucro</th>
                      <th className='px-3 py-2'></th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {rows.map(r => (
                      <tr key={r._id} className='hover:bg-gray-50'>
                        <td className='px-4 py-2'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex-shrink-0'>
                              {r.thumb && <img src={r.thumb} alt='' className='w-full h-full object-cover' />}
                            </div>
                            <div className='min-w-0'>
                              <p className='text-xs text-gray-900 line-clamp-1 max-w-[320px]'>{r.hook || '—'}</p>
                              <p className='text-[11px] text-gray-400'>
                                {typeLabel(r.type)} · {r.formula || '—'} · {formatDateTime(r.publishedAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className='px-3 py-2 text-right tabular-nums'>{num(r.metrics.reach)}</td>
                        <td className='px-3 py-2 text-right tabular-nums'>{num(r.metrics.saves)}</td>
                        <td className='px-3 py-2 text-right tabular-nums'>{num(r.metrics.shares)}</td>
                        <td className='px-3 py-2 text-right tabular-nums'>{num(r.metrics.comments)}</td>
                        <td className='px-3 py-2 text-right tabular-nums font-medium'>
                          {r.engagementRate === null ? '—' : formatPct(r.engagementRate)}
                        </td>
                        <td className='px-3 py-2 text-right tabular-nums'>{r.sales.orders || 0}</td>
                        <td className='px-3 py-2 text-right tabular-nums text-emerald-700 font-medium'>
                          {r.sales.revenue ? formatBRL(r.sales.revenue) : '—'}
                        </td>
                        <td className='px-3 py-2 text-right tabular-nums'>
                          {r.sales.grossProfit ? formatBRL(r.sales.grossProfit) : '—'}
                        </td>
                        <td className='px-3 py-2 text-right whitespace-nowrap'>
                          {r.igPermalink && (
                            <a
                              href={r.igPermalink}
                              target='_blank'
                              rel='noreferrer'
                              className='inline-flex p-1 text-pink-600 hover:bg-pink-50 rounded'
                              title='Ver no Instagram'
                            >
                              <ExternalLink className='w-4 h-4' />
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/seller/instagram?post=${r._id}`)}
                            className='text-xs text-blue-600 hover:underline ml-1'
                          >
                            abrir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className='py-10 text-center text-gray-400'>
                          Nenhum post publicado no período
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TopList = ({ title, rows, render, onOpen }) => (
  <div className='bg-white rounded-xl border border-gray-200 p-4'>
    <p className='text-sm font-semibold text-gray-800 mb-3'>{title}</p>
    {rows.length === 0 ? (
      <p className='text-xs text-gray-400'>Sem dados ainda</p>
    ) : (
      <ol className='space-y-2'>
        {rows.map((r, i) => (
          <li key={r._id}>
            <button
              onClick={() => onOpen(r._id)}
              className='w-full text-left flex items-center gap-2 group'
            >
              <span className='w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0'>
                {i + 1}
              </span>
              <span className='flex-1 min-w-0'>
                <span className='block text-xs text-gray-900 line-clamp-1 group-hover:underline'>
                  {r.hook || '—'}
                </span>
                <span className='block text-[10px] text-gray-400'>{typeLabel(r.type)}</span>
              </span>
              <span className='text-xs font-semibold tabular-nums text-gray-900'>{render(r)}</span>
            </button>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export default InstagramAnalytics;
