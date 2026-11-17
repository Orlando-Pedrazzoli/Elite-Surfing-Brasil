// client/src/pages/seller/Categories.jsx
// ═════════════════════════════════════════════════════════════════════
// 🗂️ CATEGORIAS — painel admin (/seller/categorias)
// ═════════════════════════════════════════════════════════════════════
// O admin organiza aqui as categorias da loja (antes fixas no código):
//   • Categoria    → coleção (menu, /collections/<slug>, product.group)
//   • Subcategoria → modelo/tipo dentro da categoria (product.category)
//   • Coleção por tag → agrega produtos de várias categorias pela tag
//     (SUP, Bodyboard, Outlet)
//
// Tudo o que muda aqui aparece na loja (menu, home, filtros, busca) e nos
// formulários de produto. Mudar o endereço (slug) ou mover uma
// subcategoria atualiza também os produtos, cupons e tabelas de preço.
// ═════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import {
  Plus,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Upload,
  ExternalLink,
  FolderTree,
  Tag,
  Home,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useCategories } from '../../context/CategoriesContext';
import { compressImage } from '../../utils/imageCompression';
import { groups as staticGroups } from '../../assets/assets';

const API = '/api/seller/categories';

// Imagens padrão do site (mostradas quando a categoria não tem imagem própria)
const STATIC_IMAGES = Object.fromEntries(staticGroups.map(g => [g.slug, g.image]));

const stripAccents = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Igual ao servidor: categoria → "acessorios" | subcategoria → "Deck-Maldivas"
const generateSlug = (name, isGroup) => {
  const words = stripAccents(name)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (isGroup) return words.join('-').toLowerCase();
  return words
    .map(w => (/^[A-Z0-9]+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join('-');
};

const emptyForm = parent => ({
  name: '',
  slug: '',
  parent: parent || '',
  description: '',
  isActive: true,
  showOnHome: true,
  isTagGroup: false,
  tagKey: '',
  imageFile: null,
  imagePreview: '',
  removeImage: false,
});

const moveInArray = (list, from, to) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

// ─────────────────────────────────────────────────────────────────────
// Linha de subcategoria
// ─────────────────────────────────────────────────────────────────────
const SubRow = ({ item, index, total, busy, groupActive, onMove, onEdit, onToggle, onDelete }) => (
  <Draggable draggableId={item._id} index={index} isDragDisabled={busy}>
    {(provided, snapshot) => (
      <li
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={`flex items-center gap-2 px-2 py-2 bg-white rounded-lg border ${
          snapshot.isDragging ? 'border-primary shadow-lg' : 'border-gray-100'
        } ${item.isActive && groupActive ? '' : 'opacity-60'}`}
      >
        <div className='flex items-center'>
          <button
            type='button'
            onClick={() => onMove(index, -1)}
            disabled={busy || index === 0}
            className='p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30'
            aria-label={`Mover ${item.name} para cima`}
          >
            <ChevronUp className='w-3.5 h-3.5' />
          </button>
          <span
            {...provided.dragHandleProps}
            className='p-0.5 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'
            aria-label={`Arrastar ${item.name}`}
          >
            <GripVertical className='w-4 h-4' />
          </span>
          <button
            type='button'
            onClick={() => onMove(index, 1)}
            disabled={busy || index === total - 1}
            className='p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30'
            aria-label={`Mover ${item.name} para baixo`}
          >
            <ChevronDown className='w-3.5 h-3.5' />
          </button>
        </div>

        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-gray-800 truncate'>
            {item.name}
            {!item.isActive && (
              <span className='ml-2 text-[10px] font-semibold uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded'>
                Oculta
              </span>
            )}
          </p>
          <p className='text-xs text-gray-400 font-mono truncate'>/{item.slug}</p>
        </div>

        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            item.productCount > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
          }`}
        >
          {item.productCount} {item.productCount === 1 ? 'produto' : 'produtos'}
        </span>

        <div className='flex items-center gap-0.5'>
          <button
            type='button'
            onClick={() => onToggle(item)}
            disabled={busy}
            className='p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
            title={item.isActive ? 'Ocultar da loja' : 'Mostrar na loja'}
          >
            {item.isActive ? <Eye className='w-4 h-4' /> : <EyeOff className='w-4 h-4' />}
          </button>
          <button
            type='button'
            onClick={() => onEdit(item)}
            disabled={busy}
            className='p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg'
            title='Editar'
          >
            <Edit2 className='w-4 h-4' />
          </button>
          <button
            type='button'
            onClick={() => onDelete(item)}
            disabled={busy}
            className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg'
            title='Excluir'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      </li>
    )}
  </Draggable>
);

// ─────────────────────────────────────────────────────────────────────
// Cartão de categoria (com as subcategorias)
// ─────────────────────────────────────────────────────────────────────
const GroupCard = ({
  group,
  index,
  total,
  subs,
  busy,
  expanded,
  onExpand,
  onMove,
  onMoveChild,
  onAddChild,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const image = group.image || STATIC_IMAGES[group.slug] || '';
  return (
    <Draggable draggableId={group._id} index={index} isDragDisabled={busy}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-3 bg-white rounded-xl border ${
            snapshot.isDragging ? 'border-primary shadow-xl' : 'border-gray-200'
          }`}
        >
          <div className={`flex items-stretch ${group.isActive ? '' : 'opacity-60'}`}>
            {/* Alça + setas */}
            <div className='flex flex-col items-center justify-center gap-0.5 px-1.5 border-r border-gray-100'>
              <button
                type='button'
                onClick={() => onMove(index, -1)}
                disabled={busy || index === 0}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30'
                aria-label={`Mover ${group.name} para cima`}
              >
                <ChevronUp className='w-4 h-4' />
              </button>
              <span
                {...provided.dragHandleProps}
                className='p-1 rounded text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'
                aria-label={`Arrastar ${group.name}`}
              >
                <GripVertical className='w-5 h-5' />
              </span>
              <button
                type='button'
                onClick={() => onMove(index, 1)}
                disabled={busy || index === total - 1}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30'
                aria-label={`Mover ${group.name} para baixo`}
              >
                <ChevronDown className='w-4 h-4' />
              </button>
            </div>

            <div className='flex-1 min-w-0 flex flex-wrap items-center gap-3 p-3 sm:p-4'>
              <button
                type='button'
                onClick={() => onExpand(group._id)}
                disabled={group.isTagGroup}
                className='flex items-center gap-3 min-w-0 flex-1 text-left disabled:cursor-default'
              >
                {!group.isTagGroup && (
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                      expanded ? 'rotate-90' : ''
                    }`}
                  />
                )}
                <div className='w-14 h-11 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0'>
                  {image ? (
                    <img src={image} alt='' className='w-full h-full object-cover' loading='lazy' />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center text-gray-300'>
                      <FolderTree className='w-5 h-5' />
                    </div>
                  )}
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold text-gray-900 truncate'>{group.name}</p>
                  <p className='text-xs text-gray-400 font-mono truncate'>
                    /collections/{group.slug}
                  </p>
                  <div className='flex flex-wrap gap-1 mt-1'>
                    {!group.isActive && (
                      <span className='text-[10px] font-semibold uppercase text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded'>
                        Oculta
                      </span>
                    )}
                    {group.isTagGroup && (
                      <span className='inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded'>
                        <Tag className='w-3 h-3' /> Tag: {group.tagKey}
                      </span>
                    )}
                    {group.showOnHome && !group.isTagGroup && (
                      <span className='inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded'>
                        <Home className='w-3 h-3' /> Home
                      </span>
                    )}
                    {!group.isTagGroup && (
                      <span className='text-[10px] font-semibold uppercase text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded'>
                        {subs.length} subcategoria{subs.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <span
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
                  group.productCount > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {group.productCount} {group.productCount === 1 ? 'produto' : 'produtos'}
              </span>

              <div className='flex items-center gap-1'>
                {!group.isTagGroup && (
                  <button
                    type='button'
                    onClick={() => onAddChild(group)}
                    disabled={busy}
                    className='hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5'
                  >
                    <Plus className='w-3.5 h-3.5' /> Subcategoria
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => onToggle(group)}
                  disabled={busy}
                  className='p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
                  title={group.isActive ? 'Ocultar da loja' : 'Mostrar na loja'}
                >
                  {group.isActive ? <Eye className='w-4 h-4' /> : <EyeOff className='w-4 h-4' />}
                </button>
                <button
                  type='button'
                  onClick={() => onEdit(group)}
                  disabled={busy}
                  className='p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg'
                  title='Editar'
                >
                  <Edit2 className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => onDelete(group)}
                  disabled={busy}
                  className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg'
                  title='Excluir'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Subcategorias */}
          {expanded && !group.isTagGroup && (
            <div className='border-t border-gray-100 bg-gray-50/70 px-3 sm:px-5 py-3 rounded-b-xl'>
              {subs.length === 0 ? (
                <p className='text-sm text-gray-400 py-2'>Nenhuma subcategoria.</p>
              ) : (
                <Droppable droppableId={`sub:${group._id}`} type={`sub:${group._id}`}>
                  {dropProvided => (
                    <ul
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className='space-y-1.5'
                    >
                      {subs.map((child, ci) => (
                        <SubRow
                          key={child._id}
                          item={child}
                          index={ci}
                          total={subs.length}
                          busy={busy}
                          groupActive={group.isActive}
                          onMove={(from, delta) => onMoveChild(group._id, from, from + delta)}
                          onEdit={onEdit}
                          onToggle={onToggle}
                          onDelete={onDelete}
                        />
                      ))}
                      {dropProvided.placeholder}
                    </ul>
                  )}
                </Droppable>
              )}
              <button
                type='button'
                onClick={() => onAddChild(group)}
                disabled={busy}
                className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
              >
                <Plus className='w-3.5 h-3.5' /> Adicionar subcategoria em {group.name}
              </button>
            </div>
          )}
        </li>
      )}
    </Draggable>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────
const Categories = () => {
  const { axios } = useAppContext();
  const { refreshCategories } = useCategories();

  const [items, setItems] = useState([]);
  const [orphans, setOrphans] = useState({ groups: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // categoria a editar | null
  const [form, setForm] = useState(emptyForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Carregar ───
  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(API);
      if (data.success) {
        setItems(data.categories);
        setOrphans(data.orphans || { groups: [], categories: [] });
      } else {
        toast.error(data.message || 'Erro ao carregar categorias');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    load();
  }, [load]);

  // Depois de cada alteração: recarrega o painel e a loja (menu, home…)
  const afterChange = useCallback(async () => {
    await load();
    refreshCategories({ fresh: true });
  }, [load, refreshCategories]);

  const groups = useMemo(
    () => items.filter(c => !c.parent).sort((a, b) => a.order - b.order),
    [items],
  );
  const childrenOf = useCallback(
    groupId =>
      items
        .filter(c => c.parent && String(c.parent) === String(groupId))
        .sort((a, b) => a.order - b.order),
    [items],
  );
  const regularGroups = groups.filter(g => !g.isTagGroup);

  const totalSubs = items.filter(c => c.parent).length;
  const hiddenCount = items.filter(c => !c.isActive).length;

  // ─── Ordenação ───
  const saveOrder = async ids => {
    setBusy(true);
    try {
      const { data } = await axios.put(`${API}/reorder`, { ids });
      if (!data.success) throw new Error(data.message);
      refreshCategories({ fresh: true });
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar a ordem');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const applyLocalOrder = orderedIds => {
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    setItems(prev =>
      prev.map(c => (pos.has(c._id) ? { ...c, order: pos.get(c._id) } : c)),
    );
  };

  const reorderGroups = (from, to) => {
    if (to < 0 || to >= groups.length || from === to) return;
    const ids = moveInArray(groups, from, to).map(g => g._id);
    applyLocalOrder(ids);
    saveOrder(ids);
  };

  const reorderChildren = (groupId, from, to) => {
    const list = childrenOf(groupId);
    if (to < 0 || to >= list.length || from === to) return;
    const ids = moveInArray(list, from, to).map(c => c._id);
    applyLocalOrder(ids);
    saveOrder(ids);
  };

  const handleDragEnd = result => {
    const { source, destination, type } = result;
    if (!destination || source.index === destination.index) return;
    if (type === 'groups') return reorderGroups(source.index, destination.index);
    if (type.startsWith('sub:')) {
      return reorderChildren(type.slice(4), source.index, destination.index);
    }
  };

  const toggleExpand = id =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ─── Ações ───
  const handleToggle = async item => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/${item._id}/toggle`);
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      await afterChange();
    } catch (error) {
      toast.error(error.message || 'Erro ao alterar visibilidade');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async item => {
    const kind = item.parent ? 'a subcategoria' : 'a categoria';
    if (!window.confirm(`Excluir ${kind} "${item.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setBusy(true);
    try {
      const { data } = await axios.delete(`${API}/${item._id}`);
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      await afterChange();
    } catch (error) {
      toast.error(error.message || 'Erro ao excluir', { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };

  // ─── Modal ───
  const openCreate = parent => {
    setEditing(null);
    setForm(emptyForm(parent?._id));
    setSlugTouched(false);
    setModalOpen(true);
    if (parent) setExpanded(prev => new Set(prev).add(parent._id));
  };

  const openEdit = item => {
    setEditing(item);
    setForm({
      ...emptyForm(item.parent ? String(item.parent) : ''),
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      isActive: item.isActive !== false,
      showOnHome: item.showOnHome !== false,
      isTagGroup: !!item.isTagGroup,
      tagKey: item.tagKey || '',
      imagePreview: item.image || '',
    });
    setSlugTouched(true);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const isGroupForm = !form.parent;

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleNameChange = name => {
    setForm(prev => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : generateSlug(name, !prev.parent),
    }));
  };

  const handleParentChange = parent => {
    setForm(prev => ({
      ...prev,
      parent,
      slug: slugTouched ? prev.slug : generateSlug(prev.name, !parent),
    }));
  };

  const handleImage = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    const compressed = await compressImage(file);
    setForm(prev => ({
      ...prev,
      imageFile: compressed,
      imagePreview: URL.createObjectURL(compressed),
      removeImage: false,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome');
      return;
    }

    // Aviso quando o endereço muda (atualiza produtos, cupons, tabelas)
    if (editing && form.slug !== editing.slug && editing.productCount > 0) {
      const ok = window.confirm(
        `O endereço vai mudar de "/${editing.slug}" para "/${form.slug}". ` +
          `Os ${editing.productCount} produto(s) desta categoria serão atualizados automaticamente. Continuar?`,
      );
      if (!ok) return;
    }
    if (
      editing &&
      editing.parent &&
      String(editing.parent) !== String(form.parent) &&
      editing.productCount > 0
    ) {
      const target = groups.find(g => g._id === form.parent);
      const ok = window.confirm(
        `Mover "${editing.name}" para "${target?.name}"? ` +
          `Os ${editing.productCount} produto(s) dela passam para a categoria ${target?.name}.`,
      );
      if (!ok) return;
    }

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('slug', form.slug.trim());
    fd.append('parent', form.parent || '');
    fd.append('isActive', String(form.isActive));
    if (isGroupForm) {
      fd.append('description', form.description);
      fd.append('showOnHome', String(form.showOnHome));
      fd.append('isTagGroup', String(form.isTagGroup));
      fd.append('tagKey', form.tagKey);
      if (form.imageFile) fd.append('image', form.imageFile);
      if (form.removeImage) fd.append('removeImage', 'true');
    }

    setSaving(true);
    try {
      const { data } = editing
        ? await axios.put(`${API}/${editing._id}`, fd)
        : await axios.post(API, fd);
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      setModalOpen(false);
      setEditing(null);
      await afterChange();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  const hasOrphans = orphans.groups.length > 0 || orphans.categories.length > 0;
  const editingIsGroupWithChildren =
    editing && !editing.parent && childrenOf(editing._id).length > 0;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-5xl mx-auto'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Categorias</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Organize as categorias e subcategorias da loja — menu, página inicial e cadastro de produtos
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <a
              href='/'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-all'
            >
              <ExternalLink className='w-4 h-4' />
              Ver na loja
            </a>
            <button
              onClick={() => openCreate(null)}
              className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
            >
              <Plus className='w-5 h-5' />
              Nova Categoria
            </button>
          </div>
        </div>

        {/* Resumo */}
        {!loading && (
          <div className='flex items-start gap-3 p-4 mb-5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600'>
            <Info className='w-4 h-4 mt-0.5 flex-shrink-0 text-primary' />
            <p>
              <strong className='text-gray-900'>
                {groups.length} categorias · {totalSubs} subcategorias
              </strong>
              {hiddenCount > 0 && <> · {hiddenCount} oculta(s)</>}. A ordem desta lista é a ordem do
              menu e da página inicial — arraste pela alça (ou use as setas). Clique numa categoria
              para ver e ordenar as subcategorias.
            </p>
          </div>
        )}

        {/* Produtos com categoria desconhecida */}
        {!loading && hasOrphans && (
          <div className='flex items-start gap-3 p-4 mb-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800'>
            <AlertTriangle className='w-4 h-4 mt-0.5 flex-shrink-0' />
            <div>
              <p className='font-semibold'>Produtos com categoria que não existe neste painel</p>
              <p className='mt-1'>
                {[
                  ...orphans.groups.map(o => `categoria "${o.slug}" (${o.count})`),
                  ...orphans.categories.map(o => `subcategoria "${o.slug}" (${o.count})`),
                ].join(' · ')}
              </p>
              <p className='mt-1 text-amber-700'>
                Crie a categoria com esse endereço ou edite esses produtos para uma categoria existente.
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className='flex items-center justify-center py-24 text-gray-400'>
            <Loader2 className='w-6 h-6 animate-spin' />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='groups' type='groups'>
              {provided => (
                <ul ref={provided.innerRef} {...provided.droppableProps}>
                  {groups.map((group, index) => (
                    <GroupCard
                      key={group._id}
                      group={group}
                      index={index}
                      total={groups.length}
                      subs={childrenOf(group._id)}
                      busy={busy}
                      expanded={expanded.has(group._id)}
                      onExpand={toggleExpand}
                      onMove={(from, delta) => reorderGroups(from, from + delta)}
                      onMoveChild={reorderChildren}
                      onAddChild={openCreate}
                      onEdit={openEdit}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* ═══ MODAL — criar / editar ═══ */}
      {modalOpen && (
        <div
          className='fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto'
          onMouseDown={e => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <form
            onSubmit={handleSubmit}
            className='bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8'
          >
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <h2 className='text-lg font-bold text-gray-900'>
                {editing
                  ? `Editar ${editing.parent ? 'subcategoria' : 'categoria'}`
                  : form.parent
                    ? 'Nova subcategoria'
                    : 'Nova categoria'}
              </h2>
              <button
                type='button'
                onClick={closeModal}
                className='p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='px-6 py-5 space-y-4'>
              {/* Nível */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  {editing ? 'Dentro de' : 'Tipo'}
                </label>
                {editing && !editing.parent ? (
                  <p className='text-sm text-gray-500'>Categoria principal</p>
                ) : (
                  <select
                    value={form.parent}
                    onChange={e => handleParentChange(e.target.value)}
                    className={inputClass}
                  >
                    {!editing && <option value=''>Categoria principal</option>}
                    {regularGroups.map(g => (
                      <option key={g._id} value={g._id}>
                        Subcategoria de {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Nome</label>
                <input
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder={isGroupForm ? 'Ex: Wetsuits' : 'Ex: Deck Ubatuba'}
                  className={inputClass}
                  autoFocus
                  maxLength={80}
                />
              </div>

              {/* Slug */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Endereço (slug)
                </label>
                <div className='flex items-center gap-1 text-sm'>
                  <span className='text-gray-400 font-mono whitespace-nowrap'>
                    {isGroupForm ? '/collections/' : '/products/'}
                  </span>
                  <input
                    value={form.slug}
                    onChange={e => {
                      setSlugTouched(true);
                      setField('slug', e.target.value);
                    }}
                    className={`${inputClass} font-mono`}
                    maxLength={80}
                  />
                </div>
                {editing && form.slug !== editing.slug && (
                  <p className='mt-1.5 text-xs text-amber-700'>
                    Os links antigos deixam de funcionar. Produtos, cupons e tabelas de preço desta
                    categoria são atualizados automaticamente.
                  </p>
                )}
              </div>

              {isGroupForm && (
                <>
                  {/* Descrição */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                      Descrição <span className='text-gray-400 font-normal'>(página da coleção)</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setField('description', e.target.value)}
                      rows={3}
                      maxLength={400}
                      className={inputClass}
                    />
                  </div>

                  {/* Imagem */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                      Imagem do card <span className='text-gray-400 font-normal'>(4:3, ex: 1200 × 900 px)</span>
                    </label>
                    <div className='flex items-center gap-3'>
                      <div className='w-32 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0'>
                        {form.imagePreview ||
                        (editing && !form.removeImage && STATIC_IMAGES[editing.slug]) ? (
                          <img
                            src={form.imagePreview || STATIC_IMAGES[editing?.slug]}
                            alt=''
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-gray-300'>
                            <FolderTree className='w-6 h-6' />
                          </div>
                        )}
                      </div>
                      <div className='flex flex-col gap-1.5'>
                        <label className='inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50'>
                          <Upload className='w-4 h-4' />
                          {form.imagePreview ? 'Trocar imagem' : 'Enviar imagem'}
                          <input type='file' accept='image/*' className='hidden' onChange={handleImage} />
                        </label>
                        {form.imagePreview && (
                          <button
                            type='button'
                            onClick={() =>
                              setForm(prev => ({
                                ...prev,
                                imageFile: null,
                                imagePreview: '',
                                removeImage: !!editing?.image,
                              }))
                            }
                            className='text-xs text-red-500 hover:text-red-700 text-left'
                          >
                            Remover imagem
                          </button>
                        )}
                        {!form.imagePreview && editing && STATIC_IMAGES[editing.slug] && (
                          <p className='text-xs text-gray-400'>Usando a imagem padrão do site</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coleção por tag */}
                  <div className='rounded-xl border border-gray-200 p-3'>
                    <label className='flex items-start gap-3 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={form.isTagGroup}
                        disabled={editingIsGroupWithChildren}
                        onChange={e => setField('isTagGroup', e.target.checked)}
                        className='mt-1'
                      />
                      <span>
                        <span className='block text-sm font-medium text-gray-800'>Coleção por tag</span>
                        <span className='block text-xs text-gray-500'>
                          Junta produtos de várias categorias que tenham a tag (como SUP, Bodyboard e Outlet).
                          Não tem subcategorias.
                        </span>
                      </span>
                    </label>
                    {form.isTagGroup && (
                      <div className='mt-3'>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>Tag</label>
                        <input
                          value={form.tagKey}
                          onChange={e => setField('tagKey', e.target.value)}
                          placeholder={form.slug || 'ex: sup'}
                          className={`${inputClass} font-mono`}
                        />
                        <p className='mt-1 text-xs text-gray-400'>
                          No cadastro do produto, marque esta tag para o produto aparecer nesta coleção.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Home */}
                  {!form.isTagGroup && (
                    <label className='flex items-center gap-3 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={form.showOnHome}
                        onChange={e => setField('showOnHome', e.target.checked)}
                      />
                      <span className='text-sm text-gray-700'>
                        Mostrar na grade de coleções da página inicial
                      </span>
                    </label>
                  )}
                </>
              )}

              {/* Visível */}
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                />
                <span className='text-sm text-gray-700'>Visível na loja</span>
              </label>
            </div>

            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl'>
              <button
                type='button'
                onClick={closeModal}
                disabled={saving}
                className='px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={saving}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-60'
              >
                {saving && <Loader2 className='w-4 h-4 animate-spin' />}
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Categories;
