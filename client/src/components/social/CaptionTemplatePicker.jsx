// client/src/components/social/CaptionTemplatePicker.jsx
// ═══════════════════════════════════════════════════════════════════════
// ✍️ LEGENDAS PRÉ-DEFINIDAS — passo 1 do Estúdio
// ═══════════════════════════════════════════════════════════════════════
// Mostra as legendas aprovadas pelo admin para as coleções dos produtos
// selecionados. "Usar esta legenda" cria o post sem IA e abre o editor.
// As mesmas legendas servem de referência de tom quando se clica em
// "Gerar conteúdo" (o servidor injeta-as no prompt).
// ═══════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quote, ArrowRight, Settings2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { MANDATORY_HASHTAGS } from '../../utils/hashtagPolicy';

const ANGLE_COLORS = {
  performance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  design: 'bg-violet-50 text-violet-700 border-violet-200',
  lifestyle: 'bg-sky-50 text-sky-700 border-sky-200',
  sell: 'bg-amber-50 text-amber-700 border-amber-200',
  launch: 'bg-pink-50 text-pink-700 border-pink-200',
  education: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

const CaptionTemplatePicker = ({ selectedProducts = [], type, goal, onUse, busy }) => {
  const { axios } = useAppContext();
  const [templates, setTemplates] = useState([]);
  const [angles, setAngles] = useState({});
  const [loading, setLoading] = useState(false);

  const groups = useMemo(
    () => [...new Set(selectedProducts.map(p => (p.group || p.category || '').toLowerCase()).filter(Boolean))],
    [selectedProducts],
  );
  const groupKey = groups.join(',');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/social/caption-templates', {
          params: groupKey ? { group: groupKey } : {},
        });
        if (!cancelled && data.success) {
          setTemplates(data.templates || []);
          setAngles(data.angles || {});
        }
      } catch {
        /* silencioso: a secção simplesmente não aparece */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [axios, groupKey]);

  // Sem produto selecionado só mostramos as legendas "all"
  const visible = useMemo(
    () => templates.filter(t => t.group === 'all' || groups.includes(t.group)),
    [templates, groups],
  );

  if (!loading && visible.length === 0) return null;

  const fits = t =>
    (!t.suggestedTypes?.length || t.suggestedTypes.includes(type)) &&
    (!t.suggestedGoals?.length || t.suggestedGoals.includes(goal));

  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <div className='flex items-center justify-between mb-1'>
        <p className='text-sm font-semibold text-gray-800 inline-flex items-center gap-1.5'>
          <Quote className='w-4 h-4 text-gray-400' />
          Legendas pré-definidas
          {groups.length > 0 && (
            <span className='text-gray-400 font-normal'>· {groups.join(', ')}</span>
          )}
        </p>
        <Link
          to='/seller/instagram/captions'
          className='text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1'
        >
          <Settings2 className='w-3.5 h-3.5' /> Gerir
        </Link>
      </div>
      <p className='text-[11px] text-gray-500 mb-3'>
        Usa uma legenda aprovada tal como está (sem IA) ou clica em "Gerar conteúdo": a IA
        imita o tom destas legendas para escrever variantes novas.
      </p>

      {loading && <p className='text-xs text-gray-400 py-2'>A carregar…</p>}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
        {visible.map(t => {
          const ok = fits(t);
          return (
            <div
              key={t._id}
              className={`rounded-lg border p-3 flex flex-col gap-2 ${
                ok ? 'border-gray-200' : 'border-gray-100 opacity-70'
              }`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      ANGLE_COLORS[t.angle] || ANGLE_COLORS.other
                    }`}
                  >
                    {angles[t.angle] || t.angle}
                  </span>
                  <p className='text-sm font-medium text-gray-900 mt-1'>{t.name}</p>
                  {t.usage && <p className='text-[11px] text-gray-500'>{t.usage}</p>}
                </div>
              </div>
              <p className='text-xs text-gray-700 whitespace-pre-line leading-relaxed flex-1'>
                {t.caption}
              </p>
              <p className='text-[10px] text-blue-700/80 leading-snug'>
                {(t.hashtags || []).map(h => `#${h}`).join(' ')}
                <span className='text-gray-400'> + {MANDATORY_HASHTAGS.length} fixas</span>
              </p>
              <button
                type='button'
                disabled={busy}
                onClick={() => onUse(t)}
                className='self-start inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
              >
                Usar esta legenda <ArrowRight className='w-3.5 h-3.5' />
              </button>
              {!ok && (
                <p className='text-[10px] text-gray-400'>
                  Sugerida para outro formato/objetivo — pode usar na mesma.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaptionTemplatePicker;
