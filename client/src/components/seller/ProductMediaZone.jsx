// client/src/components/seller/ProductMediaZone.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🖼️🎥 MÍDIA DO PRODUTO — imagens + vídeos MP4 numa só zona, com ordem livre
// ─────────────────────────────────────────────────────────────────────
// Usado no Adicionar Produto e no modal Editar Produto.
// Cada item do array `media` é:
//   { type: 'existing', url }  ← imagem já salva no servidor
//   { type: 'new', file }      ← imagem nova (sobe junto com o produto)
//   { type: 'video', url }     ← vídeo MP4 (já enviado ao Cloudinary)
//
// A ordem do array é a ordem da galeria na loja. Os vídeos vão direto do
// browser para o Cloudinary (upload assinado em
// POST /api/product/video/sign-upload) — não passam pelo limite de ~4.5MB
// da Vercel. A 1ª IMAGEM da lista é a capa (cards, listagens, SEO).
// ═══════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, GripVertical, Image as ImageIcon, Video } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  MAX_PRODUCT_VIDEOS,
  getVideoPoster,
  isImageItem,
  isVideoItem,
} from '../../utils/productMedia';

const MAX_IMAGES = 8;
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

// Preview estável para File (evita criar um objectURL novo a cada render)
const previewCache = new WeakMap();
const filePreview = file => {
  if (!previewCache.has(file)) previewCache.set(file, URL.createObjectURL(file));
  return previewCache.get(file);
};

const uploadToCloudinary = (sig, file, onProgress) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', sig.timestamp);
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', sig.uploadUrl);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json.error?.message || `Cloudinary HTTP ${xhr.status}`));
      } catch {
        reject(new Error('Resposta inválida do Cloudinary'));
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload do vídeo'));
    xhr.send(form);
  });

// Vídeo que não veio em MP4 (ex: .mov do iPhone) → Cloudinary entrega MP4/H.264
const toMp4Url = (url, format) => {
  if (String(format).toLowerCase() === 'mp4') return url;
  return url
    .replace('/video/upload/', '/video/upload/f_mp4,vc_h264/')
    .replace(/\.[^/.]+$/, '.mp4');
};

const ProductMediaZone = ({ media, setMedia, onUploadingChange, disabled = false }) => {
  const { axios } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragSourceIndex, setDragSourceIndex] = useState(null);
  const [videoUpload, setVideoUpload] = useState(null); // { name, progress }
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const uploading = videoUpload !== null;
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const imageCount = media.filter(isImageItem).length;
  const videoCount = media.filter(isVideoItem).length;
  const imageSlots = MAX_IMAGES - imageCount;
  const videoSlots = MAX_PRODUCT_VIDEOS - videoCount;
  const firstImageIndex = media.findIndex(isImageItem);

  // ─── Adicionar ficheiros (imagens entram na hora; vídeos sobem antes) ───
  const addFiles = useCallback(
    async fileList => {
      if (disabled) return;
      const files = Array.from(fileList || []);
      const images = [];
      const videos = [];

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            toast.error(`"${file.name}" excede ${MAX_IMAGE_MB}MB`);
          } else images.push(file);
        } else if (file.type.startsWith('video/')) {
          if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            toast.error(`"${file.name}" excede ${MAX_VIDEO_MB}MB`);
          } else videos.push(file);
        } else {
          toast.error(`"${file.name}" não é imagem nem vídeo`);
        }
      }

      // Imagens
      if (images.length > 0) {
        if (imageSlots <= 0) {
          toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        } else {
          const toAdd = images.slice(0, imageSlots);
          if (images.length > imageSlots) {
            toast(`Apenas ${imageSlots} imagem(ns) adicionada(s) (limite: ${MAX_IMAGES})`, {
              icon: 'ℹ️',
            });
          }
          setMedia(prev => [...prev, ...toAdd.map(file => ({ type: 'new', file }))]);
        }
      }

      // Vídeos
      if (videos.length > 0) {
        if (uploading) {
          toast.error('Aguarde o envio do vídeo atual terminar');
          return;
        }
        if (videoSlots <= 0) {
          toast.error(`Máximo de ${MAX_PRODUCT_VIDEOS} vídeos`);
          return;
        }
        const toUpload = videos.slice(0, videoSlots);
        if (videos.length > videoSlots) {
          toast(`Apenas ${videoSlots} vídeo(s) adicionado(s) (limite: ${MAX_PRODUCT_VIDEOS})`, {
            icon: 'ℹ️',
          });
        }
        try {
          for (const file of toUpload) {
            setVideoUpload({ name: file.name, progress: 0 });
            const { data: sig } = await axios.post('/api/product/video/sign-upload');
            if (!sig.success) throw new Error(sig.message || 'Erro ao autorizar upload');
            const result = await uploadToCloudinary(sig, file, progress =>
              setVideoUpload({ name: file.name, progress }),
            );
            const url = toMp4Url(result.secure_url, result.format);
            setMedia(prev =>
              prev.some(item => isVideoItem(item) && item.url === url)
                ? prev
                : [...prev, { type: 'video', url }],
            );
            toast.success(`Vídeo "${file.name}" carregado`);
          }
        } catch (error) {
          toast.error(error.message || 'Erro no upload do vídeo');
        } finally {
          setVideoUpload(null);
        }
      }
    },
    [disabled, imageSlots, videoSlots, uploading, axios, setMedia],
  );

  const removeItem = index => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Drag & Drop — zona de upload ───
  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  };
  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length > 0) addFiles(e.dataTransfer.files);
  };

  // ─── Drag & Drop — reordenar miniaturas (imagens e vídeos juntos) ───
  const handleThumbDragStart = (e, index) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };
  const handleThumbDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceIndex !== null && dragSourceIndex !== index) setDragOverIndex(index);
  };
  const handleThumbDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
      setMedia(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(dragSourceIndex, 1);
        updated.splice(targetIndex, 0, moved);
        return updated;
      });
    }
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };
  const handleThumbDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  // Mover com setas (funciona também no celular, onde não há drag)
  const moveItem = (index, dir) => {
    setMedia(prev => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const full = imageSlots <= 0 && videoSlots <= 0;
  const blocked = disabled || full;

  return (
    <div>
      <p className='text-base font-medium mb-2'>Imagens e Vídeos do Produto</p>

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!blocked ? () => fileInputRef.current?.click() : undefined}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          blocked
            ? 'border-gray-200 bg-gray-50 cursor-default'
            : isDragging
              ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg'
              : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*,video/mp4,video/quicktime,video/webm'
          multiple
          onChange={e => {
            if (e.target.files?.length > 0) addFiles(e.target.files);
            e.target.value = '';
          }}
          className='hidden'
        />

        {isDragging ? (
          <div className='py-4'>
            <Upload className='w-10 h-10 text-primary mx-auto mb-2 animate-bounce' />
            <p className='text-primary font-semibold text-lg'>Solte os arquivos aqui</p>
          </div>
        ) : full ? (
          <div className='py-2'>
            <p className='text-gray-500 font-medium'>Limite de imagens e vídeos atingido</p>
            <p className='text-xs text-gray-400 mt-1'>Remova um item para adicionar outro</p>
          </div>
        ) : (
          <div className='py-2'>
            <div className='flex items-center justify-center gap-3 mb-3'>
              <div className='w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center'>
                <ImageIcon className='w-6 h-6 text-gray-400' />
              </div>
              <div className='w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center'>
                <Video className='w-6 h-6 text-gray-400' />
              </div>
            </div>
            <p className='text-gray-700 font-medium'>
              Arraste imagens ou vídeos aqui ou{' '}
              <span className='text-primary underline'>clique para selecionar</span>
            </p>
            <p className='text-xs text-gray-400 mt-1.5'>
              Imagens: PNG, JPG ou WEBP até {MAX_IMAGE_MB}MB ({imageCount}/{MAX_IMAGES}) •
              Vídeos: MP4 ou MOV até {MAX_VIDEO_MB}MB ({videoCount}/{MAX_PRODUCT_VIDEOS})
            </p>
          </div>
        )}
      </div>

      {/* Progresso do vídeo */}
      {videoUpload && (
        <div className='mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50'>
          <p className='text-sm text-gray-700 mb-1.5 truncate'>
            Enviando vídeo "{videoUpload.name}"... {videoUpload.progress}%
          </p>
          <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className='h-full transition-all'
              style={{
                width: `${videoUpload.progress}%`,
                backgroundColor: 'var(--color-primary, #2563eb)',
              }}
            />
          </div>
        </div>
      )}

      {/* Miniaturas */}
      {media.length > 0 && (
        <div className='mt-4'>
          <div className='flex items-center justify-between mb-2 gap-2'>
            <p className='text-sm font-medium text-gray-600'>
              {imageCount} imagem{imageCount !== 1 ? 's' : ''}
              {videoCount > 0 && ` • ${videoCount} vídeo${videoCount !== 1 ? 's' : ''}`}
            </p>
            {media.length > 1 && (
              <p className='text-xs text-gray-400 text-right'>
                Arraste para ordenar a galeria • A 1ª imagem é a capa do produto
              </p>
            )}
          </div>

          <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3'>
            {media.map((item, index) => {
              const video = isVideoItem(item);
              const src = video
                ? getVideoPoster(item.url)
                : item.type === 'existing'
                  ? item.url
                  : filePreview(item.file);
              const key = video
                ? `v-${item.url}`
                : item.type === 'existing'
                  ? `e-${item.url}`
                  : `n-${item.file.name}-${item.file.size}-${item.file.lastModified}`;

              return (
                <div
                  key={key}
                  draggable={!disabled}
                  onDragStart={e => handleThumbDragStart(e, index)}
                  onDragOver={e => handleThumbDragOver(e, index)}
                  onDrop={e => handleThumbDrop(e, index)}
                  onDragEnd={handleThumbDragEnd}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-150 aspect-square bg-gray-100 ${
                    dragOverIndex === index
                      ? 'border-primary scale-105 shadow-md'
                      : dragSourceIndex === index
                        ? 'border-gray-300 opacity-40'
                        : index === firstImageIndex
                          ? 'border-primary/50 ring-1 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={src}
                    alt={video ? `Vídeo ${index + 1}` : `Imagem ${index + 1}`}
                    className={`w-full h-full object-cover ${video ? 'bg-gray-900' : ''}`}
                    draggable={false}
                  />

                  {video && (
                    <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                      <div className='w-8 h-8 rounded-full bg-black/60 flex items-center justify-center'>
                        <svg className='w-4 h-4 text-white ml-0.5' fill='currentColor' viewBox='0 0 24 24'>
                          <path d='M8 5v14l11-7z' />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Posição na galeria */}
                  <span className='absolute bottom-1 right-1 text-[10px] font-bold text-white bg-black/60 px-1.5 rounded'>
                    {index + 1}
                  </span>

                  {!disabled && (
                    <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150'>
                      <button
                        type='button'
                        onClick={e => {
                          e.stopPropagation();
                          removeItem(index);
                        }}
                        className='absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm'
                        title={video ? 'Remover vídeo' : 'Remover imagem'}
                      >
                        <X className='w-3.5 h-3.5' />
                      </button>

                      <div className='absolute bottom-1 left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                        {index > 0 && (
                          <button
                            type='button'
                            onClick={e => {
                              e.stopPropagation();
                              moveItem(index, -1);
                            }}
                            className='w-5 h-5 bg-white/90 text-gray-700 rounded flex items-center justify-center text-xs font-bold'
                            title='Mover para trás'
                          >
                            ‹
                          </button>
                        )}
                        <GripVertical className='w-4 h-4 text-white drop-shadow cursor-grab' />
                        {index < media.length - 1 && (
                          <button
                            type='button'
                            onClick={e => {
                              e.stopPropagation();
                              moveItem(index, 1);
                            }}
                            className='w-5 h-5 bg-white/90 text-gray-700 rounded flex items-center justify-center text-xs font-bold'
                            title='Mover para frente'
                          >
                            ›
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {index === firstImageIndex && (
                    <div className='absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm'>
                      Capa
                    </div>
                  )}
                  {video && (
                    <div className='absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm'>
                      Vídeo
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {media.length > 1 && !disabled && (
            <button
              type='button'
              onClick={() => setMedia([])}
              className='mt-3 text-xs text-red-500 hover:text-red-700 transition-colors font-medium'
            >
              Remover tudo
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductMediaZone;
