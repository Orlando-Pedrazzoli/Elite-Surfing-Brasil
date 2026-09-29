// server/services/instagram/analyticsService.js
// ═══════════════════════════════════════════════════════════════════════
// 📊 ANALYTICS — vendas atribuídas (UTM) + insights da Meta
// ═══════════════════════════════════════════════════════════════════════
// • recomputeSales()         → Order.attribution.socialPostId → SocialPost.sales
// • refreshInsights()        → Meta insights → SocialPost.metrics (com cadência)
// • getAnalyticsSummary()    → números para a página Analytics e o Dashboard
// • getPerformanceHints()    → resumo curto do que funciona (entra no prompt)
//
// Lucro bruto atribuído usa o costPrice ATUAL do produto (o pedido não
// guarda snapshot de custo). É uma aproximação honesta e documentada.
// ═══════════════════════════════════════════════════════════════════════
import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import SocialPost from '../../models/SocialPost.js';
import { getCredentials } from './publishService.js';
import * as meta from './metaGraphService.js';

const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ─────────────────────────────────────────────────────────────────────
// 1) VENDAS ATRIBUÍDAS
// ─────────────────────────────────────────────────────────────────────
export const recomputeSales = async () => {
  // Pedidos pagos com post atribuído
  const orders = await Order.find({
    isPaid: true,
    'attribution.socialPostId': { $ne: null },
  })
    .select('amount items paidAt createdAt attribution.socialPostId')
    .lean();

  if (orders.length === 0) {
    await SocialPost.updateMany(
      { 'sales.orders': { $gt: 0 } },
      { $set: { sales: { orders: 0, units: 0, revenue: 0, grossProfit: 0, lastOrderAt: null, computedAt: new Date() } } },
    );
    return { posts: 0, orders: 0 };
  }

  // Custos atuais dos produtos envolvidos (select explícito: costPrice é select:false)
  const productIds = [...new Set(orders.flatMap(o => o.items.map(i => String(i.product))))].filter(
    id => mongoose.isValidObjectId(id),
  );
  const products = await Product.find({ _id: { $in: productIds } })
    .select('+costPrice offerPrice')
    .lean();
  const productMap = new Map(products.map(p => [String(p._id), p]));

  const byPost = new Map();
  for (const o of orders) {
    const key = String(o.attribution.socialPostId);
    const acc = byPost.get(key) || { orders: 0, units: 0, revenue: 0, grossProfit: 0, lastOrderAt: null };
    acc.orders += 1;
    acc.revenue += Number(o.amount) || 0;
    for (const it of o.items) {
      const qty = Number(it.quantity) || 0;
      acc.units += qty;
      const p = productMap.get(String(it.product));
      if (p && p.costPrice !== null && p.costPrice !== undefined) {
        acc.grossProfit += (Number(p.offerPrice) - Number(p.costPrice)) * qty;
      }
    }
    const when = o.paidAt || o.createdAt;
    if (!acc.lastOrderAt || when > acc.lastOrderAt) acc.lastOrderAt = when;
    byPost.set(key, acc);
  }

  const now = new Date();
  const ops = [...byPost.entries()].map(([id, s]) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $set: {
          sales: {
            orders: s.orders,
            units: s.units,
            revenue: round2(s.revenue),
            grossProfit: round2(s.grossProfit),
            lastOrderAt: s.lastOrderAt,
            computedAt: now,
          },
        },
      },
    },
  }));
  // Posts que já não têm vendas (ex.: pedido estornado) → zera
  ops.push({
    updateMany: {
      filter: { _id: { $nin: [...byPost.keys()] }, 'sales.orders': { $gt: 0 } },
      update: { $set: { sales: { orders: 0, units: 0, revenue: 0, grossProfit: 0, lastOrderAt: null, computedAt: now } } },
    },
  });
  await SocialPost.bulkWrite(ops, { ordered: false });

  return { posts: byPost.size, orders: orders.length };
};

// ─────────────────────────────────────────────────────────────────────
// 2) INSIGHTS DA META — cadência: 6h nos primeiros 7 dias, depois semanal
//    até 30 dias. Stories só têm insights por 24h.
// ─────────────────────────────────────────────────────────────────────
const HOUR = 60 * 60 * 1000;

const isDueForRefresh = post => {
  const age = Date.now() - new Date(post.publishedAt || post.createdAt).getTime();
  const last = post.metrics?.fetchedAt ? Date.now() - new Date(post.metrics.fetchedAt).getTime() : Infinity;
  if (post.type === 'story') return age < 24 * HOUR && last > 3 * HOUR;
  if (age > 30 * 24 * HOUR) return false;
  if (age < 7 * 24 * HOUR) return last > 6 * HOUR;
  return last > 7 * 24 * HOUR;
};

const productTypeOf = post =>
  post.type === 'reel' ? 'REELS' : post.type === 'story' ? 'STORY' : 'FEED';

export const refreshInsights = async ({ limit = 20, force = false, postIds = null } = {}) => {
  let creds;
  try {
    creds = await getCredentials();
  } catch (e) {
    return { refreshed: 0, skipped: 'not_connected', message: e.message };
  }
  const { token } = creds;

  const query = { status: 'published', igMediaId: { $ne: null } };
  if (postIds) query._id = { $in: postIds };
  const candidates = await SocialPost.find(query)
    .sort({ publishedAt: -1 })
    .limit(force ? limit : 200)
    .select('type publishedAt createdAt metrics igMediaId')
    .lean();

  const due = (force ? candidates : candidates.filter(isDueForRefresh)).slice(0, limit);
  const results = [];

  for (const post of due) {
    try {
      const raw = await meta.getMediaInsights(post.igMediaId, token, productTypeOf(post));
      const metrics = {
        reach: raw.reach ?? null,
        impressions: raw.impressions ?? null,
        saves: raw.saved ?? null,
        shares: raw.shares ?? null,
        comments: raw.comments ?? null,
        likes: raw.likes ?? null,
        plays: raw.plays ?? null,
        totalInteractions: raw.total_interactions ?? null,
        linkClicks: post.metrics?.linkClicks ?? null,
        fetchedAt: new Date(),
        fetchCount: (post.metrics?.fetchCount || 0) + 1,
      };
      await SocialPost.updateOne({ _id: post._id }, { $set: { metrics } });
      results.push({ id: String(post._id), ok: true });
    } catch (e) {
      results.push({ id: String(post._id), ok: false, message: e.message });
      if (e?.authProblem) break;
    }
  }
  return { refreshed: results.filter(r => r.ok).length, results };
};

// ─────────────────────────────────────────────────────────────────────
// 3) RESUMO PARA A UI
// ─────────────────────────────────────────────────────────────────────
const engagementRate = m => {
  if (!m || !m.reach) return null;
  const s = (m.saves || 0) + (m.shares || 0);
  return round2((s / m.reach) * 100); // "saves + envios por alcance" (%)
};

export const getAnalyticsSummary = async ({ from, to } = {}) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  const dateFilter = Object.keys(range).length ? { publishedAt: range } : {};

  const posts = await SocialPost.find({ status: 'published', ...dateFilter })
    .sort({ publishedAt: -1 })
    .populate('products', 'name image')
    .lean();

  const totals = {
    posts: posts.length,
    reach: 0,
    saves: 0,
    shares: 0,
    comments: 0,
    likes: 0,
    orders: 0,
    units: 0,
    revenue: 0,
    grossProfit: 0,
    withMetrics: 0,
  };
  const byType = {};

  for (const p of posts) {
    const m = p.metrics || {};
    const s = p.sales || {};
    if (m.fetchedAt) totals.withMetrics += 1;
    totals.reach += m.reach || 0;
    totals.saves += m.saves || 0;
    totals.shares += m.shares || 0;
    totals.comments += m.comments || 0;
    totals.likes += m.likes || 0;
    totals.orders += s.orders || 0;
    totals.units += s.units || 0;
    totals.revenue += s.revenue || 0;
    totals.grossProfit += s.grossProfit || 0;

    const t = (byType[p.type] = byType[p.type] || {
      type: p.type,
      posts: 0,
      reach: 0,
      saves: 0,
      shares: 0,
      orders: 0,
      revenue: 0,
      grossProfit: 0,
    });
    t.posts += 1;
    t.reach += m.reach || 0;
    t.saves += m.saves || 0;
    t.shares += m.shares || 0;
    t.orders += s.orders || 0;
    t.revenue += s.revenue || 0;
    t.grossProfit += s.grossProfit || 0;
  }

  const byTypeList = Object.values(byType).map(t => ({
    ...t,
    revenue: round2(t.revenue),
    grossProfit: round2(t.grossProfit),
    engagementRate: t.reach ? round2(((t.saves + t.shares) / t.reach) * 100) : null,
    revenuePerPost: t.posts ? round2(t.revenue / t.posts) : 0,
  }));

  const postRows = posts.map(p => ({
    _id: p._id,
    type: p.type,
    goal: p.goal,
    formula: p.formula,
    hook: p.hook,
    publishedAt: p.publishedAt,
    igPermalink: p.igPermalink,
    thumb: p.media?.[0]?.url || p.products?.[0]?.image?.[0] || null,
    products: (p.products || []).map(x => x.name),
    metrics: p.metrics || {},
    engagementRate: engagementRate(p.metrics),
    sales: p.sales || {},
  }));

  const topBySales = [...postRows]
    .filter(r => (r.sales.revenue || 0) > 0)
    .sort((a, b) => (b.sales.revenue || 0) - (a.sales.revenue || 0))
    .slice(0, 5);
  const topByEngagement = [...postRows]
    .filter(r => r.engagementRate !== null)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 5);

  // Pedidos vindos do Instagram sem post identificado (link da bio, etc.)
  const igOrdersAgg = await Order.aggregate([
    { $match: { isPaid: true, 'attribution.source': 'instagram', ...(Object.keys(range).length ? { paidAt: range } : {}) } },
    { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$amount' } } },
  ]);
  const instagramAll = igOrdersAgg[0] || { orders: 0, revenue: 0 };

  return {
    totals: {
      ...totals,
      revenue: round2(totals.revenue),
      grossProfit: round2(totals.grossProfit),
      engagementRate: totals.reach ? round2(((totals.saves + totals.shares) / totals.reach) * 100) : null,
    },
    instagramAll: { orders: instagramAll.orders, revenue: round2(instagramAll.revenue || 0) },
    byType: byTypeList,
    topBySales,
    topByEngagement,
    posts: postRows,
  };
};

// ─────────────────────────────────────────────────────────────────────
// 4) DICAS DE DESEMPENHO PARA O PROMPT (últimos 60 dias)
// ─────────────────────────────────────────────────────────────────────
export const getPerformanceHints = async () => {
  const since = new Date(Date.now() - 60 * 24 * HOUR);
  const posts = await SocialPost.find({
    status: 'published',
    publishedAt: { $gte: since },
    'metrics.fetchedAt': { $ne: null },
  })
    .select('type formula metrics sales')
    .lean();

  if (posts.length < 3) return '';

  const agg = new Map();
  for (const p of posts) {
    const key = `${p.type}|${p.formula || '?'}`;
    const a = agg.get(key) || { n: 0, rate: 0, revenue: 0 };
    const r = engagementRate(p.metrics);
    if (r !== null) {
      a.n += 1;
      a.rate += r;
    }
    a.revenue += p.sales?.revenue || 0;
    agg.set(key, a);
  }
  const rows = [...agg.entries()]
    .filter(([, a]) => a.n >= 2)
    .map(([k, a]) => ({ key: k, avgRate: round2(a.rate / a.n), revenue: round2(a.revenue), n: a.n }))
    .sort((x, y) => y.avgRate - x.avgRate)
    .slice(0, 4);

  if (rows.length === 0) return '';
  const lines = rows.map(r => {
    const [type, formula] = r.key.split('|');
    return `- ${type} com fórmula ${formula}: ${r.avgRate}% de saves+envios por alcance (${r.n} posts)${r.revenue > 0 ? `, R$ ${r.revenue} em vendas atribuídas` : ''}`;
  });
  return `# Desempenho recente da conta (últimos 60 dias)\nO que mais gerou saves e envios para a Elite Surfing:\n${lines.join('\n')}\nUse isto como referência de estilo, sem repetir os mesmos ganchos.`;
};
