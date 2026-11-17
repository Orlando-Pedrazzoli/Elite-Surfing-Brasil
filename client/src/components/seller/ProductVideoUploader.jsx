// client/src/components/seller/ProductVideoUploader.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🎥 VÍDEOS DO PRODUTO (MP4) — usado no Adicionar Produto e no modal de edição
// ─────────────────────────────────────────────────────────────────────
// O server só assina (POST /api/product/video/sign-upload) e o browser
// envia o MP4 direto para o Cloudinary, com barra de progresso. Assim o
// vídeo não passa pela Vercel (limite de ~4.5MB por request).
// O componente devolve só a lista de URLs (`videos`) ao formulário pai,
// que a envia em productData.videos ao salvar o produto.
// ═══════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Video, X, Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { MAX_PRODUCT_VIDEOS, getVideoPoster } from '../../utils/productMedia';

const MAX_MB = 100;
const ACCEPT = 'video/mp4,video/quicktime,video/webm';

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

const ProductVideoUploader = ({
  videos,
  setVideos,
  onUploadingChange,
  disabled = false,
}) => {
  const { axios } = useAppContext();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const slotsLeft = MAX_PRODUCT_VIDEOS - videos.length;

  const uploadFiles = async fileList => {
    if (disabled || uploading) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const valid = files.filter(file => {
      if (!file.type.startsWith('video/')) {
        toast.error(`"${file.name}" não é um vídeo`);
        return false;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`"${file.name}" tem mais de ${MAX_MB}MB`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    if (slotsLeft <= 0) {
      toast.error(`Máximo de ${MAX_PRODUCT_VIDEOS} vídeos`);
      return;
    }
    const toUpload = valid.slice(0, slotsLeft);
    if (valid.length > slotsLeft) {
      toast.error(`Apenas ${slotsLeft} vídeo(s) adicionado(s) (limite: ${MAX_PRODUCT_VIDEOS})`);
    }

    setUploading(true);
    try {
      for (const file of toUpload) {
        setProgress(0);
        const { data: sig } = await axios.post('/api/product/video/sign-upload');
        if (!sig.success) throw new Error(sig.message || 'Erro ao autorizar upload');

        const result = await uploadToCloudinary(sig, file, setProgress);
        const url = toMp4Url(result.secure_url, result.format);
        setVideos(prev =>
          prev.includes(url) ? prev : [...prev, url].slice(0, MAX_PRODUCT_VIDEOS),
        );
        toast.success(`Vídeo "${file.name}" carregado`);
      }
    } catch (error) {
      toast.error(error.message || 'Erro no upload do vídeo');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeVideo = index => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const moveVideo = (index, dir) => {
    setVideos(prev => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const blocked = disabled || uploading || slotsLeft <= 0;

  return (
    <div>
      <p className='text-base font-medium mb-2'>
        Vídeos do Produto{' '}
        <span className='text-sm font-normal text-gray-400'>(opcional)</span>
      </p>

      {videos.length > 0 && (
        <div className='mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {videos.map((url, index) => (
            <div
              key={url}
              className='relative rounded-lg overflow-hidden border-2 border-gray-200 bg-black aspect-square group'
            >
              <video
                src={url}
                poster={getVideoPoster(url)}
                muted
                playsInline
                preload='metadata'
                controls
                className='w-full h-full object-contain'
              />
              <span className='absolute top-1 left-1 text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded'>
                Vídeo {index + 1}
              </span>
              {!disabled && (
                <div className='absolute top-1 right-1 flex flex-col gap-1'>
                  <button
                    type='button'
                    onClick={() => removeVideo(index)}
                    className='w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow'
                    title='Remover vídeo'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>
                  {index > 0 && (
                    <button
                      type='button'
                      onClick={() => moveVideo(index, -1)}
                      className='w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow'
                      title='Mover para a esquerda'
                    >
                      <ChevronUp className='w-3.5 h-3.5 -rotate-90' />
                    </button>
                  )}
                  {index < videos.length - 1 && (
                    <button
                      type='button'
                      onClick={() => moveVideo(index, 1)}
                      className='w-6 h-6 bg-white/90 hover:bg-white text-gray-700 rounded-full flex items-center justify-center shadow'
                      title='Mover para a direita'
                    >
                      <ChevronDown className='w-3.5 h-3.5 -rotate-90' />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => !blocked && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          if (!blocked) setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (!blocked) uploadFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          blocked
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
              ? 'border-primary bg-primary/5 cursor-pointer'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type='file'
          accept={ACCEPT}
          multiple
          hidden
          onChange={e => uploadFiles(e.target.files)}
        />

        {uploading ? (
          <div className='space-y-2'>
            <p className='text-sm font-medium text-gray-700'>
              Enviando vídeo... {progress}%
            </p>
            <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
              <div
                className='h-full bg-primary transition-all'
                style={{ width: `${progress}%`, backgroundColor: 'var(--color-primary, #2563eb)' }}
              />
            </div>
          </div>
        ) : slotsLeft <= 0 ? (
          <p className='text-sm text-gray-500'>
            Limite de {MAX_PRODUCT_VIDEOS} vídeos atingido — remova um para adicionar outro
          </p>
        ) : (
          <>
            <div className='flex justify-center gap-2 mb-2'>
              <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center'>
                <Video className='w-5 h-5 text-gray-400' />
              </div>
              <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center'>
                <Upload className='w-5 h-5 text-gray-400' />
              </div>
            </div>
            <p className='text-sm text-gray-600'>
              Arraste vídeos aqui ou{' '}
              <span className='text-primary font-semibold'>clique para selecionar</span>
            </p>
            <p className='text-xs text-gray-400 mt-1'>
              MP4 (ou MOV) • Máx. {MAX_MB}MB por vídeo • {slotsLeft} de{' '}
              {MAX_PRODUCT_VIDEOS} disponíveis • Aparecem na galeria logo após a
              imagem principal
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductVideoUploader;
