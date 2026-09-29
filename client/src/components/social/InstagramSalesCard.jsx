// client/src/components/social/InstagramSalesCard.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📊 CARD DO DASHBOARD — "quanto o Instagram vendeu" no período
// ═══════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatBRL, formatPct } from '../../utils/pricingUtils';
import { typeLabel } from '../../utils/socialUtils';

/**
 * @param {number} year  ano do período do Dashboard
 * @param {number} month mês (0–11)
 */
const InstagramSalesCard = ({ year, month }) => {
  const { axios } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);
    axios
      .get('/api/social/analytics', { params: { from, to } })
      .then(({ data: d }) => setData(d.success ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [axios, year, month]);

  const t = data?.totals;
  const top = data?.topBySales?.[0];

  return (
    <div className='bg-white border border-pink-200 rounded-xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Instagram className='w-5 h-5 text-pink-600' />
          <h2 className='text-base font-semibold text-gray-900'>Instagram → vendas</h2>
        </div>
        <Link
          to='/seller/instagram/analytics'
          className='text-xs font-medium text-pink-700 hover:underline flex items-center gap-1'
        >
          Ver análise <ArrowRight className='w-3 h-3' />
        </Link>
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Carregando...</p>
      ) : !data ? (
        <p className='text-sm text-gray-400'>Sem dados.</p>
      ) : (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            <div>
              <p className='text-xs text-gray-500'>Pedidos por post</p>
              <p className='text-xl font-bold text-gray-900 tabular-nums'>{t.orders}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Receita por post</p>
              <p className='text-xl font-bold text-emerald-700 tabular-nums'>{formatBRL(t.revenue)}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Lucro bruto atrib.</p>
              <p className='text-xl font-bold text-gray-900 tabular-nums'>{formatBRL(t.grossProfit)}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Saves + envios / alcance</p>
              <p className='text-xl font-bold text-gray-900 tabular-nums'>
                {t.engagementRate === null ? '—' : formatPct(t.engagementRate)}
              </p>
            </div>
          </div>

          <div className='mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2'>
            <span>
              {t.posts} publicado{t.posts !== 1 ? 's' : ''} no período ·{' '}
              {data.instagramAll.orders} pedido{data.instagramAll.orders !== 1 ? 's' : ''} com
              origem Instagram ({formatBRL(data.instagramAll.revenue)})
            </span>
            {top && (
              <Link
                to={`/seller/instagram?post=${top._id}`}
                className='text-pink-700 hover:underline truncate max-w-full'
                title={top.hook}
              >
                Top: {typeLabel(top.type)} "{(top.hook || '').slice(0, 40)}…" · {formatBRL(top.sales.revenue)}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InstagramSalesCard;
