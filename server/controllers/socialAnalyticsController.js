// server/controllers/socialAnalyticsController.js
// ═══════════════════════════════════════════════════════════════════════
// 📊 SOCIAL ANALYTICS CONTROLLER — vendas atribuídas, insights, planejador
// ═══════════════════════════════════════════════════════════════════════
//   GET  /api/social/analytics?from&to          → resumo (tiles, por formato, tops, posts)
//   POST /api/social/analytics/recompute        → recalcula vendas + força insights
//   POST /api/social/posts/:id/refresh-insights → insights de um post
//   GET|POST /api/social/cron/metrics           → (CRON_SECRET) vendas + insights
//   POST /api/social/plan/week                  → gera plano da semana (IA)
//   GET  /api/social/plan/latest                → último plano
//   GET  /api/social/plan/candidates            → produtos pontuados
//   POST /api/social/plan/:id/items/:index/draft → cria rascunho a partir do item
// ═══════════════════════════════════════════════════════════════════════
import crypto from 'crypto';
import SocialPlan from '../models/SocialPlan.js';
import {
  recomputeSales,
  refreshInsights,
  getAnalyticsSummary,
} from '../services/instagram/analyticsService.js';
import { generateWeekPlan, scoreProducts } from '../services/instagram/plannerService.js';
import { createGeneratedPost, isValidId } from '../services/instagram/postFactory.js';

const noStore = res => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};

// ─────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    noStore(res);
    const { from, to } = req.query;
    const summary = await getAnalyticsSummary({ from, to });
    res.json({ success: true, ...summary });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const recomputeAnalytics = async (req, res) => {
  try {
    noStore(res);
    const sales = await recomputeSales();
    const insights = await refreshInsights({ limit: 25, force: true });
    res.json({ success: true, sales, insights, message: 'Vendas e insights atualizados' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const refreshPostInsights = async (req, res) => {
  try {
    noStore(res);
    const { id } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const r = await refreshInsights({ limit: 1, force: true, postIds: [id] });
    if (r.skipped === 'not_connected') return res.json({ success: false, message: r.message });
    const item = r.results?.[0];
    if (!item?.ok) return res.json({ success: false, message: item?.message || 'Sem insights disponíveis' });
    res.json({ success: true, message: 'Insights atualizados' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Cron de métricas — mesma autenticação do cron de publicação
const cronAuthorized = req => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers['authorization'] || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['x-cron-secret'];
  return (
    !!provided &&
    provided.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  );
};

export const cronMetrics = async (req, res) => {
  noStore(res);
  if (!cronAuthorized(req)) return res.status(401).json({ success: false, message: 'Não autorizado' });
  try {
    const sales = await recomputeSales();
    const insights = await refreshInsights({ limit: 20 });
    res.json({ success: true, sales, insights: { refreshed: insights.refreshed, skipped: insights.skipped || null } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Chamado pelo cron de publicação (barato): mantém vendas/insights frescos
export const runLightMetrics = async () => {
  try {
    const sales = await recomputeSales();
    const insights = await refreshInsights({ limit: 5 });
    return { sales, insightsRefreshed: insights.refreshed };
  } catch (error) {
    return { error: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────
// Planejador semanal
// ─────────────────────────────────────────────────────────────────────
export const planWeek = async (req, res) => {
  try {
    noStore(res);
    const { weekStart, postsPerWeek } = req.body || {};
    const plan = await generateWeekPlan({ weekStart, postsPerWeek });
    res.json({ success: true, plan });
  } catch (error) {
    console.error('[social/plan]', error);
    res.status(error.status === 503 ? 503 : 200).json({ success: false, message: error.message });
  }
};

export const latestPlan = async (req, res) => {
  try {
    noStore(res);
    const plan = await SocialPlan.findOne({}).sort({ createdAt: -1 }).populate('items.post', 'status caption').lean();
    res.json({ success: true, plan: plan || null });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const planCandidates = async (req, res) => {
  try {
    noStore(res);
    const candidates = await scoreProducts({ limit: 20 });
    res.json({ success: true, candidates });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createDraftFromPlanItem = async (req, res) => {
  try {
    noStore(res);
    const { id, index } = req.params;
    if (!isValidId(id)) return res.json({ success: false, message: 'ID inválido' });
    const plan = await SocialPlan.findById(id);
    if (!plan) return res.json({ success: false, message: 'Plano não encontrado' });
    const idx = parseInt(index);
    const item = plan.items[idx];
    if (!item) return res.json({ success: false, message: 'Item não encontrado' });
    if (item.post) {
      return res.json({ success: true, postId: item.post, message: 'Rascunho já criado' });
    }

    const post = await createGeneratedPost({
      type: item.type,
      goal: item.goal,
      productIds: item.product ? [String(item.product)] : [],
      wslEventId: item.wslEvent ? String(item.wslEvent) : null,
      context: [item.angle, item.formula ? `Fórmula sugerida: ${item.formula}.` : ''].filter(Boolean).join(' '),
      campaign: `semana-${plan.weekStart.toISOString().slice(0, 10)}`,
    });

    plan.items[idx].post = post._id;
    await plan.save();

    res.json({ success: true, postId: post._id, post });
  } catch (error) {
    if (error?.name === 'BriefingError') {
      return res.status(error.status === 503 ? 503 : 200).json({ success: false, message: error.message });
    }
    console.error('[social/plan/draft]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
