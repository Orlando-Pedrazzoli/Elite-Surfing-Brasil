// client/src/pages/seller/InstagramSettings.jsx
// ═══════════════════════════════════════════════════════════════════════
// ⚙️ CONFIGURAÇÕES — voz da marca + estado da ligação ao Instagram
// ═══════════════════════════════════════════════════════════════════════
// A voz da marca entra no system prompt de TODAS as gerações. A ligação
// Meta (botão "Ligar Instagram") é implementada na Fase 2; aqui mostra o
// estado e o que falta.
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import { Save, Instagram, CheckCircle2, XCircle, Plus, X } from 'lucide-react';

const inputCls =
  'w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary text-sm';

// Editor de lista (chips) para pilares, palavras proibidas, hashtags
const ChipList = ({ label, hint, items, onChange, prefix = '', placeholder }) => {
  const [value, setValue] = useState('');
  const add = () => {
    const parts = value
      .split(/[,\n]+/)
      .map(s => s.trim().replace(/^#+/, ''))
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...items, ...parts])].slice(0, 20));
    setValue('');
  };
  return (
    <div>
      <label className='text-sm font-medium text-gray-700'>{label}</label>
      {hint && <p className='text-[11px] text-gray-500 mb-2'>{hint}</p>}
      <div className='flex flex-wrap gap-2 mb-2'>
        {items.map(item => (
          <span
            key={item}
            className='inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 text-xs rounded-full'
          >
            {prefix}
            {item}
            <button type='button' onClick={() => onChange(items.filter(i => i !== item))}>
              <X className='w-3 h-3' />
            </button>
          </span>
        ))}
      </div>
      <div className='flex gap-2'>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type='button'
          onClick={add}
          className='px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-sm'
        >
          <Plus className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
};

const InstagramSettings = () => {
  const { axios } = useAppContext();
  const [settings, setSettings] = useState(null);
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, h] = await Promise.all([
          axios.get('/api/social/settings'),
          axios.get('/api/social/health'),
        ]);
        if (s.data.success) setSettings(s.data.settings);
        setHealth(h.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao carregar configurações');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [axios]);

  const setVoice = patch => {
    setSettings(prev => ({ ...prev, brandVoice: { ...prev.brandVoice, ...patch } }));
    setDirty(true);
  };
  const setDefaults = patch => {
    setSettings(prev => ({ ...prev, defaults: { ...prev.defaults, ...patch } }));
    setDirty(true);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const { data } = await axios.put('/api/social/settings', {
        brandVoice: settings.brandVoice,
        defaults: settings.defaults,
      });
      if (data.success) {
        setSettings(data.settings);
        setDirty(false);
        toast.success('Configurações salvas');
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className='flex-1 flex items-center justify-center h-[95vh]'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary' />
      </div>
    );
  }

  const v = settings.brandVoice;
  const d = settings.defaults;
  const ig = settings.instagram || {};

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='w-full md:p-8 p-4 max-w-4xl'>
        <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Instagram — Configurações</h1>
            <p className='text-gray-500 mt-1'>Voz da marca e ligação da conta</p>
          </div>
          <button
            onClick={save}
            disabled={!dirty || isSaving}
            className='px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2'
          >
            <Save className='w-4 h-4' /> {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {/* Estado do sistema */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          <div className='bg-white rounded-xl border border-gray-200 p-4'>
            <p className='text-sm font-semibold text-gray-800 mb-2'>Gerador de conteúdo (IA)</p>
            <div className='flex items-center gap-2 text-sm'>
              {health?.generatorConfigured ? (
                <>
                  <CheckCircle2 className='w-4 h-4 text-green-600' />
                  <span className='text-gray-700'>Configurado</span>
                </>
              ) : (
                <>
                  <XCircle className='w-4 h-4 text-red-500' />
                  <span className='text-gray-700'>
                    Falta <code className='font-mono text-xs'>ANTHROPIC_API_KEY</code>
                  </span>
                </>
              )}
            </div>
            {health?.models && (
              <p className='text-[11px] text-gray-400 mt-2 font-mono'>
                {health.models.main} · {health.models.fast} · {health.models.promptVersion}
              </p>
            )}
          </div>

          <div className='bg-white rounded-xl border border-gray-200 p-4'>
            <p className='text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2'>
              <Instagram className='w-4 h-4 text-pink-600' /> Conta Instagram
            </p>
            {ig.connected ? (
              <div className='text-sm text-gray-700'>
                <p className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-green-600' /> @{ig.username}
                </p>
                <p className='text-[11px] text-gray-400 mt-1'>Página: {ig.pageName}</p>
              </div>
            ) : (
              <div className='text-sm text-gray-600'>
                <p className='flex items-center gap-2'>
                  <XCircle className='w-4 h-4 text-gray-400' /> Não ligada
                </p>
                <button
                  type='button'
                  disabled
                  className='mt-2 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed'
                  title='Disponível na Fase 2 (publicação direta)'
                >
                  Ligar Instagram (Fase 2)
                </button>
                <p className='text-[11px] text-gray-400 mt-2'>
                  Por enquanto: copie a legenda e baixe as imagens no Estúdio, e publique pela
                  app do Instagram.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Voz da marca */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 space-y-5 mb-6'>
          <div>
            <h2 className='text-base font-semibold text-gray-900'>Voz da marca</h2>
            <p className='text-xs text-gray-500'>
              Entra em todas as gerações. Quanto mais específico, menos "cara de IA".
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>Handle</label>
              <input value={v.handle || ''} onChange={e => setVoice({ handle: e.target.value })} className={inputCls} />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>Variantes por geração</label>
              <select
                value={d.variantCount || 3}
                onChange={e => setDefaults({ variantCount: Number(e.target.value) })}
                className={`${inputCls} bg-white`}
              >
                <option value={1}>1 (mais barato)</option>
                <option value={2}>2</option>
                <option value={3}>3 (recomendado)</option>
              </select>
            </div>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>Tom</label>
            <textarea
              value={v.tone || ''}
              onChange={e => setVoice({ tone: e.target.value })}
              rows={2}
              maxLength={400}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>Público</label>
            <textarea
              value={v.audience || ''}
              onChange={e => setVoice({ audience: e.target.value })}
              rows={2}
              maxLength={500}
              className={`${inputCls} resize-none`}
            />
          </div>

          <ChipList
            label='Pilares de conteúdo'
            hint='Temas recorrentes da marca'
            items={v.pillars || []}
            onChange={pillars => setVoice({ pillars })}
            placeholder='ex: Dica técnica de leash'
          />

          <ChipList
            label='Palavras proibidas'
            hint='A IA nunca as usa'
            items={v.bannedWords || []}
            onChange={bannedWords => setVoice({ bannedWords })}
            placeholder='ex: imperdível'
          />

          <ChipList
            label='Hashtags de marca'
            hint='Sempre elegíveis; a IA usa 1–2 como vaga de nicho'
            items={v.baseHashtags || []}
            onChange={baseHashtags => setVoice({ baseHashtags })}
            prefix='#'
            placeholder='ex: elitesurfing'
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>Emojis</label>
              <select
                value={v.emojiLevel || 'low'}
                onChange={e => setVoice({ emojiLevel: e.target.value })}
                className={`${inputCls} bg-white`}
              >
                <option value='none'>Nenhum</option>
                <option value='low'>Poucos (0–2)</option>
                <option value='medium'>Moderado (até 4)</option>
              </select>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>Estilo de CTA</label>
              <select
                value={v.ctaStyle || 'direct'}
                onChange={e => setVoice({ ctaStyle: e.target.value })}
                className={`${inputCls} bg-white`}
              >
                <option value='direct'>Direto ("salva", "link na bio")</option>
                <option value='soft'>Suave / convidativo</option>
                <option value='question'>Pergunta real</option>
              </select>
            </div>
          </div>
        </div>

        {/* Defaults de publicação (Fase 2) */}
        <div className='bg-white rounded-xl border border-gray-200 p-5 space-y-4'>
          <div>
            <h2 className='text-base font-semibold text-gray-900'>Publicação</h2>
            <p className='text-xs text-gray-500'>Usado pelo agendamento (Fase 2)</p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>Fuso horário</label>
              <input
                value={d.timezone || ''}
                onChange={e => setDefaults({ timezone: e.target.value })}
                className={inputCls}
              />
            </div>
            <ChipList
              label='Horários sugeridos'
              hint='HH:mm, no fuso acima'
              items={d.postingTimes || []}
              onChange={postingTimes => setDefaults({ postingTimes })}
              placeholder='ex: 19:00'
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramSettings;
