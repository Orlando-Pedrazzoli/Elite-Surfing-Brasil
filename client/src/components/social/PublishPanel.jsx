// client/src/components/social/PublishPanel.jsx
// ═══════════════════════════════════════════════════════════════════════
// 🚀 PAINEL DE PUBLICAÇÃO — publicar agora, agendar, estado, permalink
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Send,
  CalendarClock,
  ExternalLink,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Instagram,
} from 'lucide-react';
import { formatDateTime } from '../../utils/socialUtils';

// Espelho da validação do backend — só para feedback imediato
const mediaProblem = (type, media = []) => {
  const images = media.filter(m => m.kind === 'image').length;
  const videos = media.filter(m => m.kind === 'video').length;
  if (type === 'post' && (images !== 1 || videos)) return 'Selecione exatamente 1 imagem.';
  if (type === 'carousel' && (media.length < 2 || media.length > 10))
    return 'Carrossel precisa de 2 a 10 imagens.';
  if (type === 'reel' && videos !== 1) return 'Carregue o vídeo do Reel.';
  if (type === 'story' && media.length !== 1) return 'Selecione 1 imagem ou 1 vídeo.';
  return null;
};

// "YYYY-MM-DDTHH:mm" local para o input datetime-local
const toLocalInput = date => {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Próximas ocorrências dos horários sugeridos (hoje/amanhã)
const nextSlots = (times = []) => {
  const out = [];
  const now = Date.now();
  for (const dayOffset of [0, 1]) {
    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      d.setHours(h, m, 0, 0);
      if (d.getTime() > now + 5 * 60 * 1000) out.push(d);
    }
  }
  return out.slice(0, 4);
};

const PublishPanel = ({
  axios,
  post,
  media,
  dirty,
  connected,
  postingTimes,
  onBeforePublish, // async () => void — salva alterações pendentes
  onPostUpdated, // post => void
}) => {
  const [busy, setBusy] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [when, setWhen] = useState(() => toLocalInput(Date.now() + 60 * 60 * 1000));
  const pollRef = useRef(null);

  const problem = useMemo(() => mediaProblem(post.type, media), [post.type, media]);
  const slots = useMemo(() => nextSlots(postingTimes), [postingTimes]);

  // Polling enquanto a Meta processa (status publishing)
  useEffect(() => {
    if (post.status !== 'publishing') {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return undefined;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.post(`/api/social/posts/${post._id}/publish`);
        if (data.post) onPostUpdated(data.post);
        if (data.done) toast.success('Publicado no Instagram!');
        else if (!data.pending && data.message) toast.error(data.message);
      } catch {
        /* tenta de novo no próximo tick */
      }
    }, 6000);
    return () => pollRef.current && clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.status, post._id]);

  const publishNow = async () => {
    if (busy) return;
    if (problem) return toast.error(problem);
    if (!window.confirm('Publicar agora no Instagram? Esta ação não pode ser desfeita pelo admin.')) return;
    setBusy(true);
    try {
      if (dirty) await onBeforePublish();
      if (post.status === 'failed') {
        const { data: re } = await axios.put(`/api/social/posts/${post._id}`, { status: 'approved' });
        if (!re.success) throw new Error(re.message);
      }
      const { data } = await axios.post(`/api/social/posts/${post._id}/publish`);
      if (data.post) onPostUpdated(data.post);
      if (data.done) toast.success('Publicado no Instagram!');
      else if (data.pending) toast(data.message || 'A processar...', { icon: '⏳' });
      else toast.error(data.message || 'Falha ao publicar');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Erro ao publicar');
    } finally {
      setBusy(false);
    }
  };

  const schedule = async dateValue => {
    if (busy) return;
    if (problem) return toast.error(problem);
    const iso = new Date(dateValue).toISOString();
    setBusy(true);
    try {
      if (dirty) await onBeforePublish();
      if (post.status === 'failed') {
        const { data: re } = await axios.put(`/api/social/posts/${post._id}`, { status: 'approved' });
        if (!re.success) throw new Error(re.message);
      }
      const { data } = await axios.post(`/api/social/posts/${post._id}/schedule`, {
        scheduledAt: iso,
      });
      if (data.success) {
        onPostUpdated(data.post);
        setScheduleOpen(false);
        toast.success(`Agendado para ${formatDateTime(iso)}`);
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Erro ao agendar');
    } finally {
      setBusy(false);
    }
  };

  const unschedule = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/social/posts/${post._id}/unschedule`);
      if (data.success) {
        onPostUpdated(data.post);
        toast.success('Agendamento cancelado');
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro');
    } finally {
      setBusy(false);
    }
  };

  // ─── Estados finais ────────────────────────────────────────────
  if (post.status === 'published') {
    return (
      <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm'>
        <p className='font-semibold text-emerald-800 flex items-center gap-2'>
          <Instagram className='w-4 h-4' /> Publicado
        </p>
        <p className='text-xs text-emerald-700 mt-0.5'>{formatDateTime(post.publishedAt)}</p>
        {post.igPermalink && (
          <a
            href={post.igPermalink}
            target='_blank'
            rel='noreferrer'
            className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 underline'
          >
            Ver no Instagram <ExternalLink className='w-3 h-3' />
          </a>
        )}
      </div>
    );
  }

  if (post.status === 'publishing') {
    return (
      <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm'>
        <p className='font-semibold text-amber-800 flex items-center gap-2'>
          <span className='w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin' />
          Publicando...
        </p>
        <p className='text-xs text-amber-700 mt-1'>
          {post.lastError || 'A Meta está a processar. Vídeos podem demorar 1–3 minutos.'}
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500'>
        Para publicar direto do admin, ligue a conta em{' '}
        <span className='font-medium'>Instagram → Configurações</span>. Enquanto isso, copie a
        legenda e baixe as imagens.
      </div>
    );
  }

  if (post.status === 'draft') {
    return (
      <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500'>
        Aprove o conteúdo para liberar publicar e agendar.
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      {post.status === 'failed' && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2'>
          <AlertTriangle className='w-4 h-4 flex-shrink-0' />
          <span>
            <strong>Falhou:</strong> {post.lastError || 'erro desconhecido'}
          </span>
        </div>
      )}

      {post.status === 'scheduled' ? (
        <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm'>
          <p className='font-semibold text-blue-800 flex items-center gap-2'>
            <CalendarClock className='w-4 h-4' /> Agendado
          </p>
          <p className='text-xs text-blue-700 mt-0.5'>{formatDateTime(post.scheduledAt)}</p>
          <button
            type='button'
            onClick={unschedule}
            disabled={busy}
            className='mt-2 text-xs font-medium text-blue-800 underline flex items-center gap-1'
          >
            <XCircle className='w-3 h-3' /> Cancelar agendamento
          </button>
        </div>
      ) : (
        <>
          {problem && (
            <p className='text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5'>
              {problem}
            </p>
          )}
          <button
            type='button'
            onClick={publishNow}
            disabled={busy || !!problem}
            className='w-full py-2.5 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-40 flex items-center justify-center gap-2'
          >
            {post.status === 'failed' ? <RotateCcw className='w-4 h-4' /> : <Send className='w-4 h-4' />}
            {post.status === 'failed' ? 'Tentar publicar de novo' : 'Publicar agora'}
          </button>
          <button
            type='button'
            onClick={() => setScheduleOpen(o => !o)}
            disabled={busy || !!problem}
            className='w-full py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-2'
          >
            <CalendarClock className='w-4 h-4' /> Agendar
          </button>

          {scheduleOpen && (
            <div className='rounded-lg border border-gray-200 p-3 space-y-2 bg-white'>
              {slots.length > 0 && (
                <div className='flex flex-wrap gap-1.5'>
                  {slots.map(d => (
                    <button
                      key={d.toISOString()}
                      type='button'
                      onClick={() => schedule(d)}
                      disabled={busy}
                      className='px-2.5 py-1 text-[11px] bg-gray-100 rounded-md hover:bg-gray-200'
                    >
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' })}{' '}
                      {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
              <input
                type='datetime-local'
                value={when}
                min={toLocalInput(Date.now() + 5 * 60 * 1000)}
                onChange={e => setWhen(e.target.value)}
                className='w-full py-2 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary'
              />
              <button
                type='button'
                onClick={() => schedule(when)}
                disabled={busy}
                className='w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'
              >
                Confirmar agendamento
              </button>
              <p className='text-[10px] text-gray-400'>
                Horário local do seu computador. O cron publica em até 5 min após a hora.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublishPanel;
