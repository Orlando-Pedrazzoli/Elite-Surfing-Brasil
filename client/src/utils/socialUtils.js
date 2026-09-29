// client/src/utils/socialUtils.js
// ═══════════════════════════════════════════════════════════════════════
// 📸 Utilitários do Estúdio Instagram (labels, cópia, download, texto)
// ═══════════════════════════════════════════════════════════════════════
import toast from 'react-hot-toast';

export const POST_TYPES = [
  {
    value: 'post',
    label: 'Post',
    icon: '🖼️',
    description: '1 imagem + legenda. Gancho nos primeiros 125 caracteres.',
  },
  {
    value: 'carousel',
    label: 'Carrossel',
    icon: '🎞️',
    description: '2–10 slides. O formato mais salvo do Instagram.',
  },
  {
    value: 'reel',
    label: 'Reel',
    icon: '🎬',
    description: 'Roteiro de vídeo 9:16 com gancho nos 3 primeiros segundos.',
  },
  {
    value: 'story',
    label: 'Stories',
    icon: '📱',
    description: 'Sequência de 3–5 telas com stickers e link.',
  },
];

export const POST_GOALS = [
  { value: 'sell', label: 'Vender', hint: 'clique no link + saves' },
  { value: 'launch', label: 'Lançamento', hint: 'envios + seguidores' },
  { value: 'clearance', label: 'Queima de estoque', hint: 'urgência honesta' },
  { value: 'engage', label: 'Engajar', hint: 'comentários + envios' },
  { value: 'wsl', label: 'WSL / cultura', hint: 'evento ligado ao produto' },
];

export const STATUS_META = {
  draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  approved: { label: 'Aprovado', className: 'bg-green-100 text-green-700 border-green-200' },
  scheduled: { label: 'Agendado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  publishing: { label: 'Publicando', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  published: { label: 'Publicado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  failed: { label: 'Falhou', className: 'bg-red-100 text-red-700 border-red-200' },
};

export const typeLabel = value => POST_TYPES.find(t => t.value === value)?.label || value;
export const goalLabel = value => POST_GOALS.find(g => g.value === value)?.label || value;

/** Legenda final pronta a colar no Instagram (hashtags no fim). */
export const buildFinalCaption = (caption, hashtags = []) => {
  const tags = (hashtags || []).filter(Boolean).map(h => `#${h.replace(/^#+/, '')}`);
  return [String(caption || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
};

export const copyToClipboard = async (text, successMessage = 'Copiado!') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch {
    // Fallback para contextos sem clipboard API
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error('Não foi possível copiar');
      return false;
    }
  }
};

/**
 * Força download de uma imagem Cloudinary sem depender de CORS:
 * insere `fl_attachment:<nome>` na URL. Para URLs não-Cloudinary abre
 * numa nova aba.
 */
export const downloadCloudinaryImage = (url, filename = 'elite-surfing-instagram') => {
  if (!url) return;
  const safeName = filename.replace(/[^a-z0-9_-]/gi, '_').slice(0, 60);
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  const href =
    idx === -1
      ? url
      : `${url.slice(0, idx + marker.length)}fl_attachment:${safeName}/${url.slice(
          idx + marker.length,
        )}`;
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.download = `${safeName}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/** Conta os primeiros N caracteres "visíveis" antes do "mais". */
export const HOOK_LIMIT = 125;
export const hookOf = caption => String(caption || '').slice(0, HOOK_LIMIT);

export const formatDateTime = value => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};
