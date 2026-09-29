// server/routes/socialRoute.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import authSeller from '../middlewares/authSeller.js';
import {
  health,
  getSettings,
  updateSettings,
  getSources,
  getMediaTemplates,
  generate,
  rewrite,
  listPosts,
  getPost,
  updatePost,
  deletePost,
} from '../controllers/socialController.js';
import {
  metaLoginUrl,
  metaCallback,
  metaPages,
  metaConnect,
  metaDisconnect,
  metaStatus,
  publishNow,
  schedulePost,
  unschedulePost,
  cronPublish,
  signUpload,
  registerUploadedMedia,
} from '../controllers/socialMetaController.js';
import {
  getAnalytics,
  recomputeAnalytics,
  refreshPostInsights,
  cronMetrics,
  planWeek,
  latestPlan,
  planCandidates,
  createDraftFromPlanItem,
} from '../controllers/socialAnalyticsController.js';

const socialRouter = express.Router();

// 🛡️ A geração custa dinheiro (tokens) — limita a 20 gerações/min por IP
// mesmo com sessão de seller válida (protege contra loops no front).
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas gerações seguidas. Aguarde um minuto.',
  },
});

// ═══════════════════════════════════════════════════════════════════════
// Rotas SEM authSeller (autenticadas de outra forma)
// ═══════════════════════════════════════════════════════════════════════
// Redirect do Facebook Login — validado por `state` assinado (HMAC)
socialRouter.get('/meta/callback', metaCallback);
// Cron — validado por CRON_SECRET (header Authorization: Bearer ou x-cron-secret)
socialRouter.get('/cron/publish', cronPublish);
socialRouter.post('/cron/publish', cronPublish);
socialRouter.get('/cron/metrics', cronMetrics);
socialRouter.post('/cron/metrics', cronMetrics);

// ═══════════════════════════════════════════════════════════════════════
// Tudo o resto é admin
// ═══════════════════════════════════════════════════════════════════════
socialRouter.use(authSeller);

socialRouter.get('/health', health);

socialRouter.get('/settings', getSettings);
socialRouter.put('/settings', updateSettings);

socialRouter.get('/sources', getSources);
socialRouter.get('/media/templates', getMediaTemplates);
socialRouter.post('/media/sign-upload', signUpload);
socialRouter.post('/media/register', registerUploadedMedia);

socialRouter.post('/generate', aiLimiter, generate);
socialRouter.post('/rewrite', aiLimiter, rewrite);

socialRouter.get('/posts', listPosts);
socialRouter.get('/posts/:id', getPost);
socialRouter.put('/posts/:id', updatePost);
socialRouter.delete('/posts/:id', deletePost);
socialRouter.post('/posts/:id/publish', publishNow);
socialRouter.post('/posts/:id/schedule', schedulePost);
socialRouter.post('/posts/:id/unschedule', unschedulePost);

// 📊 Analytics (Fase 3)
socialRouter.get('/analytics', getAnalytics);
socialRouter.post('/analytics/recompute', recomputeAnalytics);
socialRouter.post('/posts/:id/refresh-insights', refreshPostInsights);

// 🗓️ Planejador semanal (Fase 3)
socialRouter.post('/plan/week', aiLimiter, planWeek);
socialRouter.get('/plan/latest', latestPlan);
socialRouter.get('/plan/candidates', planCandidates);
socialRouter.post('/plan/:id/items/:index/draft', aiLimiter, createDraftFromPlanItem);

// Ligação Meta / Instagram
socialRouter.get('/meta/login-url', metaLoginUrl);
socialRouter.get('/meta/pages', metaPages);
socialRouter.post('/meta/connect', metaConnect);
socialRouter.post('/meta/disconnect', metaDisconnect);
socialRouter.get('/meta/status', metaStatus);

export default socialRouter;
