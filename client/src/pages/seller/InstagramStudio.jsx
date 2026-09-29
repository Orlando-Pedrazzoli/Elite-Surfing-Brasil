// client/src/pages/seller/InstagramStudio.jsx
// ═══════════════════════════════════════════════════════════════════════
// 📸 ESTÚDIO INSTAGRAM — wizard: Briefing → Gerar → Editar/Aprovar
// ═══════════════════════════════════════════════════════════════════════
// Passo 1: formato + objetivo + produto(s)/cupom/evento + briefing
// Passo 2: variantes da IA, editor de legenda, secções por formato,
//          imagens compostas (Cloudinary), preview, copiar/baixar, aprovar.
//
// Abrir um post existente: /seller/instagram?post=<id>
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import PostPreview from '../../components/social/PostPreview';
import {
  POST_TYPES,
  POST_GOALS,
  STATUS_META,
  buildFinalCaption,
  copyToClipboard,
  downloadCloudinaryImage,
  HOOK_LIMIT,
  typeLabel,
  goalLabel,
} from '../../utils/socialUtils';
import {
  Sparkles,
  Search,
  X,
  Check,
  Copy,
  Download,
  Link2,
  RefreshCw,
  Wand2,
  Save,
  AlertTriangle,
  ChevronLeft,
  Image as ImageIcon,
  Settings,
  History,
} from 'lucide-react';

const MAX_PRODUCTS = 5;

const REWRITE_ACTIONS = [
  { mode: 'humanize', label: 'Humanizar' },
  { mode: 'hook', label: 'Reforçar gancho' },
  { mode: 'shorten', label: 'Encurtar' },
  { mode: 'punchier', label: 'Mais direto' },
];

// Faz uma cópia editável do post vindo da API
const toDraft = post => ({
  caption: post.caption || '',
  cta: post.cta || '',
  hashtags: post.hashtags || [],
  selectedVariant: post.selectedVariant ?? 0,
  slides: (post.slides || []).map(s => ({ ...s })),
  reelScript: post.reelScript
    ? { ...post.reelScript, shots: (post.reelScript.shots || []).map(s => ({ ...s })) }
    : null,
  stories: (post.stories || []).map(s => ({ ...s })),
  media: (post.media || []).map(m => ({ ...m })),
});

const InstagramStudio = () => {
  const { axios } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── Estado base ────────────────────────────────────────────────
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState(null);
  const [sources, setSources] = useState({ products: [], coupons: [], wslEvents: [] });
  const [isLoading, setIsLoading] = useState(true);

  // ─── Passo 1: briefing ─────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [type, setType] = useState('post');
  const [goal, setGoal] = useState('sell');
  const [selectedIds, setSelectedIds] = useState([]);
  const [couponId, setCouponId] = useState('');
  const [wslEventId, setWslEventId] = useState('');
  const [context, setContext] = useState('');
  const [campaign, setCampaign] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ─── Passo 2: editor ───────────────────────────────────────────
  const [post, setPost] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rewriting, setRewriting] = useState(null);
  const [hashtagInput, setHashtagInput] = useState('');

  // ─── Media ─────────────────────────────────────────────────────
  const [mediaProductId, setMediaProductId] = useState('');
  const [mediaImages, setMediaImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [background, setBackground] = useState('white');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // Carregamento inicial
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [h, s, src] = await Promise.all([
          axios.get('/api/social/health'),
          axios.get('/api/social/settings'),
          axios.get('/api/social/sources'),
        ]);
        setHealth(h.data);
        if (s.data.success) setSettings(s.data.settings);
        if (src.data.success) {
          setSources({
            products: src.data.products || [],
            coupons: src.data.coupons || [],
            wslEvents: src.data.wslEvents || [],
          });
        }
        const postId = searchParams.get('post');
        if (postId) {
          const { data } = await axios.get(`/api/social/posts/${postId}`);
          if (data.success) openPost(data.post);
          else toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Erro ao carregar o Estúdio');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPost = p => {
    setPost(p);
    setDraft(toDraft(p));
    setDirty(false);
    setType(p.type);
    setGoal(p.goal);
    const firstProduct = p.products?.[0];
    setMediaProductId(firstProduct?._id || '');
    setStep(2);
  };

  // ═══════════════════════════════════════════════════════════════
  // Passo 1 — seleção
  // ═══════════════════════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = sources.products;
    if (!q) return list.slice(0, 40);
    return list
      .filter(
        p =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [sources.products, productSearch]);

  const selectedProducts = useMemo(
    () => selectedIds.map(id => sources.products.find(p => p._id === id)).filter(Boolean),
    [selectedIds, sources.products],
  );

  const toggleProduct = id => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_PRODUCTS) {
        toast(`Máximo de ${MAX_PRODUCTS} produtos por conteúdo`, { icon: 'ℹ️' });
        return prev;
      }
      return [...prev, id];
    });
  };

  const canGenerate =
    selectedIds.length > 0 || wslEventId || context.trim().length > 0;

  const generate = async () => {
    if (!canGenerate || isGenerating) return;
    if (health && !health.generatorConfigured) {
      toast.error('ANTHROPIC_API_KEY não configurada no servidor');
      return;
    }
    setIsGenerating(true);
    try {
      const { data } = await axios.post('/api/social/generate', {
        type,
        goal,
        productIds: selectedIds,
        couponId: couponId || null,
        wslEventId: wslEventId || null,
        context,
        campaign,
      });
      if (data.success) {
        openPost(data.post);
        setSearchParams({ post: data.post._id });
        toast.success('Conteúdo gerado! Revise, edite e aprove.');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao gerar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Passo 2 — edição
  // ═══════════════════════════════════════════════════════════════
  const updateDraft = patch => {
    setDraft(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const selectVariant = idx => {
    const v = post.variants?.[idx];
    if (!v) return;
    updateDraft({
      selectedVariant: idx,
      caption: v.caption,
      cta: v.cta,
      hashtags: v.hashtags || [],
    });
  };

  const addHashtag = () => {
    const raw = hashtagInput.trim();
    if (!raw) return;
    const tags = raw
      .split(/[\s,#]+/)
      .map(t =>
        t
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9_]/g, ''),
      )
      .filter(Boolean);
    updateDraft({ hashtags: [...new Set([...draft.hashtags, ...tags])].slice(0, 30) });
    setHashtagInput('');
  };

  const removeHashtag = tag =>
    updateDraft({ hashtags: draft.hashtags.filter(t => t !== tag) });

  const rewrite = async mode => {
    if (!draft.caption.trim() || rewriting) return;
    setRewriting(mode);
    try {
      const { data } = await axios.post('/api/social/rewrite', {
        text: draft.caption,
        mode,
      });
      if (data.success && data.text) {
        updateDraft({ caption: data.text });
        toast.success('Legenda reescrita');
      } else {
        toast.error(data.message || 'Erro na reescrita');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro na reescrita');
    } finally {
      setRewriting(null);
    }
  };

  const save = async (status = null) => {
    if (!post || isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        caption: draft.caption,
        hook: draft.caption.slice(0, HOOK_LIMIT),
        cta: draft.cta,
        hashtags: draft.hashtags,
        selectedVariant: draft.selectedVariant,
        slides: draft.slides,
        reelScript: draft.reelScript,
        stories: draft.stories,
        media: draft.media,
      };
      if (status) payload.status = status;
      const { data } = await axios.put(`/api/social/posts/${post._id}`, payload);
      if (data.success) {
        setPost(data.post);
        setDraft(toDraft(data.post));
        setDirty(false);
        toast.success(
          status === 'approved'
            ? 'Post aprovado! Copie a legenda e baixe as imagens.'
            : status === 'draft'
              ? 'Voltou para rascunho'
              : 'Alterações salvas',
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const startNew = () => {
    setPost(null);
    setDraft(null);
    setDirty(false);
    setTemplates([]);
    setMediaImages([]);
    setSearchParams({});
    setStep(1);
  };

  // ─── Media (imagens compostas) ─────────────────────────────────
  const loadTemplates = useCallback(
    async (productId, idx, bg) => {
      if (!productId) return;
      setLoadingTemplates(true);
      try {
        const { data } = await axios.get('/api/social/media/templates', {
          params: { productId, imageIndex: idx, background: bg },
        });
        if (data.success) {
          setTemplates(data.templates || []);
          setMediaImages(data.images || []);
        }
      } catch {
        toast.error('Erro ao carregar imagens');
      } finally {
        setLoadingTemplates(false);
      }
    },
    [axios],
  );

  useEffect(() => {
    if (step === 2 && mediaProductId) {
      loadTemplates(mediaProductId, imageIndex, background);
    }
  }, [step, mediaProductId, imageIndex, background, loadTemplates]);

  const relevantTemplates = useMemo(() => {
    if (type === 'story' || type === 'reel') return templates.filter(t => t.format === 'story');
    if (type === 'carousel') return templates.filter(t => t.format === 'portrait');
    return templates.filter(t => t.format !== 'story');
  }, [templates, type]);

  const isMediaSelected = url => (draft?.media || []).some(m => m.url === url);

  const toggleMedia = tpl => {
    const current = draft.media || [];
    const exists = current.some(m => m.url === tpl.url);
    let next;
    if (exists) {
      next = current.filter(m => m.url !== tpl.url);
    } else if (type === 'carousel') {
      if (current.length >= 10) {
        toast('Máximo de 10 imagens no carrossel', { icon: 'ℹ️' });
        return;
      }
      next = [...current, toMedia(tpl)];
    } else {
      next = [toMedia(tpl)];
    }
    updateDraft({ media: next });
  };

  const toMedia = tpl => ({
    url: tpl.url,
    kind: 'image',
    format: tpl.format,
    width: tpl.width,
    height: tpl.height,
    sourceProductId: mediaProductId || undefined,
  });

  const finalCaption = draft ? buildFinalCaption(draft.caption, draft.hashtags) : '';
  const hookText = draft ? draft.caption.slice(0, HOOK_LIMIT) : '';
  const hookCutMidWord =
    draft && draft.caption.length > HOOK_LIMIT && /\S/.test(draft.caption[HOOK_LIMIT] || '');

  const previewImages = (draft?.media || []).map(m => m.url);
  const primaryImage = previewImages[0] || post?.products?.[0]?.image?.[0] || null;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center h-[95vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4' />
          <p className='text-gray-600'>Carregando o Estúdio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 h-[95vh] overflow-y-auto bg-gray-50'>
      <div className='w-full md:p-8 p-4'>
        {/* HEADER */}
        <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
              <Sparkles className='w-6 h-6 text-pink-500' />
              Estúdio Instagram
            </h1>
            <p className='text-gray-500 mt-1'>
              Gere posts, carrosséis, reels e stories a partir dos produtos da loja
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate('/seller/instagram/posts')}
              className='px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2'
            >
              <History className='w-4 h-4' /> Histórico
            </button>
            <button
              onClick={() => navigate('/seller/instagram/settings')}
              className='px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2'
            >
              <Settings className='w-4 h-4' /> Voz da marca
            </button>
          </div>
        </div>

        {health && !health.generatorConfigured && (
          <div className='mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3'>
            <AlertTriangle className='w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5' />
            <div className='text-sm text-amber-800'>
              <p className='font-semibold'>Gerador não configurado</p>
              <p>
                Falta a variável <code className='font-mono'>ANTHROPIC_API_KEY</code> no
                servidor. O Estúdio abre, mas a geração vai falhar até a chave existir.
              </p>
            </div>
          </div>
        )}

        {step === 1 ? (
          <Briefing
            type={type}
            setType={setType}
            goal={goal}
            setGoal={setGoal}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            filteredProducts={filteredProducts}
            selectedIds={selectedIds}
            selectedProducts={selectedProducts}
            toggleProduct={toggleProduct}
            coupons={sources.coupons}
            couponId={couponId}
            setCouponId={setCouponId}
            wslEvents={sources.wslEvents}
            wslEventId={wslEventId}
            setWslEventId={setWslEventId}
            context={context}
            setContext={setContext}
            campaign={campaign}
            setCampaign={setCampaign}
            canGenerate={canGenerate}
            isGenerating={isGenerating}
            generate={generate}
            variantCount={settings?.defaults?.variantCount || 3}
          />
        ) : (
          post &&
          draft && (
            <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6'>
              {/* ══════════ COLUNA ESQUERDA — EDITOR ══════════ */}
              <div className='space-y-5 min-w-0'>
                {/* Cabeçalho do post */}
                <div className='bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3 flex-wrap'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <button
                      onClick={startNew}
                      className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-500'
                      title='Novo conteúdo'
                    >
                      <ChevronLeft className='w-5 h-5' />
                    </button>
                    <span className='px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-semibold rounded-md'>
                      {typeLabel(post.type)}
                    </span>
                    <span className='px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md'>
                      {goalLabel(post.goal)}
                    </span>
                    {post.formula && (
                      <span className='px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-mono rounded-md'>
                        {post.formula}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${STATUS_META[post.status]?.className}`}
                    >
                      {STATUS_META[post.status]?.label}
                    </span>
                    {dirty && (
                      <span className='text-xs text-amber-600 font-medium'>• alterações não salvas</span>
                    )}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {post.products?.map(p => p.name).join(' · ')}
                  </div>
                </div>

                {/* Variantes */}
                {post.variants?.length > 1 && (
                  <div className='bg-white rounded-xl border border-gray-200 p-4'>
                    <p className='text-sm font-semibold text-gray-800 mb-3'>
                      Variantes geradas — escolha o ângulo
                    </p>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                      {post.variants.map((v, i) => (
                        <button
                          key={i}
                          type='button'
                          onClick={() => selectVariant(i)}
                          className={`text-left p-3 rounded-lg border-2 transition-all ${
                            draft.selectedVariant === i
                              ? 'border-pink-500 bg-pink-50/50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className='text-xs font-semibold text-gray-500 mb-1'>
                            Variante {i + 1}
                            {v.hookOverLimit && (
                              <span className='ml-2 text-red-500'>gancho &gt; 125</span>
                            )}
                          </p>
                          <p className='text-sm text-gray-900 line-clamp-3'>{v.hook}</p>
                          {v.whyItWorks && (
                            <p className='text-[11px] text-gray-500 mt-2 italic line-clamp-2'>
                              {v.whyItWorks}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legenda */}
                <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-4'>
                  <div className='flex items-center justify-between flex-wrap gap-2'>
                    <p className='text-sm font-semibold text-gray-800'>Legenda</p>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      {REWRITE_ACTIONS.map(a => (
                        <button
                          key={a.mode}
                          type='button'
                          disabled={!!rewriting}
                          onClick={() => rewrite(a.mode)}
                          className='px-2.5 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1'
                        >
                          {rewriting === a.mode ? (
                            <span className='w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
                          ) : (
                            <Wand2 className='w-3 h-3' />
                          )}
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gancho (derivado) */}
                  <div
                    className={`rounded-lg border p-3 ${
                      hookCutMidWord ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <p className='text-[11px] uppercase tracking-wide text-gray-500 font-semibold'>
                        Visível antes do "…mais"
                      </p>
                      <span className='text-[11px] text-gray-400 tabular-nums'>
                        {Math.min(draft.caption.length, HOOK_LIMIT)}/{HOOK_LIMIT}
                      </span>
                    </div>
                    <p className='text-sm text-gray-900'>{hookText || '—'}</p>
                    {hookCutMidWord && (
                      <p className='text-[11px] text-amber-700 mt-1'>
                        O corte cai no meio de uma palavra. Ajuste a primeira frase para
                        terminar antes dos 125 caracteres.
                      </p>
                    )}
                  </div>

                  <textarea
                    value={draft.caption}
                    onChange={e => updateDraft({ caption: e.target.value })}
                    rows={9}
                    className='w-full outline-none py-2.5 px-3 rounded-lg border border-gray-300 focus:border-primary transition-colors text-sm leading-relaxed'
                    placeholder='Legenda...'
                  />
                  <div className='flex items-center justify-between text-[11px] text-gray-400'>
                    <span>{draft.caption.length}/2200 caracteres</span>
                    {draft.cta && <span>CTA: {draft.cta}</span>}
                  </div>

                  {/* Hashtags */}
                  <div>
                    <p className='text-xs font-semibold text-gray-600 mb-2'>
                      Hashtags ({draft.hashtags.length}) — 3 a 5 dimensionadas
                    </p>
                    <div className='flex flex-wrap gap-2 mb-2'>
                      {draft.hashtags.map(tag => (
                        <span
                          key={tag}
                          className='inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-full font-medium'
                        >
                          #{tag}
                          <button type='button' onClick={() => removeHashtag(tag)}>
                            <X className='w-3 h-3' />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className='flex gap-2'>
                      <input
                        value={hashtagInput}
                        onChange={e => setHashtagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHashtag();
                          }
                        }}
                        placeholder='adicionar hashtag'
                        className='flex-1 outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary text-sm'
                      />
                      <button
                        type='button'
                        onClick={addHashtag}
                        className='px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200'
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secções por formato */}
                {post.type === 'carousel' && (
                  <SlidesEditor slides={draft.slides} onChange={slides => updateDraft({ slides })} />
                )}
                {post.type === 'reel' && draft.reelScript && (
                  <ReelEditor
                    script={draft.reelScript}
                    onChange={reelScript => updateDraft({ reelScript })}
                  />
                )}
                {post.type === 'story' && (
                  <StoriesEditor
                    stories={draft.stories}
                    onChange={stories => updateDraft({ stories })}
                  />
                )}

                {post.mediaGuidance && (
                  <div className='bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-900 flex gap-2'>
                    <ImageIcon className='w-4 h-4 flex-shrink-0 mt-0.5' />
                    <span>
                      <strong>Foto/vídeo ideal:</strong> {post.mediaGuidance}
                    </span>
                  </div>
                )}

                {/* Media */}
                <MediaPicker
                  type={post.type}
                  products={post.products || []}
                  mediaProductId={mediaProductId}
                  setMediaProductId={id => {
                    setMediaProductId(id);
                    setImageIndex(0);
                  }}
                  images={mediaImages}
                  imageIndex={imageIndex}
                  setImageIndex={setImageIndex}
                  background={background}
                  setBackground={setBackground}
                  templates={relevantTemplates}
                  loading={loadingTemplates}
                  isSelected={isMediaSelected}
                  toggle={toggleMedia}
                  selected={draft.media}
                  logoConfigured={health?.logoConfigured}
                />
              </div>

              {/* ══════════ COLUNA DIREITA — PREVIEW + AÇÕES ══════════ */}
              <div className='space-y-4 xl:sticky xl:top-0 self-start'>
                <PostPreview
                  type={post.type}
                  handle={settings?.brandVoice?.handle}
                  caption={draft.caption}
                  hashtags={draft.hashtags}
                  imageUrl={primaryImage}
                  imageUrls={previewImages}
                  slides={draft.slides}
                  stories={draft.stories}
                  reelScript={draft.reelScript}
                />

                <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-2'>
                  <button
                    onClick={() => copyToClipboard(finalCaption, 'Legenda copiada com hashtags')}
                    disabled={!draft.caption.trim()}
                    className='w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2'
                  >
                    <Copy className='w-4 h-4' /> Copiar legenda + hashtags
                  </button>
                  {draft.media.length > 0 && (
                    <button
                      onClick={() =>
                        draft.media.forEach((m, i) =>
                          setTimeout(
                            () =>
                              downloadCloudinaryImage(
                                m.url,
                                `elite-${post.type}-${String(post._id).slice(-6)}-${i + 1}`,
                              ),
                            i * 400,
                          ),
                        )
                      }
                      className='w-full py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2'
                    >
                      <Download className='w-4 h-4' />
                      Baixar {draft.media.length} imagem{draft.media.length > 1 ? 'ns' : ''}
                    </button>
                  )}
                  {post.utm?.url && (
                    <button
                      onClick={() => copyToClipboard(post.utm.url, 'Link com UTM copiado')}
                      className='w-full py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2'
                      title={post.utm.url}
                    >
                      <Link2 className='w-4 h-4' /> Copiar link do produto (UTM)
                    </button>
                  )}

                  <div className='border-t border-gray-100 pt-2 mt-2 space-y-2'>
                    <button
                      onClick={() => save()}
                      disabled={isSaving || !dirty}
                      className='w-full py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-2'
                    >
                      <Save className='w-4 h-4' /> Salvar alterações
                    </button>
                    {post.status === 'draft' ? (
                      <button
                        onClick={() => save('approved')}
                        disabled={isSaving}
                        className='w-full py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2'
                      >
                        <Check className='w-4 h-4' /> Aprovar conteúdo
                      </button>
                    ) : post.status === 'approved' ? (
                      <button
                        onClick={() => save('draft')}
                        disabled={isSaving}
                        className='w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50'
                      >
                        Voltar para rascunho
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setStep(1);
                      }}
                      className='w-full py-2.5 text-sm font-medium text-pink-700 bg-pink-50 rounded-lg hover:bg-pink-100 flex items-center justify-center gap-2'
                    >
                      <RefreshCw className='w-4 h-4' /> Gerar de novo (novo briefing)
                    </button>
                  </div>

                  {post.generation?.model && (
                    <p className='text-[10px] text-gray-400 text-center pt-1'>
                      {post.generation.model} · {post.generation.inputTokens + post.generation.outputTokens} tokens
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// PASSO 1 — BRIEFING
// ═══════════════════════════════════════════════════════════════════════
const Briefing = ({
  type,
  setType,
  goal,
  setGoal,
  productSearch,
  setProductSearch,
  filteredProducts,
  selectedIds,
  selectedProducts,
  toggleProduct,
  coupons,
  couponId,
  setCouponId,
  wslEvents,
  wslEventId,
  setWslEventId,
  context,
  setContext,
  campaign,
  setCampaign,
  canGenerate,
  isGenerating,
  generate,
  variantCount,
}) => (
  <div className='grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6'>
    <div className='space-y-5 min-w-0'>
      {/* Formato */}
      <div className='bg-white rounded-xl border border-gray-200 p-4'>
        <p className='text-sm font-semibold text-gray-800 mb-3'>1. Formato</p>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
          {POST_TYPES.map(t => (
            <button
              key={t.value}
              type='button'
              onClick={() => setType(t.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                type === t.value
                  ? 'border-pink-500 bg-pink-50/60 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className='text-2xl mb-1'>{t.icon}</div>
              <p className='font-semibold text-gray-900 text-sm'>{t.label}</p>
              <p className='text-[11px] text-gray-500 mt-0.5 leading-snug'>{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div className='bg-white rounded-xl border border-gray-200 p-4'>
        <p className='text-sm font-semibold text-gray-800 mb-3'>2. Objetivo</p>
        <div className='flex flex-wrap gap-2'>
          {POST_GOALS.map(g => (
            <button
              key={g.value}
              type='button'
              onClick={() => setGoal(g.value)}
              className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                goal === g.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
              title={g.hint}
            >
              {g.label}
              <span className={`block text-[10px] ${goal === g.value ? 'text-gray-300' : 'text-gray-400'}`}>
                {g.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Produtos */}
      <div className='bg-white rounded-xl border border-gray-200 p-4'>
        <div className='flex items-center justify-between mb-3'>
          <p className='text-sm font-semibold text-gray-800'>
            3. Produto(s) <span className='text-gray-400 font-normal'>até {MAX_PRODUCTS}</span>
          </p>
          <span className='text-xs text-gray-500'>{selectedIds.length} selecionado(s)</span>
        </div>
        <div className='relative mb-3'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder='Buscar por nome, SKU, categoria, cor...'
            className='w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-primary outline-none'
          />
        </div>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1'>
          {filteredProducts.map(p => {
            const selected = selectedIds.includes(p._id);
            return (
              <button
                key={p._id}
                type='button'
                onClick={() => toggleProduct(p._id)}
                className={`relative text-left rounded-lg border-2 overflow-hidden transition-all ${
                  selected ? 'border-pink-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className='aspect-square bg-white'>
                  <img src={p.image?.[0]} alt={p.name} className='w-full h-full object-contain p-1' />
                </div>
                <div className='p-2'>
                  <p className='text-xs font-medium text-gray-900 line-clamp-2 leading-snug'>{p.name}</p>
                  <p className='text-[11px] text-gray-500 mt-0.5'>
                    R$ {Number(p.offerPrice).toFixed(2).replace('.', ',')}
                    {p.stock !== undefined && (
                      <span className={`ml-1 ${p.stock === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        · {p.stock} un
                      </span>
                    )}
                  </p>
                </div>
                {selected && (
                  <span className='absolute top-1.5 right-1.5 w-5 h-5 bg-pink-500 text-white rounded-full flex items-center justify-center'>
                    <Check className='w-3 h-3' />
                  </span>
                )}
                {!p.inStock && (
                  <span className='absolute top-1.5 left-1.5 bg-gray-700 text-white text-[9px] font-bold px-1.5 rounded'>
                    RASCUNHO
                  </span>
                )}
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className='col-span-full text-sm text-gray-400 py-6 text-center'>Nenhum produto</p>
          )}
        </div>
      </div>

      {/* Extras */}
      <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-4'>
        <p className='text-sm font-semibold text-gray-800'>4. Contexto (opcional)</p>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-gray-600'>Cupom ativo</label>
            <select
              value={couponId}
              onChange={e => setCouponId(e.target.value)}
              className='py-2.5 px-3 rounded-lg border border-gray-300 text-sm bg-white outline-none focus:border-primary'
            >
              <option value=''>— nenhum —</option>
              {coupons.map(c => (
                <option key={c._id} value={c._id}>
                  {c.code} ·{' '}
                  {c.discountType === 'percentage' ? `${c.discountValue}%` : `R$ ${c.discountValue}`}
                </option>
              ))}
            </select>
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-gray-600'>Evento WSL</label>
            <select
              value={wslEventId}
              onChange={e => setWslEventId(e.target.value)}
              className='py-2.5 px-3 rounded-lg border border-gray-300 text-sm bg-white outline-none focus:border-primary'
            >
              <option value=''>— nenhum —</option>
              {wslEvents.map(e => (
                <option key={e._id} value={e._id}>
                  #{e.stop} {e.event} · {e.location} ({e.status})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>Briefing para a IA</label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder='Ex: destacar o duplo giratório, público de longboard, tom mais descontraído, mencionar que chegou reposição...'
            className='py-2.5 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary resize-none'
          />
        </div>
        <div className='flex flex-col gap-1 max-w-sm'>
          <label className='text-xs font-medium text-gray-600'>Nome da campanha (UTM)</label>
          <input
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder='ex: black-friday, lancamento-leash-pro'
            className='py-2.5 px-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-primary'
          />
          <p className='text-[11px] text-gray-400'>
            Entra no link do produto para medir vendas vindas do Instagram
          </p>
        </div>
      </div>
    </div>

    {/* Resumo + gerar */}
    <div className='xl:sticky xl:top-0 self-start'>
      <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-4'>
        <p className='text-sm font-semibold text-gray-800'>Resumo</p>
        <dl className='text-sm space-y-1.5'>
          <div className='flex justify-between'>
            <dt className='text-gray-500'>Formato</dt>
            <dd className='font-medium'>{typeLabel(type)}</dd>
          </div>
          <div className='flex justify-between'>
            <dt className='text-gray-500'>Objetivo</dt>
            <dd className='font-medium'>{goalLabel(goal)}</dd>
          </div>
          <div className='flex justify-between'>
            <dt className='text-gray-500'>Variantes</dt>
            <dd className='font-medium'>{variantCount}</dd>
          </div>
        </dl>
        {selectedProducts.length > 0 && (
          <div className='space-y-2'>
            {selectedProducts.map(p => (
              <div key={p._id} className='flex items-center gap-2'>
                <img src={p.image?.[0]} alt='' className='w-10 h-10 object-contain border rounded bg-white' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-medium truncate'>{p.name}</p>
                  <p className='text-[11px] text-gray-500'>
                    R$ {Number(p.offerPrice).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <button type='button' onClick={() => toggleProduct(p._id)} className='text-gray-400 hover:text-red-500'>
                  <X className='w-4 h-4' />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type='button'
          onClick={generate}
          disabled={!canGenerate || isGenerating}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
            canGenerate && !isGenerating
              ? 'bg-pink-600 text-white hover:bg-pink-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin' />
              Gerando com IA... (10–30s)
            </>
          ) : (
            <>
              <Sparkles className='w-4 h-4' /> Gerar conteúdo
            </>
          )}
        </button>
        {!canGenerate && (
          <p className='text-[11px] text-gray-400 text-center'>
            Selecione um produto, um evento WSL ou escreva um briefing
          </p>
        )}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// EDITORES POR FORMATO
// ═══════════════════════════════════════════════════════════════════════
const inputCls =
  'w-full outline-none py-2 px-3 rounded-lg border border-gray-300 focus:border-primary text-sm';

const SlidesEditor = ({ slides, onChange }) => {
  const update = (i, patch) =>
    onChange(slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <p className='text-sm font-semibold text-gray-800 mb-3'>
        Slides do carrossel ({slides.length})
      </p>
      <div className='space-y-3'>
        {slides.map((s, i) => (
          <div key={i} className='border border-gray-200 rounded-lg p-3 bg-gray-50/50'>
            <div className='flex items-center gap-2 mb-2'>
              <span className='w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center'>
                {s.order || i + 1}
              </span>
              <span className='text-[11px] text-gray-500'>
                {i === 0 ? 'Gancho / promessa' : i === slides.length - 1 ? 'Resumo + pedido' : 'Um ponto'}
              </span>
            </div>
            <input
              value={s.headline}
              onChange={e => update(i, { headline: e.target.value })}
              placeholder='Headline'
              className={`${inputCls} font-semibold mb-2`}
            />
            <textarea
              value={s.body}
              onChange={e => update(i, { body: e.target.value })}
              rows={2}
              placeholder='Texto de apoio'
              className={`${inputCls} resize-none mb-2`}
            />
            <p className='text-[11px] text-gray-500'>
              <span className='font-medium'>Visual:</span> {s.visualNote || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReelEditor = ({ script, onChange }) => {
  const updateShot = (i, patch) =>
    onChange({
      ...script,
      shots: script.shots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-4'>
      <p className='text-sm font-semibold text-gray-800'>Roteiro do Reel</p>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>Texto do 1º frame (gancho)</label>
          <input
            value={script.hook}
            onChange={e => onChange({ ...script, hook: e.target.value })}
            className={`${inputCls} font-semibold`}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-gray-600'>Texto da capa</label>
          <input
            value={script.coverText}
            onChange={e => onChange({ ...script, coverText: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-wide text-gray-500'>
              <th className='py-2 pr-2 w-16'>Tempo</th>
              <th className='py-2 pr-2'>Ação / plano</th>
              <th className='py-2 pr-2'>Texto na tela</th>
              <th className='py-2'>Fala</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {script.shots.map((s, i) => (
              <tr key={i} className='align-top'>
                <td className='py-2 pr-2 text-xs font-mono text-gray-600'>{s.t}</td>
                <td className='py-2 pr-2'>
                  <textarea
                    value={s.action}
                    onChange={e => updateShot(i, { action: e.target.value })}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </td>
                <td className='py-2 pr-2'>
                  <input
                    value={s.onScreenText}
                    onChange={e => updateShot(i, { onScreenText: e.target.value })}
                    className={`${inputCls} font-semibold`}
                  />
                </td>
                <td className='py-2'>
                  <textarea
                    value={s.voiceover}
                    onChange={e => updateShot(i, { voiceover: e.target.value })}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className='text-xs text-gray-500'>
        <span className='font-medium'>Áudio:</span> {script.audioSuggestion || '—'} ·{' '}
        <span className='font-medium'>Duração:</span> ~{script.durationSeconds || '?'}s
      </p>
    </div>
  );
};

const StoriesEditor = ({ stories, onChange }) => {
  const update = (i, patch) =>
    onChange(stories.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <p className='text-sm font-semibold text-gray-800 mb-3'>Telas dos Stories ({stories.length})</p>
      <div className='space-y-3'>
        {stories.map((s, i) => (
          <div key={i} className='border border-gray-200 rounded-lg p-3 bg-gray-50/50'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-xs font-bold text-gray-700'>Tela {s.order || i + 1}</span>
              <select
                value={s.sticker || 'nenhum'}
                onChange={e => update(i, { sticker: e.target.value })}
                className='text-xs py-1 px-2 rounded border border-gray-300 bg-white'
              >
                {['nenhum', 'enquete', 'pergunta', 'quiz', 'slider', 'link', 'countdown'].map(v => (
                  <option key={v} value={v}>
                    sticker: {v}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={s.text}
              onChange={e => update(i, { text: e.target.value })}
              rows={2}
              className={`${inputCls} resize-none mb-2 font-medium`}
            />
            {s.sticker === 'link' && (
              <input
                value={s.linkLabel}
                onChange={e => update(i, { linkLabel: e.target.value })}
                placeholder='texto do botão de link'
                className={`${inputCls} mb-2`}
              />
            )}
            <p className='text-[11px] text-gray-500'>
              <span className='font-medium'>Visual:</span> {s.visualNote || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// MEDIA PICKER — imagens compostas no Cloudinary
// ═══════════════════════════════════════════════════════════════════════
const MediaPicker = ({
  type,
  products,
  mediaProductId,
  setMediaProductId,
  images,
  imageIndex,
  setImageIndex,
  background,
  setBackground,
  templates,
  loading,
  isSelected,
  toggle,
  selected,
  logoConfigured,
}) => (
  <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-4'>
    <div className='flex items-center justify-between flex-wrap gap-2'>
      <p className='text-sm font-semibold text-gray-800'>
        Imagens{' '}
        <span className='text-gray-400 font-normal'>
          ({type === 'carousel' ? 'selecione até 10, em ordem' : 'selecione 1'})
        </span>
      </p>
      <div className='flex items-center gap-2'>
        {products.length > 1 && (
          <select
            value={mediaProductId}
            onChange={e => setMediaProductId(e.target.value)}
            className='text-xs py-1.5 px-2 rounded-lg border border-gray-300 bg-white max-w-[200px]'
          >
            {products.map(p => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <div className='flex items-center border border-gray-300 rounded-lg overflow-hidden text-xs'>
          <button
            type='button'
            onClick={() => setBackground('white')}
            className={`px-2.5 py-1.5 ${background === 'white' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}
          >
            fundo branco
          </button>
          <button
            type='button'
            onClick={() => setBackground('auto')}
            className={`px-2.5 py-1.5 ${background === 'auto' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}
          >
            fundo automático
          </button>
        </div>
      </div>
    </div>

    {images.length > 1 && (
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {images.map(img => (
          <button
            key={img.index}
            type='button'
            onClick={() => setImageIndex(img.index)}
            className={`flex-shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden bg-white ${
              imageIndex === img.index ? 'border-pink-500' : 'border-gray-200'
            } ${!img.composable ? 'opacity-40' : ''}`}
            title={img.composable ? `Foto ${img.index + 1}` : 'Não é Cloudinary'}
          >
            <img src={img.url} alt='' className='w-full h-full object-contain' />
          </button>
        ))}
      </div>
    )}

    {loading ? (
      <div className='py-8 text-center text-sm text-gray-400'>Compondo imagens...</div>
    ) : templates.length === 0 ? (
      <div className='py-8 text-center text-sm text-gray-400'>
        {products.length === 0
          ? 'Conteúdo sem produto — use fotos próprias no Instagram.'
          : 'Nenhuma imagem composta disponível para este produto.'}
      </div>
    ) : (
      <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
        {templates.map(t => {
          const sel = isSelected(t.url);
          const order = selected.findIndex(m => m.url === t.url);
          return (
            <button
              key={t.id}
              type='button'
              onClick={() => toggle(t)}
              className={`relative rounded-lg border-2 overflow-hidden bg-gray-100 text-left transition-all ${
                sel ? 'border-pink-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className='w-full bg-white'
                style={{ aspectRatio: `${t.width} / ${t.height}` }}
              >
                <img src={t.url} alt={t.label} className='w-full h-full object-contain' loading='lazy' />
              </div>
              <p className='text-[11px] text-gray-600 px-2 py-1.5 bg-white border-t border-gray-100'>
                {t.label}
              </p>
              {sel && (
                <span className='absolute top-1.5 right-1.5 min-w-5 h-5 px-1 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center'>
                  {type === 'carousel' ? order + 1 : <Check className='w-3 h-3' />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    )}

    {!logoConfigured && (
      <p className='text-[11px] text-gray-400'>
        Dica: defina <code className='font-mono'>SOCIAL_LOGO_PUBLIC_ID</code> no servidor para
        aplicar o logo automaticamente nas imagens.
      </p>
    )}
  </div>
);

export default InstagramStudio;
