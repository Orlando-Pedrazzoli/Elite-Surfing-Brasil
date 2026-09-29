// client/src/components/social/PostPreview.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📱 PREVIEW — mock do Instagram (feed, carrossel, reel, story)
// ═══════════════════════════════════════════════════════════════════════
// Mostra ao admin como o conteúdo vai aparecer, incluindo o corte do
// "…mais" nos 125 caracteres — a razão de o gancho importar.
// ═══════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { HOOK_LIMIT } from '../../utils/socialUtils';

const Avatar = ({ handle }) => (
  <div className='flex items-center gap-2'>
    <div className='w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]'>
      <div className='w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-800'>
        ES
      </div>
    </div>
    <span className='text-sm font-semibold text-gray-900'>
      {String(handle || '@elitesurfing').replace(/^@/, '')}
    </span>
  </div>
);

const CaptionFold = ({ handle, caption, hashtags }) => {
  const [expanded, setExpanded] = useState(false);
  const text = String(caption || '');
  const needsFold = text.length > HOOK_LIMIT;
  const shown = expanded || !needsFold ? text : text.slice(0, HOOK_LIMIT);
  const tags = (hashtags || []).filter(Boolean);

  return (
    <div className='px-3 pb-3 text-sm text-gray-900'>
      <span className='font-semibold mr-1'>
        {String(handle || '@elitesurfing').replace(/^@/, '')}
      </span>
      <span className='whitespace-pre-wrap'>{shown}</span>
      {needsFold && !expanded && (
        <button
          type='button'
          onClick={() => setExpanded(true)}
          className='text-gray-400 ml-1'
        >
          … mais
        </button>
      )}
      {(expanded || !needsFold) && tags.length > 0 && (
        <p className='text-blue-900/80 mt-2 break-words'>
          {tags.map(t => `#${t}`).join(' ')}
        </p>
      )}
    </div>
  );
};

const Actions = () => (
  <div className='flex items-center justify-between px-3 py-2'>
    <div className='flex items-center gap-4 text-gray-800'>
      <Heart className='w-6 h-6' />
      <MessageCircle className='w-6 h-6' />
      <Send className='w-6 h-6' />
    </div>
    <Bookmark className='w-6 h-6 text-gray-800' />
  </div>
);

const Frame = ({ children }) => (
  <div className='w-full max-w-[380px] mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden'>
    {children}
  </div>
);

/**
 * @param {'post'|'carousel'|'reel'|'story'} type
 * @param {string} imageUrl        imagem principal (post/carrossel/capa do reel)
 * @param {string[]} imageUrls     carrossel (slides com imagem)
 * @param {object[]} slides        carrossel (texto por slide)
 * @param {object[]} stories       stories
 * @param {object} reelScript
 */
const PostPreview = ({
  type = 'post',
  handle,
  caption,
  hashtags,
  imageUrl,
  imageUrls = [],
  slides = [],
  stories = [],
  reelScript,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);

  // ─── STORY ───────────────────────────────────────────────────────
  if (type === 'story') {
    const frames = stories.length ? stories : [{ text: 'Sem telas geradas', sticker: 'nenhum' }];
    const frame = frames[Math.min(storyIdx, frames.length - 1)];
    const bg = frame.imageUrl || imageUrl;
    return (
      <div className='w-full max-w-[300px] mx-auto'>
        <div className='relative aspect-[9/16] rounded-3xl overflow-hidden bg-gray-900 shadow-lg border-4 border-gray-800'>
          {bg ? (
            <img src={bg} alt='' className='absolute inset-0 w-full h-full object-cover' />
          ) : (
            <div className='absolute inset-0 bg-gradient-to-b from-sky-700 via-sky-900 to-gray-900' />
          )}
          <div className='absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60' />

          {/* barras de progresso */}
          <div className='absolute top-2 left-2 right-2 flex gap-1'>
            {frames.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full ${i <= storyIdx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
          <div className='absolute top-5 left-3'>
            <span className='text-white text-xs font-semibold drop-shadow'>
              {String(handle || '@elitesurfing').replace(/^@/, '')}
            </span>
          </div>

          <div className='absolute inset-x-4 top-1/3 text-center'>
            <p className='text-white text-xl font-bold leading-snug drop-shadow-lg whitespace-pre-wrap'>
              {frame.text}
            </p>
          </div>

          {frame.sticker && frame.sticker !== 'nenhum' && (
            <div className='absolute inset-x-6 bottom-20 flex justify-center'>
              <span className='bg-white/95 text-gray-900 text-xs font-semibold px-4 py-2 rounded-full shadow'>
                {frame.sticker === 'link'
                  ? `🔗 ${frame.linkLabel || 'ver produto'}`
                  : `✨ sticker: ${frame.sticker}`}
              </span>
            </div>
          )}

          <button
            type='button'
            onClick={() => setStoryIdx(i => Math.max(0, i - 1))}
            className='absolute left-0 top-0 h-full w-1/3'
            aria-label='anterior'
          />
          <button
            type='button'
            onClick={() => setStoryIdx(i => Math.min(frames.length - 1, i + 1))}
            className='absolute right-0 top-0 h-full w-1/3'
            aria-label='próximo'
          />
        </div>
        <p className='text-center text-xs text-gray-400 mt-2'>
          Tela {storyIdx + 1} de {frames.length} · toque nos lados para navegar
        </p>
      </div>
    );
  }

  // ─── REEL ────────────────────────────────────────────────────────
  if (type === 'reel') {
    return (
      <div className='w-full max-w-[300px] mx-auto'>
        <div className='relative aspect-[9/16] rounded-3xl overflow-hidden bg-gray-900 shadow-lg border-4 border-gray-800'>
          {imageUrl ? (
            <img src={imageUrl} alt='' className='absolute inset-0 w-full h-full object-cover' />
          ) : (
            <div className='absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900' />
          )}
          <div className='absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70' />
          <div className='absolute inset-x-4 top-1/4 text-center'>
            <p className='text-white text-2xl font-extrabold leading-tight drop-shadow-lg'>
              {reelScript?.hook || reelScript?.coverText || 'Gancho do primeiro frame'}
            </p>
          </div>
          <div className='absolute bottom-4 left-3 right-14'>
            <p className='text-white text-xs font-semibold mb-1'>
              {String(handle || '@elitesurfing').replace(/^@/, '')}
            </p>
            <p className='text-white/90 text-xs line-clamp-2'>{caption}</p>
          </div>
          <div className='absolute right-2 bottom-6 flex flex-col items-center gap-4 text-white'>
            <Heart className='w-6 h-6' />
            <MessageCircle className='w-6 h-6' />
            <Send className='w-6 h-6' />
            <Bookmark className='w-6 h-6' />
          </div>
        </div>
        {reelScript?.durationSeconds ? (
          <p className='text-center text-xs text-gray-400 mt-2'>
            ~{reelScript.durationSeconds}s · capa: "{reelScript.coverText || '—'}"
          </p>
        ) : null}
      </div>
    );
  }

  // ─── CARROSSEL ───────────────────────────────────────────────────
  if (type === 'carousel') {
    const total = Math.max(slides.length, imageUrls.length, 1);
    const idx = Math.min(slideIdx, total - 1);
    const slide = slides[idx];
    const img = imageUrls[idx] || imageUrl;
    return (
      <Frame>
        <div className='flex items-center justify-between px-3 py-2'>
          <Avatar handle={handle} />
          <MoreHorizontal className='w-5 h-5 text-gray-500' />
        </div>
        <div className='relative aspect-[4/5] bg-gray-100'>
          {img ? (
            <img src={img} alt='' className='absolute inset-0 w-full h-full object-cover' />
          ) : (
            <div className='absolute inset-0 bg-gradient-to-br from-sky-100 to-sky-300' />
          )}
          {slide && (
            <div className='absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent'>
              <p className='text-white text-lg font-bold leading-tight drop-shadow'>
                {slide.headline}
              </p>
              {slide.body && (
                <p className='text-white/90 text-xs mt-1 leading-snug line-clamp-3'>{slide.body}</p>
              )}
            </div>
          )}
          <span className='absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full'>
            {idx + 1}/{total}
          </span>
          <button
            type='button'
            onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
            className='absolute left-0 top-0 h-full w-1/3'
            aria-label='anterior'
          />
          <button
            type='button'
            onClick={() => setSlideIdx(i => Math.min(total - 1, i + 1))}
            className='absolute right-0 top-0 h-full w-1/3'
            aria-label='próximo'
          />
        </div>
        <div className='flex justify-center gap-1 py-2'>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>
        <Actions />
        <CaptionFold handle={handle} caption={caption} hashtags={hashtags} />
      </Frame>
    );
  }

  // ─── POST ────────────────────────────────────────────────────────
  return (
    <Frame>
      <div className='flex items-center justify-between px-3 py-2'>
        <Avatar handle={handle} />
        <MoreHorizontal className='w-5 h-5 text-gray-500' />
      </div>
      <div className='relative aspect-square bg-gray-100'>
        {imageUrl ? (
          <img src={imageUrl} alt='' className='absolute inset-0 w-full h-full object-cover' />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center text-gray-400 text-sm'>
            Selecione uma imagem
          </div>
        )}
      </div>
      <Actions />
      <CaptionFold handle={handle} caption={caption} hashtags={hashtags} />
    </Frame>
  );
};

export default PostPreview;
