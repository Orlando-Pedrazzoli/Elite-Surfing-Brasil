// client/src/pages/seller/InstagramCaptions.jsx
// ═══════════════════════════════════════════════════════════════════════
// ✍️ LEGENDAS PRÉ-DEFINIDAS — gestão (/seller/instagram/captions)
// ═══════════════════════════════════════════════════════════════════════
// Biblioteca de legendas aprovadas por coleção. Cada legenda pode ser
// usada tal como está no Estúdio (sem IA) e serve de referência de tom
// para a IA quando gera conteúdo para produtos dessa coleção.
// ═══════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Save, X, Quote, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { groups as storeGroups } from '../../assets/assets';
import { POST_TYPES, POST_GOALS } from '../../utils/socialUtils';
import { MANDATORY_HASHTAGS, NICHE_SLOTS } from '../../utils/hashtagPolicy';

const GROUP_OPTIONS = [
  { id: 'all', name: 'Todas as coleções' },
  ...(storeGroups || []).filter(g => !g.isTagGroup).map(g => ({ id: g.id, name: g.name })),
];

const groupName = id => GROUP_OPTIONS.find(g => g.id === id)?.name || id;

const EMPTY = {
  group: 'decks',
  angle: 'performance',
  name: '',
  usage: '',
  caption: '',
  hashtags: '',
  suggestedTypes: [],
  suggestedGoals: [],
  isActive: true,
  order: 0,
};

const inputCls =
  'w-full py-2 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary bg-white';

const InstagramCaptions = () => {
  const { axios } = useAppContext();
  const [templates, setTemplates] = useState([]);
  const [angles, setAngles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState('all');
  const [editing, setEditing] = useState(null); // null | 'new' | template
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/social/caption-templates', { params: { all: 1 } });
      if (data.success) {
        setTemplates(data.templates || []);
        setAngles(data.angles || {});
      } else toast.error(data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao carregar legendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupsInUse = useMemo(() => {
    const set = new Map();
    for (const t of templates) set.set(t.group, (set.get(t.group) || 0) + 1);
    return [...set.entries()];
  }, [templates]);

  const visible = useMemo(
    () => (filterGroup === 'all' ? templates : templates.filter(t => t.group === filterGroup)),
    [templates, filterGroup],
  );

  const startNew = () => {
    setForm({ ...EMPTY, group: filterGroup === 'all' ? 'decks' : filterGroup, order: templates.length + 1 });
    setEditing('new');
  };

  const startEdit = t => {
    setForm({
      group: t.group,
      angle: t.angle,
      name: t.name,
      usage: t.usage || '',
      caption: t.caption,
      hashtags: (t.hashtags || []).map(h => `#${h}`).join(' '),
      suggestedTypes: t.suggestedTypes || [],
      suggestedGoals: t.suggestedGoals || [],
      isActive: t.isActive !== false,
      order: t.order || 0,
    });
    setEditing(t);
  };

  const cancel = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const toggleIn = (key, value) =>
    setForm(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }));

  const save = async () => {
    if (!form.name.trim()) return toast.error('Dê um nome à legenda');
    if (!form.caption.trim()) return toast.error('A legenda não pode estar vazia');
    setSaving(true);
    try {
      const payload = {
        ...form,
        hashtags: form.hashtags.split(/[\s,]+/).filter(Boolean),
      };
      const req =
        editing === 'new'
          ? axios.post('/api/social/caption-templates', payload)
          : axios.put(`/api/social/caption-templates/${editing._id}`, payload);
      const { data } = await req;
      if (data.success) {
        toast.success(editing === 'new' ? 'Legenda criada' : 'Legenda atualizada');
        cancel();
        load();
      } else toast.error(data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async t => {
    try {
      const { data } = await axios.put(`/api/social/caption-templates/${t._id}`, {
        isActive: !t.isActive,
      });
      if (data.success) load();
      else toast.error(data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro');
    }
  };

  const remove = async t => {
    if (!window.confirm(`Apagar a legenda "${t.name}"?`)) return;
    try {
      const { data } = await axios.delete(`/api/social/caption-templates/${t._id}`);
      if (data.success) {
        toast.success('Legenda apagada');
        load();
      } else toast.error(data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erro ao apagar');
    }
  };

  const nicheCount = form.hashtags.split(/[\s,]+/).filter(Boolean).length;

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='md:p-10 p-4 space-y-5 max-w-6xl'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 inline-flex items-center gap-2'>
              <Quote className='w-5 h-5 text-gray-400' /> Legendas pré-definidas
            </h2>
            <p className='text-sm text-gray-500 mt-1'>
              Legendas aprovadas por coleção. No Estúdio podem ser usadas tal como estão (sem IA)
              e servem de referência de tom para a IA ao gerar conteúdo dessa coleção.
            </p>
          </div>
          <button
            type='button'
            onClick={startNew}
            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800'
          >
            <Plus className='w-4 h-4' /> Nova legenda
          </button>
        </div>

        {/* Filtro por coleção */}
        <div className='flex flex-wrap gap-1.5'>
          <Chip active={filterGroup === 'all'} onClick={() => setFilterGroup('all')}>
            Todas · {templates.length}
          </Chip>
          {groupsInUse.map(([g, n]) => (
            <Chip key={g} active={filterGroup === g} onClick={() => setFilterGroup(g)}>
              {groupName(g)} · {n}
            </Chip>
          ))}
        </div>

        {/* Editor */}
        {editing && (
          <div className='bg-white rounded-xl border border-gray-300 p-4 space-y-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-semibold text-gray-800'>
                {editing === 'new' ? 'Nova legenda' : `Editar: ${editing.name}`}
              </p>
              <button type='button' onClick={cancel} className='text-gray-400 hover:text-gray-700'>
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              <Field label='Coleção'>
                <select value={form.group} onChange={e => setForm({ ...form, group: e.target.value })} className={inputCls}>
                  {GROUP_OPTIONS.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label='Ângulo'>
                <select value={form.angle} onChange={e => setForm({ ...form, angle: e.target.value })} className={inputCls}>
                  {Object.entries(angles).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label='Ordem'>
                <input
                  type='number'
                  value={form.order}
                  onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label='Nome'>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder='ex: Performance e controle'
                maxLength={80}
                className={inputCls}
              />
            </Field>

            <Field label='Quando usar' hint='Aparece ao admin no Estúdio para escolher o ângulo certo'>
              <input
                value={form.usage}
                onChange={e => setForm({ ...form, usage: e.target.value })}
                placeholder='ex: Ideal para destacar textura, acabamento e visual.'
                maxLength={300}
                className={inputCls}
              />
            </Field>

            <Field
              label='Legenda'
              hint='Uma ideia por linha. Placeholders: {produto} {preco} {link} — substituídos pelo produto escolhido.'
            >
              <textarea
                value={form.caption}
                onChange={e => setForm({ ...form, caption: e.target.value })}
                rows={5}
                maxLength={2200}
                className={`${inputCls} resize-y leading-relaxed`}
              />
              <p className='text-[11px] text-gray-400 text-right'>{form.caption.length}/2200</p>
            </Field>

            <Field
              label={`Hashtags de nicho (${nicheCount}/${NICHE_SLOTS})`}
              hint={`O bloco fixo da marca (${MANDATORY_HASHTAGS.length} hashtags) é acrescentado automaticamente; aqui só as específicas desta legenda.`}
            >
              <input
                value={form.hashtags}
                onChange={e => setForm({ ...form, hashtags: e.target.value })}
                placeholder='#surfgrip #surfdeck'
                className={inputCls}
              />
            </Field>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Field label='Formatos sugeridos' hint='Vazio = todos'>
                <div className='flex flex-wrap gap-1.5'>
                  {POST_TYPES.map(t => (
                    <Chip
                      key={t.value}
                      active={form.suggestedTypes.includes(t.value)}
                      onClick={() => toggleIn('suggestedTypes', t.value)}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label='Objetivos sugeridos' hint='Vazio = todos'>
                <div className='flex flex-wrap gap-1.5'>
                  {POST_GOALS.map(g => (
                    <Chip
                      key={g.value}
                      active={form.suggestedGoals.includes(g.value)}
                      onClick={() => toggleIn('suggestedGoals', g.value)}
                    >
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>

            <div className='flex items-center justify-between pt-2 border-t border-gray-100'>
              <label className='flex items-center gap-2 text-sm text-gray-700'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className='accent-pink-500'
                />
                Ativa (aparece no Estúdio e serve de referência à IA)
              </label>
              <div className='flex gap-2'>
                <button type='button' onClick={cancel} className='px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50'>
                  Cancelar
                </button>
                <button
                  type='button'
                  onClick={save}
                  disabled={saving}
                  className='inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                >
                  <Save className='w-4 h-4' /> {saving ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p className='text-sm text-gray-400'>A carregar…</p>
        ) : visible.length === 0 ? (
          <div className='bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500'>
            Nenhuma legenda nesta coleção. Clica em "Nova legenda".
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {visible.map(t => (
              <div
                key={t._id}
                className={`bg-white rounded-xl border p-4 flex flex-col gap-2 ${
                  t.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-500'>
                        {groupName(t.group)}
                      </span>
                      <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700'>
                        {angles[t.angle] || t.angle}
                      </span>
                      {!t.isActive && (
                        <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600'>inativa</span>
                      )}
                    </div>
                    <p className='text-sm font-semibold text-gray-900 mt-1'>{t.name}</p>
                    {t.usage && <p className='text-[11px] text-gray-500'>{t.usage}</p>}
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <IconBtn title={t.isActive ? 'Desativar' : 'Ativar'} onClick={() => toggleActive(t)}>
                      {t.isActive ? <Eye className='w-4 h-4' /> : <EyeOff className='w-4 h-4' />}
                    </IconBtn>
                    <IconBtn title='Editar' onClick={() => startEdit(t)}>
                      <Pencil className='w-4 h-4' />
                    </IconBtn>
                    <IconBtn title='Apagar' onClick={() => remove(t)} danger>
                      <Trash2 className='w-4 h-4' />
                    </IconBtn>
                  </div>
                </div>
                <p className='text-sm text-gray-800 whitespace-pre-line leading-relaxed'>{t.caption}</p>
                <p className='text-[11px] text-blue-700/80'>
                  {(t.hashtags || []).map(h => `#${h}`).join(' ')}
                </p>
                <div className='flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100'>
                  <span>
                    {(t.suggestedTypes || []).length ? t.suggestedTypes.join(' · ') : 'todos os formatos'}
                  </span>
                  <span>usada {t.usageCount || 0}×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div className='flex flex-col gap-1'>
    <label className='text-xs font-medium text-gray-600'>{label}</label>
    {children}
    {hint && <p className='text-[11px] text-gray-400'>{hint}</p>}
  </div>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type='button'
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
      active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
    }`}
  >
    {children}
  </button>
);

const IconBtn = ({ title, onClick, children, danger }) => (
  <button
    type='button'
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-lg border border-gray-200 ${
      danger ? 'text-gray-400 hover:text-red-600 hover:border-red-200' : 'text-gray-500 hover:text-gray-900 hover:border-gray-400'
    }`}
  >
    {children}
  </button>
);

export default InstagramCaptions;
