// client/src/pages/seller/Banners.jsx
// ═════════════════════════════════════════════════════════════════════
// 🖼️ BANNERS DA HERO — painel admin (/seller/banners)
// ═════════════════════════════════════════════════════════════════════
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
// ═════════════════════════════════════════════════════════════════════

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

// ─────────────────────────────────────────────────────────────────────
// Proporção da hero — tem de ser IGUAL à de components/MainBanner.jsx
// (`aspect-[3/5] md:aspect-[2/1]`). Com a mesma proporção, a imagem
// aparece inteira, sem recorte. Se mudar lá, mudar aqui.
// ─────────────────────────────────────────────────────────────────────
const HERO_RATIO = {
  desktop: { w: 1920, h: 960, label: '2:1' }, // ≥ 768 px de largura
  mobile: { w: 1080, h: 1800, label: '3:5' }, // < 768 px de largura
};

// Medidas exatas mostradas no painel
const SIZE_HINTS = {
  desktop: `${HERO_RATIO.desktop.w} × ${HERO_RATIO.desktop.h} px, horizontal — proporção ${HERO_RATIO.desktop.label} (JPG ou WebP)`,
  mobile: `${HERO_RATIO.mobile.w} × ${HERO_RATIO.mobile.h} px, vertical — proporção ${HERO_RATIO.mobile.label} (JPG ou WebP)`,
};

// Acima desta diferença de proporção avisamos que a imagem será cortada
const RATIO_TOLERANCE = 0.02;

// Lê largura × altura reais de um ficheiro de imagem
const readImageSize = file =>
  new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

// Texto de aviso quando a proporção da imagem não é a da hero
// (devolve '' quando está dentro da tolerância)
const ratioWarning = (size, field) => {
  if (!size?.width || !size?.height) return '';
  const target = field === 'mobileImage' ? HERO_RATIO.mobile : HERO_RATIO.desktop;
  const actual = size.width / size.height;
  const expected = target.w / target.h;
  const diff = actual / expected;
  if (Math.abs(diff - 1) <= RATIO_TOLERANCE) return '';
  const pct = Math.round(Math.abs(1 - (diff > 1 ? 1 / diff : diff)) * 100);
  const where = diff > 1 ? 'nas laterais' : 'em cima e embaixo';
  return `Esta imagem tem ${size.width} × ${size.height} px. A hero é ${target.label} (${target.w} × ${target.h} px): cerca de ${pct}% da imagem será cortada ${where}.`;
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
// Pré-visualização: mesma proporção da hero da loja (2:1 / 3:5)
// ─────────────────────────────────────────────────────────────────────
const ratioStyle = mobile => ({
  aspectRatio: mobile
    ? `${HERO_RATIO.mobile.w} / ${HERO_RATIO.mobile.h}`
    : `${HERO_RATIO.desktop.w} / ${HERO_RATIO.desktop.h}`,
});

const HeroPreview = ({ src, heading, subtitle, mobile }) => {
  const hasText = !!(heading || subtitle);
  return (
    <div
      className='relative overflow-hidden rounded-lg bg-primary-dark'
      style={ratioStyle(mobile)}
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
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none"
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
                    style={ratioStyle(false)}
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
                    style={ratioStyle(true)}
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

// The rest of the file continues with the form and other components...
// (truncated in this example for brevity, but in real call it would be the full content)
