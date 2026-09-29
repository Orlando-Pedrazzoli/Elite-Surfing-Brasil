// client/src/components/social/VideoUploader.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🎥 UPLOAD DE VÍDEO — direto do browser para o Cloudinary (assinado)
// ═══════════════════════════════════════════════════════════════════════
// O server assina (POST /api/social/media/sign-upload) e o browser envia
// o ficheiro para api.cloudinary.com com barra de progresso. Assim não
// passamos pelo limite de ~4.5MB da Vercel. No fim, o server valida a
// URL (POST /api/social/media/register) e devolve o objeto de media.
// ═══════════════════════════════════════════════════════════════════════
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Video, X, Upload } from 'lucide-react';

const MAX_MB = 300; // limite da Meta para Reels
const ACCEPT = 'video/mp4,video/quicktime';

const VideoUploader = ({ axios, video, onChange, label = 'Vídeo do Reel (MP4 9:16)' }) => {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = async file => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Selecione um ficheiro de vídeo (MP4 ou MOV)');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Vídeo acima de ${MAX_MB}MB`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const { data: sig } = await axios.post('/api/social/media/sign-upload', {
        resourceType: 'video',
      });
      if (!sig.success) throw new Error(sig.message);

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', sig.timestamp);
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', sig.uploadUrl);
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
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
        xhr.onerror = () => reject(new Error('Falha de rede no upload'));
        xhr.send(form);
      });

      const { data: reg } = await axios.post('/api/social/media/register', {
        url: result.secure_url,
        kind: 'video',
        width: result.width,
        height: result.height,
        duration: result.duration,
        format: result.format,
      });
      if (!reg.success) throw new Error(reg.message);

      onChange(reg.media);
      toast.success('Vídeo carregado');
    } catch (error) {
      toast.error(error.message || 'Erro no upload do vídeo');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const ratioWarning =
    video?.width && video?.height && Math.abs(video.width / video.height - 9 / 16) > 0.05;

  return (
    <div className='border border-gray-200 rounded-lg p-3 bg-gray-50/50'>
      <p className='text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5'>
        <Video className='w-3.5 h-3.5' /> {label}
      </p>
      {video ? (
        <div className='flex items-center gap-3'>
          <video
            src={video.url}
            className='w-16 h-28 object-cover rounded-md bg-black'
            muted
            playsInline
            preload='metadata'
          />
          <div className='flex-1 min-w-0 text-xs text-gray-600'>
            <p className='truncate'>{video.url.split('/').pop()}</p>
            <p className='text-gray-400'>
              {video.width}×{video.height}
              {video.duration ? ` · ${Math.round(video.duration)}s` : ''}
            </p>
            {ratioWarning && (
              <p className='text-amber-600 mt-1'>
                Proporção diferente de 9:16 — o Instagram pode cortar.
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={() => onChange(null)}
            className='p-1.5 text-gray-400 hover:text-red-500'
            title='Remover vídeo'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            type='file'
            accept={ACCEPT}
            className='hidden'
            onChange={e => upload(e.target.files?.[0])}
          />
          <button
            type='button'
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className='w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-pink-400 hover:bg-pink-50/40 disabled:opacity-60 flex flex-col items-center gap-1'
          >
            <Upload className='w-5 h-5 text-gray-400' />
            {uploading ? `Enviando... ${progress}%` : 'Selecionar vídeo (MP4/MOV, até 300MB)'}
          </button>
          {uploading && (
            <div className='h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden'>
              <div className='h-full bg-pink-500 transition-all' style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className='text-[11px] text-gray-400 mt-1.5'>
            Vertical 9:16 (1080×1920), 5–90 s. Vai direto para o Cloudinary.
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
