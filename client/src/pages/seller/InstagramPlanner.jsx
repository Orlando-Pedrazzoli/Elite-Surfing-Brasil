// client/src/pages/seller/InstagramPlanner.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🗓️ PLANEJADOR SEMANAL — a IA sugere a semana; cada item vira rascunho
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { typeLabel, goalLabel, POST_TYPES } from '../../utils/socialUtils';
import { formatBRL, formatPct } from '../../utils/pricingUtils';
import { CalendarDays, Sparkles, ArrowRight, Check, Info, RefreshCw } from 'lucide-react';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const fmtDay = d =>
  new Date(d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtTime = d => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const InstagramPlanner = () => {
  const { axios } = useAppContext();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [postsPerWeek, setPostsPerWeek] = useState(4);
  const [nextWeek, setNextWeek] = useState(true);
  const [creating, setCreating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        axios.get('/api/social/plan/latest'),
        axios.get('/api/social/plan/candidates'),
      ]);
      if (p.data.success) setPlan(p.data.plan);
      if (c.data.success) setCandidates(c.data.candidates || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao carregar planejador');
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const weekStart = nextWeek ? new Date(Date.now() + 7 * 86400000).toISOString() : new Date().toISOString();
      const { data } = await axios.post('/api/social/plan/week', { weekStart, postsPerWeek });
      if (data.success) {
        setPlan(data.plan);
        toast.success('Plano da semana gerado');
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao gerar plano');
    } finally {
      setGenerating(false);
    }
  };

  const createDraft = async index => {
    if (!plan || creating !== null) return;
    setCreating(index);
    try {
      const { data } = await axios.post(`/api/social/plan/${plan._id}/items/${index}/draft`);
      if (data.success) {
        toast.success('Rascunho criado — abrindo no Estúdio');
        navigate(`/seller/instagram?post=${data.postId}`);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao criar rascunho');
    } finally {
      setCreating(null);
    }
  };

  const itemsByDay = WEEKDAYS.map((label, i) => ({
    label,
    items: (plan?.items || [])
      .map((it, idx) => ({ ...it, idx }))
      .filter(it => ((new Date(it.date).getDay() + 6) % 7) === i),
  }));

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='w-full md:p-8 p-4'>
        <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
              <CalendarDays className='w-6 h-6 text-pink-500' /> Planejador semanal
            </h1>
            <p className='text-gray-500 mt-1'>
              A IA escolhe produto, formato, dia e ângulo com base em margem, estoque, frescura e desempenho
            </p>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <select
              value={postsPerWeek}
              onChange={e => setPostsPerWeek(Number(e.target.value))}
              className='text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white'
            >
              {[3, 4, 5, 6].map(n => (
                <option key={n} value={n}>
                  {n} conteúdos
                </option>
              ))}
            </select>
            <select
              value={nextWeek ? 'next' : 'this'}
              onChange={e => setNextWeek(e.target.value === 'next')}
              className='text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white'
            >
              <option value='this'>Esta semana</option>
              <option value='next'>Próxima semana</option>
            </select>
            <button
              onClick={generate}
              disabled={generating}
              className='px-4 py-2 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2'
            >
              {generating ? (
                <RefreshCw className='w-4 h-4 animate-spin' />
              ) : (
                <Sparkles className='w-4 h-4' />
              )}
              {generating ? 'Planejando...' : plan ? 'Gerar novo plano' : 'Planejar semana'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className='py-20 text-center text-gray-400'>Carregando...</div>
        ) : (
          <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6'>
            {/* Plano */}
            <div className='space-y-4 min-w-0'>
              {plan ? (
                <>
                  <div className='bg-white rounded-xl border border-gray-200 p-4'>
                    <p className='text-xs text-gray-500'>
                      Semana de {fmtDay(plan.weekStart)} a {fmtDay(plan.weekEnd)} · gerado em{' '}
                      {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {plan.summary && <p className='text-sm text-gray-800 mt-2'>{plan.summary}</p>}
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'>
                    {itemsByDay.map(day => (
                      <div
                        key={day.label}
                        className={`rounded-xl border p-3 min-h-[120px] ${
                          day.items.length ? 'bg-white border-gray-200' : 'bg-gray-50/60 border-dashed border-gray-200'
                        }`}
                      >
                        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>{day.label}</p>
                        {day.items.length === 0 ? (
                          <p className='text-[11px] text-gray-300'>—</p>
                        ) : (
                          day.items.map(it => {
                            const done = !!it.post;
                            return (
                              <div key={it.idx} className='border border-gray-100 rounded-lg p-3 bg-gray-50/40'>
                                <div className='flex items-center gap-1.5 flex-wrap mb-1'>
                                  <span className='text-[10px] font-mono text-gray-500'>{fmtTime(it.date)}</span>
                                  <span className='px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-semibold rounded'>
                                    {POST_TYPES.find(t => t.value === it.type)?.icon} {typeLabel(it.type)}
                                  </span>
                                  <span className='px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded'>
                                    {goalLabel(it.goal)}
                                  </span>
                                  {it.formula && (
                                    <span className='px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded'>
                                      {it.formula}
                                    </span>
                                  )}
                                </div>
                                {it.productName && (
                                  <p className='text-sm font-medium text-gray-900 leading-snug'>{it.productName}</p>
                                )}
                                <p className='text-xs text-gray-700 mt-1'>{it.angle}</p>
                                {it.rationale && (
                                  <p className='text-[11px] text-gray-400 mt-1 italic'>{it.rationale}</p>
                                )}
                                <button
                                  onClick={() =>
                                    done ? navigate(`/seller/instagram?post=${it.post._id || it.post}`) : createDraft(it.idx)
                                  }
                                  disabled={creating !== null && creating !== it.idx}
                                  className={`mt-2 w-full py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1 ${
                                    done
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                                  }`}
                                >
                                  {creating === it.idx ? (
                                    <>
                                      <RefreshCw className='w-3 h-3 animate-spin' /> Gerando...
                                    </>
                                  ) : done ? (
                                    <>
                                      <Check className='w-3 h-3' /> Abrir rascunho
                                    </>
                                  ) : (
                                    <>
                                      Criar rascunho <ArrowRight className='w-3 h-3' />
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className='py-16 text-center bg-white rounded-xl border border-gray-200'>
                  <CalendarDays className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                  <p className='text-gray-500 font-medium'>Nenhum plano ainda</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    Clique em "Planejar semana" — a IA usa os produtos pontuados à direita.
                  </p>
                </div>
              )}
            </div>

            {/* Candidatos */}
            <div className='xl:sticky xl:top-0 self-start'>
              <div className='bg-white rounded-xl border border-gray-200 p-4'>
                <p className='text-sm font-semibold text-gray-800 mb-1'>Produtos que vale a pena empurrar</p>
                <p className='text-[11px] text-gray-500 mb-3 flex gap-1'>
                  <Info className='w-3 h-3 mt-0.5 flex-shrink-0' />
                  Pontuação = margem (até 40) + estoque (até 25) + dias sem post (até 20) + frete grátis + desconto
                </p>
                <ol className='space-y-2 max-h-[70vh] overflow-y-auto pr-1'>
                  {candidates.map((c, i) => (
                    <li key={c._id} className='flex items-start gap-2 text-xs'>
                      <span className='w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center flex-shrink-0'>
                        {i + 1}
                      </span>
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium text-gray-900 line-clamp-1'>{c.name}</p>
                        <p className='text-[11px] text-gray-500'>
                          {formatBRL(c.offerPrice)}
                          {c.discountPct ? ` (−${c.discountPct}%)` : ''} · {c.stock} un ·{' '}
                          {c.marginPct === null ? 'sem custo' : `margem ${formatPct(c.marginPct)}`}
                          {c.daysSincePost !== null ? ` · post há ${c.daysSincePost}d` : ' · nunca postado'}
                        </p>
                      </div>
                      <span className='text-[11px] font-semibold tabular-nums text-pink-700'>{c.score}</span>
                    </li>
                  ))}
                  {candidates.length === 0 && (
                    <li className='text-xs text-gray-400'>Nenhum produto publicado com estoque.</li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramPlanner;
