// client/src/pages/seller/Banners.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🖼️ BANNERS DA HERO — painel admin (/seller/banners)
// ═══════════════════════════════════════════════════════════════════════
// O admin gere aqui o carrossel do topo da página inicial:
//   • criar / editar banner: imagem para desktop, imagem para telemóvel,
//     textos opcionais sobre a imagem, link e período de exibição;
//   • ORDENAR arrastando pela alça (ou com as setas);
//   • ativar / desativar e excluir.
//
// Sem banners ativos, a loja mostra os 2 banners originais do site. Com a
// lista vazia, "Importar banners atuais" traz esses 2 para o painel.
//
// As imagens são reduzidas no browser antes do envio (a Vercel recusa
// pedidos acima de ~4,5 MB) e entregues pelo Cloudinary já otimizadas.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import {
  Plus,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Power,
  X,
  Upload,
  Monitor,
  Smartphone,
  Images,
  ExternalLink,
  Link2,
  AlertTriangle,
  CalendarClock,
  Download,
  Info,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { compressImage } from '../../utils/imageCompression';
import { optimizedImage, resetHeroBanners } from '../../utils/heroBanners';

const API = '/api/seller/banners';

// Medidas recomendadas (a hero ocupa quase o ecrã inteiro)
const SIZE_HINTS = {
  desktop: '1920 × 1080 px, horizontal (JPG ou WebP)',
  mobile: '1080 × 1620 px, vertical (JPG ou WebP)',
};

// Redução no browser antes do envio
const COMPRESSION = {
  image: { maxDimension: 2560, quality: 0.86 },
  mobileImage: { maxDimension: 1440, quality: 0.86 },
};
const COMPRESSION_STRONG = {
  image: { maxDimension: 1920, quality: 0.76 },
  mobileImage: { maxDimension: 1200, quality: 0.76 },
};
// A Vercel recusa pedidos acima de ~4,5 MB; deixamos margem
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

const STATUS_META = {
  active: { label: 'No ar', cls: 'bg-green-50 text-green-700' },
  inactive: { label: 'Inativo', cls: 'bg-gray-100 text-gray-500' },
  scheduled: { label: 'Agendado', cls: 'bg-blue-50 text-blue-600' },
  expired: { label: 'Expirado', cls: 'bg-amber-50 text-amber-700' },
};

const toInputDateTime = value => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDate = value =>
  value
    ? new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const emptyForm = () => ({
  title: '',
  heading: '',
  subtitle: '',
  link: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
});

const thumb = url => optimizedImage(url, 640);

// ─────────────────────────────────────────────────────────────────────
// Pré-visualização: mostra o recorte e os textos como ficam na loja
// ─────────────────────────────────────────────────────────────────────
const HeroPreview = ({ src, heading, subtitle, mobile }) => {
  const hasText = !!(heading || subtitle);
  return (
    <div
      className='relative overflow-hidden rounded-lg bg-primary-dark'
      style={{ aspectRatio: mobile ? '390 / 640' : '1920 / 900' }}
    >
      {src ? (
        <img
          src={src}
          alt=''
          className='absolute inset-0 w-full h-full object-cover object-center'
        />
      ) : (
        <div className='absolute inset-0 flex items-center justify-center text-white/40'>
          {mobile ? (
            <Smartphone className='w-6 h-6' />
          ) : (
            <Monitor className='w-8 h-8' />
          )}
        </div>
      )}
      {src && (
        <div
          className={`absolute inset-0 ${
            hasText
              ? 'bg-gradient-to-t from-black/70 via-black/20 to-black/30'
              : 'bg-gradient-to-b from-black/35 via-black/5 to-transparent'
          }`}
        />
      )}
      {src && hasText && (
        <div
          className={`absolute inset-x-0 bottom-0 text-white ${
            mobile ? 'p-2.5' : 'p-4 md:p-6'
          }`}
        >
          {heading && (
            <p
              className={`font-semibold italic leading-tight whitespace-pre-line ${
                mobile ? 'text-[11px]' : 'text-base md:text-2xl'
              }`}
            >
              {heading}
            </p>
          )}
          {subtitle && (
            <p
              className={`uppercase font-light text-white/90 ${
                mobile
                  ? 'mt-1 text-[7px] tracking-[0.2em]'
                  : 'mt-2 text-[10px] md:text-xs tracking-[0.3em]'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Linha de um banner (arrastável pela alça)
// ─────────────────────────────────────────────────────────────────────
const BannerRow = ({
  banner,
  index,
  total,
  busy,
  onMove,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const status = STATUS_META[banner.status] || STATUS_META.active;
  return (
    <Draggable draggableId={banner._id} index={index} isDragDisabled={busy}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`mb-3 bg-white rounded-xl border ${
            snapshot.isDragging ? 'border-primary shadow-xl' : 'border-gray-200'
          } ${banner.status === 'active' ? '' : 'opacity-75'}`}
        >
          <div className='flex items-stretch'>
            {/* Alça + setas (alternativa sem arrastar) */}
            <div className='flex flex-col items-center justify-center gap-0.5 px-1.5 border-r border-gray-100'>
              <button
                type='button'
                onClick={() => onMove(index, -1)}
                disabled={busy || index === 0}
                aria-label={`Mover ${banner.title} para cima`}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300'
              >
                <ChevronUp className='w-4 h-4' />
              </button>
              {/* <span> e não <button>: a biblioteca ignora arrastos
                  iniciados em elementos interativos */}
              <span
                {...provided.dragHandleProps}
                aria-label={`Arrastar ${banner.title}`}
                className='p-1 rounded text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              >
                <GripVertical className='w-5 h-5' />
              </span>
              <button
                type='button'
                onClick={() => onMove(index, 1)}
                disabled={busy || index === total - 1}
                aria-label={`Mover ${banner.title} para baixo`}
                className='p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300'
              >
                <ChevronDown className='w-4 h-4' />
              </button>
            </div>

            <div className='flex-1 min-w-0 flex flex-col sm:flex-row gap-4 p-4'>
              {/* Miniaturas: desktop + telemóvel */}
              <div className='flex items-end gap-2 flex-shrink-0'>
                <div className='w-40 sm:w-48'>
                  <div
                    className='relative overflow-hidden rounded-lg bg-gray-100 border border-gray-200'
                    style={{ aspectRatio: '1920 / 900' }}
                  >
                    <img
                      src={thumb(banner.image)}
                      alt=''
                      loading='lazy'
                      className='absolute inset-0 w-full h-full object-cover'
                    />
                  </div>
                </div>
                <div className='w-12'>
                  <div
                    className='relative overflow-hidden rounded-md bg-gray-100 border border-gray-200'
                    style={{ aspectRatio: '390 / 640' }}
                  >
                    <img
                      src={thumb(banner.mobileImage || banner.image)}
                      alt=''
                      loading='lazy'
                      className='absolute inset-0 w-full h-full object-cover'
                    />
                  </div>
                </div>
              </div>

              {/* Dados */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span className='text-xs font-bold text-gray-400 flex-shrink-0'>
                    {index + 1}º
                  </span>
                  <p
                    className='font-semibold text-gray-900 truncate min-w-0'
                    title={banner.title}
                  >
                    {banner.title}
                  </p>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${status.cls}`}
                  >
                    {status.label}
                  </span>
                </div>

                {(banner.heading || banner.subtitle) && (
                  <p className='text-sm text-gray-600 mt-1 truncate'>
                    {[banner.heading.replace(/\n/g, ' '), banner.subtitle]
                      .filter(Boolean)
                      .join(' / ')}
                  </p>
                )}

                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500'>
                  {banner.link ? (
                    <span className='inline-flex items-center gap-1 max-w-full'>
                      <Link2 className='w-3.5 h-3.5 flex-shrink-0' />
                      <span className='truncate'>{banner.link}</span>
                    </span>
                  ) : (
                    <span className='text-gray-400'>sem link</span>
                  )}
                  {(banner.startsAt || banner.endsAt) && (
                    <span className='inline-flex items-center gap-1'>
                      <CalendarClock className='w-3.5 h-3.5' />
                      {banner.startsAt ? `de ${fmtDate(banner.startsAt)}` : ''}
                      {banner.endsAt ? ` até ${fmtDate(banner.endsAt)}` : ''}
                    </span>
                  )}
                  {!banner.mobileImage && (
                    <span className='inline-flex items-center gap-1 text-amber-600'>
                      <AlertTriangle className='w-3.5 h-3.5' />
                      sem imagem para celular
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className='flex items-center gap-1 flex-shrink-0 self-start sm:self-center'>
                <button
                  type='button'
                  onClick={() => onToggle(banner)}
                  disabled={busy}
                  title={banner.isActive ? 'Desativar' : 'Ativar'}
                  aria-label={
                    banner.isActive
                      ? `Desativar ${banner.title}`
                      : `Ativar ${banner.title}`
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    banner.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Power className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => onEdit(banner)}
                  disabled={busy}
                  title='Editar'
                  aria-label={`Editar ${banner.title}`}
                  className='p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors'
                >
                  <Edit2 className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => onDelete(banner)}
                  disabled={busy}
                  title='Excluir'
                  aria-label={`Excluir ${banner.title}`}
                  className='p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>
        </li>
      )}
    </Draggable>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Campo de envio de imagem
// ─────────────────────────────────────────────────────────────────────
const ImageField = ({
  label,
  hint,
  icon,
  required,
  hasImage,
  onPick,
  onRemove,
  disabled,
}) => {
  const Icon = icon;
  const inputRef = useRef(null);
  return (
    <div>
      <p className='text-sm font-medium text-gray-700 flex items-center gap-1.5'>
        <Icon className='w-4 h-4 text-gray-400' />
        {label}
        {required ? (
          <span className='text-red-500'>*</span>
        ) : (
          <span className='text-gray-400 font-normal'>(opcional)</span>
        )}
      </p>
      <p className='text-[11px] text-gray-500 mt-0.5 mb-2'>{hint}</p>
      <div className='flex flex-wrap items-center gap-2'>
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className='inline-flex items-center gap-2 px-3.5 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50'
        >
          <Upload className='w-4 h-4' />
          {hasImage ? 'Trocar imagem' : 'Escolher imagem'}
        </button>
        {hasImage && onRemove && (
          <button
            type='button'
            onClick={onRemove}
            disabled={disabled}
            className='text-xs text-gray-500 hover:text-red-600 underline underline-offset-2'
          >
            Remover
          </button>
        )}
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = ''; // permite escolher o mesmo ficheiro de novo
            if (file) onPick(file);
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════
const Banners = () => {
  const { axios } = useAppContext();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Formulário (modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [files, setFiles] = useState({ image: null, mobileImage: null });
  const [previews, setPreviews] = useState({ image: '', mobileImage: '' });
  const [removeMobile, setRemoveMobile] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await axios.get(API);
      if (data.success) setBanners(data.banners);
      else toast.error(data.message || 'Erro ao carregar os banners');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Erro ao carregar os banners',
      );
    } finally {
      setLoading(false);
    }
  }, [axios]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // liberta as pré-visualizações locais ao sair
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  useEffect(
    () => () => {
      Object.values(previewsRef.current).forEach(url => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const liveCount = useMemo(
    () => banners.filter(b => b.status === 'active').length,
    [banners],
  );

  // Depois de qualquer alteração: a loja (neste browser) relê os banners
  const afterChange = () => resetHeroBanners();

  // ─── Modal ───
  const setPreview = (field, url) =>
    setPreviews(current => {
      if (current[field]?.startsWith('blob:'))
        URL.revokeObjectURL(current[field]);
      return { ...current, [field]: url };
    });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFiles({ image: null, mobileImage: null });
    setPreview('image', '');
    setPreview('mobileImage', '');
    setRemoveMobile(false);
    setModalOpen(true);
  };

  const openEdit = banner => {
    setEditing(banner);
    setForm({
      title: banner.title || '',
      heading: banner.heading || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '',
      startsAt: toInputDateTime(banner.startsAt),
      endsAt: toInputDateTime(banner.endsAt),
      isActive: banner.isActive !== false,
    });
    setFiles({ image: null, mobileImage: null });
    setPreview('image', banner.image ? optimizedImage(banner.image, 1280) : '');
    setPreview(
      'mobileImage',
      banner.mobileImage ? optimizedImage(banner.mobileImage, 640) : '',
    );
    setRemoveMobile(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const setField = (key, value) =>
    setForm(current => ({ ...current, [key]: value }));

  const pickFile = (field, file) => {
    if (!file.type.startsWith('image/'))
      return toast.error('Escolha um arquivo de imagem.');
    setFiles(current => ({ ...current, [field]: file }));
    setPreview(field, URL.createObjectURL(file));
    if (field === 'mobileImage') setRemoveMobile(false);
  };

  const removeMobileImage = () => {
    setFiles(current => ({ ...current, mobileImage: null }));
    setPreview('mobileImage', '');
    setRemoveMobile(true);
  };

  // Reduz as imagens no browser; se o pedido ainda ficar acima do limite
  // da Vercel, tenta uma redução mais forte
  const prepareImages = async () => {
    const reduce = async settings => {
      const out = {};
      for (const field of ['image', 'mobileImage']) {
        if (files[field])
          out[field] = await compressImage(files[field], settings[field]);
      }
      return out;
    };
    const size = set =>
      Object.values(set).reduce((sum, file) => sum + (file?.size || 0), 0);

    let prepared = await reduce(COMPRESSION);
    if (size(prepared) > MAX_REQUEST_BYTES)
      prepared = await reduce(COMPRESSION_STRONG);
    if (size(prepared) > MAX_REQUEST_BYTES)
      throw new Error(
        'As imagens são grandes demais para enviar. Exporte-as em JPG com até 2 MB cada e tente de novo.',
      );
    return prepared;
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Dê um nome ao banner.');
    if (!editing && !files.image)
      return toast.error('Escolha a imagem para desktop.');
    if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt)
      return toast.error('A data de fim deve ser posterior à de início.');

    try {
      setSaving(true);
      const prepared = await prepareImages();

      const body = new FormData();
      body.append('title', form.title.trim());
      body.append('heading', form.heading);
      body.append('subtitle', form.subtitle.trim());
      body.append('link', form.link.trim());
      body.append('isActive', String(form.isActive));
      body.append(
        'startsAt',
        form.startsAt ? new Date(form.startsAt).toISOString() : '',
      );
      body.append(
        'endsAt',
        form.endsAt ? new Date(form.endsAt).toISOString() : '',
      );
      if (prepared.image) body.append('image', prepared.image);
      if (prepared.mobileImage)
        body.append('mobileImage', prepared.mobileImage);
      if (editing && removeMobile && !prepared.mobileImage)
        body.append('removeMobileImage', 'true');

      const { data } = editing
        ? await axios.put(`${API}/${editing._id}`, body)
        : await axios.post(API, body);

      if (data.success) {
        toast.success(data.message);
        setModalOpen(false);
        setEditing(null);
        afterChange();
        fetchBanners();
      } else {
        toast.error(data.message || 'Erro ao salvar o banner');
      }
    } catch (error) {
      toast.error(
        error.response?.status === 413
          ? 'As imagens são grandes demais para enviar. Reduza-as e tente de novo.'
          : error.response?.data?.message ||
              error.message ||
              'Erro ao salvar o banner',
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Ordem ───
  const saveOrder = async (next, previous) => {
    setBanners(next);
    try {
      setBusy(true);
      const { data } = await axios.put(`${API}/reorder`, {
        ids: next.map(b => b._id),
      });
      if (!data.success) throw new Error(data.message);
      afterChange();
    } catch (error) {
      setBanners(previous);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Não foi possível salvar a ordem',
      );
    } finally {
      setBusy(false);
    }
  };

  const reorder = (from, to) => {
    if (to < 0 || to >= banners.length || from === to) return;
    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveOrder(next, banners);
  };

  const handleDragEnd = result => {
    if (!result.destination) return;
    reorder(result.source.index, result.destination.index);
  };

  // ─── Ativar / excluir / importar ───
  const handleToggle = async banner => {
    try {
      setBusy(true);
      const { data } = await axios.post(`${API}/${banner._id}/toggle`);
      if (data.success) {
        toast.success(data.message);
        afterChange();
        fetchBanners();
      } else toast.error(data.message || 'Erro ao alterar o banner');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao alterar o banner');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async banner => {
    if (
      !window.confirm(
        `Excluir o banner "${banner.title}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      setBusy(true);
      const { data } = await axios.delete(`${API}/${banner._id}`);
      if (data.success) {
        toast.success(data.message);
        afterChange();
        fetchBanners();
      } else toast.error(data.message || 'Erro ao excluir o banner');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao excluir o banner');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    try {
      setBusy(true);
      const { data } = await axios.post(`${API}/import-defaults`);
      if (data.success) {
        toast.success(data.message);
        setBanners(data.banners);
        afterChange();
      } else toast.error(data.message || 'Erro ao importar');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao importar');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='p-6 md:p-8 max-w-5xl mx-auto'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Banners</h1>
            <p className='text-sm text-gray-500 mt-1'>
              Carrossel do topo da página inicial, no desktop e no celular
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
              onClick={openCreate}
              className='flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm'
            >
              <Plus className='w-5 h-5' />
              Novo Banner
            </button>
          </div>
        </div>

        {/* Como funciona */}
        {!loading && banners.length > 0 && (
          <div className='flex items-start gap-3 p-4 mb-5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600'>
            <Info className='w-4 h-4 mt-0.5 flex-shrink-0 text-primary' />
            <p>
              {liveCount > 0 ? (
                <>
                  <strong className='text-gray-900'>
                    {liveCount} {liveCount === 1 ? 'banner' : 'banners'} no ar
                  </strong>
                  , exibidos na ordem desta lista. Arraste pela alça (ou use as
                  setas) para mudar a ordem.
                </>
              ) : (
                <>
                  <strong className='text-gray-900'>
                    Nenhum banner no ar.
                  </strong>{' '}
                  Enquanto não houver um banner ativo, a loja mostra os 2
                  banners originais do site.
                </>
              )}
            </p>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className='flex items-center justify-center py-24 text-gray-400'>
            <Loader2 className='w-6 h-6 animate-spin' />
          </div>
        ) : banners.length === 0 ? (
          <div className='bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center'>
            <Images className='w-10 h-10 mx-auto text-gray-300' />
            <p className='mt-3 font-semibold text-gray-900'>
              Nenhum banner cadastrado
            </p>
            <p className='mt-1 text-sm text-gray-500 max-w-md mx-auto'>
              A loja está mostrando os 2 banners originais do site. Importe-os
              para os poder reordenar, editar ou substituir, ou comece por um
              banner novo.
            </p>
            <div className='mt-5 flex flex-wrap items-center justify-center gap-2'>
              <button
                onClick={handleImport}
                disabled={busy}
                className='inline-flex items-center gap-2 px-4 py-2.5 bg-white text-primary border border-primary/30 rounded-xl font-semibold hover:bg-primary/5 transition-all disabled:opacity-60'
              >
                {busy ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Download className='w-4 h-4' />
                )}
                Importar banners atuais
              </button>
              <button
                onClick={openCreate}
                className='inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all'
              >
                <Plus className='w-4 h-4' />
                Novo Banner
              </button>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='hero-banners'>
              {provided => (
                <ul ref={provided.innerRef} {...provided.droppableProps}>
                  {banners.map((banner, index) => (
                    <BannerRow
                      key={banner._id}
                      banner={banner}
                      index={index}
                      total={banners.length}
                      busy={busy}
                      onMove={(from, delta) => reorder(from, from + delta)}
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
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby='banner-form-title'
            className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6'
          >
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <h2
                id='banner-form-title'
                className='text-lg font-bold text-gray-900'
              >
                {editing ? 'Editar banner' : 'Novo banner'}
              </h2>
              <button
                onClick={closeModal}
                aria-label='Fechar'
                className='p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='px-6 py-5 space-y-6'>
              {/* Nome */}
              <div>
                <label
                  htmlFor='banner-title'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Nome do banner <span className='text-red-500'>*</span>
                </label>
                <input
                  id='banner-title'
                  type='text'
                  value={form.title}
                  maxLength={160}
                  onChange={e => setField('title', e.target.value)}
                  placeholder='Ex.: Coleção de decks Verão 2027'
                  className={inputCls}
                />
                <p className='text-[11px] text-gray-500 mt-1'>
                  Identifica o banner nesta lista e descreve a imagem para o
                  Google e para leitores de tela. Não aparece sobre a imagem.
                </p>
              </div>

              {/* Imagens + pré-visualização */}
              <section className='grid grid-cols-1 md:grid-cols-[1fr_170px] gap-5'>
                <div className='space-y-3'>
                  <ImageField
                    label='Imagem para desktop'
                    hint={`Recomendado: ${SIZE_HINTS.desktop}`}
                    icon={Monitor}
                    required
                    hasImage={!!previews.image}
                    onPick={file => pickFile('image', file)}
                    disabled={saving}
                  />
                  <HeroPreview
                    src={previews.image}
                    heading={form.heading}
                    subtitle={form.subtitle}
                  />
                </div>
                <div className='space-y-3'>
                  <ImageField
                    label='Para celular'
                    hint={`Recomendado: ${SIZE_HINTS.mobile}`}
                    icon={Smartphone}
                    hasImage={!!previews.mobileImage}
                    onPick={file => pickFile('mobileImage', file)}
                    onRemove={removeMobileImage}
                    disabled={saving}
                  />
                  <HeroPreview
                    mobile
                    src={previews.mobileImage || previews.image}
                    heading={form.heading}
                    subtitle={form.subtitle}
                  />
                </div>
              </section>

              <div className='flex items-start gap-2 text-[12px] text-gray-500 -mt-2'>
                <Info className='w-3.5 h-3.5 mt-0.5 flex-shrink-0' />
                <p>
                  A hero ocupa quase a tela inteira e o recorte varia com o
                  tamanho da tela: mantenha o assunto principal no centro da
                  imagem.
                  {!previews.mobileImage && previews.image && (
                    <span className='block text-amber-600 mt-1'>
                      Sem imagem própria, o celular mostra um recorte da
                      imagem de desktop (veja a pré-visualização).
                    </span>
                  )}
                </p>
              </div>

              {/* Textos */}
              <section className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='banner-heading'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Texto principal{' '}
                    <span className='text-gray-400 font-normal'>(opcional)</span>
                  </label>
                  <textarea
                    id='banner-heading'
                    rows={2}
                    value={form.heading}
                    maxLength={120}
                    onChange={e => setField('heading', e.target.value)}
                    placeholder={'Precision Meets\nPerformance'}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div>
                  <label
                    htmlFor='banner-subtitle'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Texto secundário{' '}
                    <span className='text-gray-400 font-normal'>(opcional)</span>
                  </label>
                  <input
                    id='banner-subtitle'
                    type='text'
                    value={form.subtitle}
                    maxLength={80}
                    onChange={e => setField('subtitle', e.target.value)}
                    placeholder='Elite Surfing'
                    className={inputCls}
                  />
                  <p className='text-[11px] text-gray-500 mt-1'>
                    Deixe os dois vazios se a imagem já tiver texto: assim ela
                    não é escurecida.
                  </p>
                </div>
              </section>

              {/* Link */}
              <div>
                <label
                  htmlFor='banner-link'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Link ao clicar{' '}
                  <span className='text-gray-400 font-normal'>(opcional)</span>
                </label>
                <input
                  id='banner-link'
                  type='text'
                  value={form.link}
                  maxLength={500}
                  onChange={e => setField('link', e.target.value)}
                  placeholder='/collections/decks'
                  className={inputCls}
                />
                <p className='text-[11px] text-gray-500 mt-1'>
                  Caminho do site (ex.: /collections/decks, /products) ou um
                  endereço completo começado por https://
                </p>
              </div>

              {/* Período + ativo */}
              <section className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='banner-starts'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Exibir a partir de{' '}
                    <span className='text-gray-400 font-normal'>(opcional)</span>
                  </label>
                  <input
                    id='banner-starts'
                    type='datetime-local'
                    value={form.startsAt}
                    onChange={e => setField('startsAt', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor='banner-ends'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Exibir até{' '}
                    <span className='text-gray-400 font-normal'>(opcional)</span>
                  </label>
                  <input
                    id='banner-ends'
                    type='datetime-local'
                    value={form.endsAt}
                    onChange={e => setField('endsAt', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </section>

              <label className='flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                  className='mt-0.5 w-4 h-4 accent-primary'
                />
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    Banner ativo
                  </p>
                  <p className='text-[11px] text-gray-500'>
                    Desligado: o banner fica guardado mas não aparece na loja.
                  </p>
                </div>
              </label>
            </div>

            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100'>
              <button
                onClick={closeModal}
                disabled={saving}
                className='px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100'
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60'
              >
                {saving && <Loader2 className='w-4 h-4 animate-spin' />}
                {saving
                  ? 'Enviando...'
                  : editing
                    ? 'Salvar alterações'
                    : 'Criar banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
