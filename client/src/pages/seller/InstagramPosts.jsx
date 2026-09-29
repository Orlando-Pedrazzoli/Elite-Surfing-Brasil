// client/src/pages/seller/InstagramPosts.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📚 HISTÓRICO — conteúdos gerados (rascunho, aprovado, publicado…)
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import {
  STATUS_META,
  POST_TYPES,
  typeLabel,
  goalLabel,
  formatDateTime,
  buildFinalCaption,
  copyToClipboard,
} from '../../utils/socialUtils';
import { Sparkles, Trash2, Copy, ExternalLink, Search, Plus, Instagram } from 'lucide-react';

const InstagramPosts = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/social/posts', { params: { limit: 200 } });
      if (data.success) {
        setPosts(data.posts || []);
        setCounts(data.statusCounts || {});
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter(p => {
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterType && p.type !== filterType) return false;
      if (q) {
        const hay = [
          p.caption,
          p.hook,
          p.formula,
          ...(p.hashtags || []),
          ...(p.products || []).map(x => x.name),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filterStatus, filterType, search]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      const { data } = await axios.delete(`/api/social/posts/${toDelete._id}`);
      if (data.success) {
        toast.success('Post apagado');
        setToDelete(null);
        await load();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao apagar');
    } finally {
      setIsDeleting(false);
    }
  };

  const total = posts.length;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='w-full md:p-8 p-4'>
        <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Conteúdos do Instagram</h1>
            <p className='text-gray-500 mt-1'>Tudo o que foi gerado no Estúdio</p>
          </div>
          <button
            onClick={() => navigate('/seller/instagram')}
            className='px-4 py-2 text-sm font-medium bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2'
          >
            <Plus className='w-4 h-4' /> Novo conteúdo
          </button>
        </div>

        {/* Status chips */}
        <div className='flex flex-wrap gap-2 mb-4'>
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              !filterStatus ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Todos ({total})
          </button>
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const n = counts[key] || 0;
            if (n === 0 && !['draft', 'approved'].includes(key)) return null;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filterStatus === key ? 'ring-2 ring-offset-1 ring-gray-900' : ''
                } ${meta.className}`}
              >
                {meta.label} ({n})
              </button>
            );
          })}
        </div>

        {/* Filtros */}
        <div className='bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col md:flex-row gap-3'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar por texto, hashtag, produto...'
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-primary'
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white'
          >
            <option value=''>Todos os formatos</option>
            {POST_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className='py-20 text-center text-gray-400'>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className='py-20 text-center bg-white rounded-xl border border-gray-200'>
            <Sparkles className='w-12 h-12 mx-auto mb-3 text-gray-300' />
            <p className='text-gray-500 font-medium'>Nenhum conteúdo ainda</p>
            <button
              onClick={() => navigate('/seller/instagram')}
              className='mt-4 px-4 py-2 text-sm text-pink-700 bg-pink-50 rounded-lg hover:bg-pink-100'
            >
              Gerar o primeiro
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {filtered.map(p => {
              const thumb = p.media?.[0]?.url || p.products?.[0]?.image?.[0];
              const meta = STATUS_META[p.status] || STATUS_META.draft;
              return (
                <div
                  key={p._id}
                  className='bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col'
                >
                  <div className='flex gap-3 p-3'>
                    <div className='w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0'>
                      {thumb ? (
                        <img src={thumb} alt='' className='w-full h-full object-cover' />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center text-2xl'>
                          {POST_TYPES.find(t => t.value === p.type)?.icon}
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1.5 flex-wrap mb-1'>
                        <span className='px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-semibold rounded'>
                          {typeLabel(p.type)}
                        </span>
                        <span className='px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded'>
                          {goalLabel(p.goal)}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className='text-sm text-gray-900 line-clamp-2 leading-snug'>
                        {p.hook || p.caption || p.stories?.[0]?.text || '—'}
                      </p>
                      <p className='text-[11px] text-gray-400 mt-1 truncate'>
                        {(p.products || []).map(x => x.name).join(' · ') || 'sem produto'}
                      </p>
                      {p.status === 'failed' && p.lastError && (
                        <p className='text-[11px] text-red-600 mt-1 line-clamp-2'>{p.lastError}</p>
                      )}
                      {p.status === 'published' && (p.metrics?.fetchedAt || p.sales?.orders > 0) && (
                        <div className='flex flex-wrap gap-1 mt-1.5'>
                          {p.metrics?.reach !== null && p.metrics?.reach !== undefined && (
                            <span className='px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] rounded tabular-nums'>
                              alcance {Number(p.metrics.reach).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {p.metrics?.reach > 0 && (
                            <span className='px-1.5 py-0.5 bg-pink-50 text-pink-700 text-[10px] rounded tabular-nums'>
                              S+E {(((p.metrics.saves || 0) + (p.metrics.shares || 0)) / p.metrics.reach * 100).toFixed(1)}%
                            </span>
                          )}
                          {p.sales?.orders > 0 && (
                            <span className='px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded tabular-nums'>
                              {p.sales.orders} pedido{p.sales.orders > 1 ? 's' : ''} · R$ {Number(p.sales.revenue).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='mt-auto flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50'>
                    <span className='text-[11px] text-gray-400'>
                      {p.status === 'scheduled' && p.scheduledAt
                        ? `⏰ ${formatDateTime(p.scheduledAt)}`
                        : p.status === 'published' && p.publishedAt
                          ? `✓ ${formatDateTime(p.publishedAt)}`
                          : formatDateTime(p.createdAt)}
                    </span>
                    <div className='flex items-center gap-1'>
                      {p.caption && (
                        <button
                          onClick={() =>
                            copyToClipboard(buildFinalCaption(p.caption, p.hashtags), 'Legenda copiada')
                          }
                          className='p-1.5 text-gray-500 hover:bg-gray-200 rounded'
                          title='Copiar legenda'
                        >
                          <Copy className='w-4 h-4' />
                        </button>
                      )}
                      {p.igPermalink && (
                        <a
                          href={p.igPermalink}
                          target='_blank'
                          rel='noreferrer'
                          className='p-1.5 text-pink-600 hover:bg-pink-50 rounded'
                          title='Ver no Instagram'
                        >
                          <Instagram className='w-4 h-4' />
                        </a>
                      )}
                      <button
                        onClick={() => navigate(`/seller/instagram?post=${p._id}`)}
                        className='p-1.5 text-blue-600 hover:bg-blue-50 rounded'
                        title='Abrir no Estúdio'
                      >
                        <ExternalLink className='w-4 h-4' />
                      </button>
                      {!['publishing', 'published'].includes(p.status) && (
                        <button
                          onClick={() => setToDelete(p)}
                          className='p-1.5 text-red-600 hover:bg-red-50 rounded'
                          title='Apagar'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-bold text-gray-900 mb-2'>Apagar conteúdo?</h3>
            <p className='text-sm text-gray-600 mb-6'>
              "{(toDelete.hook || toDelete.caption || '').slice(0, 80)}…" será removido do histórico.
            </p>
            <div className='flex gap-3'>
              <button
                onClick={() => setToDelete(null)}
                disabled={isDeleting}
                className='flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200'
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className='flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50'
              >
                {isDeleting ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramPosts;
